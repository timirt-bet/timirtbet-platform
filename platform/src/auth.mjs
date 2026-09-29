// Sign in with GitHub (OAuth web flow) and signed session cookies.
// No OAuth scopes are requested, so Timirtbet only ever sees a learner's public
// GitHub id and username. The GitHub access token is used once and thrown away.
import crypto from "node:crypto";

export function authorizeUrl({ clientId, redirectUri, state }) {
  const q = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, state, allow_signup: "true" });
  return `https://github.com/login/oauth/authorize?${q}`;
}

export function githubOAuth({ clientId, clientSecret, fetchImpl = globalThis.fetch }) {
  return {
    async exchange(code, redirectUri) {
      const res = await fetchImpl("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { accept: "application/json", "content-type": "application/json", "user-agent": "timirtbet-platform" },
        body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri }),
      });
      const data = await res.json();
      if (!res.ok || !data.access_token) throw new Error(`GitHub sign-in failed: ${data.error_description || data.error || res.status}`);
      return data.access_token;
    },
    async user(token) {
      const res = await fetchImpl("https://api.github.com/user", { headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "user-agent": "timirtbet-platform" } });
      if (!res.ok) throw new Error(`Could not read the GitHub account: ${res.status}`);
      const u = await res.json();
      return { id: u.id, login: u.login };
    },
  };
}

const b64 = (s) => Buffer.from(s).toString("base64url");
const mac = (secret, s) => crypto.createHmac("sha256", secret).update(s).digest("base64url");

// Cookie value: base64url(JSON payload) + "." + HMAC. Payload: { sid, v, exp }.
export function signSession(secret, payload) {
  const body = b64(JSON.stringify(payload));
  return `${body}.${mac(secret, body)}`;
}

export function verifySession(secret, value, now = Date.now()) {
  if (!secret || typeof value !== "string" || !value.includes(".")) return null;
  const [body, sig] = value.split(".");
  const expected = mac(secret, body);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return p.exp > now ? p : null;
  } catch { return null; }
}

export function parseCookies(header = "") {
  const out = {};
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function cookie(name, value, { maxAge, secure = true } = {}) {
  return [`${name}=${encodeURIComponent(value)}`, "Path=/", "HttpOnly", "SameSite=Lax", secure ? "Secure" : "", maxAge !== undefined ? `Max-Age=${maxAge}` : ""].filter(Boolean).join("; ");
}
