// K868 S1b: the synthetic scenes of docs/design/K868_field_border.md §4,
// at h = 1 world unit and W = 0.38h, with a camera of 10 CSS px per unit
// (h = 10 px at 1x). Run `npx vite-node test/render/field/scenes/gen.ts` to
// rewrite the JSON fixtures beside this file; tests read the fixtures.
//
// World coordinates are y-up (the camera flips y). Chains are sampled every
// 0.2h along lines and at most every 5° along arcs; their far ends lie off
// screen and are listed as off-screen dead ends (no cap). z is the tent sum
// of the crossing table: +1 on the over pass, −1 on the under, falling to 0
// at |Δs| = 3h. END terminals sit 0.1h from the through's centreline, so the
// END extension to c′ (§3.6) is exercised but short, as physics leaves it.

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SCENE_VERSION,
  type FieldScene,
  type SceneArm,
  type SceneChain,
  type SceneCrossing,
  type SceneDeadEnd,
  type SceneJunction,
  type ScenePoi,
} from "../../../../src/render/field/scene";
import { footInWindow, makePoly, pointAt } from "../../../../src/render/field/geom";

export const H = 1;
export const W = 0.38 * H;
export const PX = 10;
const DS = 0.2 * H;
const AMP = 1;
const WIN = 3 * H;
const D2R = Math.PI / 180;

class PathB {
  xs: number[] = [];
  ys: number[] = [];
  hd: number;
  len = 0;
  marks: Record<string, number> = {};
  constructor(x: number, y: number, hdDeg: number) {
    this.xs.push(x);
    this.ys.push(y);
    this.hd = hdDeg * D2R;
  }
  get x(): number {
    return this.xs[this.xs.length - 1];
  }
  get y(): number {
    return this.ys[this.ys.length - 1];
  }
  private push(x: number, y: number): void {
    this.len += Math.hypot(x - this.x, y - this.y);
    this.xs.push(x);
    this.ys.push(y);
  }
  line(L: number): this {
    const n = Math.max(1, Math.ceil(L / DS - 1e-9));
    const x0 = this.x;
    const y0 = this.y;
    const c = Math.cos(this.hd);
    const s = Math.sin(this.hd);
    for (let i = 1; i <= n; i++) this.push(x0 + (c * L * i) / n, y0 + (s * L * i) / n);
    return this;
  }
  /** Arc of radius R; positive sweep turns left. */
  arc(R: number, sweepDeg: number): this {
    const sw = sweepDeg * D2R;
    const side = Math.sign(sw);
    const cx = this.x - Math.sin(this.hd) * R * side;
    const cy = this.y + Math.cos(this.hd) * R * side;
    const a0 = Math.atan2(this.y - cy, this.x - cx);
    const n = Math.max(1, Math.ceil(Math.max((R * Math.abs(sw)) / DS, Math.abs(sw) / (5 * D2R)) - 1e-9));
    for (let i = 1; i <= n; i++) {
      const a = a0 + (sw * i) / n;
      this.push(cx + R * Math.cos(a), cy + R * Math.sin(a));
    }
    this.hd += sw;
    return this;
  }
  mark(name: string): this {
    this.marks[name] = this.len;
    return this;
  }
  pts(): number[] {
    const out: number[] = [];
    for (let i = 0; i < this.xs.length; i++) out.push(this.xs[i], this.ys[i]);
    return out;
  }
}

interface ArmSpec {
  label: string;
  arm: SceneArm;
}

function through(chain: number, s: number, l: string, r: string): ArmSpec[] {
  return [
    { label: r, arm: { chain, s, dir: 1, kind: "through" } },
    { label: l, arm: { chain, s, dir: -1, kind: "through" } },
  ];
}

function endArm(chain: number, s: number, dir: 1 | -1, label: string): ArmSpec {
  return { label, arm: { chain, s, dir, kind: "end" } };
}

