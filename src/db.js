const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const FILES = {
  users: path.join(DATA_DIR, 'users.json'),
  packages: path.join(DATA_DIR, 'packages.json'),
  orders: path.join(DATA_DIR, 'orders.json'),
  deposits: path.join(DATA_DIR, 'deposits.json'),
  referrals: path.join(DATA_DIR, 'referrals.json'),
  settings: path.join(DATA_DIR, 'settings.json')
};

function readJSON(file) {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (error) {
    console.error(`Error reading ${file}:`, error);
  }
  return [];
}

function writeJSON(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error(`Error writing ${file}:`, error);
  }
}

function initDatabase() {
  const defaultSettings = {
    referral_reward: '0.5',
    owner_id: '',
    order_admin_id: '',
    support_admin_id: '',
    official_channel: '',
    telegram_channel: '',
    telegram_group: '',
    youtube_channel: '',
    customer_support_link: '',
    support_username: '',
    usdt_address: '',
    bnb_address: '',
    binance_pay_name: '',
    binance_pay_id: '',
    allow_stars_payment: 'true',
    allow_premium_purchase: 'true'
  };

  if (!fs.existsSync(FILES.users)) writeJSON(FILES.users, []);
  if (!fs.existsSync(FILES.packages)) writeJSON(FILES.packages, []);
  if (!fs.existsSync(FILES.orders)) writeJSON(FILES.orders, []);
  if (!fs.existsSync(FILES.deposits)) writeJSON(FILES.deposits, []);
  if (!fs.existsSync(FILES.referrals)) writeJSON(FILES.referrals, []);
  
  if (!fs.existsSync(FILES.settings)) {
    writeJSON(FILES.settings, defaultSettings);
  }

  console.log('Database initialized successfully');
}

// Users
function getUser(telegramId) {
  const users = readJSON(FILES.users);
  return users.find(u => u.telegram_id === parseInt(telegramId));
}

function createUser(telegramId, username, firstName, referralCode, referredByCode) {
  const users = readJSON(FILES.users);
  let referredBy = null;

  if (referredByCode) {
    const referrer = users.find(u => u.referral_code === referredByCode && u.telegram_id !== parseInt(telegramId));
    if (referrer) {
      referredBy = referrer.telegram_id;
    }
  }

  const newUser = {
    telegram_id: parseInt(telegramId),
    username: username || '',
    first_name: firstName || '',
    main_balance: 0,
    hold_balance: 0,
    referral_balance: 0,
    telegram_stars_balance: 0,
    is_premium: false,
    referral_code: referralCode,
    referred_by: referredBy,
    first_order_completed: false,
    referral_rewarded: false,
    join_date: new Date().toISOString()
  };

  users.push(newUser);
  writeJSON(FILES.users, users);
  return newUser;
}

function updateUser(telegramId, updates) {
  const users = readJSON(FILES.users);
  const user = users.find(u => u.telegram_id === parseInt(telegramId));
  if (user) {
    Object.assign(user, updates);
    writeJSON(FILES.users, users);
  }
  return user;
}

// Packages
function getPackages() {
  const packages = readJSON(FILES.packages);
  return packages.filter(p => p.active !== false);
}

function getPackageById(packageId) {
  const packages = readJSON(FILES.packages);
  return packages.find(p => p.id === parseInt(packageId));
}

