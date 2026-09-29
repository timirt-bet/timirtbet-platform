// push / pull request / web editor -> grader -> result (a pass keeps its code) | failed: feedback.
// A finished module -> one submission of all its solutions -> a reviewer who finished that module.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { changedExercises } from "./exercises.mjs";
import { solutionPath } from "./grader.mjs";
import { pickReviewer, REVIEW_DEADLINE_MS } from "./reviews.mjs";
const noop = async () => {};
export const REMINDER_AFTER_MS = 48 * 3600 * 1000;

const execFileP = promisify(execFile);
export const STATUS_CONTEXT = "timirtbet/tests";

// Downloads the repository at an exact commit into a temporary folder.
export async function fetchRepoTarball(gh, owner, repo, sha) {
  const res = await fetch(gh.tarballUrl(owner, repo, sha), { headers: { authorization: `Bearer ${await gh.getToken()}`, accept: "application/vnd.github+json", "user-agent": "timirtbet-platform" } });
  if (!res.ok) throw new Error(`Could not download ${owner}/${repo}@${sha}: ${res.status}`);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "timirtbet-repo-"));
  const tgz = `${dir}.tgz`;
  fs.writeFileSync(tgz, Buffer.from(await res.arrayBuffer()));
  await execFileP("tar", ["-xzf", tgz, "-C", dir, "--strip-components=1"]);
  fs.rmSync(tgz, { force: true });
  return dir;
}

// Turns a GitHub webhook into a grading job, or null if there is nothing to grade.
export async function jobFromEvent({ event, payload, gh, bank, defaultBranch = "main" }) {
  if (event === "push") {
    if (payload.ref !== `refs/heads/${defaultBranch}` || payload.deleted || /^0+$/.test(payload.after || "")) return null;
    const paths = (payload.commits || []).flatMap((c) => [...(c.added || []), ...(c.modified || [])]);
    const exerciseIds = changedExercises(paths, bank);
    if (!exerciseIds.length) return null;
    return { kind: "push", key: `${payload.repository.full_name}@${payload.after}`, repo: payload.repository.full_name, sha: payload.after, exerciseIds, pr: null };
  }
  if (event === "pull_request") {
    if (!["opened", "synchronize", "reopened"].includes(payload.action)) return null;
    const [owner, repo] = payload.repository.full_name.split("/");
    const files = await gh.listPRFiles(owner, repo, payload.pull_request.number);
    const exerciseIds = changedExercises(files.filter((f) => f.status !== "removed").map((f) => f.filename), bank);
    if (!exerciseIds.length) return null;
    const sha = payload.pull_request.head.sha;
    return { kind: "push", key: `${payload.repository.full_name}@${sha}#pr${payload.pull_request.number}`, repo: payload.repository.full_name, sha, exerciseIds, pr: payload.pull_request.number };
  }
  return null;
}

export function webJob({ learnerId, exerciseId, code }) {
  const digest = crypto.createHash("sha256").update(code).digest("hex").slice(0, 12);
  return { kind: "web", key: `web_${learnerId}_${exerciseId}_${digest}_${Date.now().toString(36)}`, learnerId, exerciseId, code };
}

export function feedbackComment(results, bank) {
  const lines = ["### Timirtbet test results", "", "| Challenge | Result |", "|---|---|"];
  for (const r of results) lines.push(`| ${bank[r.exerciseId].title} (\`${r.exerciseId}\`) | ${r.passed ? "✅ passed" : r.error ? "❌ " + r.error.split("\n")[0] : `❌ ${r.passedCount}/${r.total} tests`} |`);
  const failed = results.filter((r) => !r.passed);
  if (failed.length) {
    lines.push("", "#### What to fix");
    for (const r of failed) {
      lines.push("", `**${bank[r.exerciseId].title}**`);
      if (r.error) lines.push("```", r.error.slice(0, 1500), "```");
      for (const t of (r.tests || []).filter((t) => !t.pass)) lines.push(`- \`${t.name}\`: ${t.message ? t.message.split("\n").join(" ") : "failed"}`);
    }
  }
  if (results.some((r) => r.passed)) lines.push("", "Passed challenges count toward their module. When every challenge in a module passes, submit the module for review on Timirtbet.");
  return lines.join("\n");
}