interface Spec {
  name: string;
  paths: PathB[];
  junctions: { id: string; c: [number, number]; arms: ArmSpec[]; styles?: Record<string, "round" | "sharp"> }[];
  /** Crossings as [overChain, overS, underChain, underS]. */
  crossings: [number, number, number, number][];
  /** Dead ends drawn on screen: [chain, atEnd]. All other open ends are off screen. */
  tips: [number, boolean][];
  view: { c: [number, number]; r: number };
  pois: ScenePoi[];
  params: Record<string, number | string | boolean>;
}

function armAngle(ch: SceneChain, arm: SceneArm): number {
  const p = makePoly(0, ch.pts, ch.z, ch.closed);
  const r0 = pointAt(p, arm.s);
  const s1 = Math.min(Math.max(arm.s + arm.dir * 2 * H, 0), p.len);
  const r1 = pointAt(p, s1);
  return Math.atan2(r1.y - r0.y, r1.x - r0.x);
}

function build(sp: Spec): FieldScene {
  const chains: SceneChain[] = sp.paths.map((b, id) => ({
    id,
    closed: false,
    pts: b.pts(),
    z: new Array(b.xs.length).fill(0),
  }));
  const crossings: SceneCrossing[] = sp.crossings.map(([oc, os, uc, us]) => ({
    a: { chain: oc, s: os },
    b: { chain: uc, s: us },
    over: "a",
  }));
  // Tent depth: arc length along the polyline of each chain.
  for (const ch of chains) {
    const p = makePoly(ch.id, ch.pts, null, false);
    for (let i = 0; i < p.n; i++) {
      let z = 0;
      for (const c of crossings) {
        for (const [pass, sgn] of [
          [c.a, 1],
          [c.b, -1],
        ] as const) {
          if (pass.chain !== ch.id) continue;
          z += sgn * AMP * Math.max(0, 1 - Math.abs(p.s[i] - pass.s) / WIN);
        }
      }
      ch.z[i] = Math.round(z * 1e6) / 1e6;
    }
  }
  const junctions: SceneJunction[] = sp.junctions.map((j) => {
    const sorted = j.arms
      .map((a) => ({ ...a, ang: armAngle(chains[a.arm.chain], a.arm) }))
      .sort((u, v) => u.ang - v.ang);
    const corners = sorted.map((a, i) => {
      const b = sorted[(i + 1) % sorted.length];
      const style = j.styles?.[`${a.label}|${b.label}`] ?? "round";
      return { style, pinned: false };
    });
    return { id: j.id, c: j.c, arms: sorted.map((a) => a.arm), corners };
  });
  const deadEnds: SceneDeadEnd[] = [];
  chains.forEach((ch, i) => {
    const len = sp.paths[i].len;
    const tipStart = sp.tips.some(([c, e]) => c === i && !e);
    const tipEnd = sp.tips.some(([c, e]) => c === i && e);
    const endAt = (s: number) =>
      sp.junctions.some((j) => j.arms.some((a) => a.arm.chain === i && a.arm.kind === "end" && Math.abs(a.arm.s - s) < 1e-9));
    if (!endAt(0)) deadEnds.push(tipStart ? { chain: i, s: 0 } : { chain: i, s: 0, offscreen: true });
    if (!endAt(len)) deadEnds.push(tipEnd ? { chain: i, s: len } : { chain: i, s: len, offscreen: true });
  });
  const vp = 2 * sp.view.r * PX;
  return {
    version: SCENE_VERSION,
    name: sp.name,
    source: { kind: "synthetic", generator: "test/render/field/scenes/gen.ts", params: sp.params },
    camera: {
      worldToCss: [PX, 0, 0, -PX, vp / 2 - PX * sp.view.c[0], vp / 2 + PX * sp.view.c[1]],
      pxPerUnit: PX,
      dpr: 1,
      viewport: [vp, vp],
    },
    look: {
      halfWidth: H,
      band: W,
      cornerRoundShare: 1,
      cuspRadius: 3,
      depthAmp: AMP,
      depthWindow: WIN,
      paper: "#e6e9ee",
      ink: "#1d2330",
    },
    chains,
    crossings,
    junctions,
    deadEnds,
    pois: sp.pois,
  };
}

