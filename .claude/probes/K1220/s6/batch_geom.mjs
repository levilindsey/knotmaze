// K1220 S6: geom.mjs at the 10 i forks on both hosts (run under locked.ps1).
import { execFileSync } from "node:child_process";
const FORKS = [
  ["i", "xh3", 0], ["i", "xh2", 0],
  ["ai", "xh3", 2], ["ai", "xh2", 2],
  ["ia", "xh3", 0], ["ia", "xh2", 0],
  ["ii", "xh3", 0], ["ii", "xh3", 1], ["ii", "xh2", 0], ["ii", "xh2", 1],
];
const HOSTS = [
  ["base", "http://127.0.0.1:5960", "out/geom_base"],  ["s4", "http://127.0.0.1:5962", "out/geom_s4"],
  ["mine", "http://127.0.0.1:5961", "out/geom_mine_all"],
];
for (const [label, host, out] of HOSTS) {
  for (const [w, xh, ji] of FORKS) {
    console.log(`== ${label} ${w} ${xh} ji${ji}`);
    execFileSync("node", ["geom.mjs", host, w, xh, String(ji), out], { stdio: "inherit" });
  }
}
console.log("batch geom done");
