export async function onRequestPost(context) {
  const { request, env } = context;
  const body = await request.json();

  const username = body.username;
  const password = body.password;

  const hash = await sha256(password);

  const user = await env.DB.prepare(
    "SELECT * FROM users WHERE username = ?"
  ).bind(username).first();

  if (!user || user.password_hash !== hash) {
    return new Response("Invalid credentials", { status: 401 });
  }

  const sessionToken = crypto.randomUUID();

  await env.DB.prepare(
    "UPDATE users SET session_token = ? WHERE id = ?"
  ).bind(sessionToken, user.id).run();

  return new Response("OK", {
    headers: {
      "Set-Cookie": `session=${sessionToken}; HttpOnly; Path=/`
    }
  });
}

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}