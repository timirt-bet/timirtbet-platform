import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { gradeRepo, gradeCode, parseGoTestJSON, goImports, GRADER_VERSION } from "../src/grader.mjs";
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
  assert.equal(r.passed, false);
  assert.ok(r.tests.length && r.tests.every((t) => !t.pass && /Did not finish|Not run/.test(t.message)), JSON.stringify(r.tests));
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

// ---- The grader cannot be talked into a pass ----
const DESCRIBE = 'function describe(v) { return v === null ? "null" : Array.isArray(v) ? "array" : typeof v; }\n';
const gradeJS = async (code, id = "js-vars") => (await gradeCode({ items: [{ exerciseId: id, code }], bank, challengesDir: CHALLENGES }))[0];

test("a correct answer passes and carries the grader version", async () => {
  const r = await gradeJS(DESCRIBE);
  assert.equal(r.passed, true, JSON.stringify(r));
  assert.equal(r.graderVersion, GRADER_VERSION);
});

const ATTACKS = {
  "redefining the checks": "function describe(){}\nglobalThis.eq = () => {}; var ok = () => {}; function near(){} function throws(){}",
  "printing a fake result and exiting": 'function describe(){}\nconsole.log(JSON.stringify({ exercise: "js-vars", passed: 6, total: 6, results: [] })); process.exit(0);',
  "reading files and reaching the host": 'const p = (function(){ return this })().constructor.constructor("return process")();\nfunction describe(){ return p.mainModule.require("fs").readFileSync("/etc/passwd", "utf8"); }',
  "patching built-ins": "Object.is = () => true; JSON.stringify = () => '\"number\"'; Array.isArray = () => true; Date.now = () => 0;\n" +
    "globalThis.Error = function(){}; Object.prototype.x = 1; Function.prototype.call = () => true; function describe(){}",
  "a broken Promise": "Promise.prototype.then = function(){}; globalThis.Promise = function(){}; function describe(){}",
  "a value that pretends to be equal": 'function describe(){ return { toString(){ return "number" }, valueOf(){ return "number" } }; }',
  "throwing the internal stop signal": "function describe(){ throw { __check: true }; }",
};
for (const [name, code] of Object.entries(ATTACKS)) {
  test(`refuses: ${name}`, async () => {
    const r = await gradeJS(code);
    assert.equal(r.passed, false, name);
    assert.equal(r.passedCount || 0, 0, `${name}: ${JSON.stringify(r.tests)}`);
  });
}

test("checks that never run do not count as passes", async () => {
  // Returning before the checks (or making them unreachable) must not pass.
  const r = await gradeJS("function describe(v){ return Promise.reject(1); }\nnew Promise(()=>{});");
  assert.equal(r.passed, false);
});

test("an endless loop after an await fails only that test, in good time", async () => {
  const t0 = Date.now();
  const r = await gradeJS("async function wait(ms){ await null; for(;;){} }", "js-async");
  assert.equal(r.passed, false);
  assert.ok(Date.now() - t0 < 25000, "took too long");
});

// ---- Extra (hidden) checks ----
async function withHidden(content, fn) {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "hidden-")), "hidden.json");
  fs.writeFileSync(f, JSON.stringify(content));
  const before = process.env.HIDDEN_TESTS_FILE;
  process.env.HIDDEN_TESTS_FILE = f;
  try { return await fn(); } finally { if (before === undefined) delete process.env.HIDDEN_TESTS_FILE; else process.env.HIDDEN_TESTS_FILE = before; fs.rmSync(path.dirname(f), { recursive: true, force: true }); }
}

