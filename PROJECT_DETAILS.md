# Star Buy Premium Shop - Complete Project Documentation

## Project Overview

**Name:** Star Buy Premium Shop

**Purpose:** A Telegram mini-app e-commerce platform that sells Telegram Stars (20 pricing tiers from $1 to $20,000) and Premium subscriptions (3 tiers: $15, $30, $60).

**Platform:** Telegram Mini-App (Web-based)

**Business Model:** Commission-based reseller platform with multiple payment methods

**Status:** Fully functional core system with existing features working. Admin panel pending development.

---

## Technology Stack

### Backend
- **Runtime:** Node.js (JavaScript)
- **Framework:** Express.js (API server)
- **Database:** PostgreSQL (via pg driver)
- **Port:** 5000 (0.0.0.0)
- **File Uploads:** Multer (disk-based storage)

### Frontend
- **Type:** Single Page Application (HTML/CSS/JavaScript)
- **Framework:** None (Vanilla JavaScript)
- **Telegram SDK:** telegram-web-app.js
- **Icons:** Font Awesome 6.4.0
- **Styling:** Custom CSS

### Key Libraries
- express: Web framework
- cors: Cross-origin requests
- pg: PostgreSQL client
- multer: File upload handling
- node-telegram-bot-api: Telegram bot integration
- uuid: ID generation
- dotenv: Environment configuration

---

## Project Structure

```
project-root/
├── src/
│   ├── index.js            # Main Express server & API endpoints
│   ├── database.js         # PostgreSQL connection & schema initialization
│   └── bot.js              # Telegram bot notifications (referenced)
├── public/
│   ├── index.html          # Main HTML page with all UI sections
│   ├── js/
│   │   └── app.js          # Frontend application logic
│   ├── css/
│   │   └── style.css       # Styling
│   └── uploads/            # User-uploaded screenshots
├── data/
│   ├── packages.json       # Pricing data (20 Stars + 3 Premium)
│   └── settings.json       # Configuration data
├── package.json            # Node.js dependencies
└── PROJECT_DETAILS.md      # This file
```

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username VARCHAR(255),
  first_name VARCHAR(255),
  main_balance DECIMAL(10,2) DEFAULT 0,           -- Available balance for purchases
  hold_balance DECIMAL(10,2) DEFAULT 0,           -- Balance in pending orders
  referral_balance DECIMAL(10,2) DEFAULT 0,       -- Earnings from referrals
  telegram_stars_balance INTEGER DEFAULT 0,       -- Telegram Stars balance
  is_premium BOOLEAN DEFAULT FALSE,               -- Premium subscription status
  referral_code VARCHAR(50) UNIQUE,               -- Unique referral link
  referred_by BIGINT,                             -- ID of referrer
  first_order_completed BOOLEAN DEFAULT FALSE,    -- First order flag
  referral_rewarded BOOLEAN DEFAULT FALSE,        -- Referral reward claimed
  join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Deposits Table
