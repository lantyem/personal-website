async function loadAdminData() {
  const res = await fetch("/api/admin/overview");
  if (!res.ok) {
    document.body.innerHTML = "<h2>Unauthorized</h2>";
    return;
  }

  const data = await res.json();
  const container = document.getElementById("portfolio-container");

  data.forEach(row => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <h3>${row.username}</h3>
      <p>${row.ticker}</p>
      <input type="number" value="${row.shares}" id="input-${row.id}-${row.ticker}">
      <button onclick="updateHolding(${row.id}, '${row.ticker}')">Save</button>
    `;

    container.appendChild(card);
  });
}

async function updateHolding(userId, ticker) {
  const input = document.getElementById(`input-${userId}-${ticker}`);
  const shares = input.value;

  await fetch("/api/admin/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      ticker,
      shares
    })
  });

  alert("Updated");
}

loadAdminData();