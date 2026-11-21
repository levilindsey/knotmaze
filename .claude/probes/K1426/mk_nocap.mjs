// 27Z2 throwaway builder: strip the vertex-cap line from every gfFs form.
// Usage: node .claude/probes/K1426/mk_nocap.mjs apply|revert
// apply inserts stripCap27Z2 into gf_glsl.ts (working tree only, never landed);
// revert removes exactly those lines again.
import { readFileSync, writeFileSync } from "node:fs";
const P = "src/render/gpu_field/gf_glsl.ts";
const mode = process.argv[2];
let s = readFileSync(P, "utf8");
const CALL = "  src = stripCap27Z2(src); // 27Z2 throwaway: cap line removed from every form (never landed)\r\n";
const RET = "  if (probe) return stripCap27Z2(src);";
const FN =
  "function stripCap27Z2(src: string): string {\r\n" +
  '  const fj = "  for (int e = 0; e < ns; e++) if (sv[e] < 1.0 && sa[e] > -aa) { vec3 VX = vtx(sid[e], p); float vxv = VX.x * ss(-aa, aa, sa[e]); if (vxv > sv[e]) sv[e] = vxv; } // K1407 c3 fj\\n";\r\n' +
  '  return src.split(VTX_LINE).join("").split(fj).join("");\r\n' +
  "}\r\n";
if (mode === "apply") {
  if (s.includes("stripCap27Z2")) throw new Error("already applied");
  const probeRet = "  if (probe) return src;";
  if (s.split(probeRet).length !== 2) throw new Error("probe return not found once");
  s = s.replace(probeRet, CALL + RET);
  const anchor = "const VTX_LINE =";
  if (!s.includes(anchor)) throw new Error("VTX_LINE anchor missing");
  s = s.replace(anchor, FN + anchor);
  writeFileSync(P, s);
  console.log("nocap applied");
} else if (mode === "revert") {
  if (!s.includes("stripCap27Z2")) throw new Error("not applied");
  s = s.split(FN).join("").split(CALL).join("");
  if (s.split(RET).length !== 2) throw new Error("throwaway return not found once");
  s = s.replace(RET, "  if (probe) return src;");
  if (s.includes("stripCap27Z2")) throw new Error("still applied");
  writeFileSync(P, s);
  console.log("nocap reverted");
} else {
  throw new Error("usage: apply|revert");
}
