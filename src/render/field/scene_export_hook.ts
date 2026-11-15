// K868 S1a: window.__knotSceneExport, the scene export's page side
// (docs/design/K868_s1a_scene_export.md, deliverable 1). It gathers one
// frame's plain data from the live renderer and physics and hands it to
// the pure buildFieldScene (scene_export.ts), which decides every number.
// READ-ONLY: it reads fields (private ones through casts), computes
// binding points into its own scratch and awaits host.dump(); it writes
// nothing the frame reads, so the byte-identity golden cannot move.
// Registered by src/app/probe_hooks.ts (installSceneExport).
//
// Use it on a frozen page (__knotPhysFreeze(true)) with phw=0: the
// renderer's samples and the physics arrays then belong to one frame.

import type { ProbeCtx } from "../../app/probe_hooks";
import { APP_VERSION, BUILD_SHA } from "../../build_info";
import type { ParticleSystem } from "../../physics/particle_system";
import { hashDump } from "../../physics/probe_dump";
import type { RibbonRenderer } from "../ribbon_renderer";
import { assembleLeanInput, exportChain, exportPass, slotEmergent, type LeanSkeleton } from "./lean_input";
import {
  buildFieldScene,
  type ExportChain,
  type ExportCrossing,
  type ExportTip,
  type SceneExportInput,
} from "./scene_export";

export type SceneExportCtx = Pick<
  ProbeCtx,
  "scene" | "app" | "root" | "params" | "host" | "physicsTuning"
>;

// particle_system.ts COLLISION_MARGIN x DEPTH_AMP_FACTOR, and DEPTH_WINDOW
// (module constants there, not exported).
const COLLISION_MARGIN = 1.16;
const DEPTH_AMP_FACTOR = 1.0;
const DEPTH_WINDOW = 1.4;

interface RendererPrivates {
  chainTipFused: Array<[boolean, boolean]>;
  cornerCandidates: Array<{ key: string; pin?: unknown }>;
  cornerRounded: ReadonlySet<string>;
}

// K1369 s4: moved to lean_input.ts (exportPass).
const pass = exportPass;

/** The emergent crossings master gives a gap slot this frame: lean_input.ts
 * slotEmergent (K1369 s4 moved its body there for the gf worker). */
function slottedEmergent(
  r: RibbonRenderer,
  ps: ParticleSystem
): { list: ExportCrossing[]; jointPairs: number; dups: number; overPool: number } {
  return slotEmergent(
    ps.emergentCrossings,
    (p, out, offset) => ps.bindingPoint(p, out, offset),
    r.diagData,
    r.skipJointPairs,
    r.junctionArcCtrls,
    (c) => ps.chains[c].length,
    (c) => ps.chainBreakAfter[c] < 0
  );
}

/** K868 S3a2: one frame's SceneExportInput, gathered synchronously. The
 * hook below passes the host's dump; the label pass (src/render/label/)
 * passes the view's positions and no zPos (its depth rule, "overlap",
 * reads the crossing table, not zPos). */
