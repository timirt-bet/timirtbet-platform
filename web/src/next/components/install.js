// @ts-check
// "Timirtbet on your home screen": installing the site as an app. Android and desktop Chrome/Edge
// ask the browser (beforeinstallprompt); iPhone and iPad say how (Share, then Add to Home Screen);
// other browsers point to their menu. The card shows itself when the browser can install the site
// (closing it hides it until the next visit), and AppStrip / openInstall() bring it back any time.
// The service worker (/sw.js) lets the installed app open even without a connection.
import { html } from "htm/preact";
import { signal } from "@preact/signals";
import { t } from "../i18n.js";
import { CapyMark } from "./capy.js";

const KEY = "timirtbet.install";
/** @type {import("@preact/signals").Signal<any>} */
const ask = signal(null);
const open = signal(false);
const closed = (() => { try { return !!sessionStorage.getItem(KEY); } catch (e) { return false; } })();
export const installed = () => matchMedia("(display-mode: standalone)").matches || /** @type {any} */ (navigator).standalone === true;
const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
if (ios && !closed && !installed()) open.value = true;
addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); ask.value = e; if (!closed) open.value = true; });
addEventListener("appinstalled", () => { ask.value = null; open.value = false; });
if ("serviceWorker" in navigator && location.protocol === "https:") addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));

/** Shows the card (from a button). */
export const openInstall = () => { open.value = true; };
function close() { open.value = false; try { sessionStorage.setItem(KEY, "1"); } catch (e) {} }

export function InstallCard() {
  if (!open.value || installed()) return null;
  const install = async () => { const e = ask.value; ask.value = null; e.prompt(); if ((await e.userChoice).outcome === "accepted") open.value = false; };
  return html`<aside class="install" id="install" role="dialog" aria-label=${t("install_title")}>
    <${CapyMark} cls="mark install-mark" />
    <div class="install-t"><b>${t("install_title")}</b><span>${ask.value ? t("install_text") : ios ? t("install_ios") : t("install_menu")}</span></div>
    ${ask.value && html`<button class="btn dark small" data-act="install" onClick=${install}>${t("install")}</button>`}
    <button class="install-x" aria-label=${t("close")} onClick=${close}>×</button></aside>`;
}

/** On the home page: a lasting way to get the app. */
export function AppStrip() {
  if (installed()) return null;
  return html`<section class="app-strip" id="appStrip"><${CapyMark} cls="mark" />
    <div><b>${t("install_title")}</b><span>${t("install_text")}</span></div>
    <button class="btn dark" data-act="get-app" onClick=${openInstall}>${t("get_the_app")}</button></section>`;
}
