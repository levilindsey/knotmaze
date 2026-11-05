// K1179 S1 (copied for Run I of docs/design/K1178_muse_batch16.md from
// .claude/worktrees/k868-s3a/.claude/probes/S3a/seq13_lib.ts, K1176's tree):
// the recorded sequences (seq13_record.mjs) and the label's app params
// (label_app.ts rebuild), shared by the seq13 prototypes. The recording
// path below points at the main checkout's .claude/probes/S3a/seq13/
// (def_drag, def_flow, muse_drag, muse_flow; untracked, not added to git).
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { cornerRadius, type OracleParams } from "../../../src/render/field/oracle";
import type { FieldScene } from "../../../src/render/field/scene";

export interface SeqFrame {
  i: number;
  t: number;
  hash?: string;
  scene: FieldScene;
}

export function loadSeq(name: string): { meta: Record<string, unknown>; frames: SeqFrame[] } {
  const raw = gunzipSync(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/S3a/seq13/${name}.jsonl.gz`)).toString("utf8");
  const lines = raw.split("\n");
  const meta = JSON.parse(lines[0]);
  const frames: SeqFrame[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue;
    const f = JSON.parse(lines[i]) as SeqFrame;
    f.scene.look.ctrlArc ??= 0.47;
    frames.push(f);
  }
  return { meta, frames };
}

export function labelParams(scene: FieldScene): OracleParams {
  const h = scene.look.halfWidth;
  return {
    rRound: 0,
    rOf: (_j, _i, th, st) => (st === "round" ? cornerRadius(3, h, th) : 0),
    spans: "k883",
    crMax: 3,
    labelOnly: true,
  };
}

export const pct = (xs: number[], q: number): number => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
};
export const fmt = (x: number, d = 3): string => (Number.isFinite(x) ? x.toFixed(d) : String(x));

/** Frames whose drawn points differ from the previous kept frame (a flow
 * page at rest repaints some frames unchanged; the label skips those). */
export function distinct(frames: SeqFrame[]): SeqFrame[] {
  const out: SeqFrame[] = [];
  for (const f of frames) {
    const p = out[out.length - 1];
    if (p && sameScene(p.scene, f.scene)) continue;
    out.push(f);
  }
  return out;
}

export function sameScene(a: FieldScene, b: FieldScene): boolean {
  if (a.chains.length !== b.chains.length) return false;
  for (let c = 0; c < a.chains.length; c++) {
    const pa = a.chains[c].pts;
    const pb = b.chains[c].pts;
    if (pa.length !== pb.length) return false;
    for (let k = 0; k < pa.length; k++) if (pa[k] !== pb[k]) return false;
  }
  return true;
}
