// Exercise bank build: node authoring/build.mjs
// Checks every starter fails its tests and, when the reference answers are available, that every
// answer passes. Then writes challenges/ (tests, graders, exercises.json) and student-template/ (starters).
// The answers are not part of this public repository: they live in a private repository, cloned to
// ./solutions (or set SOLUTIONS_DIR). Layout: solutions/js/<id>.js and solutions/go/<id>.go.
// Extra (hidden) checks live there too: solutions/hidden/<id>.json (a list of { "t": "..." } JS tests)
// and solutions/hidden/<id>_test.go (Go tests named TestHidden*). The build checks every answer passes
// them and every starter fails them, then bundles them into solutions/hidden-tests.json for
// deploy/upload-hidden-tests.sh. They are never written to challenges/ or the web app.
// gocheck.js holds the in-browser Go structure checks used by the web app.
import { JS } from "./ex_js.mjs";
import { GO } from "./ex_go.mjs";
import fs from "node:fs";
import path from "node:path";
import { execSync, execFileSync } from "node:child_process";
import os from "node:os";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const REPO = path.resolve(HERE, "../challenges");
const SOL_DIR = path.resolve(process.env.SOLUTIONS_DIR || path.join(HERE, "../solutions"));
for (const ex of [...JS, ...GO]) {
  const f = path.join(SOL_DIR, ex.lang, ex.id + (ex.lang === "js" ? ".js" : ".go"));
  ex.solution = fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null;
}
const HIDDEN_DIR = path.join(SOL_DIR, "hidden");
const HIDDEN = {};
for (const ex of [...JS, ...GO]) {
  const f = path.join(HIDDEN_DIR, ex.id + (ex.lang === "js" ? ".json" : "_test.go"));
  if (fs.existsSync(f)) HIDDEN[ex.id] = ex.lang === "js" ? JSON.parse(fs.readFileSync(f, "utf8")) : fs.readFileSync(f, "utf8");
}
const HAVE = [...JS, ...GO].filter((e) => e.solution != null).length;
console.log(HAVE ? `Reference answers: ${HAVE} of ${JS.length + GO.length} from ${SOL_DIR}` : `No reference answers in ${SOL_DIR}: checking starters only.`);

let problems = 0;

// Go repo
for (const d of ["go", "js"]) fs.rmSync(path.join(REPO, d), { recursive: true, force: true });
const goDir = path.join(REPO, "go");
fs.mkdirSync(goDir, { recursive: true });
fs.writeFileSync(path.join(goDir, "go.mod"), "module timirtbet/exercises\n\ngo 1.22\n");
for (const ex of GO) {
  const d = path.join(goDir, ex.id.replace(/-/g, "_"));
  fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, ex.id.replace(/-/g, "_") + "_test.go"), ex.test);
  fs.writeFileSync(path.join(d, "starter.go.txt"), ex.starter);
}
// Answers are checked in a temporary copy, so they never land in challenges/.
const withSol = GO.filter((ex) => ex.solution != null);
if (withSol.length) {
  const chk = fs.mkdtempSync(path.join((await import("node:os")).tmpdir(), "goanswers-"));
  fs.writeFileSync(path.join(chk, "go.mod"), "module timirtbet/exercises\n\ngo 1.22\n");
  for (const ex of withSol) {
    const d = path.join(chk, ex.id.replace(/-/g, "_")); fs.mkdirSync(d);
    fs.writeFileSync(path.join(d, "solution.go"), ex.solution);
    fs.writeFileSync(path.join(d, "x_test.go"), ex.test);
    if (HIDDEN[ex.id]) fs.writeFileSync(path.join(d, "zz_hidden_test.go"), HIDDEN[ex.id]);
  }
  try { console.log(execSync("go vet ./... && go test ./...", { cwd: chk, encoding: "utf8" })); }
  catch (e) { problems++; console.log("GO SOLUTIONS FAIL\n", e.stdout, e.stderr); }
  fs.rmSync(chk, { recursive: true, force: true });
}

