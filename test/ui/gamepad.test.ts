import { describe, expect, it } from "vitest";
import {
  buttonDown,
  confirmDown,
  dpadDirs,
  GamepadInput,
  gamepadDirs,
  STICK_DEADZONE,
  stickDirs,
} from "../../src/ui/gamepad";
import type { GamepadSnapshot, PadButton } from "../../src/ui/gamepad";
import { HeldKeys, MoveWait, queuedPressHeld } from "../../src/ui/key_moves";

// K499: the gamepad's pure mapping - the d-pad and left stick name the
// directions the arrow keys do, A/confirm is an edge, and a poll turns
// snapshots into press/release edges for main.ts's key machinery.

const btn = (pressed: boolean): PadButton => ({ pressed });
const pad = (o: { dpad?: number[]; axes?: number[]; a?: boolean } = {}): GamepadSnapshot => {
  const buttons: PadButton[] = Array.from({ length: 16 }, () => btn(false));
  for (const i of o.dpad ?? []) buttons[i] = btn(true);
  if (o.a) buttons[0] = btn(true);
  return { axes: o.axes ?? [0, 0], buttons };
};

describe("stickDirs", () => {
  it("names nothing inside the radial deadzone", () => {
    expect(stickDirs(0, 0)).toEqual([]);
    expect(stickDirs(0.2, 0.2)).toEqual([]); // magnitude 0.28 < 0.35
    expect(stickDirs(STICK_DEADZONE - 0.01, 0)).toEqual([]);
    expect(stickDirs(Number.NaN, 1)).toEqual([]);
    expect(stickDirs(1, Number.POSITIVE_INFINITY)).toEqual([]);
  });

  it("names the four cardinals on their axes (screen y down)", () => {
    expect(stickDirs(1, 0)).toEqual(["right"]);
    expect(stickDirs(0, 1)).toEqual(["down"]);
    expect(stickDirs(-1, 0)).toEqual(["left"]);
    expect(stickDirs(0, -1)).toEqual(["up"]);
  });

  it("quantizes to eight sectors: within 22.5 deg of an axis is its cardinal", () => {
    const at = (deg: number): [number, number] => [
      Math.cos((deg * Math.PI) / 180),
      Math.sin((deg * Math.PI) / 180),
    ];
    expect(stickDirs(...at(20))).toEqual(["right"]);
    expect(stickDirs(...at(25))).toEqual(["right", "down"]);
    expect(stickDirs(...at(-45))).toEqual(["right", "up"]);
    expect(stickDirs(...at(135))).toEqual(["left", "down"]);
    expect(stickDirs(...at(-135))).toEqual(["left", "up"]);
    // Just past the deadzone the direction already reads.
    expect(stickDirs(0.3, -0.3)).toEqual(["right", "up"]);
  });

  it("honors a custom deadzone", () => {
    expect(stickDirs(0.5, 0, 0.6)).toEqual([]);
    expect(stickDirs(0.5, 0, 0.4)).toEqual(["right"]);
  });
});

describe("dpadDirs", () => {
  it("reads the standard mapping's d-pad buttons", () => {
    expect(dpadDirs(pad({ dpad: [12] }).buttons)).toEqual(["up"]);
    expect(dpadDirs(pad({ dpad: [13] }).buttons)).toEqual(["down"]);
    expect(dpadDirs(pad({ dpad: [14] }).buttons)).toEqual(["left"]);
    expect(dpadDirs(pad({ dpad: [15] }).buttons)).toEqual(["right"]);
    expect(dpadDirs(pad({ dpad: [12, 15] }).buttons)).toEqual(["up", "right"]);
    expect(dpadDirs(pad().buttons)).toEqual([]);
  });

  it("opposite buttons cancel, and a short button array is safe", () => {
    expect(dpadDirs(pad({ dpad: [12, 13] }).buttons)).toEqual([]);
    expect(dpadDirs(pad({ dpad: [14, 15] }).buttons)).toEqual([]);
    expect(dpadDirs([])).toEqual([]);
    expect(buttonDown(true)).toBe(true);
    expect(buttonDown(undefined)).toBe(false);
  });
});

