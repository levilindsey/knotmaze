// K1040 S1e: a through pass's bend along a short line, S1d F5 (frozen
// form_b_s1d_f5.ts, e8944f2f) against the working tree. Per line: the
// steepest step of ink in /px, then every step where the winning term
// changes (kind, chain, s) or the ink moves by more than 0.02, with the
// term's D, w and the fade bits on both sides; for the working tree also
// the dropped minima (D1's merge blend, S1e) of the piece that wins.
// Run: npx vite-node .claude/probes/K1040/s1/bend_s1e.ts <scene> <x> <y> <dx> <dy> [n=241] [len=0.06]
// Env: PARAMS (JSON merged into the working tree's FormBParams).
import { readFileSync } from "node:fs";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB, TERM_NAMES, type FormBParams, type Piece } from "../../../../src/render/field/form_b";
import { FormB as FormBF5 } from "./form_b_s1d_f5";

const [name = "user_tw42.lightpaper", xs = "11.695", ys = "1.622", dxs = "1", dys = "0", ns = "241", ls = "0.06"] = process.argv.slice(2);
const s = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8")) as FieldScene;
s.look.ctrlArc ??= 0.47;
const extra = JSON.parse(process.env.PARAMS ?? "{}") as FormBParams;
const [x0, y0, dx0, dy0, n, len] = [xs, ys, dxs, dys, ns, ls].map(Number);
const dl = Math.hypot(dx0, dy0);
const [dx, dy] = [dx0 / dl, dy0 / dl];
const f = (v: number, d = 4) => (Number.isFinite(v) ? v.toFixed(d) : String(v));
console.log(`${name} (${x0}, ${y0}) dir (${f(dx, 3)}, ${f(dy, 3)}) n ${n} len ${len}`);
for (const [tag, fb] of [
  ["f5", new FormBF5(s)],
  ["src", new FormB(s, extra)],
] as const) {
  const rows: { u: number; ink: number; key: string; txt: string; alts: string }[] = [];
  for (let i = 0; i < n; i++) {
    const u = (i / (n - 1) - 0.5) * len;
    const px = x0 + dx * u;
    const py = y0 + dy * u;
    const r = fb.evalPoint(px, py);
    const t = r.term;
    const key = t ? `${TERM_NAMES[t.kind]} ${t.chain} ${f(t.s, 3)}` : "none";
    const txt = t ? `${key} D ${f(t.D)} w ${f(t.w, 3)} fade ${r.fade}` : `none fade ${r.fade}`;
    let alts = "";
    if (tag === "src" && t && t.kind === 1) {
      const P: Piece[] = [];
      (fb as FormB).pieces(px, py, P);
      const A = P.find((q) => q.chain === t.chain && (Math.abs(q.s - t.s) < 1e-9 || q.alts.some((a) => Math.abs(a.s - t.s) < 1e-9)));
      if (A) alts = ` | piece s ${f(A.s, 3)} d ${f(A.d)}; alts ${A.alts.map((a) => `s ${f(a.s, 3)} d ${f(a.d)} beta ${f(a.beta, 3)}`).join(", ") || "none"}`;
    }
    rows.push({ u, ink: r.ink, key, txt, alts });
  }
  const ppu = fb.ppuDev;
  let worst = 0;
  let at = 0;
  for (let i = 1; i < n; i++) {
    const g = Math.abs(rows[i].ink - rows[i - 1].ink) / (Math.abs(rows[i].u - rows[i - 1].u) * ppu);
    if (g > worst) {
      worst = g;
      at = i;
    }
  }
  console.log(`${tag}: step ${f((len / (n - 1)) * ppu, 3)} px; steepest |d ink| ${f(worst, 2)}/px at u ${f(rows[at].u, 5)} (ink ${f(rows[at - 1].ink, 3)} -> ${f(rows[at].ink, 3)})`);
  console.log(`  steepest step: ${rows[at - 1].txt} -> ${rows[at].txt}${rows[at].alts}`);
  let shown = 0;
  for (let i = 1; i < n && shown < 12; i++) {
    const a = rows[i - 1];
    const b = rows[i];
    if (a.key === b.key && Math.abs(b.ink - a.ink) <= 0.02) continue;
    shown++;
    console.log(`  u ${f(a.u, 5)} -> ${f(b.u, 5)}: ink ${f(a.ink, 3)} -> ${f(b.ink, 3)}; ${a.txt} -> ${b.txt}${b.alts}`);
  }
}