// Orders
function createOrder(orderData) {
  const orders = readJSON(FILES.orders);
  const newOrder = {
    ...orderData,
    id: orders.length + 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  orders.push(newOrder);
  writeJSON(FILES.orders, orders);
  return newOrder;
}

function getOrdersByUser(telegramId) {
  const orders = readJSON(FILES.orders);
  return orders.filter(o => o.user_id === parseInt(telegramId)).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function getOrderById(orderId) {
  const orders = readJSON(FILES.orders);
  return orders.find(o => o.order_id === orderId);
}

function getRecentOrders(limit = 10) {
  const orders = readJSON(FILES.orders);
  return orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, limit);
}

function updateOrderStatus(orderId, status) {
  const orders = readJSON(FILES.orders);
  const order = orders.find(o => o.order_id === orderId);
  if (order) {
    order.status = status;
    order.updated_at = new Date().toISOString();
    writeJSON(FILES.orders, orders);
  }
  return order;
}

// Deposits
function createDeposit(depositData) {
  const deposits = readJSON(FILES.deposits);
  const newDeposit = {
    ...depositData,
    id: deposits.length + 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  deposits.push(newDeposit);
  writeJSON(FILES.deposits, deposits);
  return newDeposit;
}

function getDepositsByUser(telegramId) {
  const deposits = readJSON(FILES.deposits);
  return deposits.filter(d => d.user_id === parseInt(telegramId)).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function getDepositById(depositId) {
  const deposits = readJSON(FILES.deposits);
  return deposits.find(d => d.deposit_id === depositId);
}

function getRecentDeposits(limit = 10) {
  const deposits = readJSON(FILES.deposits);
  return deposits.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, limit);
}

function updateDepositStatus(depositId, status) {
  const deposits = readJSON(FILES.deposits);
  const deposit = deposits.find(d => d.deposit_id === depositId);
  if (deposit) {
    deposit.status = status;
    deposit.updated_at = new Date().toISOString();
    writeJSON(FILES.deposits, deposits);
  }
  return deposit;
}

// Referrals
function createReferral(referrerId, referredId) {
  const referrals = readJSON(FILES.referrals);
  const newReferral = {
    id: referrals.length + 1,
    referrer_id: parseInt(referrerId),
    referred_id: parseInt(referredId),
    reward_amount: 0,
    rewarded: false,
    created_at: new Date().toISOString()
  };
  referrals.push(newReferral);
  writeJSON(FILES.referrals, referrals);
  return newReferral;
}

function getReferrals(referrerId) {
  const referrals = readJSON(FILES.referrals);
  return referrals.filter(r => r.referrer_id === parseInt(referrerId));
}

function updateReferral(referredId, updates) {
  const referrals = readJSON(FILES.referrals);
  const referral = referrals.find(r => r.referred_id === parseInt(referredId));
  if (referral) {
    Object.assign(referral, updates);
    writeJSON(FILES.referrals, referrals);
  }
  return referral;
}

// Settings
function getSettings() {
  return readJSON(FILES.settings) || {};
}

function updateSetting(key, value) {
  const settings = readJSON(FILES.settings) || {};
  settings[key] = value;
  writeJSON(FILES.settings, settings);
}

// Stats
function getAdminStats() {
  const users = readJSON(FILES.users);
  const orders = readJSON(FILES.orders);
  const deposits = readJSON(FILES.deposits);

  return {
    totalUsers: users.length,
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => o.status === 'PENDING').length,
    pendingDeposits: deposits.filter(d => d.status === 'Processing').length
  };
}

function getUserOrders(telegramId) {
  const orders = readJSON(FILES.orders);
  return orders.filter(o => o.user_id === parseInt(telegramId)).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10);
}

function getUserDeposits(telegramId) {
  const deposits = readJSON(FILES.deposits);
  return deposits.filter(d => d.user_id === parseInt(telegramId)).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10);
}

module.exports = {
  initDatabase,
  getUser,
  createUser,
  updateUser,
  getPackages,
  getPackageById,
  createOrder,
  getOrdersByUser,
  getOrderById,
  getRecentOrders,
  updateOrderStatus,
  createDeposit,
  getDepositsByUser,
  getDepositById,
  getRecentDeposits,
  updateDepositStatus,
  createReferral,
  getReferrals,
  updateReferral,
  getSettings,
  updateSetting,
  getAdminStats,
  getUserOrders,
  getUserDeposits,
  readJSON,
  writeJSON,
  FILES
};
