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
    
    // Fetch portfolio data after successful login
    const portfolioRes = await fetch('/api/portfolio');
    if (portfolioRes.ok) {
      const portfolioData = await portfolioRes.json();
      showDashboard(portfolioData);
    } else {
      errorElement.textContent = 'Failed to load portfolio';
    }
  } catch (error) {
    errorElement.textContent = 'Login failed: ' + error.message;
  }
}

function showDashboard(portfolioData) {
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';

  const table = document.getElementById('portfolio-table');
  table.innerHTML = '<table><tr><th>Ticker</th><th>Shares</th></tr>';

  portfolioData.forEach(item => {
    const row = table.querySelector('table').insertRow();
    row.innerHTML = `<td>${item.ticker}</td><td>${item.shares}</td>`;
  });
}
