// K1139 S2: one light field over the lit tree (docs/design/
// K1139_pulse_junctions.md 2.1 and 4.1). Pure: no Pixi, no DOM. The
// renderer declares one pulse item per walk edge of the tree this
// builds; the shader's kPulseV phases each arm by dist0 + local arc, so
// dist0 summed from the DRAWN spans (not the lattice lengths) is what
// carries a crest across a junction without a phase step.
//
// The tree is a Dijkstra over LATTICE lengths from your junction (the
// stable tree: it does not flip while the knot moves; only the drawn
// sums ride on it). Every lit arm's dist0 is the sum of the drawn spans
// along its tree path, quantized to 1e-3 so the declaration only
// changes when the geometry really moves. Behind you - everything the
// tree reaches through the arrival run - the light runs inward, toward
// you, so the flow runs one way everywhere (Levi's Q2).
//
// S3 added the junction bands; S4 the arms lit from both ends (a cycle
// arm whose far end the tree reaches by another way, a self-loop: one
// item each, two-ended) and the bands into every lit arm. Not here: your
// own junction's lead and dip (S5).

import type { WalkGraph } from "../core/walk_graph";

// One lit arm of the tree.
// - near/far: the arm's junction end (on your side of the tree) and its
//   far end; atA says the junction end is the run's ctrlA end.
// - span: the arm's live drawn length (from the caller's spanOf).
// - dist0: drawn distance from you to the junction end along the tree,
//   quantized to 1e-3.
// - cont: the light carries on past the far end (a junction inside the
//   reach), so no end fade applies there.
// - inward: this arm is behind you; its crests run toward you.
// - parent: the tree arm that reaches `near` (a walk edge id), or -1
//   for arms at your own junction.
// - two (S4, plan 2.1): the arm is lit from both ends - a cycle arm
//   whose far end is lit too (the tree reaches it another way, inside
//   the reach) or a self-loop with both ends lit (one item; near = far).
//   dB is the far end's drawn distance from you (quantized as dist0; a
//   loop's is dist0) and inwardB its direction; the shader's field is
//   dG = min(dist0 + d, dB + span - d), the crest trains faded at the
//   ridge where the two meet. cont is true on a two-ended arm (no end
//   fade); dB 0 and inwardB false on a one-ended one.
export interface PulseItem {
  edge: number;
  near: string;
  far: string;
  atA: boolean;
  span: number;
  dist0: number;
  cont: boolean;
  inward: boolean;
  parent: number;
  two: boolean;
  dB: number;
  inwardB: boolean;
}

// K1139 S3a: one pulse band through a lit junction (plan 2.2, T10): the
// crest leaves the head-side arm `aEdge` and runs on along the far-side
// arm `bEdge`, on the K81 curve between them (junction_routes.ts turns
// this into arms and slots). One band per tree child, so a 3-arm
// junction holds 2 and a 4-arm junction 3. Ahead of you the head-side
// arm is the tree parent (the light arrives by it and splits into each
// child); behind you it is the arrival-side arm (each back arm's light
// gathers into the arm toward you), so the geometry is the same and
// `inward` alone says which way the crest travels. `distJ` is the
// junction's drawn distance from you (the child's dist0, quantized as
// the items are): the band's crest reads dG = distJ + tau, tau signed
// along the band, negative on the aEdge side. Your own junction gets no
// band (its hand-off is S5's). S4: every lit arm gets its band, not just
// the tree children: a cycle arm at each lit end (the far end's band
// from that end's own parent, its distJ the item's dB) and a self-loop
// at each lit end. `bAtA` names bEdge's end at the vertex (a loop has
// both there).
export interface PulseBandSpec {
  vertex: string;
  aEdge: number;
  bEdge: number;
  distJ: number;
  inward: boolean;
  bAtA: boolean;
}

const q3 = (x: number): number => Math.round(x * 1000) / 1000;

