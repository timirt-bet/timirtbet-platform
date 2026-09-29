// Notifications for the peer-review loop.
// In the app: every event goes to the learner's inbox (the bell in the header).
// On GitHub: events that need action are posted as a comment that @mentions the learner on one
// "Timirtbet notifications" issue in their own repository, so GitHub notifies them by its usual
// email, web or mobile notifications. Timirtbet itself never stores an email address.
import { LEVELS } from "./reviews.mjs";

export const KINDS = {
  review_assigned: { github: true },   // you have a review to write
  review_due: { github: true },        // your review is due within 24 hours
  review_moved: { github: false },     // your review moved to someone else after 72 hours
  review_received: { github: true },   // your module was reviewed: rate the review
  review_rated: { github: true },      // your review got stars
  level_up: { github: false },         // you reached a new reviewer level
  second_opinion: { github: true },    // a Mentor added a second opinion on your review
  push_passed: { github: false },      // a push passed the grader and is saved (GitHub already shows a ✓ on the commit)
  push_failed: { github: false },      // a push did not pass
  module_ready: { github: false },     // every challenge in a module passed from GitHub: submit it
};

const ISSUE_TITLE = "Timirtbet notifications";

export function unitTitle(unitId, { bank = {}, modules = {} } = {}) {
  const m = modules[unitId];
  if (m) { const n = Object.values(modules).filter((x) => x.lang === m.lang).indexOf(m) + 1; return `Module ${n} · ${m.title}`; }
  return bank[unitId]?.title || unitId;
}

// Plain-English text, used for the GitHub comment. The web app builds its own (translated) text from kind and data.
export function message(n, ctx) {
  const unit = unitTitle(n.unitId, ctx);
  switch (n.kind) {
    case "review_assigned": return `You have a new review to write: **${unit}**. Please review it within 72 hours.`;
    case "review_due": return `Reminder: your review of **${unit}** is due within 24 hours. After that it moves to someone else.`;
    case "review_moved": return `Your review of **${unit}** moved to someone else because 72 hours passed.`;
    case "review_received": return `Your **${unit}** has been reviewed. Read it and rate the review from 1 to 5 stars.`;
    case "review_rated": return `Your review of **${unit}** was rated ${"★".repeat(n.stars)}${"☆".repeat(5 - n.stars)} (${n.points > 0 ? "+" : ""}${n.points} points).`;
    case "level_up": return `You reached **${n.level}** as a reviewer.`;
    case "second_opinion": return `A Mentor added a second opinion to the review of your **${unit}**.`;
    case "push_passed": return `Your push of **${unit}** passed and is saved.`;
    case "push_failed": return `Your push of **${unit}** passed ${n.passed} of ${n.total} tests.`;
    case "module_ready": return `You finished **${unit}**. Submit it for review on Timirtbet.`;
    default: return `Something changed on Timirtbet.`;
  }
}

export function createNotifier({ store, gh, config = {}, bank = {}, modules = {}, log = () => {} }) {
  const ctx = { bank, modules };
  const githubOn = config.githubNotify !== false && !!gh?.createIssue;

  async function toGitHub(learner, n) {
    if (!learner?.repo || !learner.githubUsername) return;
    const [owner, repo] = learner.repo.split("/");
    let issue = learner.notifyIssue;
    if (!issue) {
      const created = await gh.createIssue(owner, repo, ISSUE_TITLE,
        `Timirtbet posts your review notifications here and mentions you, so GitHub tells you about them by email, on the web and in the GitHub app, following your GitHub notification settings.\n\nOpen Timirtbet: ${config.appUrl || ""}`);
      issue = created?.number;
      if (!issue) return;
      await store.upsertLearner(learner.id, { notifyIssue: issue });
    }
    await gh.commentOnPR(owner, repo, issue, `@${learner.githubUsername} ${message(n, ctx)}\n\n${config.appUrl ? `[Open Timirtbet](${config.appUrl}/)` : ""}`);
  }

  // Never throws: a failed notification must not break grading or reviewing.
  return async function notify(learnerId, n) {
    if (!learnerId || learnerId === "deleted" || !KINDS[n.kind]) return null;
    let item = null;
    try { item = await store.notify(learnerId, n); } catch (e) { log(`notify ${learnerId} ${n.kind}: ${e.message}`); }
    if (githubOn && KINDS[n.kind].github) {
      try { await toGitHub(await store.getLearner(learnerId), n); } catch (e) { log(`github notify ${learnerId} ${n.kind}: ${e.message}`); }
    }
    return item;
  };
}

export const levelName = (i) => LEVELS[i]?.name;
