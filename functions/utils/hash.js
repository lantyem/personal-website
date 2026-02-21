// hash.js
// Run this in the browser console to hash a password using SHA-256
async function hash(password) {
  const buffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

hash("yourpassword").then(console.log);
