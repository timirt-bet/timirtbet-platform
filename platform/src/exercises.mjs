// Maps repository paths to exercises, using the challenges repository's exercises.json.
import fs from "node:fs";
import path from "node:path";

export function loadBank(challengesDir) {
  const bank = JSON.parse(fs.readFileSync(path.join(challengesDir, "exercises.json"), "utf8"));
  return Object.fromEntries(bank.map((e) => [e.id, e]));
}

// Modules: small groups of challenges, in curriculum order, that go to review together.
export function loadModules(challengesDir) {
  const f = path.join(challengesDir, "modules.json");
  if (!fs.existsSync(f)) return {};
  return Object.fromEntries(JSON.parse(fs.readFileSync(f, "utf8")).map((m) => [m.id, m]));
}

export const goDir = (id) => id.replace(/-/g, "_");

// js/js-loops/solution.js -> "js-loops"; go/go_loops/solution.go -> "go-loops"
export function exerciseForPath(p, bank) {
  let m = /^js\/(js-[a-z-]+)\/solution\.js$/.exec(p);
  if (m && bank[m[1]]) return m[1];
  m = /^go\/(go_[a-z_]+)\/solution\.go$/.exec(p);
  if (m) { const id = m[1].replace(/_/g, "-"); if (bank[id]) return id; }
  return null;
}

export function changedExercises(paths, bank) {
  return [...new Set(paths.map((p) => exerciseForPath(p, bank)).filter(Boolean))].sort();
}

// Difficulty and points, shared by the API and the web app.
export function difficulty(ex) {
  if (ex.level === "basic") return ex.topic === "Basic problem solving" ? "Medium" : "Easy";
  return ex.topic === "Advanced problem solving" ? "Hard" : "Medium";
}
export const POINTS = { Easy: 10, Medium: 25, Hard: 50 };
export const pointsFor = (ex) => POINTS[difficulty(ex)];
