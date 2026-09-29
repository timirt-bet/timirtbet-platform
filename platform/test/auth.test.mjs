import { test } from "node:test";
import assert from "node:assert/strict";
import { authorizeUrl, signSession, verifySession, parseCookies, cookie, githubOAuth } from "../src/auth.mjs";

test("authorize URL asks for no scopes", () => {
  const u = new URL(authorizeUrl({ clientId: "Iv1.abc", redirectUri: "https://t.example/api/auth/github/callback", state: "s1" }));
  assert.equal(u.origin + u.pathname, "https://github.com/login/oauth/authorize");
  assert.equal(u.searchParams.get("client_id"), "Iv1.abc");
  assert.equal(u.searchParams.get("state"), "s1");
  assert.equal(u.searchParams.has("scope"), false);
});

test("sessions verify, expire and resist tampering", () => {
  const v = signSession("k", { sid: "gh_1", v: 0, exp: Date.now() + 1000 });
  assert.equal(verifySession("k", v).sid, "gh_1");
  assert.equal(verifySession("other", v), null);
  const [body, sig] = v.split(".");
  const forged = Buffer.from(JSON.stringify({ sid: "gh_2", v: 0, exp: Date.now() + 1000 })).toString("base64url");
  assert.equal(verifySession("k", `${forged}.${sig}`), null);
  assert.equal(verifySession("k", signSession("k", { sid: "gh_1", v: 0, exp: Date.now() - 1 })), null);
  assert.equal(verifySession("k", "garbage"), null);
});

test("cookies", () => {
  assert.deepEqual(parseCookies("a=1; __session=x%3Dy"), { a: "1", __session: "x=y" });
  const c = cookie("__session", "v", { maxAge: 60 });
  for (const part of ["HttpOnly", "Secure", "SameSite=Lax", "Max-Age=60", "Path=/"]) assert.ok(c.includes(part), part);
});

test("OAuth exchange keeps only id and login", async () => {
  const fetchImpl = async (url) => url.includes("access_token")
    ? new Response(JSON.stringify({ access_token: "gho_x" }))
    : new Response(JSON.stringify({ id: 42, login: "hana-t", name: "Hana T", email: "h@example.com" }));
  const o = githubOAuth({ clientId: "c", clientSecret: "s", fetchImpl });
  assert.deepEqual(await o.user(await o.exchange("code", "https://x/cb")), { id: 42, login: "hana-t" });
  const bad = githubOAuth({ clientId: "c", clientSecret: "s", fetchImpl: async () => new Response(JSON.stringify({ error: "bad_verification_code" })) });
  await assert.rejects(bad.exchange("nope", "https://x/cb"), /bad_verification_code/);
});
