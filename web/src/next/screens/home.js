// @ts-check
// "Challenges": the two language tracks with what to do next (home), and each track's modules
// and challenges (/challenges/js, /challenges/go, optionally /basic or /advanced).
import { html } from "htm/preact";
import { useState, useReducer } from "preact/hooks";
import { go, openEx, modNum, old, prefs, savePrefs } from "../legacy.js";
import { t, tText } from "../i18n.js";
import { api } from "../api.js";
import { state, refresh } from "../state.js";
import { Avatar, PersonLink } from "../components/people.js";
import { Clock } from "../components/clock.js";
import { StartSteps, SignInLink } from "../components/start.js";
import { exercise, solved, moduleState, currentModule, nextChallenge, maxPoints } from "../progress.js";

/** @typedef {import("../legacy.js").Module} Module */
/** @typedef {import("../progress.js").ModuleState} ModuleState */

const modTitle = (/** @type {Module} */ m) => t("module_title", { n: modNum(m), title: tText(m.title) });
const exercisesOf = (/** @type {string} */ lang) => old.BANK.filter((e) => e.lang === lang);

/** Submits a finished module for review. @param {string} id */
async function submitModule(id) { await api("POST", `/api/modules/${id}/submit`); await refresh(); }

/* ======================= home ======================= */

export function HomeScreen() {
  const me = state.me.value;
  return html`
    <h1 class="sr-only">${t("choose_a_track")}</h1>
    ${me && html`<${UpNext} me=${me} />`}
    <div class="tracks">${["js", "go"].map((k) => html`<${TrackCard} key=${k} k=${k} />`)}</div>
    <div class="home-side">
      ${me ? html`<${ProgressCard} me=${me} />` : html`<${StartCard} />`}
      ${me && html`<${CircleMini} />`}
      <${HowModules} />
    </div>`;
}

