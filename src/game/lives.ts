// K137 stage 3a, 4.32 LIVES (brief docs/design/K137_s3a.md): a chase with
// hearts. `lives` 0 is off (today's catches: a respawn, or a restart under
// minoRestart); 1..LIVES_MAX gives that many hearts. A catch costs one and
// does today's catch (a respawn at the entrance); the catch that takes the
// last heart restarts the level instead (main.ts restartSolve(true), the
// tallies carried) and refills them. While lives are on, minoRestart is
// ignored (the panel hides its row). Pure, so the rules test in Node.

// The slider's top and the panel's recommended setting.
export const LIVES_MAX = 5;
export const LIVES_RECOMMENDED = 3;

// The hearts a value gives: rounded and held to 0..LIVES_MAX; a
// non-finite value reads 0 (off).
export function livesOf(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.min(LIVES_MAX, Math.max(0, Math.round(v)));
}

// What a catch does with `hearts` left of `lives`: one fewer, or, when that
// was the last, a restart with the hearts refilled. Off (lives 0) never
// restarts and keeps 0.
export function loseHeart(lives: number, hearts: number): { hearts: number; restart: boolean } {
  const of = livesOf(lives);
  if (of === 0) return { hearts: 0, restart: false };
  const left = Math.min(of, Math.max(0, Math.round(hearts))) - 1;
  if (left <= 0) return { hearts: of, restart: true };
  return { hearts: left, restart: false };
}

// A catch's heart, as main.ts plays it: "off" (lives off: minoRestart
// decides), "spent" (one gone, today's respawn follows) or "restart" (the
// last one: the level starts over with every heart back).
export type HeartLoss = "off" | "spent" | "restart";
export function catchHeart(lives: number, hearts: number): { hearts: number; loss: HeartLoss } {
  if (livesOf(lives) === 0) return { hearts: 0, loss: "off" };
  const r = loseHeart(lives, hearts);
  return { hearts: r.hearts, loss: r.restart ? "restart" : "spent" };
}

// The toast a catch shows under lives: the hearts left, or the restart.
export function heartsToast(hearts: number, restart: boolean): string {
  if (restart) return "Out of hearts! Starting over.";
  return hearts === 1 ? "Caught! 1 heart left." : `Caught! ${hearts} hearts left.`;
}
