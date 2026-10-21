import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clampPan, KnotSynth, soundIsOn } from "../../src/audio/knot_synth";

// K526: the pan control's clamp - a StereoPanner value in [-1, 1];
// garbage pans center.
describe("clampPan (K526)", () => {
  it("clamps to [-1, 1] and centers garbage", () => {
    expect(clampPan(-2)).toBe(-1);
    expect(clampPan(-0.25)).toBe(-0.25);
    expect(clampPan(0)).toBe(0);
    expect(clampPan(0.75)).toBe(0.75);
    expect(clampPan(3)).toBe(1);
    expect(clampPan(NaN)).toBe(0);
    expect(clampPan(Infinity)).toBe(0);
  });
});

// K720: with sound off (muted, or sound mode none) no AudioContext exists
// until something plays with sound on. A fake AudioContext counts its
// constructions and resume() calls; a fake window carries the autoplay
// gate's listeners and fires trusted inputs at them. Node has no
// AudioWorkletNode, so the synth plays its legacy voice.

function fakeParam() {
  return {
    value: 0,
    setValueAtTime: () => undefined,
    linearRampToValueAtTime: () => undefined,
    exponentialRampToValueAtTime: () => undefined,
  };
}

function fakeNode() {
  return {
    gain: fakeParam(),
    frequency: fakeParam(),
    Q: fakeParam(),
    delayTime: fakeParam(),
    pan: fakeParam(),
    type: "",
    buffer: null as unknown,
    fftSize: 2048,
    onended: null as unknown,
    connect: () => undefined,
    disconnect: () => undefined,
    start: () => undefined,
    getFloatTimeDomainData: (buf: Float32Array) => buf.fill(0),
  };
}

class FakeAudioContext {
  static constructed = 0;
  static resumes = 0;
  // The state a new context starts in, and whether resume() starts it
  // (false: iOS refusing a resume outside a gesture).
  static initialState: "running" | "suspended" = "running";
  static resumeRuns = true;
  state: "running" | "suspended" | "closed";
  sampleRate = 8000;
  currentTime = 0;
  destination = fakeNode();
  constructor() {
    FakeAudioContext.constructed++;
    this.state = FakeAudioContext.initialState;
  }
  resume(): Promise<void> {
    FakeAudioContext.resumes++;
    if (FakeAudioContext.resumeRuns) this.state = "running";
    return Promise.resolve();
  }
  createGain = fakeNode;
  createBiquadFilter = fakeNode;
  createConvolver = fakeNode;
  createAnalyser = fakeNode;
  createBufferSource = fakeNode;
  createDelay = fakeNode;
  createIIRFilter = fakeNode;
  createStereoPanner = fakeNode;
  createBuffer(channels: number, length: number) {
    const data = Array.from({ length: channels }, () => new Float32Array(length));
    return {
      duration: length / this.sampleRate,
      getChannelData: (c: number) => data[c]!,
    };
  }
  decodeAudioData(): Promise<AudioBuffer> {
    return Promise.resolve({ duration: 0.9 } as AudioBuffer);
  }
}

interface FakeWindow {
  addEventListener(t: string, fn: (e: Event) => void): void;
  removeEventListener(t: string, fn: (e: Event) => void): void;
  // Fires an input at the listeners (trusted unless said otherwise).
  fire(type: string, pointerType?: string, isTrusted?: boolean): void;
  listeners(): number;
  __knotSynth?: () => { plucks: number; samples: number; state: string };
}

function fakeWindow(): FakeWindow {
  const map = new Map<string, Set<(e: Event) => void>>();
  return {
    addEventListener(t, fn) {
      let set = map.get(t);
      if (!set) map.set(t, (set = new Set()));
      set.add(fn);
    },
    removeEventListener(t, fn) {
      map.get(t)?.delete(fn);
    },
    fire(type, pointerType = "mouse", isTrusted = true) {
      const e = { type, pointerType, isTrusted } as unknown as Event;
      for (const fn of [...(map.get(type) ?? [])]) fn(e);
    },
    listeners() {
      let n = 0;
      for (const set of map.values()) n += set.size;
      return n;
    },
  };
}

