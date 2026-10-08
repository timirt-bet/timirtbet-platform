// Usage: node js/grade.mjs <exercise-id> <submission.js> [hidden-tests.json]
// Runs an exercise's tests against a submission and prints JSON results on stdout.
//
// The submission cannot change its own result:
//  - It runs in a separate JavaScript realm (node:vm) that has no `process`, `require`, file
//    or network access; no object from the grader's realm is ever handed to it.
//  - The standard globals (Object, Array, Date, Promise, Error, JSON, Math, ...) are frozen and
//    cannot be replaced, and each test receives the original ones, so redefining `Date`, `eq` or
//    `TypeError` changes nothing.
//  - The checks (eq, near, ok, throws) are passed to each test as parameters the submission
//    cannot reach. Each check in a test must actually run: a test passes only if every one of its
//    checks ran and passed and the test reached its end.
//  - Results are collected inside the grader's closure, never printed by the submission.
//  - Each test runs in its own worker thread with a memory cap, stopped after a few seconds,
//    so an endless loop (even after an await) fails that test instead of hanging the grader.
// Run it with: node --disallow-code-generation-from-strings --permission --allow-worker --allow-fs-read=...
// (src/grader.mjs does), inside a container with no credentials, as a second line of defence.
import fs from "node:fs";
import vm from "node:vm";
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";

const TEST_MS = 3000, LOAD_MS = 2000, BUDGET_MS = 12000, MEMORY_MB = 128;
// Globals the tests may use, handed to every test as the originals.
const GIVEN = ["Object", "Array", "Number", "String", "Boolean", "Symbol", "Date", "RegExp", "Map", "Set", "Promise", "JSON", "Math",
  "Error", "TypeError", "RangeError", "SyntaxError", "ReferenceError"];
