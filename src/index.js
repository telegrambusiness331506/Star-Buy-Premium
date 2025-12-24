const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { pool, initDatabase } = require('./database');
const { initBot, sendOrderNotification, sendDepositNotification } = require('./bot');

const app = express();
const PORT = 5000;

// Load JSON data files
const packagesData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/packages.json'), 'utf8'));
const settingsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/settings.json'), 'utf8'));

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

app.get('/api/user/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const result = await pool.query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/packages', (req, res) => {
  try {
    const activePackages = packagesData.filter(pkg => pkg.active === true);
    res.json(activePackages);
  } catch (error) {
    console.error('Get packages error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/settings', (req, res) => {
  try {
    res.json(settingsData);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/order', upload.single('screenshot'), async (req, res) => {
  try {
    const { telegramId, packageId, packageName, amount, userInput, paymentMethod } = req.body;
    const screenshotPath = req.file ? `/uploads/${req.file.filename}` : null;

    const userResult = await pool.query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const orderAmount = parseFloat(amount);
    const method = paymentMethod || 'balance';

    if (method === 'balance' && parseFloat(user.main_balance) < orderAmount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const orderId = 'ORD' + Date.now().toString().slice(-8);

    await pool.query(
      'UPDATE users SET main_balance = main_balance - $1, hold_balance = hold_balance + $1 WHERE telegram_id = $2',
      [orderAmount, telegramId]
    );

    const orderResult = await pool.query(
      `INSERT INTO orders (order_id, user_id, package_id, package_name, amount, user_input, screenshot_path, status, payment_method)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', $8) RETURNING *`,
      [orderId, telegramId, packageId, packageName, orderAmount, userInput, screenshotPath, method]
    );

    const order = orderResult.rows[0];
    
    sendOrderNotification(order, user).catch(console.error);

    res.json({ success: true, order });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/order-stars', upload.single('screenshot'), async (req, res) => {
  try {
    const { telegramId, packageId, packageName, starsAmount, userInput } = req.body;
    const screenshotPath = req.file ? `/uploads/${req.file.filename}` : null;

    const userResult = await pool.query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const stars = parseInt(starsAmount);

    if (user.telegram_stars_balance < stars) {
      return res.status(400).json({ error: 'Insufficient Telegram Stars' });
    }

    const orderId = 'ORD' + Date.now().toString().slice(-8);

    await pool.query(
      'UPDATE users SET telegram_stars_balance = telegram_stars_balance - $1 WHERE telegram_id = $2',
      [stars, telegramId]
    );

    const orderResult = await pool.query(
      `INSERT INTO orders (order_id, user_id, package_id, package_name, stars_amount, user_input, screenshot_path, status, payment_method)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', 'stars') RETURNING *`,
      [orderId, telegramId, packageId, packageName, stars, userInput, screenshotPath]
    );

    const order = orderResult.rows[0];
    
    sendOrderNotification(order, user).catch(console.error);

    res.json({ success: true, order });
  } catch (error) {
    console.error('Create stars order error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/deposit', async (req, res) => {
  try {
    const { telegramId, amount, method, txHash } = req.body;

    const depositAmount = parseFloat(amount);
    let minAmount = 2;
    if (method === 'USDT') minAmount = 10;
    else if (method === 'BNB') minAmount = 1;
    
    if (depositAmount < minAmount) {
      return res.status(400).json({ error: `Minimum deposit is $${minAmount}` });
    }

    if (!txHash) {
      return res.status(400).json({ error: 'Transaction hash or Order ID is required' });
    }

    if (method === 'Binance Pay' && !/^\d+$/.test(txHash)) {
      return res.status(400).json({ error: 'Order ID must contain numbers only' });
    }

    const depositId = 'DEP' + Date.now().toString().slice(-8);

    const depositResult = await pool.query(
      `INSERT INTO deposits (deposit_id, user_id, amount, method, binance_order_id, status)
       VALUES ($1, $2, $3, $4, $5, 'Processing') RETURNING *`,
      [depositId, telegramId, depositAmount, method, txHash]
    );

    const deposit = depositResult.rows[0];
    
    sendDepositNotification(deposit).catch(console.error);

    res.json({ success: true, deposit });
  } catch (error) {
    console.error('Create deposit error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/orders/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const result = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [telegramId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/deposits/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const result = await pool.query(
      'SELECT * FROM deposits WHERE user_id = $1 ORDER BY created_at DESC',
      [telegramId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get deposits error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/referrals/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    
    const userResult = await pool.query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const referralsResult = await pool.query(
      'SELECT COUNT(*) as total, SUM(CASE WHEN rewarded = TRUE THEN 1 ELSE 0 END) as successful FROM referrals WHERE referrer_id = $1',
      [telegramId]
    );

    const user = userResult.rows[0];
    const referralData = referralsResult.rows[0];

    res.json({
      referralCode: user.referral_code,
      referralBalance: user.referral_balance,
      totalReferrals: parseInt(referralData.total) || 0,
      successfulReferrals: parseInt(referralData.successful) || 0
    });
  } catch (error) {
    console.error('Get referrals error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/transfer-referral', async (req, res) => {
  try {
    const { telegramId, amount } = req.body;
    const transferAmount = parseFloat(amount);

    const userResult = await pool.query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    if (parseFloat(user.referral_balance) < transferAmount) {
      return res.status(400).json({ error: 'Insufficient referral balance' });
    }

    await pool.query(
      'UPDATE users SET referral_balance = referral_balance - $1, main_balance = main_balance + $1 WHERE telegram_id = $2',
      [transferAmount, telegramId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Transfer referral error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

async function start() {
  try {
    await initDatabase();
    
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (botToken) {
      initBot(botToken);
      console.log('Telegram bot initialized');
    } else {
      console.log('TELEGRAM_BOT_TOKEN not set - bot disabled');
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
