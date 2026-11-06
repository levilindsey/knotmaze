// K1220 Run N measurement: disc radial profiles + outline corners.
// Reads out/meta.json + out/full/<stand>_<way>.png (device pixels, dsf 3).
// Ink = RGB distance to the knot-hidden (bg) shot > 30. Disc edge per ray =
// first radius where the pixel is within 12 RGB of bg (brief's rule).
// Step3(r) = RGB distance between pixels r and r+3 apart (catches ramps a
// few device px wide that a 1-px step misses, Run K review).
//   node measure.mjs <outDir>
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { decode } from "./crop.mjs";

const OUT = resolve(process.argv[2] || "out");
const meta = JSON.parse(readFileSync(join(OUT, "meta.json"), "utf8"));
const DSF = 3;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const px = (img, x, y) => { const i = ((y | 0) * img.W + (x | 0)) * 3; return [img.data[i], img.data[i + 1], img.data[i + 2]]; };
const median = (arr) => { const s = [...arr].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
const medCol = (cols) => [median(cols.map((c) => c[0])), median(cols.map((c) => c[1])), median(cols.map((c) => c[2]))].map((v) => Math.round(v));

const cache = {};
function load(stand, way) {
  const k = stand + "_" + way;
  if (!cache[k]) cache[k] = decode(readFileSync(join(OUT, "full", k + ".png")));
  return cache[k];
}

const rows = [];
for (const st of meta.stands) {
  const bg = load(st.id, "bg");
  const fhPxD = st.info.fh * st.info.view.s * DSF;
  for (const tg of st.targets) {
    const cx = tg.sx * DSF, cy = tg.sy * DSF;
    const row = { stand: st.id, ji: tg.ji, tag: tg.tag, nArms: tg.nArms, rb: tg.rb, fhPxD: +fhPxD.toFixed(1), ways: {} };
    for (const way of ["normal", "hidden", "nomask"]) {
      const img = load(st.id, way);
      const R = Math.floor(2.5 * fhPxD);
      const profs = [];
      for (let k = 0; k < 16; k++) {
        const th = (k * Math.PI) / 8, dx = Math.cos(th), dy = Math.sin(th);
        const cols = [];
        let edge = R;
        for (let r = 0; r <= R; r++) {
          const c = px(img, Math.round(cx + dx * r), Math.round(cy + dy * r));
          const b = px(bg, Math.round(cx + dx * r), Math.round(cy + dy * r));
          cols.push(c);
          if (r > 4 && dist(c, b) <= 12) { edge = r; break; }
        }
        // Interior step only: exclude the stroke's own edge ramp (last 6 px).
        let best3 = 0, best3r = 0, best1 = 0;
        const lim = Math.max(0, edge - 6);
        for (let r = 0; r + 3 < lim; r++) { const d = dist(cols[r], cols[r + 3]); if (d > best3) { best3 = d; best3r = r + 1; } }
        for (let r = 0; r + 1 < cols.length; r++) { const d = dist(cols[r], cols[r + 1]); if (d > best1) best1 = d; }
        const inside = medCol(cols.slice(0, Math.max(1, Math.floor(best3r / 2))));
        profs.push({ k, edge, best3: +best3.toFixed(1), best3r, best3Fh: +(best3r / fhPxD).toFixed(3), best1: +best1.toFixed(1), inside });
      }
      // Arm colours just past the step edge, along each arm angle.
      const stepRs = profs.map((p) => p.best3r);
      const armCols = (tg.rawArms && tg.rawArms.length ? tg.rawArms : tg.arms || []).map((a) => {
        const cs = [];
        for (let d = 1; d <= 3; d++) {
          const r = Math.round(median(stepRs)) + d + 2;
          cs.push(px(img, Math.round(cx + Math.cos(a.ang) * r), Math.round(cy + Math.sin(a.ang) * r)));
        }
        return medCol(cs);
      });
      row.ways[way] = {
        step3Med: +median(profs.map((p) => p.best3)).toFixed(1),
        step3Max: +Math.max(...profs.map((p) => p.best3)).toFixed(1),
        step1Max: +Math.max(...profs.map((p) => p.best1)).toFixed(1),
        rMedPx: +median(stepRs).toFixed(1),
        rMedFh: +(median(stepRs) / fhPxD).toFixed(3),
        rMinFh: +(Math.min(...stepRs) / fhPxD).toFixed(3),
        rMaxFh: +(Math.max(...stepRs) / fhPxD).toFixed(3),
        inside: medCol(profs.map((p) => p.inside)),
        armCols,
        profs,
      };
    }
    // Outline corners from radial ink edge R(theta), normal vs hidden.
    for (const way of ["normal", "hidden"]) {
      const img = load(st.id, way);
      const N = 720, pts = [];
      for (let k = 0; k < N; k++) {
        const th = (k / N) * Math.PI * 2, dx = Math.cos(th), dy = Math.sin(th);
        let edge = 0;
        for (let r = 0; r <= Math.floor(3 * fhPxD); r++) {
          const c = px(img, Math.round(cx + dx * r), Math.round(cy + dy * r));
          const b = px(bg, Math.round(cx + dx * r), Math.round(cy + dy * r));
          if (dist(c, b) > 30) edge = r; else if (r > 8 && edge > 0) break;
        }
        pts.push([cx + dx * edge, cy + dy * edge, edge]);
      }
      // Smooth the radial outline (5-pt circular mean) before turning angles.
      const sm = pts.map((_, k) => {
        let x = 0, y = 0;
        for (let d = -2; d <= 2; d++) { const p = pts[(k + d + N) % N]; x += p[0]; y += p[1]; }
        return [x / 5, y / 5, pts[k][2]];
      });
      const corners = [];
      for (let k = 0; k < N; k++) {
        const p0 = sm[(k - 4 + N) % N], p1 = sm[k], p2 = sm[(k + 4) % N];
        const v1 = [p1[0] - p0[0], p1[1] - p0[1]], v2 = [p2[0] - p1[0], p2[1] - p1[1]];
        const l1 = Math.hypot(...v1), l2 = Math.hypot(...v2);
        if (l1 < 1 || l2 < 1) continue;
        const cos = Math.max(-1, Math.min(1, (v1[0] * v2[0] + v1[1] * v2[1]) / (l1 * l2)));
        const turn = (Math.acos(cos) * 180) / Math.PI;
        if (turn > 45) corners.push({ k, deg: +((k / N) * 360).toFixed(0), turn: +turn.toFixed(0), rPx: p1[2], rFh: +(p1[2] / fhPxD).toFixed(2), l1: +l1.toFixed(1), l2: +l2.toFixed(1) });
      }
      // Merge corners within 12 steps, keep sharpest; cap at sharpest 10.
      const merged = [];
      for (const c of corners) {
        const last = merged[merged.length - 1];
        if (last && Math.abs(c.k - last.k) <= 12) { if (c.turn > last.turn) merged[merged.length - 1] = c; }
        else merged.push(c);
      }
      merged.sort((a, b) => b.turn - a.turn);
      merged.splice(10);
      merged.sort((a, b) => a.k - b.k);
      row["corners_" + way] = merged;
    }
    rows.push(row);
    const w = row.ways.normal;
    console.log(`${st.id} ji${tg.ji}(${tg.tag}) fhPx=${row.fhPxD} step3 med/max ${w.step3Med}/${w.step3Max} @${w.rMedPx}px (${w.rMedFh} fh) inside ${JSON.stringify(w.inside)} arms ${JSON.stringify(w.armCols)} cornersN=${row.corners_normal.length} cornersH=${row.corners_hidden.length}`);
  }
}
writeFileSync(join(OUT, "measure.json"), JSON.stringify({ rows }, null, 1));
console.log("wrote measure.json");
