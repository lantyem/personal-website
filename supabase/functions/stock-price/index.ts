const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function readTicker(req: Request): Promise<string | null> {
  const fromQuery = new URL(req.url).searchParams.get("ticker");
  if (fromQuery) return fromQuery;

  if (req.method === "POST") {
    try {
      const body = await req.json();
      if (typeof body?.ticker === "string") return body.ticker;
    } catch {
      return null;
    }
  }

  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const ticker = await readTicker(req);

  if (!ticker) {
    return json({ error: "ticker parameter required" }, 400);
  }

  try {
    const yahoo = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${
        encodeURIComponent(ticker.toUpperCase())
      }?interval=1d&range=1d`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      },
    );

    if (!yahoo.ok) {
      return json({ error: "Ticker not found", status: yahoo.status }, 404);
    }

    const data = await yahoo.json();
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;

    if (price === undefined || price === null) {
      return json({ error: "Price not available" }, 404);
    }

    return json({ ticker: ticker.toUpperCase(), price }, 200);
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});
