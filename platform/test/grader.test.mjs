import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { gradeRepo, parseGoTestJSON } from "../src/grader.mjs";
import { loadBank, changedExercises } from "../src/exercises.mjs";
import { CHALLENGES, fixtureRepo, NEEDS_ANSWERS } from "./helpers.mjs";

const bank = loadBank(CHALLENGES);

test("maps changed files to exercises", () => {
  assert.deepEqual(changedExercises(["js/js-loops/solution.js", "go/go_sync/solution.go", "README.md", "js/js-loops/README.md", "go/go_nope/solution.go"], bank), ["go-sync", "js-loops"]);
});

test("every reference solution passes (JS and Go, with the race detector)", { skip: NEEDS_ANSWERS }, async () => {
  const ids = Object.keys(bank);
  const repo = fixtureRepo(ids);
  const results = await gradeRepo({ repoDir: repo, exerciseIds: ids, bank, challengesDir: CHALLENGES });
  for (const r of results) assert.ok(r.passed, `${r.exerciseId}: ${r.error || JSON.stringify(r.tests.filter((t) => !t.pass))}`);
  fs.rmSync(repo, { recursive: true, force: true });
});

test("every unsolved starter fails with useful feedback", async () => {
  const ids = Object.keys(bank);
  const repo = fixtureRepo([]);
  const results = await gradeRepo({ repoDir: repo, exerciseIds: ids, bank, challengesDir: CHALLENGES });
  for (const r of results) {
    assert.equal(r.passed, false, r.exerciseId);
    assert.ok(r.error || r.tests.some((t) => !t.pass && t.message), `${r.exerciseId} has no feedback`);
  }
  const structs = results.find((r) => r.exerciseId === "go-structs");
  assert.match(structs.error, /Build failed/);
  fs.rmSync(repo, { recursive: true, force: true });
});

test("an infinite loop is stopped", async () => {
  const repo = fixtureRepo([]);
  fs.writeFileSync(path.join(repo, "js/js-loops/solution.js"), "function sumTo(n){ while(true){} }\n");
  const [r] = await gradeRepo({ repoDir: repo, exerciseIds: ["js-loops"], bank, challengesDir: CHALLENGES });
  assert.equal(r.passed, false); assert.match(r.error, /Timed out/);
  fs.rmSync(repo, { recursive: true, force: true });
});

test("parses go test -json output", () => {
  const out = [
    { Action: "run", Test: "TestA" }, { Action: "output", Test: "TestA", Output: "    x_test.go:9: SumTo(5) = 0, want 15\n" }, { Action: "fail", Test: "TestA" },
    { Action: "run", Test: "TestB" }, { Action: "pass", Test: "TestB" },
  ].map((e) => JSON.stringify(e)).join("\n");
  const { tests } = parseGoTestJSON(out);
  assert.deepEqual(tests.map((t) => [t.name, t.pass]), [["TestA", false], ["TestB", true]]);
  assert.match(tests[0].message, /want 15/);
});
