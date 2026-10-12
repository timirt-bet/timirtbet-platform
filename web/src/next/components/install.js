// @ts-check
// "Timirtbet on your home screen": offers to install the site as an app. Android and desktop
// Chrome/Edge ask the browser (beforeinstallprompt); on iPhone and iPad it says how (Share, then
// Add to Home Screen). Hidden inside the installed app and once closed.
import { html } from "htm/preact";
import { signal } from "@preact/signals";
import { t } from "../i18n.js";
import { CapyMark } from "./capy.js";

const KEY = "timirtbet.install";
/** @type {import("@preact/signals").Signal<any>} */
const ask = signal(null);
const closed = signal((() => { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } })());
const installed = () => matchMedia("(display-mode: standalone)").matches || /** @type {any} */ (navigator).standalone === true;
const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); ask.value = e; });
addEventListener("appinstalled", () => { ask.value = null; close(); });
function close() { closed.value = true; try { localStorage.setItem(KEY, "1"); } catch (e) {} }

export function InstallCard() {
  if (closed.value || installed() || !(ask.value || ios)) return null;
  const install = async () => { const e = ask.value; ask.value = null; e.prompt(); if ((await e.userChoice).outcome === "accepted") close(); };
  return html`<aside class="install" id="install" role="dialog" aria-label=${t("install_title")}>
    <${CapyMark} cls="mark install-mark" />
    <div class="install-t"><b>${t("install_title")}</b><span>${ask.value ? t("install_text") : t("install_ios")}</span></div>
    ${ask.value && html`<button class="btn dark small" data-act="install" onClick=${install}>${t("install")}</button>`}
    <button class="install-x" aria-label=${t("close")} onClick=${close}>×</button></aside>`;
}
