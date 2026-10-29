// K992 s4: raster14.ts with master = oracle_m23.ts (90d4290c's oracle.ts) and fe8's loadScene inline.
// K868 S3a6: the 12-scene raster census, master's corner rules
// (oracle_m23.ts, frozen at 90d4290c) against the branch's (src), through the
// pop census's page (scripts/label_pops.html: the app's label path, the packed
// LabelPass and the BandPass without depth, coverage read back). Each scene at
// its own camera. A changed pixel: |dcov| > 32/255. Each changed pixel goes to
// the nearest changed corner within 6 h (Node-side builds of both oracles):
//   root   the corner's contact differs: V, ok or no-V, or the tangent points
//          when both rules solve at the rule's radius (call 1);
//   refit  the same contact at the rule's radius, a different fitted r or
//          tangent points (call 2);
//   none   no changed corner within 6 h.
// A control renders the branch twice (must be 0 px). Crops (master | branch |
// change, red = the branch adds ink, blue = it removes ink) of the biggest
// blobs of each class. Fails on webglcontextlost. Run under the perf lock.
// node node_modules\vite-node\vite-node.mjs .claude\probes\S3a\raster23.ts [outDir] [port]
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { deflateSync } from "node:zlib";
import * as M from "./oracle_m23";
import * as N from "../../../src/render/field/oracle";
import type { FieldScene } from "../../../src/render/field/scene";
import { readFileSync } from "node:fs";
const loadScene = (name: string): FieldScene => {
  const scene = JSON.parse(readFileSync(`.claude/probes/S3a/scenes/${name}.json`, "utf8")) as FieldScene;
  scene.look.ctrlArc ??= 0.47;
  return scene;
};

const SCENES = [
  "def", "fat", "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64",
  "g41_user_tw42", "g41_user_tw64", "muse_default_tw", "muse_hash", "ring", "user_tw42.lightpaper",
];
const OUT = process.argv[2] ?? ".claude/probes/S3a/pops14/raster14";
const PORT = Number(process.argv[3] ?? "5381");
const TOL = 32;
const RATTR = 6;
const CROPS = 3;
mkdirSync(OUT, { recursive: true });

type P2 = [number, number];
type Cls = "root" | "refit" | "none";
const mk = (O: typeof N | typeof M, scene: FieldScene): N.FieldModel => {
  const h = scene.look.halfWidth;
  return new (O.FieldModel as typeof N.FieldModel)(scene, {
    rRound: 0,
    rOf: (_j: number, _i: number, th: number, st: string) => (st === "round" ? O.cornerRadius(3, h, th) : 0),
    spans: "k883",
    crMax: 3,
    labelOnly: true,
  } as N.OracleParams);
};
const solveAt = (m: N.FieldModel, c: N.Corner, r: number): N.Corner =>
  (m as unknown as { solveCorner: (...a: unknown[]) => N.Corner }).solveCorner(
    c.junction, c.index, c.armA, c.a, c.armB, c.b, c.theta, c.style, r,
  );
const dd = (p: P2, q: P2): number => Math.hypot(p[0] - q[0], p[1] - q[1]);
const far = (p: P2, q: P2): boolean => dd(p, q) > 1e-3;

/** The changed corners of one scene: class, key, and world points along
 * what each draws (V, q, the feet, and V to each foot). */
