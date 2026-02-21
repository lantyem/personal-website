export async function onRequestGet(context) {
  const { request, env } = context;

  const cookie = request.headers.get("Cookie");
  if (!cookie) return new Response("Unauthorized", { status: 401 });

  const token = cookie.split("=")[1];

  const user = await env.DB.prepare(
    "SELECT * FROM users WHERE session_token = ?"
  ).bind(token).first();

  if (!user) return new Response("Unauthorized", { status: 401 });

  const holdings = await env.DB.prepare(
    "SELECT ticker, shares FROM portfolios WHERE user_id = ?"
  ).bind(user.id).all();

  return Response.json(holdings.results);
}