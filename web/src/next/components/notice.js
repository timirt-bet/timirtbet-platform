// @ts-check
// Shown once, after the first sign-in: what Timirtbet stores.
import { html } from "htm/preact";
import { useState } from "preact/hooks";
import { t } from "../i18n.js";
import { api } from "../api.js";
import { state } from "../state.js";

export function Notice() {
  const me = state.me.value;
  const [busy, setBusy] = useState(false);
  if (!me || me.noticeSeen) return null;
  const ok = async () => {
    setBusy(true);
    try { await api("POST", "/api/me/notice"); state.me.value = { ...me, noticeSeen: true }; } finally { setBusy(false); }
  };
  return html`<section class="panel" id="notice" style="margin-bottom:18px"><div class="pad">
    <b>${t("welcome_user", { login: me.login })}</b> ${t("timirtbet_stores_your_github_id_and")} <span class="mono">${me.repo || ""}</span>${t("the_code_you_submit_your_reviews")}
    <div style="margin-top:10px"><button class="btn primary small" data-act="notice-ok" disabled=${busy} onClick=${ok}>${t("ok")}</button></div>
  </div></section>`;
}
