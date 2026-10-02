(function(){
"use strict";
/* ---------- data ---------- */
const BANK=/*__BANK__*/[];
const HARNESS_SRC=/*__HARNESS__*/"";
/*__GOCHECK__*/
const EXM=Object.fromEntries(BANK.map(e=>[e.id,e]));
/* Modules: small groups of challenges that go to review together (challenges/modules.json). */
const MODULES=/*__MODULES__*/[];
const MODM=Object.fromEntries(MODULES.map(m=>[m.id,m]));
const MODOF={};MODULES.forEach(m=>m.exercises.forEach(e=>{MODOF[e]=m;}));
const modNum=m=>MODULES.filter(x=>x.lang===m.lang).indexOf(m)+1;
const LANGN={js:"JavaScript",go:"Go"};
const LIVE=typeof window!=="undefined"&&window.TIMIRTBET_MODE==="live";
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function diffOf(ex){if(ex.level==="basic")return ex.topic==="Basic problem solving"?"Medium":"Easy";return ex.topic==="Advanced problem solving"?"Hard":"Medium";}
const POINTS={Easy:10,Medium:25,Hard:50};
const ptsOf=ex=>POINTS[diffOf(ex)];
const STEPS=["You submit","Automatic tests","A circle member gets it","They review it","You rate the review ★1–5","Their review score updates","Their reputation grows"];

/* Other learners in this demo. Only public GitHub usernames: no names, ages or places. */
const ALL=BANK.map(e=>e.id);
const byLang=l=>ALL.filter(id=>EXM[id].lang===l);
const basic=ALL.filter(id=>EXM[id].level==="basic");
const PEERS={
 "liya-g":{r:[5,5,4,5,5,4,5,5,5,4,5,5,4,5,5,5,4,5,5,5,5,4,5,5],solved:ALL},
 "dawit-b":{r:[4,3,4,4,5,3,4,4,3,4,5,4],solved:basic.concat(["js-closures","js-this","go-pointers","go-methods"])},
 "ruth-m":{r:[5,4,5,5,4,5,4,5],solved:basic.concat(["go-interfaces"])},
 "nahom-t":{r:[3,4,2,4],solved:basic.filter(id=>id.startsWith("js-"))},
 "kidus-a":{r:[2,3,1,2,3],solved:basic},
 "abel-k":{r:[4,4],solved:basic.filter(id=>id.startsWith("js-"))},
 "sara-w":{r:[5,5,4],solved:byLang("go")}
};
const HOME_CIRCLE={name:"Addis Coders",code:"K7QX2MPA",members:["liya-g","dawit-b","ruth-m","nahom-t"]};
const PTS={5:10,4:6,3:2,2:-3,1:-6};
const LEVELS=[{min:0,n:"New"},{min:30,n:"Helpful"},{min:100,n:"Trusted"},{min:250,n:"Mentor"}];
const repOf=r=>Math.max(0,r.reduce((a,s)=>a+PTS[s],0));
const scoreOf=r=>(5*3.5+r.reduce((a,s)=>a+s,0))/(5+r.length);
function levelOf(rep){let i=0;LEVELS.forEach((l,j)=>{if(rep>=l.min)i=j;});return i;}
const probation=r=>r.length>=4&&scoreOf(r)<3;

const QUEUE=[
 {id:"q1",ex:"js-loops",author:"nahom-t",code:`function sumTo(n) {
  var t = 0
  var i = 1
  while (i <= n) {
    t = t + i
    i++
  }
  return t
}
`},
 {id:"q2",ex:"go-cond",author:"ruth-m",code:`package exercise

func Grade(score int) string {
	if score < 0 || score > 100 {
		return "invalid"
	}
	if score >= 90 {
		return "A"
	} else if score >= 80 {
		return "B"
	} else if score >= 70 {
		return "C"
	} else if score >= 60 {
		return "D"
	}
	return "F"
}
`},
 {id:"q3",ex:"js-cond",author:"kidus-a",code:`function grade(s) {
  if (s > 100) return "invalid"
  if (s < 0) return "invalid"
  if (s >= 90) { return "A" } else { if (s >= 80) { return "B" } else { if (s >= 70) { return "C" } else { if (s >= 60) { return "D" } else { return "F" } } } }
}
`},
 {id:"q4",ex:"go-vars",author:"dawit-b",code:`package exercise

import "math"

func Fahrenheit(c float64) float64 {
	f := c*1.8 + 32
	return f
}

func Cents(birr float64) int {
	x := birr * 100
	return int(math.Round(x))
}
`},
 {id:"q5",ex:"js-vars",author:"abel-k",code:`function describe(value) {
  const t = typeof value;
  if (t === "object") {
    if (value === null) return "null";
    if (Array.isArray(value)) return "array";
  }
  return t;
}
`},
 {id:"q6",ex:"js-closures",author:"liya-g",code:`function makeCounter(start = 0) {
  let count = start;
  return {
    inc: () => ++count,
    dec: () => --count,
    value: () => count,
  };
}
`}
];

/* ---------- state ---------- */
const KEY=LIVE?"timirtbet-live-v1":"timirtbet-code-v1";
function seed(){
  if(LIVE)return {me:null,track:"js",diff:"all",statusF:"all",drafts:{},res:{},subs:{},given:[],done:[],peerExtra:{},pushes:[],circle:null,feed:[]};
  const now=Date.now(),H=36e5,D=24*H;
  // The demo learner's passing code. The answers are not in the public code: the build adds them for the demo
  // when the private solutions are present; otherwise the demo shows the starter code with the same results.
  const ANS=/*__DEMO_ANSWERS__*/{};
  const sol=Object.fromEntries(["js-vars","js-cond","js-loops","go-vars","go-cond"].map(id=>[id,ANS[id]||EXM[id].starter]));

  const res={};Object.entries(sol).forEach(([id,code])=>{const ex=EXM[id];const n=ex.lang==="js"?ex.tests.length:goCheck(ex,code).length;res[id]={p:n,t:n,code,at:now-3*D};});
  const liya=PEERS["liya-g"].r,liyaB=liya.slice(0,-1);
  return {me:{login:"hana-t",demo:true},track:"js",diff:"all",statusF:"all",drafts:{...sol},res,
   subs:{
    "js-loops":{code:sol["js-loops"],at:now-2*D,tests:{p:3,t:3},reviewer:"liya-g",inCircle:true,review:{rub:{c:3,r:3,s:2},text:"All three tests pass and the loop is easy to follow. `total` is a clear name. Line 3 could use `i += 1` if you prefer to avoid ++, but this is fine. Next, try the same with reduce() to compare."},rating:5,delta:{s0:scoreOf(liyaB),s1:scoreOf(liya),r0:repOf(liyaB),r1:repOf(liya),l0:levelOf(repOf(liyaB)),l1:levelOf(repOf(liya))},ratedAt:now-2*D+H},
    "go-vars":{code:sol["go-vars"],at:now-5*H,tests:{p:6,t:6},reviewer:"dawit-b",inCircle:true,review:{rub:{c:3,r:3,s:2},text:"Both functions are correct and short. Using math.Round in Cents avoids the 0.1 × 100 = 9.999… problem, nice. In Go, exported functions usually get a doc comment that starts with the name, for example `// Cents converts birr to santim, rounding to the nearest one.` Add those and this is ready."},rating:null}
   },
   given:[
    {qid:"seed-a",ex:"js-vars",author:"abel-k",text:"Clear and correct. Line 2 checks null before Array.isArray, which is the right order. Consider a comment explaining why typeof null is \"object\".",rub:{c:3,r:3,s:2},stars:5,revealAt:now-4*D,why:["points to specific code","suggests a concrete change"]},
    {qid:"seed-b",ex:"js-cond",author:"nahom-t",text:"Works for all tests. The boundaries at 60/70/80/90 are right. You could return early for invalid scores first to make the rest simpler.",rub:{c:3,r:2,s:2},stars:4,revealAt:now-3*D,why:["suggests a concrete change"]},
    {qid:"seed-c",ex:"go-cond",author:"kidus-a",text:"Correct. The switch with no condition reads well. Maybe add a test for 100 yourself.",rub:{c:3,r:3,s:3},stars:4,revealAt:now-D,why:["suggests a concrete change"]}
   ],
   done:["seed-a","seed-b","seed-c"],peerExtra:{},
   pushes:[{sha:"4c1e9a2",msg:"Variables & Types",ex:"js-vars",p:6,t:6,pass:true,at:now-4*D},{sha:"b07d3f1",msg:"Loops",ex:"js-loops",p:2,t:3,pass:false,at:now-3*D},{sha:"e5a8c40",msg:"Loops",ex:"js-loops",p:3,t:3,pass:true,at:now-2*D-H}],
   circle:{...HOME_CIRCLE,members:HOME_CIRCLE.members.slice()},
   feed:[{at:now-3*H,who:"liya-g",what:"solved Goroutines"},{at:now-5*H,who:"dawit-b",what:"reviewed your Temperatures and cents"},{at:now-9*H,who:"ruth-m",what:"rated a review ★5"},{at:now-D,who:"nahom-t",what:"solved Class average"},{at:now-2*D,who:"liya-g",what:"reviewed your Sum with a loop"}]};
}
let S;
try{const r=localStorage.getItem(KEY);S=r?JSON.parse(r):seed();}catch(e){S=seed();}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}
const V={view:"challenges",ex:null,qid:null,rvDraft:null,rvAuto:null,confirm:null};

/* ---------- helpers ---------- */
let me=()=>S.me&&S.me.login;
let inCircle=login=>!!(S.circle&&S.circle.members.includes(login));
let myRatings=()=>S.given.filter(g=>g.stars&&Date.now()>=g.revealAt).map(g=>g.stars);
const peerRatings=n=>PEERS[n].r.concat(S.peerExtra[n]||[]);
// Live site: solutions count only when pushed to the learner's GitHub repository (set from /api/me).
let PUSH_ONLY=false;
let passedEx=id=>{const r=S.res[id];return !!(r&&r.p===r.t&&r.t>0);};
let myPoints=()=>BANK.filter(e=>passedEx(e.id)).reduce((a,e)=>a+ptsOf(e),0);
const peerPoints=n=>PEERS[n].solved.reduce((a,id)=>a+ptsOf(EXM[id]),0);
const stars=n=>"★".repeat(n)+"☆".repeat(5-n);
const RUBN={c:"Correctness",r:"Readability",s:"Style"};const RUBV=["","Needs work","Good","Excellent"];
const ago=t=>{const m=Math.round((Date.now()-t)/6e4);if(m<60)return m<=1?"just now":m+" min ago";const h=Math.round(m/60);if(h<24)return h+" h ago";return Math.round(h/24)+" d ago";};
function avatar(login,size){const hue=[...login].reduce((a,c)=>a+c.charCodeAt(0),0)%360;return `<span class="av${size?" "+size:""}" style="--h:${hue}" aria-hidden="true">${esc(login[0].toUpperCase())}</span>`;}
function stageOf(sub){if(!sub)return 0;if(sub.rating)return 7;const e=Date.now()-sub.at;if(e<1400)return 2;if(e<3800)return 3;return 5;}
function status(id){const sub=S.subs[id];if(sub){const st=stageOf(sub);if(st===7)return {k:"done",l:"Reviewed ★"+sub.rating};if(st===5)return {k:"act",l:"Rate the review"};return {k:"wait",l:"In review"};}
  if(passedEx(id))return {k:"pass",l:"Solved"};const r=S.res[id];if(r)return {k:"try",l:r.p+"/"+r.t+" passing"};return {k:"new",l:"Not tried"};}
function selectText(id){const el=document.getElementById(id);const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r);}
function copyBtn(btn,id){const txt=document.getElementById(id).textContent;const done=()=>{btn.textContent="Copied";setTimeout(()=>{btn.textContent="Copy";},1500);};try{navigator.clipboard.writeText(txt).then(done,()=>selectText(id));}catch(_){selectText(id);}}
function feed(what){S.feed.unshift({at:Date.now(),who:me(),what});S.feed=S.feed.slice(0,30);}

