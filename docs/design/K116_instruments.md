# K116: alternate pluck instruments and accompaniment

Research and design, 2026-10-13. No code changes. Levi's request,
verbatim:

> How hard would it be to add alternate instruments for plucks? Also, or
> might be nice to encode some background additional accompaniment
> instrument parts, to enrich the music. The main pluck instrument would
> still be made more prominent.

Markers: **Code** means read from the source at `7225930`, or computed
from it (nothing was measured for this doc; estimates say so). **Research** means outside
knowledge, from memory and not re-checked in this session: verify before
quoting. **Opinion** marks a design judgment of mine.

Sizes: S = a day or less, M = a few days, L = one to two weeks, XL =
more.

## 0. The short answer

| Option | What it gives | Effort |
|---|---|---|
| (a) Presets of today's string | nylon guitar, koto-like, 12-string, muted pizzicato | S: hours over the 4 existing voice params; 0.5-2 days with new string options (strings per course, pick or mallet excitation, a body EQ per voice) |
| (a) Buzzing strings | sitar, tanpura (a nonlinear bridge in the loop) | M |
| (b) Modal engine | marimba, glockenspiel, kalimba, bells | S-M: 1-3 days for the engine, then hours per preset |
| (b) FM on native nodes | e-piano, FM bells, synth bass | S, but "synthy" next to the harp |
| (b) PeriodicWave drones and pads | sustained drone and pad parts | S |
| (b) Samples | any real instrument | M, plus about 0.3-3 MB of download per instrument and a license check |
| (c) Band skeleton | buses, ducking, a limiter, one Transport for every part | S-M: 2-3 days |
| (c) Parts | drone and bass S; chords and arpeggios from a chord chart S-M; percussion M; hand-written parts, hours per song | per part |

**Alternate pluck instruments are easy.** The string is already a
parameterized physical model (section 1), so variations of plucked
strings are presets plus small options. A second family (mallets, bells)
is one modal engine in the same worklet. **Accompaniment is a few days
of plumbing** (a bus, ducking, one shared clock). The lasting work is
musical: a chord chart per song.

**Recommended first step (opinion):** the band skeleton plus presets,
about 3-4 days (section 4): buses and ducking, a Transport, a drone and
a bass derived from a Scarborough Fair chord chart, and 3-4
`pluckVoice` presets. Then modal voices. Samples last or never.

**Your decisions:**
1. The first step above, or presets alone first (hours), or the modal
   engine first.
2. The first preset set (my proposal: harp, koto-like, muted pizzicato
   and a bright double-course 12-string-like voice; then marimba and
   bells with the modal engine).
3. Defaults: `accompaniment` off keeps every link and daily sounding as
   today. Turning the band on by default later is a default change, so a
   new codec version, unless sound defaults may move because they are
   playback preferences.
4. How far under the pluck the band sits (`accompLevel`'s default;
   I suggest 10-14 dB down).
5. Samples: never, or later for one featured instrument.
6. A song's loop must be whole bars (section 3.1): Scarborough Fair's
   closing rest grows from 2 beats to 3.

## 1. How the voice works today (code)

`src/audio/knot_synth.ts`:
- **The string:** extended Karplus-Strong in an AudioWorklet (loaded
  from a Blob URL, so it needs no bundler config).
  - Two strings per course, detuned by +/- `shimmer` x 3 cents.
  - T60 = 4.2 x sqrt(220 / f) x (0.35 + 1.3 x `sustain`) seconds,
    clamped to [0.5, 9].
  - A one-pole loop damping set by `brightness` and the pluck strength,
    two dispersion allpasses (slightly stretched partials), and a Thiran
    fractional delay solved so the whole loop is in tune.
  - Excitation: one period of smoothed noise with a pick-position comb
    (`pickPosition`), its level normalized against 220 Hz.
  - Output gain 0.1 + 0.42 x strength; mono; frequency clamped to
    [40, 1800] Hz; a deterministic per-pluck seed for offline probes.
  - Each voice ends itself after min(9, 1.5 x T60 + 0.8) s or 64 ms
    below -80 dBFS; an 11 s timer backstops it.
