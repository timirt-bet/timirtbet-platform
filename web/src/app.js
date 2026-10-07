(function(){
"use strict";
/* The page's router and the few things every screen shares. The screens themselves are in
   src/next (Preact): this file decides which one is on show, keeps its address and title in step,
   and remembers this browser's choices (track, filters, open modules). live.js loads the learner. */

/* ---------- data ---------- */
const BANK=/*__BANK__*/[];
const EXM=Object.fromEntries(BANK.map(e=>[e.id,e]));
/* Modules: small groups of challenges that go to review together (challenges/modules.json). */
const MODULES=/*__MODULES__*/[];
const modNum=m=>MODULES.filter(x=>x.lang===m.lang).indexOf(m)+1;
const LANGN={js:"JavaScript",go:"Go"};
function diffOf(ex){if(ex.level==="basic")return ex.topic==="Basic problem solving"?"Medium":"Easy";return ex.topic==="Advanced problem solving"?"Hard":"Medium";}
const POINTS={Easy:10,Medium:25,Hard:50};
const ptsOf=ex=>POINTS[diffOf(ex)];
const TRACKS={
  js:{tag:"JS",blurb:"The language of the web. Start with values and functions, then work up to closures, classes and async code.",
    code:`<i class="k">const</i> <i class="f">greet</i> = (name) =>\n  <i class="s">\`Selam, \${name}!\`</i>;\n\n<i class="f">greet</i>(<i class="s">"Abebe"</i>);\n<i class="c">// → "Selam, Abebe!"</i>`},
  go:{tag:"Go",blurb:"Fast, simple and built for servers. Learn types, slices and errors, then goroutines and channels.",
    code:`<i class="k">func</i> <i class="f">greet</i>(name <i class="t">string</i>) <i class="t">string</i> {\n    <i class="k">return</i> <i class="s">"Selam, "</i> + name + <i class="s">"!"</i>\n}\n\n<i class="c">// greet("Abebe") → "Selam, Abebe!"</i>`}
};
const TRACK_IMG=/*__TRACKIMG__*/{};

/* ---------- this browser's choices ---------- */
const KEY="timirtbet-live-v1";
function seed(){return {track:"js",diff:"all",statusF:"all"};}
let S;
try{const r=localStorage.getItem(KEY);S=r?JSON.parse(r):seed();}catch(e){S=seed();}
let save=function(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}};
const V={view:"challenges",ex:null,qid:null,confirm:null};

/* ---------- language: English or Amharic (the texts are in src/next/messages) ---------- */
let lang="en";
try{lang=localStorage.getItem("timirtbet.lang")||((navigator.language||"").toLowerCase().startsWith("am")?"am":"en");}catch(e){}
function setLang(l){
  lang=l==="am"?"am":"en";
  window.TBNext.setLang(lang);
  try{localStorage.setItem("timirtbet.lang",lang);}catch(e){}
  document.documentElement.lang=lang;
}

/* ---------- which screen ---------- */
const app=document.getElementById("app");
function render(){
  window.TBNext.render(V.view,app,V);
  document.title=titleOf();
  window.TBNext.setView(V.view);// the header follows the screen
}
function go(view,extra){Object.assign(V,{view},extra||{});if(ROUTED&&location.pathname!==pathOf())history.pushState(null,"",pathOf());render();window.scrollTo(0,0);}
function openEx(id){S.track=EXM[id].lang;save();go("exercise",{ex:id});}
function selectText(id){const el=document.getElementById(id);const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r);}
function copyBtn(btn,id){const txt=document.getElementById(id).textContent;const label=btn.textContent;const done=()=>{btn.textContent=lang==="am"?"ተቀድቷል":"Copied";setTimeout(()=>{btn.textContent=label;},1500);};try{navigator.clipboard.writeText(txt).then(done,()=>selectText(id));}catch(_){selectText(id);}}

/* ---------- addresses: every page has its own address and title ----------
   /                                   the two tracks
   /challenges/js  /challenges/js/basic  /challenges/go/advanced     a track, optionally one level
   /challenges/js/basic/vars           a challenge (its id without the js-/go- prefix)
   /reviews  /reviews/<id>  /circle  /profile  /signin  /u/<github-login> (a learner's profile)                                       */
const ROUTED=typeof history!=="undefined"&&/^https?:$/.test(location.protocol);
const TRACK_LEVELS=["basic","advanced"],slugOf=id=>id.replace(/^(js|go)-/,"");
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
  Object.assign(V,{view:r.view,level:r.level||null,confirm:null},r.ex?{ex:r.ex}:{},r.login?{login:r.login,utab:null}:{},r.qid?{qid:r.qid}:{});
  if(ROUTED&&location.pathname!==pathOf())history.replaceState(null,"",pathOf());// tidy unknown or partial addresses
}
if(ROUTED)window.addEventListener("popstate",()=>{applyRoute(location.pathname);render();});
if(ROUTED)applyRoute(location.pathname);

// What the screens (src/next/legacy.js) use from this file.
window.TBOld={go,copyBtn,modNum,BANK,MODULES,LANGN,ROUTED,openEx,TRACKS,TRACK_IMG,ptsOf,diffOf,get S(){return S;},save:()=>save(),setLang};
setLang(lang);
/*__LIVE__*/
render();
})();
