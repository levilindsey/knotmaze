// K1247 s17: one corner over frames F-1, F: its centre Q, radius r, arc ends
// and feet (s), the A/B centreline vertices near each foot (s, turn), the
// final border points there, and the given pieces' last / first vertices.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s17_corner.ts <F> <corner> [pieces,..] [scene]
import { readFileSync, readdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";
import { structure, frame, debugCache, type SceneIn } from "./outline";
const a = process.argv.slice(2);
const F = +a[0]; const CI = +a[1]; const PS = (a[2] ?? "").split(",").filter(Boolean).map(Number);
const dir = join(import.meta.dirname, "..", "out", "s15", "rec_" + (a[3] ?? "def"));
const files = readdirSync(dir).filter((f) => f.endsWith(".json.gz")).sort();
const L = (f: string): SceneIn => { const s = JSON.parse(gunzipSync(readFileSync(join(dir, f))).toString("utf8")) as SceneIn; (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47; return s; };
const sc = files.slice(0, F + 1).map(L);
const st = structure(sc[0]); const S = sc[0].camera.pxPerUnit * 2; const h = sc[0].look.halfWidth;
const P = (x: number, y: number): string => `(${(x * S).toFixed(3)},${(y * S).toFixed(3)})`;
for (let f = 0; f <= F; f++) {
  const t = frame(st, sc[f]);
  if (f < F - 1) continue;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const C: any = debugCache(st); const dc = st.corners[CI];
  const ai = [dc.aArm, dc.bArm];
  console.log(`f${f} corner ${CI}: ok ${C.cOk[CI]} why ${C.cWhy[CI]} meet ${C.cMeet[CI]} r ${(C.cR[CI] * S).toFixed(3)} px  Q ${P(C.cQx[CI], C.cQy[CI])} V ${P(C.cVx[CI], C.cVy[CI])} TA ${P(C.cTax[CI], C.cTay[CI])} TB ${P(C.cTbx[CI], C.cTby[CI])} sA ${C.cSA[CI].toFixed(5)} sB ${C.cSB[CI].toFixed(5)} dA ${C.cDA[CI].toFixed(5)} dB ${C.cDB[CI].toFixed(5)}`);
  for (let w = 0; w < 2; w++) {
    const pi = C.armObj[ai[w]].pi; const p = C.polys[pi]; const s0 = w === 0 ? C.cSA[CI] : C.cSB[CI];
    const q = [C.cQx[CI], C.cQy[CI]];
    const rows: string[] = [];
    for (let k = 0; k < p.n; k++) {
      if (Math.abs(p.s[k] - s0) > 0.12) continue;
      const kp = k > 0 ? k - 1 : p.closed ? p.n - 1 : -1; const kn = k + 1 < p.n ? k + 1 : p.closed ? 0 : -1;
      let turn = NaN;
      if (kp >= 0 && kn >= 0) { const a1 = Math.atan2(p.y[k] - p.y[kp], p.x[k] - p.x[kp]); const a2 = Math.atan2(p.y[kn] - p.y[k], p.x[kn] - p.x[k]); turn = ((a2 - a1 + 3 * Math.PI) % (2 * Math.PI)) - Math.PI; }
      // side of Q relative to the turn: Q on the inner side if cross(dir_in, Q - v) has the turn's sign
      let inner = "";
      if (kp >= 0) { const ex = p.x[k] - p.x[kp], ey = p.y[k] - p.y[kp]; const cr = ex * (q[1] - p.y[k]) - ey * (q[0] - p.x[k]); inner = Math.sign(cr) === Math.sign(turn) ? "Q inner" : "Q outer"; }
      rows.push(`    v${k} s ${p.s[k].toFixed(5)} ${P(p.x[k], p.y[k])} turn ${turn.toFixed(4)} ${inner} |Q-v| ${(Math.hypot(q[0] - p.x[k], q[1] - p.y[k]) * S).toFixed(3)} px`);
    }
    console.log(`  ${w === 0 ? "A" : "B"} chain ${pi} arm dir ${C.armDir[ai[w]]} centreline near s ${s0.toFixed(5)}:\n${rows.join("\n")}`);
    const side = w === 0 ? C.armDir[ai[0]] : -C.armDir[ai[1]];
    const B = C.bords[pi * 2 + (side === 1 ? 0 : 1)];
    const br: string[] = [];
    for (let i = 0; i < B.nf; i++) if (Math.abs(B.s[i] - s0) < 0.06) br.push(`    p${i} s ${B.s[i].toFixed(5)} sc ${B.sc[i].toFixed(5)} ${P(B.xy[2 * i], B.xy[2 * i + 1])}`);
    console.log(`  border side ${side} (final pts near the foot):\n${br.join("\n")}`);
  }
  for (const pi of PS) {
    const pc = t.pieces[pi]; const n = pc.pts.length >> 1; const v: string[] = [];
    const idx = pc.kind === "arc" ? [0, 1, 2, n - 3, n - 2, n - 1] : [0, 1, n - 4, n - 3, n - 2, n - 1];
    for (const i of idx) if (i >= 0 && i < n) v.push(`${i}${P(pc.pts[2 * i], pc.pts[2 * i + 1])}`);
    console.log(`  piece ${pi} ${pc.kind} c${pc.chain} s${pc.side} [${pc.s0.toFixed(5)},${pc.s1.toFixed(5)}] n${n}: ${v.join(" ")}`);
  }
}
void h;
