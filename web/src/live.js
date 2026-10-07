/* ---------- the learner: loaded from the Timirtbet API, kept per account in this browser, with notifications polled ---------- */
{
  // Shared data (me, circle, subs, queue, given, flagged, solved, saved, inbox, loaded) lives in
  // src/next/state.js as signals; L reads and writes them, so old and new screens agree.
  const L=TBNext.bridge({jobs:{},graded:{},graderFail:{},saveErr:{},modErr:{}});
  const api=TBNext.api;
  async function loadAll(){
    await TBNext.refresh();
    useAccount(L.me&&L.me.login);
    try{const back=sessionStorage.getItem("timirtbet.return");sessionStorage.removeItem("timirtbet.return");
      if(L.me&&back&&back!=="/"&&location.pathname==="/"&&ROUTED){history.replaceState(null,"",back);applyRoute(back);}}catch(e){}
    render();
    if(L.me)pollInbox(true);
  }

  /* ---------- whose work is on screen: each account, and guests, keep their own drafts in this browser ---------- */
  const ACCT=u=>`${KEY}:${u||"guest"}`,WHO="timirtbet.who";
  let owner;// undefined until /api/me first answers
  save=function(){if(owner===undefined)return;try{localStorage.setItem(ACCT(owner),JSON.stringify(S));}catch(e){}};
  // Switches this browser's saved choices to another account. Returns true if it changed.
  function useAccount(login){
    const k=login||null;if(owner===k)return false;
    if(owner!==undefined)save();
    else{// first answer: whatever this browser kept before accounts were separated goes to whoever is here now
      try{const old=localStorage.getItem(KEY);if(old!=null){if(localStorage.getItem(ACCT(k))==null)localStorage.setItem(ACCT(k),old);localStorage.removeItem(KEY);}}catch(e){}
    }
    owner=k;
    let n=null;try{n=JSON.parse(localStorage.getItem(ACCT(k))||"null");}catch(e){}
    const prefs={track:S.track,diff:S.diff,statusF:S.statusF};
    S=n||{...seed(),...prefs};
    if(V.view==="exercise"&&EXM[V.ex])S.track=EXM[V.ex].lang;else if(V.view==="track")S.track=prefs.track;// the address decides the track
    V.confirm=null;
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
  window.addEventListener("pagehide",()=>save());
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
        if(was&&L.saved.has(n.exerciseId))TBNext.celebrate(n.exerciseId);}
    }catch(e){if(e.status===401){checkSession();return;}}
    pollT=setTimeout(()=>pollInbox(false),document.hidden?180000:45000);
  }
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&L.me)pollInbox(false);});

  // Every screen is drawn by src/next; until the first answer from the API, say so.
  const baseRender=render;
  render=function(){
    if(!L.loaded){app.innerHTML=`<p class="muted" style="padding:40px 0">Loading…</p>`;return;}
    baseRender();
  };
  // The account menu and page call this after signing out.
  TBNext.afterSignOut=(deleted)=>{V.confirm=null;L.me=null;const was=owner;useAccount(null);if(deleted){try{localStorage.removeItem(ACCT(was));}catch(e){}}go("challenges");};
  loadAll();
}
