// Audio envelope ground truth: renders real KnotSynth plucks through an
// OfflineAudioContext (importing the production module via the Vite dev
// server) and prints the RMS envelope in 50ms bins, so "does the note
// decay or crescendo" is a measurement, not a listening impression.
// Usage: node scripts/diag_audio.mjs [devServerUrl]
import puppeteer from "puppeteer-core";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const base = process.argv[2] ?? "http://localhost:5173";
const profileDir = join(tmpdir(), "knotmaze-diag-audio");

const browser = await puppeteer.launch({
  executablePath:
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  userDataDir: profileDir,
  args: ["--no-first-run"],
});

try {
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: "load", timeout: 30000 });

  const cases = [
    { freq: 110, strength: 0.5 },
    { freq: 220, strength: 0.5 },
    { freq: 880, strength: 0.5 },
    { freq: 1760, strength: 1.0 },
  ];

  for (const c of cases) {
    const result = await page.evaluate(async ({ freq, strength }) => {
      const mod = await import("/src/audio/knot_synth.ts");
      const sr = 44100;
      const seconds = 1.5;
      const off = new OfflineAudioContext(1, sr * seconds, sr);
      const synth = new mod.KnotSynth(off);
      synth.pluck(freq, strength);
      const buf = await off.startRendering();
      const data = buf.getChannelData(0);
      const binMs = 50;
      const binSamples = Math.round((sr * binMs) / 1000);
      const bins = [];
      for (let i = 0; i + binSamples <= data.length; i += binSamples) {
        let sum = 0;
        for (let k = 0; k < binSamples; k++) sum += data[i + k] * data[i + k];
        bins.push(Math.sqrt(sum / binSamples));
      }
      let peak = 0;
      for (const v of data) peak = Math.max(peak, Math.abs(v));
      return { bins, peak };
    }, c);

    const peakBin = result.bins.indexOf(Math.max(...result.bins));
    console.log(
      `freq ${c.freq} s ${c.strength}: samplePeak ${result.peak.toFixed(3)} ` +
        `loudest bin at ${peakBin * 50}ms`
    );
    console.log(
      "  rms/50ms: " +
        result.bins.map((v) => (v * 1000).toFixed(0).padStart(4)).join(" ")
    );
  }
} finally {
  await browser.close();
  try {
    rmSync(profileDir, { recursive: true, force: true });
  } catch {
    // Best-effort cleanup.
  }
}
