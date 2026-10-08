// @ts-check
// "Teach" (account menu): a teacher's classes. /teach lists them and creates new ones;
// /teach/<class> shows the class grid (learners × challenges) with the join code and a CSV
// download; /teach/<class>/<learner> shows one learner's runs, passes and module reviews.
// Learners join from their Profile with the class code; only the teacher sees this.
import { html } from "htm/preact";
import { useEffect, useState } from "preact/hooks";
import { go, copyBtn, modNum, old, openEx } from "../legacy.js";
import { t, tText, lang } from "../i18n.js";
import { api } from "../api.js";
import { state, refresh } from "../state.js";
import { Avatar, SignInNeeded } from "../components/people.js";

/** @param {{ route: Route }} props */
export function TeachScreen({ route }) {
  const me = state.me.value;
  if (!me) return html`<${SignInNeeded} message=${t("sign_in_to_teach")} />`;
  if (route.cid && route.lid) return html`<${LearnerPage} cid=${route.cid} lid=${route.lid} />`;
  if (route.cid) return html`<${ClassPage} cid=${route.cid} />`;
  return html`<${Classes} />`;
}

/**
 * Loads an API address and reloads it when asked.
 * @param {string} path
 * @returns {{ data: any, error: string, reload: () => void }}
 */
function useLoad(path) {
  const [data, setData] = useState(/** @type {any} */ (null));
  const [error, setError] = useState("");
  const [n, setN] = useState(0);
  useEffect(() => {
    let live = true;
    setError("");
    api("GET", path).then((d) => { if (live) setData(d); }, (e) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [path, n]);
  return { data, error, reload: () => setN((x) => x + 1) };
}

/** A short date, like "8 Oct". @param {string | null} at */
const day = (at) => (at ? new Date(at).toLocaleDateString(lang.value === "am" ? "am-ET" : "en-GB", { day: "numeric", month: "short" }) : "—");
/** @param {string} id */
const exOf = (id) => old.BANK.find((e) => e.id === id);
/** @param {string} id */
const modOf = (id) => old.MODULES.find((m) => m.exercises.includes(id));
/** "JS 1", "Go 3" @param {import("../legacy.js").Module} m */
const modLabel = (m) => `${m.lang === "js" ? "JS" : "Go"} ${modNum(m)}`;

const back = (/** @type {string} */ label, /** @type {() => void} */ onClick) => html`<button class="back" onClick=${onClick}>${label}</button>`;

/* ---------- /teach: the teacher's classes ---------- */
function Classes() {
  const { data, error, reload } = useLoad("/api/classes");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  /** @param {SubmitEvent} e */
  const create = async (e) => {
    e.preventDefault();
    if (name.trim().length < 3) return setErr(t("class_name_hint"));
    setBusy(true); setErr("");
    try { const r = await api("POST", "/api/classes", { name: name.trim() }); await refresh(); go("teach", { cid: r.class.id, lid: null }); }
    catch (x) { setErr(/** @type {Error} */ (x).message); setBusy(false); }
  };
  const classes = data?.classes || [];
  return html`
    <p class="eyebrow">${t("teach")}</p>
    <h1 class="pg-h">${t("your_classes")}</h1>
    <p class="lede">${t("teach_lede")}</p>
    ${error && html`<p class="err" role="alert">${error}</p>`}
    <div class="cls-list" id="classList">
      ${classes.map((/** @type {any} */ c) => html`<button key=${c.id} class="panel cls-card" data-act="open-class" data-id=${c.id} onClick=${() => go("teach", { cid: c.id, lid: null })}>
        <b>${c.name}</b>
        <span class="muted">${t("n_learners", { n: c.members })}</span>
        <span class="cls-code mono">${c.code}</span></button>`)}
      <form class="panel cls-new" data-form="new-class" onSubmit=${create}><h2>${t("new_class")}</h2><div class="pad form">
        <label for="clsName" class="lbl-sm">${t("class_name")}</label>
        <input id="clsName" maxlength="60" placeholder=${t("class_name_example")} value=${name} onInput=${(/** @type {any} */ e) => setName(e.currentTarget.value)} />
        <div class="err" role="alert">${err}</div>
        <button class="btn primary" type="submit" disabled=${busy}>${t("create_class")}</button>
      </div></form>
    </div>
    <section class="panel how-teach"><h2>${t("how_it_works")}</h2><div class="pad"><ol>
      <li>${t("teach_step_1")}</li><li>${t("teach_step_2")}</li><li>${t("teach_step_3")}</li>
    </ol></div></section>`;
}

/* ---------- /teach/<class>: the grid ---------- */
/** @param {{ cid: string }} props */
function ClassPage({ cid }) {
  const { data, error, reload } = useLoad(`/api/classes/${encodeURIComponent(cid)}`);
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  if (error) return html`${back(t("back_to_classes"), () => go("teach", { cid: null, lid: null }))}<p class="err" role="alert">${error}</p>`;
  if (!data) return html`<p class="muted">${t("loading")}</p>`;
  const c = data.class, rep = data.report;
  const ids = /** @type {string[]} */ (rep.challenges).filter((id) => exOf(id));
  /** @type {{ m: any, ids: string[] }[]} */
  const groups = [];
  for (const id of ids) { const m = modOf(id); const g = groups[groups.length - 1]; if (g && g.m === m) g.ids.push(id); else groups.push({ m, ids: [id] }); }
  const L = /** @type {any[]} */ (rep.learners);
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
  const active = L.filter((l) => l.lastActive && l.lastActive > weekAgo).length;
  const avg = L.length ? Math.round(L.reduce((a, l) => a + l.passed, 0) / L.length) : 0;
  const reviewed = L.reduce((a, l) => a + l.modulesReviewed, 0);
  const rotate = async () => { setBusy(true); try { await api("POST", `/api/classes/${c.id}/code`); reload(); } finally { setBusy(false); } };
  const del = async () => { setBusy(true); try { await api("DELETE", `/api/classes/${c.id}`); await refresh(); go("teach", { cid: null, lid: null }); } catch { setBusy(false); } };
  /** @param {any} l @param {string} id */
  const cellTitle = (l, id) => `@${l.login} · ${tText(exOf(id).title)}: ${l.status[id] === "passed" ? t("passed") : l.status[id] === "tried" ? t("tried_n_runs", { n: l.tries[id] || 0 }) : t("not_started")}`;

  return html`
    ${back(t("back_to_classes"), () => go("teach", { cid: null, lid: null }))}
    <div class="ex-head"><div><p class="eyebrow">${t("class")}</p><h1 class="pg-h" id="className">${c.name}</h1></div>
      <div class="cmd cls-join"><span class="muted" style="font-size:12.5px">${t("class_code")}</span>
        <code id="classCode" class="mono">${c.code}</code>
        <button class="btn small" data-act="copy" onClick=${(/** @type {any} */ e) => copyBtn(e.currentTarget, "classCode")}>${t("copy")}</button>
        <button class="btn small" data-act="rotate" disabled=${busy} onClick=${rotate}>${t("new_code")}</button></div></div>
    <div class="stats">
      <${Stat} value=${L.length} label=${t("learners")} />
      <${Stat} value=${`${active}`} label=${t("active_this_week")} />
      <${Stat} value=${`${avg}/${ids.length}`} label=${t("average_passed")} />
      <${Stat} value=${reviewed} label=${t("modules_reviewed")} />
    </div>
    ${L.length === 0 ? html`<section class="panel"><div class="pad empty-cls">
        <b>${t("no_learners_yet")}</b>
        <p class="muted">${t("share_the_code", { code: c.code })}</p></div></section>`
    : html`<section class="panel"><div class="grid-head"><h2>${t("progress")}</h2>
        <span class="legend"><i class="dot passed"></i>${t("passed")}<i class="dot tried"></i>${t("tried")}<i class="dot"></i>${t("not_started")}</span>
        <a class="btn small" id="csvLink" href=${`/api/classes/${c.id}/export.csv`} download>${t("download_csv")}</a></div>
      <div class="cgrid-wrap"><table class="cgrid" id="classGrid">
        <thead>
          <tr><th class="cg-who" rowspan="2">${t("learner")}</th>${groups.map((g) => html`<th class="mod" colspan=${g.ids.length} title=${g.m ? tText(g.m.title) : ""}>${g.m ? modLabel(g.m) : ""}</th>`)}<th class="num" rowspan="2">${t("passed")}</th><th class="num" rowspan="2">${t("last_active")}</th></tr>
          <tr>${groups.map((g) => g.ids.map((id, i) => html`<th class="ch" title=${tText(exOf(id).title)}>${i + 1}</th>`))}</tr>
        </thead>
        <tbody>${L.map((l) => html`<tr key=${l.id} data-learner=${l.login} onClick=${() => go("teach", { cid: c.id, lid: l.id })}>
          <th class="cg-who" scope="row"><button class="linkish lrn" data-act="open-learner" data-id=${l.id}><${Avatar} login=${l.login} size="sm" /><span class="mono">@${l.login}</span></button></th>
          ${ids.map((id) => html`<td class="cell"><i class=${"dot " + (l.status[id] || "")} title=${cellTitle(l, id)}></i></td>`)}
          <td class="num mono">${l.passed}</td><td class="num">${day(l.lastActive)}</td></tr>`)}
        </tbody>
        <tfoot><tr><th class="cg-who">${t("passed_by")}</th>${ids.map((id) => html`<td class="cell mono">${L.filter((l) => l.status[id] === "passed").length || ""}</td>`)}<td></td><td></td></tr></tfoot>
      </table></div></section>`}
    <section class="panel" style="margin-top:16px"><div class="pad">
      ${confirmDel
        ? html`<p style="margin:0 0 10px;font-size:14px">${t("delete_class_confirm", { name: c.name })}</p>
            <div style="display:flex;gap:8px"><button class="btn danger-btn" data-act="delete-class" disabled=${busy} onClick=${del}>${t("delete_class")}</button>
            <button class="btn" onClick=${() => setConfirmDel(false)}>${t("cancel")}</button></div>`
        : html`<button class="linkish" data-act="ask-delete-class" onClick=${() => setConfirmDel(true)}>${t("delete_this_class")}</button>`}
    </div></section>`;
}

/** @param {{ value: string | number, label: string }} props */
const Stat = ({ value, label }) => html`<div class="stat"><div class="v">${value}</div><div class="l">${label}</div></div>`;

/* ---------- /teach/<class>/<learner>: one learner ---------- */
/** @param {{ cid: string, lid: string }} props */
function LearnerPage({ cid, lid }) {
  const { data, error } = useLoad(`/api/classes/${encodeURIComponent(cid)}/learners/${encodeURIComponent(lid)}`);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const toClass = () => go("teach", { cid, lid: null });
  if (error) return html`${back(t("back_to_class"), toClass)}<p class="err" role="alert">${error}</p>`;
  if (!data) return html`<p class="muted">${t("loading")}</p>`;
  const l = data.learner;
  const rows = /** @type {any[]} */ (l.challenges).filter((x) => exOf(x.exerciseId));
  const passed = rows.filter((x) => x.passed).length, runs = rows.reduce((a, x) => a + x.runs, 0);
  const last = rows.reduce((a, x) => (x.lastAt && x.lastAt > a ? x.lastAt : a), "");
  const remove = async () => { setBusy(true); try { await api("POST", `/api/classes/${cid}/remove`, { learnerId: lid }); toClass(); } catch { setBusy(false); } };
  /** @type {any} */
  let lastMod = null;
  return html`
    ${back(t("back_to_class_name", { name: data.class.name }), toClass)}
    <div class="ex-head"><div class="lrn big"><${Avatar} login=${l.login} size="lg" /><div>
      <p class="eyebrow" style="margin:0">${data.class.name}</p><h1 class="pg-h mono" id="learnerName">@${l.login}</h1>
      <div class="fol-row"><button class="linkish" onClick=${() => go("user", { login: l.login, utab: null })}>${t("public_profile")}</button></div></div></div></div>
    <div class="stats">
      <${Stat} value=${`${passed}/${rows.length}`} label=${t("challenges_passed")} />
      <${Stat} value=${runs} label=${t("test_runs")} />
      <${Stat} value=${l.modules.filter((/** @type {any} */ m) => m.reviewed).length} label=${t("modules_reviewed")} />
      <${Stat} value=${day(last || null)} label=${t("last_active")} />
    </div>
    <section class="panel"><h2>${t("challenges")}</h2><div class="tbl"><table class="ldetail" id="learnerTable">
      <thead><tr><th>${t("challenge")}</th><th>${t("status")}</th><th class="num">${t("runs")}</th><th class="num">${t("best")}</th><th>${t("last_run")}</th></tr></thead>
      <tbody>${rows.map((x) => {
        const m = modOf(x.exerciseId), head = m && m !== lastMod; if (head) lastMod = m;
        // A module with no runs yet is one quiet row, not a row per challenge.
        const quiet = m && m.exercises.every((/** @type {string} */ id) => { const r = rows.find((y) => y.exerciseId === id); return !r || (!r.runs && !r.passed); });
        if (quiet) return head ? html`<tr class="mod-row quiet"><td colspan="5">${modLabel(m)} · ${tText(m.title)}<span class="st new">${t("not_started")}</span></td></tr>` : null;
        const st = x.passed ? "passed" : x.runs ? "tried" : "";
        return html`${head && html`<tr class="mod-row"><td colspan="5">${modLabel(m)} · ${tText(m.title)}</td></tr>`}
          <tr data-ex=${x.exerciseId}>
            <td><button class="linkish" onClick=${() => openEx(x.exerciseId)}>${tText(exOf(x.exerciseId).title)}</button></td>
            <td><span class=${"st " + (st === "passed" ? "pass" : st === "tried" ? "try" : "new")}>${st === "passed" ? t("passed") : st === "tried" ? t("tried") : t("not_started")}</span>
              ${!x.passed && x.lastError && html`<div class="t-msg mono">${x.lastError}</div>`}</td>
            <td class="num mono">${x.runs || ""}</td>
            <td class="num mono">${x.runs ? `${x.best}/${x.total}` : ""}</td>
            <td>${x.runs ? day(x.lastAt) : ""}</td></tr>`;
      })}</tbody></table></div></section>
    ${l.modules.length > 0 && html`<section class="panel" style="margin-top:16px"><h2>${t("module_reviews")}</h2><div class="tbl"><table>
      <thead><tr><th>${t("module")}</th><th>${t("submitted")}</th><th>${t("status")}</th></tr></thead>
      <tbody>${l.modules.map((/** @type {any} */ s) => { const m = old.MODULES.find((x) => x.id === s.moduleId);
        return html`<tr><td>${m ? `${modLabel(m)} · ${tText(m.title)}` : s.moduleId}</td><td>${day(s.at)}</td>
          <td><span class=${"st " + (s.reviewed ? "pass" : "try")}>${s.reviewed ? t("reviewed") : t("waiting_for_review")}</span></td></tr>`; })}</tbody></table></div></section>`}
    <section class="panel" style="margin-top:16px"><div class="pad">
      ${confirm
        ? html`<p style="margin:0 0 10px;font-size:14px">${t("remove_learner_confirm", { login: l.login })}</p>
            <div style="display:flex;gap:8px"><button class="btn danger-btn" data-act="remove-learner" disabled=${busy} onClick=${remove}>${t("remove_from_class")}</button>
            <button class="btn" onClick=${() => setConfirm(false)}>${t("cancel")}</button></div>`
        : html`<button class="linkish" data-act="ask-remove" onClick=${() => setConfirm(true)}>${t("remove_from_class")}</button>`}
    </div></section>`;
}

/* ---------- Profile: the learner's class ---------- */
export function ClassCard() {
  const cls = state.cls.value;
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [confirm, setConfirm] = useState(false);
  const act = async (/** @type {() => Promise<unknown>} */ f) => { setBusy(true); setErr(""); try { await f(); await refresh(); setCode(""); setConfirm(false); } catch (e) { setErr(/** @type {Error} */ (e).message); } setBusy(false); };
  return html`<section class="panel" id="classCard"><h2>${t("your_class")}</h2><div class="pad">
    ${cls ? html`
      <p style="margin:0 0 6px"><b>${cls.name}</b>${cls.teacher && html` <span class="muted">· ${t("teacher_login", { login: cls.teacher })}</span>`}</p>
      <p class="muted" style="margin:0 0 12px;font-size:13.5px">${t("your_teacher_sees")}</p>
      ${confirm
        ? html`<div style="display:flex;gap:8px"><button class="btn small" data-act="leave-class" disabled=${busy} onClick=${() => act(() => api("POST", "/api/classes/leave"))}>${t("leave_class")}</button>
            <button class="btn small" onClick=${() => setConfirm(false)}>${t("cancel")}</button></div>`
        : html`<button class="linkish" data-act="ask-leave-class" onClick=${() => setConfirm(true)}>${t("leave_class")}</button>`}`
    : html`<form class="form" data-form="join-class" onSubmit=${(/** @type {SubmitEvent} */ e) => { e.preventDefault(); act(() => api("POST", "/api/classes/join", { code: code.trim().toUpperCase() })); }}>
        <p class="muted" style="margin:0 0 10px;font-size:13.5px">${t("join_class_lede")}</p>
        <label for="classJoin" class="lbl-sm">${t("class_code")}</label>
        <input id="classJoin" class="mono" maxlength="8" autocomplete="off" spellcheck=${false} value=${code} onInput=${(/** @type {any} */ e) => setCode(e.currentTarget.value)} />
        <button class="btn primary" type="submit" disabled=${busy || !code.trim()}>${t("join_class")}</button>
      </form>`}
    ${err && html`<p class="err" role="alert">${err}</p>`}
    <p style="margin:14px 0 0;font-size:13.5px"><button class="linkish" data-act="teach" onClick=${() => go("teach", { cid: null, lid: null })}>${state.teaching.value ? t("your_classes_arrow") : t("are_you_a_teacher")}</button></p>
  </div></section>`;
}
