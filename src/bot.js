const TelegramBot = require('node-telegram-bot-api');
const { pool } = require('./database');
const { v4: uuidv4 } = require('uuid');

let bot;
const WEBAPP_URL = process.env.WEBAPP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);

function initBot(token) {
  bot = new TelegramBot(token, { polling: true });

  bot.on('polling_error', (error) => {
    console.error('Polling error:', error.message);
  });

  bot.onText(/\/start(.*)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username || '';
    const firstName = msg.from.first_name || '';
    const referralParam = match[1] ? match[1].trim().replace(' ', '') : '';

    try {
      let user = await getUser(userId);
      
      if (!user) {
        const referralCode = generateReferralCode();
        await createUser(userId, username, firstName, referralCode, referralParam);
        user = await getUser(userId);
      }

      const settings = await getSettings();
      const officialChannel = settings.official_channel || '';

      const keyboard = {
        inline_keyboard: [
          [{ text: '⭐ OPEN SHOP', web_app: { url: WEBAPP_URL } }]
        ]
      };

      if (officialChannel) {
        keyboard.inline_keyboard.push([{ text: '📢 OFFICIAL CHANNEL', url: officialChannel }]);
      }

      await bot.sendMessage(chatId, 
        `🌟 Welcome to Star Buy Premium Shop ⭐\n\nClick below to open the Mini App:`,
        { reply_markup: keyboard }
      );
    } catch (error) {
      console.error('Start command error:', error);
      await bot.sendMessage(chatId, 'An error occurred. Please try again.');
    }
  });

  bot.onText(/\/admin/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    try {
      const settings = await getSettings();
      const ownerId = settings.owner_id;

      if (String(userId) !== String(ownerId)) {
        return;
      }

      const stats = await getAdminStats();

      const keyboard = {
        inline_keyboard: [
          [{ text: '📦 View Orders', callback_data: 'admin_orders' }],
          [{ text: '💰 View Deposits', callback_data: 'admin_deposits' }]
        ]
      };

      await bot.sendMessage(chatId, 
        `📊 Admin Dashboard\n\n` +
        `Total Users: ${stats.totalUsers}\n` +
        `Total Orders: ${stats.totalOrders}\n` +
        `Pending Orders: ${stats.pendingOrders}\n` +
        `Pending Deposits: ${stats.pendingDeposits}`,
        { reply_markup: keyboard }
      );
    } catch (error) {
      console.error('Admin command error:', error);
    }
  });

  bot.onText(/\/orders/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    try {
      const isAdmin = await checkIsOrderAdmin(userId);
      if (!isAdmin) return;

      await sendOrdersList(chatId);
    } catch (error) {
      console.error('Orders command error:', error);
    }
  });

  bot.onText(/\/deposits/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    try {
      const isAdmin = await checkIsOrderAdmin(userId);
      if (!isAdmin) return;

      await sendDepositsList(chatId);
    } catch (error) {
      console.error('Deposits command error:', error);
    }
  });

  bot.onText(/\/support (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const searchUserId = match[1];

    try {
      const isAdmin = await checkIsAdmin(userId);
      if (!isAdmin) return;

      const user = await getUser(parseInt(searchUserId));
      if (!user) {
        await bot.sendMessage(chatId, 'User not found.');
        return;
      }

      const orders = await getUserOrders(user.telegram_id);
      const deposits = await getUserDeposits(user.telegram_id);

      let message = `👤 User Info\n\n`;
      message += `User ID: ${user.telegram_id}\n`;
      message += `Username: @${user.username || 'N/A'}\n`;
      message += `Main Balance: $${parseFloat(user.main_balance).toFixed(2)}\n`;
      message += `Hold Balance: $${parseFloat(user.hold_balance).toFixed(2)}\n`;
      message += `Referral Balance: $${parseFloat(user.referral_balance).toFixed(2)}\n\n`;

      message += `📦 Recent Orders: ${orders.length}\n`;
      message += `💰 Recent Deposits: ${deposits.length}`;

      await bot.sendMessage(chatId, message);
    } catch (error) {
      console.error('Support command error:', error);
    }
  });

  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;

    try {
      await bot.answerCallbackQuery(query.id);

      if (data === 'admin_orders') {
        await sendOrdersList(chatId);
      } else if (data === 'admin_deposits') {
        await sendDepositsList(chatId);
      } else if (data.startsWith('order_')) {
        const parts = data.split('_');
        const action = parts[1];
        const orderId = parts[2];

        const isAdmin = await checkIsOrderAdmin(userId);
        if (!isAdmin) return;

        await handleOrderAction(chatId, orderId, action);
      } else if (data.startsWith('deposit_')) {
        const parts = data.split('_');
        const action = parts[1];
        const depositId = parts[2];

        const isAdmin = await checkIsOrderAdmin(userId);
        if (!isAdmin) return;

        await handleDepositAction(chatId, depositId, action);
      } else if (data.startsWith('screenshot_order_')) {
        const orderId = data.replace('screenshot_order_', '');
        const order = await getOrderById(orderId);
        if (order && order.screenshot_path) {
          await bot.sendPhoto(chatId, order.screenshot_path);
        } else {
          await bot.sendMessage(chatId, 'Screenshot not found.');
        }
      } else if (data.startsWith('screenshot_deposit_')) {
        const depositId = data.replace('screenshot_deposit_', '');
        const deposit = await getDepositById(depositId);
        if (deposit && deposit.screenshot_path) {
          await bot.sendPhoto(chatId, deposit.screenshot_path);
        } else {
          await bot.sendMessage(chatId, 'Screenshot not found.');
        }
      }
    } catch (error) {
      console.error('Callback query error:', error);
    }
  });

  return bot;
}

