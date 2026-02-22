// Auth utilities
async function getUserFromSession(request, env) {
  const cookie = request.headers.get('Cookie');
  if (!cookie) return null;

  const sessionToken = cookie
    .split('; ')
    .find(c => c.startsWith('session='))
    ?.split('=')[1];

  if (!sessionToken) return null;

  const user = await env.DB.prepare(
    'SELECT * FROM users WHERE session_token = ?'
  ).bind(sessionToken).first();

  return user || null;
}

function requireAdmin(user) {
  if (!user || user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  return null;
}

// Password hashing
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// API Handlers
async function handleLogin(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const body = await request.json();
  const { username, password } = body;

  const hash = await sha256(password);

  const user = await env.DB.prepare(
    'SELECT * FROM users WHERE username = ?'
  ).bind(username).first();

  if (!user || user.password_hash !== hash) {
    return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const sessionToken = crypto.randomUUID();

  await env.DB.prepare(
    'UPDATE users SET session_token = ? WHERE id = ?'
  ).bind(sessionToken, user.id).run();

  return new Response(
    JSON.stringify({ success: true, role: user.role }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `session=${sessionToken}; HttpOnly; Path=/`
      }
    }
  );
}

async function handlePortfolio(request, env) {
  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const user = await getUserFromSession(request, env);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Not logged in' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const result = await env.DB.prepare(`
    SELECT ticker, shares
    FROM portfolios
    WHERE user_id = ?
  `).bind(user.id).all();

  return new Response(JSON.stringify(result.results), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleAdminOverview(request, env) {
  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const user = await getUserFromSession(request, env);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Not logged in' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const adminCheck = requireAdmin(user);
  if (adminCheck) return adminCheck;

  const portfolios = await env.DB.prepare(`
    SELECT users.id, users.username, portfolios.ticker, portfolios.shares
    FROM portfolios
    JOIN users ON portfolios.user_id = users.id
  `).all();

  return new Response(JSON.stringify(portfolios.results), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleAdminUpdate(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const user = await getUserFromSession(request, env);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Not logged in' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const adminCheck = requireAdmin(user);
  if (adminCheck) return adminCheck;

  const body = await request.json();
  const { user_id, ticker, shares } = body;

  await env.DB.prepare(`
    UPDATE portfolios
    SET shares = ?
    WHERE user_id = ? AND ticker = ?
  `).bind(shares, user_id, ticker).run();

  return new Response(JSON.stringify({ success: true, message: 'Updated' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleStockPrice(request, env, url) {
  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const ticker = url.searchParams.get('ticker');

  if (!ticker) {
    return new Response(JSON.stringify({ error: 'ticker parameter required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Fetch from Yahoo Finance API
    const response = await fetch(
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker.toUpperCase()}?modules=price`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );

    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'Ticker not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    const price = data.quoteSummary?.result?.[0]?.price?.regularMarketPrice?.raw;

    if (price === undefined || price === null) {
      return new Response(JSON.stringify({ error: 'Price not available' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ ticker, price }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300'
      }
    });
  } catch (error) {
    console.error('Stock price error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Route API requests
    if (url.pathname === '/api/login') {
      return handleLogin(request, env);
    }
    if (url.pathname === '/api/portfolio') {
      return handlePortfolio(request, env);
    }
    if (url.pathname === '/api/admin/overview') {
      return handleAdminOverview(request, env);
    }
    if (url.pathname === '/api/admin/update') {
      return handleAdminUpdate(request, env);
    }
    if (url.pathname === '/api/stock/price') {
      return handleStockPrice(request, env, url);
    }

    // Serve static files for everything else
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    // Fallback: return 404
    return new Response('Not Found', { status: 404 });
  }
};

