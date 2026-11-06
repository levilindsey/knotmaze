import { JUNCTION_FRAG } from "../../../src/render/junction_field";
for (const id of ["c0", "cg", "gT", "gC"]) {
  const re = new RegExp("\\b" + id + "\\b", "g");
  console.log(id, (JUNCTION_FRAG.match(re) || []).length);
}
console.log("len", JUNCTION_FRAG.length);
console.log("vec3 c0 = c;", JUNCTION_FRAG.split("vec3 c0 = c;").length - 1);
console.log("vec3 cg = c;", JUNCTION_FRAG.split("vec3 cg = c;").length - 1);
