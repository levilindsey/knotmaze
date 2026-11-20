// One physics state per load (K1475; 26V's K1519 fix in k1436_screen.mjs, shared).
// __knotStepUntil steps 1/60 s frames (two 1/120 SUBSTEPs), so from a live state whose
// substep count has the other parity than the target's it overshoots by one substep:
// two loads of one link freeze on two states (the drag/fade guards' seed 3 at SIMT 20:
// 49c20566 / f9d72040). Crediting the step accumulator one SUBSTEP before stepping makes
// the first stepped frame run three substeps, so every load lands on the target's exact
// substep. In-thread only (a worker mirror has no accumulator to credit). Call before
// the probe's own freeze + StepUntil evaluate; callers keep their hash-retry loops as
// nets that should never fire.
//   import { alignFreezeParity } from "../freeze_parity.mjs";
//   await alignFreezeParity(page, SIMT);
export async function alignFreezeParity(page, t) {
  await page.evaluate(async (tt) => {
    await window.__knotPhysFreeze(true);
    try {
      const ps = window.__knotPS();
      const want = Math.round(tt * 120);
      if ((await window.__knotPhysDump())?.kind === "in-thread" && Math.round(ps.simTime * 120) % 2 !== want % 2)
        ps.accumulator = (ps.accumulator ?? 0) + 1 / 120;
    } catch {}
  }, t);
}
