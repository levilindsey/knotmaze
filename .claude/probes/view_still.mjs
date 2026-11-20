// One resting view per load (K1529; K1482 s23's B2 recipe, shared).
// After the freeze the fit camera is still easing toward the bounds fit:
// fitCur += (fitTarget - fitCur) * FIT_EASE each frame and only snaps to the
// target once the remainder is under 0.01 px (src/app/camera.ts). A shot taken
// mid-ease sits at a sub-pixel offset that depends on how many frames the load
// happened to run, so two loads of one build on one physics hash differ on
// every antialiased edge (s21: 76,609 px, 1-3 levels). Once the ease snaps,
// the root's world transform is bit-identical on every load (same frozen
// bounds -> same fitPlacement -> same target bits).
//   import { waitViewStill } from "../view_still.mjs";
//   const view = await waitViewStill(page); // {x, y, s} at 17 digits, or null
// Polls the renderer's root world transform (device-px form, so a dpr change
// also counts as motion) until 10 polls in a row are exactly equal, 200 ms
// apart, frames running (probes.md K431: a three-decimal still is not
// pixel-still). Returns the settled transform, or null after ~60 s (the
// caller may shoot anyway, but should log it: the shot is not view-pinned).
export async function waitViewStill(page, { polls = 10, gapMs = 200, timeoutMs = 60000 } = {}) {
  const read = () => page.evaluate(() => {
    const R = window.__knotRenderer();
    const w = R.root.worldTransform;
    const dpr = window.devicePixelRatio;
    const v = [w.a, w.b, w.c, w.d, w.tx, w.ty].map((x) => x.toPrecision(17)).join(",");
    return { v, x: w.tx, y: w.ty, s: w.a, dpr, w: innerWidth, h: innerHeight };
  });
  const t0 = Date.now();
  let last = "", same = 0, cur = null;
  while (Date.now() - t0 < timeoutMs) {
    try { cur = await read(); } catch { await new Promise((r) => setTimeout(r, gapMs)); continue; }
    same = cur.v === last ? same + 1 : 0;
    last = cur.v;
    if (same >= polls - 1) return cur;
    await new Promise((r) => setTimeout(r, gapMs));
  }
  return null;
}
