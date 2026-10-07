// @ts-check
// A challenge (/challenges/js/basic/vars): the task, the starting code and the tests. Signed in,
// the learner sees the four steps to submit from GitHub, presses Run the tests (the grader runs
// what is committed on main and the results play in the test list), and follows their module:
// its progress, submitting it, who reviews it, the review and rating it.
import { html } from "htm/preact";
import { useState, useEffect, useRef } from "preact/hooks";
import { go, openEx, modNum, old, prefs, savePrefs, copyBtn } from "../legacy.js";
import { t, tText } from "../i18n.js";
import { api } from "../api.js";
import { state, refresh } from "../state.js";
import { Avatar, PersonLink } from "../components/people.js";
import { Clock, now } from "../components/clock.js";
import { CodeBlock } from "../components/code.js";
import { celebrate } from "../components/hooray.js";
import { StartSteps, SignInLink } from "../components/start.js";
import { MARKS, PTS, solutionFile, stars } from "../reviewing.js";
import { exercise, solved, moduleState } from "../progress.js";

/** @typedef {import("../legacy.js").Module} Module */
/** @typedef {{ status: "" | "run" | "pass" | "fail", msg: string }} Row */
/** @typedef {{ rows: Record<string, Row>, sum: string, tone: "" | "ok" | "bad" }} Run */

const pause = (/** @type {number} */ ms) => new Promise((r) => setTimeout(r, ms));
const calm = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
/** The last run of each challenge in this tab, so its results survive leaving and coming back. @type {Map<string, Run>} */
const lastRuns = new Map();
/** The latest pushed result and saved code of each challenge, from the API. @type {Map<string, any>} */
const latest = new Map();
/** Nudges sent in this tab, by submission id. @type {Set<string>} */
const nudged = new Set();
/** How the ratings the learner gave changed their reviewer's score, by submission id. @type {Map<string, any>} */
const deltas = new Map();

/** JS: the named tests. Go: the Test functions in the test file.
 * @param {any} ex @returns {{ name: string, label: string, code: string }[]} */
