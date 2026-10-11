// Knot-as-instrument: extended Karplus-Strong harp strings, implemented
// inside an AudioWorklet so the string loop is tuned SAMPLE-EXACTLY.
//
// WHY A WORKLET (the music-mode transposition bug): a native-node KS loop
// (DelayNode -> IIR -> Gain -> DelayNode) is a WebAudio CYCLE, and the
// spec processes cycles with one render quantum (128 samples) of implicit
// extra loop latency. The effective period is delayTime + 128/sampleRate
// + the loop filter's phase delay, so every pluck sounded transposed DOWN
// by a pitch-dependent amount (measured at 48kHz: D4 -> 164.2Hz, -1007
// cents; D5 -> 227.9Hz, -1639 cents - contour preserved, intervals
// compressed, exactly the user's "relative direction right, actual notes
// off"). Notes above ~375Hz (period < one quantum) are UNREACHABLE by a
// native cycle at 48kHz, so compensation cannot fix it; the worklet owns
// its delay line per-sample and has no such latency. Tuning here solves
// integer delay + Thiran fractional allpass + the measured phase delay of
// every in-loop filter at the fundamental, numerically, per string.
//
// HARP VOICE (vs the old "rubber band"): two detuned strings per note
// (+/- ~1.2 cents, like a course - slow beating shimmer), gut-string
// decay times (T60 ~3.4s at 220Hz, longer low / shorter high) with the
// one-pole loop damping darkening the tone progressively as it rings,
// mild stiffness DISPERSION (two in-loop allpasses -> slightly stretched
// partials, strongest on bass strings), a finger-soft excitation (heavier
// pre-smoothing, pick-position comb), and the existing body EQ + small
// generated-IR hall on the master bus.

