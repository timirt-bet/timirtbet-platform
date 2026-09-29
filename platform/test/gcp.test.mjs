import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import { googleTokenVerifier, publish } from "../src/gcp.mjs";
import { jobFromPush } from "../src/queue.mjs";
import { createGraderApp } from "../src/grader-server.mjs";
import { remoteGrader } from "../src/grader-client.mjs";
import { loadBank } from "../src/exercises.mjs";
import { CHALLENGES } from "./helpers.mjs";

const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: "jwk" }), kid: "k1", alg: "RS256", use: "sig" };
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
function token(payload, kid = "k1", key = privateKey) {
  const h = b64({ alg: "RS256", kid, typ: "JWT" }), p = b64(payload);
  return `${h}.${p}.${crypto.createSign("RSA-SHA256").update(`${h}.${p}`).sign(key).toString("base64url")}`;
}
const fetchImpl = async () => new Response(JSON.stringify({ keys: [jwk] }));
const good = { iss: "https://accounts.google.com", aud: "https://api.example/api/tasks", email: "pubsub-push@p.iam.gserviceaccount.com", email_verified: true, exp: Math.floor(Date.now() / 1000) + 600 };

test("Google-signed task tokens: accepted only with the right key, issuer, audience, email and expiry", async () => {
  const verify = googleTokenVerifier({ audience: good.aud, email: good.email, fetchImpl });
  assert.ok(await verify(`Bearer ${token(good)}`));
  assert.equal(await verify(`Bearer ${token({ ...good, aud: "https://other" })}`), null);
  assert.equal(await verify(`Bearer ${token({ ...good, email: "someone@else.com" })}`), null);
  assert.equal(await verify(`Bearer ${token({ ...good, iss: "https://evil" })}`), null);
  assert.equal(await verify(`Bearer ${token({ ...good, exp: 1 })}`), null);
  const other = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey;
  assert.equal(await verify(`Bearer ${token(good, "k1", other)}`), null);
  assert.equal(await verify("Bearer nonsense"), null);
  assert.equal(await verify(undefined), null);
});

test("Pub/Sub publish sends a base64 JSON message; push bodies decode back", async () => {
  let sent;
  const id = await publish({ project: "p", topic: "grading-jobs", message: { kind: "web", key: "k" }, getToken: async () => "tok",
    fetchImpl: async (url, init) => { sent = { url, init }; return new Response(JSON.stringify({ messageIds: ["42"] })); } });
  assert.equal(id, "42");
  assert.equal(sent.url, "https://pubsub.googleapis.com/v1/projects/p/topics/grading-jobs:publish");
  assert.equal(sent.init.headers.authorization, "Bearer tok");
  const body = JSON.parse(sent.init.body);
  assert.deepEqual(jobFromPush({ message: body.messages[0] }), { kind: "web", key: "k" });
  assert.equal(jobFromPush({}), null);
});

test("the grader service grades code sent over HTTP and validates input", async () => {
  process.env.TIMIRTBET_GO_RACE = "0";
  const bank = loadBank(CHALLENGES);
  const server = http.createServer(createGraderApp({ bank, challengesDir: CHALLENGES, log: () => {} }));
  await new Promise((r) => server.listen(0, r));
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    let seenAuth;
    const grader = remoteGrader({ url, idToken: async (aud) => `id-for-${aud}`, fetchImpl: (u, init) => { seenAuth = init.headers.authorization; return fetch(u, init); } });
    const results = await grader.grade([{ exerciseId: "js-loops", code: "function sumTo(n){let t=0;for(let i=1;i<=n;i++)t+=i;return t}" }, { exerciseId: "go-loops", code: "package exercise\n\nfunc SumTo(n int) int { return 0 }\nfunc CountDigits(n int) int { return 1 }\n" }]);
    assert.equal(seenAuth, `Bearer id-for-${url}`);
    assert.deepEqual(results.map((r) => [r.exerciseId, r.passed]), [["js-loops", true], ["go-loops", false]]);
    const bad = (items) => fetch(`${url}/grade`, { method: "POST", body: JSON.stringify({ items }) }).then((r) => r.status);
    assert.equal(await bad([]), 422);
    assert.equal(await bad([{ exerciseId: "nope", code: "x" }]), 422);
    assert.equal(await bad([{ exerciseId: "js-loops", code: "x".repeat(70000) }]), 422);
  } finally { server.close(); }
});