describe("gamepadDirs / confirmDown", () => {
  it("unions d-pad and stick, one entry per direction", () => {
    expect(gamepadDirs(pad({ dpad: [12], axes: [0, -1] }))).toEqual(["up"]);
    expect(gamepadDirs(pad({ dpad: [12], axes: [1, 0] }))).toEqual(["up", "right"]);
    expect(gamepadDirs(pad({ axes: [0.1, 0] }))).toEqual([]); // in the deadzone
    expect(confirmDown(pad({ a: true }))).toBe(true);
    expect(confirmDown(pad())).toBe(false);
    expect(confirmDown({ axes: [], buttons: [] })).toBe(false);
  });
});

describe("GamepadInput", () => {
  it("turns a held direction into one press and one release edge", () => {
    const g = new GamepadInput();
    expect(g.poll(pad({ dpad: [15] }))).toMatchObject({
      pressed: ["right"],
      released: [],
      confirm: false,
      dirs: ["right"],
    });
    expect(g.poll(pad({ dpad: [15] }))).toMatchObject({ pressed: [], released: [] });
    // Sliding to a diagonal adds its second direction only.
    expect(g.poll(pad({ axes: [1, -1] }))).toMatchObject({
      pressed: ["up"],
      released: [],
      dirs: ["right", "up"],
    });
    expect(g.poll(pad())).toMatchObject({ released: ["right", "up"], dirs: [] });
  });

  it("a direction tapped and released between polls leaves both edges in order", () => {
    const g = new GamepadInput();
    g.poll(pad({ dpad: [12] }));
    const ev = g.poll(pad());
    expect(ev.pressed).toEqual([]);
    expect(ev.released).toEqual(["up"]);
    expect(g.dirs).toEqual([]);
  });

  it("A/confirm is an edge: down once, not again until it comes up", () => {
    const g = new GamepadInput();
    expect(g.poll(pad({ a: true })).confirm).toBe(true);
    expect(g.poll(pad({ a: true })).confirm).toBe(false);
    expect(g.poll(pad()).confirm).toBe(false);
    expect(g.poll(pad({ a: true })).confirm).toBe(true);
  });

  it("an unplugged pad (null) releases everything and confirms nothing", () => {
    const g = new GamepadInput();
    g.poll(pad({ dpad: [13], a: true }));
    expect(g.poll(null)).toMatchObject({ released: ["down"], confirm: false, dirs: [] });
    expect(g.poll(null)).toMatchObject({ pressed: [], released: [] });
    // And it can press again when it returns.
    expect(g.poll(pad({ dpad: [13] })).pressed).toEqual(["down"]);
  });
});

// The held-at-arrival contract through main.ts's own machinery: a
// pressed direction registers in HeldKeys and its mid-move press queues
// in MoveWait; queuedPressHeld judges it on the arrival frame from
// those held entries (key_moves.test.ts's Levi's-correction harness).
describe("K499 edges feed the held-at-arrival rule", () => {
  const travels = { moving: true, absorbed: false, ambiguous: () => false };
  const rig = () => {
    const g = new GamepadInput();
    const held = new HeldKeys();
    const w = new MoveWait();
    const apply = (snap: GamepadSnapshot | null, at: number): void => {
      const ev = g.poll(snap);
      for (const d of ev.released) held.release(`game:${d}`);
      for (const d of ev.pressed) {
        if (held.press(`game:${d}`, d, at)) w.press(d, at, travels);
      }
    };
    const arrival = (): "taken" | "discarded" => {
      const wasQueued = w.waiting?.queued ?? false;
      const due = w.step(10_000, false, () => false);
      if (due === null || due === "wait") return "discarded";
      return queuedPressHeld(
        { dirs: due.dirs, at: due.at, queued: wasQueued, edge: due.edge, wait: due.wait },
        (d) => held.holds(d)
      )
        ? "taken"
        : "discarded";
    };
    return { apply, arrival };
  };

  it("a direction tapped mid-move and released before arrival is discarded", () => {
    const r = rig();
    r.apply(pad({ axes: [0, -1] }), 0); // Flicked up mid-move...
    r.apply(pad(), 60); // ...and released before the dot arrives.
    expect(r.arrival()).toBe("discarded");
  });

  it("a direction still held at arrival continues", () => {
    const r = rig();
    r.apply(pad({ axes: [0, -1] }), 0);
    expect(r.arrival()).toBe("taken");
  });
});
