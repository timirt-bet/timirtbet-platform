function __fmt(v){if(v===undefined)return"undefined";try{return JSON.stringify(v)}catch(e){return String(v)}}
function __deq(a,b){if(Object.is(a,b))return true;if(typeof a!=="object"||typeof b!=="object"||!a||!b)return false;if(Array.isArray(a)!==Array.isArray(b))return false;const ka=Object.keys(a),kb=Object.keys(b);if(ka.length!==kb.length)return false;return ka.every(k=>Object.prototype.hasOwnProperty.call(b,k)&&__deq(a[k],b[k]));}
function eq(a,b){if(!__deq(a,b))throw new Error("Expected "+__fmt(b)+", got "+__fmt(a));}
function near(a,b,eps){eps=eps||1e-6;if(typeof a!=="number"||Math.abs(a-b)>eps)throw new Error("Expected about "+b+", got "+__fmt(a));}
function ok(c,msg){if(!c)throw new Error(msg||"Expected condition to be true");}
function throws(fn,type){try{fn()}catch(e){if(type&&!(e instanceof type))throw new Error("Threw "+((e&&e.name)||e)+", expected "+type.name);return e;}throw new Error("Expected an error to be thrown");}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