```sql
CREATE TABLE deposits (
  id SERIAL PRIMARY KEY,
  deposit_id VARCHAR(50) UNIQUE NOT NULL,        -- Unique identifier (DEP + timestamp)
  user_id BIGINT NOT NULL,                        -- Foreign key to users
  amount DECIMAL(10,2) NOT NULL,                  -- USD amount
  method VARCHAR(100) DEFAULT 'Binance Pay',      -- Payment method
  binance_order_id VARCHAR(255),                  -- Transaction hash or Binance Pay Order ID
  screenshot_path VARCHAR(500),                   -- Optional screenshot path
  status VARCHAR(50) DEFAULT 'Processing',        -- Status: Processing, Approved, Rejected
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Orders Table
```sql
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(50) UNIQUE NOT NULL,          -- Unique identifier (ORD + timestamp)
  user_id BIGINT NOT NULL,                        -- Foreign key to users
  package_id INTEGER REFERENCES packages(id),     -- Which package ordered
  package_name VARCHAR(255),                      -- Package name copy
  amount DECIMAL(10,2) NOT NULL,                  -- USD cost
  stars_amount INTEGER DEFAULT 0,                 -- Telegram Stars amount (if stars package)
  payment_method VARCHAR(50) DEFAULT 'balance',   -- How it was paid
  user_input TEXT,                                -- User's input for the order
  screenshot_path VARCHAR(500),                   -- Uploaded screenshot
  status VARCHAR(50) DEFAULT 'PENDING',           -- PENDING, COMPLETED, REJECTED, CANCELLED
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Referrals Table
```sql
CREATE TABLE referrals (
  id SERIAL PRIMARY KEY,
  referrer_id BIGINT NOT NULL,                   -- User who referred
  referred_id BIGINT NOT NULL,                    -- User who was referred
  reward_amount DECIMAL(10,2) DEFAULT 0,          -- Reward amount
  rewarded BOOLEAN DEFAULT FALSE,                 -- Has reward been claimed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Settings Table
```sql
CREATE TABLE settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT
);
```

---

## Configuration Data

### packages.json - Pricing Tiers

#### Telegram Stars (20 packages)
| Package | Stars | Price |
|---------|-------|-------|
| 1 | 50 | $1.00 |
| 2 | 75 | $1.50 |
| 3 | 100 | $2.00 |
| 4 | 150 | $3.00 |
| 5 | 250 | $5.00 |
| 6 | 350 | $7.00 |
| 7 | 500 | $10.00 |
| 8 | 750 | $15.00 |
| 9 | 1K | $20.00 |
| 10 | 1.5K | $30.00 |
| 11 | 2.5K | $50.00 |
| 12 | 5K | $100.00 |
| 13 | 10K | $200.00 |
| 14 | 25K | $500.00 |
| 15 | 35K | $700.00 |
| 16 | 50K | $1,000.00 |
| 17 | 100K | $2,000.00 |
| 18 | 150K | $3,000.00 |
| 19 | 500K | $10,000.00 |
| 20 | 1M | $20,000.00 |

#### Premium Subscriptions (3 packages)
| Package | Duration | Price |
|---------|----------|-------|
| 21 | 3 Months | $15.00 |
| 22 | 6 Months | $30.00 |
| 23 | 1 Year | $60.00 |

### settings.json - Configuration
```json
{
  "referral_reward": "0.5",                    // Reward amount per referral
  "owner_id": "",                              // Bot owner Telegram ID
  "order_admin_id": "",                        // Admin for order approvals
  "support_admin_id": "",                      // Support staff ID
  "official_channel": "",                      // Official channel link
  "telegram_channel": "",                      // Telegram channel URL
  "telegram_group": "",                        // Telegram group URL
  "youtube_channel": "",                       // YouTube channel URL
  "customer_support_link": "",                 // Support URL
  "usdt_address": "",                          // USDT BEP20 wallet address
  "bnb_address": "",                           // BNB BEP20 wallet address
  "binance_pay_name": "",                      // Binance Pay username
  "binance_pay_id": "",                        // Binance Pay ID
  "allow_stars_payment": "true",               // Enable Stars packages
  "allow_premium_purchase": "true"             // Enable Premium packages
}
```

---

## API Endpoints

### User Endpoints

#### GET `/api/user/:telegramId`
Fetch user data

**Response:**
```json
{
  "id": 1,
  "telegram_id": 123456789,
  "username": "john_doe",
  "first_name": "John",
  "main_balance": "100.50",
  "hold_balance": "15.00",
  "referral_balance": "5.00",
  "telegram_stars_balance": 500,
  "is_premium": false,
  "referral_code": "REF123",
  "join_date": "2024-12-20T10:00:00Z"
}
```

#### GET `/api/packages`
Get all active packages

**Response:**
```json
[
  {
    "id": 1,
    "name": "50 Stars",
    "price": 1.00,
    "type": "stars",
    "active": true
  },
  ...
]
```

#### GET `/api/settings`
Get all settings configuration

**Response:**
```json
{
  "referral_reward": "0.5",
  "owner_id": "",
  "usdt_address": "0x...",
  ...
}
```

### Deposit Endpoints

#### POST `/api/deposit`
Submit a deposit request

**Request:**
```json
{
  "telegramId": 123456789,
  "amount": 50.00,
  "method": "USDT",              // USDT, BNB, or Binance Pay
  "txHash": "0x1234567890..."    // Transaction hash or Binance Order ID
}
```

**Response:**
```json
{
  "success": true,
  "deposit": {
    "id": 1,
    "deposit_id": "DEP12345678",
    "user_id": 123456789,
    "amount": "50.00",
    "method": "USDT",
    "binance_order_id": "0x...",
    "status": "Processing",
    "created_at": "2024-12-24T10:00:00Z"
  }
}
```

**Validation:**
- USDT: Minimum $10
- BNB: Minimum $1
- Binance Pay: Minimum $2

#### GET `/api/deposits/:telegramId`
Get user's deposit history

**Response:**
```json
[
  {
    "deposit_id": "DEP12345678",
    "amount": "50.00",
    "method": "USDT",
    "status": "Processing",
    "created_at": "2024-12-24T10:00:00Z"
  },
  ...
]
```

### Order Endpoints

#### POST `/api/order`
Create a purchase order (using main balance)

**Request:**
```json
{
  "telegramId": 123456789,
  "packageId": 21,
  "packageName": "Premium 3 Months",
  "amount": 15.00,
  "paymentMethod": "balance",
  "userInput": "username@email.com"
  // File: screenshot
}
```

**Response:**
```json
{
  "success": true,
  "order": {
    "order_id": "ORD12345678",
    "user_id": 123456789,
    "package_name": "Premium 3 Months",
    "amount": "15.00",
    "status": "PENDING",
    "created_at": "2024-12-24T10:00:00Z"
  }
}
```

**Balance Changes:**
- When order placed: main_balance - amount → hold_balance + amount
- When order approved: hold_balance → delivered to user
- When order cancelled: hold_balance → main_balance (reversal)

#### POST `/api/order-stars`
Create a purchase order for Telegram Stars

**Request:**
```json
{
  "telegramId": 123456789,
  "packageId": 1,
  "packageName": "50 Stars",
  "starsAmount": 50,
  "userInput": "@username"
  // File: screenshot
}
```

**Response:**
```json
{
  "success": true,
  "order": {
    "order_id": "ORD12345678",
    "package_name": "50 Stars",
    "stars_amount": 50,
    "status": "PENDING"
  }
}
```

#### GET `/api/orders/:telegramId`
Get user's order history

**Response:**
```json
[
  {
    "order_id": "ORD12345678",
    "package_name": "Premium 3 Months",
    "amount": "15.00",
    "status": "PENDING",
    "created_at": "2024-12-24T10:00:00Z"
  },
  ...
]
```

### Referral Endpoints

#### GET `/api/referrals/:telegramId`
Get referral information

**Response:**
```json
{
  "referralCode": "REF123",
  "referralBalance": "10.50",
  "totalReferrals": 5,
  "successfulReferrals": 3
}
```

#### POST `/api/transfer-referral`
Transfer referral earnings to main balance

**Request:**
```json
{
  "telegramId": 123456789,
  "amount": 10.00
}
```

**Response:**
```json
{
  "success": true
}
```

---

## Frontend Pages & Features

### 1. **Home Page** (Default)
- **Title:** "Star Buy Premium Shop - Browse and purchase packages"
- **Content:** 
  - Stars section: 20 packages in 3-column compact grid
  - Premium section: 3 packages in 3-column compact grid
- **Navigation:** 4 bottom tabs
- **Interaction:** Click package to open order modal

### 2. **Wallet Page**
- **Balance Cards:**
  - Main Balance: Available funds for purchases
  - Hold Balance: Funds in pending orders
- **Features:**
  - "Add Money" button opens deposit form
  - Deposit form with 3 payment methods
  - Deposit history showing all past deposits
- **Payment Methods:**
  - USDT (BEP20): Min $10 - requires wallet address & tx hash
  - BNB (BEP20): Min $1 - requires wallet address & tx hash
  - Binance Pay: Min $2 - requires Binance Pay ID & order ID

### 3. **Account Page**
- **User Info Display:**
  - User ID (Telegram ID)
  - Username
  - Join Date
  - Main Balance
  - Hold Balance
- **Features:**
  - Order history showing all past orders with statuses
  - Support button (links to configured support URL)

### 4. **More Page**
- **Features Section:**
  - Secure Payments icon & description
  - Instant Processing icon & description
  - 24/7 Support icon & description
- **Community Links:**
  - Telegram Channel link
  - Telegram Group link
  - YouTube Channel link
- **How It Works:**
  - Step-by-step instructions
  - Balance withdrawal note

### 5. **Order Modal**
- **Triggered:** Clicking any package
- **Content:**
  - Package name and price
  - Input field (dynamic label based on package)
  - Screenshot upload (required)
  - Premium notice (if requires premium)
- **Actions:**
  - Confirm Order button
  - Cancel button

---

## Frontend Application Logic (app.js)

### Key Functions

#### Initialization
- `initializeApp()` - Loads user data from API, initializes Telegram SDK
- `loadUserData()` - Fetches user info and updates UI
- `setupEventListeners()` - Binds button clicks and page navigation

#### Page Navigation
- `showPage(page)` - Shows/hides page sections
- Bottom nav tabs: Home, Wallet, Account, More

#### Balance Management
- `updateBalanceDisplays()` - Updates main and hold balance in UI
- `loadDepositHistory()` - Fetches and displays past deposits
- `loadOrderHistory()` - Fetches and displays past orders

#### Deposit Flow
- `showDepositForm()` - Shows deposit form
- `hideDepositForm()` - Hides deposit form
- `updateDepositInfo()` - Shows/hides method-specific info
- `validateDeposit()` - Validates amount and transaction hash
- `submitDeposit()` - Posts deposit to API

#### Order Flow
- `openOrderModal(pkg)` - Opens order modal with package details
- `closeOrderModal()` - Closes order modal
- `confirmOrder()` - Validates and submits order

#### Account Info
- `updateAccountInfo()` - Displays user account details
- `formatDate(date)` - Formats timestamps for display

---

## Business Logic & Rules

### Balance System

**Three Balance Types:**

1. **Main Balance** - User's available funds for purchases
   - Updated when: Deposit approved by admin
   - Decremented when: User creates a new order (moved to Hold)
   
2. **Hold Balance** - Funds locked in pending orders
   - Incremented when: Order created (from Main)
   - Decremented when: Order completed or cancelled
   
3. **Referral Balance** - Earnings from referrals
   - Updated when: Referred user completes purchase
   - Can be transferred to Main Balance

### Deposit Flow

1. User submits deposit request with:
   - Amount (USD)
   - Payment method (USDT/BNB/Binance Pay)
   - Transaction hash or Order ID
2. System creates deposit record with status: "Processing"
3. Telegram bot notifies admin
4. **Admin approves/rejects**
5. If approved: User's main_balance += amount
6. If rejected: Deposit marked as "Rejected"

### Order Flow

1. User clicks package and opens order modal
2. Fills in required information and uploads screenshot
3. Clicks "Confirm Order"
4. **Balance Check:** If using balance, verify main_balance >= amount
5. **Balance Update:** 
   - main_balance -= amount
   - hold_balance += amount
6. Order created with status: "PENDING"
7. Telegram bot notifies admin
8. **Admin approves/rejects/cancels**
9. If approved: Order marked "COMPLETED" (hold → delivery)
10. If cancelled: hold_balance → main_balance (reversal)

### Validation Rules

**Deposits:**
- USDT minimum: $10
- BNB minimum: $1
- Binance Pay minimum: $2
- Transaction hash required
- Binance Pay Order ID must be numeric only

**Orders:**
- Screenshot required
- User input required (dynamic label)
- Sufficient main balance required
- Package must be active

---

## Current Status & Features

### ✅ Implemented Features
- User registration & authentication (Telegram ID based)
- Balance system (main, hold, referral)
- Deposit submission with 3 payment methods
- Purchase orders (Stars and Premium)
- Order history display
- Deposit history display
- Referral system (basic)
- Telegram bot notifications
- Multi-page navigation
- Responsive design for Telegram mini-app

### ⏳ Pending Features (Admin Panel)
- Admin dashboard with overview stats
- Deposit approval/rejection interface
- Order approval/rejection interface
- User search and management
- Admin activity logging
- Notification system for pending actions
- Admin action history

---

## Telegram Bot Integration

The application uses `node-telegram-bot-api` for notifications:

- **Deposit Notification:** Sent when user submits deposit
- **Order Notification:** Sent when user creates order
- Recipients: Configured admin IDs in settings

---

## Error Handling

### API Errors
- 400: Bad Request (validation failed)
- 404: Not Found (user/resource not found)
- 500: Server Error

### Frontend Validation
- Amount validation (minimum values)
- Transaction hash validation
- File upload validation
- Balance sufficiency check

---

## Security Considerations

### Current Implementation
- PostgreSQL prepared statements (SQL injection protection)
- Telegram ID as primary user identifier
- File upload to local storage
- CORS enabled for all origins
- Environment variable for bot token

### Needed for Production
- Admin authentication/authorization
- Rate limiting
- Input sanitization for all fields
- Secure file upload handling
- HTTPS required
- CSRF protection
- XSS protection

---

## Environment Variables

```bash
DATABASE_URL=postgresql://user:password@host:port/database
TELEGRAM_BOT_TOKEN=your_bot_token_here
PORT=5000 (optional, defaults to 5000)
```

---

## Installation & Running

### Prerequisites
- Node.js installed
- PostgreSQL database
- Telegram bot token (optional for core features)

### Setup Steps

1. **Clone/Setup Project**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   export DATABASE_URL="postgresql://..."
   export TELEGRAM_BOT_TOKEN="..." (optional)
   ```

