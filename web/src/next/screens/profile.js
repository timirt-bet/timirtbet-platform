// @ts-check
// "Profile" in the menu: your own account. Stats, your repository, finding people, and sign out.
import { html } from "htm/preact";
import { go, copyBtn } from "../legacy.js";
import { useState } from "preact/hooks";
import { t, tText } from "../i18n.js";
import { api } from "../api.js";
import { state } from "../state.js";
import { Avatar, FindForm, SignInNeeded } from "../components/people.js";

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
    <${AccountCard} />`;
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

function AccountCard() {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const signOut = async () => {
    setBusy(true);
    try { await api("POST", "/api/auth/logout"); window.TBNext.afterSignOut?.(false); }
    catch (e) { setError(/** @type {Error} */ (e).message); setBusy(false); }
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
    ${error && html`<p class="err" role="alert">${error}</p>`}
  </div></section>`;
}
