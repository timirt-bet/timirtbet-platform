// Usage: node js/grade.mjs <exercise-id> <submission.js>
// Runs the exercise's tests against a submission and prints JSON results.
// Production note: run each submission in an isolated worker/container with a time limit.
import fs from "node:fs";
const [id, file] = process.argv.slice(2);
if (!id || !file) { console.error("Usage: node js/grade.mjs <exercise-id> <submission.js>"); process.exit(2); }
const bank = JSON.parse(fs.readFileSync(new URL("../exercises.json", import.meta.url)));
const ex = bank.find((e) => e.id === id && e.lang === "js");
if (!ex) { console.error("Unknown JS exercise: " + id); process.exit(2); }
const HARNESS = fs.readFileSync(new URL("./harness.js", import.meta.url), "utf8");
const code = fs.readFileSync(file, "utf8");
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const results = [];
for (const t of ex.tests) {
  try { await new AsyncFunction(HARNESS + "\n" + code + "\n;" + t.t)(); results.push({ test: t.n, pass: true }); }
  catch (e) { results.push({ test: t.n, pass: false, message: String((e && e.message) || e) }); }
}
const passed = results.filter((r) => r.pass).length;
console.log(JSON.stringify({ exercise: id, passed, total: results.length, results }, null, 2));
process.exit(passed === results.length ? 0 : 1);
