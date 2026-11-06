// K1218 S7 (a live_s5.mjs module): dumps one stand's junction records for
// offline sweptArc work (tie_s7.mjs): the whole recordData() texel array,
// fh, the profile's length and step, the page's affine, and per junction
// its record base, centre and arms - the same state the shots are taken in.
//   node ../s5/live_s5.mjs <stand> <outDir> dump_s7.mjs
// Writes <outDir>/<stand>_records.json.
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

export async function run({ page, aff, OUT, args }) {
  const D = await page.evaluate(async () => {
    const urls = performance.getEntriesByType("resource").map((e) => e.name).filter((u) => /\/src\/render\/junction_field\.ts(\?|$)/.test(u));
    const jf = await import(urls.length ? urls[urls.length - 1] : "/src/render/junction_field.ts");
    const r = window.__knotRenderer();
    const fp = r.fieldProbe;
    const J = jf.recordData().data;
    const recs = [];
    const nJ = r.junctionArms ? r.junctionArms.length : 0;
    for (let ji = 0; ji < nJ; ji++) {
      const c = fp && fp.center(ji);
      const rb = fp ? fp.record(ji) : -1;
      if (!c || rb < 0) continue;
      recs.push({ ji, rb, c, arms: fp.arms(ji).map((a) => ({ ang: a.ang, chain: a.chain, dir: a.dir, domain: a.domain })) });
    }
    return {
      J: Array.from(J), fh: r.style.threadWidth / 2, profN: r.fieldProfLen, DR: jf.FIELD_PROF_DR,
      FLO: jf.FIELD_FOLD_LO, FHI: jf.FIELD_FOLD_HI, BMIN: jf.FIELD_BLEND_MIN, recs,
    };
  });
  const stand = process.argv[2];
  writeFileSync(resolve(OUT, `${stand}_records.json`), JSON.stringify({ ...D, aff, dsf: 1.5 }));
  console.log(`${stand}: ${D.recs.length} records, ${D.J.length} floats, profN ${D.profN}, fh ${D.fh}`);
}
