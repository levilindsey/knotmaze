// K1055 / K1060: the inline script vite.config.ts injects into
// index.html's head to modulepreload the physics worker's chunk unless
// the page will run in-thread. It runs before the app loads, so it
// cannot call parseParams: it reads `phw` with its own walk of the link
// codec (the token blob, then key=value overrides; a legacy key=value
// link directly). The values it would otherwise copy out of the codec
// (physicsWorker's index, the codec type codes, the version, and the
// default it assumes) are derived here from the codec table and
// PARAM_DEFAULTS, and test/loader/worker_preload.test.ts pins its
// decision against parseParams' physicsWorker. A wrong decision costs
// a download or the head start, never behaviour. The chunk's file name
// comes from the bundle at build time (a runtime `new URL(...)`
// resolves to a data copy under Rolldown, not the chunk).
import { CODEC_PARAMS, CODEC_VERSION } from "../ui/param_codec";
import { PARAM_DEFAULTS } from "../ui/url_state";

export const PHW_INDEX = CODEC_PARAMS.findIndex(
  (p) => p.name === "physicsWorker"
);
if (PHW_INDEX < 0 || CODEC_PARAMS[PHW_INDEX].type !== "boolean") {
  throw new Error("worker-preload: physicsWorker is not a boolean codec param");
}
// A blob entry for a boolean means its default flipped, so an entry
// reads as the other value from PARAM_DEFAULTS.physicsWorker.
export const PHW_DEFAULT_ON = PARAM_DEFAULTS.physicsWorker === true;
export const CODEC_TYPE_CODES = CODEC_PARAMS.map((p) =>
  p.type === "boolean"
    ? "b"
    : p.type === "enum"
      ? "e"
      : p.type === "color"
        ? "c"
        : p.type === "string"
          ? "s"
          : "n"
).join("");

export function workerPreloadScript(href: string): string {
  return (
    "(function(){try{" +
    `var HREF=${JSON.stringify(href)},TYPES=${JSON.stringify(CODEC_TYPE_CODES)},PHW=${PHW_INDEX},VER=${CODEC_VERSION},DEF=${PHW_DEFAULT_ON};` +
    'var q=location.search.slice(1),amp=q.indexOf("&"),head=(amp<0?q:q.slice(0,amp)).replace(/=$/,"");' +
    'function kv(s){var ps=s.split("&");for(var i=0;i<ps.length;i++){var e=ps[i],x=e.indexOf("="),k=x<0?e:e.slice(0,x);' +
    'if(k==="phw"){var raw=x<0?"":e.slice(x+1);try{raw=decodeURIComponent(raw.replace(/\\+/g," "));}catch(_){}' +
    "var v=Number(raw);return isFinite(v)?v>0.5:null;}}return null;}" +
    "function tokenPhw(b){try{" +
    'var M="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_",bits=[];' +
    "for(var i=0;i<b.length;i++){var v=M.indexOf(b[i]);if(v<0)return DEF;for(var j=5;j>=0;j--)bits.push(v>>j&1);}" +
    "var p=0;" +
    "function gamma(){var z=0;while(p<bits.length&&bits[p]===0){z++;p++;}var v=Math.pow(2,z);" +
    "p++;for(var k=0;k<z;k++){v+=bits[p++]*Math.pow(2,z-1-k);}return v;}" +
    "function nib(){if(p+4>bits.length)throw 0;var d=0;for(var k=0;k<4;k++)d=d*2+bits[p++];return d;}" +
    "if(gamma()!==VER)return DEF;" +
    "var count=gamma()-1,prev=-1;" +
    "for(var e=0;e<count;e++){var idx=prev+gamma();prev=idx;" +
    "if(idx===PHW)return !DEF;if(idx>PHW)return DEF;" +
    'var t=TYPES[idx];if(t==="e")gamma();else if(t==="c")p+=24;' +
    'else if(t==="s")p+=8*gamma();' +
    'else if(t==="n"){for(;;){var d=nib();if(d===15)break;if(d>11)throw 0;}}}' +
    "return DEF;}catch(_){return DEF;}}" +
    "var off=false;" +
    'if(head===""||head.indexOf("=")>=0){var lv=kv(q);off=lv===null?!DEF:!lv;}' +
    'else{var base=DEF,dot=head.indexOf("."),blob=dot<0?"":head.slice(dot+1);' +
    "if(blob)base=tokenPhw(blob);" +
    "var o=amp<0?null:kv(q.slice(amp+1));off=!(o===null?base:o);}" +
    'if(!off){var l=document.createElement("link");l.rel="modulepreload";l.crossOrigin="";l.href=HREF;document.head.appendChild(l);}' +
    "}catch(_){}})();"
  );
}
