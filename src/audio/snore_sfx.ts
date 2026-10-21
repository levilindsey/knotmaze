// K325: the snoring cat's snore. A 0.9 s one-shot sound
// (public/snoring-cat-snore.mp3: 64 kbps mono MP3, 7.8 KB, encoded from
// hopnbop's single_cat_snore.wav) that the panel's "Made by Snoring Cat" link
// plays on hover and on touch-down (ui/snore_link.ts drives the link). This
// module owns the sound: the lazy load, the decode once an audio context
// exists, the level, the "never stacked" rule and the clock the link's
// traversal delay reads. It knows nothing of the DOM or of KnotSynth beyond
// the SampleHost slice, so the tests drive it with fakes. Lore:
// .claude/rules/gameplay-audio.md (K325, K720).

// What play() did. "started": the snore began now. "sounding": one is already
// playing, so this call added nothing (never stacked). "unavailable": nothing
// could sound - silenced in the settings, not loaded or decoded yet, or the
// audio gate is closed or no context runs.
export type PlayResult = "started" | "sounding" | "unavailable";

// The snore's level before the master volume. Measured offline at volume 1
// (.claude/probes/K325/level.mjs): a tap pluck (strength 0.55, 165-660 Hz)
// peaks at 0.34 and its loudest 300 ms is 0.068 RMS; the MP3 at gain 1 peaks
// at 0.33 with 0.177 RMS. 0.5 puts the snore's RMS 2 dB over a tap's and its
// peak 6 dB under: a harp note is a sharp attack and a ring, the snore is a
// steady swell, and RMS is what a steady sound sounds like.
export const SNORE_GAIN = 0.5;

// The slice of KnotSynth this module plays through.
export interface SampleHost {
  // K720: runs cb once an audio context exists (at once if one does). With
  // sound off none is made, even once the autoplay gate is open.
  whenOpen(cb: () => void): void;
  // K720: makes the context for a play, if the gate is open and sound is on;
  // true when one exists.
  open(): boolean;
  // Null while no context exists and none may be made, never once one
  // exists; rejects on undecodable bytes.
  decodeSample(bytes: ArrayBuffer): Promise<AudioBuffer | null>;
  // False when nothing could sound (gate closed, sound off, context not
  // running).
  playSample(buf: AudioBuffer, gain: number): boolean;
  // Seconds from scheduling a sound to hearing it (0 when unknown).
  outputLatency(): number;
}

export interface SnoreSfxOptions {
  host: SampleHost;
  // Read at every play(): false while "Silence everything" is on, the sound
  // mode is none, or the volume is 0.
  enabled: () => boolean;
  // Fetches the encoded bytes (fetchSnore in the app).
  load: () => Promise<ArrayBuffer>;
  // Wall clock in ms; performance.now in the app.
  now?: () => number;
}

export class SnoreSfx {
  private readonly host: SampleHost;
  private readonly enabled: () => boolean;
  private readonly load: () => Promise<ArrayBuffer>;
  private readonly now: () => number;

  private bytes: ArrayBuffer | null = null;
  private buffer: AudioBuffer | null = null;
  private loading = false; // A fetch is in flight.
  private decoding = false; // A decode is in flight.
  private ctxWait = false; // Registered with host.whenOpen.
  private broken = false; // The bytes would not decode: give up.
  // The clock of the last snore: when play() started it, how long it sounds
  // (the sample plus the output latency), and the latency itself.
  private startedAt = 0;
  private soundingUntil = Number.NEGATIVE_INFINITY;
  private latencyMs = 0;
  // Diagnostics (window.__knotSnore in main.ts).
  readonly stats = { fetches: 0, decodes: 0, plays: 0 };

  constructor(opts: SnoreSfxOptions) {
    this.host = opts.host;
    this.enabled = opts.enabled;
    this.load = opts.load;
    this.now = opts.now ?? (() => performance.now());
  }

  // Starts the lazy load: the fetch now, the decode as soon as the audio
  // context exists. Safe to call again and again; a failed fetch is retried by
  // the next call.
  preload(): void {
    if (this.broken || this.buffer || this.loading) return;
    if (this.bytes) {
      this.decodeWhenPossible();
      return;
    }
    this.loading = true;
    this.stats.fetches++;
    this.load().then(
      (b) => {
        this.loading = false;
        this.bytes = b;
        this.decodeWhenPossible();
      },
      () => {
        this.loading = false; // The next preload() tries again.
      }
    );
  }

  // Plays the snore unless one is still sounding. Silent (and "unavailable")
  // while the settings silence it, and until the file has loaded and decoded:
  // a call that finds it not ready starts the load, so the next one can play.
  // K720: it is a play, so it also makes the audio context the decode needs
  // (with sound off since the page loaded, none exists yet).
  play(): PlayResult {
    if (!this.enabled()) return "unavailable";
    if (!this.buffer) {
      this.host.open();
      this.preload();
      return "unavailable";
    }
    const t = this.now();
    if (t < this.soundingUntil) return "sounding";
    if (!this.host.playSample(this.buffer, SNORE_GAIN)) return "unavailable";
    this.stats.plays++;
    this.startedAt = t;
    this.latencyMs = Math.max(0, this.host.outputLatency() * 1000);
    this.soundingUntil = t + this.buffer.duration * 1000 + this.latencyMs;
    return "started";
  }

  // Milliseconds the last snore has been HEARD (the output latency taken
  // off), or null when none is sounding.
  sinceStartMs(): number | null {
    const t = this.now();
    if (t >= this.soundingUntil) return null;
    return Math.max(0, t - this.startedAt - this.latencyMs);
  }

  private decodeWhenPossible(): void {
    if (!this.bytes || this.buffer || this.decoding || this.broken) return;
    this.decoding = true;
    // A copy: decodeAudioData detaches what it is given.
    this.host.decodeSample(this.bytes.slice(0)).then(
      (buf) => {
        this.decoding = false;
        if (buf) {
          this.buffer = buf;
          this.bytes = null;
          this.stats.decodes++;
        } else {
          this.awaitContext(); // No context yet.
        }
      },
      () => {
        this.decoding = false;
        this.broken = true;
        console.warn("snore: the sound could not be decoded; it stays silent");
      }
    );
  }

  private awaitContext(): void {
    if (this.ctxWait) return;
    this.ctxWait = true;
    this.host.whenOpen(() => {
      this.ctxWait = false;
      this.decodeWhenPossible();
    });
  }
}

export async function fetchSnore(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`snore: HTTP ${res.status}`);
  return res.arrayBuffer();
}
