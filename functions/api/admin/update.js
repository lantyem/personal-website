import { getUserFromSession, requireAdmin } from "../../../utils/auth.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  const user = await getUserFromSession(request, env);
  if (!user) return new Response("Not logged in", { status: 401 });

  const adminCheck = requireAdmin(user);
  if (adminCheck) return adminCheck;

  const body = await request.json();
  const { user_id, ticker, shares } = body;

  await env.DB.prepare(`
    UPDATE portfolios
    SET shares = ?
    WHERE user_id = ? AND ticker = ?
  `).bind(shares, user_id, ticker).run();

  return new Response("Updated");
}