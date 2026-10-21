import { describe, expect, it } from "vitest";
import {
  assignPitches,
  degreeWeights,
  midiToFreq,
  noteToFreq,
  segmentsNear,
  spacePitches,
} from "../../src/audio/pitch_space";

describe("pitch spaces", () => {
  it("builds ascending pitches anchored at A2", () => {
    const p = spacePitches("chromatic", 2, 0);
    expect(p.length).toBe(24);
    expect(p[0]).toBeCloseTo(110, 3); // A2.
    for (let i = 1; i < p.length; i++) expect(p[i]).toBeGreaterThan(p[i - 1]);
    expect(spacePitches("pentMajor", 1, 0).length).toBe(5);
    // Root shifts everything by semitones.
    expect(spacePitches("chromatic", 1, 3)[0]).toBeCloseTo(
      midiToFreq(48),
      6
    );
  });

  it("parses note names", () => {
    expect(noteToFreq("A4")).toBeCloseTo(440, 6);
    expect(noteToFreq("D4")).toBeCloseTo(293.665, 2);
    expect(noteToFreq("C#5")).toBeCloseTo(554.365, 2);
    expect(noteToFreq("Eb3")).toBeCloseTo(155.563, 2);
    expect(Number.isNaN(noteToFreq("H2"))).toBe(true);
  });

  it("assigns longest segment the lowest pitch, by quantile", () => {
    const pitches = spacePitches("pentMajor", 1, 0);
    const a = assignPitches("pentMajor", 1, 0, [10, 20, 30, 40, 50]);
    expect(a.segFreq[4]).toBeCloseTo(pitches[0], 6); // len 50 -> lowest.
    expect(a.segFreq[0]).toBeCloseTo(pitches[4], 6); // len 10 -> highest.
    // Every pitch is used when segments >= pitches.
    const used = new Set(a.segFreq.map((f) => f.toFixed(4)));
    expect(used.size).toBe(5);
  });

  it("fills every bucket evenly at scale", () => {
    const lengths = Array.from({ length: 100 }, (_, i) => i + 1);
    const a = assignPitches("pentMinor", 2, 0, lengths);
    expect(a.byFreq.length).toBe(10);
    for (const row of a.byFreq) expect(row.segs.length).toBe(10);
    // byFreq ascending.
    for (let i = 1; i < a.byFreq.length; i++) {
      expect(a.byFreq[i].freq).toBeGreaterThan(a.byFreq[i - 1].freq);
    }
  });

  it("finds nearest segments for a requested pitch", () => {
    const a = assignPitches("chromatic", 2, 5, [5, 10, 15, 20, 25, 30]);
    const f = a.byFreq[2].freq;
    expect(segmentsNear(a, f)).toEqual(a.byFreq[2].segs);
    // Slightly sharp of a pitch still lands on it.
    expect(segmentsNear(a, f * 1.02)).toEqual(a.byFreq[2].segs);
    expect(segmentsNear(a, 1)).toEqual(a.byFreq[0].segs);
    expect(segmentsNear(a, 1e5)).toEqual(
      a.byFreq[a.byFreq.length - 1].segs
    );
  });

  it("with a filter, answers with the valid segments of the nearest pitch that has any (K244)", () => {
    const a = assignPitches("chromatic", 2, 5, Array.from({ length: 48 }, (_, i) => 50 - i));
    const rows = a.byFreq;
    const f = rows[10].freq;
    const all = () => true;
    // Everything valid: the unfiltered answer, exactly.
    expect(segmentsNear(a, f, all)).toEqual(segmentsNear(a, f));
    // Part of the class valid: just those segments, same class.
    const half = new Set(rows[10].segs.filter((_, i) => i % 2 === 0));
    expect(half.size).toBeGreaterThan(0);
    expect(segmentsNear(a, f, (s) => half.has(s))).toEqual([...half]);
    // The class has none: the nearest class that does (here one step up when
    // the note sits a hair sharp of its own pitch, one down when flat).
    const none10 = new Set(rows[10].segs);
    const notIn10 = (s: number) => !none10.has(s);
    expect(segmentsNear(a, f * 1.01, notIn10)).toEqual(rows[11].segs);
    expect(segmentsNear(a, f * 0.99, notIn10)).toEqual(rows[9].segs);
    // Nothing valid anywhere: empty, never a segment the filter refused.
    expect(segmentsNear(a, f, () => false)).toEqual([]);
    // Only one segment on the whole map is valid: it, however far.
    const lone = rows[0].segs[0];
    expect(segmentsNear(a, rows[rows.length - 1].freq, (s) => s === lone)).toEqual([lone]);
    // A request that is not a pitch has no nearest class, filtered or not.
    expect(segmentsNear(a, NaN, all)).toEqual([]);
    expect(segmentsNear(a, NaN)).toEqual([]);
  });

  it("asks the filter nearest class first and stops at the first class that has a valid segment (K244)", () => {
    const a = assignPitches("chromatic", 2, 5, Array.from({ length: 48 }, (_, i) => 50 - i));
    const asked: number[] = [];
    segmentsNear(a, a.byFreq[10].freq, (s) => {
      asked.push(s);
      return true;
    });
    // Only the nearest class's segments were tested.
    expect(new Set(asked)).toEqual(new Set(a.byFreq[10].segs));
  });
});

describe("tonal weighting", () => {
  const lengths = Array.from({ length: 850 }, (_, i) => 1000 - i);

  it("is the uniform quantile split at emphasis 0", () => {
    const a = assignPitches("pentMinor", 2, 0, lengths, 0);
    const b = assignPitches("pentMinor", 2, 0, lengths);
    expect(a.segFreq).toEqual(b.segFreq);
  });

  it("sizes buckets by scale-degree weight at full emphasis", () => {
    // pentMinor [0,3,5,7,10]: tonic 3, mediant (minor 3rd) 1.5, 4th 1,
    // dominant 2, minor 7th 1 -> total 8.5.
    expect(degreeWeights("pentMinor", 1)).toEqual([3, 1.5, 1, 2, 1]);
    const a = assignPitches("pentMinor", 1, 0, lengths, 1);
    const count = new Map<number, number>();
    for (const f of a.segFreq) count.set(f, (count.get(f) ?? 0) + 1);
    const rows = a.byFreq.map((r) => count.get(r.freq)!);
    expect(rows).toEqual([300, 150, 100, 200, 100]);
  });

  it("keeps longer segments at lower-or-equal pitches", () => {
    const a = assignPitches("dorian", 3, 2, lengths, 0.7);
    for (let i = 1; i < lengths.length; i++) {
      expect(a.segFreq[i]).toBeGreaterThanOrEqual(a.segFreq[i - 1]);
    }
  });

  it("weights only an unambiguous third as the mediant", () => {
    // Chromatic has both thirds, insen neither: tonic + dominant only.
    const c = degreeWeights("chromatic", 1);
    expect(c.filter((w) => w !== 1).length).toBe(2);
    const ins = degreeWeights("insen", 1);
    expect(ins.filter((w) => w !== 1).length).toBe(2);
    expect(degreeWeights("pentMajor", 1)[2]).toBe(1.5); // Major 3rd.
  });
});
