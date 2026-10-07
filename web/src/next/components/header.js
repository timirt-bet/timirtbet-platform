// @ts-check
// The top bar on every screen: brand, the main sections, language, notifications and the
// learner's menu; on phones the sections move to a tab bar at the bottom. Also the short
// pop-up that announces a new notification.
import { html } from "htm/preact";
import { signal } from "@preact/signals";
import { useState, useEffect, useRef } from "preact/hooks";
import { go, openEx, old } from "../legacy.js";
import { t, tText, lang } from "../i18n.js";
import { api } from "../api.js";
import { state } from "../state.js";
import { Avatar } from "./people.js";
import { leftText } from "./clock.js";
import { ago, unitTitle, stars } from "../reviewing.js";

/** The screen on show (the old router's V.view), set by app.js after each render. */
export const view = signal("challenges");
/** The notification to pop up briefly, or null. */
export const toastItem = signal(/** @type {any} */ (null));

const SECTION = /** @type {Record<string, string>} */ ({ track: "challenges", exercise: "challenges", review: "reviews", signin: "profile", user: "profile" });

/* ---------- icons (24px line icons, currentColor) ---------- */
/** @param {{ d: string }} props */
const Icon = ({ d }) => html`<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" dangerouslySetInnerHTML=${{ __html: d }}></svg>`;
const I = {
  challenges: '<path d="m8 9-3 3 3 3"/><path d="m16 9 3 3-3 3"/><path d="m13.5 6-3 12"/>',
  reviews: '<path d="M21 12a8 8 0 0 1-11.8 7L4 20l1.1-4.6A8 8 0 1 1 21 12Z"/><path d="m9 12 2 2 4-4"/>',
  circle: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.2A4.5 4.5 0 0 1 21 18.5"/>',
  profile: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
};
const GH = html`<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>`;

/** The main sections, with how many reviews are waiting. */
function sections() {
  const waiting = state.me.value ? state.queue.value.length : 0;
  return [
    { v: "challenges", label: t("challenges"), icon: I.challenges, badge: 0 },
    { v: "reviews", label: t("reviews"), icon: I.reviews, badge: waiting },
    { v: "circle", label: t("circle"), icon: I.circle, badge: 0 },
    { v: "profile", label: t("profile"), icon: I.profile, badge: 0 },
  ];
}

export function Header() {
  const me = state.me.value;
  const cur = SECTION[view.value] || view.value;
  const unread = me ? state.inbox.value.unread : 0;
  // "(3) Reviews · Timirtbet": unread notifications in the tab title.
  useEffect(() => { document.title = (unread ? `(${unread}) ` : "") + document.title.replace(/^\(\d+\) /, ""); }, [unread, view.value]);
  const secs = sections();
  return html`
    <div class="wrap top-in">
      <button class="brand" data-v="challenges" aria-label=${t("timirtbet_home")} onClick=${() => go("challenges")}>
        <span class="mark">ት</span><b>Timirtbet</b><span class="brand-am">ትምህርት ቤት</span></button>
      <nav class="main" id="nav" aria-label=${t("main_sections")}>
        ${secs.map((s) => html`<button key=${s.v} data-act="view" data-v=${s.v} aria-current=${cur === s.v ? "page" : undefined} onClick=${() => go(s.v)}>
          <${Icon} d=${s.icon} /><span>${s.label}</span>${s.badge > 0 && html` <span class="badge">${s.badge}</span>`}</button>`)}
      </nav>
      <div class="tools">
        <button class="lang-btn" id="langBtn" aria-label=${lang.value === "am" ? "Switch to English" : "ወደ አማርኛ ቀይር"}
          onClick=${() => window.TBOld.setLang(lang.value === "am" ? "en" : "am")}>${lang.value === "am" ? "EN" : "አማ"}</button>
        ${me && html`<${Bell} />`}
        <div id="who">${me ? html`<${Me} me=${me} />`
          : html`<button class="btn gh-btn small" data-act="view" data-v="signin" onClick=${() => go("signin")}>${GH}${t("sign_in")}</button>`}</div>
      </div>
    </div>`;
}

