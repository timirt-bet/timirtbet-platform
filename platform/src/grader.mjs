// Test runner: grades exercises in a checked-out student repository against the
// challenges repository. Run this inside an isolated container (no network,
// CPU/memory limits) because it executes student code.
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { goDir } from "./exercises.mjs";

// Bumped whenever grading changes in a way that can change a result. Saved with every result.
export const GRADER_VERSION = 2;

// Extra checks that learners never see: one JSON file (in production a Secret Manager secret
// mounted into the grader) mapping exercise ids to either a list of JS tests ({ "t": "..." })
// or the source of a Go test file whose tests are named TestHidden*.
function hiddenTests() {
  const f = process.env.HIDDEN_TESTS_FILE;
  if (!f) return {};
  try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { console.error("HIDDEN_TESTS_FILE unreadable:", e.message); return {}; }
}

// Standard library packages a Go answer may import. Anything else (os, net, syscall, unsafe,
// embed, testing, reflect, runtime, cgo, ...) is refused before the code is compiled.
export const GO_IMPORTS = new Set(["bufio", "bytes", "cmp", "container/heap", "container/list", "container/ring", "context",
  "errors", "fmt", "maps", "math", "math/big", "math/bits", "math/rand", "math/rand/v2", "regexp", "slices", "sort", "strconv",
  "strings", "sync", "sync/atomic", "time", "unicode", "unicode/utf8", "unicode/utf16"]);

/** The imports of one Go source file, read without compiling it. */
export function goImports(src) {
  // Imports must come before any other declaration, so only the header is read.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, "").split(/^\s*(?:func|type|var|const)\b/m)[0];
  const out = [];
  for (const m of code.matchAll(/\bimport\s*(\(([^)]*)\)|[^\n;]*)/g)) {
    const block = m[2] !== undefined ? m[2] : m[1];
    for (const q of block.matchAll(/"([^"]*)"|`([^`]*)`/g)) out.push(q[1] !== undefined ? q[1] : q[2]);
  }
  return out;
}

function run(cmd, args, opts) {
  return new Promise((resolve) => {
    execFile(cmd, args, { maxBuffer: 8 * 1024 * 1024, ...opts }, (err, stdout, stderr) => {
      resolve({ code: err ? (typeof err.code === "number" ? err.code : 1) : 0, killed: !!(err && err.killed), stdout, stderr });
    });
  });
}

async function gradeJS(ex, repoDir, challengesDir) {
  const file = path.join(repoDir, "js", ex.id, "solution.js");
  if (!fs.existsSync(file)) return { exerciseId: ex.id, lang: "js", passed: false, error: `Missing js/${ex.id}/solution.js`, tests: [], graderVersion: GRADER_VERSION };
  const hidden = hiddenTests()[ex.id];
  let hiddenFile = null;
  if (Array.isArray(hidden) && hidden.length) {
    hiddenFile = path.join(path.dirname(file), "hidden.json");
    fs.writeFileSync(hiddenFile, JSON.stringify({ [ex.id]: hidden }));
  }
  const allow = [path.resolve(challengesDir), file, ...(hiddenFile ? [hiddenFile] : [])].map((p) => "--allow-fs-read=" + p);
  // A second line of defence behind the grader's own sandbox: no eval, no file access beyond
  // the tests and the answer, no child processes or network, limited memory.
  const flags = ["--no-warnings", "--disallow-code-generation-from-strings", "--max-old-space-size=256", "--permission", "--allow-worker", ...allow];
  const r = await run(process.execPath, [...flags, path.join(challengesDir, "js", "grade.mjs"), ex.id, file, ...(hiddenFile ? [hiddenFile] : [])], { timeout: 30000 });
  if (hiddenFile) fs.rmSync(hiddenFile, { force: true });
  if (r.killed) return { exerciseId: ex.id, lang: "js", passed: false, error: "Timed out. Check for a loop that never ends.", tests: [], graderVersion: GRADER_VERSION };
  try {
    const out = JSON.parse(r.stdout);
    const tests = out.results.map((t) => ({ name: t.test, pass: t.pass, message: t.message || null, ...(t.hidden ? { hidden: true } : {}) }));
    const hiddenTotal = out.hiddenTotal || 0, hiddenPassed = out.hiddenPassed || 0;
    return { exerciseId: ex.id, lang: "js", passed: out.passed === out.total && hiddenPassed === hiddenTotal, passedCount: out.passed, total: out.total, hiddenPassed, hiddenTotal, tests, graderVersion: GRADER_VERSION };
  } catch {
    return { exerciseId: ex.id, lang: "js", passed: false, error: (r.stderr || r.stdout || "Grader crashed").slice(0, 2000), tests: [], graderVersion: GRADER_VERSION };
  }
}

export function parseGoTestJSON(stdout) {
  const tests = new Map(); const pkgOutput = [];
  for (const line of stdout.split("\n")) {
    if (!line.trim().startsWith("{")) { if (line.trim()) pkgOutput.push(line); continue; }
    let ev; try { ev = JSON.parse(line); } catch { continue; }
    if (ev.Test && !ev.Test.includes("/")) {
      const t = tests.get(ev.Test) || { name: ev.Test, pass: false, output: [] };
      if (ev.Action === "output" && !/^(=== RUN|--- (PASS|FAIL)|=== PAUSE|=== CONT)/.test(ev.Output.trim())) t.output.push(ev.Output.trim());
      if (ev.Action === "pass") t.pass = true;
      if (ev.Action === "fail") t.pass = false;
      tests.set(ev.Test, t);
    } else if (ev.Action === "output" && ev.Output) pkgOutput.push(ev.Output.trimEnd());
  }
  return { tests: [...tests.values()].map((t) => ({ name: t.name, pass: t.pass, message: t.pass ? null : t.output.filter(Boolean).join("\n") || null })), pkgOutput };
}

