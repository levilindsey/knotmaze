// K868 S1b: shared plumbing for the manual oracle runs (paths, cameras,
// field files). Node-only; the geometry lives in src/render/field/.

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { FieldScene } from "../../../src/render/field/scene";
import type { Camera, OracleRender, RenderRect } from "../../../src/render/field/oracle";
import { encodePng } from "./png";

export const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO = resolve(HERE, "../../..");

/** The main checkout's .claude/probes/K868 (outputs never land in a worktree). */
export function outRoot(): string {
  if (process.env.K868_OUT) return process.env.K868_OUT;
  const norm = REPO.replace(/\\/g, "/");
  const i = norm.indexOf("/.claude/worktrees/");
  const main = i >= 0 ? norm.slice(0, i) : norm;
  return join(main, ".claude", "probes", "K868");
}

export function ensureDir(d: string): string {
  mkdirSync(d, { recursive: true });
  return d;
}

export function loadSynthetic(): FieldScene[] {
  const dir = join(HERE, "scenes");
  const only = process.env.K868_SCENES?.split(",");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")) as FieldScene)
    .filter((s) => !only || only.includes(s.name));
}

export interface View {
  name: string;
  cam: Camera;
  rect: RenderRect;
  /** CSS px per world unit at this view. */
  ppu: number;
  label: string;
}

/** The scene's own camera over its whole viewport. */
export function fullView(s: FieldScene): View {
  const c = s.camera;
  return {
    name: "full",
    cam: { worldToCss: c.worldToCss, dpr: c.dpr },
    rect: { x0: 0, y0: 0, w: Math.round(c.viewport[0] * c.dpr), h: Math.round(c.viewport[1] * c.dpr) },
    ppu: c.pxPerUnit,
    label: `${s.name} camera: ${c.pxPerUnit.toFixed(2)} px/unit, dpr ${c.dpr}, ${c.viewport[0]}x${c.viewport[1]} CSS px`,
  };
}

/** A k-times zoom of the scene's camera around a world point (a "6x crop"). */
export function zoomView(s: FieldScene, name: string, at: [number, number], radius: number, k: number): View {
  const [a, b, c, d, e, f] = s.camera.worldToCss;
  const wt: Camera["worldToCss"] = [a * k, b * k, c * k, d * k, e * k, f * k];
  const cx = wt[0] * at[0] + wt[2] * at[1] + wt[4];
  const cy = wt[1] * at[0] + wt[3] * at[1] + wt[5];
  const half = Math.round(radius * s.camera.pxPerUnit * k);
  return {
    name,
    cam: { worldToCss: wt, dpr: 1 },
    rect: { x0: Math.round(cx - half), y0: Math.round(cy - half), w: 2 * half, h: 2 * half },
    ppu: s.camera.pxPerUnit * k,
    label: `${s.name} ${name}: ${k}x zoom of the scene camera (${(s.camera.pxPerUnit * k).toFixed(1)} px/unit, h = ${(
      s.look.halfWidth *
      s.camera.pxPerUnit *
      k
    ).toFixed(1)} px), centre (${at[0].toFixed(2)}, ${at[1].toFixed(2)}), ${2 * half} px square`,
  };
}

/** PNG + float32 F (CSS px) + int32 top ids, as `<dir>/<base>.{png,f32,top.i32,json}`. */
export function writeRender(dir: string, base: string, r: OracleRender, meta: object): void {
  ensureDir(dir);
  writeFileSync(join(dir, `${base}.png`), encodePng(r.w, r.h, r.rgba));
  writeFileSync(join(dir, `${base}.f32`), Buffer.from(r.F.buffer, r.F.byteOffset, r.F.byteLength));
  writeFileSync(join(dir, `${base}.top.i32`), Buffer.from(r.top.buffer, r.top.byteOffset, r.top.byteLength));
  writeFileSync(join(dir, `${base}.json`), JSON.stringify({ w: r.w, h: r.h, ms: r.ms, ...meta }, null, 1));
}
