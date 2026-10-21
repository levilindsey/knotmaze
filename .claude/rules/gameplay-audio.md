---
paths:
  - "src/audio/**"
  - "test/audio/**"
  - "src/app/auto_audio.ts"
  - "src/ui/snore_link.ts"
  - "test/ui/snore_link.test.ts"
---

# Gameplay lore: audio

Moved verbatim from `gameplay.md` by K173 (2026-10-14), so that it attaches
only with the files it is about; `gameplay.md` lists the area's other files.

## Audio

- *From the 2026-10-11 small round 2, the audio autoplay gate:* AUDIO AUTOPLAY GATE (knot_synth.ts): no AudioContext exists
  until the first activation-triggering input (keydown, mousedown, mouse
  pointerdown, touch/pen pointerup, touchend; navigator.userActivation
  decides where supported), and the gate's capture-phase window listener
  creates + resumes it INSIDE that gesture (iOS unlocks only there) -
  music-mode plucks before it are silent no-ops, so Chrome's "AudioContext
  was not allowed to start" warning is gone.

- SOUND OFF OPENS NO AUDIO (K720, 2026-10-21; worktree agent; brief and
  handoff `docs/design/K720.md`). Why: a running context keeps a phone's
  audio output awake (battery) and on Android may take the audio focus
  (found by K717's phone sitting; probes-phone.md's K704 gotcha). With
  sound off (`settings.muted`, or `soundMode` none: `soundIsOn`; volume 0
  does not count) the gate's first activating input only records that
  the gate is open (`unlocked`) and creates nothing. `ensure()` is the
  ONE place a context is made (`provided ?? new AudioContext()`): null
  while the gate is closed or `soundOn()` is false (`setSoundOn`,
  installed by `app/auto_audio.ts`; true until then). With sound on
  nothing changed: the gate's listener makes the context inside the
  gesture (iOS), and the listeners now disarm only once a context RUNS.
  Plays that make it: a pluck (pluck() and playSample() go through
  ensure()); the song (music's tick calls `synth.open()` before
  `audioTime()`, so the panel's switch needs no reload and the song moves
  to the audio clock); the snore (`play()` calls `host.open()`, and the
  panel's preload decodes through ensure() as before, so with sound on
  and the gate open it makes one too; with sound off the decode waits on
  `whenOpen`, a context, not the gate). A context made
  outside a gesture runs in Chrome after an activation; elsewhere the
  still-armed listeners resume it at the next input (unverified on iOS).
  MEASURED (`.claude/probes/K720/k720_probe.mjs`, `results.md`; knot
  links, headed Chrome off-screen, contexts counted by an AudioContext
  subclass, base 6c2068d0 against K720): `snd=none`, a click, a touch, a
  drag pluck and tap plucks made 0 contexts (base: 1, in the first
  click's pointerdown); the panel's switch to music made 1, running, at
  the first tick, its song on the audio clock with the 1.2 s lead-in;
  none -> manual made 1 in the first tap pluck's pointerdown; Muted set
  before any input held 0 through every input, and unmuting made 1. The
  default link's first click or touch made 1 in its pointerdown /
  pointerup on both builds, with the same song grid and peaks. 0
  resume() calls on either build: Chrome constructs a context running
  after an activation. SIDE EFFECT: the minotaur's cues (catch notes,
  growl, heartbeat, footsteps: bare `synth.pluck` calls in main.ts) never
  checked Muted or sound mode none (Muted is read per call, not a master
  gain) and sounded under both; they are silent with sound off now, like
  every other sound.

- AUTO PLUCKS' VOLUME (K279 stage 1, 2026-10-14; brief
  `docs/design/K279.md`). Levi: "I want manual plucks to be louder than
  auto plucks". Auto plucks (the random and music sound modes) play
  through their own GainNode, `autoBus` in knot_synth.ts, which sits
  between their voices and the master gain. Its level is `autoPluckGain`
  (`pag`, [0, 1], default 0.5 = -6 dB). At 1 it is the mix before K279,
  since a gain of 1 multiplies exactly. `pluck(freq, strength, when,
  auto)` routes by the flag (`outFor`), and plucks queued before the
  context keep their flag. main.ts's fabricTick calls `synth.setAutoGain`
  every frame, which is safe before the context exists. Only the level
  moves: an auto pluck's strength, which also sets its brightness, is
  unchanged. Taps (TAP_STRENGTH 0.55) and drag releases play as before.
  A viewer preference (DAILY_EXEMPT_KEYS).

