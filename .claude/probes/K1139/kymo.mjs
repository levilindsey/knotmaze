// K1139 kymographs: the CPU mirror's pulse along one path through several
// junctions, distance along the path across, time down (1.5 periods). A
// pulse that carries through a junction is a straight diagonal stripe
// across that junction's line; a notch, a pop or a phase step breaks it.
//   node kymo.mjs <out.png> <path> <stand.json>...
// <path>: comma-separated walk edges left to right, each `e<id>` (its
// junction end on the left) or `e<id>r` (its junction end on the right);
// every edge must be declared in each json (strips.mjs output). One panel
// per json, stacked top to bottom. Columns: 0.015 world; rows: 1/80 s.
// Marks: head line amber, other junctions grey, the reach red (dotted).
import { readFileSync, writeFileSync } from "node:fs";
import { encodePNG } from "./png.mjs";

const C = {
  PULSE_END_WINDOW: 0.45, CREST_WIDTH: 0.72, CREST_RAMP: 0.5, PULSE_FLOOR: 0.38,
  PULSE_CORE_BOOST: 0.62, PULSE_CORE_RADIUS: 0.55, PULSE_FLOOR_REACH: 2.0,
  PULSE_SPEED: 1.6, PULSE_OUT_LEAD: 0.3, PULSE_REACH_FADE: 1.0,
};
const smooth01 = (x) => { const c = x < 0 ? 0 : x > 1 ? 1 : x; return c * c * (3 - 2 * c); };
export function uniforms(t, spacing, reach, lead = C.PULSE_OUT_LEAD) {
  const modS = (x) => x - spacing * Math.floor(x / spacing);
  return { travelIn: modS(t * C.PULSE_SPEED), travelOut: modS((t + lead) * C.PULSE_SPEED), s: spacing, fade: 1, reach, f: Math.min(C.PULSE_REACH_FADE, 0.5 * reach) };
}
const reachWin = (U, d) => 1 - smooth01((d - (U.reach - Math.max(U.f, 1e-4))) / Math.max(U.f, 1e-4));
// kPulseV (src/render/paint_math.ts), line for line, hovered omitted.
export function pulseV(U, d, span, inward, dist0, cont) {
  if (d < 0 || d > span) return 0;
  const dG = dist0 + d;
  const endWin = cont ? 1 : Math.min(1, Math.max(0, (span - d) / C.PULSE_END_WINDOW));
  const s = U.s;
  const raw = inward ? dG + U.travelIn : dG - U.travelOut;
  const ph = raw - s * Math.floor(raw / s);
  const dist = Math.min(ph, s - ph);
  const dC = Math.max(0, dG - (ph <= s - ph ? ph : ph - s));
  const bump = Math.max(0, 1 - dist / C.CREST_WIDTH) * Math.min(1, dC / C.CREST_RAMP);
  const floor = (C.PULSE_FLOOR + C.PULSE_CORE_BOOST * Math.max(0, 1 - dG / C.PULSE_CORE_RADIUS)) * Math.max(0, 1 - dG / C.PULSE_FLOOR_REACH);
  return Math.min(1, (floor + bump * 0.9) * endWin) * U.fade * reachWin(U, dG);
}

if (process.argv[1] && process.argv[1].endsWith("kymo.mjs")) {
  const [, , OUTP, PATH, ...JS] = process.argv;
  const segs = PATH.split(",").map((s) => ({ edge: Number(s.replace(/[er]/g, "")), rev: s.endsWith("r") }));
  // A json may carry `@lead=<s>` (the outward lead, default 0.3 s: Q3's
  // pass-through is @lead=0). Env K1139_DX sets the column width.
  const DX = Number(process.env.K1139_DX || 0.015), DT = 1 / 80, GUT = 10;
  const panels = JS.map((arg) => {
    const [f, leadArg] = arg.split("@lead=");
    const lead = leadArg === undefined ? C.PULSE_OUT_LEAD : Number(leadArg);
    const j = JSON.parse(readFileSync(f, "utf8"));
    const reach = j.decl.reach, sp = j.decl.spacing;
    const items = segs.map((s) => {
      const p = j.decl.pulses.find((q) => q.edge === s.edge);
      if (!p) throw new Error(`${f}: e${s.edge} not declared`);
      const cap = Math.min(p.world, reach + 0.4 - (p.dist0 || 0));
      return { ...s, p, len: Math.max(0.05, Math.min(p.world, cap)) };
    });
    return { j, reach, sp, items, lead };
  });
  const totalLen = Math.max(...panels.map((P) => P.items.reduce((a, s) => a + s.len, 0)));
  const W = Math.ceil(totalLen / DX) + 1;
  const rows = Math.round((1.5 * 2.5) / 1.6 / DT), RH = 2;
  const H = panels.length * rows * RH + (panels.length - 1) * GUT;
  const data = new Uint8Array(W * H * 3).fill(40);
  panels.forEach((P, pi) => {
    const y0 = pi * (rows * RH + GUT);
    // Segment x ranges; the head's line sits where the arrival meets a choice.
    let x = 0;
    const lay = P.items.map((s) => { const a = x; x += s.len; return { ...s, a, b: x }; });
    for (let r = 0; r < rows; r++) {
      const U = uniforms(100 + r * DT, P.sp, P.reach, P.lead);
      for (let c = 0; c < W; c++) {
        const X = c * DX;
        const s = lay.find((q) => X >= q.a && X < q.b);
        let v = 0;
        if (s) {
          const u = X - s.a;
          const d = s.rev ? s.len - u : u;
          v = pulseV(U, d, s.p.world, s.p.inward, s.p.dist0 || 0, s.p.cont);
        }
        const col = [22 + (255 - 22) * v, 30 + (255 - 30) * v, 44 + (255 - 44) * v];
        for (let k = 0; k < RH; k++) { const o = ((y0 + r * RH + k) * W + c) * 3; data[o] = col[0]; data[o + 1] = col[1]; data[o + 2] = col[2]; }
      }
    }
    // Junction lines (dotted): every segment boundary, the head amber.
    const headName = P.j.decl.head;
    for (let i = 0; i <= lay.length; i++) {
      const X = i < lay.length ? lay[i].a : lay[lay.length - 1].b;
      const c = Math.min(W - 1, Math.round(X / DX));
      const left = lay[i - 1], right = lay[i];
      const isHead = (left && left.rev && left.p.near === headName) || (right && !right.rev && right.p.near === headName);
      const col = isHead ? [235, 170, 40] : [130, 150, 180];
      for (let y = y0; y < y0 + rows * RH; y++) if ((y >> 2) % 2 === 0) { const o = (y * W + c) * 3; data[o] = col[0]; data[o + 1] = col[1]; data[o + 2] = col[2]; }
    }
    // The reach (dotted red) on every segment: where dist0 + d = reach.
    for (const s of lay) {
      const dR = P.reach - (s.p.dist0 || 0);
      if (dR <= 0 || dR > s.len) continue;
      const X = s.rev ? s.b - dR : s.a + dR;
      const c = Math.min(W - 1, Math.round(X / DX));
      for (let y = y0; y < y0 + rows * RH; y++) if ((y >> 1) % 3 === 0) { const o = (y * W + c) * 3; data[o] = 220; data[o + 1] = 60; data[o + 2] = 60; }
    }
  });
  writeFileSync(OUTP, encodePNG({ W, H, data: Buffer.from(data.buffer) }));
  console.log(`${OUTP}: ${W}x${H}, ${panels.length} panel(s), ${totalLen.toFixed(2)} world`);
}
