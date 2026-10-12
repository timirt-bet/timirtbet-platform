// @ts-check
// The home page (/), the two language tracks (/challenges), and each track's modules and
// challenges (/challenges/js, /challenges/go, optionally /basic or /advanced).
import { html } from "htm/preact";
import { useState, useReducer } from "preact/hooks";
import { go, openEx, modNum, old, prefs, savePrefs } from "../legacy.js";
import { t, tText } from "../i18n.js";
import { api } from "../api.js";
import { state, refresh, expectingLearner } from "../state.js";
import { NewsBox } from "../components/news.js";
import { Avatar, PersonLink } from "../components/people.js";
import { Clock, leftText } from "../components/clock.js";
import { StartSteps, SignInLink } from "../components/start.js";
import { exercise, solved, moduleState, currentModule, nextChallenge, maxPoints } from "../progress.js";

/** @typedef {import("../legacy.js").Module} Module */
/** @typedef {import("../progress.js").ModuleState} ModuleState */

const modTitle = (/** @type {Module} */ m) => t("module_title", { n: modNum(m), title: tText(m.title) });
const exercisesOf = (/** @type {string} */ lang) => old.BANK.filter((e) => e.lang === lang);

/** Submits a finished module for review. @param {string} id */
async function submitModule(id) { await api("POST", `/api/modules/${id}/submit`); await refresh(); }

/* ======================= home ======================= */

/** "/": what Timirtbet is (or, signed in, what is next), a developer's day, the tracks, news, and for teachers. */
export function HomeScreen() {
  const me = state.me.value;
  const top = me ? html`<${UpNext} me=${me} />`
    : expectingLearner() ? html`<section class="upnext skel" aria-busy="true"><div><i class="sk w30"></i><i class="sk w70 tall"></i><i class="sk w90"></i><i class="sk w40 sk-btn"></i></div></section>`
    : html`<${Hero} />`;
  return html`<div class="home">
    ${me || expectingLearner() ? html`<h1 class="sr-only">Timirtbet</h1>` : ""}
    ${top}
    <${DevDay} />
    <section class="h-sec"><div class="h-label"><span class="h-no">02</span>${t("tracks")}</div>
      <div class="h-body"><div class="h-head"><h2 class="h-h">${t("tracks_title", { n: old.BANK.length })}</h2>
        <button class="h-more" data-act="view" data-v="challenges" onClick=${() => go("challenges")}>${t("all_challenges")}</button></div>
        <div class="h-tracks">${["js", "go"].map((k) => html`<${TrackRow} key=${k} k=${k} />`)}</div></div></section>
    <${NewsBox} />
    <${ForTeachers} />
  </div>`;
}

/** For visitors: what Timirtbet is, and the way in. */
function Hero() {
  const facts = [["fact_free_t", "fact_free"], ["fact_lang_t", "fact_lang"], ["fact_tools_t", "fact_tools"], ["fact_who_t", "fact_who"]];
  return html`<section class="hero">
    <div class="hero-main">
      <p class="hero-kick"><span class="am">ትምህርት ቤት</span>${t("home_kicker")}</p>
      <h1 class="hero-h">${t("home_title")}</h1>
      <p class="hero-lede">${t("home_lede")}</p>
      <div class="hero-cta"><${SignInLink} /><button class="h-more" data-act="view" data-v="challenges" onClick=${() => go("challenges")}>${t("browse_challenges")}</button></div>
    </div>
    <dl class="hero-facts">${facts.map(([h, d]) => html`<div key=${h}><dt>${t(/** @type {any} */ (h))}</dt><dd>${t(/** @type {any} */ (d))}</dd></div>`)}</dl>
  </section>`;
}

/** How it works, told as a developer's working day: every step is something software teams do daily. */
function DevDay() {
  const day = [["09:00", 1], ["09:30", 2], ["10:00", 3], ["13:00", 4], ["15:00", 5], ["16:30", 6]];
  return html`<section class="h-sec" id="how"><div class="h-label"><span class="h-no">01</span>${t("how_it_works")}</div>
    <div class="h-body"><h2 class="h-h">${t("day_title")}</h2><p class="h-lede">${t("day_lede")}</p>
      <ol class="day">${day.map(([time, n]) => html`<li key=${n}><span class="day-t mono">${time}</span>
        <b>${t(/** @type {any} */ ("day_" + n + "_t"))}</b><span>${t(/** @type {any} */ ("day_" + n))}</span></li>`)}</ol></div></section>`;
}

