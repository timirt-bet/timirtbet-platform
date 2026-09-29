// Test runner: grades exercises in a checked-out student repository against the
// challenges repository. Run this inside an isolated container (no network,
// CPU/memory limits) because it executes student code.
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { goDir } from "./exercises.mjs";

function run(cmd, args, opts) {
  return new Promise((resolve) => {
    execFile(cmd, args, { maxBuffer: 8 * 1024 * 1024, ...opts }, (err, stdout, stderr) => {
      resolve({ code: err ? (typeof err.code === "number" ? err.code : 1) : 0, killed: !!(err && err.killed), stdout, stderr });
    });
  });
}

async function gradeJS(ex, repoDir, challengesDir) {
  const file = path.join(repoDir, "js", ex.id, "solution.js");
  if (!fs.existsSync(file)) return { exerciseId: ex.id, lang: "js", passed: false, error: `Missing js/${ex.id}/solution.js`, tests: [] };
  const r = await run(process.execPath, [path.join(challengesDir, "js", "grade.mjs"), ex.id, file], { timeout: 15000 });
  if (r.killed) return { exerciseId: ex.id, lang: "js", passed: false, error: "Timed out after 15 s. Check for a loop that never ends.", tests: [] };
  try {
    const out = JSON.parse(r.stdout);
    const tests = out.results.map((t) => ({ name: t.test, pass: t.pass, message: t.message || null }));
    return { exerciseId: ex.id, lang: "js", passed: out.passed === out.total, passedCount: out.passed, total: out.total, tests };
  } catch {
    return { exerciseId: ex.id, lang: "js", passed: false, error: (r.stderr || r.stdout || "Grader crashed").slice(0, 2000), tests: [] };
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
  if (!fs.existsSync(src)) return { exerciseId: ex.id, lang: "go", passed: false, error: `Missing go/${goDir(ex.id)}/solution.go`, tests: [] };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "timirtbet-go-"));
  try {
    fs.writeFileSync(path.join(tmp, "go.mod"), "module submission\n\ngo 1.22\n");
    fs.copyFileSync(src, path.join(tmp, "solution.go"));
    const testDir = path.join(challengesDir, "go", goDir(ex.id));
    for (const f of fs.readdirSync(testDir).filter((f) => f.endsWith("_test.go"))) fs.copyFileSync(path.join(testDir, f), path.join(tmp, f));
    const args = ["test", "-json", "-count=1", "-timeout", "20s"];
    if (process.env.TIMIRTBET_GO_RACE !== "0") args.push("-race");
    const r = await run("go", [...args, "./..."], { cwd: tmp, timeout: 60000, env: { ...process.env, GOPROXY: "off", GOTOOLCHAIN: "local", GOFLAGS: "-mod=mod" } });
    if (r.killed) return { exerciseId: ex.id, lang: "go", passed: false, error: "Timed out. Check for a goroutine that never finishes or a channel that is never closed.", tests: [] };
    const { tests, pkgOutput } = parseGoTestJSON(r.stdout + "\n" + r.stderr);
    if (tests.length === 0) {
      const msg = pkgOutput.filter((l) => /\.go:\d+|error|undefined|cannot|expected/i.test(l)).join("\n") || pkgOutput.join("\n");
      return { exerciseId: ex.id, lang: "go", passed: false, error: "Build failed:\n" + msg.slice(0, 2000), tests: [] };
    }
    const passedCount = tests.filter((t) => t.pass).length;
    return { exerciseId: ex.id, lang: "go", passed: r.code === 0 && passedCount === tests.length, passedCount, total: tests.length, tests };
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
