export async function onRequest(context) {
  if (context.request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const url = new URL(context.request.url);
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
      return new Response(JSON.stringify({ error: 'Ticker not found', status: response.status }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    const price = data.quoteSummary?.result?.[0]?.price?.regularMarketPrice?.raw;

    if (price === undefined || price === null) {
      return new Response(JSON.stringify({ error: 'Price not available', data }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ ticker, price }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Stock price error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
    });
  }
}