export function gatherSceneInput(
  ctx: SceneExportCtx,
  phys: { zPos: ArrayLike<number>; positions: ArrayLike<number>; simTime: number },
  physHash: string,
  name: string
): { input: SceneExportInput; em: ReturnType<typeof slottedEmergent> } {
    const r = ctx.scene.renderer;
    const ps = ctx.scene.ps;
    if (!r || !ps) throw new Error("__knotSceneExport: no scene");
    const rp = r as unknown as RendererPrivates;

    const chains: ExportChain[] = [];
    const missing: number[] = [];
    for (let c = 0; c < ps.chains.length; c++) {
      const s = r.chainSamples[c];
      const fused = rp.chainTipFused[c] ?? [false, false];
      if (!s) {
        missing.push(c);
        chains.push({
          closed: ps.chainBreakAfter[c] < 0,
          count: 0,
          positions: new Float32Array(0),
          totalLength: 0,
          controlArcLengths: new Float32Array(0),
          particles: ps.chains[c],
          tucked: [false, false],
        });
        continue;
      }
      chains.push({
        closed: s.closed,
        count: s.count,
        positions: Float64Array.from(s.positions.subarray(0, s.count * 2)),
        totalLength: s.totalLength,
        controlArcLengths: Float64Array.from(s.controlArcLengths),
        particles: ps.chains[c],
        tucked: [fused[0], fused[1]],
      });
    }
    if (missing.length) {
      throw new Error(`__knotSceneExport: chains without samples: ${missing.join(",")}`);
    }

    const crossings: ExportCrossing[] = ps.crossings.map((x) => ({
      over: pass(x.over),
      under: pass(x.under),
    }));
    const em = slottedEmergent(r, ps);

    // Open ends: fused (tucked into a junction), free (a capped dead end),
    // an END arm of a junction, or else anchored (no cap drawn).
    const freeTips: ExportTip[] = r.freeTips.map((t) => ({ chain: t.chain, atEnd: t.atEnd }));
    const isFree = new Set(freeTips.map((t) => `${t.chain}:${t.atEnd}`));
    const isEndArm = new Set<string>();
    for (const jn of r.junctionArms) {
      for (const a of jn.arms) {
        const L = ps.chains[a.chain].length;
        if (ps.chainBreakAfter[a.chain] >= 0) {
          if (a.slot === 0 && a.dir === 1) isEndArm.add(`${a.chain}:false`);
          if (a.slot === L - 1 && a.dir === -1) isEndArm.add(`${a.chain}:true`);
        }
      }
    }
    const anchoredTips: ExportTip[] = [];
    for (let c = 0; c < chains.length; c++) {
      if (chains[c].closed) continue;
      for (const atEnd of [false, true]) {
        const k = `${c}:${atEnd}`;
        if (chains[c].tucked[atEnd ? 1 : 0] || isFree.has(k) || isEndArm.has(k)) continue;
        anchoredTips.push({ chain: c, atEnd });
      }
    }

    const root = ctx.root;
    const s = root.scale.x;
    const params = ctx.params;
    const h = r.style.threadWidth / 2;
    const input: SceneExportInput = {
      name,
      source: {
        kind: "app" as const,
        url: location.href,
        build: `v${APP_VERSION} · ${BUILD_SHA}`,
        simTime: phys.simTime,
        physHash,
      },
      camera: {
        worldToCss: [s, 0, 0, s, root.position.x, root.position.y] as [
          number, number, number, number, number, number,
        ],
        pxPerUnit: s,
        dpr: ctx.app.renderer.resolution,
        viewport: [ctx.app.screen.width, ctx.app.screen.height] as [number, number],
      },
      look: {
        halfWidth: h,
        band: r.borderWidth * h,
        cornerRoundShare: r.cornerRoundShare,
        cuspRadius: params.cuspRadius,
        depthAmp: ctx.physicsTuning().threadWidth * COLLISION_MARGIN * DEPTH_AMP_FACTOR,
        depthWindow: DEPTH_WINDOW,
        paper: params.backgroundBase,
        ink: params.borderColor,
      },
      chains,
      // The dump's arrays: exactly what the hash certifies.
      zPos: Float64Array.from(phys.zPos),
      physPositions: Float64Array.from(phys.positions),
      crossings,
      emergent: em.list,
      dedupeEmergent: false,
      junctions: r.junctionArms.map((j) => ({
        particles: [...j.particles],
        arms: j.arms.map((a) => ({ chain: a.chain, slot: a.slot, dir: a.dir as 1 | -1 })),
      })),
      corners: {
        candidates: rp.cornerCandidates.map((c) => ({ key: c.key, pin: c.pin })),
        rounded: rp.cornerRounded,
      },
      freeTips,
      anchoredTips,
    };
    return { input, em };
}

/** K1362 c1: what `buildFieldSceneLean` reads of gatherSceneInput's input,
 * gathered the same way, for rp=gf's per-frame build: no physics arrays
 * (zPos and physPositions empty, junction particles empty, each chain's
 * particles only its length), and every field structured-cloneable, so the
 * input can be posted to a worker (`transfer` lists the sample buffers,
 * fresh copies). The chains' samples are copied as Float32 (the renderer's
 * own type; gatherSceneInput's Float64 copy holds the same values). */
export function gatherSceneInputLean(
  ctx: SceneExportCtx,
  name: string
): { input: SceneExportInput; transfer: ArrayBuffer[] } {
  const r = ctx.scene.renderer;
  const ps = ctx.scene.ps;
  if (!r || !ps) throw new Error("gatherSceneInputLean: no scene");
  const sk = gatherLeanSkeleton(ctx, name);
  const chains: ExportChain[] = [];
  const transfer: ArrayBuffer[] = [];
  const missing: number[] = [];
  for (let c = 0; c < ps.chains.length; c++) {
    const s = r.chainSamples[c];
    if (!s) {
      missing.push(c);
      continue;
    }
    const ch = exportChain(s, ps.chains[c].length, sk.tucked[c]);
    transfer.push((ch.positions as Float32Array).buffer as ArrayBuffer, (ch.controlArcLengths as Float64Array).buffer as ArrayBuffer);
    chains.push(ch);
  }
  if (missing.length) {
    throw new Error(`gatherSceneInputLean: chains without samples: ${missing.join(",")}`);
  }
  const crossings: ExportCrossing[] = ps.crossings.map((x) => ({
    over: pass(x.over),
    under: pass(x.under),
  }));
  const em = slottedEmergent(r, ps);
  return { input: assembleLeanInput(sk, chains, crossings, em.list), transfer };
}

/** K1369 s4: the lean input's parts that do not move with the physics (the
 * camera, the look, the tips, junctions and corners, each chain's particle
 * count and tucks, the emergent slotting's renderer state): main gathers
 * them; gatherSceneInputLean (above) and the gf worker's snapshot channel
 * (gf_worker.ts) add one frame's chains, crossings and emergent slots
 * (lean_input.ts assembleLeanInput). Structured-cloneable. */
