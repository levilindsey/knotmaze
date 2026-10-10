// Scripted songs for music mode: a melody is a flat list of notes (name +
// beats; null = rest). Playback picks, for each note, a random maze
// segment whose assigned pitch is nearest the note, and physically plucks
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

// Scarborough Fair (traditional English ballad, public domain) - Dorian
// mode, which suits a celtic knot rather perfectly. Light arrangement of
// the familiar verse melody in D dorian, 3/4.
export const SCARBOROUGH_FAIR: Song = {
  name: "Scarborough Fair",
  bpm: 112,
  notes: [
    // Are you going to Scarborough Fair?
    { note: "D4", beats: 2 },
    { note: "D4", beats: 1 },
    { note: "A4", beats: 2 },
    { note: "A4", beats: 1 },
    { note: "E4", beats: 1 },
    { note: "F4", beats: 1.5 },
    { note: "E4", beats: 0.5 },
    { note: "D4", beats: 3 },
    { note: null, beats: 1 },
    // Parsley, sage, rosemary and thyme
    { note: "A4", beats: 2 },
    { note: "C5", beats: 1 },
    { note: "D5", beats: 3 },
    { note: "C5", beats: 2 },
    { note: "A4", beats: 1 },
    { note: "B4", beats: 1.5 },
    { note: "G4", beats: 0.5 },
    { note: "A4", beats: 3 },
    { note: null, beats: 1 },
    // Remember me to one who lives there
    { note: "D5", beats: 2 },
    { note: "D5", beats: 1 },
    { note: "D5", beats: 2 },
    { note: "C5", beats: 1 },
    { note: "A4", beats: 2 },
    { note: "B4", beats: 1 },
    { note: "C5", beats: 1 },
    { note: "A4", beats: 1 },
    { note: "G4", beats: 1 },
    // For once (s)he was a true love of mine
    { note: "E4", beats: 2 },
    { note: "F4", beats: 1 },
    { note: "E4", beats: 1.5 },
    { note: "C4", beats: 0.5 },
    { note: "D4", beats: 4 },
    { note: null, beats: 3 },
  ],
};

export const SONGS: Song[] = [SCARBOROUGH_FAIR];
