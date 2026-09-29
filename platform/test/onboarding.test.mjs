import { test } from "node:test";
import assert from "node:assert/strict";
import { createGitHub } from "../src/github.mjs";
import { onboardStudent } from "../src/onboarding.mjs";
import { MemoryStore as Store } from "../src/store/memory.mjs";

const config = { org: "timirtbet", studentsTeam: "students", templateRepo: "student-template" };

function mockFetch(overrides = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const u = new URL(url); const key = `${init.method} ${u.pathname}`;
    calls.push({ key, body: init.body ? JSON.parse(init.body) : null, auth: init.headers.authorization });
    const [status, body] = overrides[key] || (key.startsWith("GET /users/") ? [200, { id: 42, login: "hana-t" }] : [200, {}]);
    return new Response(JSON.stringify(body), { status });
  };
  return { calls, fetchImpl };
}

test("first sign-in: team invite, repo from template, push access", async () => {
  const { calls, fetchImpl } = mockFetch();
  const gh = createGitHub({ token: "t0k", fetchImpl });
  const store = new Store();
  const s = await onboardStudent({ gh, store, config, student: { id: "stu_1", githubUsername: "Hana-T" } });
  assert.deepEqual(calls.map((c) => c.key), [
    "GET /users/Hana-T",
    "PUT /orgs/timirtbet/teams/students/memberships/Hana-T",
    "POST /repos/timirtbet/student-template/generate",
    "PUT /repos/timirtbet/hana-t-code/collaborators/Hana-T",
  ]);
  assert.equal(calls[0].auth, "Bearer t0k");
  assert.deepEqual(calls[2].body, { owner: "timirtbet", name: "hana-t-code", description: "Timirtbet exercises for @Hana-T", private: true, include_all_branches: false });
  assert.equal(calls[3].body.permission, "push");
  assert.equal(s.repo, "timirtbet/hana-t-code");
  assert.deepEqual(Object.keys(s).sort(), ["githubId", "githubUsername", "id", "onboardedAt", "repo"], "only public GitHub facts are stored");
  assert.equal((await store.learnerByRepo("timirtbet/hana-t-code")).id, "stu_1");
});

test("running it again is safe when the repository already exists", async () => {
  const { calls, fetchImpl } = mockFetch({ "POST /repos/timirtbet/student-template/generate": [422, { message: "Name already exists on this account" }] });
  const gh = createGitHub({ token: "t", fetchImpl });
  const s = await onboardStudent({ gh, store: new Store(), config, student: { id: "stu_1", githubUsername: "hana-t" } });
  assert.ok(calls.some((c) => c.key === "GET /repos/timirtbet/hana-t-code"));
  assert.equal(s.repo, "timirtbet/hana-t-code");
});

test("rejects invalid usernames and surfaces GitHub errors", async () => {
  const { fetchImpl } = mockFetch({ "GET /users/ghost-user": [404, { message: "Not Found" }] });
  const gh = createGitHub({ token: "t", fetchImpl });
  await assert.rejects(onboardStudent({ gh, store: new Store(), config, student: { id: "x", githubUsername: "bad name!" } }), /not a valid GitHub username/);
  await assert.rejects(onboardStudent({ gh, store: new Store(), config, student: { id: "x", githubUsername: "ghost-user" } }), /404/);
});

test("skips the user lookup when sign-in already gave the GitHub id", async () => {
  const { calls, fetchImpl } = mockFetch();
  const gh = createGitHub({ token: "t", fetchImpl });
  const s = await onboardStudent({ gh, store: new Store(), config, student: { id: "gh_7", githubUsername: "abel-k", githubId: 7 } });
  assert.ok(!calls.some((c) => c.key.startsWith("GET /users/")));
  assert.equal(s.githubId, 7);
});
