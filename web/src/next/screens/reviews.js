// @ts-check
// "Reviews" in the menu: modules waiting for this learner's review (with the 72-hour clock),
// the ratings their reviews got, their reviewer level, and for Mentors, second opinions.
// /reviews/<id> is the page for writing one review.
import { html } from "htm/preact";
import { signal } from "@preact/signals";
import { useState, useEffect } from "preact/hooks";
import { go, old } from "../legacy.js";
import { t, tText } from "../i18n.js";
import { api } from "../api.js";
import { state, refresh } from "../state.js";
import { SignInNeeded } from "../components/people.js";
import { Clock, now } from "../components/clock.js";
import { CodeBlock } from "../components/code.js";
import { LEVELS, PTS, RUBRIC, MARKS, MIN_CHARS, canSend, unitOf, unitTitle, solutionFile, ago, ladder, stars } from "../reviewing.js";

/** A one-time message for the reviews list, set after sending a review. */
const flash = signal("");

/* ---------- drafts: a half-written review survives leaving the page ---------- */
const DRAFT = (/** @type {string} */ id) => "timirtbet.rvdraft." + id;
/** @param {string} id @returns {import("../reviewing.js").Draft} */
function loadDraft(id) {
  try { const d = JSON.parse(localStorage.getItem(DRAFT(id)) || "null"); if (d && d.rub && typeof d.text === "string") return d; } catch (e) {}
  return { rub: { c: 0, r: 0, s: 0 }, text: "" };
}
/** @param {string} id @param {import("../reviewing.js").Draft | null} d */
function saveDraft(id, d) {
  try { if (d) localStorage.setItem(DRAFT(id), JSON.stringify(d)); else localStorage.removeItem(DRAFT(id)); } catch (e) {}
}
const hasDraft = (/** @type {string} */ id) => { const d = loadDraft(id); return !!(d.text.trim() || d.rub.c || d.rub.r || d.rub.s); };

/** JS or Go, in the track's colours. @param {{ lang: string }} props */
const LangBadge = ({ lang }) => html`<span class=${"lang-b track-" + lang} aria-label=${old.LANGN[lang]}>${lang === "js" ? "JS" : "Go"}</span>`;

/* ======================= the list ======================= */

export function ReviewsScreen() {
  const me = state.me.value;
  const msg = flash.value;
  useEffect(() => { if (msg) { const k = setTimeout(() => { flash.value = ""; }, 8000); return () => clearTimeout(k); } }, [msg]);
  if (!me) return html`<${SignInNeeded} message=${t("sign_in_to_review_other_learners")} />`;
  const p = me.reviewer;
  const queue = state.queue.value.slice().sort((a, b) => Date.parse(a.dueAt || a.at) - Date.parse(b.dueAt || b.at));

  return html`
    <p class="eyebrow">${t("reviews")}</p>
    <h1 class="pg-h">${t("review_code_earn_reputation")}</h1>
    <p class="lede">${t("reviews_lede")}</p>
    ${msg && html`<div class="rv-flash" role="status"><span class="rv-flash-ic" aria-hidden="true">✓</span><span>${msg}</span>
      <button class="linkish" onClick=${() => { flash.value = ""; }}>${t("close")}</button></div>`}
    <div class="grid2" style="margin-top:22px">
      <div>
        <div class="rv-sec-h"><h2 class="h2">${t("waiting_for_you")}</h2>${queue.length > 0 && html`<span class="count-chip">${queue.length}</span>`}</div>
        ${queue.length
          ? html`<div class="rq-list">${queue.map((s) => html`<${QueueCard} key=${s.id} s=${s} />`)}</div>`
          : html`<div class="rv-empty"><span class="rv-empty-ic" aria-hidden="true">✓</span><div>
              <b>${t("all_caught_up")}</b><p>${t("nothing_waiting_for_you_solve_more")}</p>
              <button class="btn" onClick=${() => go("challenges")}>${t("go_to_challenges")}</button></div></div>`}
        <${PastReviews} given=${state.given.value} />
        ${p.levelIndex >= 3 && html`<${SecondOpinions} flagged=${state.flagged.value} />`}
      </div>
      <aside class="side">
        <${ReviewerCard} p=${p} />
        <${HowReputation} />
      </aside>
    </div>`;
}

