// @ts-check
// The celebration when a challenge is solved for the first time (its pass is saved): confetti,
// "Challenge complete!", the points, and the next challenge. Shown once per challenge.
import { openEx, old, prefs, savePrefs, modNum } from "../legacy.js";
import { t, tText } from "../i18n.js";
import { state } from "../state.js";

const CONFETTI = ["#1F7A5A", "#F5C542", "#E0603A", "#3B82C4", "#9B5DE5", "#2EC4B6"];
const esc = (/** @type {string} */ s) => String(s).replace(/[&<>"']/g, (c) => /** @type {Record<string, string>} */ ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** @param {string} id */
export function celebrate(id) {
  const ex = old.BANK.find((e) => e.id === id);
  if (!ex || document.getElementById("hooray")) return;
  const S = prefs();
  S.celebrated = S.celebrated || {};
  if (S.celebrated[id]) return;
  S.celebrated[id] = 1; savePrefs();
  const m = old.MODULES.find((x) => x.exercises.includes(id));
  const next = m && m.exercises.find((x) => !state.saved.value.has(x)), modDone = !!m && !next;
  const nextEx = next && old.BANK.find((e) => e.id === next);
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const bits = calm ? "" : Array.from({ length: 90 }, (_, i) => {
    const c = CONFETTI[i % CONFETTI.length], x = Math.random() * 100, d = (Math.random() * 0.6).toFixed(2), dur = (2.4 + Math.random() * 1.6).toFixed(2);
    const r = Math.round(Math.random() * 720 - 360), dx = Math.round(Math.random() * 160 - 80), w = 6 + Math.round(Math.random() * 6);
    return `<i style="left:${x}%;background:${c};width:${w}px;height:${Math.round(w * 1.6)}px;--dx:${dx}px;--r:${r}deg;animation-delay:${d}s;animation-duration:${dur}s${i % 3 ? "" : ";border-radius:99px"}"></i>`;
  }).join("");
  const el = document.createElement("div");
  el.id = "hooray"; el.className = "hooray";
  el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-labelledby", "hoorayH");
  el.innerHTML = `<div class="confetti" aria-hidden="true">${bits}</div>
    <div class="hooray-card">
      <div class="hooray-badge" aria-hidden="true">✓</div>
      <p class="hooray-k">${esc(t("challenge_complete"))}</p>
      <h2 id="hoorayH">${esc(tText(ex.title))}</h2>
      <p class="hooray-sub">${esc(t("every_test_passed_and_your_solution"))}</p>
      <div class="hooray-pts"><b>+${old.ptsOf(ex)}</b> ${esc(t("points"))}</div>
      ${modDone && m ? `<p class="hooray-mod">${esc(t("finishes_module", { n: modNum(m) }))}</p>` : ""}
      <div class="hooray-act">${nextEx && !modDone ? `<button class="btn primary" data-hooray="next" data-id="${next}">${esc(t("next_title", { title: tText(nextEx.title) }))}</button>` : ""}<button class="btn${nextEx && !modDone ? "" : " primary"}" data-hooray="close">${esc(modDone ? t("great") : t("keep_going"))}</button></div>
      <p class="hooray-hint">${esc(t("click_anywhere_to_close"))}</p>
    </div>`;
  document.body.appendChild(el);
  const prev = /** @type {HTMLElement | null} */ (document.activeElement);
  /** @param {(() => void) | void} [then] */
  const close = (then) => {
    if (!el.isConnected) return;
    el.classList.add("out"); document.removeEventListener("keydown", onKey, true);
    setTimeout(() => { el.remove(); if (then) then(); else prev?.focus?.(); }, calm ? 0 : 220);
  };
  const onKey = (/** @type {KeyboardEvent} */ e) => { if (e.key === "Escape") { e.stopPropagation(); close(); } };
  document.addEventListener("keydown", onKey, true);
  el.addEventListener("click", (e) => {
    const b = /** @type {HTMLElement} */ (e.target).closest("[data-hooray]");
    if (b instanceof HTMLElement && b.dataset.hooray === "next") { const nx = b.dataset.id || ""; close(() => openEx(nx)); } else close();
  });
  requestAnimationFrame(() => { el.classList.add("in"); /** @type {HTMLElement | null} */ (el.querySelector(".hooray-act .btn"))?.focus(); });
}
