let telegramUser = null;
let userData = null;
let settings = {};
let selectedPackage = null;
let isProcessing = false;
let currentPaymentMethod = 'balance';

document.addEventListener('DOMContentLoaded', async () => {
  if (window.Telegram && window.Telegram.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
    telegramUser = window.Telegram.WebApp.initDataUnsafe?.user;
  }

  if (!telegramUser) {
    telegramUser = { id: 123456789, username: 'testuser', first_name: 'Test' };
  }

  await loadSettings();
  await loadUserData();
  await loadPackages();
  setupNavigation();
  setupPaymentOptions();
});

async function loadSettings() {
  try {
    const response = await fetch('/api/settings');
    settings = await response.json();
    
    document.getElementById('usdt-address').textContent = settings.usdt_address || 'Not configured';
    document.getElementById('bnb-address').textContent = settings.bnb_address || 'Not configured';
    document.getElementById('binance-pay-name').textContent = settings.binance_pay_name || 'Not configured';
    document.getElementById('binance-pay-id').textContent = settings.binance_pay_id || 'Not configured';
    
    const customerSupportBtn = document.getElementById('customer-support-btn');
    
    if (settings.customer_support_link) {
      customerSupportBtn.href = settings.customer_support_link;
    }
    
    if (settings.telegram_channel) {
      document.getElementById('telegram-channel-link').href = settings.telegram_channel;
    }
    if (settings.telegram_group) {
      document.getElementById('telegram-group-link').href = settings.telegram_group;
    }
    if (settings.youtube_channel) {
      document.getElementById('youtube-link').href = settings.youtube_channel;
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

async function loadUserData() {
  try {
    const response = await fetch(`/api/user/${telegramUser.id}`);
    if (response.ok) {
      userData = await response.json();
      updateBalanceDisplays();
      updateAccountInfo();
      loadReferralData();
      loadOrderHistory();
      loadDepositHistory();
    }
  } catch (error) {
    console.error('Failed to load user data:', error);
  }
}

function updateBalanceDisplays() {
  if (!userData) return;
  
  const mainBalance = parseFloat(userData.main_balance).toFixed(2);
  const holdBalance = parseFloat(userData.hold_balance).toFixed(2);
  const refBalance = parseFloat(userData.referral_balance).toFixed(2);
  const starsBalance = userData.telegram_stars_balance || 0;
  
  document.getElementById('main-balance').textContent = `$${mainBalance}`;
  document.getElementById('hold-balance').textContent = `$${holdBalance}`;
  document.getElementById('referral-balance-wallet').textContent = `$${refBalance}`;
  
  document.getElementById('acc-main-balance').textContent = `$${mainBalance}`;
  document.getElementById('acc-hold-balance').textContent = `$${holdBalance}`;
  document.getElementById('acc-ref-balance').textContent = `$${refBalance}`;
}

function updateAccountInfo() {
  if (!userData) return;
  
  document.getElementById('user-id').textContent = userData.telegram_id;
  document.getElementById('username').textContent = userData.username ? `@${userData.username}` : 'Not set';
  document.getElementById('join-date').textContent = new Date(userData.join_date).toLocaleDateString();
}

async function loadPackages() {
  try {
    const response = await fetch('/api/packages');
    const packages = await response.json();
    
    const container = document.getElementById('packages-list');
    
    if (packages.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No packages available yet</p></div>';
      return;
    }
    
    container.innerHTML = packages.map(pkg => {
      let priceDisplay = '';
      if (currentPaymentMethod === 'balance') {
        priceDisplay = `$${parseFloat(pkg.price).toFixed(2)}`;
      } else if (currentPaymentMethod === 'stars') {
        priceDisplay = `${pkg.stars_price || 0}⭐`;
      } else if (currentPaymentMethod === 'premium') {
        priceDisplay = userData?.is_premium ? 'Free' : 'Requires Premium';
      }
      
      return `
        <div class="package-card" onclick="selectPackage(${pkg.id}, '${pkg.name}', ${pkg.price}, '${pkg.input_label || 'Enter info'}', ${pkg.stars_price || 0}, ${pkg.require_premium ? 'true' : 'false'})">
          <div class="package-info">
            <h3>${pkg.name}</h3>
            <p>${pkg.description || pkg.type || ''}</p>
          </div>
          <div class="package-price">${priceDisplay}</div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Failed to load packages:', error);
  }
}

function setupPaymentOptions() {
  const paymentBtns = document.querySelectorAll('.payment-option');
  paymentBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      paymentBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPaymentMethod = btn.dataset.payment;
      await loadPackages();
    });
  });
}

async function loadReferralData() {
  try {
    const response = await fetch(`/api/referrals/${telegramUser.id}`);
    const data = await response.json();
    
    document.getElementById('ref-balance').textContent = `$${parseFloat(data.referralBalance).toFixed(2)}`;
    document.getElementById('total-referrals').textContent = data.successfulReferrals;
    
    const botUsername = 'StarBuyPremiumBot';
    const referralLink = `https://t.me/${botUsername}?start=${data.referralCode}`;
    document.getElementById('referral-link').textContent = referralLink;
  } catch (error) {
    console.error('Failed to load referral data:', error);
  }
}

async function loadOrderHistory() {
  try {
    const response = await fetch(`/api/orders/${telegramUser.id}`);
    const orders = await response.json();
    
    const container = document.getElementById('order-history');
    
    if (orders.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No orders yet</p></div>';
      return;
    }
    
    container.innerHTML = orders.map(order => `
      <div class="history-item">
        <div class="info">
          <h4>${order.package_name}</h4>
          <p>$${parseFloat(order.amount).toFixed(2)} • ${new Date(order.created_at).toLocaleDateString()}</p>
        </div>
        <span class="status ${order.status.toLowerCase()}">${order.status}</span>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load order history:', error);
  }
}

async function loadDepositHistory() {
  try {
    const response = await fetch(`/api/deposits/${telegramUser.id}`);
    const deposits = await response.json();
    
    const container = document.getElementById('deposit-history');
    
    if (deposits.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No deposits yet</p></div>';
      return;
    }
    
    container.innerHTML = deposits.map(deposit => `
      <div class="history-item">
        <div class="info">
          <h4>Binance Pay Deposit</h4>
          <p>$${parseFloat(deposit.amount).toFixed(2)} • ${new Date(deposit.created_at).toLocaleDateString()}</p>
        </div>
        <span class="status ${deposit.status.toLowerCase()}">${deposit.status}</span>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load deposit history:', error);
  }
}

function setupNavigation() {
  const navBtns = document.querySelectorAll('.nav-btn');
  const pages = document.querySelectorAll('.page');
  
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetPage = btn.dataset.page;
      
      navBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      pages.forEach(page => {
        page.classList.remove('active');
        if (page.id === targetPage) {
          page.classList.add('active');
        }
      });
      
      if (targetPage === 'wallet') {
        loadUserData();
      } else if (targetPage === 'account') {
        loadOrderHistory();
      }
    });
  });
}

function selectPackage(id, name, price, inputLabel, starsPrice, requirePremium) {
  if (!userData) {
    alert('Please wait for data to load');
    return;
  }
  
  const method = currentPaymentMethod;
  
  if (method === 'balance' && parseFloat(userData.main_balance) < price) {
    alert('Insufficient balance. Please add money to your wallet first.');
    return;
  }
  
  if (method === 'stars' && userData.telegram_stars_balance < starsPrice) {
    alert('Insufficient Telegram Stars. Stars coming soon!');
    return;
  }
  
  if (method === 'premium' && !userData.is_premium) {
    alert('This package requires Telegram Premium');
    return;
  }
  
  selectedPackage = { id, name, price, starsPrice, requirePremium, method };
  
  document.getElementById('modal-package-name').textContent = name;
  const priceDisplay = method === 'balance' ? `$${price.toFixed(2)}` : method === 'stars' ? `${starsPrice}⭐` : 'Free';
  document.getElementById('modal-price-display').innerHTML = `Price: <span id="modal-package-price">${priceDisplay}</span>`;
  document.getElementById('modal-input-label').textContent = inputLabel;
  document.getElementById('order-input').value = '';
  document.getElementById('order-screenshot').value = '';
  document.getElementById('confirm-order-btn').disabled = false;
  
  const premiumNotice = document.getElementById('premium-notice');
  if (requirePremium && method === 'premium') {
    premiumNotice.classList.remove('hidden');
  } else {
    premiumNotice.classList.add('hidden');
  }
  
  document.getElementById('order-modal').classList.remove('hidden');
}

function closeOrderModal() {
  document.getElementById('order-modal').classList.add('hidden');
  selectedPackage = null;
}

async function confirmOrder() {
  if (isProcessing || !selectedPackage) return;
  
  const userInput = document.getElementById('order-input').value.trim();
  const screenshot = document.getElementById('order-screenshot').files[0];
  
  if (!userInput) {
    alert('Please enter the required information');
    return;
  }
  
  if (!screenshot) {
    alert('Please upload a screenshot');
    return;
  }
  
  isProcessing = true;
  const btn = document.getElementById('confirm-order-btn');
  btn.disabled = true;
  btn.textContent = 'Processing...';
  
  try {
    const formData = new FormData();
    formData.append('telegramId', telegramUser.id);
    formData.append('packageId', selectedPackage.id);
    formData.append('packageName', selectedPackage.name);
    formData.append('userInput', userInput);
    formData.append('screenshot', screenshot);
    
    let endpoint = '/api/order';
    if (selectedPackage.method === 'stars') {
      formData.append('starsAmount', selectedPackage.starsPrice);
      endpoint = '/api/order-stars';
    } else {
      formData.append('amount', selectedPackage.price);
      formData.append('paymentMethod', selectedPackage.method);
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (result.success) {
      alert('Order placed successfully!');
      closeOrderModal();
      await loadUserData();
    } else {
      alert(result.error || 'Failed to place order');
    }
  } catch (error) {
    console.error('Order error:', error);
    alert('Failed to place order. Please try again.');
  } finally {
    isProcessing = false;
    btn.disabled = false;
    btn.textContent = 'Confirm Order';
  }
}

function showDepositForm() {
  document.getElementById('deposit-form').classList.remove('hidden');
  document.getElementById('deposit-method').addEventListener('change', updateDepositInfo);
}

function hideDepositForm() {
  document.getElementById('deposit-form').classList.add('hidden');
  document.getElementById('deposit-amount').value = '';
  document.getElementById('tx-hash').value = '';
}

function updateDepositInfo() {
  const method = document.getElementById('deposit-method').value;
  const usdtInfo = document.getElementById('usdt-info');
  const bnbInfo = document.getElementById('bnb-info');
  const binancePayInfo = document.getElementById('binance-pay-info');
  const amountInput = document.getElementById('deposit-amount');
  const txHashLabel = document.getElementById('tx-hash-label');
  
  usdtInfo.classList.add('hidden');
  bnbInfo.classList.add('hidden');
  binancePayInfo.classList.add('hidden');
  
  if (method === 'usdt') {
    usdtInfo.classList.remove('hidden');
    amountInput.min = '10';
    txHashLabel.textContent = 'Transaction Hash';
  } else if (method === 'bnb') {
    bnbInfo.classList.remove('hidden');
    amountInput.min = '1';
    txHashLabel.textContent = 'Transaction Hash';
  } else if (method === 'binance-pay') {
    binancePayInfo.classList.remove('hidden');
    amountInput.min = '2';
    txHashLabel.textContent = 'Order ID (Numbers Only)';
  }
  amountInput.value = '';
}

async function submitDeposit() {
  if (isProcessing) return;
  
  const method = document.getElementById('deposit-method').value;
  const amount = parseFloat(document.getElementById('deposit-amount').value);
  const txHash = document.getElementById('tx-hash').value.trim();
  
  let minAmount = 2;
  if (method === 'usdt') minAmount = 10;
  else if (method === 'bnb') minAmount = 1;
  
  if (!amount || amount < minAmount) {
    alert(`Minimum deposit is $${minAmount}`);
    return;
  }
  
  if (!txHash) {
    alert(`Please enter ${method === 'binance-pay' ? 'Order ID' : 'transaction hash'}`);
    return;
  }
  
  if (method === 'binance-pay' && !/^\d+$/.test(txHash)) {
    alert('Order ID must contain numbers only');
    return;
  }
  
  isProcessing = true;
  const btn = document.getElementById('submit-deposit-btn');
  btn.disabled = true;
  btn.textContent = 'Processing...';
  
  try {
    const response = await fetch('/api/deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telegramId: telegramUser.id,
        amount,
        method: method === 'binance-pay' ? 'Binance Pay' : method.toUpperCase(),
        txHash
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      alert('Deposit submitted successfully! It will be processed shortly.');
      hideDepositForm();
      await loadUserData();
    } else {
      alert(result.error || 'Failed to submit deposit');
    }
  } catch (error) {
    console.error('Deposit error:', error);
    alert('Failed to submit deposit. Please try again.');
  } finally {
    isProcessing = false;
    btn.disabled = false;
    btn.textContent = 'Submit Deposit';
  }
}

function copyReferralLink() {
  const link = document.getElementById('referral-link').textContent;
  navigator.clipboard.writeText(link).then(() => {
    alert('Referral link copied!');
  }).catch(() => {
    alert('Failed to copy link');
  });
}

async function transferReferralBalance() {
  if (isProcessing) return;
  
  const amount = parseFloat(document.getElementById('transfer-amount').value);
  
  if (!amount || amount <= 0) {
    alert('Please enter a valid amount');
    return;
  }
  
  if (!userData || parseFloat(userData.referral_balance) < amount) {
    alert('Insufficient referral balance');
    return;
  }
  
  isProcessing = true;
  
  try {
    const response = await fetch('/api/transfer-referral', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegramId: telegramUser.id, amount })
    });
    
    const result = await response.json();
    
    if (result.success) {
      alert('Transfer successful!');
      document.getElementById('transfer-amount').value = '';
      await loadUserData();
      await loadReferralData();
    } else {
      alert(result.error || 'Transfer failed');
    }
  } catch (error) {
    console.error('Transfer error:', error);
    alert('Transfer failed. Please try again.');
  } finally {
    isProcessing = false;
  }
}