/** Outside the header (whose blur would trap fixed elements): the phone tab bar and the pop-up. */
export function Dock() {
  const cur = SECTION[view.value] || view.value;
  const secs = sections();
  return html`
    <nav class="tabbar" aria-label=${t("main_sections")}>
      ${secs.map((s) => html`<button key=${s.v} aria-current=${cur === s.v ? "page" : undefined} onClick=${() => go(s.v)}>
        <span class="tb-ic"><${Icon} d=${s.icon} />${s.badge > 0 && html`<span class="badge">${s.badge}</span>`}</span><span>${s.label}</span></button>`)}
    </nav>
    <${Toast} />`;
}

/* ---------- the learner's menu ---------- */

/** @param {{ me: any }} props */
function Me({ me }) {
  const [open, setOpen] = useState(false);
  const ref = useOutside(open, () => setOpen(false));
  const to = (/** @type {() => void} */ f) => () => { setOpen(false); f(); };
  const signOut = async () => { setOpen(false); try { await api("POST", "/api/auth/logout"); } finally { window.TBNext.afterSignOut?.(false); } };
  return html`<div class="me-wrap" ref=${ref}>
    <button class="who" aria-haspopup="true" aria-expanded=${String(open)} onClick=${() => setOpen(!open)}>
      <${Avatar} login=${me.login} size="sm" /><span class="mono">@${me.login}</span><span class="caret" aria-hidden="true"></span></button>
    ${open && html`<div class="menu" role="menu">
      <div class="menu-h"><b class="mono">@${me.login}</b><span class="muted">${t("pts_n", { n: me.points })} · ${tText(me.reviewer.level)}</span></div>
      <button role="menuitem" onClick=${to(() => go("profile"))}><${Icon} d=${I.profile} />${t("your_account")}</button>
      <button role="menuitem" onClick=${to(() => go("user", { login: me.login, utab: null }))}><${Icon} d=${I.circle} />${t("your_public_profile").replace(/\s*→$/, "")}</button>
      <button role="menuitem" class="danger-item" onClick=${signOut}><${Icon} d=${I.out} />${t("sign_out")}</button>
    </div>`}
  </div>`;
}

/** Closes a pop-up on a click outside it or on Escape. @param {boolean} open @param {() => void} close */
function useOutside(open, close) {
  const ref = useRef(/** @type {HTMLElement | null} */ (null));
  useEffect(() => {
    if (!open) return;
    const down = (/** @type {MouseEvent} */ e) => { if (ref.current && !ref.current.contains(/** @type {Node} */ (e.target))) close(); };
    const key = (/** @type {KeyboardEvent} */ e) => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", down); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key); };
  }, [open]);
  return ref;
}

/* ---------- notifications ---------- */

/** What a notification says. @param {{ n: any }} props */
function NotifText({ n }) {
  const u = html`<b>${unitTitle(n.unitId)}</b>`;
  const who = html`<b class="mono">@${n.from || ""}</b>`;
  switch (n.kind) {
    case "review_assigned": return html`<span>${t("new_review_to_write")}</span> ${u}<span class="nt-sub">${t("due_within_72_hours")}</span>`;
    case "review_due": return html`<span>${t("reminder_review_due_within_24_hours")}</span> ${u}`;
    case "review_moved": return html`<span>${t("n72_hours_passed_so_this_review")}</span> ${u}`;
    case "review_received": return html`<span>${t("your_module_was_reviewed_rate_the")}</span> ${u}`;
    case "review_rated": return html`<span>${t("your_review_was_rated")}</span> <span class="starsv">${stars(n.stars)}</span> <span class="mono">${n.points > 0 ? "+" : ""}${t("pts_n", { n: n.points })}</span><span class="nt-sub">${unitTitle(n.unitId)}</span>`;
    case "level_up": return html`<span>${t("you_reached_a_new_reviewer_level")}</span> <b>${tText(n.level)}</b>`;
    case "second_opinion": return html`<span>${t("a_mentor_added_a_second_opinion")}</span> ${u}`;
    case "push_passed": return html`<span>${t("your_push_passed_and_is_saved")}</span> ${u}`;
    case "push_failed": return html`<span>${t("your_push_did_not_pass_yet")}</span> ${u}<span class="nt-sub">${t("tests_passed_n", { passed: n.passed, total: n.total })}</span>`;
    case "module_ready": return html`<span>${t("module_finished_submit_it_for_review")}</span> ${u}`;
    case "review_nudge": return html`<span>${who} ${t("is_waiting_for_your_review_of")}</span> ${u}${n.dueAt && html`<span class="nt-sub">${leftText(Date.parse(n.dueAt) - Date.now())}</span>`}`;
    case "new_follower": return html`<span>${who} ${t("started_following_you")}</span>`;
    default: return html`<span>${t("something_changed")}</span>`;
  }
}
/** A little picture for each kind of notification. @param {string} kind */
const kindIcon = (kind) => ({ review_assigned: "✎", review_due: "⏳", review_nudge: "⏳", review_moved: "↪", review_received: "★", review_rated: "★", level_up: "▲", second_opinion: "✦", push_passed: "✓", push_failed: "✕", module_ready: "↑", new_follower: "+" })[kind] || "•";
const kindTone = (/** @type {string} */ kind) => ["push_failed", "review_due", "review_nudge", "review_moved"].includes(kind) ? "warn" : ["push_passed", "level_up", "review_rated"].includes(kind) ? "ok" : "";