/** @param {{ s: any }} props */
function QueueCard({ s }) {
  const u = unitOf(s);
  const ms = s.dueAt ? Date.parse(s.dueAt) - now.value : Infinity;
  const tone = ms <= 6 * 36e5 ? "hot" : ms <= 864e5 ? "warn" : "";
  const open = () => go("review", { qid: s.id });
  return html`<article class=${"q-row rq-card " + tone}>
    <${LangBadge} lang=${u.lang} />
    <div class="rq-main">
      <h3 class="rq-t">${u.title}</h3>
      <p class="rq-sub">${u.sub} · ${t("assigned_ago", { when: ago(Date.parse(s.assignedAt || s.at), now.value) })}</p>
      <${Clock} dueAt=${s.dueAt} />
    </div>
    <button class="btn primary rq-go" data-act="review" data-id=${s.id} onClick=${open}>
      ${hasDraft(s.id) ? t("continue_review") : t("start_review")} <span aria-hidden="true">→</span></button>
  </article>`;
}

/** @param {{ given: any[] }} props */
function PastReviews({ given }) {
  const list = given.slice().reverse();
  const rated = list.filter((g) => g.rating);
  const avg = rated.length ? rated.reduce((a, g) => a + g.rating, 0) / rated.length : 0;
  return html`
    <div class="rv-sec-h"><h2 class="h2">${t("ratings_your_reviews_got")}</h2>
      ${rated.length > 0 && html`<span class="muted rv-avg">${t("avg_rating", { avg: avg.toFixed(1), n: rated.length })}</span>`}</div>
    <div class="panel"><div class="pad">
      ${list.length ? html`<ul class="past">${list.map((g) => {
        const pts = g.rating ? PTS[g.rating] : 0;
        return html`<li key=${g.id} class="act">
          <div class="past-main"><b>${unitTitle(g.moduleId || g.exerciseId)}</b>
            <span class="past-text">${g.review.text.length > 140 ? g.review.text.slice(0, 140) + "…" : g.review.text}</span></div>
          ${g.rating
            ? html`<span class="past-r"><span class="starsv" aria-label=${t("n_stars", { n: g.rating })}>${stars(g.rating)}</span>
                <span class=${"pts-chip " + (pts > 0 ? "up" : "down")}>${pts > 0 ? "+" : "−"}${t("pts_n", { n: Math.abs(pts) })}</span></span>`
            : html`<span class="st wait">${t("waiting_for_rating")}</span>`}
        </li>`;
      })}</ul>` : html`<p class="muted" style="margin:0">${t("no_reviews_yet")}</p>`}
    </div></div>`;
}

/** @param {{ p: any }} props */
function ReviewerCard({ p }) {
  const { next, pct, toNext } = ladder(p);
  return html`<section class="panel prof"><h2>${t("your_reviewer_profile")}</h2><div class="pad">
    <div class="prof-top"><div>
      <div class="big">${p.score.toFixed(2)}<small> ${t("score")}</small></div>
      <div class="muted" style="font-size:13px">${t("rated_reviews_n", { n: p.ratings })}</div></div>
      <span class=${"lvl lvl" + p.levelIndex}>${tText(p.level)}</span></div>
    <ol class="ladder" aria-label=${t("level")}>
      ${LEVELS.map((l, i) => html`<li key=${l.n} class=${i < p.levelIndex ? "done" : i === p.levelIndex ? "cur" : ""}>
        <span class="ld-dot" aria-hidden="true"></span><span class="ld-n">${tText(l.n)}</span><span class="ld-min mono">${l.min}</span></li>`)}
    </ol>
    <div class="rep-row"><span class="mono">${t("pts_n", { n: p.reputation })}</span>
      <span class="muted">${next ? t("pts_to_level", { n: toNext, level: tText(next.n) }) : t("top_level")}</span></div>
    <div class="bar"><i style=${{ width: pct + "%" }}></i></div>
    ${p.probation && html`<p class="err" style="margin-top:10px">${t("on_probation_no_new_reviews_until")}</p>`}
  </div></section>`;
}