// ---------------------------------------------------------------------------
// The string processor source. Kept as a plain-JS string and loaded via a
// Blob URL so it needs no bundler config and works for injected
// OfflineAudioContexts (the measurement harness) exactly like live audio.
const WORKLET_SRC = `
class KnotStringProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const o = (options && options.processorOptions) || {};
    // Instrument voice params (each defaulted so 0.5/0.5/0.4/0.4 is
    // EXACTLY the pre-param harp): brightness scales the loop damping
    // pole down (brighter) or up (darker); sustain scales T60; shimmer
    // is the course detune in cents/3; pickPosition recenters the comb.
    const vBrt = o.brightness === undefined ? 0.5 : o.brightness;
    const vSus = o.sustain === undefined ? 0.5 : o.sustain;
    const vShm = o.shimmer === undefined ? 0.4 : o.shimmer;
    const vPp = o.pickPosition === undefined ? 0.4 : o.pickPosition;
    const freq = Math.min(1800, Math.max(40, o.freq || 220));
    const s = Math.min(1, Math.max(0.05, o.strength || 0.5));
    // Deterministic per-voice RNG (mulberry32) so offline probe renders
    // are reproducible.
    let rs = (o.seed >>> 0) || 1;
    const rand = () => {
      rs |= 0; rs = (rs + 0x6D2B79F5) | 0;
      let t = Math.imul(rs ^ (rs >>> 15), 1 | rs);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const sr = sampleRate;

    // Decay: harp strings ring LONG - seconds, longer in the bass. (The
    // MEASURED aggregate T60 lands ~25-35% under this fundamental target
    // because upper partials decay faster - that is the progressive
    // darkening, not an error.)
    const t60 = Math.min(
      9,
      Math.max(
        0.5,
        4.2 * Math.pow(220 / freq, 0.5) * (0.35 + 1.3 * vSus)
      )
    );
    // Loop damping one-pole: brightness now AND how fast highs die
    // relative to the fundamental (the progressive darkening of a real
    // string). Softer plucks start darker; high strings get less damping
    // so they keep some voice.
    const pole = Math.min(0.8, Math.max(0.05,
      (0.45 - 0.18 * s) * Math.pow(220 / freq, 0.12) *
      (1.6 - 1.2 * vBrt)));
    // Stiffness dispersion: two first-order allpasses in the loop with a
    // NEGATIVE coefficient delay high partials LESS -> upper partials land
    // slightly sharp (stretched), the metallic-sweet "ping" of a real
    // string. Scaled down with pitch (short treble loops would otherwise
    // stretch absurdly - the deviation is a fixed sample count against a
    // shrinking loop length).
    const aDisp = -0.72 * Math.pow(Math.min(1, 200 / freq), 0.8);
    this.pole = pole;
    this.aDisp = aDisp;

    // Phase delay (samples) of a first-order allpass (a + z^-1)/(1 + a z^-1)
    // at angular frequency w - evaluated numerically, no approximations.
    const apTau = (a, w) => {
      const phN = Math.atan2(-Math.sin(w), a + Math.cos(w));
      const phD = Math.atan2(-a * Math.sin(w), 1 + a * Math.cos(w));
      return -(phN - phD) / w;
    };

    const mkString = (fs) => {
      const w = (2 * Math.PI * fs) / sr;
      const tDamp = Math.atan2(pole * Math.sin(w), 1 - pole * Math.cos(w)) / w;
      const tDisp = 2 * apTau(aDisp, w);
      const total = sr / fs; // Required loop delay, samples.
      const line = total - tDamp - tDisp;
      let dInt = Math.floor(line - 0.5);
      if (dInt < 1) dInt = 1;
      // Thiran first-order fractional delay, refined so the WHOLE loop's
      // phase delay at the fundamental is exact.
      let frac = line - dInt;
      let c = (1 - frac) / (1 + frac);
      for (let it = 0; it < 3; it++) {
        const err = dInt + apTau(c, w) + tDamp + tDisp - total;
        frac = Math.min(1.499, Math.max(0.21, frac - err));
        c = (1 - frac) / (1 + frac);
      }
      // Feedback gain for the target T60 at the fundamental, compensating
      // the damping filter's gain there. |H_damp| <= 1 everywhere with its
      // max at DC, so clamping g below 1 keeps every mode decaying.
      const hDamp = (1 - pole) /
        Math.sqrt(1 - 2 * pole * Math.cos(w) + pole * pole);
      const g = Math.min(0.9995,
        Math.pow(10, (-3 * (total / sr)) / t60) / hDamp);
      const cap = dInt + 4;
      return {
        buf: new Float32Array(cap), cap, w: 0, dInt,
        thC: c, thX: 0, thY: 0,
        dampY: 0,
        a1X: 0, a1Y: 0, a2X: 0, a2Y: 0,
        g,
      };
    };

    // Two strings per course, detuned +/- DETUNE cents: unison shimmer.
    const DETUNE = vShm * 3;
    this.strings = [
      mkString(freq * Math.pow(2, -DETUNE / 1200)),
      mkString(freq * Math.pow(2, DETUNE / 1200)),
    ];

    // Excitation: one period of finger-soft noise. Heavy pre-smoothing
    // (darker for soft plucks), near-instant rise then squared decay, a
    // pick-position comb (the finger plucks partway along the string;
    // beta wanders like a hand), and equal-energy normalization
    // referenced at 220Hz so low notes do not boom (one-period bursts
    // otherwise inject energy proportional to the period).
    const burstLen = Math.max(8, Math.round(sr / freq));
    const burst = new Float32Array(burstLen);
    const rise = Math.max(2, Math.round(burstLen * 0.1));
    const q = 0.9 - 0.12 * s;
    let sm = 0;
    let energy = 0;
    for (let i = 0; i < burstLen; i++) {
      sm = sm * q + (rand() * 2 - 1) * (1 - q);
      const fade = i < rise
        ? i / rise
        : Math.pow(1 - (i - rise) / (burstLen - rise), 2);
      burst[i] = sm * fade;
      energy += burst[i] * burst[i];
    }
    const rms = Math.sqrt(energy / burstLen) || 1e-6;
    // Exponent 0.65 (vs 0.5 = strict equal energy) leans the balance a
    // little toward the trebles, which otherwise measure several dB shy
    // of the mids (shorter bursts + the 310Hz body peak favor low notes).
    const norm = Math.min(3.5, (0.5 / rms) * Math.pow(freq / 220, 0.65));
    for (let i = 0; i < burstLen; i++) burst[i] *= norm;
    const beta = Math.min(
      0.6,
      Math.max(0.05, vPp - 0.08 + rand() * 0.16)
    );
    const combD = Math.max(1, Math.round(burstLen * beta));
    for (let i = burstLen - 1; i >= combD; i--) {
      burst[i] -= 0.92 * burst[i - combD];
    }
    this.burst = burst;
    this.burstLen = burstLen;
    this.outGain = 0.1 + 0.42 * s;

    this.n = 0;
    this.life = Math.floor(sr * Math.min(9, t60 * 1.5 + 0.8));
    this.fadeStart = this.life - Math.floor(sr * 0.35);
    this.quietQuanta = 0;
    this.done = false;
  }

  process(inputs, outputs) {
    if (this.done) return false;
    const out = outputs[0][0];
    if (!out) return true;
    const S = this.strings;
    const b = this.burst;
    const bl = this.burstLen;
    const pole1 = 1 - this.pole;
    const a = this.aDisp;
    let peak = 0;
    for (let i = 0; i < out.length; i++) {
      const n = this.n + i;
      const ex = n < bl ? b[n] : 0;
      let acc = 0;
      for (let k = 0; k < 2; k++) {
        const st = S[k];
        let r = st.w - st.dInt;
        if (r < 0) r += st.cap;
        const xd = st.buf[r];
        // Thiran fractional-delay allpass.
        const th = st.thC * (xd - st.thY) + st.thX;
        st.thX = xd;
        st.thY = th;
        // Damping one-pole lowpass.
        st.dampY += pole1 * (th - st.dampY);
        // Two dispersion allpasses.
        const y1 = a * (st.dampY - st.a1Y) + st.a1X;
        st.a1X = st.dampY;
        st.a1Y = y1;
        const y2 = a * (y1 - st.a2Y) + st.a2X;
        st.a2X = y1;
        st.a2Y = y2;
        const inp = ex + st.g * y2;
        st.buf[st.w] = inp;
        st.w = st.w + 1 < st.cap ? st.w + 1 : 0;
        acc += inp;
      }
      let v = acc * 0.5 * this.outGain;
      if (n >= this.fadeStart) {
        const u = 1 - (n - this.fadeStart) / (this.life - this.fadeStart);
        v *= u > 0 ? u * u : 0;
      }
      out[i] = v;
      const av = v < 0 ? -v : v;
      if (av > peak) peak = av;
    }
    this.n += out.length;
    // Self-terminate: hard lifespan OR sustained near-silence (post-burst).
    if (this.n > bl + 4800) {
      if (peak < 1e-4) this.quietQuanta++;
      else this.quietQuanta = 0;
    }
    if (this.n >= this.life || this.quietQuanta >= 24) {
      this.done = true;
      this.port.postMessage(1);
      return false;
    }
    return true;
  }
}
registerProcessor("knot-string", KnotStringProcessor);
`;

