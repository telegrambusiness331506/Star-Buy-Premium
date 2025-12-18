# Star Buy Premium Shop

## Overview
A Telegram Bot + Web Mini App for Telegram Stars & Premium purchases using onchain payments (USDT & BNB).

## Project Structure
```
/src
  - index.js      # Main Express server
  - bot.js        # Telegram bot logic
  - database.js   # PostgreSQL database setup
/public
  - index.html    # Web Mini App main page
  /css
    - style.css   # Styling
  /js
    - app.js      # Frontend JavaScript
  /uploads        # User uploaded screenshots (orders)
```

## Configuration Required
- `TELEGRAM_BOT_TOKEN` - Get from @BotFather on Telegram

## Admin Settings (via database)
Update the `settings` table with:
- `owner_id` - Telegram user ID of the owner
- `order_admin_id` - Telegram user ID for order management
- `support_admin_id` - Telegram user ID for support
- `official_channel` - Telegram channel link
- `telegram_channel` - Community channel link
- `telegram_group` - Community group link
- `youtube_channel` - YouTube channel link
- `customer_support_link` - Customer support link
- `usdt_address` - USDT wallet address (BEP20)
- `bnb_address` - BNB wallet address (BEP20)
- `referral_reward` - Amount in USD for referral rewards

## Bot Commands
- `/start` - Opens welcome message with shop button
- `/admin` - Admin dashboard (owner only)
- `/orders` - View and manage orders (owner + order admin)
- `/deposits` - View and manage deposits (owner + order admin)
- `/support <user_id>` - View user details (all admins)

## Deposit Methods
- **USDT (BEP20)**: Minimum $10
- **BNB (BEP20)**: Minimum $1

## Database
PostgreSQL with tables:
- users - User accounts and balances (main, hold, referral)
- packages - Available purchase packages
- orders - User orders with screenshot uploads
- deposits - User deposits with transaction hashes
- referrals - Referral tracking
- settings - System configuration

## Tech Stack
- Node.js 20
- Express.js
- node-telegram-bot-api
- PostgreSQL
- Vanilla JavaScript frontend

## Features
✅ Dynamic package system
✅ Wallet with multiple balance types
✅ USDT & BNB onchain deposits
✅ Order management with screenshots
✅ Admin dashboard with order/deposit management
✅ Referral program with one-time rewards
✅ Community links and support integration

## Recent Changes
- December 18, 2025: Replaced Binance Pay with USDT/BNB deposits, removed Terms & Policies
