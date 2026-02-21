async function loadPortfolio() {
  const res = await fetch("/api/portfolio");
  if (!res.ok) {
    document.body.innerHTML = "<h2>Please login</h2>";
    return;
  }

  const data = await res.json();
  const container = document.getElementById("portfolio");

  data.forEach(row => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>${row.ticker}</h3>
      <p>${row.shares} shares</p>
    `;
    container.appendChild(card);
  });
}

loadPortfolio();