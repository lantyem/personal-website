export async function getUserFromSession(request, env) {
  const cookie = request.headers.get("Cookie");
  if (!cookie) return null;

  const sessionToken = cookie
    .split("; ")
    .find(c => c.startsWith("session="))
    ?.split("=")[1];

  if (!sessionToken) return null;

  const user = await env.DB.prepare(
    "SELECT * FROM users WHERE session_token = ?"
  ).bind(sessionToken).first();

  return user || null;
}

export function requireAdmin(user) {
  if (!user || user.role !== "admin") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { 
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  return null;
}