function testNames(ex) {
  if (ex.lang === "js") return ex.tests.map((/** @type {any} */ x) => ({ name: x.n, label: x.n, code: x.t }));
  return [...new Set([...(ex.test || "").matchAll(/func (Test\w+)\(/g)].map((x) => x[1]))]
    .map((n) => ({ name: n, label: n.replace(/^Test/, "").replace(/([a-z])([A-Z])/g, "$1 $2"), code: "" }));
}
/** A task's text, with `code` in backticks shown as code. @param {{ text: string }} props */
const Prompt = ({ text }) => html`${text.split(/`([^`]+)`/).map((part, i) => i % 2 ? html`<code>${part}</code>` : part)}`;

/** @param {{ route: Route }} props */
export function ChallengeScreen({ route }) {
  const ex = exercise(route.ex || "");
  const me = state.me.value;
  const [, setTick] = useState(0);
  const redraw = () => setTick((n) => n + 1);
  const [run, setRun] = useState(/** @type {Run | null} */ (null));
  const [running, setRunning] = useState(false);
  const runRef = useRef(/** @type {Run | null} */ (null));

  // Opening a challenge marks it started; fetch the latest pushed result.
  useEffect(() => {
    if (!ex) return;
    const S = prefs();
    if (!(S.opened || {})[ex.id]) { S.opened = { ...(S.opened || {}), [ex.id]: 1 }; savePrefs(); redraw(); }
    setRun(lastRuns.get(ex.id) || null);
    if (!me) return;
    let live = true;
    Promise.all([api("GET", "/api/results/" + encodeURIComponent(ex.id)), api("GET", "/api/passes/" + encodeURIComponent(ex.id))])
      .then(([r, p]) => { latest.set(ex.id, { result: r.result, code: p.code, at: p.at }); if (live) redraw(); })
      .catch(() => {});
    return () => { live = false; };
  }, [ex?.id, !!me]);

  if (!ex) return html`<p class="muted">${t("no_challenges_match_these_filters")}</p>`;
  const m = old.MODULES.find((x) => x.exercises.includes(ex.id));
  const d = old.diffOf(ex);
  const names = testNames(ex);
  const isSolved = solved(ex.id);
  const lt = latest.get(ex.id) || {};
  const canRun = !!(me && me.repo);

  /** Shows a run as it plays. @param {Run} r */
  const show = (r) => { runRef.current = r; lastRuns.set(ex.id, r); setRun({ ...r, rows: { ...r.rows } }); };
  const runTests = async () => {
    if (running) return;
    setRunning(true);
    const firstTime = !isSolved;
    document.getElementById("testSec")?.scrollIntoView({ block: "start", behavior: calm() ? "auto" : "smooth" });
    /** @type {Run} */
    const r = { rows: Object.fromEntries(names.map((n) => [n.name, { status: "run", msg: "" }])), sum: t("getting_your_code_from_github"), tone: "" };
    show(r);
    const started = Date.now();
    let res, err;
    try { res = await api("POST", "/api/check/" + encodeURIComponent(ex.id)); } catch (e) { err = /** @type {Error} */ (e).message; }
    await pause(Math.max(0, 700 - (Date.now() - started))); // let the spinners be seen
    if (err || !res) {
      for (const n of names) r.rows[n.name] = { status: "", msg: "" };
      r.sum = err || ""; r.tone = "bad"; show(r);
    } else {
      r.sum = t("checking_commit", { commit: res.commit }); show(r);
      for (const n of names) {
        const got = res.tests.filter((/** @type {any} */ x) => x.name === n.name || x.name.startsWith(n.name + "/"));
        const ok = got.length > 0 && got.every((/** @type {any} */ x) => x.pass);
        await pause(calm() ? 0 : 260);
        const bad = got.find((/** @type {any} */ x) => !x.pass);
        r.rows[n.name] = { status: ok ? "pass" : "fail", msg: ok ? "" : bad ? bad.message : got.length ? "" : (res.error || t("did_not_run")) };
        show(r);
      }
      await pause(200);
      r.sum = res.passed ? t("all_n_passed_check", { n: res.total }) : t("n_of_total_passed", { n: res.passedCount, total: res.total });
      r.tone = res.passed ? "ok" : "bad"; show(r);
      latest.set(ex.id, { ...lt, result: { passed: res.passed, passedCount: res.passedCount, total: res.total } });
      await refresh(); // progress, the module and points catch up
      if (firstTime && res.passed && state.saved.value.has(ex.id)) celebrate(ex.id);
    }
    setRunning(false);
  };

  // The summary next to the Run button: this run, or else where the challenge stands.
  const nextInModule = m && m.exercises.find((id) => !solved(id));
  const summary = run && run.sum && !(isSolved && run.tone === "ok") ? { text: run.sum, tone: run.tone }
    : !me ? null
    : isSolved ? { text: t("solved_check"), tone: "ok" }
    : lt.result && !lt.result.passed ? { text: t("last_run_n_of", { n: lt.result.passedCount, total: lt.result.total }), tone: "" }
    : { text: "", tone: "" };

  return html`
    <button class="back" data-act="track" data-v=${ex.lang} onClick=${() => { prefs().track = ex.lang; savePrefs(); go("track", { level: null }); }}>${t("back_to_track", { lang: old.LANGN[ex.lang] })}</button>
    <header class=${"ch-hero track-" + ex.lang}>
      <p class="ch-crumb mono"><span class=${"lang-b sm track-" + ex.lang}>${ex.lang === "js" ? "JS" : "Go"}</span>
        ${m && html`<b>${t("module_n", { n: modNum(m) })}</b><span class="sl">/</span><span>${(tText(m.title).split(/[:፦]/).pop() || "").trim()}</span><span class="sl">/</span>`}
        <b class="gold">${tText(ex.topic)}</b></p>
      <h1 class="ch-title">${tText(ex.title)}</h1>
      <p class="ch-meta"><span class=${"diff " + d.toLowerCase()}>${t(/** @type {any} */ (d.toLowerCase()))}</span>
        <span class="pts-tag">+${t("pts_n", { n: old.ptsOf(ex) })}</span>
        ${me && html`<span class=${"st " + (isSolved ? "pass" : state.solved.value.has(ex.id) ? "try" : "new")}>${isSolved ? t("solved") : t("not_solved")}</span>`}</p>
      ${me && (canRun ? html`<${Steps} ex=${ex} lt=${lt} isSolved=${isSolved} run=${run} />` : html`<${NoRepo} />`)}
    </header>
    <div class="ch-grid">
      <article class="ch-main">
        <section class="panel ch-sec"><h2>${t("task")}</h2><div class="pad prompt task-prompt"><${Prompt} text=${tText(ex.prompt)} /></div></section>
        <section class="panel ch-sec"><h2>${t("starting_point")} <span class="muted mono">${solutionFile(ex)}</span></h2><${CodeBlock} code=${ex.starter} /></section>
        <section class=${"panel ch-sec ch-tests" + (run?.tone === "ok" ? " celebrate" : "")} id="testSec">
          <div class="t-head"><h2>${t("tests")} <span class="muted">${ex.lang === "js" ? t("what_your_code_must_do") : html`${t("run_with")} <code>go test -race</code>`}</span></h2>
            ${summary && html`<span class=${"t-sum " + summary.tone} id="tSum" aria-live="polite">${summary.text}${isSolved && !(run && run.sum && run.tone !== "ok") && nextInModule && html` · <button class="linkish" data-act="open" data-id=${nextInModule} onClick=${() => openEx(nextInModule)}>${t("next_challenge")}</button>`}</span>`}</div>
          <ol class="task-tests" id="testList">${names.map((n) => {
            const row = run?.rows[n.name] || { status: "", msg: "" };
            return html`<li key=${n.name} class=${"t-row" + (row.status ? " " + row.status : "")} data-name=${n.name}>
              <span class="t-ic" aria-hidden="true"></span>
              <div><b>${n.label}</b>${n.code && html`<code>${n.code}</code>`}${row.msg && html`<div class="t-msg mono">${row.msg}</div>`}</div></li>`;
          })}</ol>
          ${ex.lang === "go" && html`<details class="gofile"><summary>${ex.id.replace(/-/g, "_")}_test.go</summary><${CodeBlock} code=${ex.test} /></details>`}
          ${canRun && html`<div class="run-dock">
            <button class="btn primary run-btn" data-act="check" data-id=${ex.id} disabled=${running} onClick=${runTests}>
              ${running ? html`<span class="spinner" aria-hidden="true"></span>${t("running")}` : t("run_the_tests")}</button>
            <span class="run-hint muted">${t("runs_what_is_on_main")}</span></div>`}
          ${isSolved && lt.code && html`<details class="gh-local"><summary>${t("your_saved_solution")}</summary><${CodeBlock} code=${lt.code} /></details>`}
        </section>
        ${!me && html`<section class="panel ch-sec task-start"><h2>${t("submit_your_solution")}</h2><div class="pad">
          <p class="task-start-lede">${t("you_need_a_github_account_to")}</p>
          <${StartSteps} />
          <div style="margin-top:14px"><${SignInLink} /></div></div></section>`}
      </article>
      <aside class="ch-side">${m && html`<${ModulePanel} m=${m} ex=${ex} redraw=${redraw} />`}</aside>
    </div>`;
}

/** The four steps to submit from GitHub, as a strip that shows how far along this challenge is.
 * @param {{ ex: any, lt: any, isSolved: boolean, run: Run | null }} props */
function Steps({ ex, lt, isSolved, run }) {
  const me = state.me.value, repo = me.repo, file = solutionFile(ex);
  const tried = !!(lt.result || run?.tone);
  const at = isSolved ? 4 : tried ? 3 : 0; // index of the current step; 4 = all done
  const cls = (/** @type {number} */ i) => "gs" + (i < at ? " done" : i === at ? " cur" : "");
  return html`<section id="pushPanel" class="gh-strip" aria-label=${t("how_to_submit")}>
    <div class="gs-h"><b>${isSolved ? t("submit_a_new_version") : t("how_to_submit")}</b>
      <details class="gh-local"><summary>${t("prefer_your_own_computer")}</summary>
        <pre class="shell mono" id="pushCmd">git clone https://github.com/${repo}.git
cd ${repo.split("/")[1] || "your-repo"}
# edit ${file}
git add ${file}
git commit -m "${ex.title}"
git push
# ${t("then_press_run")}</pre>
        <button class="btn small" data-act="copy" data-id="pushCmd" onClick=${(/** @type {any} */ e) => copyBtn(e.currentTarget, "pushCmd")}>${t("copy")}</button></details></div>
    <ol class="gh-steps">
      <li class=${cls(0)}><span class="gs-n">1</span><div><a class="btn small primary" href=${`https://github.com/${repo}/edit/main/${file}`} target="_blank" rel="noopener">${t("open_file_on_github", { file: ex.lang === "js" ? "solution.js" : "solution.go" })}</a>
        <span>${t("it_opens_the_file_in_your")}</span></div></li>
      <li class=${cls(1)}><span class="gs-n">2</span><div><b>${t("write_your_solution")}</b><span>${t("replace_the_starter_code_with_your")}</span></div></li>
      <li class=${cls(2)}><span class="gs-n">3</span><div><b>${t("click_commit_changes")}</b><span>${t("keep_commit_directly_to_the_main")}</span></div></li>
      <li class=${cls(3)}><span class="gs-n">4</span><div><b>${t("run_the_tests").replace(/^▶\s*/, "")}</b><span>${isSolved ? t("solved_check") : t("come_back_here_and_run_the")}</span></div></li>
    </ol>
    <p class="gh-first">${t("first_time_accept_the_invitation_github")}</p>
  </section>`;
}

/** Sign-in could not create the learner's repository: say so, and let them try again. */
function NoRepo() {
  const me = state.me.value;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const setup = async () => { setBusy(true); setError(""); try { await api("POST", "/api/me/repo"); await refresh(); } catch (e) { setError(/** @type {Error} */ (e).message); } setBusy(false); };
  const err = error || me.repoError;
  return html`<div class="st-card warn"><span class="st-ic" aria-hidden="true">!</span><div><b>${t("your_repository_isnt_ready_yet")}</b>
    <p>${t("you_need_your_own_repository_in")}</p>
    <ol class="fix-list"><li>${t("check_your_email_for_an_invitation")}</li><li>${t("then_press_the_button")}</li></ol>
    <button class="btn small primary" data-act="setup-repo" disabled=${busy} onClick=${setup}>${busy ? t("setting_up") : t("set_up_my_repository")}</button>
    ${err && html`<p class="mono err-detail">${err}</p>`}<p class="muted" style="font-size:12px">${t("still_stuck_send_the_message_above")}</p></div></div>`;
}

/* ---------- the module: progress, submitting, who reviews it, the review and the rating ---------- */

/** @param {{ m: Module, ex: any, redraw: () => void }} props */
function ModulePanel({ m, ex, redraw }) {
  const me = state.me.value;
  const ms = moduleState(m);
  const S = prefs();
  // green = solved, yellow = started (opened, or tried), grey = not started
  const st = (/** @type {string} */ id) => (me ? state.solved.value.has(id) : false) ? "done"
    : (S.opened || {})[id] || state.solved.value.has(id) || latest.get(id)?.result ? "started" : "not";
  const label = { done: t("solved"), started: t("started"), not: t("not_started") };
  return html`<section class="panel pr" id="prPanel"><h2>${t("module_review")}</h2><div class="pad">
    <p class="eyebrow" style="margin:0 0 4px">${t("module_n", { n: modNum(m) })} · ${t("n_passed", { n: ms.passed, total: ms.total })}</p>
    <b>${tText(m.title)}</b>
    <div class="mod-prog-bar" aria-hidden="true"><i style=${{ width: Math.round(ms.passed / ms.total * 100) + "%" }}></i></div>
    <ul class="mod-list">${m.exercises.map((id) => {
      const s = st(id), e = exercise(id);
      return html`<li key=${id} class=${s + (id === ex.id ? " cur" : "")}><span class="ms-dot" role="img" aria-label=${label[s]}></span>
        ${id === ex.id ? html`<b>${tText(e.title)}</b>` : html`<button class="linkish" data-act="open" data-id=${id} onClick=${() => openEx(id)}>${tText(e.title)}</button>`}</li>`;
    })}</ul>
    <div class="mod-foot"><${ModuleFoot} m=${m} ms=${ms} redraw=${redraw} /></div>
    ${ms.sub?.review && html`<div class="stages"><${ReviewBlock} sub=${ms.sub} /></div>`}
  </div></section>`;
}

/** @param {{ m: Module, ms: import("../progress.js").ModuleState, redraw: () => void }} props */
function ModuleFoot({ m, ms, redraw }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sub = ms.sub;
  const submit = async () => { setBusy(true); setError(""); try { await api("POST", `/api/modules/${m.id}/submit`); await refresh(); } catch (e) { setError(/** @type {Error} */ (e).message); } setBusy(false); };
  const err = error && html`<span class="err" role="alert" style="flex-basis:100%;margin:0">${error}</span>`;
  const submitBtn = (/** @type {string} */ label, /** @type {string} */ cls) => html`<button class=${"btn small " + cls} data-act="submit-module" data-id=${m.id} disabled=${busy} onClick=${submit}>${busy ? t("submitting") : label}</button>`;
  if (ms.guest) return html`<span class="muted">${t("every_passed_challenge_counts_sign_in")}</span>`;
  if (sub?.status === "awaiting_review" && sub.reviewer && sub.dueAt) return html`<span class="st wait">${t("in_review")}</span><${InReview} sub=${sub} redraw=${redraw} />`;
  if (sub?.status === "rated") return html`<span class="st done">${t("reviewed_stars", { n: sub.rating })}</span>${ms.passed === ms.total && submitBtn(t("submit_again_for_a_new_review"), "")}${err}`;
  if (sub?.status === "reviewed") return html`<span class="st act">${t("review_received")}</span><span class="muted">${t("rate_it_below")}</span>`;
  if (sub) return html`<span class="st wait">${t("in_review")}</span><span class="muted">${sub.status === "waiting_for_reviewer" ? t("waiting_for_someone_who_finished_this") : t("a_reviewer_is_reading_your_solutions")}</span>`;
  if (ms.resave.length) return html`<span class="muted">${t("push_lead")} ${ms.resave.map((id, i) => html`${i ? ", " : ""}<button class="linkish" data-act="open" data-id=${id} onClick=${() => openEx(id)}>${tText(exercise(id).title)}</button>`)} ${t("from_your_github_repository_to_submit")}</span>${err}`;
  if (ms.ready) return html`<span class="okc">${t("all_n_passed", { n: ms.total })}</span>${submitBtn(t("submit_module_for_review"), "primary")}${err}`;
  return html`<span class="muted">${t("push_all_to_submit", { n: ms.total })}</span>`;
}

/** While a module is in review: who reviews it, the time left, and a nudge.
 * @param {{ sub: any, redraw: () => void }} props */
function InReview({ sub, redraw }) {
  const r = sub.reviewer;
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const wait = sub.nudgeAfter ? Date.parse(sub.nudgeAfter) - Math.max(now.value, Date.now()) : 0, hrs = Math.ceil(wait / 36e5);
  const nudge = async () => {
    setSending(true); setError("");
    try { const res = await api("POST", `/api/submissions/${sub.id}/nudge`); sub.nudgeAfter = res.nudgeAfter; nudged.add(sub.id); }
    catch (e) { setError(/** @type {Error} */ (e).message); }
    setSending(false); redraw();
  };
  return html`<div class="in-review">
    ${error && html`<p class="err" role="alert">${error}</p>`}
    <div class="ir-who"><${Avatar} login=${r.login} size="sm" /><span>${t("reviewed_by")} <${PersonLink} login=${r.login} /> <span class=${"lvl lvl" + (r.levelIndex || 0) + " sm"}>${tText(r.level)}</span></span></div>
    <${Clock} dueAt=${sub.dueAt} />
    <div class="ir-foot">${wait > 0
      ? html`<button class="btn small" disabled title=${t("nudge_again_in", { n: hrs })}>${t("nudged_again_in", { n: hrs })}</button>`
      : html`<button class="btn small" data-act="nudge" data-id=${sub.id} disabled=${sending} onClick=${nudge}>${sending ? t("sending") : t("nudge_user", { login: r.login })}</button>`}
      <span class="muted">${nudged.has(sub.id) ? t("nudge_sent", { login: r.login }) : t("reviews_are_due_within_72_hours")}</span></div>
  </div>`;
}

/** The review of the learner's module, and rating it. @param {{ sub: any }} props */
function ReviewBlock({ sub }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const rate = async (/** @type {number} */ n) => {
    setBusy(true); setError("");
    try { const r = await api("POST", `/api/submissions/${sub.id}/rating`, { stars: n }); deltas.set(sub.id, r); await refresh(); }
    catch (e) { setError(/** @type {Error} */ (e).message); }
    setBusy(false);
  };
  const rub = sub.review.rubric || {};
  const d = deltas.get(sub.id);
  return html`
    <div class="review"><div class="rv-h"><b>${t("the_review")}</b><span class="rub">
      ${[["correctness", "correctness"], ["readability", "readability"], ["style", "style"]].map(([k, label]) => html`<span key=${k}>${t(/** @type {any} */ (label))}: <b>${rub[k] ? t(MARKS[rub[k] - 1]) : "–"}</b></span>`)}</span></div>
      <p>${sub.review.text}</p></div>
    ${error && html`<p class="err" role="alert">${error}</p>`}
    ${sub.status === "reviewed"
      ? html`<div class="rate"><b>${t("how_helpful_was_this_review")}</b>
          <div class="stars-in" role="group" aria-label=${t("rate_the_review")}>${[1, 2, 3, 4, 5].map((n) => html`<button key=${n} data-act="rate" data-s=${n} data-sub=${sub.id} disabled=${busy}
            aria-label=${t("n_stars", { n })} onClick=${() => rate(n)}>★</button>`)}</div>
          <span class="muted" style="font-size:12.5px">${t("n1_not_helpful_5_specific_and")}</span></div>`
      : html`<div class="stage-box"><b>${t("you_rated_it")}</b><span class="starsv">${stars(sub.rating || 0)}</span></div>
          ${d && html`<div class="stage-box"><b>${t("their_review_score")}</b><span class="mono">${d.before.score.toFixed(2)} → <b>${d.after.score.toFixed(2)}</b></span></div>
            <div class="stage-box"><b>${t("their_reputation")}</b><span class="mono">${d.before.reputation} → <b>${d.after.reputation}</b> ${t("points")}</span>
              <span class=${"lvl lvl" + d.after.levelIndex + " sm"}>${tText(d.after.level)}</span></div>`}
          ${sub.secondOpinion && html`<div class="review"><div class="rv-h"><b>${t("a_mentors_second_opinion")}</b></div><p>${sub.secondOpinion.text}</p></div>`}`}`;
}