/* ---------- test runners ---------- */
const WORKER_SRC=HARNESS_SRC+`
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
self.onmessage=async(e)=>{const {code,tests}=e.data;const logs=[];
 console.log=(...a)=>{if(logs.length<40)logs.push(a.map(x=>typeof x==="string"?x:__fmt(x)).join(" "));};
 try{new AsyncFunction(code);}catch(err){self.postMessage({syntax:String(err&&err.message||err),out:[],logs});return;}
 const out=[];for(const t of tests){try{await new AsyncFunction(code+"\\n;"+t.t)();out.push({n:t.n,pass:true});}catch(err){out.push({n:t.n,pass:false,msg:String(err&&err.message||err)});}self.postMessage({partial:out.slice()});}
 self.postMessage({out,logs});};`;
let workerURL=null;
function runJS(ex,code){
  return new Promise(resolve=>{
    let w;try{if(!workerURL)workerURL=URL.createObjectURL(new Blob([WORKER_SRC],{type:"text/javascript"}));w=new Worker(workerURL);}catch(e){resolve({out:ex.tests.map(t=>({n:t.n,pass:false,msg:"This browser blocked the test runner: "+e.message}))});return;}
    let partial=[];
    const timer=setTimeout(()=>{w.terminate();resolve({out:ex.tests.map((t,i)=>partial[i]||{n:t.n,pass:false,msg:i===partial.length?"Timed out after 4 s. Check for a loop that never ends.":"Not run"}),logs:[]});},4000);
    w.onmessage=e=>{if(e.data.partial){partial=e.data.partial;return;}clearTimeout(timer);w.terminate();resolve(e.data);};
    w.onerror=e=>{clearTimeout(timer);w.terminate();resolve({out:ex.tests.map(t=>({n:t.n,pass:false,msg:e.message||"Runner error"}))});if(e.preventDefault)e.preventDefault();};
    w.postMessage({code,tests:ex.tests});
  });
}
async function runChecks(ex,code){
  if(ex.lang==="go")return {out:goCheck(ex,code)};
  const r=await runJS(ex,code);
  if(r.syntax)return {out:ex.tests.map(t=>({n:t.n,pass:false,msg:"Syntax error: "+r.syntax})),logs:r.logs};
  return r;
}

