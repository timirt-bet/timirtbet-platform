// @ts-check
// A learner's public profile at /u/<login>: progress, modules, reviewer level,
// followers and following, and Follow / Unfollow.
import { html } from "htm/preact";
import { go, modNum, old } from "../legacy.js";
import { useEffect, useState } from "preact/hooks";
import { t, tText } from "../i18n.js";
import { api } from "../api.js";
import { state } from "../state.js";
import { Avatar, PersonLink, FindForm, SignInNeeded } from "../components/people.js";

/** @param {{ route: Route }} props */
export function UserScreen({ route }) {
  const me = state.me.value;
  const login = route.login || "";
  /** @type {[any, (u: any) => void]} */
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  /** @type {["followers" | "following" | null, (t: "followers" | "following" | null) => void]} */
  const [tab, setTab] = useState(/** @type {"followers" | "following" | null} */ (null));
  /** @type {[any, (p: any) => void]} */
  const [people, setPeople] = useState(null);
  const [busy, setBusy] = useState(false);

  // (Re)load whenever the address names another learner.
  useEffect(() => {
    if (!me) return;
    let live = true;
    setUser(null); setError(""); setTab(null); setPeople(null);
    api("GET", "/api/users/" + encodeURIComponent(login))
      .then((r) => {
        if (!live) return;
        setUser(r.user);
        // Show the name as the learner spells it, in the address too.
        if (r.user.login !== login) { route.login = r.user.login; if (old.ROUTED) history.replaceState(null, "", `/u/${encodeURIComponent(r.user.login)}`); }
      })
      .catch((e) => live && setError(e.status === 404 ? t("no_learner_with_that_github_username") : e.message));
    return () => { live = false; };
  }, [login.toLowerCase(), !!me]);

  /** @param {"followers" | "following" | null} next */
  const openTab = async (next) => {
    setTab(next); setPeople(null);
    if (!next || !user) return;
    try { setPeople((await api("GET", `/api/users/${encodeURIComponent(user.login)}/${next}`)).people); }
    catch (e) { setPeople({ error: /** @type {Error} */ (e).message }); }
  };
  const toggleFollow = async () => {
    const on = !user.isFollowing;
    setBusy(true);
    try {
      await api(on ? "POST" : "DELETE", `/api/users/${encodeURIComponent(user.login)}/follow`);
      setUser({ ...user, isFollowing: on, followers: user.followers + (on ? 1 : -1) });
      if (tab === "followers") openTab("followers");
    } finally { setBusy(false); }
  };

  if (!me) return html`<${SignInNeeded} message=${t("sign_in_to_see_other_learners")} />`;
  if (error) return html`
    <button class="back" data-act="view" data-v="circle" onClick=${() => go("circle")}>${t("back")}</button>
    <h1 class="pg-h mono">@${login}</h1><p class="lede">${error}</p><${FindForm} />`;
  if (!user) return html`<p class="muted" style="padding:40px 0">${t("loading_user", { login })}</p>`;

  const r = user.reviewer;
  const joined = user.joined ? " · " + t("joined_date", { date: new Date(user.joined).toLocaleDateString(undefined, { month: "short", year: "numeric" }) }) : "";
  return html`
    <div class="ex-head user-head">
      <div class="lrn big"><${Avatar} login=${user.login} size="lg" /><div>
        <p class="eyebrow" style="margin:0">${user.circle ? t("member_of_circle", { name: user.circle }) : t("learner")}${joined}</p>
        <h1 class="pg-h mono">@${user.login}</h1>
        <div class="fol-row">
          <button class="linkish" data-act="utab" data-t="followers" aria-current=${tab === "followers" ? "true" : undefined} onClick=${() => openTab("followers")}>
            <b>${user.followers}</b> ${user.followers === 1 ? t("follower_label") : t("followers_label")}</button>
          <button class="linkish" data-act="utab" data-t="following" aria-current=${tab === "following" ? "true" : undefined} onClick=${() => openTab("following")}>
            <b>${user.following}</b> ${t("following_label")}</button>
          <a class="linkish" href=${"https://github.com/" + user.login} target="_blank" rel="noopener">${t("github_link")}</a>
        </div>
      </div></div>
      ${user.isMe
        ? html`<button class="btn" data-act="view" data-v="profile" onClick=${() => go("profile")}>${t("your_account")}</button>`
        : html`<button class=${"btn" + (user.isFollowing ? "" : " primary")} data-act="follow" data-login=${user.login}
            aria-pressed=${String(user.isFollowing)} disabled=${busy} onClick=${toggleFollow}>${user.isFollowing ? t("following_check") : t("follow")}</button>`}
    </div>
    ${tab && html`<section class="panel"><h2>${tab === "followers" ? t("followers_title") : t("following_title")}
        <button class="linkish" data-act="utab" data-t="" style="float:right;font-weight:500" onClick=${() => openTab(null)}>${t("close")}</button></h2>
      <div class="pad"><${PeopleList} people=${people} tab=${tab} user=${user} /></div></section>`}
    <div class="stats">
      <div class="stat"><div class="v">${user.points}</div><div class="l">${t("points_2")}</div></div>
      <div class="stat"><div class="v">${user.solved}<small>/${old.BANK.length}</small></div><div class="l">${t("challenges_solved")}</div></div>
      <div class="stat"><div class="v">${user.modulesReviewed}</div><div class="l">${t("modules_reviewed")}</div></div>
      <div class="stat"><div class="v">${user.reviewsGiven}</div><div class="l">${t("reviews_written")}</div></div>
    </div>
    <div class="two">
      <section class="panel"><h2>${t("modules")}</h2><div class="pad"><${ModuleProgress} solved=${user.solvedIds || []} /></div></section>
      <section class="panel"><h2>${t("as_a_reviewer")}</h2><div class="pad">
        <div class="prof-top"><div>
          <div class="big">${r.score.toFixed(2)}<small> ${t("score")}</small></div>
          <div class="muted" style="font-size:13px">${t("rated_reviews_n", { n: r.ratings })}</div></div>
          <span class=${"lvl lvl" + r.levelIndex}>${tText(r.level)}</span></div>
        <div class="rep-row"><span class="mono">${t("pts_reputation_n", { n: r.reputation })}</span></div>
      </div></section>
    </div>`;
}