3. **Start Server**
   ```bash
   npm start
   # or
   node src/index.js
   ```

4. **Access**
   - Open Telegram mini-app pointing to: `http://localhost:5000`
   - Or access directly: `http://YOUR_DOMAIN:5000`

---

## File Upload Storage

- **Location:** `public/uploads/`
- **Filename:** `{timestamp}-{original_filename}`
- **Access:** `/uploads/{filename}` URL path
- **Types:** Images (from order and deposit forms)

---

## Data Consistency Rules

### Balance Integrity
- Deposits only add to main_balance after admin approval
- Orders only deduct from main_balance (temporarily moved to hold_balance)
- Cancelled orders return hold_balance to main_balance
- All balance updates are atomic database transactions

### Order Status Progression
```
PENDING → COMPLETED (approved)
PENDING → REJECTED (rejected)
PENDING → CANCELLED (cancelled)
```

### Deposit Status Progression
```
Processing → Approved (main_balance updated)
Processing → Rejected (no balance change)
```

---

## Future Enhancement Opportunities

1. **Admin Panel System** (Currently Pending)
2. Withdrawal functionality
3. Advanced referral tiers
4. Package custom configurations
5. Multi-currency support
6. Email notifications
7. Two-factor authentication
8. Transaction history export
9. Analytics dashboard
10. Automated order fulfillment

---

## Contact & Support

- **Support Link:** Configured in settings.json
- **Telegram Channel:** Configured in settings.json
- **Telegram Group:** Configured in settings.json
- **YouTube Channel:** Configured in settings.json

---

## Development Notes

- Package and settings data stored in JSON files for quick access
- Single-page application minimizes data transfer
- All prices configured in one file for easy updates
- Database schema initialized automatically on startup
- No migrations needed - schema created if not exists

---

**Last Updated:** December 24, 2025  
**Project Version:** 1.0 (Core Features Complete)  
**Admin Panel Version:** 1.0 (Pending Development)