// Starters: each should compile but fail its tests
const tmp = fs.mkdtempSync(path.join((await import("node:os")).tmpdir(), "gostarter-"));
for (const ex of GO) {
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  fs.writeFileSync(path.join(tmp, "go.mod"), "module starter\n\ngo 1.22\n");
  fs.writeFileSync(path.join(tmp, "starter.go"), ex.starter);
  fs.writeFileSync(path.join(tmp, "x_test.go"), ex.test);
  if (HIDDEN[ex.id]) {
    // Each hidden test must fail on the starter, or it checks nothing.
    fs.writeFileSync(path.join(tmp, "zz_hidden_test.go"), HIDDEN[ex.id]);
    let hout = "";
    try { hout = execSync("go test -timeout 20s -run '^TestHidden' ./... 2>&1", { cwd: tmp, encoding: "utf8" }); } catch (e) { hout = e.stdout || ""; }
    if (!/build failed|setup failed/.test(hout) && !/FAIL/.test(hout)) { problems++; console.log("GO HIDDEN TESTS PASS ON STARTER", ex.id); }
    fs.rmSync(path.join(tmp, "zz_hidden_test.go"));
  }
  let out = "";
  try { out = execSync("go test -timeout 20s ./... 2>&1", { cwd: tmp, encoding: "utf8" }); } catch (e) { out = e.stdout || ""; }
  const status = /build failed|setup failed/.test(out) ? "BUILD FAILED" : /FAIL/.test(out) ? "fails tests (good)" : "PASSES?!";
  if (status !== "fails tests (good)") console.log("GO STARTER", ex.id, status, status === "BUILD FAILED" ? out.split("\n").slice(0, 4).join(" | ") : "");
  // check structure regexes: solution must satisfy all, starter not all
  const solOK = ex.solution == null || ex.checks.every((c) => new RegExp(c.re, "m").test(ex.solution));
  if (!solOK) { problems++; console.log("GO CHECK REGEX FAILS ON SOLUTION", ex.id, ex.checks.filter((c) => !new RegExp(c.re, "m").test(ex.solution)).map((c) => c.n)); }
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`Go: ${GO.length} exercises checked`);

// JS part of repo
const jsDir = path.join(REPO, "js");
fs.mkdirSync(jsDir, { recursive: true });
// The JS grader is kept as a normal file (authoring/grade.mjs) and copied in.
fs.copyFileSync(path.join(HERE, "grade.mjs"), path.join(jsDir, "grade.mjs"));
fs.writeFileSync(path.join(REPO, "test_all.mjs"), `// Checks reference answers against the tests: SOLUTIONS_DIR=/path/to/solutions node test_all.mjs
// The answers are kept in a separate private repository (solutions/js/<id>.js, solutions/go/<id>.go).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const here = path.dirname(new URL(import.meta.url).pathname);
const dir = path.resolve(process.env.SOLUTIONS_DIR || path.join(here, "../solutions"));
if (!fs.existsSync(dir)) { console.error("No answers at " + dir + ". Set SOLUTIONS_DIR."); process.exit(2); }
const bank = JSON.parse(fs.readFileSync(path.join(here, "exercises.json")));
let failed = 0, checked = 0;
for (const ex of bank) {
  const file = path.join(dir, ex.lang, ex.id + (ex.lang === "js" ? ".js" : ".go"));
  if (!fs.existsSync(file)) { console.log("skip " + ex.id); continue; }
  checked++;
  try {
    if (ex.lang === "js") execFileSync("node", [path.join(here, "js/grade.mjs"), ex.id, file]);
    else execFileSync("sh", [path.join(here, "go/grade.sh"), ex.id, file]);
    console.log("ok   " + ex.id);
  } catch { failed++; console.log("FAIL " + ex.id); }
}
console.log(checked + " checked, " + failed + " failed");
process.exit(failed ? 1 : 0);
`);
fs.writeFileSync(path.join(goDir, "grade.sh"), `#!/usr/bin/env sh
# Usage: ./grade.sh <exercise-id> <submission.go>
# Copies the submission next to the exercise's _test.go in a temp dir and runs go test.\n# Set GRADE_JSON=1 for machine-readable output.
# Production note: run inside a container with no network, CPU/memory limits and a timeout.
set -e
id="$1"; sub="$2"
dir="$(cd "$(dirname "$0")" && pwd)/$(echo "$id" | tr - _)"
[ -d "$dir" ] || { echo "Unknown Go exercise: $id" >&2; exit 2; }
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
printf 'module submission\\n\\ngo 1.22\\n' > "$tmp/go.mod"
cp "$sub" "$tmp/submission.go"
cp "$dir"/*_test.go "$tmp/"
cd "$tmp"
if [ "\${GRADE_JSON:-0}" = "1" ]; then timeout 60s go test -json -race -count=1 -timeout 20s ./...
else timeout 60s go test -v -race -count=1 -timeout 20s ./...; fi
`);
fs.chmodSync(path.join(goDir, "grade.sh"), 0o755);

