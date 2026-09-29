// Small Google Cloud helpers with no SDK: metadata-server tokens, Pub/Sub publish,
// and verification of the Google-signed tokens Pub/Sub and Cloud Scheduler attach to push requests.
import crypto from "node:crypto";

const META = "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default";

export function metadataAccessToken({ fetchImpl = globalThis.fetch } = {}) {
  let cached = null;
  return async () => {
    if (cached && cached.exp - Date.now() > 60_000) return cached.token;
    const res = await fetchImpl(`${META}/token`, { headers: { "metadata-flavor": "Google" } });
    if (!res.ok) throw new Error(`metadata token: ${res.status}`);
    const j = await res.json();
    cached = { token: j.access_token, exp: Date.now() + j.expires_in * 1000 };
    return cached.token;
  };
}

// ID token for calling a private Cloud Run service (the grader).
export function metadataIdToken({ fetchImpl = globalThis.fetch } = {}) {
  const cache = new Map();
  return async (audience) => {
    const hit = cache.get(audience);
    if (hit && hit.exp - Date.now() > 60_000) return hit.token;
    const res = await fetchImpl(`${META}/identity?audience=${encodeURIComponent(audience)}&format=full`, { headers: { "metadata-flavor": "Google" } });
    if (!res.ok) throw new Error(`metadata id token: ${res.status}`);
    const token = await res.text();
    cache.set(audience, { token, exp: Date.now() + 50 * 60_000 });
    return token;
  };
}

export async function publish({ project, topic, message, getToken, fetchImpl = globalThis.fetch }) {
  const res = await fetchImpl(`https://pubsub.googleapis.com/v1/projects/${project}/topics/${topic}:publish`, {
    method: "POST",
    headers: { authorization: `Bearer ${await getToken()}`, "content-type": "application/json" },
    body: JSON.stringify({ messages: [{ data: Buffer.from(JSON.stringify(message)).toString("base64") }] }),
  });
  if (!res.ok) throw new Error(`Pub/Sub publish failed: ${res.status} ${await res.text()}`);
  return (await res.json()).messageIds[0];
}

// Verifies an OIDC token signed by Google: signature (RS256, Google's published keys),
// issuer, audience, expiry and the calling service account's email.
export function googleTokenVerifier({ audience, email, fetchImpl = globalThis.fetch, now = () => Date.now() }) {
  let keys = null, keysAt = 0;
  const jwks = async () => {
    if (keys && now() - keysAt < 3600_000) return keys;
    const res = await fetchImpl("https://www.googleapis.com/oauth2/v3/certs");
    keys = (await res.json()).keys; keysAt = now();
    return keys;
  };
  return async (authorization) => {
    const m = /^Bearer (.+)$/.exec(authorization || "");
    if (!m) return null;
    const [h, p, s] = m[1].split(".");
    if (!s) return null;
    let header, payload;
    try { header = JSON.parse(Buffer.from(h, "base64url")); payload = JSON.parse(Buffer.from(p, "base64url")); } catch { return null; }
    if (header.alg !== "RS256") return null;
    const jwk = (await jwks()).find((k) => k.kid === header.kid);
    if (!jwk) return null;
    const ok = crypto.createVerify("RSA-SHA256").update(`${h}.${p}`).verify(crypto.createPublicKey({ key: jwk, format: "jwk" }), Buffer.from(s, "base64url"));
    if (!ok) return null;
    if (!["https://accounts.google.com", "accounts.google.com"].includes(payload.iss)) return null;
    if (payload.aud !== audience) return null;
    if (!(payload.exp * 1000 > now())) return null;
    if (email && (payload.email !== email || payload.email_verified !== true)) return null;
    return payload;
  };
}
