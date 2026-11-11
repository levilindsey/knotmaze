// K1240 S4: a digest of the redesign's outputs (the outline table, the fill,
// the paint, the band), shared by test/render/outline_port.test.ts and the
// equality tool .claude/probes/K1240/s4/k1240s4_eq.ts (port vs prototype).
// Every number goes in as its float64 bits, so equal digests mean
// bit-identical outputs.
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import type { SceneIn } from "../../src/render/outline/outline";

/** The 12 scenes of K1240's checks (.claude/probes/K868/scenes/<name>.json). */
export const OUTLINE_SCENES = [
  "muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper",
  "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64",
] as const;

export function digest(v: unknown): string {
  const h = createHash("sha256");
  const walk = (x: unknown): void => {
    if (x === null) { h.update("N"); return; }
    if (x === undefined) { h.update("U"); return; }
    switch (typeof x) {
      case "number": h.update("n"); h.update(new Uint8Array(Float64Array.of(x).buffer)); return;
      case "string": h.update(`s${x.length}:${x}`); return;
      case "boolean": h.update(x ? "T" : "F"); return;
      case "object": break;
      default: throw new Error(`digest: ${typeof x}`);
    }
    if (ArrayBuffer.isView(x)) {
      const a = x as unknown as ArrayLike<number>;
      h.update(`a${a.length}`);
      h.update(new Uint8Array(Float64Array.from(a).buffer));
      return;
    }
    if (Array.isArray(x)) {
      if (x.every((e) => typeof e === "number")) { h.update(`a${x.length}`); h.update(new Uint8Array(Float64Array.from(x as number[]).buffer)); return; }
      h.update(`l${x.length}`);
      for (const e of x) walk(e);
      return;
    }
    if (x instanceof Map) { h.update(`m${x.size}`); for (const [k, e] of x) { walk(k); walk(e); } return; }
    if (x instanceof Set) { h.update(`t${x.size}`); for (const e of x) walk(e); return; }
    const o = x as Record<string, unknown>;
    const keys = Object.keys(o);
    h.update(`o${keys.length}`);
    for (const k of keys) { h.update(`k${k}`); walk(o[k]); }
  };
  walk(v);
  return h.digest("hex").slice(0, 16);
}

/** A scene file (.json, or .json.gz), with the probes' ctrlArc default. */
export function loadScene(path: string): SceneIn {
  const raw = readFileSync(path);
  const scene = JSON.parse((path.endsWith(".gz") ? gunzipSync(raw) : raw).toString("utf8")) as SceneIn;
  (scene.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
  return scene;
}

/** The outputs compared: the table, then the fill + paint, then the band. */
export interface OutlineOut {
  table: unknown;
  paint: { idx: unknown; run: unknown; src: unknown; pos: unknown; key: unknown; w: unknown; s: unknown; tex: unknown; copies: number; ks: number };
  band: { bandPos: unknown; bandCol: unknown; bandAlpha: unknown; bandCount: number };
}

export function digestOut(o: OutlineOut): { table: string; paint: string; band: string } {
  return { table: digest(o.table), paint: digest(o.paint), band: digest(o.band) };
}
