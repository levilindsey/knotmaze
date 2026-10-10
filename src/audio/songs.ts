// Scripted songs for music mode: a melody is a flat list of notes (name +
// beats; null = rest). Playback picks, for each note, a random maze
// segment whose assigned pitch matches the note, and physically plucks
// that thread.

export interface SongNote {
  note: string | null; // "D4" etc., or null for a rest.
  beats: number;
}

export interface Song {
  name: string;
  bpm: number;
  notes: SongNote[];
}

// Scarborough Fair (traditional English ballad, public domain) - the
// D-dorian waltz setting, transcribed FROM the musicaviva/abcnotation
// ABC source (anon., 3/4, K:Ddor):
//   D2D | AGA | E>FE | D3 | zAc | d2c | ABG | A2A |
//   d2D | F2G | AGF | (EC)D | D2A | G2F | EDC | D3
// Beats below are quarter notes of that 3/4.
export const SCARBOROUGH_FAIR: Song = {
  name: "Scarborough Fair",
  bpm: 132,
  notes: [
    { note: "D4", beats: 2 },
    { note: "D4", beats: 1 },
    { note: "A4", beats: 1 },
    { note: "G4", beats: 1 },
    { note: "A4", beats: 1 },
    { note: "E4", beats: 1.5 },
    { note: "F4", beats: 0.5 },
    { note: "E4", beats: 1 },
    { note: "D4", beats: 3 },
    { note: null, beats: 1 },
    { note: "A4", beats: 1 },
    { note: "C5", beats: 1 },
    { note: "D5", beats: 2 },
    { note: "C5", beats: 1 },
    { note: "A4", beats: 1 },
    { note: "B4", beats: 1 },
    { note: "G4", beats: 1 },
    { note: "A4", beats: 2 },
    { note: "A4", beats: 1 },
    { note: "D5", beats: 2 },
    { note: "D4", beats: 1 },
    { note: "F4", beats: 2 },
    { note: "G4", beats: 1 },
    { note: "A4", beats: 1 },
    { note: "G4", beats: 1 },
    { note: "F4", beats: 1 },
    { note: "E4", beats: 1 },
    { note: "C4", beats: 1 },
    { note: "D4", beats: 1 },
    { note: "D4", beats: 2 },
    { note: "A4", beats: 1 },
    { note: "G4", beats: 2 },
    { note: "F4", beats: 1 },
    { note: "E4", beats: 1 },
    { note: "D4", beats: 1 },
    { note: "C4", beats: 1 },
    { note: "D4", beats: 3 },
    { note: null, beats: 2 },
  ],
};

export const SONGS: Song[] = [SCARBOROUGH_FAIR];