const bank = [...JS, ...GO].map(({ solution, ...rest }) => rest);
fs.writeFileSync(path.join(REPO, "exercises.json"), JSON.stringify(bank, null, 2));
fs.writeFileSync(path.join(HERE, "bank.json"), JSON.stringify(bank)); // embedded in the web app

// JS: checked with the real grader, so answers pass and starters fail exactly as they will for learners.
/** @returns {{passed: number, total: number, results: {test: string, pass: boolean, message?: string}[]}} */
function gradeJS(id, code) {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "jscheck-")), "solution.js");
  fs.writeFileSync(f, code);
  const h = path.join(path.dirname(f), "hidden.json");
  fs.writeFileSync(h, JSON.stringify(HIDDEN));
  let out;
  try { out = execFileSync("node", [path.join(jsDir, "grade.mjs"), id, f, h], { encoding: "utf8" }); }
  catch (e) { out = e.stdout; }
  fs.rmSync(path.dirname(f), { recursive: true, force: true });
  return JSON.parse(out);
}
for (const ex of JS) {
  if (ex.solution != null) {
    const r = gradeJS(ex.id, ex.solution);
    if (r.passed !== r.total || r.hiddenPassed !== r.hiddenTotal) { problems++; console.log("JS SOLUTION FAIL", ex.id, r.results.filter((x) => !x.pass)); }
  }
  const st = gradeJS(ex.id, ex.starter);
  if (st.passed === st.total) { problems++; console.log("JS STARTER PASSES", ex.id); }
  if (st.hiddenPassed > 0) { problems++; console.log("JS HIDDEN TESTS PASS ON STARTER", ex.id, st.results.filter((x) => x.hidden && x.pass).map((x) => x.test)); }
}
console.log(`JS: ${JS.length} exercises checked`);
if (Object.keys(HIDDEN).length) {
  fs.writeFileSync(path.join(SOL_DIR, "hidden-tests.json"), JSON.stringify(HIDDEN));
  console.log(`Extra checks: ${Object.keys(HIDDEN).length} exercises, bundled in ${path.join(SOL_DIR, "hidden-tests.json")}`);
}
console.log(problems ? `PROBLEMS: ${problems}` : "ALL GOOD");

// ---- student template repo ----
const TPL = path.resolve(HERE, "../student-template");
fs.rmSync(path.join(TPL, "js"), { recursive: true, force: true });
fs.rmSync(path.join(TPL, "go"), { recursive: true, force: true });
for (const ex of JS) {
  const d = path.join(TPL, "js", ex.id); fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, "solution.js"), ex.starter);
  fs.writeFileSync(path.join(d, "README.md"), `# ${ex.title}\n\n**${ex.topic}** · JavaScript · ${ex.level}\n\n${ex.prompt}\n\nEdit \`solution.js\`, then commit and push. Your tests run automatically.\n`);
}
fs.mkdirSync(path.join(TPL, "go"), { recursive: true });
fs.writeFileSync(path.join(TPL, "go", "go.mod"), "module student\n\ngo 1.22\n");
for (const ex of GO) {
  const d = path.join(TPL, "go", ex.id.replace(/-/g, "_")); fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, "solution.go"), ex.starter);
  fs.writeFileSync(path.join(d, "README.md"), `# ${ex.title}\n\n**${ex.topic}** · Go · ${ex.level}\n\n${ex.prompt}\n\nEdit \`solution.go\`, then commit and push. Your tests run automatically.\n`);
}
console.log("student template written");