/* ---------- simulated reviewers ---------- */
function lineOf(code,re){const ls=code.split("\n");for(let i=0;i<ls.length;i++)if(re.test(ls[i]))return i+1;return 0;}
function makeReview(ex,code){
  const notes=[];let r=3,s=3;const lines=code.trim().split("\n").length;
  if(ex.lang==="js"){
    const v=lineOf(code,/\bvar\b/);if(v){notes.push(`Line ${v} uses \`var\`. Prefer \`let\` or \`const\` so the variable is scoped to its block.`);s--;}
    const c=lineOf(code,/console\.log/);if(c){notes.push(`Remove the \`console.log\` on line ${c}; the tests should be the only output.`);s--;}
    if(!/;\s*$/m.test(code))notes.push("Semicolons are missing. JavaScript inserts them for you, but being explicit avoids surprises.");
    if(/=>\s*\{?[^\n]*this\./.test(code)){notes.push("An arrow function uses `this`. Arrow functions take `this` from the outer scope, which is rarely what you want in a method.");r--;}
  }else{
    const exported=[...code.matchAll(/^func\s*(?:\([^)]*\)\s*)?([A-Z]\w*)/gm)].map(m=>m[1]);
    const undocumented=exported.filter(n=>!new RegExp("//\\s*"+n+"\\b").test(code));
    if(undocumented.length){notes.push(`Exported functions usually get a doc comment that starts with their name, for example \`// ${undocumented[0]} returns …\`.`);s--;}
    const p=lineOf(code,/fmt\.Print/);if(p){notes.push(`Line ${p} prints with fmt. Remove debug output before submitting.`);s--;}
    if(/sync\.Mutex/.test(code)&&!/defer\s+\w+(\.\w+)*\.Unlock/.test(code)){notes.push("Unlock with `defer mu.Unlock()` right after Lock so an early return can never leave the mutex locked.");r--;}
  }
  if(lines>25){notes.push(`At ${lines} lines this is longer than it needs to be. Look for repeated branches you can merge.`);r--;}
  if(code.split("\n").some(l=>/^(\s{8,}|\t{3,})\S/.test(l))){notes.push("The nesting gets deep. Returning early from each case would flatten it.");r--;}
  const open=notes.length?"All tests pass, so the logic is right.":"All tests pass and the code reads cleanly.";
  const close=notes.length?"Fix these and it is ready.":"Nothing to change. Try the next challenge in this track.";
  return {rub:{c:3,r:Math.max(1,r),s:Math.max(1,s)},text:[open,...notes.slice(0,3),close].join(" ")};
}
function rateReview(text,rub,code){
  let s=1;const why=[];const L=text.trim().length;
  if(L>=40)s++;
  if(L>=120){s++;why.push("explains in enough detail");}
  const ids=[...new Set(code.match(/[A-Za-z_]\w{2,}/g)||[])].filter(w=>!/^(function|return|const|let|var|func|package|import|string|int|float64|bool|true|false|else|range|for|nil|if)$/.test(w));
  if(/\bline\s*\d+|`[^`]+`/i.test(text)||ids.some(w=>new RegExp("\\b"+w+"\\b").test(text))){s++;why.push("points to specific code");}
  if(/\b(try|consider|could|instead|suggest|rename|extract|prefer|replace|would be|move)\b/i.test(text)){s++;why.push("suggests a concrete change");}
  if(rub.c===3&&rub.r===3&&rub.s===3&&L<60){s--;why.push("all-excellent scores with little explanation");}
  if(L<40)why.push("very short");
  return {stars:Math.max(1,Math.min(5,s)),why};
}
// Circle first; the wider pool only when no circle member who passed this challenge is free.
function pickReviewer(exId){
  const ok=n=>PEERS[n].solved.includes(exId)&&!probation(peerRatings(n));
  const pool=Object.keys(PEERS).filter(ok);
  const circle=pool.filter(inCircle);
  const from=circle.length?circle:pool;
  if(!from.length)return null;
  const w=from.map(n=>{const r=peerRatings(n);return scoreOf(r)*(1+levelOf(repOf(r))*0.25);});
  let x=Math.random()*w.reduce((a,b)=>a+b,0);
  for(let i=0;i<from.length;i++){x-=w[i];if(x<=0)return {login:from[i],inCircle:circle.length>0};}
  return {login:from[0],inCircle:circle.length>0};
}

/* ---------- shell ---------- */
const app=document.getElementById("app");
function render(){
  const waiting=me()?QUEUE.filter(q=>!S.done.includes(q.id)&&passedEx(q.ex)).length:0;
  const nav=[["challenges","Challenges"],["reviews","Reviews"+(waiting?` <span class="badge">${waiting}</span>`:"")],["circle","Circle"],["profile","Profile"]];
  const cur=({track:"challenges",exercise:"challenges",review:"reviews",signin:"profile"})[V.view]||V.view;
  document.getElementById("nav").innerHTML=nav.map(([v,l])=>`<button data-act="view" data-v="${v}" ${cur===v?'aria-current="page"':""}>${l}</button>`).join("");
  document.getElementById("who").innerHTML=me()?`<button class="who" data-act="view" data-v="profile">${avatar(me())}<span class="mono">@${esc(me())}</span></button>`:`<button class="btn gh-btn small" data-act="view" data-v="signin">${GH}Sign in</button>`;
  if(V.view!=="exercise"&&V.view!=="review")stopTick();
  const views={challenges:viewChallenges,track:viewTrack,exercise:viewExercise,reviews:viewReviews,review:viewReview,circle:viewCircle,profile:viewProfile,signin:viewSignin,user:viewUser};
  if(CM){CM.destroy();CM=null;}
  // Migration bridge: a screen that has a new (Preact) version is drawn by src/next; the rest as before.
  if(window.TBNext&&TBNext.has(V.view))TBNext.render(V.view,app,V);
  else{if(window.TBNext)TBNext.unmount(app);app.innerHTML=(views[V.view]||viewChallenges)();}
  document.title=titleOf();
  upgradeEditor();
  document.getElementById("resetZone").innerHTML=V.confirm==="reset"?`<span class="confirm">Clear everything on this device? <button class="btn small" data-act="reset-yes">Yes, reset</button><button class="btn small" data-act="confirm-no">Cancel</button></span>`:`<button class="linkish" data-act="reset">Reset demo</button>`;
}
const GH=`<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="currentColor"><path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38v-1.33c-2.23.48-2.7-1.07-2.7-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.72 1.22 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2-3.65-.89-3.65-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.66 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 8 0Z"/></svg>`;
function go(view,extra){stopTick();Object.assign(V,{view},extra||{});if(ROUTED&&location.pathname!==pathOf())history.pushState(null,"",pathOf());render();window.scrollTo(0,0);}
function viewUser(){return viewChallenges();}// learners' profiles are on the live site only
/* ---------- routing (live site): every page has its own address and title ----------
   /                                   the two tracks
   /challenges/js  /challenges/js/basic  /challenges/go/advanced     a track, optionally one level
   /challenges/js/basic/vars           a challenge (its id without the js-/go- prefix)
   /reviews  /reviews/<id>  /circle  /profile  /signin  /u/<github-login> (a learner's profile)                                       */
const ROUTED=LIVE&&typeof history!=="undefined"&&/^https?:$/.test(location.protocol);
const TRACK_LEVELS=["basic","advanced"],cap=s=>s[0].toUpperCase()+s.slice(1),slugOf=id=>id.replace(/^(js|go)-/,"");
function pathOf(){
  switch(V.view){
    case "track":return `/challenges/${S.track==="go"?"go":"js"}`+(V.level?`/${V.level}`:"");
    case "exercise":{const e=EXM[V.ex];return e?`/challenges/${e.lang}/${e.level}/${slugOf(e.id)}`:"/";}
    case "reviews":return "/reviews";
    case "review":return `/reviews/${encodeURIComponent(V.qid||"")}`;
    case "circle":case "profile":case "signin":return "/"+V.view;
    case "user":return `/u/${encodeURIComponent(V.login||"")}`;
    default:return "/";
  }
}
function titleOf(){
  const T="Timirtbet";
  switch(V.view){
    case "track":{const k=S.track==="go"?"go":"js";return `${LANGN[k]}${V.level?` ${V.level}`:""} challenges · ${T}`;}
    case "exercise":{const e=EXM[V.ex];return e?`${e.title} · ${LANGN[e.lang]} ${e.level} · ${T}`:T;}
    case "reviews":return `Reviews · ${T}`;
    case "review":return `Write a review · ${T}`;
    case "circle":return `Review circle · ${T}`;
    case "profile":return `Profile · ${T}`;
    case "signin":return `Get started · ${T}`;
    case "user":return `@${V.login} · ${T}`;
    default:return `${T} | ትምህርት ቤት`;
  }
}
function routeFrom(path){
  const p=path.split("/").filter(Boolean).map(decodeURIComponent);
  if(p[0]==="challenges"&&(p[1]==="js"||p[1]==="go")){
    const lang=p[1],level=TRACK_LEVELS.includes(p[2])?p[2]:null,slug=level?p[3]:p[2];
    if(slug&&EXM[`${lang}-${slug}`])return {view:"exercise",ex:`${lang}-${slug}`,track:lang};
    return {view:"track",track:lang,level};
  }
  if(p[0]==="reviews")return p[1]?{view:"review",qid:p[1]}:{view:"reviews"};
  if(["circle","profile","signin"].includes(p[0]))return {view:p[0]};
  if(p[0]==="u"&&/^[\w-]{1,39}$/.test(p[1]||""))return {view:"user",login:p[1]};
  return {view:"challenges"};
}
function applyRoute(path){
  const r=routeFrom(path);
  if(r.track){S.track=r.track;}
  Object.assign(V,{view:r.view,level:r.level||null,confirm:null},r.ex?{ex:r.ex}:{},r.login?{login:r.login,utab:null}:{},r.qid?{qid:r.qid,rvDraft:{rub:{c:0,r:0,s:0},text:""},rvAuto:null}:{});
  if(ROUTED&&location.pathname!==pathOf())history.replaceState(null,"",pathOf());// tidy unknown or partial addresses
}
if(ROUTED)window.addEventListener("popstate",()=>{stopTick();applyRoute(location.pathname);render();});

/* ---------- challenges ---------- */
/* ---------- challenges: two language tracks, then each track's list ---------- */
const TRACKS={
  js:{tag:"JS",blurb:"The language of the web. Start with values and functions, then work up to closures, classes and async code.",
    code:`<i class="k">const</i> <i class="f">greet</i> = (name) =>\n  <i class="s">\`Selam, \${name}!\`</i>;\n\n<i class="f">greet</i>(<i class="s">"Abebe"</i>);\n<i class="c">// → "Selam, Abebe!"</i>`},
  go:{tag:"Go",blurb:"Fast, simple and built for servers. Learn types, slices and errors, then goroutines and channels.",
    code:`<i class="k">func</i> <i class="f">greet</i>(name <i class="t">string</i>) <i class="t">string</i> {\n    <i class="k">return</i> <i class="s">"Selam, "</i> + name + <i class="s">"!"</i>\n}\n\n<i class="c">// greet("Abebe") → "Selam, Abebe!"</i>`}
};
const TRACK_IMG=/*__TRACKIMG__*/{};
function trackCard(k){
  const t=TRACKS[k],all=BANK.filter(e=>e.lang===k),done=all.filter(e=>passedEx(e.id)).length;
  const basic=all.filter(e=>e.level==="basic").length,pts=all.reduce((a,e)=>a+ptsOf(e),0);
  const topics=[...new Set(all.map(e=>e.topic))];
  const cta=done===0?`Start ${LANGN[k]}`:done===all.length?"Review solutions":`Continue · ${done}/${all.length}`;
  return `<button class="track track-${k}" data-act="track" data-v="${k}" aria-label="${LANGN[k]}: ${all.length} challenges">
   <span class="track-cover" aria-hidden="true"><span class="track-dots"><i></i><i></i><i></i><span class="mono">${k==="js"?"solution.js":"solution.go"}</span></span><pre class="track-code">${t.code}</pre></span>
   <span class="track-body">
    <span class="track-head"><img class="track-logo track-logo-${k}" src="${TRACK_IMG[k]}" alt=""><b>${LANGN[k]}</b><span class="mono muted">${all.length} challenges</span></span>
    <span class="track-blurb">${t.blurb}</span>
    <span class="track-topics">${topics.slice(0,6).map(x=>`<span>${esc(x)}</span>`).join("")}${topics.length>6?`<span class="more">+${topics.length-6} more</span>`:""}</span>
    <span class="track-stats"><span><b>${basic}</b> basic</span><span><b>${all.length-basic}</b> advanced</span><span><b>${pts}</b> points</span></span>
    <span class="track-foot"><span class="bar"><i style="width:${all.length?done/all.length*100:0}%"></i></span><span class="track-cta">${cta} →</span></span>
   </span></button>`;
}
function viewChallenges(){
  const solved=BANK.filter(e=>passedEx(e.id)).length;
  return `<h1 class="sr-only">Choose a track</h1><div class="tracks">${trackCard("js")}${trackCard("go")}</div>
   <div class="home-side">${progressCard(solved)}${circleMini()}${howCard()}</div>`;
}
function viewTrack(){
  const k=S.track==="go"?"go":"js",all=BANK.filter(e=>e.lang===k);
  const keep=e=>(S.diff==="all"||diffOf(e)===S.diff)&&(S.statusF==="all"||(S.statusF==="solved"?passedEx(e.id):!passedEx(e.id)));
  const solved=BANK.filter(e=>passedEx(e.id)).length,done=all.filter(e=>passedEx(e.id)).length;
  const chip=(key,v,l)=>`<button data-act="filter" data-k="${key}" data-v="${v}" aria-pressed="${S[key]===v}">${l}</button>`;
  const row=e=>{const st=status(e.id),d=diffOf(e);return `<button class="ch-row" data-act="open" data-id="${e.id}"><span class="ch-main"><b>${esc(e.title)}</b><span class="muted">${esc(e.topic)} · ${e.level==="basic"?"Basic":"Advanced"}</span></span><span class="diff ${d.toLowerCase()}">${d}</span><span class="mono pts">${ptsOf(e)} pts</span><span class="st ${st.k}">${esc(st.l)}</span></button>`;};
  const filtered=S.diff!=="all"||S.statusF!=="all";const langMods=MODULES.filter(m=>m.lang===k&&(!V.level||EXM[m.exercises[0]].level===V.level));
  const lvTab=(v,l)=>`<button data-act="level" data-v="${v}" aria-pressed="${(V.level||"")===v}">${l}</button>`;
  const current=(langMods.find(m=>{const ms=moduleState(m);return !(ms.passed===ms.total&&ms.sub&&ms.sub.status==="rated");})||{}).id;
  S.modOpen=S.modOpen||{};
  const mods=langMods.map(m=>{const list=m.exercises.map(id=>EXM[id]).filter(keep);if(!list.length)return "";const ms=moduleState(m);
    const open=filtered||(S.modOpen[m.id]!=null?S.modOpen[m.id]:m.id===current);
    return `<details class="mod" data-mod="${m.id}"${open?" open":""}><summary class="mod-h"><span class="mod-chev" aria-hidden="true"></span><span class="mod-t"><span class="mod-n">Module ${modNum(m)}</span><span class="mod-title">${esc(m.title)}</span></span><span class="mod-meta">${modChip(ms)}<span class="mod-bar" aria-hidden="true"><i style="width:${Math.round(ms.passed/ms.total*100)}%"></i></span><span class="mod-prog mono">${ms.passed}/${ms.total} passed</span></span></summary><div class="panel ch-list">${list.map(row).join("")}<div class="mod-foot">${moduleFoot(m,ms)}</div></div></details>`;}).join("")||`<p class="muted" style="padding:16px">No challenges match these filters.</p>`;
  return `<button class="back" data-act="view" data-v="challenges">← All tracks</button>
  <header class="track-title track-${k}"><img class="track-logo track-logo-${k} track-logo-lg" src="${TRACK_IMG[k]}" alt=""><div><h1>${LANGN[k]}</h1><p class="muted">${TRACKS[k].blurb}</p></div><span class="mono muted track-count">${done}/${all.length} solved</span></header>
  <div class="grid2"><div>
   <div class="seg-tabs lvl-tabs" role="group" aria-label="Level">${lvTab("","All modules")}${lvTab("basic","Basic")}${lvTab("advanced","Advanced")}</div>
   <div class="toolbar"><div class="chips" role="group" aria-label="Difficulty">${chip("diff","all","All")}${chip("diff","Easy","Easy")}${chip("diff","Medium","Medium")}${chip("diff","Hard","Hard")}</div>
    <div class="chips" role="group" aria-label="Status">${chip("statusF","all","Any")}${chip("statusF","unsolved","Unsolved")}${chip("statusF","solved","Solved")}</div></div>
   ${mods}</div>
   <aside class="side">${progressCard(solved)}${circleMini()}${modHowCard()}</aside></div>`;
}
/* Module state and actions. Demo mode has no server grader, so modules can't go to review there; live.js replaces these. */
function moduleState(m){const passed=m.exercises.filter(id=>passedEx(id)).length;return {passed,total:m.exercises.length,sub:null,ready:false,demo:true};}
function moduleFoot(m,ms,inline){
  if(ms.guest)return `<span class="muted">Every passed challenge counts. Sign in with GitHub to submit a finished module for review.</span>`;
  if(ms.demo)return `<span class="muted">Module review runs on the live site: each passed challenge counts, and the whole module goes to one reviewer.</span>`;
  const sub=ms.sub;
  if(sub&&sub.status==="rated")return `<span class="st done">Reviewed ★${sub.rating}</span>${inline?(moduleReady(m,ms)?`<button class="btn small" data-act="submit-module" data-id="${m.id}">Submit again for a new review</button>`:""):`<button class="btn small" data-act="open" data-id="${m.exercises[0]}">See the review</button>`}`;
  if(sub&&sub.status==="reviewed")return `<span class="st act">Review received</span>${inline?`<span class="muted">Rate it below.</span>`:`<button class="btn small primary" data-act="open" data-id="${m.exercises[0]}">Rate the review</button>`}`;
  if(sub)return `<span class="st wait">In review</span><span class="muted">${sub.status==="waiting_for_reviewer"?"Waiting for someone who finished this module to be free":"A reviewer is reading your solutions"}</span>`;
  const err=ms.err?`<span class="err" role="alert" style="flex-basis:100%;margin:0">${esc(ms.err)}</span>`:"";
  if(ms.resave&&ms.resave.length&&!sub&&PUSH_ONLY)return `<span class="muted">Push ${ms.resave.map(id=>`<button class="linkish" data-act="open" data-id="${id}">${esc(EXM[id].title)}</button>`).join(", ")} from your GitHub repository to submit this module.</span>${err}`;
  if(ms.resave&&ms.resave.length&&!sub)return `<span class="muted">Run the tests once more on ${ms.resave.map(id=>`<button class="linkish" data-act="open" data-id="${id}">${esc(EXM[id].title)}</button>`).join(", ")} to save ${ms.resave.length>1?"those solutions":"that solution"} for review.</span>${err}`;
  if(ms.ready)return `<span class="okc">All ${ms.total} passed.</span><button class="btn small primary" data-act="submit-module" data-id="${m.id}">Submit module for review</button>${err}`;
  return `<span class="muted">${PUSH_ONLY?`Push all ${ms.total} challenges from your GitHub repository to submit this module for review.`:`Pass all ${ms.total} challenges on the grader to submit this module for review.`}</span>`;
}
function modChip(ms){const sub=ms.sub;
  if(sub&&sub.status==="rated")return `<span class="st done">Reviewed ★${sub.rating}</span>`;
  if(sub&&sub.status==="reviewed")return `<span class="st act">Rate the review</span>`;
  if(sub)return `<span class="st wait">In review</span>`;
  if(ms.ready)return `<span class="st act">Ready to submit</span>`;
  return "";}
document.addEventListener("toggle",e=>{const d=e.target;if(d.matches&&d.matches("details.mod[data-mod]")){S.modOpen=S.modOpen||{};S.modOpen[d.dataset.mod]=d.open;save();}},true);
function moduleReady(m,ms){return ms.passed===ms.total;}
function modHowCard(){return `<details class="panel how"><summary>How module review works</summary><div class="pad"><ol class="steps"><li>Commit each challenge to your GitHub repository and run the tests here</li><li>Every pass earns points</li><li>When every challenge in a module passes, submit the module</li><li>Someone who finished that module reviews all of it within 72 hours</li><li>You rate the review ★1–5</li></ol><p class="muted" style="font-size:13px;margin:10px 0 0">Reviewers must have finished the same module. You see who reviews your module; they don't see who wrote it.</p></div></details>`;}
function progressCard(solved){
  const pts=myPoints(),max=BANK.reduce((a,e)=>a+ptsOf(e),0);
  if(!me())return `<section class="panel"><h2>Practising as a guest</h2><div class="pad"><p class="muted" style="margin:0 0 12px;font-size:14px">Every challenge and its tests work without an account; your code stays in this browser. Sign in with GitHub to submit for review and join a circle.</p><button class="btn gh-btn" data-act="view" data-v="signin">${GH}Sign in with GitHub</button></div></section>`;
  return `<section class="panel"><h2>Your progress</h2><div class="pad"><div class="kpis"><div><div class="k">${pts}</div><div class="muted">points</div></div><div><div class="k">${solved}<small>/${BANK.length}</small></div><div class="muted">solved</div></div><div><div class="k">${scoreOf(myRatings()).toFixed(1)}</div><div class="muted">review score</div></div></div><div class="bar" style="margin-top:12px"><i style="width:${pts/max*100}%"></i></div><div class="muted mono" style="font-size:12px;margin-top:4px">${pts} of ${max} points</div></div></section>`;
}
function circleMini(){
  if(!me())return "";
  if(!S.circle)return `<section class="panel"><h2>Review circle</h2><div class="pad"><p class="muted" style="margin:0 0 12px;font-size:14px">You're not in a circle, so reviews come from the wider pool. Join friends with an invite code, or start your own.</p><button class="btn" data-act="view" data-v="circle">Find a circle</button></div></section>`;
  const waiting=QUEUE.filter(q=>!S.done.includes(q.id)&&passedEx(q.ex)&&inCircle(q.author)).length;
  return `<section class="panel"><h2>${esc(S.circle.name)}</h2><div class="pad"><div class="avs">${[me()].concat(S.circle.members).map(m=>avatar(m)).join("")}</div><p class="muted" style="font-size:13.5px;margin:10px 0 12px">${S.circle.members.length+1} members · reviews go here first</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-act="view" data-v="circle">Open circle</button>${waiting?`<button class="btn primary" data-act="view" data-v="reviews">${waiting} to review</button>`:""}</div></div></section>`;
}
function howCard(){return modHowCard();}// reviews are per module

/* ---------- a challenge ---------- */
/* CodeMirror 6 (web/editor) replaces the plain textarea once its script has loaded; the textarea is the fallback. */
let CM=null;
function upgradeEditor(){
  const ta=document.getElementById("editor");
  if(!ta||ta.tagName!=="TEXTAREA"||!window.TBEditor||!EXM[V.ex])return;
  const box=ta.closest(".editor"),host=document.createElement("div"),had=document.activeElement===ta;
  host.className="cm-host";ta.removeAttribute("id");host.id="editor";
  CM=window.TBEditor.create({parent:host,doc:ta.value,lang:EXM[V.ex].lang,onChange:()=>host.dispatchEvent(new Event("input",{bubbles:true})),onRun:()=>run()});
  Object.defineProperty(host,"value",{get:()=>CM.value,set:v=>{CM.value=v;}});
  box.classList.add("cm");box.replaceChildren(host);if(had)CM.focus();
}
window.addEventListener("tbeditor-ready",upgradeEditor);
function gutter(code){return code.split("\n").map((_,i)=>i+1).join("\n");}
function codeBlock(code){const c=code.replace(/\n$/,"");return `<div class="codeview"><pre class="gut">${c.split("\n").map((_,i)=>i+1).join("\n")}</pre><pre class="src">${esc(c)}</pre></div>`;}
function mdLite(s){return esc(s).replace(/`([^`]+)`/g,"<code>$1</code>");}
function flowStrip(active){return `<ol class="flow" aria-label="Review flow">${STEPS.map((s,i)=>`<li class="${active?(i+1<active?"done":i+1===active?"cur":""):""}"><b>${i+1}</b><span>${esc(s)}</span></li>`).join("")}</ol>`;}
function viewExercise(){
  const ex=EXM[V.ex];const code=S.drafts[ex.id]!=null?S.drafts[ex.id]:ex.starter;const r=S.res[ex.id];const sub=S.subs[ex.id];const d=diffOf(ex);
  const tests=ex.lang==="js"
   ?`<div class="panel"><h2>Tests <span class="muted" style="font-weight:500;font-size:13px">run in your browser</span></h2><ul class="tests">${ex.tests.map(t=>`<li><span class="dot"></span><div><div>${esc(t.n)}</div><code>${esc(t.t)}</code></div></li>`).join("")}</ul></div>`
   :`<div class="panel"><h2>Tests</h2><div class="pad" style="padding-bottom:6px"><p class="note-go">This page checks your code's structure right away. The grader runs the real test file below with <code>go test -race</code> when you submit or push.</p></div><details class="gofile"><summary>${esc(ex.id.replace(/-/g,"_"))}_test.go</summary>${codeBlock(ex.test)}</details></div>`;
  return `<button class="back" data-act="track" data-v="${ex.lang}">← ${LANGN[ex.lang]} challenges</button>
  <div class="ex-head"><div><p class="eyebrow">${LANGN[ex.lang]} · ${esc(ex.topic)}</p><h1 class="pg-h">${esc(ex.title)}</h1></div><div class="ex-meta"><span class="diff ${d.toLowerCase()}">${d}</span><span class="mono pts">${ptsOf(ex)} pts</span></div></div>
  <div class="ex-grid"><div class="side"><div class="panel"><h2>Task</h2><div class="pad prompt">${mdLite(ex.prompt)}</div></div>${tests}</div>
   <div><div class="panel editor-panel"><div class="ed-bar"><span class="mono muted" style="font-size:12px">${ex.lang==="js"?"solution.js":"solution.go"}</span><button class="btn small" data-act="resetcode">Reset to starter</button></div>
    <div class="editor"><pre class="gut" id="gut" aria-hidden="true">${gutter(code)}</pre><textarea id="editor" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Code editor">${esc(code)}</textarea></div>
    <div class="ed-foot"><button class="btn primary" data-act="run" id="runBtn">▶ ${ex.lang==="js"?"Run tests":"Run checks"}</button>${me()?(LIVE?"":`<button class="btn" data-act="submit" id="subBtn" ${canSubmit(ex,code)?"":"disabled"}>Submit for review</button>`):`<button class="btn gh-btn" data-act="view" data-v="signin">${GH}${LIVE?"Sign in to save progress":"Sign in to submit"}</button>`}<span class="muted" style="font-size:12.5px" id="edHint">${hint(ex,code)}</span></div>
    <div id="results">${resultsHTML(ex,r,code)}</div></div>
   ${me()?ghPanel(ex):""}
   <div id="prPanel">${peerPanel(ex)}</div></div></div>`;
}
function canSubmit(ex,code){const r=S.res[ex.id],sub=S.subs[ex.id];return !!(me()&&r&&r.code===code&&r.p===r.t&&!(sub&&stageOf(sub)<7));}
function hint(ex,code){const sub=S.subs[ex.id];if(sub&&stageOf(sub)===5)return "Review received. Rate it below.";if(sub&&stageOf(sub)<7)return "In review. You can keep practising.";if(canSubmit(ex,code))return "All passing. Ready to submit.";return "Pass every test to submit. Ctrl+Enter runs.";}
function resultsHTML(ex,r,code){
  if(!r)return `<p class="res-empty">No run yet.</p>`;
  return `<div class="res"><div class="res-h"><b class="${r.p===r.t?"okc":"badc"}">${r.p} / ${r.t} ${ex.lang==="js"?"tests":"checks"} passed</b>${r.code!==code?`<span class="muted" style="font-size:12.5px">Code changed since this run</span>`:""}</div><ul>${(r.out||[]).map(o=>`<li class="${o.pass?"ok":"bad"}"><span>${o.pass?"✓":"✗"}</span><div>${esc(o.n)}${o.msg?`<div class="msg mono">${esc(o.msg)}</div>`:""}</div></li>`).join("")}</ul>${r.logs&&r.logs.length?`<div class="logs mono">${r.logs.map(esc).join("\n")}</div>`:""}</div>`;
}
function ghPanel(ex){
  const file=ex.lang==="js"?`js/${ex.id}/solution.js`:`go/${ex.id.replace(/-/g,"_")}/solution.go`;
  return `<details class="panel gh"><summary>Or push from your GitHub repository</summary><div class="pad">
   <p class="muted" style="font-size:13.5px;margin:0 0 8px">Edit <code>${file}</code> in <span class="mono">timirtbet/${esc(me())}-code</span> and push. The same tests run, and a pass goes to your circle just like Submit.</p>
   <pre class="shell mono">git add ${file}
git commit -m "${esc(ex.title)}"
git push</pre>
   <div class="ed-foot" style="padding:8px 0 0;border:0"><button class="btn" data-act="push">Simulate a push with this code</button></div><div id="pushOut"></div></div></details>`;
}
function peerPanel(ex){
  const sub=S.subs[ex.id];
  if(!sub)return `<section class="panel pr"><h2>Review</h2><div class="pad">${flowStrip(1)}<p class="muted" style="font-size:14px;margin:12px 0 0">${me()?(S.circle?`When every test passes, submit. Someone in ${esc(S.circle.name)} who solved this challenge reviews it, and you rate their review.`:"When every test passes, submit. Since you're not in a circle, a reviewer comes from the wider pool."):"Guests can run every test. Sign in with GitHub to get your solutions reviewed."}</p></div></section>`;
  const st=stageOf(sub);const who=sub.reviewer;let b="";
  b+=`<div class="stage-box"><b>2 · Automatic tests</b><span class="okc">${sub.tests.p} / ${sub.tests.t} passed</span></div>`;
  if(st>=3){const lv=levelOf(repOf(peerRatings(who)));b+=`<div class="stage-box"><b>3 · Reviewer</b><span>A ${sub.inCircle?"circle member":"reviewer from the wider pool"} · <span class="lvl lvl${lv} sm">${LEVELS[lv].n}</span></span></div>`;}
  if(st===3)b+=`<p class="muted pulse" style="font-size:14px">Your code is being read…</p>`;
  if(st>=5){
    b+=`<div class="review"><div class="rv-h"><b>4 · The review</b><span class="rub">${Object.keys(RUBN).map(k=>`<span>${RUBN[k]}: <b>${RUBV[sub.review.rub[k]]}</b></span>`).join("")}</span></div><p>${mdLite(sub.review.text)}</p></div>`;
    if(st===5)b+=`<div class="rate"><b>5 · How helpful was this review?</b><div class="stars-in" role="group" aria-label="Rate the review">${[1,2,3,4,5].map(n=>`<button data-act="rate" data-s="${n}" aria-label="${n} star${n>1?"s":""}">★</button>`).join("")}</div><span class="muted" style="font-size:12.5px">1 = not helpful · 5 = specific and useful</span></div>`;
    else{const d=sub.delta;b+=`<div class="stage-box"><b>5 · You rated it</b><span class="starsv">${stars(sub.rating)}</span></div><div class="stage-box"><b>6 · Their review score</b><span class="mono">${d.s0.toFixed(2)} → <b>${d.s1.toFixed(2)}</b></span></div><div class="stage-box"><b>7 · Their reputation</b><span class="mono">${d.r0} → <b>${d.r1}</b> pts (${d.r1-d.r0>=0?"+":""}${d.r1-d.r0})</span><span class="lvl lvl${d.l1} sm">${LEVELS[d.l1].n}${d.l1>d.l0?" · level up":""}</span></div>`;}
  }
  return `<section class="panel pr"><h2>Review</h2><div class="pad">${flowStrip(st===7?8:st)}<div class="stages">${b}</div></div></section>`;
}

