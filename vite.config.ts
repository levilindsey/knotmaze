import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import { notices, noticesWorker } from "./notices/vite_plugin";
import { loaderInline } from "./src/loader/vite_plugin";
import { CODEC_PARAMS, CODEC_VERSION } from "./src/ui/param_codec";

// BUILD IDENTITY for the version readouts (src/build_info.ts): the
// package.json version, the git short SHA ("+" = built with uncommitted
// changes to tracked files) and the build time. Derived at build time,
// never hand-edited - so a phone showing the live site says exactly which
// commit it is running.
const git = (args: string): string => {
  try {
    return execSync(`git ${args}`, { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "";
  }
};

const pkg = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8")
) as { version: string };
const sha = git("rev-parse --short HEAD") || "nogit";
const dirty = git("status --porcelain --untracked-files=no") !== "";

// Agent worktrees live under .claude/worktrees/ - a checkout there writes
// an index.html and a tsconfig.json, and the dev server answered with a
// forced full reload of every open page (a phone mid-maze lost its game).
// Ignore THIS checkout's .claude/ only: a "**/.claude/**" glob also matched
// a worktree's own sources (their paths run through .claude/worktrees/),
// so a dev server started inside a worktree never saw its own edits and
// kept serving the code it started with.
const claudeDir = fileURLToPath(new URL("./.claude/", import.meta.url));
const inClaudeDir = (path: string): boolean => {
  const rel = relative(claudeDir, resolve(path));
  return !rel.startsWith("..") && !isAbsolute(rel);
};

// K1055 (K414, was K7 stage 7): the physics worker's chunk is
// modulepreloaded only on pages that will run the worker. K414 dropped
// stage 7's static preload for every page because a `phw=0` page
// downloaded the chunk and never ran it; this restores the head start
// (hello 35-55 ms sooner at 40 ms an asset) behind a build-time inline
// script that reads `phw` the way the app does (parseParams: the token
// blob, then key=value overrides; a legacy key=value link directly) and
// adds the link unless the page will run in-thread. The chunk's file
// name comes from the bundle - a runtime `new URL(...)` resolves to a
// data copy under Rolldown, not the chunk. The build fails when the
// worker stops being its own chunk.
const PHW_INDEX = CODEC_PARAMS.findIndex((p) => p.name === "physicsWorker");
if (PHW_INDEX < 0 || CODEC_PARAMS[PHW_INDEX].type !== "boolean") {
  throw new Error("k7-worker-preload: physicsWorker is not a boolean codec param");
}
const CODEC_TYPE_CODES = CODEC_PARAMS.map((p) =>
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
function workerPreloadScript(href: string): string {
  return (
    "(function(){try{" +
    `var HREF=${JSON.stringify(href)},TYPES=${JSON.stringify(CODEC_TYPE_CODES)},PHW=${PHW_INDEX},VER=${CODEC_VERSION};` +
    'var q=location.search.slice(1),amp=q.indexOf("&"),head=(amp<0?q:q.slice(0,amp)).replace(/=$/,"");' +
    'function kv(s){var ps=s.split("&");for(var i=0;i<ps.length;i++){var e=ps[i],x=e.indexOf("="),k=x<0?e:e.slice(0,x);' +
    'if(k==="phw"){var raw=x<0?"":e.slice(x+1);try{raw=decodeURIComponent(raw.replace(/\\+/g," "));}catch(_){}' +
    "var v=Number(raw);return isFinite(v)?v>0.5:null;}}return null;}" +
    "function tokenPhw(b){try{" +
    'var M="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_",bits=[];' +
    "for(var i=0;i<b.length;i++){var v=M.indexOf(b[i]);if(v<0)return true;for(var j=5;j>=0;j--)bits.push(v>>j&1);}" +
    "var p=0;" +
    "function gamma(){var z=0;while(p<bits.length&&bits[p]===0){z++;p++;}var v=Math.pow(2,z);" +
    "p++;for(var k=0;k<z;k++){v+=bits[p++]*Math.pow(2,z-1-k);}return v;}" +
    "function nib(){if(p+4>bits.length)throw 0;var d=0;for(var k=0;k<4;k++)d=d*2+bits[p++];return d;}" +
    "if(gamma()!==VER)return true;" +
    "var count=gamma()-1,prev=-1;" +
    "for(var e=0;e<count;e++){var idx=prev+gamma();prev=idx;" +
    "if(idx===PHW)return false;if(idx>PHW)return true;" +
    'var t=TYPES[idx];if(t==="e")gamma();else if(t==="c")p+=24;' +
    'else if(t==="s")p+=8*gamma();' +
    'else if(t==="n"){for(;;){var d=nib();if(d===15)break;if(d>11)throw 0;}}}' +
    "return true;}catch(_){return true;}}" +
    "var off=false;" +
    'if(head===""||head.indexOf("=")>=0)off=kv(q)===false;' +
    'else{var base=true,dot=head.indexOf("."),blob=dot<0?"":head.slice(dot+1);' +
    "if(blob)base=tokenPhw(blob);" +
    "var o=amp<0?null:kv(q.slice(amp+1));off=!(o===null?base:o);}" +
    'if(!off){var l=document.createElement("link");l.rel="modulepreload";l.crossOrigin="";l.href=HREF;document.head.appendChild(l);}' +
    "}catch(_){}})();"
  );
}
function workerPreload(): Plugin {
  return {
    name: "k7-worker-preload",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(_html, ctx) {
        const file = Object.keys(ctx.bundle ?? {}).find((k) =>
          /(^|\/)physics_worker-[^/]*\.js$/.test(k)
        );
        if (!file) throw new Error("k7-worker-preload: no physics worker chunk");
        return [
          {
            tag: "script",
            children: workerPreloadScript(`./${file}`),
            injectTo: "head",
          },
        ];
      },
    },
  };
}

export default defineConfig({
  // RELATIVE base: the same build serves at knotmaze.pages.dev/ and,
  // through levi.dev's proxy function, at levi.dev/knotmaze/ (asset URLs
  // resolve against whichever path the page loaded from). The dev server
  // still serves at /.
  base: "./",
  // K122: emits licenses.html (third-party notices) from the bundled modules.
  plugins: [notices(), workerPreload(), loaderInline()],
  // K7 stage 3: the physics worker (src/physics/physics_worker.ts, the
  // default host; `phw=0` opts out) is an ES module worker, bundled on its
  // own; noticesWorker() hands its modules to the notices page.
  worker: { format: "es", plugins: () => [noticesWorker()] },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_SHA__: JSON.stringify(dirty ? `${sha}+` : sha),
    __BUILD_TIME__: JSON.stringify(
      new Date().toISOString().slice(0, 16).replace("T", " ")
    ),
  },
  server: { watch: { ignored: [inClaudeDir] } },
});
