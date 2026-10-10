// Pitch spaces: every maze segment (a walk-graph run in fabric mode, a
// whole strand in knot mode) owns one stable pitch, assigned by LENGTH
// BUCKETS over a chosen scale - longer thread rings lower, like a real
// string. Deterministic from (space, octaves, root, lengths), per
// URL-as-complete-state.

export type PitchSpace =
  | "chromatic"
  | "pentMajor"
  | "pentMinor"
  | "hirajoshi"
  | "insen"
  | "dorian"
  | "lydian"
  | "wholeTone"
  | "harmMinor";

export const PITCH_SPACES: PitchSpace[] = [
  "chromatic",
  "pentMajor",
  "pentMinor",
  "hirajoshi",
  "insen",
  "dorian",
  "lydian",
  "wholeTone",
  "harmMinor",
];

// Scale degrees in semitones from the root.
const DEGREES: Record<PitchSpace, number[]> = {
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  pentMajor: [0, 2, 4, 7, 9],
  pentMinor: [0, 3, 5, 7, 10],
  hirajoshi: [0, 2, 3, 7, 8],
  insen: [0, 1, 5, 7, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  wholeTone: [0, 2, 4, 6, 8, 10],
  harmMinor: [0, 2, 3, 5, 7, 8, 11],
};

// MIDI note -> Hz. A4 = 69 = 440Hz.
export function midiToFreq(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

const LETTER_SEMITONE: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

// "D4", "C#5", "Eb3" -> Hz. Returns NaN on parse failure.
export function noteToFreq(note: string): number {
  const m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(note.trim());
  if (!m) return NaN;
  let s = LETTER_SEMITONE[m[1].toUpperCase()];
  if (m[2] === "#") s += 1;
  else if (m[2] === "b") s -= 1;
  const octave = Number(m[3]);
  return midiToFreq((octave + 1) * 12 + s);
}

// All pitches of a space, ascending. Root is a semitone offset [0, 12)
// anchored at A2 (MIDI 45): bass strings around 110-220Hz, trebles up to
// ~1.4kHz at four octaves - the synth's sweet range.
export function spacePitches(
  space: PitchSpace,
  octaves: number,
  root: number
): number[] {
  const degs = DEGREES[space];
  const n = Math.max(1, Math.min(4, Math.round(octaves)));
  const base = 45 + (((root % 12) + 12) % 12);
  const out: number[] = [];
  for (let o = 0; o < n; o++) {
    for (const d of degs) out.push(midiToFreq(base + o * 12 + d));
  }
  return out;
}

export interface PitchAssignment {
  // Per-segment frequency (Hz), indexed like the input lengths.
  segFreq: number[];
  // Pitch classes actually in use: ascending freq, each with the segments
  // assigned to it (for song playback's pick-a-matching-segment).
  byFreq: Array<{ freq: number; segs: number[] }>;
}

// TONAL WEIGHTS per scale degree (semitones from the root) at emphasis
// s in [0, 1]: the tonic's bucket grows to 1+2s, the dominant's to 1+s,
// the mediant's to 1+0.5s, so random/manual plucking gravitates tonal.
// The mediant is the scale's ONLY third (minor 3 or major 4); scales
// with both (chromatic) or neither (insen) get no mediant weight.
export function degreeWeights(space: PitchSpace, s: number): number[] {
  const degs = DEGREES[space];
  const has3 = degs.includes(3);
  const has4 = degs.includes(4);
  const mediant = has3 !== has4 ? (has3 ? 3 : 4) : -1;
  return degs.map((d) =>
    d === 0 ? 1 + 2 * s : d === 7 ? 1 + s : d === mediant ? 1 + 0.5 * s : 1
  );
}

// Quantile bucket assignment: segments ranked by length DESC map onto the
// space's pitches ASC (longest = lowest). Every pitch gets a bucket when
// there are at least as many segments as pitches; otherwise the extremes
// are preserved and the middle thins. `tonicEmphasis` widens the tonic /
// dominant / mediant buckets (degreeWeights); 0 = uniform buckets.
export function assignPitches(
  space: PitchSpace,
  octaves: number,
  root: number,
  lengths: number[],
  tonicEmphasis = 0
): PitchAssignment {
  const pitches = spacePitches(space, octaves, root);
  if (tonicEmphasis <= 0) return assignPitchesFromList(pitches, lengths);
  const perOct = degreeWeights(space, Math.min(1, tonicEmphasis));
  const weights = pitches.map((_, i) => perOct[i % perOct.length]);
  return assignPitchesFromList(pitches, lengths, weights);
}

// Same bucketing over an EXPLICIT ascending pitch list - music mode uses
// the song's own distinct pitches, so every segment belongs to a note the
// piece actually plays. Optional per-pitch `weights` size the buckets
// proportionally (omitted = uniform, the original quantile split).
export function assignPitchesFromList(
  pitches: number[],
  lengths: number[],
  weights?: number[]
): PitchAssignment {
  const n = lengths.length;
  const segFreq = new Array<number>(n).fill(pitches[0] ?? 220);
  if (n === 0 || pitches.length === 0) return { segFreq, byFreq: [] };
  const order = lengths
    .map((len, i) => ({ len, i }))
    .sort((a, b) => b.len - a.len || a.i - b.i);
  // Cumulative bucket edges for the weighted split.
  let cum: number[] | null = null;
  if (weights && weights.length === pitches.length) {
    const total = weights.reduce((a, w) => a + Math.max(0, w), 0);
    if (total > 0) {
      cum = [];
      let acc = 0;
      for (const w of weights) {
        acc += Math.max(0, w) / total;
        cum.push(acc);
      }
    }
  }
  const byFreqMap = new Map<number, number[]>();
  for (let rank = 0; rank < n; rank++) {
    let k: number;
    if (cum) {
      const q = rank / n;
      k = 0;
      while (k < pitches.length - 1 && q >= cum[k]) k++;
    } else {
      k = Math.min(
        pitches.length - 1,
        Math.floor((rank / n) * pitches.length)
      );
    }
    const f = pitches[k];
    segFreq[order[rank].i] = f;
    const list = byFreqMap.get(f);
    if (list) list.push(order[rank].i);
    else byFreqMap.set(f, [order[rank].i]);
  }
  const byFreq = [...byFreqMap.entries()]
    .map(([freq, segs]) => ({ freq, segs }))
    .sort((a, b) => a.freq - b.freq);
  return { segFreq, byFreq };
}

// Segments whose assigned pitch is nearest the requested frequency (for
// song playback). Always returns the nearest pitch class's segments, so
// any melody degrades gracefully onto any space.
export function segmentsNear(
  assign: PitchAssignment,
  freq: number
): number[] {
  let best: { freq: number; segs: number[] } | null = null;
  let bestD = Infinity;
  for (const row of assign.byFreq) {
    const d = Math.abs(Math.log2(row.freq / freq));
    if (d < bestD) {
      bestD = d;
      best = row;
    }
  }
  return best ? best.segs : [];
}
