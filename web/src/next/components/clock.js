// @ts-check
// The 72-hour review clock: time left and a bar that empties as the deadline nears.
// Every clock on screen redraws from one `now` signal that ticks every 30 seconds.
import { html } from "htm/preact";
import { signal } from "@preact/signals";
import { t } from "../i18n.js";

const DAY = 864e5, REVIEW_MS = 3 * DAY;
export const now = signal(Date.now());
if (typeof window !== "undefined") setInterval(() => { now.value = Date.now(); }, 30000);

/** "2d 23h left", "5h 12m left", "8m left", or that time is up. @param {number} ms */
export function leftText(ms) {
  if (ms <= 0) return t("time_is_up_moving_to_another");
  const d = Math.floor(ms / DAY), h = Math.floor(ms % DAY / 36e5), m = Math.floor(ms % 36e5 / 6e4);
  return d ? t("left_dh", { d, h }) : h ? t("left_hm", { h, m }) : t("left_m", { m: Math.max(1, m) });
}
/** ok, then warn in the last day, hot in the last 6 hours. @param {number} ms */
export const urgency = (ms) => ms <= 6 * 36e5 ? "hot" : ms <= DAY ? "warn" : "ok";

/** @param {{ dueAt: string | null | undefined }} props */
export function Clock({ dueAt }) {
  if (!dueAt) return null;
  const ms = Date.parse(dueAt) - now.value;
  return html`<span class=${"due " + urgency(ms)} data-due=${dueAt} role="timer">
    <span class="due-t">${leftText(ms)}</span>
    <span class="due-bar" aria-hidden="true"><i style=${{ width: Math.max(0, Math.min(100, ms / REVIEW_MS * 100)) + "%" }}></i></span>
  </span>`;
}
