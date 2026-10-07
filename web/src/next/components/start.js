// @ts-check
// For newcomers: the three steps to start (a GitHub account, one sign-in, the invitation), the
// GitHub mark, and the sign-in page.
import { html } from "htm/preact";
import { go } from "../legacy.js";
import { t } from "../i18n.js";
import { state } from "../state.js";

export const GH = html`<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>`;

/** Signing in leaves the page for GitHub: remember where the learner was, to come back there. */
const remember = () => { try { sessionStorage.setItem("timirtbet.return", location.pathname); } catch (e) {} };

/** @param {{ label?: string }} props */
export const SignInLink = ({ label }) => html`<a class="btn gh-btn" href="/api/auth/github" onClick=${remember}>${GH}${label || t("sign_in_with_github")}</a>`;

/** @param {{ compact?: boolean }} props */
export function StartSteps({ compact }) {
  return html`<ol class=${"start-steps" + (compact ? " compact" : "")}>
    <li><b>${t("create_a_free_github_account")}</b><span>${t("timirtbet_uses_github_for_your_code")} <a href="https://github.com/signup" target="_blank" rel="noopener">${t("sign_up_on_github")}</a> ${t("about_2_minutes_already_have_one")}</span></li>
    <li><b>${t("sign_in_here_with_github")}</b><span>${t("no_new_password_you_get_your")}</span></li>
    <li><b>${t("accept_the_invitation")}</b><span>${t("github_emails_you_an_invitation_to")}</span></li></ol>`;
}

/** /signin: how to get started. Signed in, it is the account page instead. */
export function SigninScreen() {
  if (state.me.value) { setTimeout(() => go("profile")); return null; }
  return html`<section class="panel narrow"><div class="pad">
    <h1 class="pg-h" style="font-size:26px">${t("get_started_with_github")}</h1>
    <p class="lede">${t("timirtbet_uses_your_github_account_instead")}</p>
    <${StartSteps} />
    <div style="margin-top:16px"><${SignInLink} label=${t("continue_with_github")} /></div>
    <p class="muted" style="font-size:13px;margin:14px 0 0">${t("timirtbet_asks_github_for_no_permissions")}</p>
  </div></section>`;
}