async function sendOrdersList(chatId) {
  const orders = await getRecentOrders();
  
  if (orders.length === 0) {
    await bot.sendMessage(chatId, 'No orders found.');
    return;
  }

  for (const order of orders) {
    const keyboard = {
      inline_keyboard: []
    };

    if (order.status === 'PENDING') {
      keyboard.inline_keyboard.push([
        { text: '🔄 PROCESSING', callback_data: `order_processing_${order.order_id}` }
      ]);
    }
    if (order.status === 'PENDING' || order.status === 'Processing') {
      keyboard.inline_keyboard.push([
        { text: '✅ SUCCESS', callback_data: `order_success_${order.order_id}` },
        { text: '❌ CANCEL', callback_data: `order_cancel_${order.order_id}` }
      ]);
    }
    keyboard.inline_keyboard.push([
      { text: '📷 VIEW SCREENSHOT', callback_data: `screenshot_order_${order.order_id}` }
    ]);

    await bot.sendMessage(chatId,
      `📦 Order #${order.order_id}\n\n` +
      `User ID: \`${order.user_id}\`\n` +
      `Package: ${order.package_name}\n` +
      `Amount: $${parseFloat(order.amount).toFixed(2)}\n` +
      `Input: ${order.user_input || 'N/A'}\n` +
      `Status: ${order.status}`,
      { parse_mode: 'Markdown', reply_markup: keyboard }
    );
  }
}

async function sendDepositsList(chatId) {
  const deposits = await getRecentDeposits();
  
  if (deposits.length === 0) {
    await bot.sendMessage(chatId, 'No deposits found.');
    return;
  }

  for (const deposit of deposits) {
    const keyboard = {
      inline_keyboard: []
    };

    if (deposit.status === 'Processing') {
      keyboard.inline_keyboard.push([
        { text: '✅ APPROVE', callback_data: `deposit_approve_${deposit.deposit_id}` },
        { text: '❌ REJECT', callback_data: `deposit_reject_${deposit.deposit_id}` }
      ]);
    }
    keyboard.inline_keyboard.push([
      { text: '📷 VIEW SCREENSHOT', callback_data: `screenshot_deposit_${deposit.deposit_id}` }
    ]);

    await bot.sendMessage(chatId,
      `💰 Deposit #${deposit.deposit_id}\n\n` +
      `User ID: \`${deposit.user_id}\`\n` +
      `Amount: $${parseFloat(deposit.amount).toFixed(2)}\n` +
      `Method: ${deposit.method}\n` +
      `Binance Order ID: ${deposit.binance_order_id || 'N/A'}\n` +
      `Status: ${deposit.status}`,
      { parse_mode: 'Markdown', reply_markup: keyboard }
    );
  }
}