/* ---------- reviews ---------- */
function viewReviews(){
  if(!me())return signinNeeded("Sign in to review other learners' code and build a reviewer reputation.");
  const items=QUEUE.map(q=>({...q,e:EXM[q.ex],locked:!passedEx(q.ex),done:S.done.includes(q.id),circle:inCircle(q.author)})).sort((a,b)=>(a.done-b.done)||(b.circle-a.circle)||(a.locked-b.locked));
  const r=myRatings(),rep=repOf(r),lv=levelOf(rep),nx=LEVELS[lv+1];
  return `<p class="eyebrow">Reviews</p><h1 class="pg-h">Review code, earn reputation</h1><p class="lede">You can review a challenge once you've solved it. Circle members' code comes first. You don't see who wrote it, and they don't see who reviewed it.</p>
  <div class="grid2" style="margin-top:20px"><div><div class="queue">${items.map(q=>`<div class="q-row ${q.locked?"locked":""}"><span class="ic mono">${q.e.lang==="js"?"JS":"Go"}</span><div><div class="t">${esc(q.e.title)} <span class="muted">· ${esc(q.e.topic)}</span></div><div class="tch">${q.circle?`<span class="tag">Your circle</span>`:`<span class="tag quiet">Wider pool</span>`} ${diffOf(q.e)}</div></div>${q.done?`<span class="st done">Reviewed</span>`:q.locked?`<button class="btn small" data-act="open" data-id="${q.ex}">Solve it first</button>`:`<button class="btn small primary" data-act="review" data-id="${q.id}">Review</button>`}</div>`).join("")}</div>
   <h2 class="h2">Ratings your reviews got</h2><div class="panel"><div class="pad">${S.given.slice().reverse().map(g=>{const shown=g.stars&&Date.now()>=g.revealAt;return `<div class="act"><span><b>${esc(EXM[g.ex].title)}</b><br><span class="muted" style="font-size:12.5px">${esc(g.text.slice(0,110))}${g.text.length>110?"…":""}</span></span><span class="starsv">${shown?stars(g.stars)+` <span class="mono muted" style="font-size:12px">${PTS[g.stars]>0?"+":""}${PTS[g.stars]}</span>`:"waiting…"}</span></div>`;}).join("")||`<p class="muted">No rated reviews yet.</p>`}</div></div></div>
   <aside class="side"><section class="panel prof"><h2>Your reviewer profile</h2><div class="pad"><div class="prof-top"><div><div class="big">${scoreOf(r).toFixed(2)}<small> ★ score</small></div><div class="muted" style="font-size:13px">${r.length} rated reviews</div></div><span class="lvl lvl${lv}">${LEVELS[lv].n}</span></div><div class="rep-row"><span class="mono">${rep} pts</span><span class="muted">${nx?`${nx.min-rep} to ${nx.n}`:"Top level"}</span></div><div class="bar"><i style="width:${nx?Math.round((rep-LEVELS[lv].min)/(nx.min-LEVELS[lv].min)*100):100}%"></i></div></div></section>${howRep()}</aside></div>`;
}
function howRep(){return `<details class="panel how"><summary>How scores and reputation work</summary><div class="pad"><p><b>Review score</b> is a weighted average of the stars your reviews get. Everyone starts at 3.5:</p><p class="formula mono">(5 × 3.5 + sum of stars) ÷ (5 + ratings)</p><p><b>Points</b> per rated review: ★5 +10 · ★4 +6 · ★3 +2 · ★2 −3 · ★1 −6.</p><p><b>Levels:</b> New (0) → Helpful (30) → Trusted (100) → Mentor (250). Hard challenges go to Helpful reviewers and above first.</p><p><b>Probation:</b> 4 or more ratings with a score under 3.0 pauses new reviews until it recovers.</p></div></details>`;}
function viewReview(){
  const q=QUEUE.find(x=>x.id===V.qid);const ex=EXM[q.ex];const g=S.given.find(x=>x.qid===q.id);const d=V.rvDraft;const a=V.rvAuto;
  const form=g?reviewResult(g):`<section class="panel"><h2>Your review</h2><div class="pad rv-form">
    ${Object.keys(RUBN).map(k=>`<div class="rub-row"><span>${RUBN[k]}</span><div class="seg" role="group" aria-label="${RUBN[k]}">${[1,2,3].map(v=>`<button data-act="rub" data-k="${k}" data-v="${v}" aria-pressed="${d.rub[k]===v}">${RUBV[v]}</button>`).join("")}</div></div>`).join("")}
    <label for="rvText" class="lbl-sm">Your comment</label><textarea id="rvText" rows="6" placeholder="Point to a line, say what works, and suggest one change.">${esc(d.text)}</textarea>
    <div class="rv-foot"><span class="muted mono" id="rvCount" style="font-size:12px">${d.text.trim().length} / 40 characters minimum</span><button class="btn primary" data-act="sendreview" id="rvSend" ${canSend(d)?"":"disabled"}>Send review</button></div>
    <ul class="tips"><li>Name a line or identifier, like “line 3” or <code>total</code>.</li><li>Say why, not just what.</li><li>Suggest one change the author can make.</li></ul></div></section>`;
  return `<button class="back" data-act="view" data-v="reviews">← Reviews</button><p class="eyebrow">${LANGN[ex.lang]} · ${esc(ex.topic)} · ${inCircle(q.author)?"from your circle":"from the wider pool"}</p><h1 class="pg-h">Review: ${esc(ex.title)}</h1>
  <div class="ex-grid"><div class="side"><div class="panel"><h2>Task</h2><div class="pad prompt">${mdLite(ex.prompt)}</div></div><div class="panel"><h2>Automatic tests</h2><div class="pad" id="rvAuto">${a?`<b class="${a.p===a.t?"okc":"badc"}">${a.p} / ${a.t} ${ex.lang==="js"?"tests":"checks"} passed</b>`:`<span class="muted">Running…</span>`}</div></div></div>
   <div><div class="panel"><h2>The solution</h2>${codeBlock(q.code)}</div>${form}</div></div>`;
}
const canSend=d=>d.text.trim().length>=40&&d.rub.c&&d.rub.r&&d.rub.s;
function reviewResult(g){
  if(Date.now()<g.revealAt)return `<section class="panel"><h2>Review sent</h2><div class="pad"><p class="pulse">Waiting for the author to rate your review…</p></div></section>`;
  const r=myRatings(),rep=repOf(r),lv=levelOf(rep);
  return `<section class="panel"><h2>The author rated your review</h2><div class="pad"><div class="starsv big-stars">${stars(g.stars)}</div><p style="margin:6px 0 10px">${PTS[g.stars]>0?"+":""}${PTS[g.stars]} reputation · score <b>${scoreOf(r).toFixed(2)}</b> · <b>${rep}</b> pts <span class="lvl lvl${lv} sm">${LEVELS[lv].n}</span></p><p class="muted" style="font-size:13px">What made the difference: ${esc(g.why.length?g.why.join(", "):"nothing specific")}. In this demo the author's rating is simulated from how specific and useful your review is.</p><button class="btn" data-act="view" data-v="reviews" style="margin-top:6px">Back to reviews</button></div></section>`;
}