/** @param {{ people: any, tab: "followers" | "following", user: any }} props */
function PeopleList({ people, tab, user }) {
  if (!people) return html`<p class="muted">${t("loading")}</p>`;
  if (people.error) return html`<p class="err">${people.error}</p>`;
  if (!people.length) {
    const msg = tab === "followers"
      ? (user.isMe ? t("nobody_follows_you_yet") : t("nobody_follows_user", { login: user.login }))
      : (user.isMe ? t("you_dont_follow_anyone_yet") : t("user_follows_nobody", { login: user.login }));
    return html`<p class="muted">${msg}</p>`;
  }
  return html`<ul class="people">${people.map((/** @type {any} */ x) => html`<li key=${x.login}>
    <${Avatar} login=${x.login} size="sm" /><${PersonLink} login=${x.login} />
    <span class=${"lvl lvl" + x.levelIndex + " sm"}>${tText(x.level)}</span>
    <span class="mono muted">${t("pts_n", { n: x.points })}</span></li>`)}</ul>`;
}

/** Each module's dot and count, for both languages. @param {{ solved: string[] }} props */
function ModuleProgress({ solved }) {
  const has = new Set(solved);
  return ["js", "go"].map((lang) => html`<div class="pm-lang" key=${lang}><b>${old.LANGN[lang]}</b><ul class="pm-list">
    ${old.MODULES.filter((m) => m.lang === lang).map((m) => {
      const n = m.exercises.filter((id) => has.has(id)).length, total = m.exercises.length;
      return html`<li key=${m.id} class=${n === total ? "done" : n ? "started" : "todo"}
          title=${t("module_progress", { n: modNum(m), title: tText(m.title), done: n, total })}>
        <span class="ms-dot" aria-hidden="true"></span><span>${modNum(m)}. ${tText(m.title)}</span>
        <span class="mono muted">${n}/${total}</span></li>`;
    })}</ul></div>`);
}
