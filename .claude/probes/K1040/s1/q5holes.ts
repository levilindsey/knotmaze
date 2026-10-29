// K1040 S1, question 5's census: paper holes INSIDE junction groups. A hole is
// an 8-connected component of paper pixels (top < 0) whose every 8-neighbour
// outside it is topped by ONE junction group (top < OWN), so it is neither a
// gap between threads nor the outside. muse_hash also runs at dpr 2 against the
// prototype's frame: of the prototype's deep-ink blobs (q5.ts's protoOnly), how
// many lie within 30 px of a hole.
// Run: npx vite-node .claude/probes/K1040/s1/q5holes.ts [scene...]
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB, OWN, TERM_NAMES } from "../../../../src/render/field/form_b";
import { decodePng } from "../../../../test/render/field/png";

const here = dirname(fileURLToPath(import.meta.url));
const sceneDir = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const ALL = ["muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];

function census(name: string, dpr: number, proto: boolean) {
  const s = JSON.parse(readFileSync(join(sceneDir, `${name}.json`), "utf8")) as FieldScene;
  s.look.ctrlArc ??= 0.47;
  const fb = new FormB(s, { dpr });
  const [a, b, c, d, e, f] = s.camera.worldToCss;
  const det = a * d - b * c;
  const [vw, vh] = s.camera.viewport;
  const nx = Math.round(vw * dpr);
  const ny = Math.round(vh * dpr);
  const world = (x: number, y: number): [number, number] => {
    const u = x / dpr - e;
    const v = y / dpr - f;
    return [(d * u - c * v) / det, (-b * u + a * v) / det];
  };
  const n = nx * ny;
  const top = new Int32Array(n);
  const deep = new Uint8Array(n);
  const termAt = new Uint8Array(n);
  const fadeAt = new Uint8Array(n);
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const [x, y] = world(i + 0.5, j + 0.5);
      const r = fb.evalPoint(x, y);
      const o = j * nx + i;
      top[o] = r.top;
      deep[o] = r.top >= 0 && (r.Dexp - fb.W) * fb.ppuDev > 1 ? 1 : 0;
      termAt[o] = r.term ? r.term.kind : 0;
      fadeAt[o] = r.fade;
    }
  const seen = new Uint8Array(n);
  const holes: { at: [number, number]; i: number; j: number; px: number; group: number; ringTerms: Record<string, number>; fade: number }[] = [];
  for (let o0 = 0; o0 < n; o0++) {
    if (top[o0] >= 0 || seen[o0]) continue;
    const st = [o0];
    seen[o0] = 1;
    let px = 0;
    let si = 0;
    let sj = 0;
    let border = false;
    let fadeOr = 0;
    const groups = new Set<number>();
    const ringTerms: Record<string, number> = {};
    while (st.length) {
      const o = st.pop() as number;
      px++;
      const i = o % nx;
      const j = (o - i) / nx;
      si += i;
      sj += j;
      fadeOr |= fadeAt[o];
      if (i === 0 || j === 0 || i === nx - 1 || j === ny - 1) border = true;
      for (let dj = -1; dj <= 1; dj++)
        for (let di = -1; di <= 1; di++) {
          const ii = i + di;
          const jj = j + dj;
          if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue;
          const q = jj * nx + ii;
          if (top[q] < 0) {
            if (!seen[q]) {
              seen[q] = 1;
              st.push(q);
            }
          } else {
            groups.add(top[q] >= OWN ? -1 : top[q]);
            const tk = TERM_NAMES[termAt[q]];
            ringTerms[tk] = (ringTerms[tk] ?? 0) + 1;
          }
        }
    }
    if (border || groups.size !== 1 || groups.has(-1)) continue;
    const ci = si / px;
    const cj = sj / px;
    const [x, y] = world(ci, cj);
    holes.push({ at: [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000], i: Math.round(ci), j: Math.round(cj), px, group: [...groups][0], ringTerms, fade: fadeOr });
  }
  const areas = holes.map((h) => h.px).sort((x, y) => x - y);
  const line = `${name} dpr ${dpr}: ${holes.length} holes inside one group, in ${new Set(holes.map((h) => h.group)).size} groups; area px min ${areas[0] ?? "-"} median ${areas[Math.floor(areas.length / 2)] ?? "-"} max ${areas[areas.length - 1] ?? "-"}; fade bits on ${holes.filter((h) => h.fade).length}`;
  let protoLine = "";
  if (proto) {
    const img = decodePng(readFileSync(join(here, "..", "out", "muse_hash_dpr2.png")));
    const val = (i: number, j: number) => {
      const o = (j * img.w + i) * 4;
      return Math.max(img.rgba[o], img.rgba[o + 1], img.rgba[o + 2]);
    };
    const darkLim = 0.5 * 235;
    const cls = new Uint8Array(n);
    for (let o = 0; o < n; o++) {
      const i = o % nx;
      const j = (o - i) / nx;
      if (deep[o] && i < img.w && j < img.h && val(i, j) < darkLim) cls[o] = 1;
    }
    const seen2 = new Uint8Array(n);
    let blobs = 0;
    let blobPx = 0;
    let nearBlobs = 0;
    let nearPx = 0;
    let compact = 0;
    let compactNear = 0;
    for (let o0 = 0; o0 < n; o0++) {
      if (!cls[o0] || seen2[o0]) continue;
      const st = [o0];
      seen2[o0] = 1;
      let px = 0;
      let si = 0;
      let sj = 0;
      let i0 = 1e9;
      let i1 = -1;
      let j0 = 1e9;
      let j1 = -1;
      while (st.length) {
        const o = st.pop() as number;
        px++;
        const i = o % nx;
        const j = (o - i) / nx;
        si += i;
        sj += j;
        i0 = Math.min(i0, i);
        i1 = Math.max(i1, i);
        j0 = Math.min(j0, j);
        j1 = Math.max(j1, j);
        for (let dj = -1; dj <= 1; dj++)
          for (let di = -1; di <= 1; di++) {
            const ii = i + di;
            const jj = j + dj;
            if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue;
            const q = jj * nx + ii;
            if (cls[q] && !seen2[q]) {
              seen2[q] = 1;
              st.push(q);
            }
          }
      }
      if (px < 4) continue;
      blobs++;
      blobPx += px;
      const ci = si / px;
      const cj = sj / px;
      const near = holes.some((h) => Math.hypot(h.i - ci, h.j - cj) < 30);
      // Compact: fills at least a quarter of its bounding box (a lobe, not a strip along an outline).
      const isCompact = px >= 0.25 * (i1 - i0 + 1) * (j1 - j0 + 1);
      if (isCompact) compact++;
      if (near) {
        nearBlobs++;
        nearPx += px;
        if (isCompact) compactNear++;
      }
    }
    protoLine = `  prototype deep-ink blobs >= 4 px: ${blobs} (${blobPx} px); within 30 px of a hole: ${nearBlobs} (${nearPx} px); compact (>= 1/4 of their box) ${compact}, of which near a hole ${compactNear}`;
  }
  return { line, protoLine, holes };
}

const names = process.argv.slice(2).length ? process.argv.slice(2) : ALL;
const out: string[] = [];
const rows: Record<string, unknown> = {};
for (const nm of names) {
  const r = census(nm, 1, false);
  console.log(r.line);
  out.push(r.line);
  rows[nm] = r.holes.slice(0, 40);
}
if (names.includes("muse_hash")) {
  const r = census("muse_hash", 2, true);
  console.log(r.line);
  console.log(r.protoLine);
  out.push(r.line, r.protoLine);
  rows.muse_hash_dpr2 = r.holes.slice(0, 40);
}
writeFileSync(join(here, "out", "q5", "holes.txt"), `${out.join("\n")}\n`);
writeFileSync(join(here, "out", "q5", "holes.json"), JSON.stringify(rows, null, 1));
