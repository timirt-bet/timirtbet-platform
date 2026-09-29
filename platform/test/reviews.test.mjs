import { test } from "node:test";
import assert from "node:assert/strict";
import { reviewScore, reputation, level, onProbation, pickReviewer, reviewerProfile, validateReview, statsFromStars as st, addRating, emptyStats } from "../src/reviews.mjs";

test("a new reviewer starts at 3.5 and moves gradually", () => {
  assert.equal(reviewScore(emptyStats()), 3.5);
  assert.equal(reviewScore(st([5])), 3.75);
  assert.equal(+reviewScore(st([5, 5, 5, 5, 5])).toFixed(2), 4.25);
});

test("counters give the same answer as the full history", () => {
  let s = emptyStats();
  for (const x of [5, 4, 1, 3, 5]) s = addRating(s, x);
  assert.deepEqual(s, { ...st([5, 4, 1, 3, 5]), openReviews: 0 });
});

test("reputation points per star, never below zero", () => {
  assert.equal(reputation(st([5, 4, 3])), 18);
  assert.equal(reputation(st([1, 1])), 0);
  assert.equal(reputation(st([5, 5, 5, 1])), 24);
});

test("levels", () => {
  assert.equal(level(0), 0); assert.equal(level(29), 0); assert.equal(level(30), 1);
  assert.equal(level(100), 2); assert.equal(level(250), 3);
  assert.equal(reviewerProfile(st([5, 5, 5])).level, "Helpful");
});

test("probation needs 4+ ratings and a score under 3", () => {
  assert.equal(onProbation(st([1, 1, 1])), false);
  assert.equal(onProbation(st([1, 1, 1, 1])), true);
  assert.equal(onProbation(st([2, 3, 4, 4])), false);
});

const ex = { id: "js-loops", level: "basic" };
const c = (id, stars = [], extra = {}) => ({ id, stats: st(stars, extra.open || 0), sameCircle: !!extra.circle });
test("never the author, someone on probation, someone overloaded or excluded", () => {
  const candidates = [c("author", [5]), c("probation", [1, 1, 2, 1]), c("busy", [5], { open: 3 }), c("old", [5]), c("ok")];
  for (let i = 0; i < 50; i++) assert.equal(pickReviewer({ authorId: "author", exercise: ex, candidates, exclude: ["old"] }), "ok");
});

test("returns null when nobody is eligible", () => {
  assert.equal(pickReviewer({ authorId: "author", exercise: ex, candidates: [c("author")] }), null);
});

test("circle members review first; the wider pool only when none is free", () => {
  for (let i = 0; i < 50; i++) assert.equal(pickReviewer({ authorId: "a", exercise: ex, candidates: [c("outsider", [5, 5, 5, 5, 5, 5]), c("friend", [], { circle: true })] }), "friend");
  assert.equal(pickReviewer({ authorId: "a", exercise: ex, candidates: [c("outsider"), c("friend", [], { circle: true, open: 3 })] }), "outsider");
});

test("advanced challenges prefer experienced reviewers", () => {
  const candidates = [c("new"), c("helpful", [5, 5, 5, 5])];
  for (let i = 0; i < 50; i++) assert.equal(pickReviewer({ authorId: "a", exercise: { level: "advanced" }, candidates }), "helpful");
});

test("higher scores are picked more often", () => {
  const candidates = [c("low", [3, 3, 3]), c("high", Array(10).fill(5))];
  let seq = 0; const rng = () => (seq++ % 100) / 100;
  const counts = { low: 0, high: 0 };
  for (let i = 0; i < 100; i++) counts[pickReviewer({ authorId: "a", exercise: ex, candidates, rng })]++;
  assert.ok(counts.high > counts.low, JSON.stringify(counts));
});

test("review validation", () => {
  assert.deepEqual(validateReview({ rubric: { correctness: 3, readability: 2, style: 2 }, text: "x".repeat(40) }), []);
  assert.equal(validateReview({ rubric: { correctness: 4 }, text: "short" }).length, 4);
  assert.equal(validateReview({ rubric: { correctness: 3, readability: 3, style: 3 }, text: "x".repeat(4001) }).length, 1);
});
