// K1040 S3c: the census DEFECTs of out/verdict_<tag>_<scene>.json by margin
// bucket and by kind (the table in the brief's Findings).
//   node defects_table.cjs <out dir> [tag ...]      (default tags: tent tentlr2)
// Columns: <=0.01 px and 0.03-1 px are the bucket margins (bucket "none": no
// margin clears it); higher-own* is the dropped merge scan, lower-gfill the
// fill foot windows, gpu-hole/extra outline differences, other the rest.
const fs = require("fs"), path = require("path");
const dir = process.argv[2];
const tags = process.argv.length > 3 ? process.argv.slice(3) : ["tent", "tentlr2"];
const scenes = ["muse_hash","muse_default_tw","def","fat","ring","user_tw42.lightpaper","g41_def_tw42","g41_def_tw64","g41_ring_tw42","g41_ring_tw64","g41_user_tw42","g41_user_tw64"];
for (const tag of tags) {
  console.log(`## ${tag}`);
  console.log("| scene | DEFECT | <=0.01 px | 0.03-1 px | none | higher-own* | lower-gfill | gpu-hole/extra | other | MERGE | fade |");
  console.log("|---|---|---|---|---|---|---|---|---|---|---|");
  const tot = {};
  const kinds = {}, byBucket = {};
  for (const s of scenes) {
    const f = path.join(dir, `verdict_${tag}_${s}.json`);
    if (!fs.existsSync(f)) { console.log(`| ${s} | (missing) |`); continue; }
    const c = JSON.parse(fs.readFileSync(f, "utf8")).counts;
    let small = 0, big = 0, none = 0, own = 0, gfill = 0, hole = 0, other = 0;
    for (const [k, v] of Object.entries(c)) {
      const d = k.match(/^DEFECT:(.+)$/);
      if (d) kinds[d[1]] = (kinds[d[1]] ?? 0) + v;
      const m = k.match(/^bucket:([^:]+):(.+)$/);
      if (!m) continue;
      const b = m[1], why = m[2];
      byBucket[`${why}@${b}`] = (byBucket[`${why}@${b}`] ?? 0) + v;
      if (b === "none") none += v; else if (Number(b) <= 0.01) small += v; else big += v;
      if (/^higher-own/.test(why)) own += v; else if (/gfill/.test(why)) gfill += v; else if (/^gpu-(hole|extra)/.test(why)) hole += v; else other += v;
    }
    const row = { D: c.DEFECT ?? 0, small, big, none, own, gfill, hole, other, M: c["boundary:MERGE"] ?? 0, F: c.fade ?? 0 };
    for (const [k, v] of Object.entries(row)) tot[k] = (tot[k] ?? 0) + v;
    console.log(`| ${s} | ${row.D} | ${small} | ${big} | ${none} | ${own} | ${gfill} | ${hole} | ${other} | ${row.M} | ${row.F} |`);
  }
  console.log(`| total | ${tot.D} | ${tot.small} | ${tot.big} | ${tot.none} | ${tot.own} | ${tot.gfill} | ${tot.hole} | ${tot.other} | ${tot.M} | ${tot.F} |`);
  console.log("kinds: " + Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join("; "));
  console.log("by kind@bucket: " + Object.entries(byBucket).sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => `${k} ${v}`).join("; "));
}
