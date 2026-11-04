// K1114 S1i step 1: which part of the corner solve loses the room at
// muse_hash j36 109-110, j131 397-398 and j99 301-299 (S1h's sites 02, 16,
// 17) under dEdge "near": L (through the cap gate's slack), the window
// (dVa, dVb in (0, L)) or the feet (the tracked feet's window, the margin
// gate, the root gate). Three forms: S1f's final {dEdge: skip, rootBand: 0},
// near alone {rootBand: 0}, and today's defaults.
// Uses form_b_s1i_tr.ts (s1i_mk_tr.mjs: the worktree's form B plus read-only
// hooks); checks first that it reproduces form_b.ts's corners exactly.
// Run: node .claude/probes/K1040/s1/s1i_mk_tr.mjs; npx.cmd vite-node .claude/probes/K1040/s1/s1i_room.ts
//   (writes out/s1i/room.txt). ARGS='scene:j:a:b,...' picks other corners.
//   RESTORED=1 adds S1i's defaults as a fourth form (writes room_restored.txt).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB, type FormBParams } from "../../../../src/render/field/form_b";
import { FormB as FormBT } from "./form_b_s1i_tr";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCENES = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const outDir = join(HERE, "out/s1i");
mkdirSync(outDir, { recursive: true });
const f = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : String(v));
const G = globalThis as any;
const targets = (process.env.ARGS ?? "muse_hash:36:109:110,muse_hash:131:397:398,muse_hash:99:301:299").split(",").map((t) => {
  const [scene, j, a, b] = t.split(":");
  return { scene, j: +j, a: +a, b: +b };
});
// Pinned since S1i's default change (dEdgeTip 1): step 1's room.txt ran the
// first three as {rootBand: 0} and {}, when those meant dEdgeTip 0.
const FORMS: [string, FormBParams][] = [
  ["S1f (skip, rb 0)", { dEdge: "skip", rootBand: 0 }],
  ["near, rb 0", { dEdgeTip: 0, rootBand: 0 }],
  ["today (near, rb 0.5)", { dEdgeTip: 0 }],
  ...(process.env.RESTORED === "1" ? ([["restored (S1i: dEdgeTip 1)", {}]] as [string, FormBParams][]) : []),
];
const OUTF = process.env.RESTORED === "1" ? "room_restored.txt" : "room.txt";
const out: string[] = [];
const sceneOf = (name: string): FieldScene => {
  const sc = JSON.parse(readFileSync(`${SCENES}/${name}.json`, "utf8")) as FieldScene;
  sc.look.ctrlArc ??= 0.47;
  return sc;
};
// The copy against the source: every corner's r, room and ω, every arm's L.
for (const name of [...new Set(targets.map((t) => t.scene))]) {
  const sc = sceneOf(name);
  for (const [label, P] of FORMS) {
    const a = new FormB(sc, { dpr: 2, ...P }) as any;
    const b = new FormBT(sc, { dpr: 2, ...P }) as any;
    let bad = 0;
    if (a.corners.length !== b.corners.length || a.arms.length !== b.arms.length) bad = 1e6;
    else {
      a.corners.forEach((c: any, i: number) => {
        const d = b.corners[i];
        if (c.r !== d.r || c.room !== d.room || c.omega !== d.omega || c.a !== d.a || c.b !== d.b) bad++;
      });
      a.arms.forEach((x: any, i: number) => {
        if (x.L !== b.arms[i].L || x.Lcut !== b.arms[i].Lcut) bad++;
      });
    }
    out.push(`copy check ${name} ${label}: corners ${a.corners.length}, arms ${a.arms.length}, differ ${bad}`);
  }
}
out.push("");
for (const t of targets) {
  const sc = sceneOf(t.scene);
  out.push(`==== ${t.scene} j${t.j} ${t.a}-${t.b}`);
  for (const [label, P] of FORMS) {
    const ev: any[] = [];
    const armEv = new Map<number, any[]>();
    G.__s1i = (ji: number, a: number, b: number) => (ji === t.j && a === t.a && b === t.b ? (o: any) => ev.push(o) : undefined);
    G.__s1iArm = (ji: number, ai: number) => {
      if (ji !== t.j || (ai !== t.a && ai !== t.b)) return undefined;
      // Appends: the tip post-pass (dEdgeTip) asks for the same arm's logger again.
      let l = armEv.get(ai);
      if (!l) armEv.set(ai, (l = []));
      const ll = l;
      return (o: any) => ll.push(o);
    };
    const fb = new FormBT(sc, { dpr: 2, ...P }) as any;
    G.__s1i = undefined;
    G.__s1iArm = undefined;
    const h = fb.h;
    const W = fb.W;
    out.push(`-- ${label}: h ${f(h)}, W ${f(W / h)}h`);
    for (const ai of [t.a, t.b]) {
      const l = armEv.get(ai) ?? [];
      const L = l.find((o) => o.ev === "L");
      out.push(`  arm ${ai}: L0 ${f(L?.L0 / h)}h (chain end / next root), Lcut ${f(L?.Lcut / h)}h, L ${f(L?.L / h)}h; chain ${L?.pi} ${L?.closed ? "closed" : "open"} len ${f(L?.len / h, 1)}h`);
      // Under dEdgeTip the "L" event is the span before the tip cut; "Ltip" is the final one.
      const T = l.find((o) => o.ev === "Ltip");
      if (T) out.push(`    tip cut: uB ${f(T.uB / h)}h, g ${f(T.gMax)}, k ${f(T.k)}, cut ${f(T.c / h)}h; final Lcut ${f(T.Lcut / h)}h, L ${f(T.L / h)}h`);
      // The cuts that come within 3h of the min.
      const cuts = l.filter((o) => o.ev === "behind" || o.ev === "front").sort((x, y) => x.c - y.c);
      for (const o of cuts.slice(0, 4))
        out.push(`    ${o.ev.padEnd(6)} pass s ${f(o.s)}  d ${f(o.d / h)}h${o.ev === "behind" ? `  u ${f(o.u / h)}h` : `  reach ${f(o.reach / h)}h`}  θ ${f(o.theta)}  cut ${f(o.c / h)}h`);
    }
    const A = ev.find((o) => o.ev === "arms");
    const V = ev.find((o) => o.ev === "V");
    const wedge = ev.find((o) => o.ev === "wedge");
    const done = ev.find((o) => o.ev === "done");
    if (!A) {
      out.push("  no corner solve (the pair is skipped)");
      continue;
    }
    if (ev.find((o) => o.ev === "noV")) out.push("  no V");
    if (V) out.push(`  V (${f(V.x)}, ${f(V.y)}): dVa ${f(V.dVa / h)}h, dVb ${f(V.dVb / h)}h; window (0, L) ${V.win ? "holds" : "FAILS"}${wedge ? `; wedge ${wedge.ok ? "ok" : "FAILS"}` : ""}`);
    const ws = ev.filter((o) => o.ev === "w");
    const nodes = ev.filter((o) => o.ev === "node");
    if (ws.length) {
      out.push("    k  ρ−h/h   da/h   db/h  margin  steep  slackA/h slackB/h  cap    rootA  rootB   w      S");
      let S = Infinity;
      ws.forEach((o, k) => {
        S = Math.min(S, o.w);
        if (k > 0 && k % 4 !== 0 && k !== ws.length - 1 && k > 3) return;
        out.push(
          `   ${String(k).padStart(2)} ${f((o.rho - h) / h).padStart(6)} ${f(o.da / h).padStart(6)} ${f(o.db / h).padStart(6)} ${f(o.gM).padStart(6)} ${f(o.gS).padStart(6)} ${f(o.slA / h).padStart(8)} ${f(o.slB / h).padStart(8)} ${f(o.gC).padStart(6)} ${f(o.gRa).padStart(6)} ${f(o.gRb).padStart(6)} ${f(o.w).padStart(6)} ${f(S).padStart(6)}`,
        );
      });
      const last = nodes[nodes.length - 1];
      if (last) out.push(`    the integral: ${nodes.length} nodes, last ρ reached ${f((last.rho - h) / h)}h of target ${f((last.rhoT - h) / h)}h, S ${f(last.sK)}, ∫ ${f(last.integ / h)}h`);
    }
    if (done) out.push(`  r ${f(done.r / h)}h (r0 ${f(done.r0 / h)}h), room ${f(done.room / h)}h, ω ${f(done.omega)}, feet at da ${f(done.da / h)}h, db ${f(done.db / h)}h`);
    else if (V && !V.win) out.push("  r: none (the window test drops the corner)");
  }
  out.push("");
}
writeFileSync(join(outDir, OUTF), out.join("\n") + "\n");
console.log(out.join("\n"));