async function handleOrderAction(chatId, orderId, action) {
  const order = await getOrderById(orderId);
  if (!order) {
    await bot.sendMessage(chatId, 'Order not found.');
    return;
  }

  if (order.status === 'Success' || order.status === 'Cancel') {
    await bot.sendMessage(chatId, 'This order has already been processed.');
    return;
  }

  let newStatus;
  if (action === 'processing') newStatus = 'Processing';
  else if (action === 'success') newStatus = 'Success';
  else if (action === 'cancel') newStatus = 'Cancel';

  await updateOrderStatus(orderId, newStatus);

  if (newStatus === 'Success') {
    await pool.query(
      'UPDATE users SET hold_balance = hold_balance - $1 WHERE telegram_id = $2',
      [order.amount, order.user_id]
    );
    
    const user = await getUser(order.user_id);
    if (user && !user.first_order_completed) {
      await pool.query(
        'UPDATE users SET first_order_completed = TRUE WHERE telegram_id = $1',
        [order.user_id]
      );
      
      if (user.referred_by) {
        const referral = await pool.query(
          'SELECT * FROM referrals WHERE referred_id = $1 AND rewarded = FALSE',
          [order.user_id]
        );
        
        if (referral.rows.length > 0) {
          const settings = await getSettings();
          const rewardAmount = parseFloat(settings.referral_reward) || 0.5;
          
          await pool.query(
            'UPDATE users SET referral_balance = referral_balance + $1 WHERE telegram_id = $2',
            [rewardAmount, user.referred_by]
          );
          
          await pool.query(
            'UPDATE referrals SET rewarded = TRUE, reward_amount = $1 WHERE referred_id = $2',
            [rewardAmount, order.user_id]
          );
        }
      }
    }
  } else if (newStatus === 'Cancel') {
    await pool.query(
      'UPDATE users SET main_balance = main_balance + $1, hold_balance = hold_balance - $1 WHERE telegram_id = $2',
      [order.amount, order.user_id]
    );
  }

  await bot.sendMessage(chatId, `Order #${orderId} updated to ${newStatus}`);
}

async function handleDepositAction(chatId, depositId, action) {
  const deposit = await getDepositById(depositId);
  if (!deposit) {
    await bot.sendMessage(chatId, 'Deposit not found.');
    return;
  }

  if (deposit.status === 'Approved' || deposit.status === 'Rejected') {
    await bot.sendMessage(chatId, 'This deposit has already been processed.');
    return;
  }

  let newStatus;
  if (action === 'approve') newStatus = 'Approved';
  else if (action === 'reject') newStatus = 'Rejected';

  await updateDepositStatus(depositId, newStatus);

  if (newStatus === 'Approved') {
    await pool.query(
      'UPDATE users SET main_balance = main_balance + $1 WHERE telegram_id = $2',
      [deposit.amount, deposit.user_id]
    );
  }

  await bot.sendMessage(chatId, `Deposit #${depositId} ${newStatus}`);
}