function changedCorners(scene: FieldScene) {
  const h = scene.look.halfWidth;
  const mo = mk(M, scene);
  const mn = mk(N, scene);
  const om = new Map(mo.corners.map((c) => [`${c.junction}/${c.index}`, c]));
  const nm = new Map(mn.corners.map((c) => [`${c.junction}/${c.index}`, c]));
  const keys = new Set([...om.keys(), ...nm.keys()]);
  const out: { key: string; cls: Cls; pts: P2[]; what: string }[] = [];
  for (const k of keys) {
    const co = om.get(k);
    const cn = nm.get(k);
    const pts: P2[] = [];
    for (const c of [co, cn]) {
      if (!c) continue;
      for (const p of [c.V, c.q, c.tA, c.tB]) if (Number.isFinite(p[0]) && Number.isFinite(p[1])) pts.push(p);
      for (const t of [c.tA, c.tB])
        if (Number.isFinite(c.V[0]) && Number.isFinite(t[0]))
          for (let s = 1; s < 8; s++) pts.push([c.V[0] + ((t[0] - c.V[0]) * s) / 8, c.V[1] + ((t[1] - c.V[1]) * s) / 8]);
    }
    if (!co || !cn) {
      out.push({ key: k, cls: "root", pts, what: co ? "only master" : "only branch" });
      continue;
    }
    let root = co.ok !== cn.ok || !!co.noV !== !!cn.noV || far(co.V, cn.V);
    let what = root ? `ok ${co.ok}/${cn.ok} noV ${!!co.noV}/${!!cn.noV} |dV| ${dd(co.V, cn.V).toFixed(3)}` : "";
    if (!root) {
      const r0 = cn.rRule ?? co.rRule ?? (co.style === "round" ? M.cornerRadius(3, h, co.theta) : 0);
      const ao = solveAt(mo, co, r0);
      const an = solveAt(mn, cn, r0);
      if (ao.ok !== an.ok || (ao.ok && (far(ao.tA, an.tA) || far(ao.tB, an.tB)))) {
        root = true;
        what = `at r ${(r0 / h).toFixed(3)}h: ok ${ao.ok}/${an.ok} |dtA| ${dd(ao.tA, an.tA).toFixed(3)} |dtB| ${dd(ao.tB, an.tB).toFixed(3)}`;
      }
    }
    const refit = Math.abs(co.r - cn.r) > 1e-3 * h || far(co.q, cn.q) || far(co.tA, cn.tA) || far(co.tB, cn.tB);
    if (!root && !refit) continue;
    if (!root) what = `r ${(co.r / h).toFixed(3)}h -> ${(cn.r / h).toFixed(3)}h`;
    out.push({ key: k, cls: root ? "root" : "refit", pts, what });
  }
  return out;
}