/** A track as one line on the home page. @param {{ k: string }} props */
function TrackRow({ k }) {
  const all = exercisesOf(k), done = all.filter((e) => solved(e.id)).length;
  const open = () => { prefs().track = k; savePrefs(); go("track", { level: null }); };
  return html`<button class=${"trow track-" + k} data-act="track" data-v=${k} onClick=${open}>
    <img class=${"track-logo track-logo-" + k} src=${old.TRACK_IMG[k]} alt="" />
    <span class="trow-main"><b>${old.LANGN[k]}</b><span>${tText(old.TRACKS[k].blurb)}</span></span>
    <span class="trow-n mono">${state.me.value ? `${done}/${all.length}` : t("n_challenges", { n: all.length })}</span>
    <span class="trow-go" aria-hidden="true">→</span></button>`;
}

/** For teachers and schools: classes, with a small example of the progress grid. */
function ForTeachers() {
  const rows = [["Abebe", "ppppptoo"], ["Hana", "pppppppt"], ["Dawit", "ppptoooo"], ["Sara", "pppppooo"], ["Yonas", "ptoooooo"]];
  return html`<section class="h-sec"><div class="h-label"><span class="h-no">04</span>${t("for_teachers")}</div>
    <div class="h-body teach-band"><div>
      <h2 class="h-h">${t("teach_title")}</h2><p class="h-lede">${t("home_teach_lede")}</p>
      <ul class="ticks"><li>${t("teach_p1")}</li><li>${t("teach_p2")}</li><li>${t("teach_p3")}</li><li>${t("teach_p4")}</li></ul>
      <button class="btn dark" data-act="view" data-v="teach" onClick=${() => go("teach")}>${t("teach_a_class")} →</button></div>
      <figure class="mini-grid" aria-hidden="true"><figcaption class="mono">${t("teach_example")}</figcaption>
        ${rows.map(([who, cells]) => html`<div key=${who}><span>${who}</span>${[...cells].map((c, i) => html`<i key=${i} class=${c}></i>`)}</div>`)}</figure>
    </div></section>`;
}

/* ======================= challenges ======================= */

/** /challenges: the two tracks in full. */
export function ChallengesScreen() {
  const me = state.me.value;
  return html`
    <p class="eyebrow">${t("challenges")}</p>
    <h1 class="pg-h">${t("choose_a_track")}</h1>
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
  ].filter(Boolean);
  const howItWorks = () => document.getElementById("how")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return html`<section class="upnext">
    <div class="un-main">
      <p class="un-tags"><span class="un-hello">${t("selam_user", { login: me.login })}</span></p>
      ${next ? html`
        <h2 class="un-h">${t("up_next")}: ${tText(next.ex.title)}</h2>
        <p class="un-lead"><${Lead} text=${tText(next.ex.prompt)} /></p>
        <div class="un-actions">
          <button class="btn primary un-go" data-act="open" data-id=${next.ex.id} onClick=${() => openEx(next.ex.id)}>${t("open_challenge")} <span aria-hidden="true">→</span></button>
          <span class="un-crumb mono"><span class=${"lang-b sm track-" + next.ex.lang}>${next.ex.lang === "js" ? "JS" : "Go"}</span>
            ${t("module_n", { n: modNum(next.module) })} · ${tText(next.ex.topic)} · ${t(/** @type {any} */ (old.diffOf(next.ex).toLowerCase()))}
            <span class="pts-tag">+${t("pts_n", { n: old.ptsOf(next.ex) })}</span></span>
        </div>`
      : html`<h2 class="un-h">${t("all_solved_title")}</h2><p class="un-lead">${t("all_solved_text")}</p>
        <div class="un-actions"><button class="btn primary un-go" onClick=${() => go("reviews")}>${t("reviews")} →</button></div>`}
    </div>
    <aside class="un-queue">
      <div class="uq-h"><span class="mono">${todo.length ? t("your_queue", { n: todo.length }) : t("your_queue_plain")}</span>
        <button class="linkish uq-how" onClick=${howItWorks}>${t("how_it_works")} →</button></div>
      ${todo.length ? html`<ul class="un-todo">${todo}</ul>`
        : html`<p class="uq-empty">${t("queue_empty")}</p>`}
      ${inReview.length > 0 && html`<div class="uq-waiting"><p class="mono">${t("in_review")}</p>
        <ul>${inReview.map(({ m, s }) => html`<li key=${m.id}><span>${short(m)}</span>
          <span class="muted"><${PersonLink} login=${s.sub.reviewer.login} /> · ${leftText(Date.parse(s.sub.dueAt) - Date.now())}</span></li>`)}</ul></div>`}
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