/* ---------- circle ---------- */
function viewCircle(){
  if(!me())return signinNeeded("Sign in to join a review circle.");
  if(!S.circle)return `<p class="eyebrow">Review circle</p><h1 class="pg-h">Find your circle</h1><p class="lede">A circle is up to 8 learners who review each other first. Start one and share the invite code, or join friends with theirs.</p>
   <div class="two" style="margin-top:20px"><form class="panel" id="joinForm"><h2>Join with a code</h2><div class="pad form"><label for="joinCode" class="lbl-sm">Invite code</label><input id="joinCode" class="mono" maxlength="8" placeholder="K7QX2MPA" autocomplete="off"><p class="muted" style="font-size:12.5px;margin:0">Demo: try K7QX2MPA</p><div id="joinErr" class="err" role="alert"></div><button class="btn primary" type="submit">Join circle</button></div></form>
   <form class="panel" id="createForm"><h2>Start a circle</h2><div class="pad form"><label for="cName" class="lbl-sm">Circle name</label><input id="cName" maxlength="40" placeholder="Bole weekend coders"><label for="cTrack" class="lbl-sm">Language</label><select id="cTrack"><option value="both">JavaScript and Go</option><option value="js">JavaScript</option><option value="go">Go</option></select><div id="createErr" class="err" role="alert"></div><button class="btn primary" type="submit">Create circle</button></div></form></div>`;
  const c=S.circle;const rows=[me()].concat(c.members).map(m=>{const isMe=m===me();const r=isMe?myRatings():peerRatings(m);const rep=repOf(r),lv=levelOf(rep);const pts=isMe?myPoints():peerPoints(m);const solved=isMe?BANK.filter(e=>passedEx(e.id)).length:PEERS[m].solved.length;return {m,isMe,pts,solved,sc:scoreOf(r),lv,pb:probation(r)};}).sort((a,b)=>b.pts-a.pts);
  return `<p class="eyebrow">Review circle</p><div class="ex-head"><h1 class="pg-h">${esc(c.name)}</h1><div class="cmd" style="max-width:280px"><span class="muted" style="font-size:12.5px">Invite code</span><code id="inviteCode" class="mono">${esc(c.code)}</code><button class="btn small" data-act="copy" data-id="inviteCode">Copy</button></div></div>
  <p class="lede">${c.members.length+1} of 8 members. Your submissions go to a member here first; the wider pool steps in only when nobody here who solved the challenge is free.</p>
  <div class="grid2" style="margin-top:20px"><div><div class="panel"><h2>Leaderboard</h2><div class="tbl"><table><thead><tr><th>#</th><th>Learner</th><th>Points</th><th>Solved</th><th>Review score</th><th>Level</th></tr></thead><tbody>${rows.map((x,i)=>`<tr class="${x.isMe?"me":""}"><td class="mono">${i+1}</td><td><span class="lrn">${avatar(x.m,"sm")}<span class="mono">@${esc(x.m)}</span>${x.isMe?` <span class="muted">(you)</span>`:""}</span></td><td class="mono">${x.pts}</td><td class="mono">${x.solved}</td><td class="mono">${x.sc.toFixed(2)}</td><td>${x.pb?`<span class="st act">Probation</span>`:`<span class="lvl lvl${x.lv} sm">${LEVELS[x.lv].n}</span>`}</td></tr>`).join("")}</tbody></table></div></div></div>
   <aside class="side"><section class="panel"><h2>Activity</h2><div class="pad feed">${S.feed.slice(0,8).map(f=>`<div class="fi">${avatar(f.who,"sm")}<div><span class="mono">@${esc(f.who)}</span> ${esc(f.what)}<div class="muted" style="font-size:12px">${ago(f.at)}</div></div></div>`).join("")}</div></section>
   <section class="panel"><div class="pad">${V.confirm==="leave"?`<p style="margin:0 0 10px;font-size:14px">Leave ${esc(c.name)}? Your reviews will come from the wider pool.</p><div style="display:flex;gap:8px"><button class="btn" data-act="leave-yes">Leave circle</button><button class="btn" data-act="confirm-no">Stay</button></div>`:`<button class="linkish" data-act="leave">Leave this circle</button>`}</div></section></aside></div>`;
}