export function gatherLeanSkeleton(ctx: SceneExportCtx, name: string): LeanSkeleton {
  const r = ctx.scene.renderer;
  const ps = ctx.scene.ps;
  if (!r || !ps) throw new Error("gatherLeanSkeleton: no scene");
  const rp = r as unknown as RendererPrivates;
  const tucked: [boolean, boolean][] = ps.chains.map((_, c) => {
    const f = rp.chainTipFused[c] ?? [false, false];
    return [f[0], f[1]];
  });
  const freeTips: ExportTip[] = r.freeTips.map((t) => ({ chain: t.chain, atEnd: t.atEnd }));
  const isFree = new Set(freeTips.map((t) => `${t.chain}:${t.atEnd}`));
  const isEndArm = new Set<string>();
  for (const jn of r.junctionArms) {
    for (const a of jn.arms) {
      const L = ps.chains[a.chain].length;
      if (ps.chainBreakAfter[a.chain] >= 0) {
        if (a.slot === 0 && a.dir === 1) isEndArm.add(`${a.chain}:false`);
        if (a.slot === L - 1 && a.dir === -1) isEndArm.add(`${a.chain}:true`);
      }
    }
  }
  const anchoredTips: ExportTip[] = [];
  for (let c = 0; c < ps.chains.length; c++) {
    // A chain's samples are closed exactly when it has no break.
    if (ps.chainBreakAfter[c] < 0) continue;
    for (const atEnd of [false, true]) {
      const k = `${c}:${atEnd}`;
      if (tucked[c][atEnd ? 1 : 0] || isFree.has(k) || isEndArm.has(k)) continue;
      anchoredTips.push({ chain: c, atEnd });
    }
  }
  const root = ctx.root;
  const sc = root.scale.x;
  const params = ctx.params;
  const h = r.style.threadWidth / 2;
  const joints = new Map<number, { ctrl: number; jn: number }[]>();
  for (const [c, list] of r.junctionArcCtrls) joints.set(c, list.map((x) => ({ ctrl: x.ctrl, jn: x.jn })));
  return {
    rest: {
      name,
      source: { kind: "app" as const, url: "", build: `v${APP_VERSION} · ${BUILD_SHA}`, simTime: 0, physHash: name },
      camera: {
        worldToCss: [sc, 0, 0, sc, root.position.x, root.position.y] as [
          number, number, number, number, number, number,
        ],
        pxPerUnit: sc,
        dpr: ctx.app.renderer.resolution,
        viewport: [ctx.app.screen.width, ctx.app.screen.height] as [number, number],
      },
      look: {
        halfWidth: h,
        band: r.borderWidth * h,
        cornerRoundShare: r.cornerRoundShare,
        cuspRadius: params.cuspRadius,
        depthAmp: ctx.physicsTuning().threadWidth * COLLISION_MARGIN * DEPTH_AMP_FACTOR,
        depthWindow: DEPTH_WINDOW,
        paper: params.backgroundBase,
        ink: params.borderColor,
      },
      zPos: new Float64Array(0),
      physPositions: new Float64Array(0),
      dedupeEmergent: false,
      junctions: r.junctionArms.map((j) => ({
        particles: [],
        arms: j.arms.map((a) => ({ chain: a.chain, slot: a.slot, dir: a.dir as 1 | -1 })),
      })),
      corners: {
        candidates: rp.cornerCandidates.map((c) => (c.pin === undefined ? { key: c.key } : { key: c.key, pin: true })),
        rounded: new Set(rp.cornerRounded),
      },
      freeTips,
      anchoredTips,
    },
    particles: ps.chains.map((ch) => ch.length),
    tucked,
    skipJointPairs: r.skipJointPairs,
    joints,
  };
}

export function installSceneExport(ctx: SceneExportCtx): void {
  (window as unknown as Record<string, unknown>).__knotSceneExport = async (
    opts: { name?: string } = {}
  ) => {
    const r = ctx.scene.renderer;
    const ps = ctx.scene.ps;
    if (!r || !ps) throw new Error("__knotSceneExport: no scene");
    const dump = await ctx.host.dump();
    const hashes = hashDump(dump);
    const { input, em } = gatherSceneInput(ctx, dump, hashes.all, opts.name ?? "scene");
    const wt = ctx.root.worldTransform;
    const params = ctx.params;
    const { scene, diag } = buildFieldScene(input);
    return {
      scene,
      diag: {
        ...diag,
        hashes,
        cameraWorldTransform: [wt.a, wt.b, wt.c, wt.d, wt.tx, wt.ty],
        inkAuto: r.borderColor === 0,
        borderWidth: r.borderWidth,
        threadWidthParam: params.threadWidth,
        emergentRaw: ps.emergentCrossings.length,
        emergentJointPairs: em.jointPairs,
        emergentMasterDups: em.dups,
        emergentOverPool: em.overPool,
        skipJointPairs: r.skipJointPairs,
      },
    };
  };
}
