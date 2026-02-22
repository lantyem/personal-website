let userRole = null;
let currentUsername = null;

async function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const errorElement = document.getElementById('login-error');

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
      errorElement.textContent = 'Invalid credentials';
      return;
    }

    const data = await res.json();
    userRole = data.role;
    currentUsername = username;
    
    // Fetch appropriate data based on role
    if (userRole === 'admin') {
      loadAdminDashboard();
    } else {
      loadUserDashboard();
    }
  } catch (error) {
    errorElement.textContent = 'Login failed: ' + error.message;
  }
}

async function getStockPrice(ticker) {
  try {
    // Using Yahoo Finance API via a free endpoint
    const response = await fetch(`https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=price`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.quoteSummary?.result?.[0]?.price?.regularMarketPrice?.raw || null;
  } catch (error) {
    console.error(`Failed to fetch price for ${ticker}:`, error);
    return null;
  }
}

async function loadUserDashboard() {
  try {
    const res = await fetch('/api/portfolio');
    if (!res.ok) {
      document.getElementById('login-error').textContent = 'Failed to load portfolio';
      return;
    }

    const portfolioData = await res.json();
    document.getElementById('dashboard-title').textContent = `${currentUsername}'s Portfolio`;
    showUserDashboard(portfolioData);
  } catch (error) {
    document.getElementById('login-error').textContent = 'Error: ' + error.message;
  }
}

async function loadAdminDashboard() {
  try {
    const res = await fetch('/api/admin/overview');
    if (!res.ok) {
      document.getElementById('login-error').textContent = 'Unauthorized';
      return;
    }

    const adminData = await res.json();
    document.getElementById('dashboard-title').textContent = 'Admin Dashboard - All Portfolios';
    showAdminDashboard(adminData);
  } catch (error) {
    document.getElementById('login-error').textContent = 'Error: ' + error.message;
  }
}

async function showUserDashboard(portfolioData) {
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';

  const table = document.getElementById('portfolio-table');
  table.innerHTML = '<table><tr><th>Ticker</th><th>Shares</th><th>Current Price</th><th>Stock Value</th></tr>';

  let portfolioValue = 0;

  for (const item of portfolioData) {
    const price = await getStockPrice(item.ticker);
    const stockValue = price ? (price * item.shares).toFixed(2) : 'N/A';
    
    if (price) {
      portfolioValue += parseFloat(stockValue);
    }

    const tableRow = table.querySelector('table').insertRow();
    tableRow.innerHTML = `
      <td>${item.ticker}</td>
      <td>${item.shares}</td>
      <td>${price ? '$' + price.toFixed(2) : 'N/A'}</td>
      <td>${stockValue !== 'N/A' ? '$' + stockValue : 'N/A'}</td>
    `;
  }

  // Add portfolio total row
  const totalRow = table.querySelector('table').insertRow();
  totalRow.innerHTML = `
    <td><strong>Total Portfolio Value</strong></td>
    <td></td>
    <td></td>
    <td><strong>$${portfolioValue.toFixed(2)}</strong></td>
  `;
  totalRow.style.fontWeight = 'bold';
  totalRow.style.backgroundColor = '#f0f0f0';
}

function showAdminDashboard(adminData) {
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';

  const table = document.getElementById('portfolio-table');
  table.innerHTML = '<table><tr><th>User</th><th>Ticker</th><th>Shares</th><th>Action</th></tr>';

  adminData.forEach(row => {
    const tableRow = table.querySelector('table').insertRow();
    const inputId = `input-${row.id}-${row.ticker}`;
    tableRow.innerHTML = `
      <td>${row.username}</td>
      <td>${row.ticker}</td>
      <td><input type="number" value="${row.shares}" id="${inputId}"></td>
      <td><button onclick="updateHolding(${row.id}, '${row.ticker}')">Save</button></td>
    `;
  });
}

async function updateHolding(userId, ticker) {
  const inputId = `input-${userId}-${ticker}`;
  const input = document.getElementById(inputId);
  const shares = input.value;

  try {
    const res = await fetch('/api/admin/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        ticker,
        shares
      })
    });

    if (res.ok) {
      alert('Updated successfully');
    } else {
      alert('Failed to update');
    }
  } catch (error) {
    alert('Error: ' + error.message);
  }
}
