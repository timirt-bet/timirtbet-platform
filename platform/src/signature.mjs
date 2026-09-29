import crypto from "node:crypto";

// GitHub sends X-Hub-Signature-256: sha256=<hex HMAC of the raw body>.
// Used for the GitHub webhook.
export function sign(secret, rawBody) {
  return "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
}

export function verifySignature(secret, rawBody, header) {
  if (!secret || typeof header !== "string") return false;
  const expected = Buffer.from(sign(secret, rawBody));
  const got = Buffer.from(header);
  return expected.length === got.length && crypto.timingSafeEqual(expected, got);
}
