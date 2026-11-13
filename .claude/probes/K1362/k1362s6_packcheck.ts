import { gfFs } from "../../../src/render/gpu_field/gf_glsl";
const a = gfFs(false, true, { p: 3, k: 2, ramps: true, pack: true });
const b = gfFs(false, true, { p: 3, k: 2, ramps: true });
const left = a.match(/\b(pd|pfx|pfy|pkey|pc|plo|phi|pg)\s*\[/g);
console.log("len", b.length, "->", a.length, "leftover", left ? left.length : 0, "pPF uses", (a.match(/pPF\[/g) || []).length, "pPI uses", (a.match(/pPI\[/g) || []).length);
console.log(a.split("\n").filter((l) => /pPF|pPI/.test(l)).slice(0, 3).join("\n").slice(0, 600));