- **One AudioWorkletNode per pluck.** In music mode a note starts about
  every 0.63 s (36 notes in 50 beats at 132 bpm), so roughly 5-10 voices
  sound at once today (estimated from the lifespans, not measured).
- **The chain:** master gain -> peaking EQ (310 Hz, +2.5 dB, the harp's
  "body") -> high shelf (4200 Hz, -6 dB) -> speakers, plus a convolver
  send with a generated 1.3 s stereo noise impulse (wet = `reverb` x
  0.4) and an analyser for probes. The page ships no audio assets.
- **The gate:** no AudioContext exists until the first activation input;
  it is created and resumed inside that gesture (iOS unlocks only
  there). The context uses the default `latencyHint` ("interactive").
- **A legacy voice** (native DelayNode loop) plays only where
  AudioWorklet is missing. A native feedback loop carries one extra
  128-frame quantum of delay (the spec's cycle rule), which is why the
  worklet exists; new voices need not support the legacy path.
- **API:** `setVoice({brightness, sustain, shimmer, pickPosition})`,
  `setVolume`, `setReverb`, `outputLatency`, `audioTime`,
  `cancelScheduled`, `whenReady`, `pluck(freq, strength, when?)`. A
  scheduled pluck starts on the exact frame `round(when x sampleRate)`
  (K101). An injected OfflineAudioContext makes it measurable:
  `scripts/diag_audio.mjs` renders plucks offline through the Vite dev
  server and prints the RMS envelope.

The music (`src/audio/songs.ts`, `song_scheduler.ts`, `main.ts`):
- `Song` is `{name, bpm, notes: {note | null, beats}[]}`: a melody only,
  with no key, meter, chords or parts. `SONGS` holds one tune,
  Scarborough Fair (D dorian, 3/4, 132 bpm, 38 events, public domain).
- `SongScheduler` (K101) hands out notes on a grid, `MUSIC_LOOKAHEAD`
  0.3 s ahead on the audio clock (wall clock and silent before the
  gate). A clock change or a lag over `SONG_MAX_LAG` 0.25 s re-anchors
  the grid at "now"; `soundSpeed` scales the beat.
- In music mode the segments' pitches are exactly the song's distinct
  pitches; each note plucks a random segment of its pitch (strength
  0.62) and that thread vibrates. Taps pluck at 0.55.
- The render-only pluck's visual decay follows the sound: 
  `render/pluck_model.ts` `stringT60` mirrors the worklet's T60 formula.
- The Sound params (`url_state.ts`) are all daily-exempt playback
  preferences (`DAILY_EXEMPT_KEYS`):

| Param | Default |
|---|---|
| soundMode (none, manual, random, music) | music |
| pitchSpace, octaves, rootNote, tonicEmphasis | chromatic, 3, seed, 0.5 |
| soundSpeed | 1 |
| volume, reverb | 0.33, 0.42 |
| brightness, sustain, shimmer, pickPosition | 0.5, 0.5, 0.4, 0.4 (the harp) |

`pluckStyle` is not a sound: it is the drag-release feel (Touch & feel).

## 2. Alternate pluck instruments

### 2.1 (a) More strings from the same engine

- **Presets over the four params (hours).** The sliders already reach a
  muted, dark pizzicato (low sustain and brightness) and a bright,
  near-bridge pluck (low pickPosition). A preset names a point. Starting
  points to tune by ear (opinion), as brightness / sustain / shimmer /
  pickPosition:
  - koto-like: 0.8 / 0.25 / 0.1 / 0.15;
  - muted pizzicato: 0.2 / 0.05 / harp / harp;
  - 12-string-like: 0.75 / harp / 1.0 / harp.
- **The sliders stay meaningful for every voice (opinion).** Each voice
  maps them onto its own model, with 0.5 / 0.5 / 0.4 / 0.4 meaning "the
  voice as designed": brightness = damping or hardness, sustain = the T60
  scale, shimmer = detune, pickPosition = the pluck or strike point. Old
  links keep their sound, and the panel does not change.
- **Small new string options (S each; defaults bit-exact):**
  - strings per course, 1 / 2 / 3 (a 12-string or dulcimer chorus);
  - excitation: finger (today), pick (less smoothing, a sharper attack),
    mallet (a raised-cosine pulse, for a hammered dulcimer);
  - a body per voice: today's 310 Hz peak and 4200 Hz shelf become the
    harp's settings; a guitar wants a low body resonance and less top
    cut. One instrument plays at a time, so the master EQ can simply
    take the preset's values;
  - a damped release: a message that fades a voice out in 30-80 ms.
    Today any message stops the processor at once, which would click on
    a sounding note. Monophonic parts need it (section 3.3).
- **Buzzing strings (M):** a sitar's jawari or a tanpura's buzz is a
  nonlinear bridge in the loop. It is tuning-sensitive and can alias, so
  it needs listening rounds.
- **Couplings to carry along:**
  - a voice with another decay must hand its T60 to the pluck overlay,
    or the thread keeps swinging after the note has died;
  - K80 3.4's sour note is a wider detune on the harp's course; every
    voice needs its own sour variant (S each).
- **Tuning workflow:** `scripts/diag_audio.mjs` already renders and
  measures envelopes; add a WAV dump so presets can be compared by ear
  (S). Final calls are Levi's ears.

### 2.2 (b) Other families

- **Modal synthesis (recommended second family, opinion).** A mallet or
  bell is a few decaying sinusoids (modes) at fixed ratios, excited by a
  short pulse; the strike point sets each mode's amplitude, so
  `pickPosition` maps naturally. Research (from memory):
  - marimba bars are tuned 1 : 4 : 10 (two octaves, then three octaves
    and a major third); xylophones 1 : 3 : 6;
  - a free uniform bar (glockenspiel) rings 1 : 2.76 : 5.40 : 8.93;
  - a clamped tine (kalimba) about 1 : 6.3 : 17.5;
  - a church bell: hum 0.5, prime 1, tierce 1.2 (a minor third), quint
    1.5, nominal 2.
  Cost: one engine in the same worklet, 4-8 two-pole resonators per
  voice (about a string's cost), S-M; then each preset is hours. Bells
  and mallets sit well beside a harp and suit "the knot as an
  instrument".
- **FM on native nodes (S).** A carrier OscillatorNode modulated through
  a GainNode (the index), scheduled with `start(when)` and AudioParam
  ramps: e-piano, FM bells, a synth bass, no worklet. Opinion: it reads
  as a synthesizer next to the physical harp, so it fits a theme rather
  than the default sound.
- **PeriodicWave drones and pads (S).** Two slightly detuned custom
  wavetable oscillators through a slowly moving low-pass make a soft
  organ or shruti-box drone. Almost free on the CPU. A D + A drone fits
  D dorian.
- **Samples (M).**
  - Size (computed): decoded audio is 192 KB per mono second at 48 kHz
    (float32), so 12 samples of 3 s is about 7 MB of memory. Download:
    about 0.3-3 MB per instrument (research).
  - Licenses (research, verify): VSCO-2 Community Edition is CC0;
    FluidR3_GM is MIT, pre-rendered per note in gleitz's
    midi-js-soundfonts; MusyngKite is CC BY-SA. Avoid non-commercial
    sets.
  - Decoding: an OfflineAudioContext can decode before the gate; the
    live context resamples if its rate differs.
  - Formats: MP3 and AAC decode everywhere; check Opus on Safari.
  - Opinion: last or never. Synthesis fits the page's no-assets ethos
    (even the reverb impulse is generated), costs nothing to download,
    and is continuously tunable.

## 3. Accompaniment

### 3.1 What "encoding parts" means

- **The song needs more than a melody (opinion):**
  ```ts
  interface Song {
    name: string;
    bpm: number;
    meter: [number, number];        // [3, 4]
    key: { tonic: string; mode: string }; // D dorian
    chords?: string[];              // one per bar: "Dm", "C", ...
    notes: SongNote[];              // the melody, as today
    parts?: Part[];                 // optional hand-written parts
  }
  ```
- **Loops must be whole bars.** Scarborough Fair's 38 rows sum to 50
  beats (code): 16 bars of 3/4 plus a 2-beat closing rest. A bar-locked
  part would land 2 beats off the melody's bar line on every loop. Make the rest 3 beats
  (17 bars), or let the Transport pad to the bar.
- **A first chord chart (opinion, to be tuned by ear):** one chord per
  bar of the melody's 16, from its strong-beat notes:
  `Dm Dm C Dm | F Dm G Am | Dm F Dm C | Dm C C Dm`. Bar 7's B natural
  makes it G major, the dorian colour.
- **Derived parts (code once, then every song gets them):**
  - drone: tonic and fifth, re-struck each phrase (S);
  - bass: the chord root on beat 1, the fifth on a later beat; in 3/4
    the waltz "oom" (S);
  - chords: the triad on beats 2 and 3 ("pah-pah"), or a sustained pad,
    voiced below the melody and moved to the nearest inversion (S-M);
  - shimmer: a sparse high arpeggio on a modal bell (S after the modal
    engine);
  - percussion: a soft frame drum or shaker pattern per meter (M).
- **Hand-written parts** sound best and cost hours per song. Opinion: a
  chord chart per song (minutes) plus derived parts scales to the 5-10
  tunes R.4.4 of K80 wants; hand-write only for a featured song.

### 3.2 One clock for the band

- **One Transport, shared with `SongScheduler`.** The scheduler
  re-anchors its grid when the clock changes (wall to audio at the gate)
  or it falls 0.25 s behind. Every part must re-anchor at the same moment,
  or the band drifts from the melody. The Transport keeps the song
  position in beats, so it knows the bar.
- **Every part schedules like the melody:** notes handed out 0.3 s ahead
  on the audio clock, started on their exact frame, cancellable by
  mute, mode switch or rebuild (today's `future` set, or a bus fade).
- **Tempo goes through the Transport:** `soundSpeed`, and K80 3.3 L's
  tempo as tension. Opinion: the band thins to the drone above about
  twice the song's tempo (`soundSpeed` reaches 6).
- **The gate:** before it the melody runs silently on the wall clock.
  The band joins at the next bar after the unlock.

### 3.3 Voices for the band

- **Sustained parts on native nodes:** one oscillator set per part for
  the drone and pads, not one node per note.
- **Plucked parts on the string or modal engine:** a dark, long-sustain
  string makes a good bass. A bass note per bar at 132 bpm lives up to
  9 s, so several overlap (estimate). Monophonic parts damp the previous
  note (2.1's damped release), as a bass player does.
- **A pooled worklet if the phone needs it:** one persistent node that
  renders all of a part's voices, with notes posted to it, instead of a
  node per pluck. Build it only if the phone probe (section 5) shows
  glitches.

### 3.4 Keeping the pluck in front (the mix)

Opinion, standard mixing practice:
- **Level:** the band bus 10-14 dB under the melody.
- **Register:** the melody spans C4-D5 (262-587 Hz). Bass in D2-A2,
  chords below the melody (around D3-A3) or a soft shimmer above D6;
  nothing doubles the melody's octave.
- **EQ pocket:** high-pass the chords at 150-200 Hz; dip the band 2-3 dB
  around 1-3 kHz, where the pluck's attack lives.
- **Attack contrast:** soft attacks in the band (pads, bowed drones,
  soft mallets), so the harp's sharp attack is the foreground.
- **Depth:** the band gets more reverb, the melody stays drier and
  closer.
- **Stereo:** the harp stays centered (mono); the band pans to about
  +/- 0.3.
- **Ducking:** the band dips 3-6 dB at every pluck (10-20 ms attack,
  300-500 ms release). Music-mode pluck times are known ahead, so the
  dips are scheduled with `setTargetAtTime`; a tap ducks at once.
- **A limiter** (DynamicsCompressorNode) on the master, so a stack of
  voices never clips.
- **Sparse rhythm:** leave holes; the band answers the melody rather
  than covering it.

Visually the band is offstage: no thread vibrates for it, so the eye
stays on the melody too. Idea, unscheduled: the K21 background breathes
with the bass, gated by the Motion setting.

### 3.5 Phones

- A render quantum is 128 frames, 2.67 ms at 48 kHz; `process()` must
  allocate nothing and stay well inside it, or the audio crackles.
- Budget (opinion until probed): about 10-20 voices at once on a phone.
- Bluetooth delays all of the sound equally, so the band stays in time
  with the melody; only sound against picture shifts (K80 3.1, 3.5).
- iOS: Web Audio may stay silent under the ring/silent switch;
  `navigator.audioSession` (type "playback") may fix it (research,
  verify). Levi's phone is Android, so this is secondary.

### 3.6 Params

Sound folder, added to `DAILY_EXEMPT_KEYS`, appended to the current
codec table (v4 today; the indices are assigned at merge time, since
other branches append too), with defaults that keep today's sound:

| Param | Key | Values | Default |
|---|---|---|---|
| `pluckVoice` | `pvc` | harp, then the presets | harp |
| `accompaniment` | `acc` | off, drone, band | off |
| `accompLevel` | `acl` | [0, 1], band bus level | 0.5 (about 12 dB under) |

- The keys are unused today; avoid `pv` (pathViz's legacy key).
- The drone works in every sound mode: its key comes from the song in
  music mode, and from `rootNote` and `pitchSpace` otherwise.
- The band needs a song: music mode, and K80's beat modes later.

### 3.7 What it unlocks in K80

- 3.3 G (groove): its layers (bass, then harmony, then shimmer) are
  these parts, faded by the game.
- 3.3 D (harmony as a compass) needs the chords.
- 3.3 F and H (quantized and beat-locked moves) and L (tempo as
  tension) run on the Transport.
- R.4.4 and R.5.1: the band keeps the beat while the player is quiet.

## 4. Recommended first step (opinion)

The band skeleton plus presets, about 3-4 days (S-M):
1. Buses: the melody bus (today's path), a band bus with its own EQ,
   reverb send and pan, the ducking, and a master limiter.
2. The Transport, shared with `SongScheduler`, bar-aware; the `Song`
   schema with meter, key and chords; Scarborough Fair's loop at 51
   beats and its chord chart.
3. A drone (PeriodicWave) and a bass (a dark string preset with the
   damped release), both derived from the chart.
4. 3-4 `pluckVoice` presets over the existing params, each with its
   body EQ, and the T60 hand-off to the pluck overlay.

Then the modal engine (S-M) with marimba and bell voices and a shimmer
part; derived chords and arpeggios (S-M); percussion (M). Samples last
or never.

## 5. Open checks

- **A phone CPU probe** on the Pixel 11: how many voices (one node per
  pluck, then a pooled worklet) play before underruns. It decides 3.3's
  pooled worklet.
- **Licenses**, if samples ever happen.
- **iOS** silent switch and `navigator.audioSession`.
- **Listening:** presets, chord chart and mix levels are by ear.

## 6. Sources (leads)

From memory and not re-checked in this session: verify before quoting.
- K. Karplus and A. Strong, "Digital synthesis of plucked-string and
  drum timbres", Computer Music Journal 7(2) (1983); D. A. Jaffe and
  J. O. Smith, "Extensions of the Karplus-Strong plucked-string
  algorithm", same issue (the code's pick-position comb and loop
  filters).
- J. Chowning, "The synthesis of complex audio spectra by means of
  frequency modulation", J. Audio Eng. Soc. 21 (1973).
- N. H. Fletcher and T. D. Rossing, The Physics of Musical Instruments
  (2nd ed., 1998): bar and bell mode ratios.
- P. R. Cook, Real Sound Synthesis for Interactive Applications (2002):
  modal synthesis.
- W3C Web Audio API: the 128-frame render quantum, AudioWorklet,
  `latencyHint`; C. Wilson, "A Tale of Two Clocks" (HTML5 Rocks, 2013):
  lookahead scheduling.
- Versilian Studios, VSCO-2 Community Edition; FluidR3_GM (Frank Wen);
  gleitz/midi-js-soundfonts on GitHub; MusyngKite.
- W3C Audio Session draft (`navigator.audioSession`), implemented in
  Safari.