function HowReputation() {
  return html`<details class="panel how"><summary>${t("how_scores_and_reputation_work")}</summary><div class="pad">
    <p>${t("how_score")}</p><p class="formula mono">(5 × 3.5 + Σ★) ÷ (5 + n)</p>
    <p>${t("how_points")}</p><p>${t("how_levels")}</p><p>${t("n4_or_more_ratings_with_a")}</p>
  </div></details>`;
}

/** Mentors: reviews rated ★1, each with the code, and a box for a second opinion. @param {{ flagged: any[] }} props */
function SecondOpinions({ flagged }) {
  return html`<h2 class="h2">${t("second_opinions_mentors")}</h2>
    ${flagged.length ? html`<div class="queue">${flagged.map((s) => html`<${SecondOpinion} key=${s.id} s=${s} />`)}</div>`
      : html`<p class="muted">${t("no_flagged_reviews")}</p>`}`;
}
/** @param {{ s: any }} props */
function SecondOpinion({ s }) {
  const u = unitOf(s);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  /** @param {SubmitEvent} e */
  const send = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try { await api("POST", `/api/submissions/${s.id}/second-opinion`, { text }); await refresh(); }
    catch (err) { setError(/** @type {Error} */ (err).message); setBusy(false); }
  };
  return html`<div class="panel"><div class="pad">
    <b>${u.title}</b> <span class="muted">· ${t("review_rated_1")}</span>
    <blockquote class="so-quote">${s.review.text}</blockquote>
    ${u.items.map((i) => html`<p class="lbl-sm" style="margin:10px 0 4px">${tText(i.ex.title)}</p><${CodeBlock} code=${i.code || ""} />`)}
    <form class="form" data-form="second" data-id=${s.id} style="margin-top:10px" onSubmit=${send}>
      <label class="lbl-sm" for=${"so-" + s.id}>${t("your_second_opinion")}</label>
      <textarea id=${"so-" + s.id} rows="3" value=${text} onInput=${(/** @type {any} */ e) => setText(e.currentTarget.value)}></textarea>
      ${error && html`<p class="err" role="alert">${error}</p>`}
      <button class="btn small" type="submit" disabled=${busy || text.trim().length < MIN_CHARS}>${t("send")}</button>
    </form></div></div>`;
}

/* ======================= writing one review ======================= */