describe("sound off opens no audio (K720)", () => {
  let win: FakeWindow;
  const setting = { muted: false, soundMode: "music" };
  const made = (): number => FakeAudioContext.constructed;
  const resumed = (): number => FakeAudioContext.resumes;

  beforeEach(() => {
    vi.useFakeTimers(); // The legacy voice tears itself down on a timer.
    FakeAudioContext.constructed = 0;
    FakeAudioContext.resumes = 0;
    FakeAudioContext.initialState = "running";
    FakeAudioContext.resumeRuns = true;
    setting.muted = false;
    setting.soundMode = "music"; // The default sound mode.
    win = fakeWindow();
    vi.stubGlobal("window", win);
    vi.stubGlobal("navigator", {}); // No userActivation: the event list decides.
    vi.stubGlobal("AudioContext", FakeAudioContext);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  // A synth wired as app/auto_audio.ts wires it.
  function synth(): KnotSynth {
    const s = new KnotSynth();
    s.setSoundOn(() => soundIsOn(setting.muted, setting.soundMode));
    return s;
  }

  it("soundIsOn: mute or sound mode none is off; every other mode is on", () => {
    expect(soundIsOn(false, "music")).toBe(true);
    expect(soundIsOn(false, "manual")).toBe(true);
    expect(soundIsOn(false, "random")).toBe(true);
    expect(soundIsOn(false, "none")).toBe(false);
    expect(soundIsOn(true, "music")).toBe(false);
    expect(soundIsOn(true, "none")).toBe(false);
  });

  it("under none, opening the gate and plucking construct no context", () => {
    setting.soundMode = "none";
    const s = synth();
    win.fire("mousedown");
    win.fire("pointerup", "touch");
    win.fire("touchend");
    win.fire("keydown");
    s.pluck(220, 0.55);
    s.pluck(330, 0.62, 1.5, true);
    expect(s.open()).toBe(false);
    expect(s.audioTime()).toBeNull();
    expect(s.playSample({ duration: 0.9 } as AudioBuffer, 0.5)).toBe(false);
    expect(made()).toBe(0);
    expect(resumed()).toBe(0);
    expect(win.__knotSynth).toBeUndefined();
  });

  it("under mute, opening the gate and plucking construct no context", () => {
    setting.muted = true;
    const s = synth();
    win.fire("mousedown");
    win.fire("pointerup", "touch");
    s.pluck(220, 0.55);
    expect(s.open()).toBe(false);
    expect(made()).toBe(0);
    expect(resumed()).toBe(0);
  });

  it("turning sound on, then a pluck, constructs exactly one context", () => {
    setting.soundMode = "none";
    const s = synth();
    win.fire("mousedown");
    s.pluck(220, 0.55);
    expect(made()).toBe(0);
    setting.soundMode = "manual"; // The panel; no gesture of its own.
    s.pluck(220, 0.55);
    expect(made()).toBe(1);
    expect(s.audioTime()).toBe(0); // Running.
    s.pluck(330, 0.55);
    win.fire("mousedown");
    expect(made()).toBe(1);
    expect(win.__knotSynth!().plucks).toBe(2);
  });

  it("unmuting, then a song note (open), constructs exactly one context", () => {
    setting.muted = true;
    const s = synth();
    win.fire("keydown");
    expect(made()).toBe(0);
    setting.muted = false;
    expect(s.open()).toBe(true); // Music mode's tick, before audioTime().
    expect(made()).toBe(1);
    expect(s.audioTime()).toBe(0);
    expect(s.open()).toBe(true);
    expect(made()).toBe(1);
  });

  it("the default mode constructs one at the first touch, inside its gesture", () => {
    FakeAudioContext.initialState = "suspended";
    const s = synth();
    s.pluck(220, 0.62); // Before the gate: a silent no-op.
    expect(s.open()).toBe(false);
    win.fire("pointerdown", "touch"); // A touch press is no activation.
    expect(made()).toBe(0);
    win.fire("pointerup", "touch");
    expect(made()).toBe(1);
    expect(resumed()).toBe(1);
    expect(s.audioTime()).toBe(0);
    win.fire("pointerup", "touch");
    expect(made()).toBe(1);
  });

  it("an untrusted input opens nothing", () => {
    const s = synth();
    win.fire("mousedown", "mouse", false);
    win.fire("keydown", "", false);
    s.pluck(220, 0.55);
    expect(made()).toBe(0);
  });

  it("with sound off, a context that exists plays nothing", () => {
    const s = synth();
    win.fire("mousedown");
    expect(made()).toBe(1);
    s.pluck(220, 0.55);
    expect(win.__knotSynth!().plucks).toBe(1);
    setting.muted = true;
    s.pluck(220, 0.55);
    expect(s.playSample({ duration: 0.9 } as AudioBuffer, 0.5)).toBe(false);
    setting.muted = false;
    setting.soundMode = "none";
    s.pluck(220, 0.55);
    expect(win.__knotSynth!().plucks).toBe(1);
    expect(win.__knotSynth!().samples).toBe(0);
    expect(made()).toBe(1);
  });

  it("the gate's listeners stay while sound is off and go once a context runs", () => {
    setting.soundMode = "none";
    synth();
    expect(win.listeners()).toBe(5);
    win.fire("mousedown");
    expect(win.listeners()).toBe(5);
    setting.soundMode = "music";
    win.fire("keydown");
    expect(made()).toBe(1);
    expect(win.listeners()).toBe(0);
  });

  it("a context made outside a gesture and refused a resume runs at the next input (iOS)", () => {
    FakeAudioContext.initialState = "suspended";
    FakeAudioContext.resumeRuns = false;
    setting.soundMode = "none";
    const s = synth();
    win.fire("mousedown"); // The gate opens; sound is off.
    setting.soundMode = "random";
    s.pluck(220, 0.55); // An auto pluck, outside any gesture.
    expect(made()).toBe(1);
    expect(resumed()).toBe(1);
    expect(s.audioTime()).toBeNull(); // Still suspended.
    expect(win.listeners()).toBe(5);
    FakeAudioContext.resumeRuns = true; // Inside a gesture, a resume works.
    win.fire("pointerup", "touch");
    expect(resumed()).toBe(2);
    expect(s.audioTime()).toBe(0);
    expect(win.listeners()).toBe(0);
    expect(made()).toBe(1);
  });

  it("whenOpen waits for a context, not for the gate", () => {
    setting.soundMode = "none";
    const s = synth();
    let ran = 0;
    s.whenOpen(() => ran++);
    win.fire("keydown");
    expect(ran).toBe(0);
    setting.soundMode = "music";
    expect(s.open()).toBe(true);
    expect(ran).toBe(1);
    s.whenOpen(() => ran++); // A context exists: at once.
    expect(ran).toBe(2);
  });

  it("decodeSample: null while no context may be made, never once one exists", async () => {
    setting.soundMode = "none";
    const s = synth();
    win.fire("keydown");
    expect(await s.decodeSample(new ArrayBuffer(8))).toBeNull();
    expect(made()).toBe(0);
    setting.soundMode = "manual";
    s.pluck(220, 0.55);
    setting.soundMode = "none";
    expect(await s.decodeSample(new ArrayBuffer(8))).not.toBeNull();
    expect(made()).toBe(1);
  });

  it("a page with sticky activation starts with the gate open but no context", () => {
    vi.stubGlobal("navigator", {
      userActivation: { isActive: false, hasBeenActive: true },
    });
    setting.soundMode = "none";
    const s = synth();
    s.pluck(220, 0.55);
    expect(made()).toBe(0);
    setting.soundMode = "music";
    expect(s.open()).toBe(true); // No input needed: the gate is open.
    expect(made()).toBe(1);
  });

  it("with userActivation, its transient flag decides at the input", () => {
    const ua = { isActive: false, hasBeenActive: false };
    vi.stubGlobal("navigator", { userActivation: ua });
    synth();
    win.fire("mousedown"); // Not active (say, a synthetic-looking press).
    expect(made()).toBe(0);
    ua.isActive = true;
    ua.hasBeenActive = true;
    win.fire("pointerup", "touch");
    expect(made()).toBe(1);
  });

  it("an injected context needs no gate and constructs nothing", async () => {
    const provided = new FakeAudioContext();
    FakeAudioContext.constructed = 0;
    const s = new KnotSynth(provided as unknown as BaseAudioContext);
    expect(win.listeners()).toBe(0); // Never armed.
    s.pluck(220, 0.55);
    await s.whenReady();
    expect(made()).toBe(0);
    expect(win.__knotSynth!().plucks).toBe(1);
  });
});
