// K1474: frozen capture that waits until two consecutive screenshots are byte-identical
// (renderer samples caught up with the frozen physics state), then saves that frame.
//   node bordercap.mjs <base> <profileDir> <out.png> <query>
import { writeFileSync } from "node:fs";
import { launch, load, sleep } from "../K1460/cap.mjs";
const [, , base, profileDir, outPng, Q] = process.argv;
const url = `${base}/?${Q}&xp=off&am=instant&prp=off&phw=0&fw=0&bg=none&snd=none&fl=0.5&rp=gf`;
const browser = await launch(profileDir);
try {
  const r = await load(browser, url, { tag: "bordercap", gf: true, simT: 20, dsf: 2 });
  console.log(`hash ${r.hash} ok=${r.ok}`);
  let prev = null, stable = 0;
  for (let i = 0; i < 40; i++) {
    const shot = await r.page.screenshot({ type: "png" });
    if (prev && Buffer.compare(prev, shot) === 0) { stable++; if (stable >= 1) { writeFileSync(outPng, shot); console.log(`stable at try ${i}`); break; } }
    else stable = 0;
    prev = shot;
    if (i === 39) { writeFileSync(outPng, shot); console.log("NOT STABLE after 40 tries; saved last"); }
    await sleep(1500);
  }
  await r.page.close();
} finally { await browser.close(); }
