import { getUserFromSession } from "../utils/auth.js";

export async function onRequest(context) {
  if (context.request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  const { request, env } = context;

  const user = await getUserFromSession(request, env);
  if (!user) return new Response("Not logged in", { status: 401 });

  const result = await env.DB.prepare(`
    SELECT ticker, shares
    FROM portfolios
    WHERE user_id = ?
  `).bind(user.id).all();

  return new Response(JSON.stringify(result.results), {
    headers: { "Content-Type": "application/json" }
  });
}