function generateReferralCode() {
  return 'REF' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function getUser(telegramId) {
  const result = await pool.query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
  return result.rows[0];
}

async function createUser(telegramId, username, firstName, referralCode, referredByCode) {
  let referredBy = null;
  
  if (referredByCode) {
    const referrer = await pool.query('SELECT telegram_id FROM users WHERE referral_code = $1', [referredByCode]);
    if (referrer.rows.length > 0 && referrer.rows[0].telegram_id !== telegramId) {
      referredBy = referrer.rows[0].telegram_id;
    }
  }

  await pool.query(
    'INSERT INTO users (telegram_id, username, first_name, referral_code, referred_by) VALUES ($1, $2, $3, $4, $5)',
    [telegramId, username, firstName, referralCode, referredBy]
  );

  if (referredBy) {
    await pool.query(
      'INSERT INTO referrals (referrer_id, referred_id) VALUES ($1, $2)',
      [referredBy, telegramId]
    );
  }
}

async function getSettings() {
  const result = await pool.query('SELECT key, value FROM settings');
  const settings = {};
  result.rows.forEach(row => {
    settings[row.key] = row.value;
  });
  return settings;
}

async function getAdminStats() {
  const usersResult = await pool.query('SELECT COUNT(*) FROM users');
  const ordersResult = await pool.query('SELECT COUNT(*) FROM orders');
  const pendingOrdersResult = await pool.query("SELECT COUNT(*) FROM orders WHERE status = 'PENDING'");
  const pendingDepositsResult = await pool.query("SELECT COUNT(*) FROM deposits WHERE status = 'Processing'");

  return {
    totalUsers: usersResult.rows[0].count,
    totalOrders: ordersResult.rows[0].count,
    pendingOrders: pendingOrdersResult.rows[0].count,
    pendingDeposits: pendingDepositsResult.rows[0].count
  };
}

async function checkIsOrderAdmin(userId) {
  const settings = await getSettings();
  return String(userId) === String(settings.owner_id) || String(userId) === String(settings.order_admin_id);
}

async function checkIsAdmin(userId) {
  const settings = await getSettings();
  return String(userId) === String(settings.owner_id) || 
         String(userId) === String(settings.order_admin_id) || 
         String(userId) === String(settings.support_admin_id);
}

async function getRecentOrders() {
  const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 10');
  return result.rows;
}

async function getRecentDeposits() {
  const result = await pool.query('SELECT * FROM deposits ORDER BY created_at DESC LIMIT 10');
  return result.rows;
}

async function getOrderById(orderId) {
  const result = await pool.query('SELECT * FROM orders WHERE order_id = $1', [orderId]);
  return result.rows[0];
}

async function getDepositById(depositId) {
  const result = await pool.query('SELECT * FROM deposits WHERE deposit_id = $1', [depositId]);
  return result.rows[0];
}

async function updateOrderStatus(orderId, status) {
  await pool.query('UPDATE orders SET status = $1, updated_at = NOW() WHERE order_id = $2', [status, orderId]);
}

async function updateDepositStatus(depositId, status) {
  await pool.query('UPDATE deposits SET status = $1, updated_at = NOW() WHERE deposit_id = $2', [status, depositId]);
}

async function getUserOrders(userId) {
  const result = await pool.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10', [userId]);
  return result.rows;
}

async function getUserDeposits(userId) {
  const result = await pool.query('SELECT * FROM deposits WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10', [userId]);
  return result.rows;
}

async function sendOrderNotification(order, user) {
  const settings = await getSettings();
  const adminId = settings.owner_id || settings.order_admin_id;
  
  if (!adminId || !bot) return;

  const keyboard = {
    inline_keyboard: [
      [{ text: '🔄 PROCESSING', callback_data: `order_processing_${order.order_id}` }],
      [
        { text: '✅ SUCCESS', callback_data: `order_success_${order.order_id}` },
        { text: '❌ CANCEL', callback_data: `order_cancel_${order.order_id}` }
      ],
      [{ text: '📷 VIEW SCREENSHOT', callback_data: `screenshot_order_${order.order_id}` }]
    ]
  };

  try {
    await bot.sendMessage(adminId,
      `🆕 New Order!\n\n` +
      `📦 Order #${order.order_id}\n` +
      `User ID: \`${order.user_id}\`\n` +
      `Username: @${user.username || 'N/A'}\n` +
      `Transaction ID: \`${order.order_id}\`\n` +
      `Package: ${order.package_name}\n` +
      `Amount: $${parseFloat(order.amount).toFixed(2)}\n` +
      `Input: ${order.user_input || 'N/A'}\n` +
      `Status: ${order.status}`,
      { parse_mode: 'Markdown', reply_markup: keyboard }
    );

    if (order.screenshot_path) {
      await bot.sendPhoto(adminId, order.screenshot_path, { caption: `Screenshot for Order #${order.order_id}` });
    }
  } catch (error) {
    console.error('Failed to send order notification:', error);
  }
}

async function sendDepositNotification(deposit) {
  const settings = await getSettings();
  const adminId = settings.owner_id || settings.order_admin_id;
  
  if (!adminId || !bot) return;

  const user = await getUser(deposit.user_id);
  const keyboard = {
    inline_keyboard: [
      [
        { text: '✅ APPROVE', callback_data: `deposit_approve_${deposit.deposit_id}` },
        { text: '❌ REJECT', callback_data: `deposit_reject_${deposit.deposit_id}` }
      ],
      [{ text: '📷 VIEW SCREENSHOT', callback_data: `screenshot_deposit_${deposit.deposit_id}` }]
    ]
  };

  try {
    await bot.sendMessage(adminId,
      `🆕 New Deposit!\n\n` +
      `💰 Deposit #${deposit.deposit_id}\n` +
      `User ID: \`${deposit.user_id}\`\n` +
      `Username: @${user && user.username ? user.username : 'N/A'}\n` +
      `Transaction ID: \`${deposit.deposit_id}\`\n` +
      `Amount: $${parseFloat(deposit.amount).toFixed(2)}\n` +
      `Method: ${deposit.method}\n` +
      `Binance Order ID: ${deposit.binance_order_id || 'N/A'}\n` +
      `Status: ${deposit.status}`,
      { parse_mode: 'Markdown', reply_markup: keyboard }
    );

    if (deposit.screenshot_path) {
      await bot.sendPhoto(adminId, deposit.screenshot_path, { caption: `Screenshot for Deposit #${deposit.deposit_id}` });
    }
  } catch (error) {
    console.error('Failed to send deposit notification:', error);
  }
}

module.exports = { initBot, sendOrderNotification, sendDepositNotification };