/** Where a notification takes the learner. @param {any} n */
export function openNotif(n) {
  toastItem.value = null;
  const EXM = (/** @type {string} */ id) => old.BANK.some((e) => e.id === id);
  const mod = old.MODULES.find((m) => m.id === n.unitId);
  if (["review_assigned", "review_due", "review_nudge"].includes(n.kind) && state.queue.value.some((q) => q.id === n.subId)) return go("review", { qid: n.subId });
  if (n.kind === "new_follower" && n.from) return go("user", { login: n.from, utab: null });
  if (["review_received", "second_opinion", "push_passed", "push_failed"].includes(n.kind) && n.exerciseId && EXM(n.exerciseId)) return openEx(n.exerciseId);
  if (n.kind === "module_ready" && mod) return openEx(mod.exercises[mod.exercises.length - 1]);
  go("reviews");
}

function Bell() {
  const [open, setOpen] = useState(false);
  const ref = useOutside(open, () => setOpen(false));
  const box = state.inbox.value;
  const toggle = async () => {
    const next = !open; setOpen(next);
    if (next && box.unread) {
      try { await api("POST", "/api/notifications/read"); } catch (e) {}
      state.inbox.value = { items: box.items.map((n) => ({ ...n, read: true })), unread: 0 };
    }
  };
  return html`<div class="bell-wrap" id="bellWrap" ref=${ref}>
    <button class="bell" id="bellBtn" aria-expanded=${String(open)} aria-haspopup="true"
      aria-label=${box.unread ? t("notifications_unread", { n: box.unread }) : t("notifications")} onClick=${toggle}>
      <${Icon} d=${I.bell} />${box.unread > 0 && html`<span class="bell-n" id="bellN">${box.unread > 9 ? "9+" : box.unread}</span>`}</button>
    ${open && html`<div class="bell-pop" id="bellPop" role="dialog" aria-label=${t("notifications")}>
      <div class="bell-h"><b>${t("notifications")}</b></div>
      ${box.items.length ? html`<ul class="bell-list">${box.items.map((n) => html`<li key=${n.id}>
          <button class=${"nt" + (n.read ? "" : " unread")} data-act="notif" data-id=${n.id} onClick=${() => { setOpen(false); openNotif(n); }}>
            <span class=${"nt-ic " + kindTone(n.kind)} aria-hidden="true">${kindIcon(n.kind)}</span>
            <span class="nt-body"><${NotifText} n=${n} /><span class="nt-time">${ago(Date.parse(n.at))}</span></span></button></li>`)}</ul>`
        : html`<p class="muted bell-empty">${t("nothing_yet_youll_hear_here_when")}</p>`}
      <p class="bell-note">${t("you_also_get_these_on_github")}</p>
    </div>`}
  </div>`;
}

function Toast() {
  const n = toastItem.value;
  useEffect(() => { if (!n) return; const k = setTimeout(() => { toastItem.value = null; }, 7000); return () => clearTimeout(k); }, [n]);
  if (!n) return null;
  return html`<div class="toast" id="toast" role="status">
    <button class="toast-in" data-act="notif" data-id=${n.id} onClick=${() => openNotif(n)}>
      <span class=${"nt-ic " + kindTone(n.kind)} aria-hidden="true">${kindIcon(n.kind)}</span><span><${NotifText} n=${n} /></span></button>
    <button class="toast-x" aria-label=${t("close")} onClick=${() => { toastItem.value = null; }}>×</button>
  </div>`;
}
