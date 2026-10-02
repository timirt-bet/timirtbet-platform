// @ts-check
// Small pieces shown wherever learners appear: their avatar, a link to their profile,
// and the "find a learner" form.
import { html } from "htm/preact";
import { go } from "../legacy.js";
import { useState } from "preact/hooks";
import { t } from "../i18n.js";

/**
 * A round letter avatar with a colour that depends on the login, like the old avatar().
 * @param {{ login: string, size?: "sm" | "lg" }} props
 */
export function Avatar({ login, size }) {
  const hue = [...login].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return html`<span class=${"av" + (size ? " " + size : "")} style=${"--h:" + hue} aria-hidden="true">${login[0].toUpperCase()}</span>`;
}

/**
 * @login, linking to that learner's profile.
 * @param {{ login: string }} props
 */
export function PersonLink({ login }) {
  return html`<button class="linkish mono who-link" data-act="user" data-login=${login}
    onClick=${() => go("user", { login, utab: null })}>@${login}</button>`;
}

/** Find a learner by GitHub username and open their profile. */
export function FindForm() {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  /** @param {SubmitEvent} e */
  const submit = (e) => {
    e.preventDefault();
    const login = value.trim().replace(/^@/, "");
    if (!/^[\w-]{1,39}$/.test(login)) return setError(t("type_a_github_username"));
    go("user", { login, utab: null });
  };
  return html`<form class="form find-form" data-form="find" onSubmit=${submit}>
    <label class="lbl-sm" for="findLogin">${t("find_a_learner_by_github_username")}</label>
    <div class="find-row">
      <input id="findLogin" class="mono" maxlength="39" autocomplete="off" placeholder=${t("username_placeholder")}
        value=${value} onInput=${(/** @type {any} */ e) => { setValue(e.currentTarget.value); setError(""); }} />
      <button class="btn" type="submit">${t("open_profile")}</button>
    </div>
    ${error && html`<div class="err" role="alert">${error}</div>`}
  </form>`;
}

/**
 * Shown on screens that need an account, to a guest.
 * @param {{ message: string }} props
 */
export function SignInNeeded({ message }) {
  return html`<section class="panel narrow"><div class="pad center">
    <h1 class="pg-h" style="font-size:24px">${t("sign_in_with_github")}</h1>
    <p class="lede" style="margin:8px auto 16px">${message}</p>
    <button class="btn gh-btn" data-act="view" data-v="signin" onClick=${() => go("signin")}>${t("sign_in_with_github")}</button>
  </div></section>`;
}