// ------------------------------------------------------------------- PNG
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(b: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function png(w: number, h: number, rgb: Uint8Array): Buffer {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    Buffer.from(rgb.buffer, rgb.byteOffset + y * w * 3, w * 3).copy(raw, y * (w * 3 + 1) + 1);
  }
  const chunk = (type: string, data: Buffer): Buffer => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** master | branch | change, each panel the window scaled by Z. */
function crop(w: number, a: Uint8Array, b: Uint8Array, cx: number, cy: number, half: number, Z: number): Buffer {
  const S = 2 * half + 1;
  const W3 = (S * Z) * 3 + 2 * 4;
  const H3 = S * Z;
  const rgb = new Uint8Array(W3 * H3 * 3).fill(255);
  const put = (X: number, Y: number, c: [number, number, number]) => {
    const o = (Y * W3 + X) * 3;
    rgb[o] = c[0];
    rgb[o + 1] = c[1];
    rgb[o + 2] = c[2];
  };
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const px = cx - half + x;
      const py = cy - half + y;
      const inb = px >= 0 && py >= 0 && px < w && py * w + px < a.length;
      const va = inb ? a[py * w + px] : 0;
      const vb = inb ? b[py * w + px] : 0;
      const ga = 255 - va;
      const gb = 255 - vb;
      const dv = vb - va;
      const ch: [number, number, number] =
        Math.abs(dv) > TOL ? (dv > 0 ? [230, 40, 40] : [40, 80, 230]) : [Math.round(200 + gb * 0.2), Math.round(200 + gb * 0.2), Math.round(200 + gb * 0.2)];
      for (let j = 0; j < Z; j++)
        for (let i = 0; i < Z; i++) {
          put(x * Z + i, y * Z + j, [ga, ga, ga]);
          put(S * Z + 4 + x * Z + i, y * Z + j, [gb, gb, gb]);
          put(2 * (S * Z + 4) + x * Z + i, y * Z + j, ch);
        }
    }
  return png(W3, H3, rgb);
}

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: false,
  userDataDir: `.claude/probes/S3a/chrome-raster14-${process.pid}`,
  defaultViewport: { width: 400, height: 300 },
  args: [
    "--use-angle=d3d11", "--no-first-run", "--window-position=2200,50", "--window-size=500,400",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding",
  ],
});
const lines: string[] = [
  "# K868 S3a6: the 12-scene raster census, master's corner rules against the branch's",
  "",
  `The label's coverage through scripts/label_pops.html at each scene's own camera; a changed pixel is |dcov| > ${TOL}/255; attribution to the nearest changed corner within ${RATTR} h (root: the contact differs, V or ok/no-V or the feet at the rule's radius; refit: the same contact there, another fitted r). Control: the branch rendered twice.`,
  "",
  "| scene | corners changed (root / refit) | changed px | root px | refit px | none px | control px | blobs |",
  "|---|---|---|---|---|---|---|---|",
];
const blobsAll: { scene: string; cls: Cls; area: number; cx: number; cy: number; key: string; what: string; w: number; a: Uint8Array; b: Uint8Array }[] = [];
const tot = { px: 0, root: 0, refit: 0, none: 0, cr: 0, cf: 0 };
let lost = 0;
try {
  const pm = await browser.newPage();
  const pn = await browser.newPage();
  await pm.goto(`http://127.0.0.1:${PORT}/scripts/label_pops.html?oracle=${encodeURIComponent("/.claude/probes/S3a/oracle_m23.ts")}`);
  await pn.goto(`http://127.0.0.1:${PORT}/scripts/label_pops.html`);
  for (const p of [pm, pn]) {
    await p.waitForFunction("window.__popsReady || window.__popsError", { timeout: 120000 });
    const err = await p.evaluate("window.__popsError");
    if (err) throw new Error(`page: ${err}`);
  }
  const render = async (p: typeof pm, s: FieldScene, cam: unknown, w: number, h: number): Promise<Uint8Array> => {
    const r = (await p.evaluate(
      (j: string, c: unknown, ww: number, hh: number) => (window as any).__pops.render(j, c, ww, hh),
      JSON.stringify(s), cam, w, h,
    )) as { cov: string; glError: number };
    if (r.glError) throw new Error(`glError ${r.glError}`);
    return new Uint8Array(Buffer.from(r.cov, "base64"));
  };
  for (const name of SCENES) {
    const scene = loadScene(name);
    const [a, , , d, e, f] = scene.camera.worldToCss;
    const dpr = scene.camera.dpr || 1;
    const cam = { a: a * dpr, b: 0, c: 0, d: d * dpr, tx: e * dpr, ty: f * dpr };
    const w = Math.round(scene.camera.viewport[0] * dpr);
    const hgt = Math.round(scene.camera.viewport[1] * dpr);
    const covM = await render(pm, scene, cam, w, hgt);
    const covN = await render(pn, scene, cam, w, hgt);
    const covN2 = await render(pn, scene, cam, w, hgt);
    let control = 0;
    for (let i = 0; i < covN.length; i++) if (Math.abs(covN[i] - covN2[i]) > TOL) control++;
    const sc = Math.sqrt(Math.abs(cam.a * cam.d));
    const R = RATTR * scene.look.halfWidth * sc;
    const ch = changedCorners(scene);
    const cpx = ch.map((c) => c.pts.map((p) => [cam.a * p[0] + cam.tx, cam.d * p[1] + cam.ty] as P2));
    const NONE = 32000;
    const cls = new Int16Array(covN.length).fill(-1); // -1 same, else the index into ch, or NONE
    let changed = 0;
    const by = { root: 0, refit: 0, none: 0 };
    for (let i = 0; i < covN.length; i++) {
      if (Math.abs(covN[i] - covM[i]) <= TOL) continue;
      changed++;
      const x = i % w;
      const y = Math.floor(i / w);
      let best = -1;
      let bd = R;
      cpx.forEach((ps, ci) => {
        for (const p of ps) {
          const q = Math.hypot(p[0] - x, p[1] - y);
          if (q < bd) {
            bd = q;
            best = ci;
          }
        }
      });
      const c: Cls = best < 0 ? "none" : ch[best].cls;
      by[c]++;
      cls[i] = best < 0 ? NONE : best;
    }
    // Blobs: 8-connected changed pixels; class = their majority.
    const seen = new Uint8Array(covN.length);
    let nb = 0;
    for (let i = 0; i < covN.length; i++) {
      if (cls[i] < 0 || seen[i]) continue;
      const st = [i];
      seen[i] = 1;
      const tally = new Map<number, number>();
      let sx = 0;
      let sy = 0;
      let n = 0;
      while (st.length) {
        const k = st.pop()!;
        const x = k % w;
        const y = Math.floor(k / w);
        sx += x;
        sy += y;
        n++;
        tally.set(cls[k], (tally.get(cls[k]) ?? 0) + 1);
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const X = x + dx;
            const Y = y + dy;
            if (X < 0 || Y < 0 || X >= w || Y >= hgt) continue;
            const j = Y * w + X;
            if (cls[j] >= 0 && !seen[j]) {
              seen[j] = 1;
              st.push(j);
            }
          }
      }
      nb++;
      const top = [...tally.entries()].sort((p, q) => q[1] - p[1])[0][0];
      const cc = top === NONE ? undefined : ch[top];
      blobsAll.push({
        scene: name, cls: cc ? cc.cls : "none", area: n, cx: Math.round(sx / n), cy: Math.round(sy / n),
        key: cc ? cc.key : "-", what: cc ? cc.what : "-", w, a: covM, b: covN,
      });
    }
    const nr = ch.filter((c) => c.cls === "root").length;
    const nf = ch.filter((c) => c.cls === "refit").length;
    tot.px += changed;
    tot.root += by.root;
    tot.refit += by.refit;
    tot.none += by.none;
    tot.cr += nr;
    tot.cf += nf;
    const row = `| ${name} | ${nr} / ${nf} | ${changed} | ${by.root} | ${by.refit} | ${by.none} | ${control} | ${nb} |`;
    lines.push(row);
    console.log(row);
  }
  for (const p of [pm, pn]) lost += ((await p.evaluate("window.__popsLost || 0")) as number);
} finally {
  await browser.close();
  try {
    rmSync(`.claude/probes/S3a/chrome-raster14-${process.pid}`, { recursive: true, force: true });
  } catch {
    /* the profile stays */
  }
}
lines.push(`| all | ${tot.cr} / ${tot.cf} | ${tot.px} | ${tot.root} | ${tot.refit} | ${tot.none} | | ${blobsAll.length} |`, "");
lines.push(`webglcontextlost: ${lost}`, "", "Biggest blobs by class (crops: master | branch | change; red = the branch adds ink, blue = removes):", "");
for (const c of ["root", "refit", "none"] as Cls[]) {
  const top = blobsAll.filter((b) => b.cls === c).sort((p, q) => q.area - p.area).slice(0, CROPS);
  top.forEach((b, i) => {
    const file = `${c}_${i}_${b.scene}.png`;
    writeFileSync(`${OUT}/${file}`, crop(b.w, b.a, b.b, b.cx, b.cy, 40, 4));
    lines.push(`- ${c} ${i}: ${b.scene} (${b.cx}, ${b.cy}) ${b.area} px, j${b.key} (${b.what}), \`${file}\``);
  });
}
lines.push("");
writeFileSync(`${OUT}/summary.md`, lines.join("\n"));
console.log(lines.slice(-14).join("\n"));
if (lost) {
  console.error(`webglcontextlost ${lost}: the census is void`);
  process.exit(2);
}
