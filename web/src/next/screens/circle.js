// @ts-check
// "Circle" in the menu: the learner's review circle. Without one, forms to join with an invite
// code or start a circle; with one, the invite code, the leaderboard and leaving.
import { html } from "htm/preact";
import { copyBtn } from "../legacy.js";
import { useState } from "preact/hooks";
import { t, tText } from "../i18n.js";
import { api } from "../api.js";
import { state, refresh } from "../state.js";
import { Avatar, PersonLink, SignInNeeded } from "../components/people.js";

export function CircleScreen() {
  const me = state.me.value;
  const circle = state.circle.value;
  if (!me) return html`<${SignInNeeded} message=${t("sign_in_to_join_a_review")} />`;
  return circle ? html`<${CirclePage} me=${me} circle=${circle} />` : html`<${FindCircle} />`;
}

/**
 * Runs an API call for a form or button: shows "busy", then refreshes, or shows the error.
 * @returns {[boolean, string, (fn: () => Promise<unknown>) => Promise<void>]}
 */
function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async (/** @type {() => Promise<unknown>} */ fn) => {
    setBusy(true); setError("");
    try { await fn(); await refresh(); }
    catch (e) { setError(/** @type {Error} */ (e).message); }
    setBusy(false);
  };
  return [busy, error, run];
}

function FindCircle() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [track, setTrack] = useState("both");
  const [joining, joinErr, join] = useAction();
  const [creating, createErr, create] = useAction();
  const [nameErr, setNameErr] = useState("");

  /** @param {SubmitEvent} e */
  const onJoin = (e) => { e.preventDefault(); join(() => api("POST", "/api/circles/join", { code: code.trim().toUpperCase() })); };
  /** @param {SubmitEvent} e */
  const onCreate = (e) => {
    e.preventDefault();
    if (name.trim().length < 3) return setNameErr(t("give_the_circle_a_name_of"));
    setNameErr("");
    create(() => api("POST", "/api/circles", { name: name.trim(), track }));
  };
  /** @param {(v: string) => void} set */
  const input = (set) => (/** @type {any} */ e) => set(e.currentTarget.value);

  return html`
    <p class="eyebrow">${t("review_circle")}</p>
    <h1 class="pg-h">${t("find_your_circle")}</h1>
    <p class="lede">${t("a_circle_is_up_to_8")}</p>
    <div class="two" style="margin-top:20px">
      <form class="panel" data-form="join" onSubmit=${onJoin}><h2>${t("join_with_a_code")}</h2><div class="pad form">
        <label for="joinCode" class="lbl-sm">${t("invite_code")}</label>
        <input id="joinCode" class="mono" maxlength="8" autocomplete="off" spellcheck=${false} value=${code} onInput=${input(setCode)} />
        <div id="joinErr" class="err" role="alert">${joinErr}</div>
        <button class="btn primary" type="submit" disabled=${joining || !code.trim()}>${t("join_circle")}</button>
      </div></form>
      <form class="panel" data-form="create" onSubmit=${onCreate}><h2>${t("start_a_circle")}</h2><div class="pad form">
        <label for="cName" class="lbl-sm">${t("circle_name")}</label>
        <input id="cName" maxlength="40" value=${name} onInput=${input(setName)} />
        <label for="cTrack" class="lbl-sm">${t("language")}</label>
        <select id="cTrack" value=${track} onChange=${input(setTrack)}>
          <option value="both">${t("javascript_and_go")}</option>
          <option value="js">JavaScript</option>
          <option value="go">Go</option>
        </select>
        <div id="createErr" class="err" role="alert">${nameErr || createErr}</div>
        <button class="btn primary" type="submit" disabled=${creating}>${t("create_circle")}</button>
      </div></form>
    </div>`;
}

/** @param {{ me: any, circle: any }} props */
function CirclePage({ me, circle: c }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, error, run] = useAction();
  const owner = c.ownerId === me.id;
  const rows = c.members.slice().sort((/** @type {any} */ a, /** @type {any} */ b) => b.points - a.points);

  return html`
    <p class="eyebrow">${t("review_circle")}</p>
    <div class="ex-head"><h1 class="pg-h">${c.name}</h1>
      <div class="cmd" style="max-width:340px"><span class="muted" style="font-size:12.5px">${t("invite_code")}</span>
        <code id="inviteCode" class="mono">${c.inviteCode}</code>
        <button class="btn small" data-act="copy" data-id="inviteCode" onClick=${(/** @type {any} */ e) => copyBtn(e.currentTarget, "inviteCode")}>${t("copy")}</button>
        ${owner && html`<button class="btn small" data-act="rotate" disabled=${busy}
          onClick=${() => run(() => api("POST", `/api/circles/${c.id}/invite-code`))}>${t("new_code")}</button>`}
      </div></div>
    <p class="lede">${t("circle_members_lede", { n: c.members.length })}</p>
    ${error && html`<p class="err" role="alert">${error}</p>`}
    <div class="panel" style="margin-top:20px"><h2>${t("leaderboard")}</h2><div class="tbl"><table>
      <thead><tr><th>#</th><th>${t("learner")}</th><th>${t("points_2")}</th><th>${t("solved")}</th><th>${t("review_score_2")}</th><th>${t("level")}</th></tr></thead>
      <tbody>${rows.map((/** @type {any} */ x, /** @type {number} */ i) => html`<tr key=${x.id} class=${x.id === me.id ? "me" : ""}>
        <td class="mono">${i + 1}</td>
        <td><span class="lrn"><${Avatar} login=${x.login} size="sm" /><${PersonLink} login=${x.login} />${x.id === me.id && html` <span class="muted">${t("you")}</span>`}</span></td>
        <td class="mono">${x.points}</td>
        <td class="mono">${x.solved}</td>
        <td class="mono">${x.reviewer.score.toFixed(2)}</td>
        <td>${x.reviewer.probation
          ? html`<span class="st act">${t("probation")}</span>`
          : html`<span class=${"lvl lvl" + x.reviewer.levelIndex + " sm"}>${tText(x.reviewer.level)}</span>`}</td>
      </tr>`)}</tbody>
    </table></div></div>
    <section class="panel" style="margin-top:16px"><div class="pad">
      ${confirming
        ? html`<p style="margin:0 0 10px;font-size:14px">${t("leave_circle_confirm", { name: c.name })}</p>
            <div style="display:flex;gap:8px">
              <button class="btn" data-act="live-leave" disabled=${busy} onClick=${() => run(() => api("POST", "/api/circles/leave"))}>${t("leave_circle")}</button>
              <button class="btn" data-act="confirm-no" onClick=${() => setConfirming(false)}>${t("stay")}</button></div>`
        : html`<button class="linkish" data-act="leave" onClick=${() => setConfirming(true)}>${t("leave_this_circle")}</button>`}
    </div></section>`;
}
