/* ---------- live mode: the same screens, backed by the Timirtbet API ---------- */
if(LIVE){
  // Shared data (me, circle, subs, queue, given, flagged, solved, saved, inbox, loaded) lives in
  // src/next/state.js as signals; L reads and writes them, so old and new screens agree.
  const L=TBNext.bridge({jobs:{},graded:{},graderFail:{},saveErr:{},modErr:{}});
  const api=TBNext.api;
  async function loadAll(){
    for(const k in (L.latest||{}))L.latest[k].stale=true;// refetch the latest push when the page is drawn again
    await TBNext.refresh();
    useAccount(L.me&&L.me.login);
    PUSH_ONLY=true;
    try{const back=sessionStorage.getItem("timirtbet.return");sessionStorage.removeItem("timirtbet.return");
      if(L.me&&back&&back!=="/"&&location.pathname==="/"&&ROUTED){history.replaceState(null,"",back);applyRoute(back);}}catch(e){}
    render();
    if(L.me)pollInbox(true);
  }

  /* ---------- whose work is on screen: each account, and guests, keep their own drafts in this browser ---------- */
  const ACCT=u=>`${KEY}:${u||"guest"}`,WHO="timirtbet.who",fetchedCode=new Set();
  let owner;// undefined until /api/me first answers
  save=function(){if(owner===undefined)return;try{localStorage.setItem(ACCT(owner),JSON.stringify(S));}catch(e){}};
  function flushEditor(){
    clearTimeout(draftT);
    const ed=document.getElementById("editor");
    if(ed&&V.view==="exercise"&&V.ex&&owner!==undefined)S.drafts[V.ex]=ed.value;
  }
  // Switches the drafts, local results and review draft to another account. Returns true if it changed.
  function useAccount(login){
    const k=login||null;if(owner===k)return false;
    if(owner!==undefined){flushEditor();save();}
    else{// first answer: whatever this browser kept before accounts were separated goes to whoever is here now
      try{const old=localStorage.getItem(KEY);if(old!=null){if(localStorage.getItem(ACCT(k))==null)localStorage.setItem(ACCT(k),old);localStorage.removeItem(KEY);}}catch(e){}
    }
    owner=k;
    let n=null;try{n=JSON.parse(localStorage.getItem(ACCT(k))||"null");}catch(e){}
    const prefs={track:S.track,diff:S.diff,statusF:S.statusF};
    S=n||{...seed(),...prefs};S.me=null;
    if(V.view==="exercise"&&EXM[V.ex])S.track=EXM[V.ex].lang;else if(V.view==="track")S.track=prefs.track;// the address decides the track
    fetchedCode.clear();V.rvDraft=null;V.confirm=null;L.latest={};
    try{if(localStorage.getItem(WHO)!==(k||""))localStorage.setItem(WHO,k||"");}catch(e){}
    return true;
  }
  // Notices a sign-in, sign-out or account change made in another tab, or a session that ended.
  let checking=false;
  async function checkSession(){
    if(checking||!L.loaded)return;checking=true;
    try{
      const r=await fetch("/api/me",{credentials:"same-origin"});
      if(r.status!==401&&!r.ok)return;
      const login=r.ok?((await r.json()).me||{}).login||null:null;
      if(login!==((L.me&&L.me.login)||null))await loadAll();
    }catch(e){}finally{checking=false;}
  }
  window.addEventListener("focus",checkSession);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)checkSession();});
  window.addEventListener("storage",e=>{if(e.key===WHO&&(e.newValue||null)!==((L.me&&L.me.login)||null))checkSession();});
  window.addEventListener("pagehide",()=>{flushEditor();save();});
  /* ---------- notifications: the bell, its list, live updates and a short pop-up ---------- */
  L.inbox={items:[],unread:0};
  // The bell, its list and the pop-up are in src/next/components/header.js; this keeps the inbox fresh.
  let pollT=null,lastTop=null;
  async function pollInbox(first){
    clearTimeout(pollT);
    if(!L.me)return;
    try{
      const box=await api("GET","/api/notifications");
      const top=box.items[0]&&box.items[0].id;
      const fresh=!first&&top&&top!==lastTop&&box.unread>0;
      L.inbox=box;lastTop=top;
      if(fresh){const n=box.items[0],was=n.kind==="push_passed"&&!L.saved.has(n.exerciseId);
        if(!was)TBNext.toast(n);await loadAll();
        if(was&&L.saved.has(n.exerciseId))celebrate(n.exerciseId);}
    }catch(e){if(e.status===401){checkSession();return;}}
    pollT=setTimeout(()=>pollInbox(false),document.hidden?180000:45000);
  }
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&L.me)pollInbox(false);});
  S.me=null;

  me=()=>L.me&&L.me.login;
  inCircle=login=>!!(L.circle&&L.circle.members.some(m=>m.login===login));
  myPoints=()=>L.me?L.me.points:BANK.filter(e=>passedEx(e.id)).reduce((a,e)=>a+ptsOf(e),0);
  const latestSub=id=>L.subs.filter(s=>s.exerciseId===id).sort((a,b)=>b.at.localeCompare(a.at))[0];
  const modSub=mid=>L.subs.filter(s=>s.moduleId===mid).sort((a,b)=>b.at.localeCompare(a.at))[0];
  moduleState=function(m){
    if(!L.me)return {passed:m.exercises.filter(id=>passedEx(id)).length,total:m.exercises.length,sub:null,ready:false,guest:true};
    const have=PUSH_ONLY?L.saved:L.solved;// with GitHub-only submission, a pass counts once it was pushed
    const passed=m.exercises.filter(id=>have.has(id)).length,sub=modSub(m.id),open=!!(sub&&sub.status!=="rated");
    // Passes from before solutions were kept have no code to send: those need one more run.
    const resave=m.exercises.filter(id=>L.solved.has(id)&&!L.saved.has(id));
    return {passed,total:m.exercises.length,sub,resave,err:L.modErr[m.id],ready:passed===m.exercises.length&&!resave.length&&!open};
  };
  // A learner's name, linking to their profile.
  const person=(login,cls)=>login?`<button class="linkish mono who-link${cls?" "+cls:""}" data-act="user" data-login="${esc(login)}">@${esc(login)}</button>`:"";
  /* ---------- the 72-hour review clock, shown to the author and the reviewer ---------- */
  const DAY=864e5,REVIEW_MS=3*DAY;
  function leftText(ms){
    if(ms<=0)return "Time is up: moving to another reviewer";
    const d=Math.floor(ms/DAY),h=Math.floor(ms%DAY/36e5),m=Math.floor(ms%36e5/6e4);
    return (d?`${d}d ${h}h`:h?`${h}h ${m}m`:`${Math.max(1,m)}m`)+" left";
  }
  const dueClass=ms=>ms<=6*36e5?"hot":ms<=DAY?"warn":"ok";
  // A countdown with a bar that empties as the deadline nears. Updated every 30 seconds.
  function clock(dueAt){
    if(!dueAt)return "";const ms=Date.parse(dueAt)-Date.now();
    return `<span class="due ${dueClass(ms)}" data-due="${esc(dueAt)}" role="timer"><span class="due-t">${leftText(ms)}</span><span class="due-bar" aria-hidden="true"><i style="width:${Math.max(0,Math.min(100,ms/REVIEW_MS*100))}%"></i></span></span>`;
  }
  setInterval(()=>{document.querySelectorAll("[data-due]").forEach(el=>{
    if(el.closest("[data-next]"))return;// new screens redraw their own clocks
    const ms=Date.parse(el.dataset.due)-Date.now();el.className="due "+dueClass(ms);
    el.querySelector(".due-t").textContent=leftText(ms);el.querySelector(".due-bar i").style.width=Math.max(0,Math.min(100,ms/REVIEW_MS*100))+"%";
  });},30000);
  // While a module is in review, its author sees who reviews it, the time left, and can nudge them.
  L.nudged={};
  function inReviewBox(sub){
    const r=sub.reviewer,wait=sub.nudgeAfter?Date.parse(sub.nudgeAfter)-Date.now():0,hrs=Math.ceil(wait/36e5);
    const nudge=wait>0?`<button class="btn small" disabled title="You can nudge again in ${hrs} h">Nudged · again in ${hrs} h</button>`:`<button class="btn small" data-act="nudge" data-id="${sub.id}">Nudge @${esc(r.login)}</button>`;
    return `<div class="in-review"><div class="ir-who">${avatar(r.login,"sm")}<span>Reviewed by ${person(r.login)} <span class="lvl lvl${r.levelIndex||0} sm">${esc(r.level)}</span></span></div>
      ${clock(sub.dueAt)}
      <div class="ir-foot">${nudge}<span class="muted">${L.nudged[sub.id]?`Sent. @${esc(r.login)} got a notification here and on GitHub.`:"Reviews are due within 72 hours. After that, the module moves to another reviewer."}</span></div></div>`;
  }
  const baseFoot=moduleFoot;
  moduleFoot=function(m,ms,inline){
    const sub=ms.sub;
    if(L.me&&sub&&sub.status==="awaiting_review"&&sub.reviewer&&sub.dueAt){
      if(inline)return `<span class="st wait">In review</span>${inReviewBox(sub)}`;
      return `<span class="muted">Reviewer</span>${person(sub.reviewer.login)}${clock(sub.dueAt)}`;// the module header already says "In review"
    }
    return baseFoot(m,ms,inline);
  };
  const prof=()=>L.me?L.me.reviewer:{score:3.5,reputation:0,level:"New",levelIndex:0,ratings:0};

  const baseRender=render;
  render=function(){
    if(!L.loaded){app.innerHTML=`<p class="muted" style="padding:40px 0">Loading…</p>`;return;}
    baseRender();
    if(V.view==="exercise"&&V.ex)loadLatest(V.ex);
    if(V.view==="exercise"&&V.keepRun&&V.keepRun.id===V.ex){const l=document.getElementById("testList"),s=document.getElementById("tSum");if(l&&s){l.innerHTML=V.keepRun.html;if(!L.saved.has(V.ex))s.outerHTML=V.keepRun.sum;if(V.keepRun.ok)document.getElementById("testSec").classList.add("celebrate");}}
    if(L.me&&!L.me.noticeSeen&&!document.getElementById("notice")&&!app.hasAttribute("data-next")){// new screens show it themselves
      app.insertAdjacentHTML("afterbegin",`<section class="panel" id="notice" style="margin-bottom:18px"><div class="pad"><b>Welcome, @${esc(L.me.login)}.</b> Timirtbet stores your GitHub id and username, your repository <span class="mono">${esc(L.me.repo||"")}</span>, the code you submit, your reviews and your circle. Nothing else. It is stored on Google Cloud in the United States. <div style="margin-top:10px"><button class="btn primary small" data-act="notice-ok">OK</button></div></div></section>`);
    }
  };
  // The home and track pages (progress, circle card) are in src/next/screens/home.js.
  // Solved means a push passed the grader. Passes from the old in-browser editor need one push.
  passedEx=id=>L.saved.has(id);
  // A challenge row shows only that challenge's own state. Reviews are per module (shown on the
  // module); single-challenge reviews from before modules existed are not shown on rows.
  status=function(id){if(L.saved.has(id))return {k:"pass",l:"Solved"};if(L.solved.has(id))return {k:"try",l:"Passed · push to submit"};return {k:"new",l:"Not solved"};};
  canSubmit=function(ex,code){const r=S.res[ex.id],sub=latestSub(ex.id);return !!(L.me&&r&&r.code===code&&r.p===r.t&&!(sub&&sub.status!=="rated")&&!L.jobs[ex.id]);};
  hint=function(ex,code){
    if(!L.me)return "Your code stays in this browser. Sign in to save progress. Ctrl+Enter runs.";
    if(PUSH_ONLY)return L.saved.has(ex.id)?"Solved and saved from your repository ✓":"Tests run here for practice. Push to your repository to submit. Ctrl+Enter runs.";
    if(L.jobs[ex.id])return "Checking your solution on the grader…";
    if(L.graderFail[ex.id]===code)return "The grader found a problem. Fix it and run again.";
    if(L.saveErr[ex.id]===code)return "Not saved. Run the tests again to retry.";
    if(L.graded[ex.id]===code&&L.solved.has(ex.id))return "Saved to your progress ✓";
    if(L.solved.has(ex.id))return "Solved. Run the tests to save this version instead.";
    return "When every test passes, your solution is saved automatically. Ctrl+Enter runs.";};
  ghPanel=function(ex){
    const file=solutionFile(ex),repo=L.me.repo||"";
    if(PUSH_ONLY)return `<details class="panel gh"${L.saved.size?"":" open"}><summary>How to submit from GitHub</summary><div class="pad gh-how">
      <p class="muted">Solutions are submitted from your own GitHub repository, <a class="mono" href="https://github.com/${esc(repo)}" target="_blank" rel="noopener">${esc(repo||"your repository")}</a>. The editor here is for practice.</p>
      <ol><li>Accept the invitation to the organization that GitHub emailed you (once).</li>
      <li>Edit <code>${file}</code>: on GitHub in the browser, or on your computer after cloning.</li>
      <li>Commit and push to <code>main</code>, then press Run the tests on the challenge page.</li></ol>
      <pre class="shell mono">git clone https://github.com/${esc(repo)}.git
cd ${esc(repo.split("/")[1]||"your-repo")}
# edit ${file}, then:
git add ${file}
git commit -m "${esc(ex.title)}"
git push</pre></div></details>`;
    return `<details class="panel gh"><summary>Or push from your GitHub repository</summary><div class="pad"><p class="muted" style="font-size:13.5px;margin:0 0 8px">Edit <code>${file}</code> in <span class="mono">${esc(repo||"your repository")}</span> and push to <code>main</code>. The same grader runs, and a pass counts just like Submit.</p><pre class="shell mono">git clone https://github.com/${esc(repo)}.git
git add ${file}
git commit -m "${esc(ex.title)}"
git push</pre></div></details>`;
  };
  function solutionFile(ex){return ex.lang==="js"?`js/${ex.id}/solution.js`:`go/${ex.id.replace(/-/g,"_")}/solution.go`;}
  function reviewBlock(sub){
    let b=`<div class="review"><div class="rv-h"><b>The review</b><span class="rub">${[["correctness","Correctness"],["readability","Readability"],["style","Style"]].map(([k,n])=>`<span>${n}: <b>${RUBV[sub.review.rubric[k]]}</b></span>`).join("")}</span></div><p>${esc(sub.review.text)}</p></div>`;
    if(sub.status==="reviewed")b+=`<div class="rate"><b>How helpful was this review?</b><div class="stars-in" role="group" aria-label="Rate the review">${[1,2,3,4,5].map(n=>`<button data-act="rate" data-s="${n}" data-sub="${sub.id}" aria-label="${n} star${n>1?"s":""}">★</button>`).join("")}</div><span class="muted" style="font-size:12.5px">1 = not helpful · 5 = specific and useful</span></div>`;
    else{b+=`<div class="stage-box"><b>You rated it</b><span class="starsv">${stars(sub.rating)}</span></div>`;
      const d=L.delta&&L.delta[sub.id];if(d)b+=`<div class="stage-box"><b>Their review score</b><span class="mono">${d.before.score.toFixed(2)} → <b>${d.after.score.toFixed(2)}</b></span></div><div class="stage-box"><b>Their reputation</b><span class="mono">${d.before.reputation} → <b>${d.after.reputation}</b> pts</span><span class="lvl lvl${d.after.levelIndex} sm">${d.after.level}</span></div>`;
      if(sub.secondOpinion)b+=`<div class="review"><div class="rv-h"><b>A Mentor's second opinion</b></div><p>${esc(sub.secondOpinion.text)}</p></div>`;}
    return b;
  }
  peerPanel=function(ex){
    const m=MODOF[ex.id];if(!m)return "";
    const ms=moduleState(m);const done=id=>L.me?L.solved.has(id):passedEx(id);
    // green = solved and saved, yellow = started (opened, or pushed without passing yet), grey = not started
    const st=id=>done(id)?"done":((S.opened||{})[id]||L.solved.has(id)||(L.latest[id]&&L.latest[id].result))?"started":"todo";
    const lbl={done:"Solved",started:"Started",todo:"Not started"};
    const list=`<ul class="mod-list">${m.exercises.map(id=>{const s=st(id);return `<li class="${s}${id===ex.id?" cur":""}"><span class="ms-dot" role="img" aria-label="${lbl[s]}"></span>${id===ex.id?`<b>${esc(EXM[id].title)}</b>`:`<button class="linkish" data-act="open" data-id="${id}">${esc(EXM[id].title)}</button>`}</li>`;}).join("")}</ul>`;
    const sub=ms.sub;
    return `<section class="panel pr"><h2>Module review</h2><div class="pad"><p class="eyebrow" style="margin:0 0 4px">Module ${modNum(m)} · ${ms.passed}/${ms.total} passed</p><b>${esc(m.title)}</b>${list}<div class="mod-foot">${moduleFoot(m,ms,true)}</div>${sub&&sub.review?`<div class="stages">${reviewBlock(sub)}</div>`:""}</div></section>`;
  };
  /* ---------- the challenge page: no editor. Learners write code in their own repository and push it;
     this page shows the task, the tests, how to submit, and the result of their latest push. ---------- */
  function nextStep(ex){
    const m=MODOF[ex.id];if(!m)return "";
    const ms=moduleState(m),todo=m.exercises.find(id=>!L.saved.has(id));
    if(todo)return `Module ${modNum(m)}: ${ms.passed} of ${ms.total} done. <button class="linkish" data-act="open" data-id="${todo}">Next: ${esc(EXM[todo].title)} →</button>`;
    if(ms.ready)return `That completes Module ${modNum(m)}. <button class="btn small primary" data-act="submit-module" data-id="${m.id}">Submit module for review</button>`;
    return `Module ${modNum(m)}: all ${ms.total} done.`;
  }
  L.latest={};// exerciseId -> {result, code} of the latest push, fetched when the page opens
  async function loadLatest(id){
    if(!L.me||(L.latest[id]&&!L.latest[id].stale))return;
    if(!L.latest[id])L.latest[id]={loading:true};else L.latest[id].stale=false;
    try{
      const [r,pass]=await Promise.all([api("GET","/api/results/"+encodeURIComponent(id)),api("GET","/api/passes/"+encodeURIComponent(id))]);
      L.latest[id]={result:r.result,code:pass.code,at:pass.at};
    }catch(e){L.latest[id]={error:true};}
    if(V.view==="exercise"&&V.ex===id&&!running){const t=document.getElementById("tSum");if(t)t.outerHTML=testSummary(EXM[id]);}
    if(V.view==="exercise"&&V.ex===id){const el=document.getElementById("pushPanel");if(el)el.innerHTML=pushPanel(EXM[id]);}
  }
  // The side card: where this challenge stands, and the few steps to submit it from GitHub.
  // One line in the Tests heading: solved (with the next step), or how the last run went.
  function testSummary(ex){
    if(!L.me)return "";
    if(L.saved.has(ex.id)){const m=MODOF[ex.id],next=m&&m.exercises.find(id=>!L.saved.has(id));
      return `<span class="t-sum ok" id="tSum" aria-live="polite">Solved ✓${next?` · <button class="linkish" data-act="open" data-id="${next}">Next challenge →</button>`:""}</span>`;}
    const r=(L.latest[ex.id]||{}).result;
    if(r&&!r.passed)return `<span class="t-sum" id="tSum" aria-live="polite">Last run: ${r.passedCount} of ${r.total} passed</span>`;
    return `<span class="t-sum" id="tSum" aria-live="polite"></span>`;
  }
  function pushPanel(ex){
    if(!L.me.repo)return noRepoCard();
    const file=solutionFile(ex),repo=L.me.repo,lt=L.latest[ex.id]||{},r=lt.result,saved=L.saved.has(ex.id);
    const editUrl=`https://github.com/${esc(repo)}/edit/main/${file}`;
    const steps=`<ol class="gh-steps">
        <li><a class="btn small primary" href="${editUrl}" target="_blank" rel="noopener">Open ${ex.lang==="js"?"solution.js":"solution.go"} on GitHub ↗</a><span>It opens the file in your repository, ready to edit.</span></li>
        <li><b>Write your solution</b><span>Replace the starter code with your answer.</span></li>
        <li><b>Click “Commit changes”</b><span>Keep “Commit directly to the main branch” selected. If GitHub says “File could not be edited”, choose the Commit email ending in @users.noreply.github.com.</span></li>
        <li><button class="btn small primary" data-act="check" data-id="${ex.id}">▶ Run the tests</button><span>Come back here and run the tests on your committed code.</span></li></ol>
      <details class="gh-local"><summary>Prefer your own computer?</summary><pre class="shell mono" id="pushCmd">git clone https://github.com/${esc(repo)}.git
cd ${esc(repo.split("/")[1]||"your-repo")}
# edit ${file}
git add ${file}
git commit -m "${esc(ex.title)}"
git push
# then press "Run the tests" here</pre><button class="btn small" data-act="copy" data-id="pushCmd">Copy</button></details>
      <p class="gh-first">First time? Accept the invitation GitHub emailed you to join the organization, or the link won't open.</p>`;
    const mine=saved&&lt.code?`<details class="gh-local"><summary>Your saved solution</summary>${codeBlock(lt.code)}</details>`:"";
    return `<section class="panel gh-card"><h2>${saved?"Submit a new version":"How to submit"}</h2><div class="pad">${saved?`<details class="gh-local"><summary>Show the steps</summary>${steps}</details>`:steps}${mine}</div></section>`;
  }
  // Sign-in could not create the learner's repository: say so plainly, and let them try again.
  function noRepoCard(){
    const err=L.me.repoError||L.repoErr;
    return `<div class="st-card warn"><span class="st-ic" aria-hidden="true">!</span><div><b>Your repository isn't ready yet</b>
      <p>You need your own repository in the organization to submit solutions. Setting it up didn't finish when you signed in.</p>
      <ol class="fix-list"><li>Check your email for an invitation from GitHub to join the organization, and accept it.</li><li>Then press the button.</li></ol>
      <button class="btn small primary" data-act="setup-repo">Set up my repository</button>
      ${err?`<p class="mono err-detail">${esc(err)}</p>`:""}<p class="muted" style="font-size:12px">Still stuck? Send the message above to your teacher.</p></div></div>`;
  }
  /* ---------- Hooray: a challenge solved for the first time (the pass is saved) ---------- */
  const CONFETTI=["#1F7A5A","#F5C542","#E0603A","#3B82C4","#9B5DE5","#2EC4B6"];
  function celebrate(id){
    const ex=EXM[id];if(!ex||document.getElementById("hooray"))return;
    S.celebrated=S.celebrated||{};if(S.celebrated[id])return;S.celebrated[id]=1;save();
    const m=MODOF[id],next=m&&m.exercises.find(x=>!L.saved.has(x)),modDone=m&&!next;
    const calm=matchMedia("(prefers-reduced-motion: reduce)").matches;
    const bits=calm?"":Array.from({length:90},(_,i)=>{const c=CONFETTI[i%CONFETTI.length],x=Math.random()*100,d=(Math.random()*0.6).toFixed(2),t=(2.4+Math.random()*1.6).toFixed(2),r=Math.round(Math.random()*720-360),dx=Math.round(Math.random()*160-80),w=6+Math.round(Math.random()*6);
      return `<i style="left:${x}%;background:${c};width:${w}px;height:${Math.round(w*1.6)}px;--dx:${dx}px;--r:${r}deg;animation-delay:${d}s;animation-duration:${t}s${i%3?"":";border-radius:99px"}"></i>`;}).join("");
    const el=document.createElement("div");el.id="hooray";el.className="hooray";
    el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");el.setAttribute("aria-labelledby","hoorayH");
    el.innerHTML=`<div class="confetti" aria-hidden="true">${bits}</div>
      <div class="hooray-card">
        <div class="hooray-badge" aria-hidden="true">✓</div>
        <p class="hooray-k">Challenge complete!</p>
        <h2 id="hoorayH">${esc(ex.title)}</h2>
        <p class="hooray-sub">Every test passed and your solution is saved.</p>
        <div class="hooray-pts"><b>+${ptsOf(ex)}</b> points</div>
        ${modDone?`<p class="hooray-mod">🎉 That finishes Module ${modNum(m)}. You can submit it for review.</p>`:""}
        <div class="hooray-act">${next&&!modDone?`<button class="btn primary" data-hooray="next" data-id="${next}">Next: ${esc(EXM[next].title)} →</button>`:""}<button class="btn${next&&!modDone?"":" primary"}" data-hooray="close">${modDone?"Great!":"Keep going"}</button></div>
        <p class="hooray-hint">Click anywhere to close</p>
      </div>`;
    document.body.appendChild(el);
    const prev=document.activeElement;
    const close=(then)=>{if(!el.isConnected)return;el.classList.add("out");document.removeEventListener("keydown",onKey,true);
      setTimeout(()=>{el.remove();if(then)then();else if(prev&&prev.focus)prev.focus();},calm?0:220);};
    const onKey=e=>{if(e.key==="Escape"){e.stopPropagation();close();}};
    document.addEventListener("keydown",onKey,true);
    el.addEventListener("click",e=>{const b=e.target.closest("[data-hooray]");
      if(b&&b.dataset.hooray==="next"){const nx=b.dataset.id;close(()=>openEx(nx));}else close();});
    requestAnimationFrame(()=>{el.classList.add("in");const f=el.querySelector(".hooray-act .btn");if(f)f.focus();});
  }

  /* ---------- Run the tests: grade what is committed on main, and play the results in the test list ---------- */
  // JS: the named tests; Go: the Test functions in the test file.
  function testNames(ex){
    if(ex.lang==="js")return ex.tests.map(t=>({name:t.n,label:t.n,code:t.t}));
    return [...new Set([...(ex.test||"").matchAll(/func (Test\w+)\(/g)].map(x=>x[1]))].map(n=>({name:n,label:n.replace(/^Test/,"").replace(/([a-z])([A-Z])/g,"$1 $2"),code:""}));
  }
  const pause=ms=>new Promise(r=>setTimeout(r,ms));
  let running=false;
  async function runTests(id){
    if(running||V.view!=="exercise"||V.ex!==id)return;running=true;
    const list=document.getElementById("testList"),sum=document.getElementById("tSum");
    const rows=[...list.querySelectorAll(".t-row")],btns=[...document.querySelectorAll('[data-act="check"]')];
    btns.forEach(b=>{b.disabled=true;b.dataset.label=b.textContent;b.textContent="Running…";});
    document.getElementById("testSec").classList.remove("celebrate");
    document.getElementById("testSec").scrollIntoView({block:"start",behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
    rows.forEach(r=>{r.className="t-row run";const m=r.querySelector(".t-msg");m.hidden=true;m.textContent="";});
    sum.className="t-sum";sum.textContent="Getting your code from GitHub…";
    const started=Date.now();let res,err;
    try{res=await api("POST","/api/check/"+encodeURIComponent(id));}catch(e){err=e.message;}
    await pause(Math.max(0,700-(Date.now()-started)));// let the spinners be seen
    if(err){rows.forEach(r=>{r.className="t-row";});sum.className="t-sum bad";sum.textContent=err;}
    else{
      sum.textContent=`Checking commit ${res.commit}…`;
      const byName=n=>res.tests.filter(t=>t.name===n||t.name.startsWith(n+"/"));
      for(const r of rows){
        const got=byName(r.dataset.name),ok=got.length>0&&got.every(t=>t.pass);
        await pause(260);
        r.className="t-row "+(ok?"pass":"fail");
        const bad=got.find(t=>!t.pass);const msg=bad?bad.message:(!got.length?(res.error||"Did not run"):"");
        if(!ok&&msg){const m=r.querySelector(".t-msg");m.textContent=msg;m.hidden=false;}
      }
      await pause(200);
      sum.className="t-sum "+(res.passed?"ok":"bad");
      sum.textContent=res.passed?`All ${res.total} passed ✓`:`${res.passedCount} of ${res.total} passed`;
      if(res.passed)document.getElementById("testSec").classList.add("celebrate");
      const firstTime=res.passed&&!L.saved.has(id);
      if(L.latest[id])L.latest[id].stale=true;
      V.keepRun={id,html:list.innerHTML,sum:sum.outerHTML,ok:res.passed};// keep the played results after the page refreshes
      await loadAll();// status card, module overview and points catch up
      if(firstTime&&L.saved.has(id))celebrate(id);// only once the pass is saved
    }
    document.querySelectorAll('[data-act="check"]').forEach(b=>{b.disabled=false;if(b.dataset.label)b.textContent=b.dataset.label;});
    running=false;
  }

  // The challenge page: the task is the main view; submitting from GitHub is a side card.
  viewExercise=function(){
    const ex=EXM[V.ex],d=diffOf(ex),m=MODOF[ex.id];
    if(!(S.opened||{})[ex.id]){(S.opened=S.opened||{})[ex.id]=1;save();}// opening a challenge marks it started
    const runBtn=L.me&&L.me.repo?`<button class="btn small run-btn" data-act="check" data-id="${ex.id}">▶ Run the tests</button>`:"";
    const rows=testNames(ex).map((t,i)=>`<li class="t-row" data-name="${esc(t.name)}"><span class="t-ic" aria-hidden="true"></span><div><b>${esc(t.label)}</b>${t.code?`<code>${esc(t.code)}</code>`:""}<div class="t-msg mono" hidden></div></div></li>`).join("");
    const tests=`<section class="task-sec" id="testSec"><div class="t-head"><h2>Tests <span class="muted">${ex.lang==="js"?"what your code must do":`run with <code>go test -race</code>`}</span></h2>${testSummary(ex)}${runBtn}</div>
      <ol class="task-tests" id="testList">${rows}</ol>${ex.lang==="go"?`<details class="gofile"><summary>${esc(ex.id.replace(/-/g,"_"))}_test.go</summary>${codeBlock(ex.test)}</details>`:""}</section>`;
    const side=L.me?`<div id="pushPanel">${pushPanel(ex)}</div>`:"";
    // Signed out: how to get started sits inside the task card, after the tests.
    const start=L.me?"":`<section class="task-sec task-start"><h2>Submit your solution</h2><p class="task-start-lede">You need a GitHub account to submit. Your solutions live in your own GitHub repository, and you run the tests here when you're ready.</p>${startSteps(false)}<a class="btn gh-btn" href="/api/auth/github" style="margin-top:14px">${GH}Sign in with GitHub</a></section>`;
    return `<button class="back" data-act="track" data-v="${ex.lang}">← ${LANGN[ex.lang]} challenges</button>
    <div class="task-page">
      <aside class="task-side">${side}<div id="prPanel">${peerPanel(ex)}</div></aside>
      <article class="panel task-main">
        <header class="task-h"><p class="eyebrow">${LANGN[ex.lang]} · ${esc(ex.topic)}${m?` · Module ${modNum(m)}`:""}</p><h1 class="pg-h">${esc(ex.title)}</h1><div class="ex-meta"><span class="diff ${d.toLowerCase()}">${d}</span><span class="mono pts">${ptsOf(ex)} pts</span></div></header>
        <section class="task-sec"><h2>Task</h2><div class="prompt task-prompt">${mdLite(ex.prompt)}</div></section>
        <section class="task-sec"><h2>Starting point <span class="muted mono">${solutionFile(ex)}</span></h2>${codeBlock(ex.starter)}</section>
        ${tests}
        ${start}
      </article>
    </div>`;
  };

  rate=async function(n,subId){
    try{const r=await api("POST",`/api/submissions/${subId}/rating`,{stars:n});(L.delta=L.delta||{})[subId]=r;await loadAll();}
    catch(e){alertIn("prPanel",e.message);}
  };
  function alertIn(id,msg){const el=document.getElementById(id);if(el)el.insertAdjacentHTML("afterbegin",`<p class="err" role="alert">${esc(msg)}</p>`);}

  // The reviews list and the review page are in src/next/screens/reviews.js.
  openReview=function(id){go("review",{qid:id});};
  // The circle screen is in src/next/screens/circle.js.
  // What a newcomer needs before they can solve anything: a GitHub account, then one sign-in.
  function startSteps(compact){
    return `<ol class="start-steps${compact?" compact":""}">
      <li><b>Create a free GitHub account</b><span>Timirtbet uses GitHub for your code. <a href="https://github.com/signup" target="_blank" rel="noopener">Sign up on GitHub ↗</a> (about 2 minutes). Already have one? Skip this.</span></li>
      <li><b>Sign in here with GitHub</b><span>No new password. You get your own private repository for your solutions.</span></li>
      <li><b>Accept the invitation</b><span>GitHub emails you an invitation to the Timirtbet organization. Accept it, then pick a challenge and start.</span></li></ol>`;
  }
  viewSignin=function(){
    if(L.me){setTimeout(()=>go("profile"));return "";}// signed in: the account page instead
    return `<section class="panel narrow"><div class="pad"><h1 class="pg-h" style="font-size:26px">Get started with GitHub</h1>
      <p class="lede">Timirtbet uses your GitHub account instead of its own sign-up form. You write your solutions in a GitHub repository, then run the tests here when you're ready.</p>
      ${startSteps(false)}
      <a class="btn gh-btn" href="/api/auth/github" style="margin-top:16px">${GH}Continue with GitHub</a>
      <p class="muted" style="font-size:13px;margin:14px 0 0">Timirtbet asks GitHub for no permissions, so all it learns is your public username. Without an account you can still read every challenge and its tests.</p></div></section>`;
  };

  // The account screen (src/next/screens/profile.js) calls this after signing out or deleting the account.
  TBNext.afterSignOut=(deleted)=>{V.confirm=null;L.me=null;const was=owner;useAccount(null);if(deleted){try{localStorage.removeItem(ACCT(was));}catch(e){}}go("challenges");};
  // Signing in leaves the page for GitHub: remember where the learner was, to come back there.
  document.addEventListener("click",e=>{const a=e.target.closest('a[href="/api/auth/github"]');if(a){try{sessionStorage.setItem("timirtbet.return",location.pathname);}catch(_){}}},true);
  const liveClick=async(e)=>{
    const el=e.target.closest("[data-act]");if(!el)return;const a=el.dataset.act;
    try{
      if(a==="notice-ok"){await api("POST","/api/me/notice");L.me.noticeSeen=true;render();}
      else if(a==="check"){runTests(el.dataset.id);}
      else if(a==="user"){go("user",{login:el.dataset.login,utab:null});}
      else if(a==="nudge"){const id=el.dataset.id;el.disabled=true;el.textContent="Sending…";
        let bad=null;try{const r=await api("POST",`/api/submissions/${id}/nudge`);const s=L.subs.find(x=>x.id===id);if(s)s.nudgeAfter=r.nudgeAfter;L.nudged[id]=true;}catch(err){bad=err.message;}
        const pp=document.getElementById("prPanel");if(pp&&V.view==="exercise")pp.innerHTML=peerPanel(EXM[V.ex]);else render();
        if(bad)alertIn("prPanel",bad);}
      else if(a==="setup-repo"){el.disabled=true;el.textContent="Setting up…";
        try{await api("POST","/api/me/repo");L.repoErr=null;}catch(err){L.repoErr=err.message;}
        await loadAll();}
      else if(a==="copy-code"){const ed=document.getElementById("editor");const ok=()=>{el.textContent="Copied";setTimeout(()=>{el.textContent="Copy your code";},1500);};
        try{await navigator.clipboard.writeText(ed.value);ok();}catch(_){el.textContent="Select the code in the editor and copy it";}}
      else if(a==="submit-module"){const id=el.dataset.id;el.disabled=true;el.textContent="Submitting…";delete L.modErr[id];
        try{await api("POST",`/api/modules/${id}/submit`);}catch(err){L.modErr[id]=err.message;}
        await loadAll();}
    }catch(err){alert0(err.message);}
  };
  function alert0(msg){app.insertAdjacentHTML("afterbegin",`<p class="err" role="alert">${esc(msg)}</p>`);}
  document.addEventListener("click",e=>{
    if(e.target.closest("[data-next]"))return;// new (Preact) screens handle their own clicks
    const el=e.target.closest("[data-act]");if(!el)return;
    if(el.dataset.act==="rate"&&el.dataset.sub){e.stopImmediatePropagation();rate(+el.dataset.s,el.dataset.sub);return;}
    liveClick(e);
  },true);
  loadAll();
}
