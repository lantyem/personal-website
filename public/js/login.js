document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = e.target.username.value;
  const password = e.target.password.value;

  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  if (!res.ok) {
    alert("Invalid login");
    return;
  }

  const data = await res.json();

  if (data.role === "admin") {
    window.location.href = "/admin.html";
  } else {
    window.location.href = "/dashboard.html";
  }
});