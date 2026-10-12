import { supabase } from "/assets/supabase.js";

const state = {
  role: "user",
  usernameById: {},
};

const $ = (id) => document.getElementById(id);
const priceCache = new Map();

const EMAIL_DOMAIN = "tracker.local";

function normalizeUsername(value) {
  return value.trim().toLowerCase();
}

function emailFor(username) {
  return `${normalizeUsername(username)}@${EMAIL_DOMAIN}`;
}

function setStatus(message, isError = false) {
  const el = $("status");
  el.textContent = message;
  el.classList.toggle("error", isError);
}

function setDashboardStatus(message, isError = false) {
  const el = $("dashboard-status");
  el.textContent = message;
  el.classList.toggle("error", isError);
}

function formatMoney(value) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

async function getPrice(ticker) {
  if (priceCache.has(ticker)) return priceCache.get(ticker);

  try {
    const { data, error } = await supabase.functions.invoke("stock-price", {
      body: { ticker },
    });
    const price =
      !error && typeof data?.price === "number" ? data.price : null;
    priceCache.set(ticker, price);
    return price;
  } catch {
    priceCache.set(ticker, null);
    return null;
  }
}

async function enterApp(user) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, username")
    .eq("id", user.id)
    .maybeSingle();

  state.role = profile?.role ?? "user";
  const fallbackUsername = user.email?.split("@")[0] ?? "user";
  $("who").textContent = profile?.username || fallbackUsername;
  $("dashboard-title").textContent =
    state.role === "admin" ? "All Portfolios (admin)" : "Your Portfolio";

  $("login-section").hidden = true;
  $("dashboard").hidden = false;
  setStatus("");
  await loadHoldings();
}

function showAuth() {
  $("dashboard").hidden = true;
  $("login-section").hidden = false;
  $("portfolio-table").replaceChildren();
}

async function loadHoldings() {
  setDashboardStatus("Loading…");

  const { data, error } = await supabase
    .from("holdings")
    .select("id, user_id, ticker, shares")
    .order("ticker", { ascending: true });

  if (error) {
    setDashboardStatus(error.message, true);
    return;
  }

  if (state.role === "admin") {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username");
    state.usernameById = Object.fromEntries(
      (profiles ?? []).map((p) => [p.id, p.username]),
    );
  }

  await render(data ?? []);
  setDashboardStatus("");
}

function makeCell(text) {
  const td = document.createElement("td");
  td.textContent = text;
  return td;
}

async function render(rows) {
  const container = $("portfolio-table");
  container.replaceChildren();

  if (rows.length === 0) {
    container.textContent = "No holdings yet.";
    return;
  }

  const isAdmin = state.role === "admin";
  const prices = await Promise.all(rows.map((row) => getPrice(row.ticker)));

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  const headers = isAdmin
    ? ["User", "Ticker", "Shares", "Current Price", "Value", ""]
    : ["Ticker", "Shares", "Current Price", "Value"];

  for (const text of headers) {
    const th = document.createElement("th");
    th.textContent = text;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  let total = 0;
  let priced = false;

  rows.forEach((row, index) => {
    const price = prices[index];
    const value = price === null ? null : price * Number(row.shares);
    if (value !== null) {
      total += value;
      priced = true;
    }

    const tr = document.createElement("tr");

    if (isAdmin) {
      tr.appendChild(
        makeCell(state.usernameById[row.user_id] ?? row.user_id.slice(0, 8)),
      );
    }
    tr.appendChild(makeCell(row.ticker));

    if (isAdmin) {
      const sharesCell = document.createElement("td");
      const input = document.createElement("input");
      input.type = "number";
      input.step = "any";
      input.value = row.shares;
      input.className = "shares-input";
      sharesCell.appendChild(input);
      tr.appendChild(sharesCell);
    } else {
      tr.appendChild(makeCell(String(row.shares)));
    }

    tr.appendChild(makeCell(price === null ? "N/A" : formatMoney(price)));
    tr.appendChild(makeCell(value === null ? "N/A" : formatMoney(value)));

    if (isAdmin) {
      const actionCell = document.createElement("td");
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Save";
      button.addEventListener("click", () =>
        saveShares(row.id, input.value),
      );
      actionCell.appendChild(button);
      tr.appendChild(actionCell);
    }

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);

  const tfoot = document.createElement("tfoot");
  const totalRow = document.createElement("tr");
  const label = document.createElement("td");
  label.colSpan = isAdmin ? 4 : 3;
  label.innerHTML = "<strong>Total</strong>";
  totalRow.appendChild(label);
  totalRow.appendChild(makeCell(priced ? formatMoney(total) : "N/A"));
  if (isAdmin) totalRow.appendChild(document.createElement("td"));
  tfoot.appendChild(totalRow);
  table.appendChild(tfoot);

  container.appendChild(table);
}

async function saveShares(id, value) {
  const shares = Number(value);
  if (!Number.isFinite(shares)) {
    setDashboardStatus("Shares must be a number.", true);
    return;
  }

  setDashboardStatus("Saving…");
  const { error } = await supabase
    .from("holdings")
    .update({ shares })
    .eq("id", id);

  if (error) {
    setDashboardStatus(error.message, true);
    return;
  }

  priceCache.clear();
  await loadHoldings();
  setDashboardStatus("Saved.");
}

async function onLogin(event) {
  event.preventDefault();
  setStatus("Signing in…");

  const { error } = await supabase.auth.signInWithPassword({
    email: emailFor($("login-username").value),
    password: $("login-password").value,
  });

  if (error) setStatus("Invalid username or password.", true);
  else setStatus("");
}

async function onSignup(event) {
  event.preventDefault();
  setStatus("Creating account…");

  const username = normalizeUsername($("signup-username").value);

  if (!/^[a-z0-9._-]+$/.test(username)) {
    setStatus("Username may only use letters, numbers, dot, dash, underscore.", true);
    return;
  }

  const { data, error } = await supabase.auth.signUp({
    email: emailFor(username),
    password: $("signup-password").value,
    options: {
      data: { username },
    },
  });

  if (error) {
    setStatus(
      error.message.toLowerCase().includes("registered")
        ? "That username is taken."
        : error.message,
      true,
    );
    return;
  }

  setStatus(
    data.session
      ? "Account created. You are signed in."
      : "Account created. You can sign in now.",
  );
}

async function init() {
  $("login-form").addEventListener("submit", onLogin);
  $("signup-form").addEventListener("submit", onSignup);
  $("logout").addEventListener("click", () => supabase.auth.signOut());

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) await enterApp(session.user);
  else showAuth();

  supabase.auth.onAuthStateChange((_event, session) => {
    if (session) enterApp(session.user);
    else showAuth();
  });
}

init();