// A review unit is a module (reviewed as a whole) or, for older submissions, a single challenge.
const unitOf = (id, bank, modules = {}) => modules[id] || bank[id];

// Who can review a unit: everyone who passed every challenge in it.
export async function passersOfUnit(store, unitId, modules = {}) {
  const m = modules[unitId];
  if (!m) return store.passersOf(unitId);
  const lists = await Promise.all(m.exercises.map((e) => store.passersOf(e)));
  return lists.reduce((a, b) => a.filter((id) => b.includes(id)));
}

// Everyone who can review the unit, with circle membership and reviewer counters.
export async function reviewerCandidates(store, author, unitId, modules = {}) {
  const ids = await passersOfUnit(store, unitId, modules);
  const [learners, stats] = await Promise.all([store.getLearners(ids), store.reviewerStatsMany(ids)]);
  return ids.filter((id) => learners[id]).map((id) => ({ id, sameCircle: !!(author?.circleId && learners[id].circleId === author.circleId), stats: stats[id] }));
}

export async function assignReviewer({ store, bank, modules = {}, sub, exclude = [], notify = noop }) {
  const author = await store.getLearner(sub.studentId);
  const unitId = sub.moduleId || sub.exerciseId;
  const reviewerId = pickReviewer({ authorId: sub.studentId, exercise: unitOf(unitId, bank, modules), candidates: await reviewerCandidates(store, author, unitId, modules), exclude });
  if (!reviewerId) return store.updateSubmission(sub.id, { reviewerId: null, status: "waiting_for_reviewer" });
  await store.bumpOpenReviews(reviewerId, 1);
  const assigned = await store.updateSubmission(sub.id, { reviewerId, status: "awaiting_review", assignedAt: new Date().toISOString(), reminded: false });
  await notify(reviewerId, { kind: "review_assigned", unitId, subId: sub.id });
  return assigned;
}

export class ModuleError extends Error { constructor(message, status = 409) { super(message); this.status = status; } }

// Sends a finished module for review: the latest passing code of each of its challenges, together.
export async function submitModule({ store, bank, modules, learnerId, moduleId, notify = noop, log = () => {} }) {
  const m = modules[moduleId];
  if (!m) throw new ModuleError("unknown module", 404);
  if (await store.openSubmissionFor(learnerId, moduleId)) throw new ModuleError("This module is already in review.");
  const items = [];
  for (const exerciseId of m.exercises) {
    const pass = await store.passOf(learnerId, exerciseId);
    if (!pass?.code) throw new ModuleError(`Pass "${bank[exerciseId]?.title || exerciseId}" first: every challenge in the module must pass on the grader.`);
    const r = await store.latestResult(learnerId, exerciseId);
    items.push({ exerciseId, code: pass.code, passed: r?.passedCount ?? 0, total: r?.total ?? 0 });
  }
  const sub = await store.addSubmission({ studentId: learnerId, moduleId, exerciseId: moduleId, source: "module", items,
    tests: { passed: items.reduce((a, i) => a + i.passed, 0), total: items.reduce((a, i) => a + i.total, 0) } });
  const assigned = await assignReviewer({ store, bank, modules, sub, notify });
  log(`module ${moduleId} from ${learnerId} -> ${assigned.reviewerId || "waiting for a reviewer"}`);
  return assigned;
}

// Records graded results. A pass keeps its code for the module submission; it is not reviewed on its own.
async function record({ store, bank, modules, learner, results, ref, source, notify }) {
  for (const r of results) {
    await store.addResult({ learnerId: learner.id, exerciseId: r.exerciseId, ref, source, passed: r.passed, passedCount: r.passedCount ?? 0, total: r.total ?? 0, tests: r.tests || [], error: r.error || null, ...(r.passed && typeof r.code === "string" ? { code: r.code } : {}) });
  }
  // A new pass can make this learner a reviewer for module submissions that were waiting.
  if (results.some((r) => r.passed)) await assignWaiting({ store, bank, modules, notify });
}

