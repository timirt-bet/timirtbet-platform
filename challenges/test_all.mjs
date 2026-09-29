// Checks reference answers against the tests: SOLUTIONS_DIR=/path/to/solutions node test_all.mjs
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