/** The first sentence of a task, with `code` shown as code. @param {{ text: string }} props */
function Lead({ text }) {
  const first = (text.match(/^.*?[.!?።](\s|$)/) || [text])[0].trim();
  return html`${first.split(/`([^`]+)`/).map((part, i) => i % 2 ? html`<code>${part}</code>` : part)}`;
}

/** A slim line of facts about the learner, in the mono "terminal" style of the hero. @param {{ me: any }} props */
function StatusStrip({ me }) {
  const k = prefs().track === "go" ? "go" : "js";
  const all = exercisesOf(k), done = all.filter((e) => solved(e.id)).length;
  const due = state.queue.value.length;
  return html`<div class="status-strip" role="note">
    <span class="ss-l"><i class="ss-dot" aria-hidden="true"></i><span class="mono">${t("ss_track", { lang: old.LANGN[k].toUpperCase(), done, total: all.length })}</span>
      <span class="ss-sep" aria-hidden="true"></span><span class="ss-am" lang="am">እንኳን ደህና መጡ! ዛሬም አንድ ተግዳሮት እንፍታ።</span></span>
    <span class="ss-r mono">
      <span>${t("ss_reviews_due")}: <b class=${due ? "hot" : ""}>${due}</b></span>
      <span>${t("ss_points")}: <b>${me.points}</b></span>
      <span class="ss-chip">${t("level")}: ${tText(me.reviewer.level)}</span>
    </span>
  </div>`;
}

/** "Selam, @login": the next challenge, and what is waiting on the learner. @param {{ me: any }} props */
function UpNext({ me }) {
  const next = nextChallenge(prefs().track) || nextChallenge();
  const queue = state.queue.value;
  const firstDue = queue.map((s) => s.dueAt).filter(Boolean).sort()[0];
  const mods = old.MODULES.map((m) => ({ m, s: moduleState(m) }));
  const ready = mods.filter((x) => x.s.ready && x.s.passed);
  const toRate = mods.filter((x) => x.s.sub?.status === "reviewed");
  const inReview = mods.filter((x) => x.s.sub?.status === "awaiting_review" && x.s.sub.reviewer);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const submit = async (/** @type {string} */ id) => {
    setBusy(id); setError("");
    try { await submitModule(id); } catch (e) { setError(/** @type {Error} */ (e).message); }
    setBusy("");
  };
  const short = (/** @type {Module} */ m) => t("module_n", { n: modNum(m) }) + " · " + tText(m.title).split(/[:፦]/)[0];
  const sub = (/** @type {Module} */ m) => (tText(m.title).split(/[:፦]/)[1] || "").trim();
  /** @param {string} key @param {string} icon @param {string} title @param {any} line @param {any} [action] @param {string} [tone] */
  const item = (key, icon, title, line, action, tone = "") => html`<li key=${key} class=${"todo " + tone}>
    <span class="todo-ic" aria-hidden="true">${icon}</span>
    <span class="todo-t"><b>${title}</b><span class="todo-sub mono">${line}</span></span>${action}</li>`;
  const todo = [
    queue.length > 0 && item("q", "✎", t("reviews_waiting_n", { n: queue.length }), html`<${Clock} dueAt=${firstDue} />`,
      html`<button class="btn small" onClick=${() => go("reviews")}>${t("start_review")}</button>`, "hot-todo"),
    ...toRate.map(({ m }) => item("r" + m.id, "★", short(m), t("review_received"),
      html`<button class="btn small" onClick=${() => openEx(m.exercises[0])}>${t("rate_the_review")}</button>`)),
    ...ready.map(({ m }) => item("s" + m.id, "↑", short(m), sub(m) + " · " + t("ready_to_submit"),
      html`<button class="btn small" data-act="submit-module" data-id=${m.id} disabled=${busy === m.id} onClick=${() => submit(m.id)}>${t("submit_module")}</button>`)),
    ...inReview.map(({ m, s }) => item("w" + m.id, "⏳", short(m), html`${t("in_review")} · <${PersonLink} login=${s.sub.reviewer.login} /> <${Clock} dueAt=${s.sub.dueAt} />`, null, "quiet")),
  ].filter(Boolean);
  const cur = next && moduleState(next.module);
  const howItWorks = () => { const d = /** @type {HTMLDetailsElement | null} */ (document.querySelector("details.how")); if (d) { d.open = true; d.scrollIntoView({ behavior: "smooth", block: "center" }); } };

  return html`<${StatusStrip} me=${me} />
  <section class="upnext">
    <span class="un-watermark" aria-hidden="true">ትምህርት</span>
    <div class="un-main">
      <p class="un-tags"><span class="un-hello">${t("selam_user", { login: me.login })}</span>
        <span class="un-am" lang="am">ሰላም፦ ቀጣዩ ተግዳሮትዎ</span>
        ${next && html`<span class="un-mod mono"><i aria-hidden="true"></i>${t("module_n", { n: modNum(next.module) })}</span>`}</p>
      ${next ? html`
        <h2 class="un-h">${t("up_next")}: ${tText(next.ex.title)}</h2>
        <p class="un-lead"><${Lead} text=${tText(next.ex.prompt)} /></p>
        <p class="un-crumb mono"><span class=${"lang-b sm track-" + next.ex.lang}>${next.ex.lang === "js" ? "JS" : "Go"}</span>
          <b>${t("module_n", { n: modNum(next.module) })}</b><span class="sl">/</span><span>${(tText(next.module.title).split(/[:፦]/).pop() || "").trim()}</span>
          <span class="sl">/</span><b class="gold">${tText(next.ex.topic)}</b><span class="pts-tag">+${t("pts_n", { n: old.ptsOf(next.ex) })}</span></p>
        <div class="un-actions">
          <button class="btn primary un-go" data-act="open" data-id=${next.ex.id} onClick=${() => openEx(next.ex.id)}>${t("open_challenge")} <span aria-hidden="true">→</span></button>
          <span class="un-note mono">${t(/** @type {any} */ (old.diffOf(next.ex).toLowerCase()))} · ${cur && t("n_passed", { n: cur.passed, total: cur.total })}</span>
        </div>`
      : html`<h2 class="un-h">${t("all_solved_title")}</h2><p class="un-lead">${t("all_solved_text")}</p>
        <div class="un-actions"><button class="btn primary un-go" onClick=${() => go("reviews")}>${t("reviews")} →</button></div>`}
    </div>
    <aside class="un-queue">
      <div class="uq-h"><span class="mono">${t("your_queue", { n: todo.length })}</span><span class="uq-am" lang="am">ተግባሮችዎ</span></div>
      ${todo.length ? html`<ul class="un-todo">${todo}</ul>`
        : html`<div class="uq-empty"><b>${t("queue_empty")}</b><span>${t("queue_empty_text")}</span></div>`}
      <div class="uq-foot mono"><span>${t("reviews_due_72")}</span><button class="linkish" onClick=${howItWorks}>${t("how_it_works")} →</button></div>
    </aside>
    ${error && html`<p class="err" role="alert">${error}</p>`}
  </section>`;
}

/** @param {{ k: string }} props */
function TrackCard({ k }) {
  const tr = old.TRACKS[k], all = exercisesOf(k), done = all.filter((e) => solved(e.id)).length;
  const basic = all.filter((e) => e.level === "basic").length, pts = all.reduce((a, e) => a + old.ptsOf(e), 0);
  const topics = [...new Set(all.map((e) => e.topic))];
  const cta = done === 0 ? t("start_track", { lang: old.LANGN[k] }) : done === all.length ? t("review_solutions") : t("continue_track", { done, total: all.length });
  const open = () => { prefs().track = k; savePrefs(); go("track", { level: null }); };
  return html`<button class=${"track track-" + k} data-act="track" data-v=${k} aria-label=${old.LANGN[k] + ": " + t("n_challenges", { n: all.length })} onClick=${open}>
    <span class="track-cover" aria-hidden="true">
      <span class="track-dots"><i></i><i></i><i></i><span class="mono">${k === "js" ? "solution.js" : "solution.go"}</span></span>
      <pre class="track-code" dangerouslySetInnerHTML=${{ __html: tr.code }}></pre></span>
    <span class="track-body">
      <span class="track-head"><img class=${"track-logo track-logo-" + k} src=${old.TRACK_IMG[k]} alt="" /><b>${old.LANGN[k]}</b>
        <span class="mono muted">${t("n_challenges", { n: all.length })}</span></span>
      <span class="track-blurb">${tText(tr.blurb)}</span>
      <span class="track-topics">${topics.slice(0, 6).map((x) => html`<span key=${x}>${tText(x)}</span>`)}
        ${topics.length > 6 && html`<span class="more">${t("more_n", { n: topics.length - 6 })}</span>`}</span>
      <span class="track-stats"><span><b>${basic}</b> ${t("basic_lc")}</span><span><b>${all.length - basic}</b> ${t("advanced_lc")}</span><span><b>${pts}</b> ${t("points")}</span></span>
      <span class="track-foot"><span class="bar"><i style=${{ width: (all.length ? done / all.length * 100 : 0) + "%" }}></i></span>
        <span class="track-cta">${cta.replace(/\s*→$/, "")} →</span></span>
    </span></button>`;
}

/** @param {{ me: any }} props */
function ProgressCard({ me }) {
  const max = maxPoints(), p = me.reviewer;
  return html`<section class="panel"><h2>${t("your_progress")}</h2><div class="pad">
    <div class="kpis">
      <div><div class="k">${me.points}</div><div class="muted">${t("points")}</div></div>
      <div><div class="k">${me.solved}<small>/${old.BANK.length}</small></div><div class="muted">${t("solved_2")}</div></div>
      <div><div class="k">${p.score.toFixed(1)}</div><div class="muted">${t("review_score")}</div></div>
    </div>
    <div class="bar" style="margin-top:12px"><i style=${{ width: (me.points / max * 100) + "%" }}></i></div>
    <div class="muted mono" style="font-size:12px;margin-top:4px">${t("of_points", { n: me.points, max })}</div>
  </div></section>`;
}

/** For guests: what they need, and the way in. */
function StartCard() {
  return html`<section class="panel start-card"><h2>${t("get_started")}</h2><div class="pad">
    <p class="muted" style="margin:0 0 12px;font-size:14px">${t("you_need_a_github_account_to_2")}</p>
    <${StartSteps} compact />
    <div style="margin-top:12px"><${SignInLink} /></div>
  </div></section>`;
}

function CircleMini() {
  const c = state.circle.value, waiting = state.queue.value.length;
  if (!c) return html`<section class="panel"><h2>${t("review_circle")}</h2><div class="pad">
    <p class="muted" style="margin:0 0 12px;font-size:14px">${t("youre_not_in_a_circle_so")}</p>
    <button class="btn" data-act="view" data-v="circle" onClick=${() => go("circle")}>${t("find_a_circle")}</button></div></section>`;
  return html`<section class="panel"><h2>${c.name}</h2><div class="pad">
    <div class="avs">${c.members.map((/** @type {any} */ m) => html`<button key=${m.login} class="av-link" data-act="user" data-login=${m.login} title=${"@" + m.login}
      onClick=${() => go("user", { login: m.login, utab: null })}><${Avatar} login=${m.login} /></button>`)}</div>
    <p class="muted" style="font-size:13.5px;margin:10px 0 12px">${t("circle_members_n", { n: c.members.length })}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn" data-act="view" data-v="circle" onClick=${() => go("circle")}>${t("open_circle")}</button>
      ${waiting > 0 && html`<button class="btn primary" data-act="view" data-v="reviews" onClick=${() => go("reviews")}>${t("n_to_review", { n: waiting })}</button>`}
    </div></div></section>`;
}

function HowModules() {
  return html`<details class="panel how"><summary>${t("how_module_review_works")}</summary><div class="pad">
    <ol class="steps"><li>${t("solve_each_challenge_and_submit_it")}</li><li>${t("every_pass_counts_and_earns_points")}</li>
      <li>${t("when_all_challenges_in_a_module")}</li><li>${t("someone_who_finished_that_module_reviews")}</li><li>${t("you_rate_the_review_1_5")}</li></ol>
    <p class="muted" style="font-size:13px;margin:10px 0 0">${t("reviewers_must_have_finished_the_same")}</p>
  </div></details>`;
}

/* ======================= one track ======================= */

/** @param {{ route: Route }} props */
export function TrackScreen({ route }) {
  const [, redraw] = useReducer((n) => n + 1, 0);
  const S = prefs();
  const k = S.track === "go" ? "go" : "js";
  const level = route.level || "";
  const diff = S.diff || "all", statusF = S.statusF || "all";
  /** @param {string} key @param {string} v */
  const setPref = (key, v) => { S[key] = v; savePrefs(); redraw(0); };
  const all = exercisesOf(k), done = all.filter((e) => solved(e.id)).length;
  const keep = (/** @type {any} */ e) => (diff === "all" || old.diffOf(e) === diff) && (statusF === "all" || (statusF === "solved" ? solved(e.id) : !solved(e.id)));
  const filtered = diff !== "all" || statusF !== "all";
  const mods = old.MODULES.filter((m) => m.lang === k && (!level || exercise(m.exercises[0]).level === level));
  const current = currentModule(k)?.id;
  const next = nextChallenge(k)?.ex.id;
  /** @param {string} key @param {string} v @param {string} label */
  const chip = (key, v, label) => html`<button data-act="filter" data-k=${key} data-v=${v} aria-pressed=${String((key === "diff" ? diff : statusF) === v)} onClick=${() => setPref(key, v)}>${label}</button>`;
  /** @param {string} v @param {string} label */
  const lvTab = (v, label) => html`<button data-act="level" data-v=${v} aria-pressed=${String(level === v)} onClick=${() => go("track", { level: v || null })}>${label}</button>`;
  const shown = mods.map((m) => ({ m, list: m.exercises.map(exercise).filter(keep) })).filter((x) => x.list.length);

  return html`
    <button class="back" data-act="view" data-v="challenges" onClick=${() => go("challenges")}>${t("all_tracks")}</button>
    <header class=${"track-title track-" + k}><img class=${"track-logo track-logo-" + k + " track-logo-lg"} src=${old.TRACK_IMG[k]} alt="" />
      <div><h1>${old.LANGN[k]}</h1><p class="muted">${tText(old.TRACKS[k].blurb)}</p></div>
      <span class="track-count"><span class="tc-n">${done}<small>/${all.length}</small></span><span class="muted">${t("solved_2")}</span></span></header>
    <div class="grid2"><div>
      <div class="seg-tabs lvl-tabs" role="group" aria-label=${t("level")}>${lvTab("", t("all_modules"))}${lvTab("basic", t("basic"))}${lvTab("advanced", t("advanced"))}</div>
      <div class="toolbar">
        <div class="chips" role="group" aria-label=${t("difficulty")}>${chip("diff", "all", t("all"))}${chip("diff", "Easy", t("easy"))}${chip("diff", "Medium", t("medium"))}${chip("diff", "Hard", t("hard"))}</div>
        <div class="chips" role="group" aria-label=${t("status")}>${chip("statusF", "all", t("any"))}${chip("statusF", "unsolved", t("unsolved"))}${chip("statusF", "solved", t("solved"))}</div>
      </div>
      ${shown.length ? shown.map(({ m, list }) => html`<${ModuleBlock} key=${m.id} m=${m} list=${list} next=${next}
          open=${filtered || (S.modOpen?.[m.id] != null ? S.modOpen[m.id] : m.id === current || m.exercises.includes(next || ""))}
          onToggle=${(/** @type {boolean} */ o) => { S.modOpen = { ...(S.modOpen || {}), [m.id]: o }; savePrefs(); }} />`)
        : html`<p class="muted" style="padding:16px">${t("no_challenges_match_these_filters")}</p>`}
    </div>
    <aside class="side">
      ${state.me.value ? html`<${ProgressCard} me=${state.me.value} />` : html`<${StartCard} />`}
      ${state.me.value && html`<${CircleMini} />`}
      <${HowModules} />
    </aside></div>`;
}

/** @param {{ m: Module, list: any[], next: string | undefined, open: boolean, onToggle: (open: boolean) => void }} props */
function ModuleBlock({ m, list, next, open, onToggle }) {
  const ms = moduleState(m);
  const pct = Math.round(ms.passed / ms.total * 100);
  return html`<details class=${"mod" + (ms.passed === ms.total ? " complete" : "")} data-mod=${m.id} open=${open}
      onToggle=${(/** @type {any} */ e) => { if (e.currentTarget.open !== open) onToggle(e.currentTarget.open); }}>
    <summary class="mod-h"><span class="mod-chev" aria-hidden="true"></span>
      <span class="mod-t"><span class="mod-n">${t("module_n", { n: modNum(m) })}</span><span class="mod-title">${tText(m.title)}</span></span>
      <span class="mod-meta"><${ModChip} ms=${ms} />
        <span class="mod-bar" aria-hidden="true"><i style=${{ width: pct + "%" }}></i></span>
        <span class="mod-prog mono">${t("n_passed", { n: ms.passed, total: ms.total })}</span></span></summary>
    <div class="panel ch-list">
      ${list.map((e) => html`<${ChallengeRow} key=${e.id} e=${e} isNext=${e.id === next} />`)}
      <div class="mod-foot"><${ModuleFoot} m=${m} ms=${ms} /></div>
    </div></details>`;
}

/** @param {{ e: any, isNext: boolean }} props */
function ChallengeRow({ e, isNext }) {
  const d = old.diffOf(e);
  const st = solved(e.id) ? { k: "pass", l: t("solved") } : state.solved.value.has(e.id) ? { k: "try", l: t("passed_push_to_submit") } : { k: "new", l: t("not_solved") };
  return html`<button class=${"ch-row" + (isNext ? " next" : "") + " is-" + st.k} data-act="open" data-id=${e.id} onClick=${() => openEx(e.id)}>
    <span class="ch-ic" aria-hidden="true">${st.k === "pass" ? "✓" : st.k === "try" ? "↑" : ""}</span>
    <span class="ch-main"><b>${tText(e.title)}${isNext && html` <span class="next-tag">${t("next_tag")}</span>`}</b>
      <span class="muted">${tText(e.topic)} · ${e.level === "basic" ? t("basic") : t("advanced")}</span></span>
    <span class=${"diff " + d.toLowerCase()}>${t(/** @type {any} */ (d.toLowerCase()))}</span>
    <span class="mono pts">${t("pts_n", { n: old.ptsOf(e) })}</span>
    <span class=${"st " + st.k}>${st.l}</span></button>`;
}

/** The module's review state, in its header. @param {{ ms: ModuleState }} props */
function ModChip({ ms }) {
  const sub = ms.sub;
  if (sub?.status === "rated") return html`<span class="st done">${t("reviewed_stars", { n: sub.rating })}</span>`;
  if (sub?.status === "reviewed") return html`<span class="st act">${t("rate_the_review")}</span>`;
  if (sub) return html`<span class="st wait">${t("in_review")}</span>`;
  if (ms.ready && ms.passed) return html`<span class="st act">${t("ready_to_submit")}</span>`;
  return null;
}

/** Under the module's challenges: who reviews it and the clock, or how to get it reviewed. @param {{ m: Module, ms: ModuleState }} props */
function ModuleFoot({ m, ms }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sub = ms.sub;
  if (ms.guest) return html`<span class="muted">${t("every_passed_challenge_counts_sign_in")}</span>`;
  if (sub?.status === "awaiting_review" && sub.reviewer && sub.dueAt)
    return html`<span class="muted">${t("reviewer_label")}</span><${PersonLink} login=${sub.reviewer.login} /><${Clock} dueAt=${sub.dueAt} />`;
  if (sub?.status === "rated") return html`<span class="st done">${t("reviewed_stars", { n: sub.rating })}</span>
    <button class="btn small" data-act="open" data-id=${m.exercises[0]} onClick=${() => openEx(m.exercises[0])}>${t("see_the_review")}</button>`;
  if (sub?.status === "reviewed") return html`<span class="st act">${t("review_received")}</span>
    <button class="btn small primary" data-act="open" data-id=${m.exercises[0]} onClick=${() => openEx(m.exercises[0])}>${t("rate_the_review")}</button>`;
  if (sub) return html`<span class="st wait">${t("in_review")}</span><span class="muted">${sub.status === "waiting_for_reviewer" ? t("waiting_for_someone_who_finished_this") : t("a_reviewer_is_reading_your_solutions")}</span>`;
  const err = error && html`<span class="err" role="alert" style="flex-basis:100%;margin:0">${error}</span>`;
  if (ms.resave.length) return html`<span class="muted">${t("push_lead")} ${ms.resave.map((id, i) => html`${i ? ", " : ""}<button class="linkish" data-act="open" data-id=${id} onClick=${() => openEx(id)}>${tText(exercise(id).title)}</button>`)} ${t("from_your_github_repository_to_submit")}</span>${err}`;
  if (ms.ready) {
    const submit = async () => { setBusy(true); setError(""); try { await submitModule(m.id); } catch (e) { setError(/** @type {Error} */ (e).message); } setBusy(false); };
    return html`<span class="okc">${t("all_n_passed", { n: ms.total })}</span>
      <button class="btn small primary" data-act="submit-module" data-id=${m.id} disabled=${busy} onClick=${submit}>${t("submit_module_for_review")}</button>${err}`;
  }
  return html`<span class="muted">${t("push_all_to_submit", { n: ms.total })}</span>`;
}
