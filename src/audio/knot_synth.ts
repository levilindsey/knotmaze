// Knot-as-instrument: Karplus-Strong plucked strings built from native
// WebAudio nodes (noise burst into a tuned feedback delay with lowpass
// damping). Each strand's pitch comes from its loop length - long loops
// ring low - quantized to a pentatonic scale so multi-strand knots stay
// musical.

const PENTATONIC = [0, 3, 5, 7, 10];
const BASE_FREQ = 110; // A2.
const SCALE_SPAN_STEPS = 20; // Pentatonic degrees spanned by the length map.
const MIN_LOOP = 6; // Lattice units mapped to the top of the range...
const MAX_LOOP = 260; // ...and the bottom.

export function pitchForLoopLength(length: number): number {
  const t = Math.min(
    1,
    Math.max(
      0,
      (Math.log(length) - Math.log(MIN_LOOP)) /
        (Math.log(MAX_LOOP) - Math.log(MIN_LOOP))
    )
  );
  const step = Math.round((1 - t) * SCALE_SPAN_STEPS);
  const octave = Math.floor(step / PENTATONIC.length);
  const degree = PENTATONIC[step % PENTATONIC.length];
  return BASE_FREQ * Math.pow(2, octave + degree / 12);
}

export class KnotSynth {
  private ctx: BaseAudioContext | null = null;
  private master: GainNode | null = null;
  // Master output level [0, 1]; the pre-synth default headroom was 0.85.
  private volume = 0.85;

  // An injected context (e.g. OfflineAudioContext) makes the synth
  // measurable: diag scripts render a pluck offline and inspect the
  // actual output envelope instead of trusting the node graph.
  private readonly provided: BaseAudioContext | null;

  constructor(provided: BaseAudioContext | null = null) {
    this.provided = provided;
  }

  // Diagnostics (window.__knotSynth): pluck count, context state, and a
  // master-bus analyser so probes can verify notes are actually AUDIBLE,
  // not just scheduled (the music-mode silent-note report).
  private analyser: AnalyserNode | null = null;
  private stats = { plucks: 0, lastFreq: 0 };

  // Live master volume; safe before the context exists (applied at ensure).
  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.value = this.volume;
  }

  // Must be called from a user gesture the first time, so the context is
  // allowed to start.
  private ensure(): BaseAudioContext | null {
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
      wet.gain.value = 0.17;
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
          peak,
        };
      };
    }
    if (this.ctx instanceof AudioContext && this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  // strength in [0, 1] scales loudness and brightness.
  pluck(freq: number, strength: number): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    this.stats.plucks++;
    this.stats.lastFreq = freq;

    const now = ctx.currentTime;
    const period = 1 / freq;
    const s = Math.min(1, Math.max(0.05, strength));

    // Excitation: one period of pre-softened noise. The window is
    // pluck-shaped - near-instant rise, then decay across the burst - so
    // the transient leads; a symmetric fade here makes the whole note
    // swell instead of snap.
    // HARP VOICE (user-tuned): a much DARKER excitation than before -
    // heavier pre-smoothing and a gentler rise - reads as a fingertip on
    // a gut string instead of a snapped rubber band.
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
    // EQUAL-LOUDNESS normalization: the burst is one period long, so low
    // notes inject far more total energy than high ones (the classic
    // Karplus loudness skew - heard as inconsistent pluck volume).
    // Normalize to a constant total excitation energy, referenced at
    // 220Hz, with a clamp so extreme pitches stay sane.
    const rms = Math.sqrt(energy / burstSamples) || 1e-6;
    const norm = Math.min(
      3,
      (0.5 / rms) * Math.sqrt((1 / 220) / period)
    );
    for (let i = 0; i < burstSamples; i++) data[i] *= norm;
    // PICK-POSITION comb (Jaffe-Smith EKS): subtract a beta-period-
    // delayed copy of the excitation. Without it every harmonic rings at
    // full strength - the "rubber band" twang; with it the spectrum gets
    // the notches of a finger plucking partway along a real string.
    // Beta wanders a little per pluck, like a hand does.
    const beta = 0.2 + Math.random() * 0.08;
    const combD = Math.max(1, Math.round(burstSamples * beta));
    for (let i = burstSamples - 1; i >= combD; i--) {
      data[i] -= 0.95 * data[i - combD];
    }
    const burst = ctx.createBufferSource();
    burst.buffer = buffer;

    // String: delay tuned to the period, with a ONE-POLE lowpass in the
    // loop. The filter must have monotone gain <= 1 at EVERY frequency:
    // a biquad lowpass here (WebAudio Q is in dB; the default is +1dB of
    // resonant peak) pushed loop gain past unity and every pluck was an
    // exponentially GROWING self-oscillator - heard as a clipping
    // crescendo chopped off by the teardown timer.
    const delay = ctx.createDelay(Math.max(0.05, period * 2));
    delay.delayTime.value = period;
    // Warmer loop than the old 0.5 - 0.28s: more high-frequency damping
    // per pass keeps the sustain ROUND (harp body, not wire).
    const pole = 0.62 - 0.22 * s;
    const damping = ctx.createIIRFilter([1 - pole], [1, -pole]);
    // Per-pass gain set for pitch-uniform ring time (about -40dB of loop
    // energy by 1.4s - harps ring longer); the clamp keeps high notes
    // strictly decaying.
    const feedback = ctx.createGain();
    feedback.gain.value = Math.min(
      0.988,
      Math.pow(10, (-2 * period) / 1.4)
    );

    // Envelope: plucked-string shape - the attack IS the loudest moment
    // (2ms rise), then a fast two-stage decay: drop to ~8% within 250ms,
    // tail closed by 700ms.
    const out = ctx.createGain();
    const peak = 1.0 * s;
    out.gain.setValueAtTime(0.0001, now);
    out.gain.linearRampToValueAtTime(peak, now + 0.004);
    out.gain.exponentialRampToValueAtTime(peak * 0.14, now + 0.45);
    out.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);

    // The excitation also taps straight to the output (through a small
    // "pick" gain): via the loop alone the first sound arrives one delay
    // period late and pre-darkened. Kept LOW - the loud raw tap was most
    // of the rubber-band snap.
    const pick = ctx.createGain();
    pick.gain.value = 0.3;

    burst.connect(delay);
    burst.connect(pick);
    pick.connect(out);
    delay.connect(damping);
    damping.connect(feedback);
    feedback.connect(delay);
    damping.connect(out);
    out.connect(this.master);

    // No explicit stop: the one-period buffer self-terminates. An explicit
    // stop(now + period*2) was a 4-8ms window measured against a MAIN-
    // thread currentTime - any frame stall past it (and every auto-pluck
    // wakes the physics into 10-30ms frames) clamped the stop to at-or-
    // before the start, so the burst never fired and the string was born
    // silent (measured: 12/22 music notes audible; 22/22 after).
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