/** Arc length on path b nearest to (x, y) (for crossings found by position). */
function sAt(b: PathB, x: number, y: number): number {
  const p = makePoly(0, b.pts(), null, false);
  return footInWindow(p, x, y, -1, p.len + 1).s;
}

function dir(deg: number): [number, number] {
  return [Math.cos(deg * D2R), Math.sin(deg * D2R)];
}

const L = 16 * H;

/** A straight through along `deg` with a vertex at c, marked "j". */
function straightThrough(c: [number, number], deg: number, half = L): PathB {
  const [dx, dy] = dir(deg);
  return new PathB(c[0] - dx * half, c[1] - dy * half, deg).line(half).mark("j").line(half);
}

/** An END leaving c along deg, its terminal 0.1h from c. */
function endFrom(c: [number, number], deg: number, len = L): PathB {
  const [dx, dy] = dir(deg);
  return new PathB(c[0] + dx * 0.1 * H, c[1] + dy * 0.1 * H, deg).line(len);
}

/**
 * K900 (§3.4): muse_hash's crossing 292 in miniature. Two Ts on one through
 * (j1 `gap` beyond the crossing, so j0's span on the through reaches past
 * the under pass to the next junction). j0's END hooks back over the
 * through: it crosses it at 47° (heading 133°), runs `a` on, turns left
 * 137° at radius `R` and comes down onto j0. Both of 292's mechanisms show.
 * With the cut at L + h/2 (5048670e), the END's span ends inside check 15's
 * window (L + h) of the over pass while j0's span on the through holds the
 * under pass. With the cut at L + h, the hook's own candidates still σ-join
 * the cluster unless a join into a group holding the crossing's other pass
 * is refused. At a 1.5h, R h it fails under either fix alone and passes
 * under both.
 */
export function hookScene(a: number, R: number, gap = 2.5 * H): FieldScene {
  const hd = 133;
  const [ux, uy] = dir(hd);
  // j0 at the origin; the hook's last straight comes down onto x = 0. On a
  // left turn the point sits at heading − 90° about the centre, so the turn
  // moves it by R·(cos 180° − cos(hd − 90°), sin 180° − sin(hd − 90°)).
  const xCross = -(ux * a + R * (Math.cos(Math.PI) - Math.cos((hd - 90) * D2R)));
  const yTop = uy * a + R * (Math.sin(Math.PI) - Math.sin((hd - 90) * D2R));
  const t = new PathB(-L, 0, 0).line(L).mark("j0").line(xCross + gap).mark("j1").line(L);
  const e = new PathB(xCross - ux * 6 * H, -uy * 6 * H, hd).line(6 * H).mark("x").line(a).arc(R, 270 - hd).line(yTop - 0.1 * H);
  // j1's END leans away up-right, clear of the hook and of the lead-in below.
  const f = endFrom([xCross + gap, 0], 60);
  return build({
    name: "j_hook_cross",
    paths: [t, e, f],
    junctions: [
      { id: "j0", c: [0, 0], arms: [...through(0, t.marks.j0, "L", "R"), endArm(1, e.len, -1, "U")] },
      { id: "j1", c: [xCross + gap, 0], arms: [...through(0, t.marks.j1, "L", "R"), endArm(2, 0, 1, "U")] },
    ],
    crossings: [[1, e.marks.x, 0, sAt(t, xCross, 0)]],
    tips: [],
    view: { c: [xCross / 2 + 1, 1], r: 8 },
    pois: [{ name: "crossing", at: [xCross, 0], radius: 3.5 }],
    params: { a, R, gap, heading: hd },
  });
}

