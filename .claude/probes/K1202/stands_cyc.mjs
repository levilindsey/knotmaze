// K1202 (batch 20 Run C): copied verbatim from .claude/probes/K1139/stands_cyc.mjs (stand links and moves unchanged); only the folder changed.
// K1139 S4: the stands table (plan 4.4) plus S4's two new stands. The
// first five are copied verbatim from bands.mjs / ab_s3b.mjs (x4 = pre4 +
// &pr=8); `cyc` and `loop` are S4's (find_cyc2.mjs, find_cyc.mjs):
//   cyc   k111 at reach 3, head node_221: its choice e210 (2.94 lattice)
//         ends at node_218, which the tree reaches first by a shorter way
//         (1.41), so e210 is lit from both ends, its ridge at dG 2.18.
//   loop  seed 1 at reach 8, head node_635: its only other arm is the
//         self-loop e102 (8.0 lattice), lit from both its ends.
//   preloop  one run before `loop` (head node_635's neighbour), so the
//         loop is lit beyond the head and banded at node_635.
export const Q = "k111&am=instant&fw=0&snd=none&phw=0";
export const STANDS = {
  fork: { q: Q, moves: [0] },
  cross: { q: Q, moves: [0, 246, 82, 83, 199] },
  src: { q: Q, moves: [0, 246, 82, 83, 199, 150] },
  four: { q: Q, moves: [0, 247, 248, 69, 72, 73, 95, 140, 180, 176] },
  x4: { q: Q, moves: [0, 247, 248, 69, 72, 73, 95, 140, 180], extra: "&pr=8" },
  cyc: { q: Q, moves: [0, 246, 82, 83, 199, 150, 151, 38, 155, 211] },
  loop: { q: "1&am=instant&fw=0&snd=none&phw=0", moves: [185, 186, 187, 122, 50, 118, 117, 165, 60, 9, 178, 57, 101], extra: "&pr=8" },
  preloop: { q: "1&am=instant&fw=0&snd=none&phw=0", moves: [185, 186, 187, 122, 50, 118, 117, 165, 60, 9, 178, 57], extra: "&pr=8" },
};
export const linkOf = (st) => st.q + (st.extra || "");
