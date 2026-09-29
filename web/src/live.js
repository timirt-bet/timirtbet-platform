/* ---------- live mode: the same screens, backed by the Timirtbet API ---------- */
if(LIVE){
  const L={me:null,circle:null,subs:[],queue:[],given:[],flagged:[],solved:new Set(),saved:new Set(),loaded:false,jobs:{},graded:{},graderFail:{},modErr:{}};
  async function api(method,path,body){
    const res=await fetch(path,{method,credentials:"same-origin",headers:body?{"content-type":"application/json"}:{},body:body?JSON.stringify(body):undefined});
    const data=res.status===204?null:await res.json().catch(()=>null);
    if(!res.ok)throw Object.assign(new Error((data&&(data.error||(data.errors||[]).join(", ")))||`Request failed (${res.status})`),{status:res.status});
    return data;
  }
  async function loadAll(){
    try{
      const r=await api("GET","/api/me");L.me=r.me;L.circle=r.circle;L.solved=new Set(r.me.solvedIds||[]);L.saved=new Set(r.me.savedIds||r.me.solvedIds||[]);
      const [subs,queue,given]=await Promise.all([api("GET","/api/submissions/mine"),api("GET","/api/reviews/queue"),api("GET","/api/reviews/given")]);
      L.subs=subs.submissions;L.queue=queue.toReview;L.given=given.reviews;
      if(r.me.reviewer.levelIndex>=3)L.flagged=(await api("GET","/api/reviews/flagged")).flagged;
    }catch(e){if(e.status!==401)console.error(e);L.me=null;}
    useAccount(L.me&&L.me.login);
    L.loaded=true;render();
    if(L.me)pollInbox(true);else setBell();
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
    fetchedCode.clear();V.rvDraft=null;V.confirm=null;
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
  // On a new device the editor starts from your last passing solution instead of the starter code.
  async function loadSavedCode(id){
    if(!L.me||S.drafts[id]!=null||!L.saved.has(id)||fetchedCode.has(id))return;
    fetchedCode.add(id);const who=owner;
    try{
      const r=await api("GET","/api/passes/"+encodeURIComponent(id));
      if(!r||!r.code||owner!==who||S.drafts[id]!=null)return;
      const ed=document.getElementById("editor");
      if(V.view==="exercise"&&V.ex===id&&ed&&ed.value!==EXM[id].starter)return;// already typing
      S.drafts[id]=r.code;save();
      if(V.view==="exercise"&&V.ex===id)render();
    }catch(e){}
  }

  /* ---------- notifications: the bell, its list, live updates and a short pop-up ---------- */
  L.inbox={items:[],unread:0};
  const BELL=`<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`;
  function ensureBell(){
    if(document.getElementById("bellWrap"))return;
    const w=document.createElement("div");w.id="bellWrap";w.className="bell-wrap";
    w.innerHTML=`<button class="bell" id="bellBtn" aria-label="Notifications" aria-expanded="false" aria-haspopup="true">${BELL}<span class="bell-n" id="bellN" hidden></span></button><div class="bell-pop" id="bellPop" role="dialog" aria-label="Notifications" hidden></div>`;
    document.querySelector(".top-in").insertBefore(w,document.getElementById("who"));
  }
  const starsTxt=n=>"★".repeat(n)+"☆".repeat(5-n);
  function notifHTML(n){
    const u=`<b>${esc(unitTitle(n.unitId))}</b>`;
    switch(n.kind){
      case "review_assigned":return `<span>New review to write:</span> ${u}<span class="nt-sub">Due within 72 hours</span>`;
      case "review_due":return `<span>Reminder: review due within 24 hours:</span> ${u}`;
      case "review_moved":return `<span>72 hours passed, so this review moved to someone else:</span> ${u}`;
      case "review_received":return `<span>Your module was reviewed. Rate the review:</span> ${u}`;
      case "review_rated":return `<span>Your review was rated</span> <span class="starsv">${starsTxt(n.stars)}</span> <span class="mono">${n.points>0?"+":""}${n.points} pts</span><span class="nt-sub">${esc(unitTitle(n.unitId))}</span>`;
      case "level_up":return `<span>You reached a new reviewer level:</span> <b>${esc(n.level)}</b>`;
      case "second_opinion":return `<span>A Mentor added a second opinion:</span> ${u}`;
      default:return `<span>Something changed.</span>`;
    }
  }
  function setBell(){
    const w=document.getElementById("bellWrap");
    if(!L.me){if(w)w.hidden=true;document.title=document.title.replace(/^\(\d+\) /,"");return;}
    ensureBell();document.getElementById("bellWrap").hidden=false;
    const c=L.inbox.unread,b=document.getElementById("bellN");b.hidden=!c;b.textContent=c>9?"9+":String(c);
    document.getElementById("bellBtn").setAttribute("aria-label",c?`Notifications, ${c} unread`:"Notifications");
    document.title=(c?`(${c}) `:"")+document.title.replace(/^\(\d+\) /,"");
    const pop=document.getElementById("bellPop");if(!pop.hidden)pop.innerHTML=popHTML();
  }
  function popHTML(){
    const it=L.inbox.items;
    return `<div class="bell-h"><b>Notifications</b></div>${it.length?`<ul class="bell-list">${it.map(n=>`<li><button class="nt${n.read?"":" unread"}" data-act="notif" data-id="${n.id}"><span class="nt-dot" aria-hidden="true"></span><span class="nt-body">${notifHTML(n)}<span class="nt-time">${ago(Date.parse(n.at))}</span></span></button></li>`).join("")}</ul>`:`<p class="muted bell-empty">Nothing yet. You'll hear here when you get a review to write, when your module is reviewed and when your reviews are rated.</p>`}<p class="bell-note">You also get these on GitHub, by email or in the GitHub app, following your GitHub notification settings.</p>`;
  }
  async function openBell(open){
    const pop=document.getElementById("bellPop"),btn=document.getElementById("bellBtn");
    pop.hidden=!open;btn.setAttribute("aria-expanded",String(open));
    if(!open)return;
    pop.innerHTML=popHTML();
    if(L.inbox.unread){try{await api("POST","/api/notifications/read");}catch(e){}L.inbox.unread=0;setBell();pop.innerHTML=popHTML();L.inbox.items=L.inbox.items.map(n=>({...n,read:true}));}
  }
  function goNotif(n){
    openBell(false);
    if((n.kind==="review_assigned"||n.kind==="review_due")&&L.queue.some(q=>q.id===n.subId))return openReview(n.subId);
    if((n.kind==="review_received"||n.kind==="second_opinion")&&n.exerciseId&&EXM[n.exerciseId])return openEx(n.exerciseId);
    go("reviews");
  }
  let toastT=null;
  function toast(n){
    let t=document.getElementById("toast");
    if(!t){t=document.createElement("div");t.id="toast";t.className="toast";t.setAttribute("role","status");document.body.appendChild(t);}
    t.innerHTML=`<button class="toast-in" data-act="notif" data-id="${n.id}">${BELL}<span>${notifHTML(n)}</span></button>`;
    t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>{t.hidden=true;},7000);
  }
  let pollT=null,lastTop=null;
  async function pollInbox(first){
    clearTimeout(pollT);
    if(!L.me)return;
    try{
      const box=await api("GET","/api/notifications");
      const top=box.items[0]&&box.items[0].id;
      const fresh=!first&&top&&top!==lastTop&&box.unread>0;
      L.inbox=box;lastTop=top;setBell();
      if(fresh){toast(box.items[0]);await loadAll();}
    }catch(e){if(e.status===401){checkSession();return;}}
    pollT=setTimeout(()=>pollInbox(false),document.hidden?180000:45000);
  }
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&L.me)pollInbox(false);});
  document.addEventListener("click",e=>{
    const w=document.getElementById("bellWrap");if(!w||w.hidden)return;
    if(e.target.closest("#bellBtn")){e.stopImmediatePropagation();openBell(document.getElementById("bellPop").hidden);return;}
    const it=e.target.closest('[data-act="notif"]');
    if(it){e.stopImmediatePropagation();const n=L.inbox.items.find(x=>x.id===it.dataset.id);const t=document.getElementById("toast");if(t)t.hidden=true;if(n)goNotif(n);return;}
    if(!e.target.closest("#bellPop"))openBell(false);
  },true);
  document.addEventListener("keydown",e=>{if(e.key==="Escape"){const p=document.getElementById("bellPop");if(p&&!p.hidden){openBell(false);document.getElementById("bellBtn").focus();}}});
  const note=document.querySelector("footer .wrap span");if(note)note.textContent="Timirtbet · learn JavaScript and Go with your review circle";
  S.me=null;

  me=()=>L.me&&L.me.login;
  inCircle=login=>!!(L.circle&&L.circle.members.some(m=>m.login===login));
  passedEx=id=>L.solved.has(id)||(()=>{const r=S.res[id];return !!(r&&r.p===r.t&&r.t>0);})();
  myPoints=()=>L.me?L.me.points:BANK.filter(e=>passedEx(e.id)).reduce((a,e)=>a+ptsOf(e),0);
  const latestSub=id=>L.subs.filter(s=>s.exerciseId===id).sort((a,b)=>b.at.localeCompare(a.at))[0];
  const modSub=mid=>L.subs.filter(s=>s.moduleId===mid).sort((a,b)=>b.at.localeCompare(a.at))[0];
  moduleState=function(m){
    if(!L.me)return {passed:m.exercises.filter(id=>passedEx(id)).length,total:m.exercises.length,sub:null,ready:false,guest:true};
    const passed=m.exercises.filter(id=>L.solved.has(id)).length,sub=modSub(m.id),open=!!(sub&&sub.status!=="rated");
    // Passes from before solutions were kept have no code to send: those need one more run.
    const resave=m.exercises.filter(id=>L.solved.has(id)&&!L.saved.has(id));
    return {passed,total:m.exercises.length,sub,resave,err:L.modErr[m.id],ready:passed===m.exercises.length&&!resave.length&&!open};
  };
  // A review is for a module (all its solutions together) or, for older submissions, one challenge.
  const unitOf=s=>{const m=s.moduleId&&MODM[s.moduleId];
    if(m)return {title:`Module ${modNum(m)} · ${m.title}`,lang:m.lang,sub:`${m.exercises.length} challenges`,items:(s.items||[]).map(i=>({ex:EXM[i.exerciseId],code:i.code,passed:i.passed,total:i.total}))};
    const e=EXM[s.exerciseId];return {title:e.title,lang:e.lang,sub:`${e.topic} · ${diffOf(e)}`,items:[{ex:e,code:s.code,passed:s.tests.passed,total:s.tests.total}]};};
  const unitTitle=id=>MODM[id]?`Module ${modNum(MODM[id])} · ${MODM[id].title}`:(EXM[id]?EXM[id].title:id);
  const prof=()=>L.me?L.me.reviewer:{score:3.5,reputation:0,level:"New",levelIndex:0,ratings:0};

  const baseRender=render;
  render=function(){
    if(!L.loaded){app.innerHTML=`<p class="muted" style="padding:40px 0">Loading…</p>`;return;}
    baseRender();
    if(V.view==="exercise"&&V.ex)loadSavedCode(V.ex);
    if(L.me&&!L.me.noticeSeen&&!document.getElementById("notice")){
      app.insertAdjacentHTML("afterbegin",`<section class="panel" id="notice" style="margin-bottom:18px"><div class="pad"><b>Welcome, @${esc(L.me.login)}.</b> Timirtbet stores your GitHub id and username, your repository <span class="mono">${esc(L.me.repo||"")}</span>, the code you submit, your reviews and your circle. Nothing else. It is stored on Google Cloud in the United States. You can export or delete it from your profile at any time. <div style="margin-top:10px"><button class="btn primary small" data-act="notice-ok">OK</button></div></div></section>`);
    }
    const waiting=L.queue.length;
    const b=document.querySelector('nav.main [data-v="reviews"]');if(b)b.innerHTML="Reviews"+(waiting?` <span class="badge">${waiting}</span>`:"");
  };
  progressCard=function(solved){
    if(!L.me)return `<section class="panel"><h2>Practising as a guest</h2><div class="pad"><p class="muted" style="margin:0 0 12px;font-size:14px">Every challenge and its tests work without an account; your code stays in this browser. Sign in with GitHub to submit for review and join a circle.</p><a class="btn gh-btn" href="/api/auth/github">${GH}Sign in with GitHub</a></div></section>`;
    const max=BANK.reduce((a,e)=>a+ptsOf(e),0);const p=prof();
    return `<section class="panel"><h2>Your progress</h2><div class="pad"><div class="kpis"><div><div class="k">${L.me.points}</div><div class="muted">points</div></div><div><div class="k">${L.me.solved}<small>/${BANK.length}</small></div><div class="muted">solved</div></div><div><div class="k">${p.score.toFixed(1)}</div><div class="muted">review score</div></div></div><div class="bar" style="margin-top:12px"><i style="width:${L.me.points/max*100}%"></i></div><div class="muted mono" style="font-size:12px;margin-top:4px">${L.me.points} of ${max} points</div></div></section>`;
  };
  circleMini=function(){
    if(!L.me)return "";
    if(!L.circle)return `<section class="panel"><h2>Review circle</h2><div class="pad"><p class="muted" style="margin:0 0 12px;font-size:14px">You're not in a circle, so reviews come from the wider pool. Join friends with an invite code, or start your own.</p><button class="btn" data-act="view" data-v="circle">Find a circle</button></div></section>`;
    return `<section class="panel"><h2>${esc(L.circle.name)}</h2><div class="pad"><div class="avs">${L.circle.members.map(m=>avatar(m.login)).join("")}</div><p class="muted" style="font-size:13.5px;margin:10px 0 12px">${L.circle.members.length} members · reviews go here first</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-act="view" data-v="circle">Open circle</button>${L.queue.length?`<button class="btn primary" data-act="view" data-v="reviews">${L.queue.length} to review</button>`:""}</div></div></section>`;
  };
  status=function(id){const sub=latestSub(id);if(L.jobs[id])return {k:"wait",l:"Grading"};if(sub){if(sub.status==="rated")return {k:"done",l:"Reviewed ★"+sub.rating};if(sub.status==="reviewed")return {k:"act",l:"Rate the review"};return {k:"wait",l:"In review"};}
    if(passedEx(id))return {k:"pass",l:L.solved.has(id)?"Solved":"Passing locally"};const r=S.res[id];if(r)return {k:"try",l:r.p+"/"+r.t+" passing"};return {k:"new",l:"Not tried"};};
  canSubmit=function(ex,code){const r=S.res[ex.id],sub=latestSub(ex.id);return !!(L.me&&r&&r.code===code&&r.p===r.t&&!(sub&&sub.status!=="rated")&&!L.jobs[ex.id]);};
  hint=function(ex,code){
    if(!L.me)return "Your code stays in this browser. Sign in to save progress. Ctrl+Enter runs.";
    if(L.jobs[ex.id])return "Checking your solution on the grader…";
    if(L.graderFail[ex.id]===code)return "The grader found a problem. Fix it and run again.";
    if(L.graded[ex.id]===code&&L.solved.has(ex.id))return "Saved to your progress ✓";
    if(L.solved.has(ex.id))return "Solved. Run the tests to save this version instead.";
    return "When every test passes, your solution is saved automatically. Ctrl+Enter runs.";};
  ghPanel=function(ex){
    const file=solutionFile(ex);
    return `<details class="panel gh"><summary>Or push from your GitHub repository</summary><div class="pad"><p class="muted" style="font-size:13.5px;margin:0 0 8px">Edit <code>${file}</code> in <span class="mono">${esc(L.me.repo||"your repository")}</span> and push to <code>main</code>. The same grader runs, and a pass counts just like Submit.</p><pre class="shell mono">git clone https://github.com/${esc(L.me.repo||"")}.git
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
    const list=`<ul class="mod-list">${m.exercises.map(id=>`<li class="${done(id)?"ok":""}"><span aria-hidden="true">${done(id)?"✓":"○"}</span>${id===ex.id?`<b>${esc(EXM[id].title)}</b>`:`<button class="linkish" data-act="open" data-id="${id}">${esc(EXM[id].title)}</button>`}${L.jobs[id]?` <span class="muted pulse">grading…</span>`:""}</li>`).join("")}</ul>`;
    const sub=ms.sub;
    return `<section class="panel pr"><h2>Module review</h2><div class="pad"><p class="eyebrow" style="margin:0 0 4px">Module ${modNum(m)} · ${ms.passed}/${ms.total} passed</p><b>${esc(m.title)}</b>${list}<div class="mod-foot">${moduleFoot(m,ms,true)}</div>${sub&&sub.review?`<div class="stages">${reviewBlock(sub)}</div>`:""}</div></section>`;
  };
  // Run tests: when every browser test passes, the code goes to the grader and a pass is saved.
  async function gradeOnServer(ex,code){
    try{
      const {jobId}=await api("POST","/api/submissions",{exerciseId:ex.id,code});
      L.jobs[ex.id]=jobId;delete L.graderFail[ex.id];refreshEx(ex);
      for(let i=0;i<120;i++){
        await new Promise(r=>setTimeout(r,1500));
        const j=await api("GET","/api/jobs/"+jobId);
        if(j.status==="done"){
          delete L.jobs[ex.id];
          if(j.passed)L.graded[ex.id]=code;else{L.graderFail[ex.id]=code;if(j.result)S.res[ex.id]={p:j.result.passedCount,t:j.result.total,code,out:(j.result.tests||[]).map(t=>({n:t.name,pass:t.pass,msg:t.message})).concat(j.result.error?[{n:"Grader",pass:false,msg:j.result.error}]:[]),at:Date.now()};save();}
          await loadAll();return;
        }
      }
      delete L.jobs[ex.id];refreshEx(ex);
    }catch(e){delete L.jobs[ex.id];refreshEx(ex);const h=document.getElementById("edHint");if(h)h.textContent=e.message;}
  }
  function refreshEx(ex){if(V.view!=="exercise"||V.ex!==ex.id)return;const h=document.getElementById("edHint");if(h)h.textContent=hint(ex,document.getElementById("editor").value);const p=document.getElementById("prPanel");if(p)p.innerHTML=peerPanel(ex);}
  const baseRun=run;
  run=async function(){
    await baseRun();
    const ex=EXM[V.ex];if(!ex||!L.me||L.jobs[ex.id])return;
    const r=S.res[ex.id];
    if(r&&r.t>0&&r.p===r.t&&L.graded[ex.id]!==r.code)await gradeOnServer(ex,r.code);
  };
  rate=async function(n,subId){
    try{const r=await api("POST",`/api/submissions/${subId}/rating`,{stars:n});(L.delta=L.delta||{})[subId]=r;await loadAll();}
    catch(e){alertIn("prPanel",e.message);}
  };
  function alertIn(id,msg){const el=document.getElementById(id);if(el)el.insertAdjacentHTML("afterbegin",`<p class="err" role="alert">${esc(msg)}</p>`);}

  viewReviews=function(){
    if(!L.me)return signinNeeded("Sign in to review other learners' code and build a reviewer reputation.");
    const p=prof();const nx=LEVELS[p.levelIndex+1];
    const rows=L.queue.map(s=>{const u=unitOf(s);return `<div class="q-row"><span class="ic mono">${u.lang==="js"?"JS":"Go"}</span><div><div class="t">${esc(u.title)} <span class="muted">· ${esc(u.sub)}</span></div><div class="tch">assigned ${ago(Date.parse(s.assignedAt||s.at))} · due within 72 h</div></div><button class="btn small primary" data-act="review" data-id="${s.id}">Review</button></div>`;}).join("")||`<p class="muted">Nothing waiting for you. Solve more challenges to review more of them.</p>`;
    const flagged=p.levelIndex>=3?`<h2 class="h2">Second opinions (Mentors)</h2><div class="queue">${L.flagged.map(s=>{const u=unitOf(s);return `<div class="panel"><div class="pad"><b>${esc(u.title)}</b> <span class="muted">· review rated ★1</span><p style="font-size:14px">${esc(s.review.text)}</p>${u.items.map(i=>`<p class="lbl-sm" style="margin:10px 0 4px">${esc(i.ex.title)}</p>${codeBlock(i.code||"")}`).join("")}<form class="form" data-form="second" data-id="${s.id}" style="margin-top:10px"><label class="lbl-sm" for="so-${s.id}">Your second opinion</label><textarea id="so-${s.id}" rows="3"></textarea><button class="btn small" type="submit">Send</button></form></div></div>`;}).join("")||`<p class="muted">No flagged reviews.</p>`}</div>`:"";
    return `<p class="eyebrow">Reviews</p><h1 class="pg-h">Review code, earn reputation</h1><p class="lede">You review a module only after finishing it yourself. You don't see who wrote the code, and they don't see who reviewed it.</p>
    <div class="grid2" style="margin-top:20px"><div><div class="queue">${rows}</div>
     <h2 class="h2">Ratings your reviews got</h2><div class="panel"><div class="pad">${L.given.slice().reverse().map(g=>`<div class="act"><span><b>${esc(unitTitle(g.exerciseId))}</b><br><span class="muted" style="font-size:12.5px">${esc(g.review.text.slice(0,110))}${g.review.text.length>110?"…":""}</span></span><span class="starsv">${g.rating?stars(g.rating)+` <span class="mono muted" style="font-size:12px">${PTS[g.rating]>0?"+":""}${PTS[g.rating]}</span>`:"not rated yet"}</span></div>`).join("")||`<p class="muted">No reviews yet.</p>`}</div></div>${flagged}</div>
     <aside class="side"><section class="panel prof"><h2>Your reviewer profile</h2><div class="pad"><div class="prof-top"><div><div class="big">${p.score.toFixed(2)}<small> ★ score</small></div><div class="muted" style="font-size:13px">${p.ratings} rated reviews</div></div><span class="lvl lvl${p.levelIndex}">${p.level}</span></div><div class="rep-row"><span class="mono">${p.reputation} pts</span><span class="muted">${nx?`${nx.min-p.reputation} to ${nx.n}`:"Top level"}</span></div><div class="bar"><i style="width:${nx?Math.round((p.reputation-LEVELS[p.levelIndex].min)/(nx.min-LEVELS[p.levelIndex].min)*100):100}%"></i></div>${p.probation?`<p class="err" style="margin-top:10px">On probation: no new reviews until your score recovers above 3.0.</p>`:""}</div></section>${howRep()}</aside></div>`;
  };
  openReview=function(id){go("review",{qid:id,rvDraft:{rub:{c:0,r:0,s:0},text:""},rvAuto:null});};
  viewReview=function(){
    const s=L.queue.find(x=>x.id===V.qid);if(!s)return viewReviews();const u=unitOf(s);const d=V.rvDraft;
    return `<button class="back" data-act="view" data-v="reviews">← Reviews</button><p class="eyebrow">${LANGN[u.lang]} · ${esc(u.sub)}</p><h1 class="pg-h">Review: ${esc(u.title)}</h1>
    <div class="ex-grid"><div class="side"><div class="panel"><h2>Tasks</h2><div class="pad">${u.items.map(i=>`<details class="task-d"><summary><b>${esc(i.ex.title)}</b></summary><div class="prompt">${mdLite(i.ex.prompt)}</div></details>`).join("")}</div></div><div class="panel"><h2>Automatic tests</h2><div class="pad"><b class="okc">${s.tests.passed} / ${s.tests.total} passed on the grader</b></div></div></div>
     <div>${u.items.map(i=>`<div class="panel"><h2>${esc(i.ex.title)} <span class="muted mono" style="font-size:12px;font-weight:500">${solutionFile(i.ex)}</span></h2>${codeBlock(i.code||"")}</div>`).join("")}<section class="panel"><h2>Your review</h2><div class="pad rv-form" id="rvBox">
      ${Object.keys(RUBN).map(k=>`<div class="rub-row"><span>${RUBN[k]}</span><div class="seg" role="group" aria-label="${RUBN[k]}">${[1,2,3].map(v=>`<button data-act="rub" data-k="${k}" data-v="${v}" aria-pressed="${d.rub[k]===v}">${RUBV[v]}</button>`).join("")}</div></div>`).join("")}
      <label for="rvText" class="lbl-sm">Your comment</label><textarea id="rvText" rows="6" placeholder="Name the challenge and line, say what works, and suggest one change.">${esc(d.text)}</textarea>
      <div class="rv-foot"><span class="muted mono" id="rvCount" style="font-size:12px">${d.text.trim().length} / 40 characters minimum</span><button class="btn primary" data-act="sendreview" id="rvSend" ${canSend(d)?"":"disabled"}>Send review</button></div></div></section></div></div>`;
  };
  sendReview=async function(){
    const d=V.rvDraft;if(!canSend(d))return;
    try{await api("POST",`/api/submissions/${V.qid}/review`,{rubric:{correctness:d.rub.c,readability:d.rub.r,style:d.rub.s},text:d.text});await loadAll();go("reviews");}
    catch(e){alertIn("rvBox",e.message);}
  };

  viewCircle=function(){
    if(!L.me)return signinNeeded("Sign in to join a review circle.");
    if(!L.circle)return `<p class="eyebrow">Review circle</p><h1 class="pg-h">Find your circle</h1><p class="lede">A circle is up to 8 learners who review each other first. Start one and share the invite code, or join friends with theirs.</p>
     <div class="two" style="margin-top:20px"><form class="panel" data-form="join"><h2>Join with a code</h2><div class="pad form"><label for="joinCode" class="lbl-sm">Invite code</label><input id="joinCode" class="mono" maxlength="8" autocomplete="off"><div id="joinErr" class="err" role="alert"></div><button class="btn primary" type="submit">Join circle</button></div></form>
     <form class="panel" data-form="create"><h2>Start a circle</h2><div class="pad form"><label for="cName" class="lbl-sm">Circle name</label><input id="cName" maxlength="40"><label for="cTrack" class="lbl-sm">Language</label><select id="cTrack"><option value="both">JavaScript and Go</option><option value="js">JavaScript</option><option value="go">Go</option></select><div id="createErr" class="err" role="alert"></div><button class="btn primary" type="submit">Create circle</button></div></form></div>`;
    const c=L.circle;const owner=c.ownerId===L.me.id;const rows=c.members.slice().sort((a,b)=>b.points-a.points);
    return `<p class="eyebrow">Review circle</p><div class="ex-head"><h1 class="pg-h">${esc(c.name)}</h1><div class="cmd" style="max-width:340px"><span class="muted" style="font-size:12.5px">Invite code</span><code id="inviteCode" class="mono">${esc(c.inviteCode)}</code><button class="btn small" data-act="copy" data-id="inviteCode">Copy</button>${owner?`<button class="btn small" data-act="rotate">New code</button>`:""}</div></div>
    <p class="lede">${c.members.length} of 8 members. Your submissions go to a member here first; the wider pool steps in only when nobody here who solved the challenge is free.</p>
    <div class="panel" style="margin-top:20px"><h2>Leaderboard</h2><div class="tbl"><table><thead><tr><th>#</th><th>Learner</th><th>Points</th><th>Solved</th><th>Review score</th><th>Level</th></tr></thead><tbody>${rows.map((x,i)=>`<tr class="${x.id===L.me.id?"me":""}"><td class="mono">${i+1}</td><td><span class="lrn">${avatar(x.login,"sm")}<span class="mono">@${esc(x.login)}</span>${x.id===L.me.id?` <span class="muted">(you)</span>`:""}</span></td><td class="mono">${x.points}</td><td class="mono">${x.solved}</td><td class="mono">${x.reviewer.score.toFixed(2)}</td><td>${x.reviewer.probation?`<span class="st act">Probation</span>`:`<span class="lvl lvl${x.reviewer.levelIndex} sm">${x.reviewer.level}</span>`}</td></tr>`).join("")}</tbody></table></div></div>
    <section class="panel" style="margin-top:16px"><div class="pad">${V.confirm==="leave"?`<p style="margin:0 0 10px;font-size:14px">Leave ${esc(c.name)}? Your reviews will come from the wider pool.</p><div style="display:flex;gap:8px"><button class="btn" data-act="live-leave">Leave circle</button><button class="btn" data-act="confirm-no">Stay</button></div>`:`<button class="linkish" data-act="leave">Leave this circle</button>`}</div></section>`;
  };
  viewSignin=function(){
    if(L.me)return viewProfile();
    return `<section class="panel narrow"><div class="pad"><h1 class="pg-h" style="font-size:26px">Sign in with GitHub</h1><p class="lede">No sign-up form. Timirtbet asks GitHub for no permissions, so all it learns is your public username. On your first sign-in you join the Timirtbet organization and get your own private repository for pushing solutions.</p><a class="btn gh-btn" href="/api/auth/github" style="margin-top:14px">${GH}Continue with GitHub</a><p class="muted" style="font-size:13px;margin:14px 0 0">Or keep practising as a guest: every challenge and its tests work without an account.</p></div></section>`;
  };
  viewProfile=function(){
    if(!L.me)return viewSignin();const p=prof();
    return `<div class="ex-head"><div class="lrn big">${avatar(L.me.login,"lg")}<div><p class="eyebrow" style="margin:0">Signed in with GitHub</p><h1 class="pg-h mono">@${esc(L.me.login)}</h1></div></div></div>
    <div class="stats"><div class="stat"><div class="v">${L.me.points}</div><div class="l">Points</div></div><div class="stat"><div class="v">${L.me.solved}</div><div class="l">Challenges solved</div></div><div class="stat"><div class="v">${p.score.toFixed(2)}</div><div class="l">Review score</div></div><div class="stat"><div class="v">${p.reputation}</div><div class="l">Reputation · ${p.level}</div></div></div>
    <div class="two"><section class="panel"><h2>Your repository</h2><div class="pad">${L.me.repo?`<div class="cmd"><code id="cloneCmd">git clone https://github.com/${esc(L.me.repo)}.git</code><button class="btn small" data-act="copy" data-id="cloneCmd">Copy</button></div><p class="muted" style="font-size:13px">Accept the invitation to the Timirtbet organization that GitHub emailed you, then push to <code>main</code>.</p>`:`<p class="muted">Your repository is being set up. Sign out and in again if it doesn't appear.</p>`}</div></section>
     <section class="panel"><h2>Your data</h2><div class="pad"><table class="plain"><tbody><tr><td>GitHub id and username</td><td class="okc">stored</td></tr><tr><td>Your code, test results, reviews and ratings</td><td class="okc">stored</td></tr><tr><td>Your circle</td><td class="okc">stored</td></tr><tr><td>Name, email, phone, age, school, location</td><td class="muted">never asked</td></tr></tbody></table>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><a class="btn" href="/api/me/export">Export my data</a>${V.confirm==="signout"?`<span class="confirm">Sign out on every device? <button class="btn small" data-act="live-signout">Sign out</button><button class="btn small" data-act="confirm-no">Cancel</button></span>`:`<button class="btn" data-act="signout">Sign out</button>`}</div>
      <form class="form" data-form="delete" style="margin-top:16px"><label class="lbl-sm" for="delConfirm">Delete my account: type <span class="mono">${esc(L.me.login)}</span> to confirm. This removes your data and your repository.</label><input id="delConfirm" class="mono" autocomplete="off"><div id="delErr" class="err" role="alert"></div><button class="btn" type="submit">Delete my account</button></form></div></section></div>`;
  };

  const liveClick=async(e)=>{
    const el=e.target.closest("[data-act]");if(!el)return;const a=el.dataset.act;
    try{
      if(a==="notice-ok"){await api("POST","/api/me/notice");L.me.noticeSeen=true;render();}
      else if(a==="submit-module"){const id=el.dataset.id;el.disabled=true;el.textContent="Submitting…";delete L.modErr[id];
        try{await api("POST",`/api/modules/${id}/submit`);}catch(err){L.modErr[id]=err.message;}
        await loadAll();}
      else if(a==="rotate"){await api("POST",`/api/circles/${L.circle.id}/invite-code`);await loadAll();}
      else if(a==="live-leave"){V.confirm=null;await api("POST","/api/circles/leave");await loadAll();}
      else if(a==="live-signout"){V.confirm=null;await api("POST","/api/auth/logout");L.me=null;useAccount(null);setBell();go("challenges");}
    }catch(err){alert0(err.message);}
  };
  function alert0(msg){app.insertAdjacentHTML("afterbegin",`<p class="err" role="alert">${esc(msg)}</p>`);}
  document.addEventListener("click",e=>{
    const el=e.target.closest("[data-act]");if(!el)return;
    if(el.dataset.act==="rate"&&el.dataset.sub){e.stopImmediatePropagation();rate(+el.dataset.s,el.dataset.sub);return;}
    liveClick(e);
  },true);
  document.addEventListener("submit",async e=>{
    const f=e.target;const kind=f.dataset.form;if(!kind)return;e.preventDefault();
    try{
      if(kind==="join"){await api("POST","/api/circles/join",{code:document.getElementById("joinCode").value});await loadAll();}
      else if(kind==="create"){await api("POST","/api/circles",{name:document.getElementById("cName").value,track:document.getElementById("cTrack").value});await loadAll();}
      else if(kind==="delete"){await api("DELETE","/api/me",{confirm:document.getElementById("delConfirm").value.trim()});L.me=null;const was=owner;useAccount(null);try{localStorage.removeItem(ACCT(was));}catch(e){}setBell();go("challenges");}
      else if(kind==="second"){await api("POST",`/api/submissions/${f.dataset.id}/second-opinion`,{text:f.querySelector("textarea").value});await loadAll();}
    }catch(err){const box=f.querySelector(".err")||f;box.textContent=err.message;if(box===f)f.insertAdjacentHTML("beforeend",`<p class="err">${esc(err.message)}</p>`);}
  });
  loadAll();
}