/** Where polylines a and b first cross: the arc length on each. */
function crossAt(a: PathB, b: PathB): [number, number] {
  let sa = 0;
  for (let i = 1; i < a.xs.length; i++) {
    const [ax, ay, ux, uy] = [a.xs[i - 1], a.ys[i - 1], a.xs[i] - a.xs[i - 1], a.ys[i] - a.ys[i - 1]];
    let sb = 0;
    for (let k = 1; k < b.xs.length; k++) {
      const [bx, by, vx, vy] = [b.xs[k - 1], b.ys[k - 1], b.xs[k] - b.xs[k - 1], b.ys[k] - b.ys[k - 1]];
      const den = ux * vy - uy * vx;
      const t = ((bx - ax) * vy - (by - ay) * vx) / den;
      const u = ((bx - ax) * uy - (by - ay) * ux) / den;
      if (den !== 0 && t >= 0 && t < 1 && u >= 0 && u < 1) return [sa + t * Math.hypot(ux, uy), sb + u * Math.hypot(vx, vy)];
      sb += Math.hypot(vx, vy);
    }
    sa += Math.hypot(ux, uy);
  }
  throw new Error("the ENDs do not cross");
}

/**
 * K1000: j_pair_cross's family, for the cap continuity sweeps
 * (cap19_continuity.test.ts). j0 and j1 sit `X` apart on one through (fixed
 * samples, so j1's arm s moves and no point is added). j0's END leans at
 * 60°; j1's leaves at heading `phi` and, with `bendAt`, turns right after
 * that length on an arc of radius `bendR` through 40°. With `tAt`, j0's END
 * carries a T (j2) that far along it, j2's END leaning back at 150°. The
 * crossing is where the two ENDs meet, chain 1 over.
 */
export function pairCrossScene(o: { X?: number; phi?: number; bendAt?: number; bendR?: number; tAt?: number } = {}): FieldScene {
  const X = o.X ?? 5 * H;
  const phi = o.phi ?? 120;
  const t = new PathB(-L, 0, 0).line(L).mark("j0").line(L + 8 * H);
  const a = endFrom([0, 0], 60);
  const [dx, dy] = dir(phi);
  const b = new PathB(X + 0.1 * H * dx, 0.1 * H * dy, phi);
  if (o.bendAt !== undefined) {
    const R = o.bendR ?? 6 * H;
    b.line(o.bendAt).arc(R, -40).line(L - o.bendAt - R * 40 * D2R);
  } else b.line(L);
  const paths = [t, a, b];
  const junctions: Spec["junctions"] = [
    { id: "j0", c: [0, 0], arms: [...through(0, t.marks.j0, "L", "R"), endArm(1, 0, 1, "U")] },
    { id: "j1", c: [X, 0], arms: [...through(0, t.marks.j0 + X, "L", "R"), endArm(2, 0, 1, "U")] },
  ];
  if (o.tAt !== undefined) {
    const [ux, uy] = dir(60);
    const c2: [number, number] = [(0.1 * H + o.tAt) * ux, (0.1 * H + o.tAt) * uy];
    paths.push(endFrom(c2, 150));
    junctions.push({ id: "j2", c: c2, arms: [...through(1, o.tAt, "B", "F"), endArm(3, 0, 1, "U")] });
  }
  const [sa, sb] = crossAt(a, b);
  return build({
    name: "pair_cross19",
    paths,
    junctions,
    crossings: [[1, sa, 2, sb]],
    tips: [],
    view: { c: [X / 2, 2.5], r: 7 },
    pois: [],
    params: { X, phi, bendAt: o.bendAt ?? -1, bendR: o.bendR ?? -1, tAt: o.tAt ?? -1 },
  });
}

