// GitHub App authentication: signs a JWT with the app's private key and exchanges it
// for a short-lived installation token (cached until 5 minutes before expiry).
import crypto from "node:crypto";

const b64url = (buf) => Buffer.from(buf).toString("base64url");

export function appJWT(appId, privateKeyPem, now = Math.floor(Date.now() / 1000)) {
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({ iat: now - 60, exp: now + 9 * 60, iss: String(appId) }));
  const sig = crypto.createSign("RSA-SHA256").update(`${header}.${payload}`).sign(privateKeyPem);
  return `${header}.${payload}.${b64url(sig)}`;
}

export function installationTokenProvider({ appId, privateKey, installationId, baseUrl = "https://api.github.com", fetchImpl = globalThis.fetch }) {
  let cached = null;
  return async function getToken() {
    if (cached && cached.expires - Date.now() > 5 * 60 * 1000) return cached.token;
    const res = await fetchImpl(`${baseUrl}/app/installations/${installationId}/access_tokens`, {
      method: "POST",
      headers: { accept: "application/vnd.github+json", authorization: `Bearer ${appJWT(appId, privateKey)}`, "user-agent": "timirtbet-platform" },
    });
    if (!res.ok) throw new Error(`Could not get installation token: ${res.status}`);
    const data = await res.json();
    cached = { token: data.token, expires: Date.parse(data.expires_at) };
    return cached.token;
  };
}
