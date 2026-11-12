// K1324 s1 (K1247 s26): no contact pass of zChains ties two FULL members of one form B junction group.
// Form B joins a group's full members (cap ramp 1) in one fill; a contact pass between two of them faded
// the ink band there (tieAlpha) and left specks at def j174, ring j12, g41_ring_tw42 j12 and
// g41_user_tw64 j28. A partial member (inside the cap ramp) or an OWN sample keeps its passes: s26's
// skip (whole arms, no cap ramp, no behind cut) dropped real ties there and added 20 stray_ink census
// finds. Membership here is form B's own member(), so a drift of draw.ts's groupArms / groupMember port
// fails too; the control (contactOpts.groups off, master's ties) shows the check can fail.
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import type { SceneIn } from "../../src/render/outline/outline";
import { contactOpts, zChains } from "../../src/render/outline/draw";
import { FormB } from "../../src/render/field/form_b";
import { loadScene } from "./outline_digest";

const ring = (): SceneIn => loadScene(fileURLToPath(new URL("./fixtures/outline_ring.json.gz", import.meta.url)));
const TAU = 0.999;

/** Contact passes whose own s and partner s are both full members (ramp >= TAU) of one form B group. */
function fullSameGroup(sc: SceneIn): { same: number; contacts: number } {
  const { zc, passes, idx } = zChains(sc);
  const fb = new FormB(JSON.parse(JSON.stringify(sc)) as never, { dpr: 2 }) as unknown as {
    idxOf: Map<number, number>;
    member(pi: number, s: number): { g: number; ramp: number };
  };
  const ids = [...idx.entries()].sort((a, b) => a[1] - b[1]).map((e) => e[0]);
  const full = (i: number, s: number): number => {
    const pi = fb.idxOf.get(ids[i]);
    if (pi === undefined) return -1;
    const m = fb.member(pi, s);
    return m.g >= 0 && m.ramp >= TAU ? m.g : -1;
  };
  const nX = zc.map(() => 0);
  for (const x of sc.crossings) { const a = idx.get(x.a.chain); const b = idx.get(x.b.chain); if (a !== undefined) nX[a]++; if (b !== undefined) nX[b]++; }
  let same = 0; let contacts = 0;
  passes.forEach((P, i) => P.forEach((p, k) => {
    if (k < nX[i]) return;
    contacts++;
    const g = full(i, p.s);
    if (g >= 0 && full(p.o, p.so) === g) same++;
  }));
  return { same, contacts };
}

const moved = (sc: SceneIn): SceneIn => ({ ...sc, name: `${sc.name}#moved`, chains: sc.chains.map((c) => {
  const p = c.pts.slice();
  for (let i = 0; i + 1 < p.length; i += 2) { const x = p[i]; const y = p[i + 1]; p[i] = x + 0.08 * Math.cos(0.7 * y + 0.6); p[i + 1] = y + 0.08 * Math.sin(0.9 * x + 0.78); }
  return { ...c, pts: p };
}) }) as SceneIn;

describe("K1324 contact passes skip a junction group's full members", () => {
  const groups = contactOpts.groups;
  afterEach(() => { contactOpts.groups = groups; });

  it("ties no two full members of one group on the ring fixture, at rest and moved", () => {
    expect(contactOpts.groups).toBe(true);
    const sc = ring();
    for (const s of [sc, moved(sc)]) {
      const r = fullSameGroup(s);
      expect(r.contacts).toBeGreaterThan(0); // contact passes still tie partial members and OWN threads
      expect(r.same).toBe(0);
    }
  });

  it("control: with the skip off (master's ties) the ring's group specks' passes come back", () => {
    contactOpts.groups = false;
    const sc = ring();
    expect(fullSameGroup({ ...sc, name: `${sc.name}#off` } as SceneIn).same).toBeGreaterThan(0);
  });
});
