import { readFileSync, writeFileSync } from "node:fs";
import { cropScale, decodePng, encodePng } from "../../../../test/render/field/png";
const sh = decodePng(readFileSync(".claude/probes/K1040/s1/out/q5/sheet.png"));
const z = cropScale(sh, 0, 300, 296, 100, 3);
writeFileSync(".claude/probes/K1040/s1/out/q5/row4_x3.png", encodePng(z.w, z.h, z.rgba));
