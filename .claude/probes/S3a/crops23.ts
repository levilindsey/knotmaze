// K992 s4 (crops19.ts with stage 4's rows): master (m23) vs the landed rule (c23w) in ONE labelled composite PNG.
// Pairs rows: [master | b16] per frame; strip rows: a master line and a b16 line.
// Ring = the corner's ball (radius r about q), dot = q (red master, blue b16;
// orange/cyan when the corner is not live). Headed Chrome on the census page.
//   node node_modules\vite-node\vite-node.mjs .claude\probes\S3a\crops23.ts --port 5392 --out .claude/probes/S3a/pops23/crops23.png
import puppeteer from "puppeteer-core";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { deflateSync, gunzipSync } from "node:zlib";
import type { Corner, FieldModel, OracleParams } from "../../../src/render/field/oracle";
import type { FieldScene } from "../../../src/render/field/scene";

const argv = process.argv.slice(2);
const opt = (k: string, d: string): string => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : d;
};
const PORT = Number(opt("port", "5392"));
const OUT = opt("out", ".claude/probes/S3a/pops23/crops23.png");
const PX = Number(opt("px", "220"));
const DOTS = argv.includes("--dots");
const ORS = opt("oracles", "m23,c23w").split(",");
const NAME: Record<string, string> = { m14: "master", b16: "b16", c17: "c17", b16nc: "b16nc", c17f: "c17f", c19fb: "c19fb", m19b: "m19b", m23: "master", c23w: "c23w", c21w: "c21w" };
const ROOT = process.cwd();
interface Row { label: string; seq: string; key: string; ts: number[]; strip?: boolean; px?: number }
const ROWS: Row[] = [
  { label: "j42/0 muse_drag t0 and t40 (F4: the overlap gate's look)", seq: "muse_drag", key: "j42/0", ts: [0, 40], px: 160 },
  { label: "j39/1 def_drag frames 1-3 (the overlap gate's dips; c21w r 1.85h / 0.74h at DROP 0.01 / 1.89h)", seq: "def_drag", key: "j39/1", ts: [1, 2, 3], strip: true, px: 90 },
  { label: "j115/2 muse_flow frames 27-34 (the halving flip, F7 b)", seq: "muse_flow", key: "j115/2", ts: [27, 28, 29, 30, 31, 32, 33, 34], strip: true, px: 90 },
];const ONLY = opt("only", "");
const TSO = opt("ts", "");
const RPX = opt("rowpx", "");
const ROWS2 = ROWS.filter((r) => !ONLY || r.key === ONLY).map((r) => ({ ...r, ts: TSO ? TSO.split(",").map(Number) : r.ts, px: RPX ? Number(RPX) : r.px }));
interface OracleModule {
  FieldModel: new (scene: FieldScene, params: OracleParams) => FieldModel;
  cornerRadius: (cr: number, h: number, theta: number) => number;
}
const mods: Record<string, OracleModule> = {};
for (const o of ORS) mods[o] = (await import(/* @vite-ignore */ resolve(ROOT, `.claude/probes/S3a/oracle_${o}.ts`).replace(/\\/g, "/"))) as OracleModule;
const paramsOf = (M: OracleModule, scene: FieldScene): OracleParams => {
  const h = scene.look.halfWidth;
  return { rRound: 0, rOf: (_j, _i, th, st) => (st === "round" ? M.cornerRadius(3, h, th) : 0), spans: "k883", crMax: 3, labelOnly: true } as OracleParams;
};
const same = (a: FieldScene, b: FieldScene) => a.chains.every((c, i) => c.pts.length === b.chains[i].pts.length && c.pts.every((v, k) => v === b.chains[i].pts[k]));
const seqCache: Record<string, FieldScene[]> = {};
const loadSeq = (name: string): FieldScene[] => {
  if (seqCache[name]) return seqCache[name];
  const raw = gunzipSync(readFileSync(join(".claude/probes/S3a/seq13", `${name}.jsonl.gz`))).toString("utf8").split("\n");
  const frames: FieldScene[] = [];
  for (let k = 1; k < raw.length; k++) {
    if (!raw[k]) continue;
    const f = JSON.parse(raw[k]).scene as FieldScene;
    f.look.ctrlArc ??= 0.47;
    if (frames.length && same(frames[frames.length - 1], f)) continue;
    frames.push(f);
  }
  return (seqCache[name] = frames);
};
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (b: Uint8Array): number => {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function png(w: number, h: number, rgb: Uint8Array): Buffer {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(rgb.buffer, rgb.byteOffset + y * w * 3, w * 3).copy(raw, y * (w * 3 + 1) + 1);
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
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
interface Cam { a: number; b: number; c: number; d: number; tx: number; ty: number }
const cornerOf = (m: FieldModel, sc: FieldScene, key: string): Corner | undefined => m.corners.find((x) => `${sc.junctions[x.junction].id}/${x.index}` === key);
const profile = join(ROOT, ".claude/probes/S3a/pops23", `chrome-profile-${process.pid}`);
mkdirSync(dirname(OUT), { recursive: true });
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: false,
  userDataDir: profile,
  defaultViewport: { width: 400, height: 300 },
  protocolTimeout: 900000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=500,400", "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
try {
  const pages: Record<string, puppeteer.Page> = {};
  for (const o of ORS) {
    const p = await browser.newPage();
    p.on("console", (m) => {
      if (m.type() === "error") console.log(`[page ${o}] ${m.text()}`);
    });
    await p.goto(`http://127.0.0.1:${PORT}/scripts/label_pops.html?oracle=${encodeURIComponent(`/.claude/probes/S3a/oracle_${o}.ts`)}`);
    await p.waitForFunction("window.__popsReady || window.__popsError", { timeout: 120000 });
    const perr = await p.evaluate("window.__popsError");
    if (perr) throw new Error(`page ${o}: ${perr}`);
    pages[o] = p;
  }
  const html: string[] = [`<html><body style="background:#1e1e1e;color:#eee;font:14px sans-serif;margin:10px"><div style="font-size:16px">K992 s4 crops: ${ORS[0]} (red; orange: corner not live) vs ${ORS[1]} (blue; cyan: not live). Ring = the corner's ball (r about q), dot = q. Caption: oracle, frame, r/h.</div>`];
  for (const row of ROWS2) {
    const frames = loadSeq(row.seq);
    const h = frames[0].look.halfWidth;
    // Per frame, per oracle: the corner (q, r, live) from the oracle in Node.
    const info = row.ts.map((t) => {
      const sc = frames[t];
      const j = sc.junctions.find((x) => `${x.id}` === row.key.split("/")[0]);
      const per: Record<string, { q: number[]; r: number; live: boolean; uA: number[]; uB: number[] } | null> = {};
      for (const o of ORS) {
        const m = new mods[o].FieldModel(sc, paramsOf(mods[o], sc));
        const c = cornerOf(m, sc, row.key);
        per[o] = c ? { q: [c.q[0], c.q[1]], r: c.r, live: c.ok && !c.noV && c.resV < 1e-9, uA: [c.uA[0], c.uA[1]], uB: [c.uB[0], c.uB[1]] } : null;
      }
      return { t, sc, jc: j ? [j.c[0], j.c[1]] : null, per };
    });
    // The box: b16's balls, and master's within 1.2 world of them (a master
    // corner solved on a far root is named off-panel in its caption).
    const bq = info.map((f) => f.per[ORS[1]] ?? f.per[ORS[0]]).filter((p) => p) as { q: number[]; r: number }[];
    const mx = bq.reduce((a, p) => a + p.q[0], 0) / bq.length;
    const my = bq.reduce((a, p) => a + p.q[1], 0) / bq.length;
    const xs: number[] = [];
    const ys: number[] = [];
    for (const f of info)
      for (const o of ORS) {
        const p = f.per[o];
        if (!p || Math.hypot(p.q[0] - mx, p.q[1] - my) > 1.2) continue;
        xs.push(p.q[0] - p.r, p.q[0] + p.r);
        ys.push(p.q[1] - p.r, p.q[1] + p.r);
      }
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const ext = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) + 10 * h;
    const s = Math.min(PX / ext, 276.92);
    const [a0, , , d0] = info[0].sc.camera.worldToCss;
    const A = Math.sign(a0) * s;
    const D = Math.sign(d0) * s;
    const cam: Cam = { a: A, b: 0, c: 0, d: D, tx: PX / 2 - A * cx, ty: PX / 2 - D * cy };
    const camAt = (x: number, y: number, sc: number): Cam => ({ a: Math.sign(a0) * sc, b: 0, c: 0, d: Math.sign(d0) * sc, tx: PX / 2 - Math.sign(a0) * sc * x, ty: PX / 2 - Math.sign(d0) * sc * y });
    const panel = async (o: string, f: (typeof info)[number], cam: Cam, s: number): Promise<string> => {
      const r = (await pages[o].evaluate(
        (sj: string, c: Cam, ww: number, hh: number) => (window as unknown as { __pops: { render: (...a: unknown[]) => unknown } }).__pops.render(sj, c, ww, hh),
        JSON.stringify(f.sc),
        cam,
        PX,
        PX
      )) as { cov?: string; w: number; h: number; glError: number; error?: string };
      if (r.error || !r.cov) throw new Error(`${row.key} t${f.t} ${o}: ${r.error}`);
      if (r.glError) throw new Error(`${row.key} t${f.t} ${o}: GL error ${r.glError}`);
      if (await pages[o].evaluate("window.__popsLost || 0")) throw new Error("webglcontextlost");
      const cov = new Uint8Array(Buffer.from(r.cov, "base64"));
      const W = r.w;
      const H = r.h;
      const rgb = new Uint8Array(W * H * 3);
      const paper = [236, 230, 214];
      const ink = [31, 28, 23];
      for (let k = 0; k < W * H; k++) {
        const v = cov[k] / 255;
        for (let t = 0; t < 3; t++) rgb[k * 3 + t] = Math.round(paper[t] + (ink[t] - paper[t]) * v);
      }
      const put = (X: number, Y: number, col: number[]) => {
        const xi = Math.round(X);
        const yi = Math.round(Y);
        if (xi < 0 || yi < 0 || xi >= W || yi >= H) return;
        const k = (yi * W + xi) * 3;
        rgb[k] = col[0];
        rgb[k + 1] = col[1];
        rgb[k + 2] = col[2];
      };
      const p = f.per[o];
      let cap = `${NAME[o]} t${f.t}: -`;
      if (p) {
        const col = o === ORS[0] ? (p.live ? [220, 30, 30] : [255, 150, 0]) : o === "c17" ? [190, 0, 190] : o === "b16nc" ? [230, 120, 0] : p.live ? [30, 80, 230] : [0, 200, 220];
        const X = cam.a * p.q[0] + cam.tx;
        const Y = cam.d * p.q[1] + cam.ty;
        const R = p.r * s;
        for (let k = 0; k < 720; k++) put(X + R * Math.cos((k * Math.PI) / 360), Y + R * Math.sin((k * Math.PI) / 360), col);
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (dx * dx + dy * dy <= 5) put(X + dx, Y + dy, col);
        if (DOTS) for (const u of [p.uA, p.uB]) for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (dx * dx + dy * dy <= 10) put(X + u[0] * cam.a + dx, Y + u[1] * cam.d + dy, [0, 170, 60]);
        cap = `${NAME[o]} t${f.t}: r ${(p.r / h).toFixed(2)} h${p.live ? "" : " (not live)"}${X < 0 || Y < 0 || X >= W || Y >= H ? ", q off-panel" : ""}`;
      }
      return `<div style="display:inline-block;margin:0 6px 4px 0"><img src="data:image/png;base64,${png(W, H, rgb).toString("base64")}" width="${W}" height="${H}"><div style="font-size:12px">${cap}</div></div>`;
    };
    html.push(`<div style="margin-top:12px;font-size:15px;color:#fd6">${row.label} <span style="color:#aaa;font-size:12px">(${(row.px ?? s).toFixed(0)} px/world, h = ${(h * (row.px ?? s)).toFixed(0)} px)</span></div>`);
    if (row.strip) {
      for (const o of ORS) {
        const cells: string[] = [];
        for (const f of info) cells.push(await panel(o, f, row.px ? camAt(mx, my, row.px) : cam, row.px ?? s));
        html.push(`<div style="white-space:nowrap">${cells.join("")}</div>`);
      }
    } else {
      const cells: string[] = [];
      for (const f of info) for (const o of ORS) cells.push(await panel(o, f, row.px && (f.per[ORS[1]] ?? f.per[ORS[0]]) ? camAt((f.per[ORS[1]] ?? f.per[ORS[0]])!.q[0], (f.per[ORS[1]] ?? f.per[ORS[0]])!.q[1], row.px) : cam, row.px ?? s));
      html.push(`<div style="white-space:nowrap">${cells.join("")}</div>`);
    }
    console.log(`${row.label}: done`);
  }
  html.push("</body></html>");
  const page3 = await browser.newPage();
  await page3.setViewport({ width: 1640, height: 900 });
  await page3.setContent(html.join("\n"));
  await page3.screenshot({ path: OUT as `${string}.png`, fullPage: true });
  console.log(`wrote ${OUT}`);
} finally {
  await browser.close();
  rmSync(profile, { recursive: true, force: true });
}