// Slider [0, 1] -> wet-gain scale (1.0 on the slider = a WASH of hall).
const REVERB_WET_SCALE = 0.4;

// AUTOPLAY GATE: browsers refuse to start an AudioContext before the page
// has had a user gesture, and log "The AudioContext was not allowed to
// start" for every context created (or resumed) too early - and music mode
// plucks from the first frames. So no live context exists until the first
// ACTIVATION-TRIGGERING input (the HTML spec's list: keydown, mousedown,
// pointerdown from a mouse, pointerup from touch/pen, touchend); plucks
// before it are silent no-ops. The context is created and resumed INSIDE
// that input's handler - iOS Safari unlocks audio only there. Listeners
// capture on window, so the unlock runs before the app's own handler for
// the same event (a tap-pluck sounds on the very first tap).
const UNLOCK_EVENTS = [
  "keydown",
  "mousedown",
  "pointerdown",
  "pointerup",
  "touchend",
];
type ActivationNavigator = Navigator & {
  userActivation?: { isActive: boolean; hasBeenActive: boolean };
};

export class KnotSynth {
  private ctx: BaseAudioContext | null = null;
  private master: GainNode | null = null;
  // Master output level [0, 1]; the pre-synth default headroom was 0.85.
  private volume = 0.85;
  // Reverb wet mix [0, 1]; 0.42 * REVERB_WET_SCALE = the original 0.17.
  private reverb = 0.42;
  private wetGain: GainNode | null = null;
  // Instrument voice (see setVoice; these defaults ARE the stock harp).
  private voiceBrightness = 0.5;
  private voiceSustain = 0.5;
  private voiceShimmer = 0.4;
  private voicePickPos = 0.4;