// The lit tree from `head` (your junction) out to `reach`: its pulse
// items in Dijkstra order (your arms first) and, per lit junction the
// light passes through, its pulse band specs (S3a). `arrival` is the
// walk edge you came by (-1 before the first move): it and everything
// the tree reaches through it are inward. `spanOf(eid)` is an edge's
// live drawn length. `gate(eid, atA)` may veto a beyond-head arm and
// `blocked(eid)` any arm (K137 broken / K114 cut runs): a vetoed arm
// neither lights nor carries light through, exactly as route_plan's
// litArms had it - head arms are never gated, blocked arms are barred
// at the head too.
export function pulseTree(
  walk: WalkGraph,
  head: string,
  arrival: number,
  reach: number,
  spanOf: (eid: number) => number,
  gate?: (eid: number, atA: boolean) => boolean,
  blocked?: (eid: number) => boolean
): { items: PulseItem[]; bands: PulseBandSpec[] } {
  const items: PulseItem[] = [];
  const bands: PulseBandSpec[] = [];
  if (!walk.vertices.has(head)) return { items, bands };

  // Dijkstra over lattice lengths, with litArms' deterministic scan and
  // tie-breaking (smallest distance, then smallest vertex id; a strict
  // improvement takes the parent, so the first-found parent stands).
  // Gated (beyond the head) and blocked runs are never traversed.
  const dist = new Map<string, number>();
  const parentEdge = new Map<string, number>();
  const parentVert = new Map<string, string>();
  for (const id of walk.vertices.keys()) dist.set(id, Infinity);
  dist.set(head, 0);
  const done = new Set<string>();
  const order: string[] = [];
  for (;;) {
    let cur: string | null = null;
    let curD = Infinity;
    for (const [id, d] of dist) {
      if (done.has(id) || !Number.isFinite(d)) continue;
      if (d < curD || (d === curD && cur !== null && id < cur)) {
        curD = d;
        cur = id;
      }
    }
    if (cur === null) break;
    done.add(cur);
    order.push(cur);
    for (const eid of walk.vertices.get(cur)!.edges) {
      if (blocked && blocked(eid)) continue;
      const e = walk.edges[eid];
      if (e.va === e.vb) continue; // A self-loop carries nothing through.
      if (cur !== head && gate && !gate(eid, e.va === cur)) continue;
      const other = e.va === cur ? e.vb : e.va;
      const nd = curD + e.length;
      if (nd < dist.get(other)!) {
        dist.set(other, nd);
        parentEdge.set(other, eid);
        parentVert.set(other, cur);
      }
    }
  }

  // Drawn distance along the tree (spanOf read once per edge).
  const spans = new Map<number, number>();
  const span = (eid: number): number => {
    let s = spans.get(eid);
    if (s === undefined) {
      s = spanOf(eid);
      spans.set(eid, s);
    }
    return s;
  };
  const drawn = new Map<string, number>([[head, 0]]);
  const drawnOf = (v: string): number => {
    let d = drawn.get(v);
    if (d !== undefined) return d;
    const pe = parentEdge.get(v)!;
    d = drawnOf(parentVert.get(v)!) + span(pe);
    drawn.set(v, d);
    return d;
  };
  // The first tree edge out of the head on the path to v (-1 at head):
  // the back region is the subtree behind the arrival's first step.
  const first = new Map<string, number>([[head, -1]]);
  const firstOf = (v: string): number => {
    let f = first.get(v);
    if (f !== undefined) return f;
    const pv = parentVert.get(v)!;
    f = pv === head ? parentEdge.get(v)! : firstOf(pv);
    first.set(v, f);
    return f;
  };

  // Emit each lit edge once, from the first-popped (nearer) end whose
  // junction end is inside the reach (your own arms always). A gated or
  // blocked edge met first is spent: it never lights from the far side.
  // S4: an edge whose far end is lit too, past the far end's own gate,
  // is two-ended - a non-tree arm (the tree reaches its far end another
  // way; never your junction, whose arms all emit from it) or a
  // self-loop, one item whichever of its ends are lit.
  const lit = (v: string): boolean => dist.get(v)! < reach;
  const emitted = new Set<number>();
  for (const u of order) {
    if (u !== head && !lit(u)) continue;
    for (const eid of walk.vertices.get(u)!.edges) {
      if (emitted.has(eid)) continue;
      emitted.add(eid);
      if (blocked && blocked(eid)) continue;
      const e = walk.edges[eid];
      const loop = e.va === e.vb;
      const okAt = (atEndA: boolean): boolean => u === head || !gate || gate(eid, atEndA);
      let atA = e.va === u;
      let two: boolean;
      if (loop) {
        const okA = okAt(true);
        const okB = okAt(false);
        if (!okA && !okB) continue;
        two = okA && okB;
        atA = okA; // Only its ctrlB end lit: the arm runs from there.
      } else {
        if (!okAt(atA)) continue;
        const w0 = atA ? e.vb : e.va;
        two =
          parentEdge.get(w0) !== eid &&
          lit(w0) &&
          !walk.vertices.get(w0)!.isEnd &&
          (!gate || gate(eid, !atA));
      }
      const w = loop ? u : atA ? e.vb : e.va;
      const farV = walk.vertices.get(w);
      const inward = u === head ? eid === arrival : firstOf(u) === arrival;
      const dist0 = q3(drawnOf(u));
      items.push({
        edge: eid,
        near: u,
        far: w,
        atA,
        span: span(eid),
        dist0,
        cont: two || (!loop && !!farV && !farV.isEnd && lit(w)),
        inward,
        parent: u === head ? -1 : parentEdge.get(u)!,
        two,
        dB: !two ? 0 : loop ? dist0 : q3(drawnOf(w)),
        inwardB: !two ? false : loop ? inward : firstOf(w) === arrival,
      });
    }
  }

  // S3a bands: one per tree child at every lit junction past your own.
  // A tree child is an item whose edge is its far vertex's parent edge.
  // The head-side arm is the child's tree parent, ahead of you and
  // behind you alike (see PulseBandSpec). S4 appends the rest after
  // them (so a junction's tree-child bands keep their slots): each
  // non-tree arm and self-loop end at its near junction, and a
  // two-ended arm's far end, from that end's own parent.
  const treeEdges = new Set(parentEdge.values());
  const band = (vertex: string, eid: number, distJ: number, inward: boolean, bAtA: boolean): void => {
    bands.push({ vertex, aEdge: parentEdge.get(vertex)!, bEdge: eid, distJ, inward, bAtA });
  };
  for (const it of items) {
    if (it.near === head || it.parent < 0 || !treeEdges.has(it.edge)) continue;
    const e = walk.edges[it.edge];
    if (e.va === e.vb) continue;
    band(it.near, it.edge, it.dist0, it.inward, it.atA);
  }
  for (const it of items) {
    const e = walk.edges[it.edge];
    const loop = e.va === e.vb;
    if (it.near !== head && (loop || !treeEdges.has(it.edge))) {
      band(it.near, it.edge, it.dist0, it.inward, it.atA);
      if (loop && it.two) band(it.near, it.edge, it.dist0, it.inward, false);
    }
    if (it.two && !loop) band(it.far, it.edge, it.dB, it.inwardB, !it.atA);
  }
  return { items, bands };
}

// The lit tree's pulse items alone (S2's entry point; pulseTree also
// returns the band specs).
export function pulsePath(
  walk: WalkGraph,
  head: string,
  arrival: number,
  reach: number,
  spanOf: (eid: number) => number,
  gate?: (eid: number, atA: boolean) => boolean,
  blocked?: (eid: number) => boolean
): PulseItem[] {
  return pulseTree(walk, head, arrival, reach, spanOf, gate, blocked).items;
}