const CHECKS = /\b(eq|near|ok|throws)\(/g;

// Set up in the submission's realm before its code runs: captures the original built-ins,
// freezes them, and builds the checks. Everything it keeps is in this closure.
const PRELUDE = `(function (host) {
  "use strict";
  const G = globalThis, O = Object;
  const { freeze, defineProperty, getOwnPropertyNames, getOwnPropertyDescriptor, keys, is, getPrototypeOf } = O;
  const isArray = Array.isArray, ownHas = (o, k) => getOwnPropertyDescriptor(o, k) !== undefined;
  const instanceOf = Function.prototype[Symbol.hasInstance];
  const apply = Reflect.apply, stringify = JSON.stringify, Str = String, Err = Error;
  const STD = ${JSON.stringify(["Object", "Function", "Array", "Number", "String", "Boolean", "Symbol", "BigInt", "Date", "RegExp", "Error", "TypeError",
    "RangeError", "SyntaxError", "ReferenceError", "EvalError", "URIError", "AggregateError", "Promise", "Map", "Set", "WeakMap", "WeakSet", "WeakRef",
    "FinalizationRegistry", "JSON", "Math", "Reflect", "Proxy", "Intl", "ArrayBuffer", "DataView", "Int8Array", "Uint8Array", "Uint8ClampedArray",
    "Int16Array", "Uint16Array", "Int32Array", "Uint32Array", "Float32Array", "Float64Array", "BigInt64Array", "BigUint64Array", "Atomics",
    "SharedArrayBuffer", "parseInt", "parseFloat", "isNaN", "isFinite", "encodeURIComponent", "decodeURIComponent", "encodeURI", "decodeURI",
    "escape", "unescape", "eval", "globalThis", "NaN", "Infinity", "undefined"])};
  const originals = {};
  for (const name of STD) originals[name] = G[name];
  const lock = (name, value) => defineProperty(G, name, { value, writable: false, enumerable: false, configurable: false });

  // Timers and logging, backed by the grader but returning only numbers (no grader objects).
  const later = (fn, ms) => { if (typeof fn !== "function") return 0; return host.timer(() => { apply(fn, undefined, []); }, +ms || 0); };
  const timers = {
    setTimeout: (fn, ms) => later(fn, ms), clearTimeout: (id) => { host.clear(+id); },
    setInterval: () => { throw new Err("setInterval is not available in the tests"); }, clearInterval: (id) => { host.clear(+id); },
    queueMicrotask: (fn) => { originals.Promise.resolve().then(() => apply(fn, undefined, [])); },
  };
  const quiet = () => undefined;
  const consoleObj = freeze({ log: quiet, info: quiet, warn: quiet, error: quiet, debug: quiet, table: quiet, dir: quiet });
  const sleep = (ms) => new originals.Promise((resolve) => later(resolve, ms));

  // Freeze the built-in constructors and namespaces (their statics: Date.now, Array.isArray, ...)
  // and Function.prototype, and make every standard global impossible to replace.
  for (const name of STD) {
    const v = originals[name];
    if ((typeof v === "function" || (typeof v === "object" && v !== null)) && v !== G) freeze(v);
    lock(name, v);
  }
  freeze(Function.prototype);
  for (const k of keys(timers)) lock(k, timers[k]);
  lock("console", consoleObj);
  lock("sleep", sleep);

  // ---- the checks ----
  const fmt = (v) => {
    if (v === undefined) return "undefined";
    if (typeof v === "function") return "a function";
    if (typeof v === "bigint") return Str(v) + "n";
    try { const s = stringify(v); return typeof s === "string" ? (s.length > 300 ? s.slice(0, 300) + "…" : s) : Str(v); } catch { return "an object that cannot be shown"; }
  };
  // Deep equality on own data properties only (getters on the actual value never count as equal).
  const deq = (a, b, depth) => {
    if (is(a, b)) return true;
    if (depth > 50 || typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
    if (isArray(a) !== isArray(b)) return false;
    const ka = keys(a), kb = keys(b);
    if (ka.length !== kb.length) return false;
    for (const k of kb) {
      const da = getOwnPropertyDescriptor(a, k), db = getOwnPropertyDescriptor(b, k);
      if (!da || !("value" in da) || !deq(da.value, db.value, depth + 1)) return false;
    }
    return true;
  };
  const errMsg = (e) => {
    try {
      if (e !== null && typeof e === "object") { const d = getOwnPropertyDescriptor(e, "message"); if (d && typeof d.value === "string") return d.value; }
      if (typeof e === "string") return e;
    } catch {}
    return "The code threw something that is not an Error";
  };

  return {
    // One test: its checks, which record into this closure, and how it ends.
    begin() {
      const log = [], ran = {};
      let end = null;
      const record = (site, pass, msg) => { defineProperty(log, log.length, { value: [site, pass, msg], enumerable: true }); ran[site] = true; };
      const stop = (msg) => { const e = new Err(msg); e.__check = true; return e; };
      const checks = freeze({
        eq(site, a, b) { if (deq(a, b, 0)) return record(site, true, ""); const m = "Expected " + fmt(b) + ", got " + fmt(a); record(site, false, m); throw stop(m); },
        near(site, a, b, eps) { eps = eps || 1e-6; if (typeof a === "number" && !(Math.abs(a - b) > eps)) return record(site, true, ""); const m = "Expected about " + b + ", got " + fmt(a); record(site, false, m); throw stop(m); },
        ok(site, c, msg) { if (c) return record(site, true, ""); const m = typeof msg === "string" ? msg : "Expected condition to be true"; record(site, false, m); throw stop(m); },
        throws(site, fn, type) {
          try { fn(); } catch (e) {
            if (type && !apply(instanceOf, type, [e])) { const m = "Threw " + errMsg(e) + ", expected " + (type.name || "another error"); record(site, false, m); throw stop(m); }
            record(site, true, ""); return e;
          }
          const m = "Expected an error to be thrown"; record(site, false, m); throw stop(m);
        },
      });
      const finish = () => { if (end === null) end = ["done", ""]; host.settled(); };
      const fail = (e) => { if (end === null) end = ["threw", e && e.__check === true ? "" : errMsg(e)]; host.settled(); };
      const given = ${JSON.stringify(GIVEN)}.map((n) => originals[n]);
      return {
        args: [checks, finish, fail, sleep, timers.setTimeout, ...given],
        // Read only by the grader: plain values.
        report() {
          const out = [];
          for (let i = 0; i < log.length; i++) out[out.length] = [log[i][0], log[i][1], log[i][2]];
          return { checks: out, sites: keys(ran).length, end: end ? end[0] : "", message: end ? end[1] : "" };
        },
      };
    },
  };
})`;

/** Rewrites a test so each check is a numbered call on the private `__c` parameter. */
function instrument(src) {
  let n = 0;
  const body = src.replace(CHECKS, (_, kind) => `__c.${kind}(${n++}, `);
  return { n, source: `(async function (__c, __finish, __fail, sleep, setTimeout, ${GIVEN.join(", ")}) {\n"use strict";\ntry {\n${body}\n} catch (__e) { __fail(__e); return; }\n__finish();\n})` };
}

// One fresh realm per test, so tests cannot affect each other.
async function runTest(t, code) {
  const pending = new Map(); let next = 1, settled;
  const done = new Promise((r) => { settled = r; });
  const host = {
    timer(fn, ms) { const id = next++; pending.set(id, setTimeout(() => { pending.delete(id); try { fn(); } catch {} }, Math.min(Math.max(ms, 0), TEST_MS))); return id; },
    clear(id) { clearTimeout(pending.get(id)); pending.delete(id); },
    settled() { settled(); },
  };
  const ctx = vm.createContext({}, { codeGeneration: { strings: false, wasm: false } });
  const cleanup = () => { for (const h of pending.values()) clearTimeout(h); pending.clear(); };
  try {
    const api = new vm.Script(PRELUDE, { filename: "grader" }).runInContext(ctx)(host);
    try { new vm.Script(code, { filename: "solution.js" }).runInContext(ctx, { timeout: LOAD_MS }); }
    catch (e) { return { pass: false, message: loadError(e) }; }
    const { n, source } = instrument(t.t);
    const fn = new vm.Script(source, { filename: "test" }).runInContext(ctx);
    const run = api.begin();
    let timedOut = false;
    const timer = new Promise((r) => setTimeout(() => { timedOut = true; r(); }, TEST_MS));
    try { fn(...run.args); } catch { /* reported through __fail */ }
    await Promise.race([done, timer]);
    const rep = run.report();
    if (timedOut && rep.end === "") return { pass: false, message: "Did not finish within 3 seconds" };
    const failed = rep.checks.find((c) => c[1] !== true);
    if (failed) return { pass: false, message: String(failed[2]) };
    if (rep.end === "threw") return { pass: false, message: String(rep.message) || "The code threw an error" };
    if (rep.end !== "done") return { pass: false, message: "Did not finish" };
    if (rep.sites < n) return { pass: false, message: "Some checks did not run" };
    return { pass: true };
  } finally { cleanup(); }
}

/** A readable message for code that fails to load (syntax errors, a loop at the top level). */
function loadError(e) {
  if (e && e.code === "ERR_SCRIPT_EXECUTION_TIMEOUT") return "Your code took too long to load (a loop that never ends?)";
  const name = e && typeof e.name === "string" ? e.name : "Error", msg = e && typeof e.message === "string" ? e.message : "";
  return `${name}: ${msg}`.slice(0, 500);
}

// Each test runs in its own worker thread, which is stopped if it runs too long (an endless
// loop, even after an await) or uses too much memory.
if (!isMainThread) {
  runTest(workerData.test, workerData.code).then((r) => parentPort.postMessage(r), () => parentPort.postMessage({ pass: false, message: "The grader could not run this test" }));
} else {
  const [id, file, hiddenFile] = process.argv.slice(2);
  if (!id || !file) { console.error("Usage: node js/grade.mjs <exercise-id> <submission.js> [hidden-tests.json]"); process.exit(2); }
  const bank = JSON.parse(fs.readFileSync(new URL("../exercises.json", import.meta.url), "utf8"));
  const ex = bank.find((e) => e.id === id && e.lang === "js");
  if (!ex) { console.error("Unknown JS exercise: " + id); process.exit(2); }
  const code = fs.readFileSync(file, "utf8");
  let hidden = [];
  if (hiddenFile) { try { hidden = JSON.parse(fs.readFileSync(hiddenFile, "utf8"))[id] || []; } catch { hidden = []; } }
  const started = Date.now();

  /** @returns {Promise<{pass: boolean, message?: string}>} */
  const isolated = (test) => {
    if (Date.now() - started > BUDGET_MS) return Promise.resolve({ pass: false, message: "Not run: earlier tests took too long" });
    return new Promise((resolve) => {
      const w = new Worker(new URL(import.meta.url), { workerData: { test: { t: test.t }, code }, resourceLimits: { maxOldGenerationSizeMb: MEMORY_MB, maxYoungGenerationSizeMb: 16 }, stdout: true, stderr: true });
      let over = false;
      const kill = setTimeout(() => { over = true; w.terminate(); }, TEST_MS + 1000);
      w.once("message", (r) => { clearTimeout(kill); w.terminate(); resolve({ pass: r.pass === true, message: r.pass === true ? undefined : String(r.message) }); });
      w.once("error", (e) => { clearTimeout(kill); resolve({ pass: false, message: e && e.code === "ERR_WORKER_OUT_OF_MEMORY" ? "Used too much memory" : "The code crashed the test" }); });
      w.once("exit", () => { clearTimeout(kill); resolve({ pass: false, message: over ? "Did not finish within 3 seconds (a loop that never ends?)" : "The test stopped unexpectedly" }); });
    });
  };

  const results = [];
  for (const t of ex.tests) { const r = await isolated(t); results.push({ test: t.n, pass: r.pass, message: r.pass ? undefined : r.message }); }
  // Extra checks: not shown to learners. A failure says only that one failed, not what it checks.
  let hiddenPassed = 0;
  for (let i = 0; i < hidden.length; i++) {
    const r = await isolated(hidden[i]);
    if (r.pass) hiddenPassed++;
    results.push({ test: `Extra check ${i + 1}`, pass: r.pass, hidden: true, message: r.pass ? undefined : "One of the extra checks failed: try more inputs, including edge cases." });
  }
  const visible = results.filter((r) => !r.hidden), passed = visible.filter((r) => r.pass).length;
  console.log(JSON.stringify({ exercise: id, passed, total: visible.length, hiddenPassed, hiddenTotal: hidden.length, results }, null, 2));
  process.exit(passed === visible.length && hiddenPassed === hidden.length ? 0 : 1);
}