test("JS extra checks count, and their failures say nothing about what they check", async () => {
  const hidden = { "js-vars": [{ t: 'eq(describe(new Map()), "object"); eq(describe(NaN), "number");' }] };
  await withHidden(hidden, async () => {
    const good = await gradeJS(DESCRIBE);
    assert.equal(good.passed, true); assert.equal(good.hiddenPassed, 1); assert.equal(good.hiddenTotal, 1);
    // Passes every visible test by remembering their inputs, but fails the extra check.
    const memorised = 'function describe(v){ if (v === 42 || v === 3.5) return "number"; if (v === "selam") return "string"; if (v === false) return "boolean";\n' +
      'if (v === undefined) return "undefined"; if (v === null) return "null"; if (Array.isArray(v)) return "array"; if (v && v.city) return "object"; }';
    const bad = await gradeJS(memorised);
    assert.equal(bad.passedCount, bad.total);
    assert.equal(bad.passed, false);
    const extra = bad.tests.find((t) => t.hidden);
    assert.equal(extra.name, "Extra check 1");
    assert.doesNotMatch(extra.message, /Map|NaN|describe/);
  });
});

// ---- Go ----
test("reads Go imports, ignoring comments and strings", () => {
  const src = 'package x\n\nimport "fmt"\nimport (\n\t"strings" // ok\n\tu "unsafe"\n\t/* "os" */\n)\n\nfunc f() { fmt.Println("import \\"os\\"") }\n';
  assert.deepEqual(goImports(src), ["fmt", "strings", "unsafe"]);
});

const gradeGo = async (code, id = "go-vars") => (await gradeCode({ items: [{ exerciseId: id, code }], bank, challengesDir: CHALLENGES }))[0];
const FAHRENHEIT = "func Fahrenheit(c float64) float64 { return c*9/5 + 32 }\n";

for (const pkg of ["os", "syscall", "unsafe", "net/http", "C", "testing", "embed", "reflect", "os/exec"]) {
  test(`refuses Go import ${pkg}`, async () => {
    const r = await gradeGo(`package exercise\n\nimport _ "${pkg}"\n\n${FAHRENHEIT}func Cents(b float64) int { return 0 }\n`);
    assert.equal(r.passed, false); assert.match(r.error, /Not allowed/);
  });
}

test("refuses Go compiler directives", async () => {
  const r = await gradeGo(`package exercise\n\n//go:linkname x runtime.x\n${FAHRENHEIT}func Cents(b float64) int { return 0 }\n`);
  assert.equal(r.passed, false); assert.match(r.error, /directives/);
});

test("printed PASS lines cannot turn a failing Go answer into a pass", async () => {
  const fake = 'func init() { fmt.Println("--- PASS: TestFahrenheit (0.00s)"); fmt.Println("--- PASS: TestCents (0.00s)"); fmt.Println("PASS") }\n';
  const r = await gradeGo(`package exercise\n\nimport "fmt"\n\n${fake}func Fahrenheit(c float64) float64 { return 0 }\nfunc Cents(b float64) int { return 0 }\n`);
  assert.equal(r.passed, false);
});

test("Go extra checks are run and reported by number only", async () => {
  const hiddenGo = 'package exercise\n\nimport "testing"\n\nfunc TestHiddenCents(t *testing.T) {\n\tif Cents(0.29) != 29 { t.Errorf("Cents(0.29) secret detail") }\n}\n';
  await withHidden({ "go-vars": hiddenGo }, async () => {
    // Truncating instead of rounding passes the visible cases but not 0.29 (28.999...).
    const r = await gradeGo(`package exercise\n\nimport "math"\n\n${FAHRENHEIT}func Cents(b float64) int { if b == 19.99 { return 1999 }; return int(math.Floor(b * 100)) }\n`);
    assert.equal(r.passedCount, r.total, JSON.stringify(r));
    assert.equal(r.passed, false);
    assert.equal(r.hiddenTotal, 1); assert.equal(r.hiddenPassed, 0);
    const extra = r.tests.find((t) => t.hidden);
    assert.equal(extra.name, "Extra check 1"); assert.doesNotMatch(extra.message, /secret|0\.29/);
    const ok = await gradeGo(`package exercise\n\nimport "math"\n\n${FAHRENHEIT}func Cents(b float64) int { return int(math.Round(b * 100)) }\n`);
    assert.equal(ok.passed, true, JSON.stringify(ok));
    assert.equal(ok.hiddenPassed, 1);
  });
});