/** A task's text, with `code` in backticks shown as code. @param {{ text: string }} props */
const Prompt = ({ text }) => html`${text.split(/`([^`]+)`/).map((part, i) => i % 2 ? html`<code>${part}</code>` : part)}`;

/** @param {{ route: Route }} props */
export function ReviewScreen({ route }) {
  const me = state.me.value;
  const id = route.qid || "";
  const s = state.queue.value.find((x) => x.id === id);
  const [draft, setDraft] = useState(() => loadDraft(id));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setDraft(loadDraft(id)); setError(""); }, [id]);

  if (!me) return html`<${SignInNeeded} message=${t("sign_in_to_review_other_learners")} />`;
  const back = html`<button class="back" data-act="view" data-v="reviews" onClick=${() => go("reviews")}><span aria-hidden="true">←</span> ${t("back_to_reviews")}</button>`;
  if (!s) return html`${back}<div class="rv-empty" style="margin-top:16px"><span class="rv-empty-ic" aria-hidden="true">?</span><div>
    <b>${t("review_not_assigned")}</b><p>${t("review_not_assigned_text")}</p></div></div>`;

  const u = unitOf(s);
  /** @param {import("../reviewing.js").Draft} d */
  const update = (d) => { setDraft(d); saveDraft(id, d); };
  const len = draft.text.trim().length;
  const send = async () => {
    if (!canSend(draft) || busy) return;
    setBusy(true); setError("");
    try {
      await api("POST", `/api/submissions/${id}/review`, {
        rubric: Object.fromEntries(RUBRIC.map((r) => [r.api, draft.rub[r.key]])), text: draft.text,
      });
      saveDraft(id, null);
      flash.value = t("review_sent_flash");
      await refresh();
      go("reviews");
    } catch (e) { setError(/** @type {Error} */ (e).message); setBusy(false); }
  };

  return html`
    ${back}
    <p class="eyebrow">${old.LANGN[u.lang]} · ${u.sub}</p>
    <h1 class="pg-h">${t("review_title", { title: u.title })}</h1>
    <div class="rv-meta">
      <div class="rv-due"><span class="muted">${t("due")}</span><${Clock} dueAt=${s.dueAt} /><span class="muted">${t("the_author_can_see_this_clock")}</span></div>
      <span class=${"chip " + (s.tests.passed === s.tests.total ? "ok" : "bad")}>✓ ${t("tests_passed_n", { passed: s.tests.passed, total: s.tests.total })}</span>
      <span class="chip">🔒 ${t("author_hidden")}</span>
    </div>
    <div class="rv-layout">
      <div class="rv-code-col">
        ${u.items.length > 1 && html`<nav class="rv-jump" aria-label=${t("tasks")}>${u.items.map((i, n) => html`
          <a href=${"#rv-c-" + n} onClick=${(/** @type {any} */ e) => { e.preventDefault(); document.getElementById("rv-c-" + n)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
            <span class="mono">${n + 1}</span> ${tText(i.ex.title)}</a>`)}
          <a href="#rvForm" class="to-form" onClick=${(/** @type {any} */ e) => { e.preventDefault(); document.getElementById("rvForm")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>✎ ${t("your_review")}</a></nav>`}
        ${u.items.map((i, n) => html`<section class="panel rv-code" id=${"rv-c-" + n} key=${i.ex.id}>
          <div class="rv-code-h"><h2><span class="rv-n mono">${n + 1}</span>${tText(i.ex.title)}</h2>
            <span class="muted mono rv-file">${solutionFile(i.ex)}</span>
            ${i.total != null && html`<span class=${"chip sm " + (i.passed === i.total ? "ok" : "bad")}>${i.passed}/${i.total}</span>`}</div>
          <details class="rv-task"><summary>${t("task")}</summary><div class="prompt"><${Prompt} text=${tText(i.ex.prompt)} /></div></details>
          <${CodeBlock} code=${i.code || ""} />
        </section>`)}
      </div>
      <aside class="rv-form-col">
        <section class="panel rv-form-card" id="rvForm"><h2>${t("your_review")}</h2><div class="pad rv-form" id="rvBox">
          ${RUBRIC.map((r) => html`<div class="rub-row" key=${r.key}>
            <div><b>${t(r.label)}</b><small>${t(r.hint)}</small></div>
            <div class="seg" role="group" aria-label=${t(r.label)}>${MARKS.map((m, i) => html`
              <button type="button" data-act="rub" data-k=${r.key} data-v=${i + 1} class=${"m" + (i + 1)} aria-pressed=${String(draft.rub[r.key] === i + 1)}
                onClick=${() => update({ ...draft, rub: { ...draft.rub, [r.key]: i + 1 } })}>${t(m)}</button>`)}</div>
          </div>`)}
          <label for="rvText" class="lbl-sm">${t("your_comment")}</label>
          <ul class="rv-tips"><li>${t("tip_name")}</li><li>${t("tip_works")}</li><li>${t("tip_change")}</li></ul>
          <textarea id="rvText" rows="5" maxlength="4000" placeholder=${t("name_the_challenge_and_line_say")} value=${draft.text}
            onInput=${(/** @type {any} */ e) => update({ ...draft, text: e.currentTarget.value })}></textarea>
          <div class="rv-len" aria-live="polite">
            <span class="rv-len-bar" aria-hidden="true"><i style=${{ width: Math.min(100, len / MIN_CHARS * 100) + "%" }} class=${len >= MIN_CHARS ? "ok" : ""}></i></span>
            <span id="rvCount" class="muted mono">${len >= MIN_CHARS ? t("long_enough") : t("chars_more", { n: MIN_CHARS - len })}</span>
          </div>
          ${error && html`<p class="err" role="alert">${error}</p>`}
          <button class="btn primary rv-send" data-act="sendreview" id="rvSend" disabled=${!canSend(draft) || busy} onClick=${send}>
            ${busy ? t("sending") : t("send_review")}</button>
          <p class="muted rv-draft-note">${t("draft_saved")}</p>
        </div></section>
      </aside>
    </div>`;
}
