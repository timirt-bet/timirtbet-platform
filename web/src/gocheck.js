function goStrip(code){return code.replace(/\/\*[\s\S]*?\*\//g,"").replace(/\/\/[^\n]*/g,"").replace(/`[^`]*`/g,m=>'"'+"x".repeat(Math.max(0,m.length-2))+'"').replace(/"(?:[^"\\\n]|\\.)*"/g,m=>'"'+"x".repeat(m.length-2)+'"').replace(/'(?:[^'\\\n]|\\.)*'/g,"'x'");}
function goStubs(code){
  const src=goStrip(code);const re=/func\s*(\([^)]*\)\s*)?(\w+)\s*\([^)]*\)[^{\n]*\{/g;const stubs=[];let m;
  while((m=re.exec(src))){let i=m.index+m[0].length,d=1;const s=i;while(i<src.length&&d>0){if(src[i]==="{")d++;else if(src[i]==="}")d--;i++;}
    const body=src.slice(s,i-1).trim();
    if(body===""||/^return(\s+(0|""|nil|false|0\.0)(\s*,\s*(0|""|nil|false|0\.0))*)?\s*$/.test(body))stubs.push(m[2]);}
  return stubs;
}
function goCheck(ex,code){
  const src=goStrip(code);let bal=0,okb=true;for(const ch of src){if(ch==="{"||ch==="("||ch==="[")bal++;else if(ch==="}"||ch===")"||ch==="]"){bal--;if(bal<0)okb=false;}}
  const stubs=goStubs(code);
  const out=[{n:"file starts with package "+ex.pkg,pass:new RegExp("^\\s*package\\s+"+ex.pkg+"\\b","m").test(src)},{n:"brackets and braces are balanced",pass:okb&&bal===0},{n:stubs.length?"still a stub: "+stubs.join(", "):"every function has a real body",pass:stubs.length===0}];
  const nc=code.replace(/\/\*[\s\S]*?\*\//g,"").replace(/(^|[^:"])\/\/[^\n]*/g,"$1");
  for(const c of ex.checks)out.push({n:c.n,pass:new RegExp(c.re,"m").test(nc)});
  return out;
}