/* ---------- profile & sign-in ---------- */
function signinNeeded(msg){return `<section class="panel narrow"><div class="pad center"><h1 class="pg-h" style="font-size:24px">Sign in with GitHub</h1><p class="lede" style="margin:8px auto 16px">${esc(msg)}</p><button class="btn gh-btn" data-act="view" data-v="signin">${GH}Sign in with GitHub</button></div></section>`;}
function viewSignin(){
  if(me())return viewProfile();
  return `<section class="panel narrow"><div class="pad"><h1 class="pg-h" style="font-size:26px">Sign in with GitHub</h1><p class="lede">No sign-up form. Timirtbet asks GitHub for no permissions, so all it learns is your public username. On your first sign-in you're added to the Timirtbet organization and get your own private repository for pushing solutions.</p>
  <form id="signinForm" class="form" style="margin-top:14px"><label for="ghUser" class="lbl-sm">GitHub username <span class="muted">(prototype: the real app sends you to GitHub instead)</span></label><input id="ghUser" class="mono" maxlength="39" placeholder="your-username" autocomplete="off"><div id="signErr" class="err" role="alert"></div><button class="btn gh-btn" type="submit">${GH}Continue with GitHub</button></form>
  <p class="muted" style="font-size:13px;margin:14px 0 0">Or keep practising as a guest: every challenge and its tests work without an account.</p></div></section>`;
}
function viewProfile(){
  if(!me())return viewSignin();
  const r=myRatings(),rep=repOf(r),lv=levelOf(rep);const solved=BANK.filter(e=>passedEx(e.id)).length;
  const pushes=S.pushes.slice(-5).reverse();
  return `<div class="ex-head"><div class="lrn big">${avatar(me(),"lg")}<div><p class="eyebrow" style="margin:0">${S.me.demo?"Demo account":"Signed in with GitHub"}</p><h1 class="pg-h mono">@${esc(me())}</h1></div></div></div>
  <div class="stats"><div class="stat"><div class="v">${myPoints()}</div><div class="l">Points</div></div><div class="stat"><div class="v">${solved}</div><div class="l">Challenges solved</div></div><div class="stat"><div class="v">${scoreOf(r).toFixed(2)}</div><div class="l">Review score</div></div><div class="stat"><div class="v">${rep}</div><div class="l">Reputation · ${LEVELS[lv].n}</div></div></div>
  <div class="two"><section class="panel"><h2>Your repository</h2><div class="pad"><div class="cmd"><code id="cloneCmd">git clone https://github.com/timirtbet/${esc(me())}-code.git</code><button class="btn small" data-act="copy" data-id="cloneCmd">Copy</button></div>${pushes.length?`<ul class="pushes" style="margin-top:12px">${pushes.map(p=>`<li><span class="${p.pass?"okc":"badc"}">${p.pass?"✓":"✗"}</span><span class="mono">${p.sha}</span><span>${esc(p.msg)}</span><span class="muted mono">${p.p}/${p.t}</span></li>`).join("")}</ul>`:""}</div></section>
   <section class="panel"><h2>What Timirtbet stores about you</h2><div class="pad"><table class="plain"><tbody><tr><td>GitHub id and username</td><td class="okc">stored</td></tr><tr><td>Your code, test results, reviews and ratings</td><td class="okc">stored</td></tr><tr><td>Your circle</td><td class="okc">stored</td></tr><tr><td>Name, email, phone, age, school, location</td><td class="muted">never asked</td></tr><tr><td>Passwords</td><td class="muted">none exist</td></tr></tbody></table>
   <div style="margin-top:12px">${V.confirm==="signout"?`<span class="confirm">Sign out on every device? <button class="btn small" data-act="signout-yes">Sign out</button><button class="btn small" data-act="confirm-no">Cancel</button></span>`:`<button class="btn" data-act="signout">Sign out</button>`}</div></div></section></div>`;
}