  // An injected context (e.g. OfflineAudioContext) makes the synth
  // measurable: diag scripts render a pluck offline and inspect the
  // actual output instead of trusting the node graph.
  private readonly provided: BaseAudioContext | null;

  // Worklet life cycle: "pending" until addModule settles. Plucks arriving
  // before then are queued and flushed on resolution (first-ever pluck of
  // a session only; the module compiles in milliseconds). If AudioWorklet
  // is unavailable or the module fails, the legacy native-node voice
  // plays instead (it carries the old render-quantum detune - acceptable
  // for a last-resort fallback).
  private engine: "pending" | "harp" | "legacy" = "pending";
  private readyPromise: Promise<void> | null = null;
  private pendingPlucks: Array<{ freq: number; strength: number }> = [];

  // False until the autoplay gate opens (an injected context needs none).
  private unlocked: boolean;

  constructor(provided: BaseAudioContext | null = null) {
    this.provided = provided;
    this.unlocked = provided !== null;
    if (!this.unlocked && typeof window !== "undefined") this.armUnlock();
  }

  // Opens the autoplay gate on the first activation-triggering input (see
  // UNLOCK_EVENTS). Where the browser reports transient activation, its
  // verdict decides (a touch pointerdown does not activate; its pointerup
  // does); engines without navigator.userActivation accept every listed
  // event except a non-mouse pointerdown.
  private armUnlock(): void {
    const nav = navigator as ActivationNavigator;
    if (nav.userActivation?.hasBeenActive) {
      this.unlocked = true;
      return;
    }
    const onInput = (e: Event): void => {
      if (!e.isTrusted) return;
      const active = nav.userActivation
        ? nav.userActivation.isActive
        : !(
            e.type === "pointerdown" &&
            (e as PointerEvent).pointerType !== "mouse"
          );
      if (!active) return;
      for (const t of UNLOCK_EVENTS) {
        window.removeEventListener(t, onInput, true);
      }
      this.unlocked = true;
      this.ensure();
    };
    for (const t of UNLOCK_EVENTS) {
      window.addEventListener(t, onInput, { capture: true, passive: true });
    }
  }

  // Diagnostics (window.__knotSynth): pluck count, context state, engine,
  // and a master-bus analyser so probes can verify notes are actually
  // AUDIBLE, not just scheduled (the music-mode silent-note report).
  private analyser: AnalyserNode | null = null;
  private stats = { plucks: 0, lastFreq: 0 };

