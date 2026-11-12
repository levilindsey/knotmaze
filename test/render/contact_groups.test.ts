// K1247 s26 (K1324): no pass of zChains (crossing or contact) ties two arms of one form B junction group.
// Form B joins a group's arms in one fill; a contact pass between two of them faded the ink band there
// (tieAlpha) and left specks at def j174 and ring j12. The arms and groups are form B's own
// (buildOutlineFull's debug), so a drift between them and draw.ts's groupArms port fails here.
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildOutlineFull, type SceneIn } from "../../src/render/outline/outline";
import { zChains } from "../../src/render/outline/draw";
import { loadScene } from "./outline_digest";

const ring = (): SceneIn => loadScene(fileURLToPath(new URL("./fixtures/outline_ring.json.gz", import.meta.url)));

/** Passes whose own s and partner s both lie on arms of one junction group, and all passes. */
function sameGroupPasses(sc: SceneIn): { same: number; contacts: number } {
  const { zc, passes, idx } = zChains(sc);
  const full = buildOutlineFull(sc);
  const dbg = full.debug as { arms: { ji: number; pi: number; sR: number; dir: number; L: number }[]; groups: number[] };
  const groupsAt = (i: number, s: number): number[] => {
    const c = zc[i]; const out: number[] = [];
    for (const a of dbg.arms) {
      if (a.pi !== i) continue;
      let d = (s - a.sR) * a.dir; if (c.closed && c.len > 0) d = ((d % c.len) + c.len) % c.len;
      if (d >= -1e-9 && d <= a.L + 1e-9) out.push(dbg.groups[a.ji]);
    }
    return out;
  };
  const nX = zc.map(() => 0);
  for (const x of sc.crossings) { const a = idx.get(x.a.chain); const b = idx.get(x.b.chain); if (a !== undefined) nX[a]++; if (b !== undefined) nX[b]++; }
  let same = 0; let contacts = 0;
  passes.forEach((P, i) => P.forEach((p, k) => {
    if (k >= nX[i]) contacts++;
    const gb = groupsAt(p.o, p.so);
    if (groupsAt(i, p.s).some((g) => gb.includes(g))) same++;
  }));
  return { same, contacts };
}

// Skipped while draw.ts's CONTACT_GROUPS is off (K1324): the skip added 20 stray_ink census finds.
describe.skip("K1247 s26 contact passes skip a junction group's own arms (K1324)", () => {
  it("leaves no pass between two arms of one group on the ring fixture, at rest and moved", () => {
    const sc = ring();
    const moved: SceneIn = { ...sc, name: `${sc.name}#moved`, chains: sc.chains.map((c) => {
      const p = c.pts.slice();
      for (let i = 0; i + 1 < p.length; i += 2) { const x = p[i]; const y = p[i + 1]; p[i] = x + 0.08 * Math.cos(0.7 * y + 0.6); p[i + 1] = y + 0.08 * Math.sin(0.9 * x + 0.78); }
      return { ...c, pts: p };
    }) } as SceneIn;
    for (const s of [sc, moved]) {
      const r = sameGroupPasses(s);
      expect(r.contacts).toBeGreaterThan(0); // contact passes still tie threads outside the groups (6 at rest)
      expect(r.same).toBe(0);
    }
  });
});
