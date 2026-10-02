// @ts-check
// "Profile" in the menu: your own account. Stats, your repository, finding people,
// what Timirtbet stores, sign out, and deleting the account.
import { html } from "htm/preact";
import { go, copyBtn } from "../legacy.js";
import { useState } from "preact/hooks";
import { t, tText } from "../i18n.js";
import { api } from "../api.js";
import { state } from "../state.js";
import { Avatar, FindForm, SignInNeeded } from "../components/people.js";

/** @typedef {import("../i18n.js").MessageKey} MessageKey */

/** @type {[MessageKey, MessageKey][]} what Timirtbet keeps, and why */
const KEPT = [
  ["github_id_and_username", "to_sign_you_in_no_password"],
  ["your_code_and_test_results", "the_solutions_you_run_tests_on"],
  ["reviews_and_ratings", "reviews_you_write_and_get_and"],
  ["your_circle_and_who_you_follow", "so_reviews_and_updates_reach_the"],
];
/** @type {MessageKey[]} */
const NEVER = ["name", "email", "phone", "age", "school", "location", "password"];

export function ProfileScreen() {
  const me = state.me.value;
  if (!me) return html`<${SignInNeeded} message=${t("sign_in_with_github_to_get")} />`;
  const r = me.reviewer;
  return html`
    <div class="ex-head"><div class="lrn big"><${Avatar} login=${me.login} size="lg" /><div>
      <p class="eyebrow" style="margin:0">${t("signed_in_with_github")}</p>
      <h1 class="pg-h mono">@${me.login}</h1>
      <div class="fol-row"><button class="linkish" data-act="user" data-login=${me.login}
        onClick=${() => go("user", { login: me.login, utab: null })}>${t("your_public_profile")}</button></div>
    </div></div></div>
    <div class="stats">
      <${Stat} value=${me.points} label=${t("points_2")} />
      <${Stat} value=${me.solved} label=${t("challenges_solved")} />
      <${Stat} value=${r.score.toFixed(2)} label=${t("review_score_2")} />
      <${Stat} value=${r.reputation} label=${t("reputation_level", { level: tText(r.level) })} />
    </div>
    <div class="two">
      <${RepoCard} repo=${me.repo} />
      <section class="panel"><h2>${t("people")}</h2><div class="pad">
        <p class="muted" style="margin:0 0 10px;font-size:13.5px">${t("follow_classmates_to_keep_up_with")}</p>
        <${FindForm} />
      </div></section>
    </div>
    <${DataCard} />
    <${AccountCard} me=${me} />`;
}

/** @param {{ value: string | number, label: string }} props */
function Stat({ value, label }) {
  return html`<div class="stat"><div class="v">${value}</div><div class="l">${label}</div></div>`;
}

/** @param {{ repo: string | null }} props */
function RepoCard({ repo }) {
  return html`<section class="panel"><h2>${t("your_repository")}</h2><div class="pad">
    ${repo ? html`
      <div class="cmd"><code id="cloneCmd">git clone https://github.com/${repo}.git</code>
        <button class="btn small" data-act="copy" data-id="cloneCmd" onClick=${(/** @type {any} */ e) => copyBtn(e.currentTarget, "cloneCmd")}>${t("copy")}</button></div>
      <p class="muted" style="font-size:13px">${t("accept_the_invitation_to_the_timirtbet")} <code>main</code>.</p>`
    : html`<p class="muted">${t("your_repository_is_being_set_up")}</p>`}
  </div></section>`;
}

function DataCard() {
  return html`<section class="panel data-card"><h2>${t("your_data")}</h2><div class="pad">
    <p class="dc-lede">${t("timirtbet_keeps_only_what_it_needs")}</p>
    <div class="dc-grid">
      <div><p class="dc-h">${t("what_we_keep")}</p><ul class="dc-list">
        ${KEPT.map(([what, why]) => html`<li key=${what}><span class="dc-ic ok" aria-hidden="true">✓</span><span><b>${t(what)}</b><small>${t(why)}</small></span></li>`)}
      </ul></div>
      <div><p class="dc-h">${t("what_we_never_ask_for")}</p>
        <ul class="dc-never">${NEVER.map((k) => html`<li key=${k}>${t(k)}</li>`)}</ul>
        <p class="dc-note">${t("no_tracking_or_advertising_cookies_either")}</p></div>
    </div>
    <div class="dc-actions">
      <a class="btn" href="/api/me/export" download="timirtbet-export.json"><span aria-hidden="true">⤓</span> ${t("download_my_data")}</a>
      <span class="muted">${t("one_json_file_with_everything_listed")}</span>
    </div>
  </div></section>`;
}

/** @param {{ me: any }} props */
function AccountCard({ me }) {
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const signOut = async () => {
    setBusy(true);
    try { await api("POST", "/api/auth/logout"); window.TBNext.afterSignOut?.(false); }
    catch (e) { setError(/** @type {Error} */ (e).message); setBusy(false); }
  };
  /** @param {SubmitEvent} e */
  const del = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try { await api("DELETE", "/api/me", { confirm: typed.trim() }); window.TBNext.afterSignOut?.(true); }
    catch (err) { setError(/** @type {Error} */ (err).message); setBusy(false); }
  };

  return html`<section class="panel acct-card"><h2>${t("account")}</h2><div class="pad">
    <div class="acct-row">
      <div><b>${t("sign_out")}</b><p>${t("signs_you_out_of_timirtbet_on")}</p></div>
      ${confirming
        ? html`<span class="confirm">
            <button class="btn small" data-act="live-signout" disabled=${busy} onClick=${signOut}>${t("yes_sign_out")}</button>
            <button class="btn small" data-act="confirm-no" onClick=${() => setConfirming(false)}>${t("cancel")}</button></span>`
        : html`<button class="btn" data-act="signout" onClick=${() => setConfirming(true)}>${t("sign_out")}</button>`}
    </div>
    <details class="danger">
      <summary><span><b>${t("delete_my_account")}</b><span class="danger-sub">${t("permanently_remove_your_account_and_repository")}</span></span></summary>
      <div class="danger-body">
        <p>${t("this_cant_be_undone_it_will")}</p>
        <ul>
          <li>${t("delete_your_progress_points_and_solutions")}</li>
          <li>${t("delete_your_repository")} <span class="mono">${me.repo || ""}</span> ${t("on_github")}</li>
          <li>${t("remove_you_from_the_timirtbet_organization")}</li>
          <li>${t("keep_reviews_you_wrote_without_your")}</li>
        </ul>
        <form class="form" data-form="delete" onSubmit=${del}>
          <label class="lbl-sm" for="delConfirm">${t("to_confirm_type")} <span class="mono">${me.login}</span></label>
          <input id="delConfirm" class="mono" autocomplete="off" spellcheck=${false} value=${typed}
            onInput=${(/** @type {any} */ e) => setTyped(e.currentTarget.value)} />
          <div id="delErr" class="err" role="alert">${error}</div>
          <button class="btn danger-btn" type="submit" id="delBtn" disabled=${busy || typed.trim() !== me.login}>${t("delete_my_account_forever")}</button>
        </form>
      </div>
    </details>
  </div></section>`;
}