/* ---------- actions ---------- */
let tick=null;
function stopTick(){if(tick){clearInterval(tick);tick=null;}}
function startTick(){stopTick();tick=setInterval(()=>{
  if(V.view==="exercise"){const sub=S.subs[V.ex];const st=stageOf(sub);if(st!==V._st){V._st=st;const el=document.getElementById("prPanel");if(el)el.innerHTML=peerPanel(EXM[V.ex]);const h=document.getElementById("edHint");if(h)h.textContent=hint(EXM[V.ex],document.getElementById("editor").value);}if(!sub||st>=5)stopTick();}
  else if(V.view==="review"){const g=S.given.find(x=>x.qid===V.qid);if(g&&Date.now()>=g.revealAt){stopTick();render();}}
  else stopTick();},300);}
function openEx(id){go("exercise",{ex:id,_st:stageOf(S.subs[id])});S.track=EXM[id].lang;save();const sub=S.subs[id];if(sub&&stageOf(sub)<5)startTick();}
async function run(){
  const ex=EXM[V.ex];const code=document.getElementById("editor").value;S.drafts[ex.id]=code;
  const btn=document.getElementById("runBtn");btn.disabled=true;btn.textContent="Running…";
  const r=await runChecks(ex,code);const p=r.out.filter(o=>o.pass).length;
  const wasSolved=passedEx(ex.id);
  S.res[ex.id]={p,t:r.out.length,code,out:r.out,logs:r.logs||[],at:Date.now()};
  if(!wasSolved&&passedEx(ex.id)&&me()&&S.circle)feed("solved "+ex.topic);
  save();
  if(V.view!=="exercise"||V.ex!==ex.id)return;
  document.getElementById("results").innerHTML=resultsHTML(ex,S.res[ex.id],code);
  btn.disabled=false;btn.textContent="▶ "+(ex.lang==="js"?"Run tests":"Run checks");
  const sb=document.getElementById("subBtn");if(sb)sb.disabled=!canSubmit(ex,code);
  document.getElementById("edHint").textContent=hint(ex,code);
}
function newSub(ex,code,p,t,extra){
  const rv=pickReviewer(ex.id);
  if(!rv)return false;
  S.subs[ex.id]={code,at:Date.now(),tests:{p,t},reviewer:rv.login,inCircle:rv.inCircle,review:makeReview(ex,code),rating:null,...extra};
  if(S.circle)feed("submitted "+ex.title+" for review");
  return true;
}
async function submit(){
  const ex=EXM[V.ex];const code=document.getElementById("editor").value;
  const r=await runChecks(ex,code);const p=r.out.filter(o=>o.pass).length;
  S.res[ex.id]={p,t:r.out.length,code,out:r.out,logs:r.logs||[],at:Date.now()};
  if(p===r.out.length)newSub(ex,code,p,r.out.length);
  save();render();startTick();
}
async function push(){
  const ex=EXM[V.ex];const code=document.getElementById("editor").value;S.drafts[ex.id]=code;
  document.getElementById("pushOut").innerHTML=`<p class="pulse muted" style="font-size:13.5px">Pushed. Webhook received, grader running…</p>`;
  const r=await runChecks(ex,code);const p=r.out.filter(o=>o.pass).length,t=r.out.length,pass=p===t;const sha=Math.random().toString(16).slice(2,9);
  S.pushes.push({sha,msg:ex.title,ex:ex.id,p,t,pass,at:Date.now()});
  S.res[ex.id]={p,t,code,out:r.out,logs:r.logs||[],at:Date.now()};
  const open=S.subs[ex.id]&&stageOf(S.subs[ex.id])<7;let note;
  if(pass&&!open){newSub(ex,code,p,t,{sha});note=`Passed. It's now a submission for ${S.circle?"your circle":"the wider pool"} to review.`;}
  else if(pass)note="Passed. A review for this challenge is already in progress, so no new submission was made.";
  else note="Failed. On GitHub you'd see a red ✗ on the commit and, on a pull request, a comment listing what to fix.";
  save();render();startTick();
  const o=document.getElementById("pushOut");if(o){o.closest("details").open=true;o.innerHTML=`<div class="stage-box" style="margin-top:10px"><span><span class="mono">${sha}</span> · <b>timirtbet/tests</b></span><span class="${pass?"okc":"badc"}">${pass?"✓":"✗"} ${p}/${t} passed</span></div><p style="font-size:13.5px;margin:8px 0 0">${note}</p>`;}
}
function rate(n){
  const sub=S.subs[V.ex];const who=sub.reviewer;const before=peerRatings(who);
  (S.peerExtra[who]=S.peerExtra[who]||[]).push(n);const after=peerRatings(who);
  sub.rating=n;sub.ratedAt=Date.now();sub.delta={s0:scoreOf(before),s1:scoreOf(after),r0:repOf(before),r1:repOf(after),l0:levelOf(repOf(before)),l1:levelOf(repOf(after))};
  if(S.circle)feed("rated a review ★"+n);
  save();render();
}
function sendReview(){
  const q=QUEUE.find(x=>x.id===V.qid);const d=V.rvDraft;if(!canSend(d))return;
  const rr=rateReview(d.text,d.rub,q.code);
  S.given.push({qid:q.id,ex:q.ex,author:q.author,text:d.text.trim(),rub:{...d.rub},stars:rr.stars,why:rr.why,revealAt:Date.now()+1800});
  S.done.push(q.id);if(S.circle&&inCircle(q.author))feed("reviewed a "+EXM[q.ex].topic+" solution");
  save();render();startTick();
}
async function openReview(id){
  go("review",{qid:id,rvDraft:{rub:{c:0,r:0,s:0},text:""},rvAuto:null});
  const q=QUEUE.find(x=>x.id===id);const r=await runChecks(EXM[q.ex],q.code);
  if(V.view==="review"&&V.qid===id){V.rvAuto={p:r.out.filter(o=>o.pass).length,t:r.out.length};const el=document.getElementById("rvAuto");if(el)el.innerHTML=`<b class="${V.rvAuto.p===V.rvAuto.t?"okc":"badc"}">${V.rvAuto.p} / ${V.rvAuto.t} passed</b>`;}
  if(S.given.some(g=>g.qid===id&&Date.now()<g.revealAt))startTick();
}
function code8(){const A="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";let s="";for(let i=0;i<8;i++)s+=A[Math.floor(Math.random()*A.length)];return s;}

