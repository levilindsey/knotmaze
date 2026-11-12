// K1314 s9: form B's tie at each run root below 0.9 (runRootRamp's f, through its __k1314ramp hook), per scene.
//   node scripts/run_node.mjs .claude/probes/K1314/k1314_s9_rampf.ts muse_hash g41_user_tw64
const g = globalThis as unknown as { __k1314ramp?: string[] };
const { buildModel } = await import("./k1314_census");
for (const nm of process.argv.slice(2)) {
  g.__k1314ramp = [];
  buildModel(nm);
  const rows = [...new Set(g.__k1314ramp)].sort((a, b) => Number(a.split(" ")[1]) - Number(b.split(" ")[1]));
  console.log(`${nm}: ${rows.length} roots below 0.9`);
  for (const r of rows) console.log("  " + r);
}
