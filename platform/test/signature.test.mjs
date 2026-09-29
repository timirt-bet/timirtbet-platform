import { test } from "node:test";
import assert from "node:assert/strict";
import { sign, verifySignature } from "../src/signature.mjs";
import { appJWT } from "../src/app-auth.mjs";
import crypto from "node:crypto";

test("accepts a correct signature and rejects tampering", () => {
  const body = Buffer.from('{"hello":"world"}');
  const sig = sign("s3cret", body);
  assert.ok(verifySignature("s3cret", body, sig));
  assert.ok(!verifySignature("s3cret", Buffer.from('{"hello":"there"}'), sig));
  assert.ok(!verifySignature("other", body, sig));
  assert.ok(!verifySignature("s3cret", body, undefined));
  assert.ok(!verifySignature("", body, sig));
});

test("GitHub App JWT is RS256 and verifiable", () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs1", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
  const jwt = appJWT(12345, privateKey, 1_700_000_000);
  const [h, p, s] = jwt.split(".");
  assert.equal(JSON.parse(Buffer.from(h, "base64url")).alg, "RS256");
  const payload = JSON.parse(Buffer.from(p, "base64url"));
  assert.equal(payload.iss, "12345"); assert.equal(payload.exp - payload.iat, 600);
  assert.ok(crypto.createVerify("RSA-SHA256").update(`${h}.${p}`).verify(publicKey, Buffer.from(s, "base64url")));
});
