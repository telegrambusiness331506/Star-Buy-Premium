const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT UNIQUE NOT NULL,
        username VARCHAR(255),
        first_name VARCHAR(255),
        main_balance DECIMAL(10,2) DEFAULT 0,
        hold_balance DECIMAL(10,2) DEFAULT 0,
        referral_balance DECIMAL(10,2) DEFAULT 0,
        telegram_stars_balance INTEGER DEFAULT 0,
        is_premium BOOLEAN DEFAULT FALSE,
        referral_code VARCHAR(50) UNIQUE,
        referred_by BIGINT,
        first_order_completed BOOLEAN DEFAULT FALSE,
        referral_rewarded BOOLEAN DEFAULT FALSE,
        join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS packages (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        stars_price INTEGER DEFAULT 0,
        type VARCHAR(100),
        input_label VARCHAR(255),
        description TEXT,
        allow_stars BOOLEAN DEFAULT FALSE,
        require_premium BOOLEAN DEFAULT FALSE,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(50) UNIQUE NOT NULL,
        user_id BIGINT NOT NULL,
        package_id INTEGER REFERENCES packages(id),
        package_name VARCHAR(255),
        amount DECIMAL(10,2) NOT NULL,
        stars_amount INTEGER DEFAULT 0,
        payment_method VARCHAR(50) DEFAULT 'balance',
        user_input TEXT,
        screenshot_path VARCHAR(500),
        status VARCHAR(50) DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS deposits (
        id SERIAL PRIMARY KEY,
        deposit_id VARCHAR(50) UNIQUE NOT NULL,
        user_id BIGINT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        method VARCHAR(100) DEFAULT 'Binance Pay',
        binance_order_id VARCHAR(255),
        screenshot_path VARCHAR(500),
        status VARCHAR(50) DEFAULT 'Processing',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS referrals (
        id SERIAL PRIMARY KEY,
        referrer_id BIGINT NOT NULL,
        referred_id BIGINT NOT NULL,
        reward_amount DECIMAL(10,2) DEFAULT 0,
        rewarded BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT
      );

      INSERT INTO settings (key, value) VALUES 
        ('referral_reward', '0.5'),
        ('owner_id', ''),
        ('order_admin_id', ''),
        ('support_admin_id', ''),
        ('official_channel', ''),
        ('telegram_channel', ''),
        ('telegram_group', ''),
        ('youtube_channel', ''),
        ('customer_support_link', ''),
        ('usdt_address', ''),
        ('bnb_address', ''),
        ('binance_pay_name', ''),
        ('binance_pay_id', ''),
        ('allow_stars_payment', 'true'),
        ('allow_premium_purchase', 'true')
      ON CONFLICT (key) DO NOTHING;
    `);
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { pool, initDatabase };
