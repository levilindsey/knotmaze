// K992 s4: what changed near raster23's "none" pixels (no changed corner
// within 6 h): the arm caps that differ between master (oracle_m23.ts) and
// the branch (src), their cuts in device px, and the nearest to each pixel.
// node node_modules\vite-node\vite-node.mjs .claude\probes\S3a\none23.ts
import { readFileSync } from "node:fs";
import * as M from "./oracle_m23";
import * as N from "../../../src/render/field/oracle";
import type { FieldScene } from "../../../src/render/field/scene";
import { normS, pointAt, type Poly } from "../../../src/render/field/geom";

const loadScene = (name: string): FieldScene => {
  const scene = JSON.parse(readFileSync(`.claude/probes/S3a/scenes/${name}.json`, "utf8")) as FieldScene;
  scene.look.ctrlArc ??= 0.47;
  return scene;
};
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
const PIX: Record<string, [number, number][]> = {
  g41_def_tw42: [[2593, 570], [2583, 575]],
  g41_def_tw64: [[1351, 1499]],
};
const f3 = (x: number) => (Number.isFinite(x) ? x.toFixed(3) : "inf");
for (const [name, pix] of Object.entries(PIX)) {
  const scene = loadScene(name);
  const h = scene.look.halfWidth;
  const [a, , , d, e, f] = scene.camera.worldToCss;
  const dpr = scene.camera.dpr || 1;
  const cam = { a: a * dpr, d: d * dpr, tx: e * dpr, ty: f * dpr };
  const sc = Math.sqrt(Math.abs(cam.a * cam.d));
  const toPx = (x: number, y: number): [number, number] => [cam.a * x + cam.tx, cam.d * y + cam.ty];
  const mo = mk(M, scene);
  const mn = mk(N, scene);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nn = mn as any;
  const caps: { key: string; lo: number; ln: number; whyO: string; whyN: string; px: [number, number][] }[] = [];
  scene.junctions.forEach((j, ji) =>
    j.arms.forEach((arm, ai) => {
      const co = mo.armCaps[ji][ai];
      const cn = mn.armCaps[ji][ai];
      if (co.len === cn.len && co.why === cn.why) return;
      const p = nn.polys[nn.idxOf.get(arm.chain)] as Poly;
      const px: [number, number][] = [];
      for (const len of [co.len, cn.len])
        if (Number.isFinite(len)) {
          const g = pointAt(p, normS(p, arm.s + arm.dir * len));
          px.push(toPx(g.x, g.y));
        }
      caps.push({ key: `${j.id}/${ai}`, lo: co.len, ln: cn.len, whyO: co.why, whyN: cn.why, px });
    }),
  );
  const jpx = scene.junctions.map((j) => ({ id: j.id, px: toPx(j.c[0], j.c[1]) }));
  console.log(`== ${name}: h ${f3(h)} world, ${f3(h * sc)} px; caps changed ${caps.length} of ${scene.junctions.reduce((n, j) => n + j.arms.length, 0)}`);
  for (const q of pix) {
    const dist = (p: [number, number]) => Math.hypot(p[0] - q[0], p[1] - q[1]) / (h * sc);
    const cs = caps.map((c) => ({ c, dd: Math.min(...c.px.map(dist)) })).sort((x, y) => x.dd - y.dd).slice(0, 3);
    const js = jpx.map((j) => ({ j, dd: dist(j.px) })).sort((x, y) => x.dd - y.dd).slice(0, 2);
    console.log(`px ${q}: nearest junctions ${js.map((x) => `${x.j.id} ${f3(x.dd)}h`).join(", ")}`);
    for (const x of cs) console.log(`  cap ${x.c.key} at ${f3(x.dd)}h: len ${f3(x.c.lo / h)}h -> ${f3(x.c.ln / h)}h (${x.c.whyO} -> ${x.c.whyN})`);
    for (const x of js.slice(0, 1)) {
      const ji = scene.junctions.findIndex((j) => j.id === x.j.id);
      const row = (c: N.Corner | undefined) => (c ? `r ${f3(c.r / h)} rRule ${f3((c.rRule ?? NaN) / h)} V ${f3(c.V[0])},${f3(c.V[1])} q ${f3(c.q[0])},${f3(c.q[1])} fit ${c.fit ?? "-"}` : "none");
      for (const c of mn.corners.filter((c) => c.junction === ji)) {
        const o = mo.corners.find((k) => k.junction === ji && k.index === c.index);
        const dr = o ? Math.abs(o.r - c.r) / h : NaN;
        console.log(`  ${x.j.id}/${c.index} |dr| ${dr.toExponential(2)}h, |dq| ${o ? (Math.hypot(o.q[0] - c.q[0], o.q[1] - c.q[1]) / h).toExponential(2) : "-"}h`);
        console.log(`    master ${row(o)}`);
        console.log(`    branch ${row(c)}`);
      }
      const capsJ = scene.junctions[ji].arms.map((_, ai) => `${f3(mo.armCaps[ji][ai].len / h)}/${f3(mn.armCaps[ji][ai].len / h)}`);
      console.log(`  ${x.j.id} caps master/branch (h): ${capsJ.join(" ")}`);
    }  }
}