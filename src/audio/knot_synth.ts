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
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;

  // Must be called from a user gesture the first time, so the context is
  // allowed to start.
  private ensure(): AudioContext | null {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.55;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
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

    // Excitation: one period of pre-softened noise (one-pole smoothed, with
    // a fade envelope over the burst so there is no attack click).
    const burstSamples = Math.max(8, Math.round(ctx.sampleRate * period));
    const buffer = ctx.createBuffer(1, burstSamples, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let smoothed = 0;
    for (let i = 0; i < burstSamples; i++) {
      smoothed = smoothed * 0.7 + (Math.random() * 2 - 1) * 0.3;
      const fade = Math.sin((Math.PI * i) / burstSamples);
      data[i] = smoothed * fade;
    }
    const burst = ctx.createBufferSource();
    burst.buffer = buffer;

    // String: delay tuned to the period, dark lowpass damping in the
    // feedback, modest feedback so the note dies quickly on its own.
    const delay = ctx.createDelay(Math.max(0.05, period * 2));
    delay.delayTime.value = period;
    const damping = ctx.createBiquadFilter();
    damping.type = "lowpass";
    damping.frequency.value = 600 + s * 1400;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.92;

    // Envelope: fast soft attack, exponential decay, closed within ~1.1s.
    const out = ctx.createGain();
    const peak = 0.22 * s;
    out.gain.setValueAtTime(0.0001, now);
    out.gain.linearRampToValueAtTime(peak, now + 0.008);
    out.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);

    burst.connect(delay);
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
      delay.disconnect();
      damping.disconnect();
      feedback.disconnect();
      out.disconnect();
    }, 1400);
  }
}
