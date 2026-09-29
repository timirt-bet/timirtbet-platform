// Peer review: who reviews what, review scores, reputation and the quality gate.
// A reviewer's history is kept as counters, so no screen ever recounts old ratings:
//   { ratings, starsSum, pointsSum, openReviews }
export const STAR_POINTS = { 5: 10, 4: 6, 3: 2, 2: -3, 1: -6 };
export const LEVELS = [
  { min: 0, name: "New" },
  { min: 30, name: "Helpful" },
  { min: 100, name: "Trusted" },
  { min: 250, name: "Mentor" },
];
export const MENTOR = 3;
const PRIOR_WEIGHT = 5, PRIOR_MEAN = 3.5;
export const MAX_OPEN_REVIEWS = 3;
export const REVIEW_DEADLINE_MS = 72 * 3600 * 1000;

export const emptyStats = () => ({ ratings: 0, starsSum: 0, pointsSum: 0, openReviews: 0 });
export function statsFromStars(stars, openReviews = 0) {
  return { ratings: stars.length, starsSum: stars.reduce((a, s) => a + s, 0), pointsSum: stars.reduce((a, s) => a + STAR_POINTS[s], 0), openReviews };
}
export function addRating(stats, stars) {
  const s = { ...emptyStats(), ...stats };
  return { ...s, ratings: s.ratings + 1, starsSum: s.starsSum + stars, pointsSum: s.pointsSum + STAR_POINTS[stars] };
}

// Weighted (Bayesian) average: everyone starts at 3.5 and moves as ratings arrive.
export const reviewScore = (st = emptyStats()) => (PRIOR_WEIGHT * PRIOR_MEAN + (st.starsSum || 0)) / (PRIOR_WEIGHT + (st.ratings || 0));
export const reputation = (st = emptyStats()) => Math.max(0, st.pointsSum || 0);
export function level(rep) {
  let i = 0; LEVELS.forEach((l, j) => { if (rep >= l.min) i = j; }); return i;
}
export const onProbation = (st = emptyStats()) => (st.ratings || 0) >= 4 && reviewScore(st) < 3;
export function reviewerProfile(st = emptyStats()) {
  const rep = reputation(st), lv = level(rep);
  return { ratings: st.ratings || 0, score: +reviewScore(st).toFixed(2), reputation: rep, level: LEVELS[lv].name, levelIndex: lv, probation: onProbation(st) };
}

// Pick a reviewer. Candidates have already solved the challenge: { id, sameCircle, stats }.
// Never the author, never on probation, never with MAX_OPEN_REVIEWS open. Circle members first;
// the wider pool only when none is eligible. Advanced challenges prefer Helpful or higher.
// Higher scores, higher levels and fewer open reviews make a pick more likely.
export function pickReviewer({ authorId, exercise, candidates, exclude = [], rng = Math.random }) {
  let pool = candidates.filter((c) => c.id !== authorId && !exclude.includes(c.id) && !onProbation(c.stats) && (c.stats?.openReviews || 0) < MAX_OPEN_REVIEWS);
  const circle = pool.filter((c) => c.sameCircle);
  if (circle.length) pool = circle;
  if (exercise.level === "advanced") {
    const experienced = pool.filter((c) => level(reputation(c.stats)) >= 1);
    if (experienced.length) pool = experienced;
  }
  if (!pool.length) return null;
  const weights = pool.map((c) => reviewScore(c.stats) * (1 + 0.25 * level(reputation(c.stats))) / (1 + (c.stats?.openReviews || 0)));
  let x = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) { x -= weights[i]; if (x <= 0) return pool[i].id; }
  return pool[pool.length - 1].id;
}

export function validateReview({ rubric, text } = {}) {
  const errors = [];
  for (const k of ["correctness", "readability", "style"]) if (![1, 2, 3].includes(rubric?.[k])) errors.push(`rubric.${k} must be 1, 2 or 3`);
  if (typeof text !== "string" || text.trim().length < 40) errors.push("text must be at least 40 characters");
  if (typeof text === "string" && text.length > 4000) errors.push("text must be at most 4000 characters");
  return errors;
}