document.addEventListener("click",e=>{
  if(e.target.closest("[data-next]"))return;// new (Preact) screens handle their own clicks
  const el=e.target.closest("[data-act]");if(!el)return;const a=el.dataset.act;
  if(a==="view"){V.confirm=null;go(el.dataset.v);}
  else if(a==="filter"){S[el.dataset.k]=el.dataset.v;save();render();}
  else if(a==="track"){S.track=el.dataset.v;save();go("track",{level:null});}
  else if(a==="level"){go("track",{level:el.dataset.v||null});}
  else if(a==="open")openEx(el.dataset.id);
  else if(a==="run")run();
  else if(a==="submit"){el.disabled=true;el.textContent="Submitting…";submit();}
  else if(a==="push"){el.disabled=true;push();}
  else if(a==="resetcode"){S.drafts[V.ex]=EXM[V.ex].starter;save();render();}
  else if(a==="rate")rate(+el.dataset.s);
  else if(a==="review")openReview(el.dataset.id);
  else if(a==="rub"){V.rvDraft.rub[el.dataset.k]=+el.dataset.v;el.parentElement.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",b===el));document.getElementById("rvSend").disabled=!canSend(V.rvDraft);}
  else if(a==="sendreview")sendReview();
  else if(a==="copy")copyBtn(el,el.dataset.id);
  else if(a==="leave"||a==="signout"||a==="reset"){V.confirm=a;render();}
  else if(a==="confirm-no"){V.confirm=null;render();}
  else if(a==="leave-yes"){S.circle=null;V.confirm=null;save();render();}
  else if(a==="signout-yes"){S.me=null;V.confirm=null;save();go("challenges");}
  else if(a==="reset-yes"){S=seed();V.confirm=null;save();go("challenges");}
});
document.addEventListener("submit",e=>{
  e.preventDefault();if(LIVE)return;const f=e.target;
  if(f.id==="signinForm"){const u=document.getElementById("ghUser").value.trim().replace(/^@/,"");if(!/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(u)){document.getElementById("signErr").textContent="That isn't a valid GitHub username: letters, digits and single hyphens, up to 39 characters.";return;}S.me={login:u};save();go("challenges");}
  else if(f.id==="joinForm"){const c=document.getElementById("joinCode").value.trim().toUpperCase();if(c!==HOME_CIRCLE.code){document.getElementById("joinErr").textContent="No circle has that invite code. Check it with whoever shared it.";return;}S.circle={...HOME_CIRCLE,members:HOME_CIRCLE.members.slice()};feed("joined the circle");save();render();}
  else if(f.id==="createForm"){const n=document.getElementById("cName").value.trim();if(n.length<3){document.getElementById("createErr").textContent="Give the circle a name of at least 3 characters.";return;}S.circle={name:n,code:code8(),members:[],track:document.getElementById("cTrack").value};S.feed.unshift({at:Date.now(),who:me(),what:"started the circle"});save();render();}
});
let draftT=null;
document.addEventListener("input",e=>{
  if(e.target.id==="editor"){const g=document.getElementById("gut");if(g)g.textContent=gutter(e.target.value);clearTimeout(draftT);const id=V.ex,v=e.target.value;draftT=setTimeout(()=>{S.drafts[id]=v;save();},400);const sb=document.getElementById("subBtn");if(sb)sb.disabled=!canSubmit(EXM[V.ex],v);}
  if(e.target.id==="rvText"){V.rvDraft.text=e.target.value;document.getElementById("rvCount").textContent=e.target.value.trim().length+" / 40 characters minimum";document.getElementById("rvSend").disabled=!canSend(V.rvDraft);}
});
document.addEventListener("scroll",e=>{if(e.target&&e.target.id==="editor"){const g=document.getElementById("gut");if(g)g.scrollTop=e.target.scrollTop;}},true);
document.addEventListener("keydown",e=>{
  if(e.target.id!=="editor")return;
  if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();run();return;}
  if(e.key==="Tab"&&!e.shiftKey){e.preventDefault();const ta=e.target;ta.setRangeText(EXM[V.ex].lang==="go"?"\t":"  ",ta.selectionStart,ta.selectionEnd,"end");ta.dispatchEvent(new Event("input",{bubbles:true}));}
});
/*__I18N__*/
if(ROUTED)applyRoute(location.pathname);
// What the new screens (src/next) still use from this file during the migration. Shrinks as screens move.
window.TBOld={go,copyBtn,modNum,BANK,MODULES,LANGN,ROUTED};
/*__LIVE__*/
render();
I18N.start();
})();
