import { test } from "node:test";
import assert from "node:assert/strict";
import { MemoryStore } from "../src/store/memory.mjs";
import { createCircle, joinCircle, leaveCircle, newInviteCode, MAX_MEMBERS } from "../src/circles.mjs";

async function fresh(n) { const s = new MemoryStore(); for (let i = 0; i < n; i++) await s.upsertLearner(`u${i}`, { githubUsername: `u${i}` }); return s; }

test("create, join by code, one circle at a time", async () => {
  const s = await fresh(3);
  const a = await createCircle(s, { name: "Addis Go Circle", track: "go", ownerId: "u0" });
  assert.match(a.inviteCode, /^[A-HJ-NP-Z2-9]{8}$/);
  await joinCircle(s, { code: a.inviteCode.toLowerCase(), learnerId: "u1" });
  assert.deepEqual((await s.getCircle(a.id)).members, ["u0", "u1"]);
  const b = await createCircle(s, { name: "Night owls", track: "js", ownerId: "u1" });
  assert.deepEqual((await s.getCircle(a.id)).members, ["u0"], "starting a new circle leaves the old one");
  assert.equal((await s.getLearner("u1")).circleId, b.id);
});

test("validation, full circles and bad codes", async () => {
  const s = await fresh(MAX_MEMBERS + 1);
  await assert.rejects(createCircle(s, { name: "x", track: "js", ownerId: "u0" }), /3 to 40/);
  await assert.rejects(createCircle(s, { name: "Fine name", track: "rust", ownerId: "u0" }), /track/);
  const c = await createCircle(s, { name: "Full house", track: "both", ownerId: "u0" });
  for (let i = 1; i < MAX_MEMBERS; i++) await joinCircle(s, { code: c.inviteCode, learnerId: `u${i}` });
  await assert.rejects(joinCircle(s, { code: c.inviteCode, learnerId: `u${MAX_MEMBERS}` }), (e) => e.status === 409);
  await assert.rejects(joinCircle(s, { code: "NOPE2345", learnerId: "u0" }), (e) => e.status === 404);
});

test("leaving hands ownership on and removes empty circles; only the owner rotates the code", async () => {
  const s = await fresh(2);
  const c = await createCircle(s, { name: "Pair", track: "js", ownerId: "u0" });
  await joinCircle(s, { code: c.inviteCode, learnerId: "u1" });
  await assert.rejects(newInviteCode(s, { circleId: c.id, learnerId: "u1" }), (e) => e.status === 403);
  assert.notEqual((await newInviteCode(s, { circleId: c.id, learnerId: "u0" })).inviteCode, c.inviteCode);
  await leaveCircle(s, "u0");
  assert.equal((await s.getCircle(c.id)).ownerId, "u1");
  await leaveCircle(s, "u1");
  assert.equal(await s.getCircle(c.id), null);
});
