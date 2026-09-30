import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const CHALLENGES = path.join(ROOT, "challenges");
export const TEMPLATE = path.join(ROOT, "student-template");
// Reference answers are kept in a private repository (clone it to ./solutions or set SOLUTIONS_DIR).
// Tests that need a passing answer are skipped without them.
export const SOLUTIONS = path.resolve(process.env.SOLUTIONS_DIR || path.join(ROOT, "solutions"));
export const HAS_ANSWERS = fs.existsSync(path.join(SOLUTIONS, "js"));
export const NEEDS_ANSWERS = HAS_ANSWERS ? false : "needs the reference answers (see CONTRIBUTING.md)";
export const answer = (id) => fs.readFileSync(path.join(SOLUTIONS, id.startsWith("js-") ? "js" : "go", id + (id.startsWith("js-") ? ".js" : ".go")), "utf8");

// A student repository: the template, with reference solutions for the given exercises.
export function fixtureRepo(solved = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "timirtbet-fixture-"));
  fs.cpSync(TEMPLATE, dir, { recursive: true });
  for (const id of solved) {
    if (id.startsWith("js-")) fs.writeFileSync(path.join(dir, "js", id, "solution.js"), answer(id));
    else fs.writeFileSync(path.join(dir, "go", id.replace(/-/g, "_"), "solution.go"), answer(id));
  }
  return dir;
}

// Records GitHub calls and answers them from memory.
export function fakeGitHub({ prFiles = [] } = {}) {
  const calls = []; const repos = new Set();
  const rec = (name, ...args) => { calls.push({ name, args }); };
  return {
    calls,
    async getUser(u) { rec("getUser", u); return { id: 1000 + u.length, login: u }; },
    async addToTeam(...a) { rec("addToTeam", ...a); return { state: "pending" }; },
    async createFromTemplate(org, tpl, name) { rec("createFromTemplate", org, tpl, name); repos.add(`${org}/${name}`); return { full_name: `${org}/${name}` }; },
    async getRepo(o, r) { rec("getRepo", o, r); return { full_name: `${o}/${r}` }; },
    async addCollaborator(...a) { rec("addCollaborator", ...a); return {}; },
    async setStatus(o, r, sha, s) { rec("setStatus", o, r, sha, s); return {}; },
    async commentOnPR(o, r, n, body) { rec("commentOnPR", o, r, n, body); return {}; },
    async createIssue(o, r, title, body) { rec("createIssue", o, r, title, body); return { number: 1 }; },
    async listPRFiles(...a) { rec("listPRFiles", ...a); return prFiles; },
    files: {}, // path -> text on main, for getFileAt
    async getFileAt(o, r, p) { rec("getFileAt", o, r, p); return { text: this.files[p] ?? null, sha: "c0ffee1234567890" }; },
    async deleteRepo(...a) { rec("deleteRepo", ...a); return null; },
    async removeFromOrg(...a) { rec("removeFromOrg", ...a); return null; },
    async getToken() { return "test-token"; },
    tarballUrl: () => "unused",
  };
}