async function gradeGo(ex, repoDir, challengesDir) {
  const src = path.join(repoDir, "go", goDir(ex.id), "solution.go");
  if (!fs.existsSync(src)) return { exerciseId: ex.id, lang: "go", passed: false, error: `Missing go/${goDir(ex.id)}/solution.go`, tests: [], graderVersion: GRADER_VERSION };
  const code = fs.readFileSync(src, "utf8");
  const banned = goImports(code).filter((p) => !GO_IMPORTS.has(p));
  if (banned.length) return { exerciseId: ex.id, lang: "go", passed: false, error: `Not allowed here: import ${banned.map((p) => JSON.stringify(p)).join(", ")}. Use only the standard packages the challenge needs (fmt, strings, sort, errors, sync, ...).`, tests: [], graderVersion: GRADER_VERSION };
  if (/^\s*\/\/\s*go:(linkname|embed|cgo_|nosplit|noescape)/m.test(code)) return { exerciseId: ex.id, lang: "go", passed: false, error: "Compiler directives (//go:...) are not allowed in answers.", tests: [], graderVersion: GRADER_VERSION };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "timirtbet-go-"));
  try {
    fs.writeFileSync(path.join(tmp, "go.mod"), "module submission\n\ngo 1.22\n");
    fs.copyFileSync(src, path.join(tmp, "solution.go"));
    const testDir = path.join(challengesDir, "go", goDir(ex.id));
    for (const f of fs.readdirSync(testDir).filter((f) => f.endsWith("_test.go"))) fs.copyFileSync(path.join(testDir, f), path.join(tmp, f));
    const hidden = hiddenTests()[ex.id];
    if (typeof hidden === "string" && hidden.trim()) fs.writeFileSync(path.join(tmp, "zz_hidden_test.go"), hidden);
    const args = ["test", "-json", "-count=1", "-timeout", "20s"];
    if (process.env.TIMIRTBET_GO_RACE !== "0") args.push("-race");
    const r = await run("go", [...args, "./..."], { cwd: tmp, timeout: 60000, env: { ...process.env, GOPROXY: "off", GOTOOLCHAIN: "local", GOFLAGS: "-mod=mod" } });
    if (r.killed) return { exerciseId: ex.id, lang: "go", passed: false, error: "Timed out. Check for a goroutine that never finishes or a channel that is never closed.", tests: [], graderVersion: GRADER_VERSION };
    const { tests: all, pkgOutput } = parseGoTestJSON(r.stdout + "\n" + r.stderr);
    if (all.length === 0) {
      const msg = pkgOutput.filter((l) => /\.go:\d+|error|undefined|cannot|expected/i.test(l) && !/zz_hidden_test\.go/.test(l)).join("\n") || "Your code did not compile with the tests.";
      return { exerciseId: ex.id, lang: "go", passed: false, error: "Build failed:\n" + msg.slice(0, 2000), tests: [], graderVersion: GRADER_VERSION };
    }
    // Hidden tests are reported by number only, never by name or output.
    const visible = all.filter((t) => !/^TestHidden/.test(t.name));
    const extra = all.filter((t) => /^TestHidden/.test(t.name)).map((t, i) => ({ name: `Extra check ${i + 1}`, pass: t.pass, hidden: true,
      message: t.pass ? null : "One of the extra checks failed: try more inputs, including edge cases." }));
    const passedCount = visible.filter((t) => t.pass).length, hiddenPassed = extra.filter((t) => t.pass).length;
    // The exit code is what counts: printed "--- PASS" lines cannot turn a failing run into a pass.
    return { exerciseId: ex.id, lang: "go", passed: r.code === 0 && passedCount === visible.length && hiddenPassed === extra.length,
      passedCount, total: visible.length, hiddenPassed, hiddenTotal: extra.length, tests: [...visible, ...extra], graderVersion: GRADER_VERSION };
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

export async function gradeRepo({ repoDir, exerciseIds, bank, challengesDir }) {
  const results = [];
  for (const id of exerciseIds) {
    const ex = bank[id];
    results.push(ex.lang === "js" ? await gradeJS(ex, repoDir, challengesDir) : await gradeGo(ex, repoDir, challengesDir));
  }
  return results;
}

// Grade code sent directly (from the web editor, or files the API read from a commit).
// items: [{ exerciseId, code }] -> results with the graded code attached.
export async function gradeCode({ items, bank, challengesDir }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "timirtbet-sub-"));
  try {
    const ids = [];
    for (const { exerciseId, code } of items) {
      const ex = bank[exerciseId];
      if (!ex || typeof code !== "string") continue;
      const file = ex.lang === "js" ? path.join(dir, "js", ex.id, "solution.js") : path.join(dir, "go", goDir(ex.id), "solution.go");
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, code);
      ids.push(exerciseId);
    }
    const results = await gradeRepo({ repoDir: dir, exerciseIds: ids, bank, challengesDir });
    return results.map((r) => ({ ...r, code: items.find((i) => i.exerciseId === r.exerciseId).code }));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

export const solutionPath = (ex) => (ex.lang === "js" ? `js/${ex.id}/solution.js` : `go/${goDir(ex.id)}/solution.go`);