export function syntheticScenes(): FieldScene[] {
  const out: FieldScene[] = [];
  const O: [number, number] = [0, 0];

  // T at 90°: one round, one sharp corner.
  {
    const t = straightThrough(O, 0);
    const e = endFrom(O, 90);
    out.push(
      build({
        name: "t90",
        paths: [t, e],
        junctions: [
          { id: "j0", c: O, arms: [...through(0, t.marks.j, "L", "R"), endArm(1, 0, 1, "U")], styles: { "U|L": "sharp" } },
        ],
        crossings: [],
        tips: [],
        view: { c: [0, 2], r: 9 },
        pois: [{ name: "junction", at: [0, 0.6], radius: 3 }],
        params: { theta: 90 },
      }),
    );
  }

  // Y at 120°: the through bends 60° on an arc of radius 0.5h at c.
  {
    const R = 0.5 * H;
    const [ux, uy] = dir(30);
    const start: [number, number] = [R * Math.cos(120 * D2R), -R + R * Math.sin(120 * D2R)];
    const t = new PathB(start[0] - ux * L, start[1] - uy * L, 30).line(L).arc(R, -30).mark("j").arc(R, -30).line(L);
    const e = endFrom(O, 90);
    out.push(
      build({
        name: "y120",
        paths: [t, e],
        junctions: [
          { id: "j0", c: O, arms: [...through(0, t.marks.j, "L", "R"), endArm(1, 0, 1, "U")], styles: { "U|L": "sharp" } },
        ],
        crossings: [],
        tips: [],
        view: { c: [0, 1], r: 9 },
        pois: [{ name: "junction", at: [0, 0.3], radius: 3 }],
        params: { theta: 120, throughArc: R },
      }),
    );
  }

  // Acute corners: an END at θ from the through's right arm.
  for (const th of [30, 20]) {
    const t = straightThrough(O, 0, 20 * H);
    const e = endFrom(O, th, 20 * H);
    const vDist = H / Math.sin((th / 2) * D2R);
    const [bx, by] = dir(th / 2);
    out.push(
      build({
        name: `acute${th}`,
        paths: [t, e],
        junctions: [
          { id: "j0", c: O, arms: [...through(0, t.marks.j, "L", "R"), endArm(1, 0, 1, "E")], styles: { "E|L": "sharp" } },
        ],
        crossings: [],
        tips: [],
        view: { c: [bx * vDist * 0.8, by * vDist * 0.8 + 1], r: 9 },
        pois: [{ name: "corner", at: [bx * vDist * 0.9, by * vDist * 0.9], radius: th === 20 ? 4.5 : 3.5 }],
        params: { theta: th },
      }),
    );
  }

  // 4-way: two fused throughs, corners alternating round / sharp.
  {
    const a = straightThrough(O, 0);
    const b = straightThrough(O, 90);
    out.push(
      build({
        name: "x4_throughs",
        paths: [a, b],
        junctions: [
          {
            id: "j0",
            c: O,
            arms: [...through(0, a.marks.j, "L", "R"), ...through(1, b.marks.j, "D", "U")],
            styles: { "R|U": "sharp", "L|D": "sharp" },
          },
        ],
        crossings: [],
        tips: [],
        view: { c: [0, 0], r: 9 },
        pois: [{ name: "junction", at: [0, 0], radius: 3 }],
        params: { theta: 90 },
      }),
    );
  }

  // 4-way with adjacent ENDs at 60° and 120° over one through.
  {
    const t = straightThrough(O, 0);
    const e1 = endFrom(O, 60);
    const e2 = endFrom(O, 120);
    out.push(
      build({
        name: "x4_ends",
        paths: [t, e1, e2],
        junctions: [
          {
            id: "j0",
            c: O,
            arms: [...through(0, t.marks.j, "L", "R"), endArm(1, 0, 1, "E1"), endArm(2, 0, 1, "E2")],
            styles: { "E2|L": "sharp" },
          },
        ],
        crossings: [],
        tips: [],
        view: { c: [0, 2.5], r: 9 },
        pois: [{ name: "junction", at: [0, 1.5], radius: 3.5 }],
        params: { theta: 60 },
      }),
    );
  }

  // A junction beside a crossing: T at c, a vertical chain over the
  // through at x = 2.5h.
  {
    const t = straightThrough(O, 0);
    const e = endFrom(O, 90);
    const x = straightThrough([2.5 * H, 0], 90);
    out.push(
      build({
        name: "j_cross",
        paths: [t, e, x],
        junctions: [
          { id: "j0", c: O, arms: [...through(0, t.marks.j, "L", "R"), endArm(1, 0, 1, "U")], styles: { "U|L": "sharp" } },
        ],
        crossings: [[2, x.marks.j, 0, sAt(t, 2.5 * H, 0)]],
        tips: [],
        view: { c: [1, 1], r: 9 },
        pois: [{ name: "junction", at: [1.2, 0.5], radius: 3.5 }],
        params: { crossingX: 2.5 },
      }),
    );
  }

  // K883 (§3.4): two Ts 5h apart on one through, their ENDs leaning in at
  // 60° and 120° and crossing 5h out (chain 1 over). The Ts' spans overlap
  // on the through, so one cluster holds both passes unless the rule stops
  // an arm short of its pass.
  {
    const t = new PathB(-L, 0, 0).line(L).mark("j0").line(5 * H).mark("j1").line(L);
    const a = endFrom(O, 60);
    const b = endFrom([5 * H, 0], 120);
    const [cx, cy] = [2.5 * H, 2.5 * H * Math.tan(60 * D2R)];
    out.push(
      build({
        name: "j_pair_cross",
        paths: [t, a, b],
        junctions: [
          { id: "j0", c: O, arms: [...through(0, t.marks.j0, "L", "R"), endArm(1, 0, 1, "U")] },
          { id: "j1", c: [5 * H, 0], arms: [...through(0, t.marks.j1, "L", "R"), endArm(2, 0, 1, "U")] },
        ],
        crossings: [[1, sAt(a, cx, cy), 2, sAt(b, cx, cy)]],
        tips: [],
        view: { c: [2.5, 2.5], r: 7 },
        pois: [{ name: "crossing", at: [cx, cy], radius: 3.5 }],
        params: { spacing: 5, lean: 60 },
      }),
    );
  }

  // Kink loop: a 270° loop of centreline radius 1.6h; the chain crosses
  // itself at 90° at the origin, the second pass over.
  {
    const rho = 1.6 * H;
    const [ux, uy] = dir(45);
    const k = new PathB(-ux * 12, -uy * 12, 45).line(12).mark("x1").line(rho).arc(rho, 270).line(rho).mark("x2").line(12);
    out.push(
      build({
        name: "kink",
        paths: [k],
        junctions: [],
        crossings: [[0, k.marks.x2, 0, k.marks.x1]],
        tips: [],
        view: { c: [0, 1.5], r: 9 },
        pois: [{ name: "loop", at: [0, 1.4], radius: 3.5 }],
        params: { loopRadius: rho },
      }),
    );
  }

  // Dead end: a curved chain ending in its own cap on screen.
  {
    const d = new PathB(-16, -2, 0).line(12).arc(4, 90).line(2);
    out.push(
      build({
        name: "dead_end",
        paths: [d],
        junctions: [],
        crossings: [],
        tips: [[0, true]],
        view: { c: [-2, 1], r: 9 },
        pois: [{ name: "tip", at: [0, 3.6], radius: 2.5 }],
        params: { arcRadius: 4 },
      }),
    );
  }

  // Oblique 30° crossing, chain 1 over.
  {
    const a = straightThrough(O, 0);
    const b = straightThrough(O, 30);
    out.push(
      build({
        name: "oblique30",
        paths: [a, b],
        junctions: [],
        crossings: [[1, b.marks.j, 0, a.marks.j]],
        tips: [],
        view: { c: [0, 0], r: 9 },
        pois: [{ name: "crossing", at: [0, 0], radius: 4.5 }],
        params: { theta: 30 },
      }),
    );
  }

  // K42 cyclic triple: three lines on a triangle of side 1.5h, A over B,
  // B over C, C over A.
  {
    const a = 1.5 * H;
    const rin = a / (2 * Math.sqrt(3));
    const P1: [number, number] = [-a / 2, -rin];
    const P2: [number, number] = [a / 2, -rin];
    const P3: [number, number] = [0, -rin + (a * Math.sqrt(3)) / 2];
    const A = straightThrough(P1, 0);
    const B = straightThrough(P2, 120);
    const C = straightThrough(P1, 60);
    out.push(
      build({
        name: "k42",
        paths: [A, B, C],
        junctions: [],
        crossings: [
          [0, sAt(A, P2[0], P2[1]), 1, sAt(B, P2[0], P2[1])],
          [1, sAt(B, P3[0], P3[1]), 2, sAt(C, P3[0], P3[1])],
          [2, sAt(C, P1[0], P1[1]), 0, sAt(A, P1[0], P1[1])],
        ],
        tips: [],
        view: { c: [0, 0], r: 9 },
        pois: [{ name: "triple", at: [0, 0.1], radius: 3.5 }],
        params: { side: a },
      }),
    );
  }

  // A junction on a tightly curved through (centreline radius 2.2h), the
  // END leaving outward from the arc's apex.
  {
    const R = 2.2 * H;
    const t = new PathB(-R, -L, 90).line(L).arc(R, -90).mark("j").arc(R, -90).line(L);
    const c: [number, number] = [0, R];
    const e = endFrom(c, 90);
    out.push(
      build({
        name: "tight_curve",
        paths: [t, e],
        junctions: [
          { id: "j0", c, arms: [...through(0, t.marks.j, "L", "R"), endArm(1, 0, 1, "U")], styles: { "U|L": "sharp" } },
        ],
        crossings: [],
        tips: [],
        view: { c: [0, 2], r: 9 },
        pois: [{ name: "junction", at: [0, 2.6], radius: 3 }],
        params: { throughRadius: R },
      }),
    );
  }

  // K868 S2: a corner whose two arms are both curved (centreline radius
  // 6h), each bending away from the other, for the G2 corners' curvature
  // match at the joins (sheet E).
  {
    const R = 6 * H;
    const phi = (8 * H) / R;
    const phiDeg = phi / D2R;
    const t = new PathB(-R * Math.sin(phi), -R + R * Math.cos(phi), phiDeg).arc(R, -phiDeg).mark("j").arc(R, -phiDeg);
    const [ex, ey] = dir(80);
    const e = new PathB(ex * 0.1 * H, ey * 0.1 * H, 80).arc(R, 60).line(8 * H);
    out.push(
      build({
        name: "curved",
        paths: [t, e],
        junctions: [
          { id: "j0", c: O, arms: [...through(0, t.marks.j, "L", "R"), endArm(1, 0, 1, "U")], styles: { "U|L": "sharp" } },
        ],
        crossings: [],
        tips: [],
        view: { c: [1.5, 1.5], r: 9 },
        pois: [{ name: "corner", at: [1.2, 1.4], radius: 3.5 }],
        params: { armRadius: R, theta: 80 },
      }),
    );
  }
  out.push(hookScene(1.5 * H, 1.0 * H));
  return out;
}

const here = dirname(fileURLToPath(import.meta.url));

export function writeFixtures(): string[] {
  const names: string[] = [];
  for (const s of syntheticScenes()) {
    writeFileSync(join(here, `${s.name}.json`), JSON.stringify(s) + "\n");
    names.push(s.name);
  }
  return names;
}

// Regenerate the fixtures: `npx vite-node test/render/field/scenes/write.ts`.
