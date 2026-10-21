// K137 stage 3c (4.29): SPRINT, once per attempt under a chase (free
// play; brief docs/design/K137_s3c.md, design docs/design/K137_s3b.md's
// "Sprint (4.29)"). Pure: the modes, the button's state machine and its key.
// The clocks hold the mechanics:
// - turn clock (TurnMinotaur.turn(edge, {sprint: "skip"})): two player
//   moves make one minotaur turn. The first sprinted move is a skipped turn
//   (it stands; contact against where it stands); the second plays one
//   turn. By length that turn travels for half the pair's summed length
//   (s3a call 5, as designed), so a sprint halves its travel per move.
// - real time (MinotaurChase.sprint()): the next two departures run at
//   twice playerPace.
// main.ts holds the state: refilled by every restartChase (a level restart,
// a Reset path, the scene build), spent by a catch mid-sprint.

export const SPRINT_MODES = ["off", "on"] as const;
export type SprintMode = (typeof SPRINT_MODES)[number];

// ready: not used yet; armed: the next run sprints (real time: the chase
// holds two sprinted departures); first: the turn clock's first sprinted
// move is made, the second is next; used: spent for this attempt.
export type SprintState = "ready" | "armed" | "first" | "used";

// The button or the key: ready arms, armed disarms (the turn clock, before
// its first move; real time spends it at once, so there is no disarm),
// first and used keep their state.
export function sprintToggle(s: SprintState, realtime: boolean): SprintState {
  if (s === "ready") return "armed";
  if (s === "armed" && !realtime) return "ready";
  return s;
}

// The turn clock after an accepted move (a run, or a wait: `run` false).
// The minotaur's answer decides: a catch or a win spends the sprint.
// Returns the state and whether this move is the sprint's skipped turn.
export function sprintAfterMove(
  s: SprintState,
  run: boolean
): { skip: boolean; next: (r: "moved" | "caught" | "win") => SprintState } {
  if (s === "armed" && run) {
    return { skip: true, next: (r) => (r === "moved" ? "first" : "used") };
  }
  if (s === "first") return { skip: false, next: () => "used" };
  // An armed sprint stays armed through a wait, but a catch spends it (as
  // the real-time chase's respawn does).
  if (s === "armed") return { skip: false, next: (r) => (r === "caught" ? "used" : s) };
  return { skip: false, next: () => s };
}

// The HUD row's value: ready, armed, "1 more move" (between the turn
// clock's two moves; real time: running) or used.
export function sprintValue(s: SprintState, realtime = false): string {
  if (s === "first") return realtime ? "running" : "1 more move";
  return s;
}

// The key: F (by `key`, so it follows the layout). Not X, Esc, U, Z, Q
// (WASD read by code put A where AZERTY prints Q), WASD, the arrows, `.`
// or Space (s3a's list), nor C or H (the aids) or G (the walker's Go).
export function sprintKeyOf(e: { key: string }): boolean {
  return e.key === "f" || e.key === "F";
}