  // Live master volume; safe before the context exists (applied at ensure).
  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.value = this.volume;
  }

  // Live reverb amount [0, 1] (wet-mix level; safe pre-context).
  setReverb(v: number): void {
    this.reverb = Math.max(0, Math.min(1, v));
    if (this.wetGain) {
      this.wetGain.gain.value = this.reverb * REVERB_WET_SCALE;
    }
  }

  // Live instrument voice (applies to every pluck from the next note on;
  // defaults reproduce the stock harp exactly). All [0, 1].
  setVoice(v: {
    brightness: number;
    sustain: number;
    shimmer: number;
    pickPosition: number;
  }): void {
    const c = (x: number): number => Math.max(0, Math.min(1, x));
    this.voiceBrightness = c(v.brightness);
    this.voiceSustain = c(v.sustain);
    this.voiceShimmer = c(v.shimmer);
    this.voicePickPos = c(v.pickPosition);
  }

  // Seconds between scheduling a note and hearing it (the context's output
  // + base latency where the browser reports them; 0 before the first
  // pluck), so an auto pluck's visual can land on its sound.
  outputLatency(): number {
    const ctx = this.ctx;
    if (typeof AudioContext === "undefined" || !(ctx instanceof AudioContext)) {
      return 0;
    }
    const l = (ctx.outputLatency || 0) + (ctx.baseLatency || 0);
    return Number.isFinite(l) ? Math.max(0, Math.min(0.25, l)) : 0;
  }

  // Resolves once the string engine is decided and any queued plucks are
  // scheduled - measurement probes await this before startRendering().
  whenReady(): Promise<void> {
    this.ensure();
    return this.readyPromise ?? Promise.resolve();
  }

  // Null until the autoplay gate opens; the gate's own handler makes the
  // first call, inside the unlocking gesture.
  private ensure(): BaseAudioContext | null {
    if (!this.unlocked) return null;
    if (!this.ctx) {
      this.ctx = this.provided ?? new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      // BODY EQ between the strings and the room: a touch of low-mid
      // warmth and a rounded-off top - the difference between a wire on
      // a board and an instrument with a soundbox.
      const body = this.ctx.createBiquadFilter();
      body.type = "peaking";
      body.frequency.value = 310;
      body.Q.value = 0.9;
      body.gain.value = 2.5;
      const roundoff = this.ctx.createBiquadFilter();
      roundoff.type = "highshelf";
      roundoff.frequency.value = 4200;
      roundoff.gain.value = -6;
      this.master.connect(body);
      body.connect(roundoff);
      const sink = roundoff;
      sink.connect(this.ctx.destination);
      // A whisper of hall: master also feeds a convolver with a small
      // GENERATED impulse (1.3s decaying noise, decorrelated channels),
      // mixed back quietly. No assets, works offline too.
      const ir = this.ctx.createBuffer(
        2,
        Math.floor(this.ctx.sampleRate * 1.3),
        this.ctx.sampleRate
      );
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch);
        let lp = 0;
        for (let i = 0; i < d.length; i++) {
          const t = i / this.ctx.sampleRate;
          lp = lp * 0.82 + (Math.random() * 2 - 1) * 0.18;
          d[i] = lp * Math.exp(-3.1 * t) * (ch === 0 ? 1 : 0.92);
        }
      }
      const verb = this.ctx.createConvolver();
      verb.buffer = ir;
      const wet = this.ctx.createGain();
      wet.gain.value = this.reverb * REVERB_WET_SCALE;
      this.wetGain = wet;
      sink.connect(verb); // Post-EQ, so the room hears the same harp.
      verb.connect(wet);
      wet.connect(this.ctx.destination);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.master.connect(this.analyser);
      const self = this;
      (window as unknown as Record<string, unknown>).__knotSynth = () => {
        const buf = new Float32Array(self.analyser!.fftSize);
        self.analyser!.getFloatTimeDomainData(buf);
        let peak = 0;
        for (let i = 0; i < buf.length; i++) {
          const a = Math.abs(buf[i]);
          if (a > peak) peak = a;
        }
        return {
          plucks: self.stats.plucks,
          lastFreq: self.stats.lastFreq,
          state: self.ctx ? self.ctx.state : "none",
          engine: self.engine,
          peak,
        };
      };
      // Kick off the string-engine load exactly once per context.
      const aw = this.ctx.audioWorklet;
      if (aw && typeof AudioWorkletNode !== "undefined") {
        const url = URL.createObjectURL(
          new Blob([WORKLET_SRC], { type: "application/javascript" })
        );
        this.readyPromise = aw
          .addModule(url)
          .then(() => {
            this.engine = "harp";
          })
          .catch(() => {
            this.engine = "legacy";
          })
          .finally(() => {
            URL.revokeObjectURL(url);
            const queued = this.pendingPlucks;
            this.pendingPlucks = [];
            for (const p of queued) this.playNow(p.freq, p.strength);
          });
      } else {
        this.engine = "legacy";
        this.readyPromise = Promise.resolve();
      }
    }
    if (this.ctx instanceof AudioContext && this.ctx.state === "suspended") {
      // Outside a gesture (an iOS interruption, say) this can reject; the
      // next tap-pluck retries from inside its gesture.
      this.ctx.resume().catch(() => undefined);
    }
    return this.ctx;
  }

  // strength in [0, 1] scales loudness and brightness.
  pluck(freq: number, strength: number): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    this.stats.plucks++;
    this.stats.lastFreq = freq;
    if (this.engine === "pending") {
      this.pendingPlucks.push({ freq, strength });
      return;
    }
    this.playNow(freq, strength);
  }

  private playNow(freq: number, strength: number): void {
    if (this.engine === "harp") this.pluckHarp(freq, strength);
    else this.pluckLegacy(freq, strength);
  }

  private pluckHarp(freq: number, strength: number): void {
    const ctx = this.ctx!;
    // Deterministic per-pluck seed (probe reproducibility): pluck ordinal
    // mixed with the pitch.
    const seed =
      (Math.imul(this.stats.plucks, 2654435761) ^ Math.round(freq * 128)) >>>
      0;
    const node = new AudioWorkletNode(ctx, "knot-string", {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [1],
      processorOptions: {
        freq,
        strength,
        seed,
        brightness: this.voiceBrightness,
        sustain: this.voiceSustain,
        shimmer: this.voiceShimmer,
        pickPosition: this.voicePickPos,
      },
    });
    node.connect(this.master!);
    let dead = false;
    const kill = (): void => {
      if (dead) return;
      dead = true;
      try {
        node.disconnect();
      } catch {
        // Already gone.
      }
    };
    // The processor self-terminates (silence or lifespan) and pings us to
    // drop the node; the timer is a belt-and-suspenders backstop.
    node.port.onmessage = kill;
    setTimeout(kill, 11000);
  }

  // LEGACY VOICE (no-AudioWorklet fallback only): the original native-node
  // Karplus-Strong loop. Known detune: the DelayNode cycle adds one render
  // quantum of loop latency, so pitches land flat (see the header comment).
  private pluckLegacy(freq: number, strength: number): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const period = 1 / freq;
    const s = Math.min(1, Math.max(0.05, strength));

    // Excitation: one period of pre-softened noise, pluck-shaped window.
    const burstSamples = Math.max(8, Math.round(ctx.sampleRate * period));
    const buffer = ctx.createBuffer(1, burstSamples, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    const rise = Math.max(3, Math.round(burstSamples * 0.12));
    let smoothed = 0;
    let energy = 0;
    for (let i = 0; i < burstSamples; i++) {
      smoothed = smoothed * 0.86 + (Math.random() * 2 - 1) * 0.14;
      const fade =
        i < rise
          ? i / rise
          : Math.pow(1 - (i - rise) / (burstSamples - rise), 2);
      data[i] = smoothed * fade;
      energy += data[i] * data[i];
    }
    // Equal-loudness normalization referenced at 220Hz.
    const rms = Math.sqrt(energy / burstSamples) || 1e-6;
    const norm = Math.min(3, (0.5 / rms) * Math.sqrt(1 / 220 / period));
    for (let i = 0; i < burstSamples; i++) data[i] *= norm;
    // Pick-position comb (Jaffe-Smith EKS).
    const beta = 0.2 + Math.random() * 0.08;
    const combD = Math.max(1, Math.round(burstSamples * beta));
    for (let i = burstSamples - 1; i >= combD; i--) {
      data[i] -= 0.95 * data[i - combD];
    }
    const burst = ctx.createBufferSource();
    burst.buffer = buffer;

    // String: delay tuned to the period, one-pole lowpass in the loop
    // (monotone gain <= 1 at every frequency - a biquad's resonant peak
    // once made every pluck a growing self-oscillator).
    const delay = ctx.createDelay(Math.max(0.05, period * 2));
    delay.delayTime.value = period;
    const pole = 0.62 - 0.22 * s;
    const damping = ctx.createIIRFilter([1 - pole], [1, -pole]);
    const feedback = ctx.createGain();
    feedback.gain.value = Math.min(0.988, Math.pow(10, (-2 * period) / 1.4));

    // Envelope: attack is the loudest moment, two-stage decay.
    const out = ctx.createGain();
    const peak = 1.0 * s;
    out.gain.setValueAtTime(0.0001, now);
    out.gain.linearRampToValueAtTime(peak, now + 0.004);
    out.gain.exponentialRampToValueAtTime(peak * 0.14, now + 0.45);
    out.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);

    // Small direct tap so the first sound doesn't arrive a period late.
    const pick = ctx.createGain();
    pick.gain.value = 0.3;

    burst.connect(delay);
    burst.connect(pick);
    pick.connect(out);
    delay.connect(damping);
    damping.connect(feedback);
    feedback.connect(delay);
    damping.connect(out);
    out.connect(this.master!);

    // No explicit stop: the one-period buffer self-terminates (an explicit
    // stop raced the main thread and silenced notes - see git history).
    burst.start(now);

    // Tear the string down once the envelope has closed.
    setTimeout(() => {
      burst.disconnect();
      pick.disconnect();
      delay.disconnect();
      damping.disconnect();
      feedback.disconnect();
      out.disconnect();
    }, 1800);
  }
}