export async function processJob({ job, gh, store, bank, modules = {}, grader, fetchRepo, config, notify = noop, log = () => {} }) {
  if (job.kind === "web") {
    const learner = await store.getLearner(job.learnerId);
    if (!learner) return null;
    await store.updateJob(job.key, { status: "running" });
    const results = (await grader.grade([{ exerciseId: job.exerciseId, code: job.code }])).map((r) => ({ ...r, code: job.code }));
    await record({ store, bank, modules, learner, results, ref: "web", source: "web", notify });
    await store.updateJob(job.key, { status: "done", passed: results.every((r) => r.passed), doneAt: new Date().toISOString() });
    return { results };
  }

  const learner = await store.learnerByRepo(job.repo);
  if (!learner) { log(`ignoring ${job.repo}: not a Timirtbet learner repository`); return null; }
  const [owner, repo] = job.repo.split("/");
  const target = config.appUrl ? `${config.appUrl}/` : undefined;
  await gh.setStatus(owner, repo, job.sha, { state: "pending", description: `Testing ${job.exerciseIds.length} challenge(s)`, context: STATUS_CONTEXT, target_url: target });
  let dir;
  try {
    dir = await fetchRepo(owner, repo, job.sha);
    const items = [], missing = [];
    for (const id of job.exerciseIds) {
      const file = path.join(dir, solutionPath(bank[id]));
      if (fs.existsSync(file)) items.push({ exerciseId: id, code: fs.readFileSync(file, "utf8") });
      else missing.push({ exerciseId: id, passed: false, error: `Missing ${solutionPath(bank[id])}`, tests: [] });
    }
    const graded = items.length ? await grader.grade(items) : [];
    const results = [...graded.map((r) => ({ ...r, code: items.find((i) => i.exerciseId === r.exerciseId)?.code })), ...missing];
    await record({ store, bank, modules, learner, results, ref: job.sha, source: "git", notify });
    const ok = results.filter((r) => r.passed).length;
    await gh.setStatus(owner, repo, job.sha, { state: ok === results.length ? "success" : "failure", description: `${ok}/${results.length} challenge(s) passed`, context: STATUS_CONTEXT, target_url: target });
    if (job.pr) await gh.commentOnPR(owner, repo, job.pr, feedbackComment(results, bank));
    await store.updateJob(job.key, { status: "done", doneAt: new Date().toISOString() });
    return { results };
  } catch (e) {
    await gh.setStatus(owner, repo, job.sha, { state: "error", description: "The grader hit a problem. It will retry.", context: STATUS_CONTEXT, target_url: target }).catch(() => {});
    throw e; // Pub/Sub retries the push
  } finally {
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  }
}

// Submissions nobody could review yet get another chance (after a rating frees a reviewer, or on the hourly task).
export async function assignWaiting({ store, bank, modules = {}, notify = noop }) {
  for (const sub of await store.byStatus("waiting_for_reviewer")) await assignReviewer({ store, bank, modules, sub, exclude: sub.previousReviewers || [], notify });
}

// The hourly task: a reminder 48 hours after assignment; after 72 hours the review moves to someone else.
export async function reassignStale({ store, bank, modules = {}, notify = noop, now = Date.now() }) {
  let moved = 0;
  for (const sub of await store.byStatus("awaiting_review")) {
    if (!sub.assignedAt) continue;
    const age = now - Date.parse(sub.assignedAt), unitId = sub.moduleId || sub.exerciseId;
    if (age < REVIEW_DEADLINE_MS) {
      if (age >= REMINDER_AFTER_MS && !sub.reminded) {
        await store.updateSubmission(sub.id, { reminded: true });
        await notify(sub.reviewerId, { kind: "review_due", unitId, subId: sub.id });
      }
      continue;
    }
    await store.bumpOpenReviews(sub.reviewerId, -1);
    await notify(sub.reviewerId, { kind: "review_moved", unitId, subId: sub.id });
    const next = await assignReviewer({ store, bank, modules, sub, exclude: [sub.reviewerId, ...(sub.previousReviewers || [])], notify });
    await store.updateSubmission(sub.id, { previousReviewers: [...(sub.previousReviewers || []), sub.reviewerId] });
    if (next.reviewerId) moved++;
  }
  await assignWaiting({ store, bank, modules, notify });
  return moved;
}
