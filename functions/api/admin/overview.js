import { getUserFromSession, requireAdmin } from "../../utils/auth.js";

export async function onRequestGet(context) {
  const { request, env } = context;

  const user = await getUserFromSession(request, env);
  if (!user) {
    return new Response("Not logged in", { status: 401 });
  }

  const adminCheck = requireAdmin(user);
  if (adminCheck) return adminCheck;

  // Now we know it's admin
  const portfolios = await env.DB.prepare(`
    SELECT users.username, portfolios.ticker, portfolios.shares
    FROM portfolios
    JOIN users ON portfolios.user_id = users.id
  `).all();

  return new Response(JSON.stringify(portfolios.results), {
    headers: { "Content-Type": "application/json" }
  });
}