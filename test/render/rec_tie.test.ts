// K1247 s26 (K1322): the record fill (what the app draws: fillRec 2, whose CPU twin is fillRec 3) keys
// every strip as fillFrame (what the K1314 census rasters) does: K1314 s5's per-side keys and s6's matched
// s scale, spans and held ends. A strip's border rows sit at the same depths and the same row s in both,
// vertex for vertex, so a change to either rule fails here until the other follows. The positions along a
// border differ by design (colAt's fan-aware columns against fillFrame's even resample of the piece).
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { frame, structure, type SceneIn } from "../../src/render/outline/outline";
import { zChains } from "../../src/render/outline/draw";
import { REC_TEXELS, fillFrame, fillResolution, fillStructure, recStrips, type StripItem } from "../../src/render/outline/fill_tri";
import { SPAN_EPS } from "../../src/render/outline/chain_frame";
import { REC_GLSL } from "../../src/render/outline/rec_glsl";
import { loadScene } from "./outline_digest";

const ring = (): SceneIn => loadScene(fileURLToPath(new URL("./fixtures/outline_ring.json.gz", import.meta.url)));
// The census scene, where a checkout has it (untracked probe input).
const G41 = fileURLToPath(new URL("../../.claude/probes/K868/scenes/g41_ring_tw42.json", import.meta.url));
const g41 = (): SceneIn => {
  const s = JSON.parse(readFileSync(G41, "utf8")) as SceneIn;
  (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
  return s;
};
/** The scene with every chain point moved by a smooth wave of amplitude a, phase t. */
const wave = (sc: SceneIn, a: number, t: number): SceneIn => ({
  ...sc,
  chains: sc.chains.map((c) => {
    const p = c.pts.slice();
    for (let i = 0; i + 1 < p.length; i += 2) { const x = p[i]; const y = p[i + 1]; p[i] = x + a * Math.cos(0.7 * y + t); p[i + 1] = y + a * Math.sin(0.9 * x + 1.3 * t); }
    return { ...c, pts: p };
  }),
});

/** fillFrame against fillRec 3 on one scene: the largest key and row-s differences over the strips'
 *  vertices, and how many strips have border ranges that differ (the rule's cases). */
function tie(sc0: SceneIn): { dKey: number; dS: number; strips: number; differ: number; bad: number; mirrored: number } {
  const sc = { ...sc0, look: { ...sc0.look } }; delete (sc.look as { fillRec?: number }).fillRec;
  const st = structure(sc); const table = frame(st, sc); const zz = zChains(sc);
  const fs = fillStructure(st, fillResolution(st, table));
  const a = fillFrame(fs, st, table, sc, zz);
  const b = fillFrame(fs, st, table, { ...sc, look: { ...sc.look, fillRec: 3 } } as SceneIn, zz);
  const T = fillFrame(fs, st, table, { ...sc, look: { ...sc.look, fillRec: 2 } } as SceneIn, zz).rec!.strip;
  let mirrored = 0; for (let o = 0; o < recStrips(fs).length; o++) if (Math.round(T[4 * REC_TEXELS * o + 7]) & 12) mirrored++;
  let dKey = 0; let dS = 0; let strips = 0; let differ = 0; let bad = 0;
  for (const it of fs.items) {
    if (it.kind !== "strip") continue;
    const S = it as StripItem; strips++;
    const pl = S.pL >= 0 ? table.pieces[S.pL] : null; const pr = S.pR >= 0 ? table.pieces[S.pR] : null;
    if (pl && pr && (pl.s0 !== pr.s0 || pl.s1 !== pr.s1)) differ++;
    for (let v = S.base; v < S.base + 3 * (S.N + 1); v++) {
      if (!(Number.isFinite(b.key[v]) && Number.isFinite(b.pos[2 * v]) && Number.isFinite(b.pos[2 * v + 1]))) bad++;
      dKey = Math.max(dKey, Math.abs(a.key[v] - b.key[v])); dS = Math.max(dS, Math.abs(a.s[v] - b.s[v]));
    }
  }
  return { dKey, dS, strips, differ, bad, mirrored };
}

describe("K1247 s26 the record fill keys as fillFrame (K1322)", () => {
  it("ties every strip vertex's key and row s on the ring fixture, at rest and moved", () => {
    for (const sc of [ring(), wave(ring(), 0.08, 0.6)]) {
      const r = tie(sc);
      expect(r.strips).toBeGreaterThan(100);
      expect(r.differ).toBeGreaterThan(50); // the matched and junction-end cases are exercised
      expect(r.bad).toBe(0);
      expect(r.dKey).toBeLessThan(1e-9);
      expect(r.dS).toBeLessThan(1e-9);
    }
  });
  it.skipIf(!existsSync(G41))("ties them on g41_ring_tw42 (when the census scene is present)", () => {
    const r = tie(g41());
    expect(r.bad).toBe(0);
    expect(r.dKey).toBeLessThan(1e-9);
    expect(r.dS).toBeLessThan(1e-9);
  });
  // K1314 s7's mirror (mirA, mirB: a side past its span reflected from the other) is rare: no strip of
  // ring, its waves or g41_ring_tw42 takes it, muse_hash 3 and g41_user_tw64 1 (k1247s26_mir.ts).
  // K1247 s27 (K1328): outline_mirror.json.gz is g41_user_tw64 with its numbers rounded to 4 decimals
  // (.claude/probes/K1247/k1247s27_fixture.ts), which keeps that strip (c32's), so every checkout runs it.
  it("ties them on the tracked mirrored fixture (K1328)", () => {
    const r = tie(loadScene(fileURLToPath(new URL("./fixtures/outline_mirror.json.gz", import.meta.url))));
    expect(r.mirrored).toBeGreaterThan(0);
    expect(r.bad).toBe(0);
    expect(r.dKey).toBeLessThan(1e-9);
    expect(r.dS).toBeLessThan(1e-9);
  });
  // The census scenes are untracked, so their case runs where a checkout has them.
  const MIR = ["muse_hash", "g41_user_tw64"].map((n) => fileURLToPath(new URL(`../../.claude/probes/K868/scenes/${n}.json`, import.meta.url)));
  it.skipIf(!MIR.every(existsSync))("ties them on the mirrored strips of muse_hash and g41_user_tw64", () => {
    for (const p of MIR) {
      const s = JSON.parse(readFileSync(p, "utf8")) as SceneIn; (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
      const r = tie(s);
      expect(r.mirrored).toBeGreaterThan(0);
      expect(r.bad).toBe(0);
      expect(r.dKey).toBeLessThan(1e-9);
      expect(r.dS).toBeLessThan(1e-9);
    }
  });
  // K1247 s27 (K1327): the shader's recSpan and recCs decide a span's ends and a sample's column as
  // chain_frame's spanOf and colR do (the GPU check, k1247s19_twin.ts, measures the result; this pins the text).
  it("keeps recSpan's tolerance and recCs's column rule in step with chain_frame", () => {
    expect(SPAN_EPS).toBe(2e-4);
    expect(REC_GLSL).toContain("const float REC_SPAN_EPS = 2e-4;");
    expect(REC_GLSL).toContain("if ((m - 0.5) * S > r) m -= 1.0; else if ((m + 0.5) * S <= r) m += 1.0;");
  });
});