- THE SNORING CAT LINK (K325 stage 1, 2026-10-14). Levi: "play the snoring
  cat sound on hover or touch-down of the snoring cat link in the panel ...
  delay the link traversal by a tiny bit, to give the sfx longer to play".
  The panel's "Made by Snoring Cat" anchor (`PanelApi.studioLink`) snores.
  - ASSET: `public/snoring-cat-snore.mp3`, mono 44.1 kHz 64 kbps CBR MP3,
    0.915 s, 7,984 bytes, metadata stripped. Cut from hopnbop's
    `assets/audio/old/single_cat_snore.wav` (80,844 B PCM; the same bytes
    sit in scaffolder). It is Levi's own recording (2026-10-14
    22:50: "It's a recording I made."), so it needs no credit line. Unhashed in `public/`: a replacement needs a new
    name, or browsers and Cloudflare keep the old one. Envelope: quiet for
    the first 50 ms (-37 dB), swell to -14 dB by 200 ms, loud 200-450 ms,
    fade 500-850 ms, silent by 900 ms.
  - THE SOUND (`audio/snore_sfx.ts`, `SnoreSfx`): `KnotSynth.decodeSample`
    (null while no context exists and none may be made: the gate closed,
    or K720's sound off) and `playSample` go out
    through `sfxBus`, a gain that follows the master `volume` straight to
    the destination, past the body EQ and the hall (a string's room would
    smear a recording). SNORE_GAIN 0.5, from `.claude/probes/K325/
    level.mjs` (offline, volume 1): a tap pluck (0.55) has a loudest-300-ms
    RMS of -23.4 dB and a 0.344 peak; the snore at gain 1 has -15.1 dB and
    0.333. At 0.5 its RMS is about 2 dB over a tap's and its peak 6 dB
    under. LAZY: nothing is fetched at page load. `snore.preload()` runs
    when the panel opens (`onOpenChange`); a panel that starts open (the
    desktop default) preloads from `requestIdleCallback` (4 s timeout; a 2 s
    timer where there is none). The bytes are fetched once, a COPY is
    decoded (a decode detaches its buffer) and only once a context exists
    (K720: before, once the gate was open);
    a failed fetch retries on the next preload or play, bytes that will not
    decode give up with one warning.
  - PLAY: a mouse or pen plays on `pointerenter`; a touch plays on
    `pointerdown` (it has no hover); a mouse that hovered does not play
    again at the press (only if the hover could not). NEVER STACKED:
    `soundingUntil` = duration + the context's output latency, and a call
    while it sounds returns "sounding" and adds nothing. Silent when
    `settings.muted`, `soundMode` none or `volume` 0, checked at PLAY time
    only: muting during a snore does not cut it, and the `sfxBus` follows
    `setVolume` without a ramp.
  - THE DELAY (`ui/snore_link.ts`, pure `SnoreLink` + `attachSnoreLink`):
    only a click that began as a TOUCH or PEN press is held. It waits until
    the snore has been heard HEAR_MS 400 (its loud middle), at most
    MAX_DELAY_MS 300 after the click (a tap's click comes 60-150 ms after
    the touch-down, so a tap waits about 300 ms), and 0 when no snore
    sounds. A mouse click, Enter (click `detail` 0), a ctrl/meta/shift/alt
    click, a non-primary button and a script's click are left to the
    browser. The held click is `preventDefault`ed and a timer calls
    `anchor.click()`: that click is untrusted, so the handler lets it
    through natively, inside Chrome's 5 s transient activation (Safari's is
    about 1 s) and so not a popup. A second tap while one is pending is
    swallowed. The link stays a real `<a href target=_blank>`. If the
    press's `play()` was "unavailable" (the load or the gate was not ready:
    Chrome opens the gate at `pointerup`), the click tries once more and
    holds only if that started the snore.
  - DESKTOP NEEDS NO DELAY (Chrome only): opening the tab hides the page
    190 ms after the hover, and the AudioContext keeps running with the
    page hidden (`currentTime` advances, 72 polls audible while hidden, the
    snore runs its 844 ms audible length to the end). Other browsers are
    unverified.
  - FIRST-INPUT LIMIT: no AudioContext exists before the first activation,
    so a hover before any click or key is silent (the desktop panel is
    open at load), and the gesture that opens the gate (the first press,
    tap or key) plays nothing: the MP3 is not decoded yet. A first tap
    still opens the link at once. A page that loads with sticky activation
    (a same-origin link into the game) opens the gate at construction, and
    its first hover does play. Open: decode on an OfflineAudioContext before
    the gate so a first touch can play. K720: with sound off the first
    input creates no context, so once sound is turned on in manual mode
    the first snore play makes the context and plays nothing (the decode
    starts then); the next play sounds. Music's next tick makes the
    context at once, and random mode's first pluck 0.8 s after the
    switch, so there a hover after that (and the decode) plays. With sticky activation the
    gate opens at construction and creates nothing; with sound on the
    preload's decode makes the context, as before. (All from the code
    and `snore_sfx.test.ts`; K720's browser check did not run the snore.)
  - PROBE: `.claude/probes/K325/snore.mjs <base> [A..F]` (headed Chrome
    off-screen: desktop mouse, silent configs, volume, phone touch
    emulation, keyboard Enter, first-ever touch; `results.md`). Hooks:
    `window.__knotSynth()` (plucks, samples, peak, sfxPeak, state,
    currentTime) and `window.__knotSnore()` (fetches, decodes, plays,
    sinceStartMs). GOTCHAS: puppeteer's `page.evaluate`, `$eval` and
    `waitForFunction` send `userGesture: true`, which gives the page
    sticky activation and opens the audio gate before the test begins:
    read through raw CDP `Runtime.evaluate` with `userGesture: false`.
    Puppeteer's default args include `--disable-popup-blocking`, so a
    probe of a delayed open must drop it (`ignoreDefaultArgs`) and keep a
    control that proves a late `window.open` is blocked. `--mute-audio`
    still leaves the analysers working. Tweakpane labels carry a reset
    glyph (the mute row reads "muted⟲"): match letters. A timer runs late,
    never early, under load. UNVERIFIED: Android Chrome and Safari/iOS on a
    device (the delay's feel, and whether Android cuts the sound when the
    tab switches). tsconfig's `erasableSyntaxOnly` forbids constructor
    parameter properties.
