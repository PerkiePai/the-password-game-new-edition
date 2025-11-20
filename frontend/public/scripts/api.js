import { BASE_URL, TOKEN_KEY } from "./config.js";

const authHeader = () => {
  const t = localStorage.getItem(TOKEN_KEY);
  return t ? { Authorization: `Bearer ${t}` } : {};
};

const jsonOrThrow = async (response) => {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Request failed");
  }
  return response.json();
};

export async function apiLogin(username) {
  const r = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  return jsonOrThrow(r);
}

export async function apiVerify() {
  const r = await fetch(`${BASE_URL}/auth/verify`, { headers: authHeader() });
  if (r.status === 401) return null;
  return jsonOrThrow(r);
}

export async function apiSaveResult(payload) {
  const headers = { "Content-Type": "application/json", ...authHeader() };
  const r = await fetch(`${BASE_URL}/game/save`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (r.status === 401) return null;
  return jsonOrThrow(r);
}

export async function apiCheckRules(payload) {
  const r = await fetch(`${BASE_URL}/rules/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return jsonOrThrow(r);
}

export async function apiListRuns({ username, limit } = {}) {
  const params = new URLSearchParams();
  if (username) params.set("username", username);
  if (limit) params.set("limit", limit);
  const qs = params.toString();
  const r = await fetch(`${BASE_URL}/runs${qs ? `?${qs}` : ""}`);
  return jsonOrThrow(r);
}

export async function apiDeleteRun(id) {
  if (!id) throw new Error("Missing run id");
  const headers = authHeader();
  if (!headers.Authorization) {
    throw new Error("Login required");
  }

  const r = await fetch(`${BASE_URL}/runs/${id}`, {
    method: "DELETE",
    headers,
  });

  if (r.status === 204) return null;
  if (!r.ok) {
    const message = await r.text();
    throw new Error(message || "Unable to delete run");
  }

  const contentType = r.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return r.json();
  }
  return null;
}
