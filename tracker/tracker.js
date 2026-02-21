let userRole = null;

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

async function loadUserDashboard() {
  try {
    const res = await fetch('/api/portfolio');
    if (!res.ok) {
      document.getElementById('login-error').textContent = 'Failed to load portfolio';
      return;
    }

    const portfolioData = await res.json();
    document.getElementById('dashboard-title').textContent = 'Your Portfolio';
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

function showUserDashboard(portfolioData) {
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';

  const table = document.getElementById('portfolio-table');
  table.innerHTML = '<table><tr><th>Ticker</th><th>Shares</th></tr>';

  portfolioData.forEach(item => {
    const row = table.querySelector('table').insertRow();
    row.innerHTML = `<td>${item.ticker}</td><td>${item.shares}</td>`;
  });
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
