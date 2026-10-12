// @ts-check
// "Timirtbet on your home screen": installing the site as an app.
// - Android and desktop Chrome/Edge: the browser's own install prompt (beforeinstallprompt).
// - iPhone and iPad: browsers there cannot be asked from a page, so a sheet shows the steps (Share,
//   then Add to Home Screen), with the Share icon drawn as the browser shows it.
// - Apps' built-in browsers (Telegram, Instagram, Facebook): open the page in the real browser first.
// The small card shows itself when installing is possible; closing it only hides it for a while
// (AGAIN_MS), and it comes back on every visit until the app is installed.
// "Get the app" (home page, account menu) opens the steps any time. sw.js keeps the last page so the
// installed app opens without a connection.
import { html } from "htm/preact";
import { signal } from "@preact/signals";
import { t } from "../i18n.js";
import { CapyMark } from "./capy.js";

/** After the card is closed, it comes back this much later (and on every visit) until installed. */
export const AGAIN_MS = 10 * 60 * 1000;
/** @type {import("@preact/signals").Signal<any>} */
const ask = signal(null);
const card = signal(false), sheet = signal(false);
export const installed = () => matchMedia("(display-mode: standalone)").matches || /** @type {any} */ (navigator).standalone === true;
const ua = navigator.userAgent;
const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const inApp = /Telegram|Instagram|FBAN|FBAV|FB_IAB|Line\/|; wv\)/i.test(ua);
const iosOther = ios && /CriOS|FxiOS|EdgiOS/.test(ua);
if (ios && !installed()) card.value = true;
addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); ask.value = e; if (!again) card.value = true; });
addEventListener("appinstalled", () => { ask.value = null; card.value = sheet.value = false; });
if ("serviceWorker" in navigator && location.protocol === "https:") addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));

/** "Get the app": the browser's prompt where there is one, otherwise the steps. */
export async function openInstall() {
  const e = ask.value;
  if (!e) { sheet.value = true; return; }
  ask.value = null; e.prompt();
  if ((await e.userChoice).outcome === "accepted") card.value = false;
}
/** @type {any} */
let again = 0;
function close() {
  card.value = false; clearTimeout(again);
  again = setTimeout(() => { again = 0; if (!installed() && (ios || ask.value)) card.value = true; }, /** @type {any} */ (window).TB_INSTALL_AGAIN_MS || AGAIN_MS);
}

const SHARE = html`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4M6 11H5v10h14V11h-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const PLUS = html`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
const DOTS = html`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>`;

/** The steps for this phone. */
function steps() {
  if (inApp) return [html`${t("install_inapp_1")} ${DOTS}`, t("install_inapp_2")];
  if (ios) return [html`${iosOther ? t("install_ios_1b") : t("install_ios_1")} ${SHARE}`, html`${t("install_ios_2")} ${PLUS}`, t("install_ios_3")];
  return [html`${t("install_and_1")} ${DOTS}`, t("install_and_2"), t("install_and_3")];
}

export function InstallCard() {
  if (installed()) return null;
  return html`
    ${card.value && !sheet.value && html`<aside class="install" id="install" role="dialog" aria-label=${t("install_title")}>
      <${CapyMark} cls="mark install-mark" />
      <div class="install-t"><b>${t("install_title")}</b><span>${t("install_text")}</span></div>
      <button class="btn dark small" data-act="install" onClick=${openInstall}>${ask.value ? t("install") : t("install_how")}</button>
      <button class="install-x" aria-label=${t("close")} onClick=${close}>×</button></aside>`}
    ${sheet.value && html`<div class="sheet-bg" onClick=${(/** @type {any} */ e) => { if (e.target === e.currentTarget) sheet.value = false; }}>
      <section class="sheet" id="installSheet" role="dialog" aria-modal="true" aria-label=${t("install_title")}>
        <div class="sheet-h"><${CapyMark} cls="mark install-mark" /><b>${t("install_title")}</b>
          <button class="install-x" aria-label=${t("close")} onClick=${() => { sheet.value = false; }}>×</button></div>
        <ol class="sheet-steps">${steps().map((s, i) => html`<li key=${i}><span>${s}</span></li>`)}</ol>
        <p class="muted sheet-note">${t("install_note")}</p>
      </section></div>`}`;
}

/** On the home page: a lasting way to get the app. */
export function AppStrip() {
  if (installed()) return null;
  return html`<section class="app-strip" id="appStrip"><${CapyMark} cls="mark" />
    <div><b>${t("install_title")}</b><span>${t("install_text")}</span></div>
    <button class="btn dark" data-act="get-app" onClick=${openInstall}>${t("get_the_app")}</button></section>`;
}
