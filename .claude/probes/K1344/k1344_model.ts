// K1344 s1: the census's Model (k1314_census buildModel) built from an outline module other than src's:
// outline_proto.ts (this stage's prototype, K1344.fix on or off). The fill, band and lookups are
// buildModel's own, line for line.
import * as D from "../../../src/render/outline/draw";
import * as F from "../../../src/render/outline/fill_tri";
import { sectionPaint } from "../../../src/render/outline/paint";
import { loadScene, chainPt, type Model } from "../K1314/k1314_census";
import * as P from "./outline_proto";

export function protoModel(nm: string, fix = true): Model {
  const scene = loadScene(nm);
  P.K1344.fix = fix;
  const st = P.structure(scene as never) as unknown as Model["st"]; const table = P.frame(st as never, scene as never) as unknown as Model["table"];
  return modelOf(scene, st, table);
}
export function modelOf(scene: Model["scene"], st: Model["st"], table: Model["table"]): Model {
  const zz = D.zChains(scene);
  const fs = F.fillStructure(st, F.fillResolution(st, table));
  const fr = F.fillFrame(fs, st, table, scene, zz);
  const sp = sectionPaint(scene, "app", D.baseHueFor(scene.name));
  const runs = F.fillRuns(fs, st, fr, sp);
  const vItem = new Int32Array(fs.nV).fill(-1);
  fs.items.forEach((it, ii) => { const n = F.itemVerts(it); for (let v = it.base; v < it.base + n && v < fs.nV; v++) vItem[v] = ii; });
  const T: number[] = []; const A: number[] = []; const Pi: number[] = [];
  table.pieces.forEach((p, pi) => {
    const bd = D.bandData({ ...table, pieces: [p] }, scene, zz);
    for (let k = 0; k < bd.bandCount; k++) { T.push(bd.bandPos[2 * k], bd.bandPos[2 * k + 1]); A.push(bd.bandAlpha[k]); }
    for (let k = 0; k < bd.bandCount / 3; k++) Pi.push(pi);
  });
  const nTri = Pi.length; const tri = Float64Array.from(T); const tb = new Float64Array(4 * nTri);
  for (let t = 0; t < nTri; t++) {
    tb[4 * t] = Math.min(tri[6 * t], tri[6 * t + 2], tri[6 * t + 4]); tb[4 * t + 2] = Math.max(tri[6 * t], tri[6 * t + 2], tri[6 * t + 4]);
    tb[4 * t + 1] = Math.min(tri[6 * t + 1], tri[6 * t + 3], tri[6 * t + 5]); tb[4 * t + 3] = Math.max(tri[6 * t + 1], tri[6 * t + 3], tri[6 * t + 5]);
  }
  const idx = new Map<number, number>(); scene.chains.forEach((c, i) => idx.set(c.id, i));
  const xPts = scene.crossings.map((x) => {
    const ca = scene.chains[idx.get(x.a.chain) ?? -1]; const cb = scene.chains[idx.get(x.b.chain) ?? -1];
    if (!ca || !cb) return { x: NaN, y: NaN };
    const a = chainPt(ca.pts, ca.closed, x.a.s); const b = chainPt(cb.pts, cb.closed, x.b.s);
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  });
  return { scene, st, table, zz, fs, fr, sp, runs, vItem, tri, triA: Float32Array.from(A), triP: Int32Array.from(Pi), tb, nTri, xPts };
}
