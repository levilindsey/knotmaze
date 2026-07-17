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

  // An injected context (e.g. OfflineAudioContext) makes the synth
  // measurable: diag scripts render a pluck offline and inspect the
  // actual output envelope instead of trusting the node graph.
  private readonly provided: BaseAudioContext | null;

  constructor(provided: BaseAudioContext | null = null) {
    this.provided = provided;
  }

  // Must be called from a user gesture the first time, so the context is
  // allowed to start.
  private ensure(): BaseAudioContext | null {
    if (!this.ctx) {
      this.ctx = this.provided ?? new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.55;
      this.master.connect(this.ctx.destination);
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

    const now = ctx.currentTime;
    const period = 1 / freq;
    const s = Math.min(1, Math.max(0.05, strength));

    // Excitation: one period of pre-softened noise. The window is
    // pluck-shaped - near-instant rise, then decay across the burst - so
    // the transient leads; a symmetric fade here makes the whole note
    // swell instead of snap.
    const burstSamples = Math.max(8, Math.round(ctx.sampleRate * period));
    const buffer = ctx.createBuffer(1, burstSamples, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    const rise = Math.max(2, Math.round(burstSamples * 0.06));
    let smoothed = 0;
    for (let i = 0; i < burstSamples; i++) {
      smoothed = smoothed * 0.6 + (Math.random() * 2 - 1) * 0.4;
      const fade =
        i < rise
          ? i / rise
          : Math.pow(1 - (i - rise) / (burstSamples - rise), 2);
      data[i] = smoothed * fade;
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
    const pole = 0.45 - 0.3 * s; // Higher strength = brighter pluck.
    const damping = ctx.createIIRFilter([1 - pole], [1, -pole]);
    // Per-pass gain set for pitch-uniform ring time (about -40dB of loop
    // energy by 0.9s); the clamp keeps high notes strictly decaying.
    const feedback = ctx.createGain();
    feedback.gain.value = Math.min(
      0.985,
      Math.pow(10, (-2 * period) / 0.9)
    );

    // Envelope: plucked-string shape - the attack IS the loudest moment
    // (2ms rise), then a fast two-stage decay: drop to ~8% within 250ms,
    // tail closed by 700ms.
    const out = ctx.createGain();
    const peak = 0.5 * s;
    out.gain.setValueAtTime(0.0001, now);
    out.gain.linearRampToValueAtTime(peak, now + 0.002);
    out.gain.exponentialRampToValueAtTime(peak * 0.08, now + 0.35);
    out.gain.exponentialRampToValueAtTime(0.0001, now + 1.0);

    // The excitation also taps straight to the output (through a small
    // "pick" gain): via the loop alone the first sound arrives one delay
    // period late and pre-darkened, which buries the attack transient.
    const pick = ctx.createGain();
    pick.gain.value = 0.9;

    burst.connect(delay);
    burst.connect(pick);
    pick.connect(out);
    delay.connect(damping);
    damping.connect(feedback);
    feedback.connect(delay);
    damping.connect(out);
    out.connect(this.master);

    burst.start(now);
    burst.stop(now + period * 2);

    // Tear the string down once the envelope has closed.
    setTimeout(() => {
      burst.disconnect();
      pick.disconnect();
      delay.disconnect();
      damping.disconnect();
      feedback.disconnect();
      out.disconnect();
    }, 1200);
  }
}
