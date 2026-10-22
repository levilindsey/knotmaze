// K793: a fixed slice of the settings panel (real labels, folders and
// options, tags in the style of src/ui/param_tags.ts) and the queries the
// search is held to. panel_search.test.ts runs them; the brief's library
// comparison (.claude/probes/K793/compare_libs.ts) runs the same set.
import type { PanelRowEntry } from "../../src/ui/panel_search";

export const ROWS: PanelRowEntry[] = [
  { id: "reducedMotion", label: "Reduced motion", folders: ["Accessibility"], tags: ["accessibility", "calm", "less animation", "still", "vestibular"] },
  { id: "highContrast", label: "High contrast", folders: ["Accessibility"], tags: ["accessibility", "visibility", "bold", "low vision", "readable"] },
  { id: "motion", label: "Motion", folders: ["Accessibility"], tags: ["animation", "movement", "system setting"], options: ["follow system", "full", "reduced"] },
  { id: "gridSize", label: "Grid size", folders: ["Design"], tags: ["gs", "maze size", "bigger", "smaller", "dimensions"] },
  { id: "weaveDensity", label: "Weave density", folders: ["Design"], tags: ["wd", "crossings", "over under", "busy"] },
  { id: "seed", label: "Seed", folders: ["Design"], tags: ["s", "random", "dice", "new maze", "reroll"] },
  { id: "btn:Daily", label: "Daily", folders: ["Design"], tags: ["today", "daily maze", "puzzle of the day"] },
  { id: "gameMode", label: "Game", folders: ["Game"], tags: ["gm", "mode", "chase", "race", "play"], options: ["Classic", "Burn race", "Minotaur"] },
  { id: "minotaur", label: "Behavior", folders: ["Game"], tags: ["mt", "monster", "bull", "chaser", "enemy"], options: ["Hunter", "Guard", "Stalker"] },
  { id: "fragile", label: "Fragile runs", folders: ["Game"], tags: ["fg", "break", "crack", "snap"], options: ["off", "crack", "snap"] },
  { id: "collapse", label: "Collapse", folders: ["Game"], tags: ["cl", "shrink", "fall"], options: ["off", "finish", "free"] },
  { id: "cut", label: "Cut", folders: ["Game"], tags: ["ct", "scissors", "snip", "shortcut"], options: ["off", "on", "lead", "delay"] },
  { id: "minoWanderPace", label: "Wander speed", folders: ["Game", "Minotaur tuning"], tags: ["mwp", "roam", "slow", "pace"] },
  { id: "minoHuntPace", label: "Hunt speed", folders: ["Game", "Minotaur tuning"], tags: ["mhp", "chase", "fast", "pace"] },
  { id: "minoSight", label: "Sight (runs)", folders: ["Game", "Minotaur tuning"], tags: ["msg", "see", "vision", "spot"] },
  { id: "fireSpeed", label: "Fire speed", folders: ["Game", "Burn race"], tags: ["fsp", "flame", "burn", "spread"] },
  { id: "fireDelay", label: "Fire delay", folders: ["Game", "Burn race"], tags: ["fdl", "head start", "wait"] },
  { id: "burnt", label: "Burnt look", folders: ["Game", "Burn race"], tags: ["fbt", "char", "ash", "gone"], options: ["gone", "char"] },
  { id: "trailLength", label: "Trail length", folders: ["Path & view"], tags: ["tl", "recent path", "memory", "tail"] },
  { id: "confettiAmount", label: "Confetti", folders: ["Path & view"], tags: ["cf", "celebration", "party", "win"] },
  { id: "btn:Reset path", label: "Reset path", folders: ["Path & view"], tags: ["restart", "start over", "clear path"] },
  { id: "minotaurIndicator", label: "Minotaur arrow", folders: ["Path & view", "Off-screen arrows"], tags: ["monster", "edge arrow", "indicator", "where"] },
  { id: "threadWidth", label: "Thread width", folders: ["Look"], tags: ["tw", "thick", "fat", "thin", "thread size"] },
  { id: "gap", label: "Crossing gap", folders: ["Look"], tags: ["gp", "over under", "spacing", "casing"] },
  { id: "colorScheme", label: "Colors", folders: ["Look"], tags: ["cs", "colour", "palette", "scheme", "hue"] },
  { id: "backgroundSpeed", label: "Backdrop speed", folders: ["Look", "Backdrop tuning"], tags: ["bgs", "background", "drift", "animation"] },
  { id: "pluckRipple", label: "pluckRipple", folders: ["Touch & feel"], tags: ["prp", "pluck look", "tap effect"], options: ["off", "wave", "glint", "ring"] },
  { id: "tugLimit", label: "tugLimit", folders: ["Touch & feel"], tags: ["tgl", "pull", "drag", "stretch"] },
  { id: "muted", label: "Muted", folders: ["Sound"], tags: ["mute", "quiet", "silence", "no sound"] },
  { id: "volume", label: "Volume", folders: ["Sound"], tags: ["vol", "loudness", "louder", "quieter"] },
  { id: "reverb", label: "Reverb", folders: ["Sound"], tags: ["rv", "echo", "room", "hall"] },
  { id: "soundMode", label: "Sound", folders: ["Sound"], tags: ["snd", "music", "audio"], options: ["none", "manual", "music"] },
  { id: "temperature", label: "Agitation", folders: ["Physics"], tags: ["wiggle", "jiggle", "shake", "noise", "temperature"] },
  { id: "slack", label: "Slack", folders: ["Physics"], tags: ["sl", "loose", "tight", "tension"] },
  { id: "stiffness", label: "Stiffness", folders: ["Physics"], tags: ["st", "rigid", "stiff", "floppy"] },
  { id: "showDebug", label: "Debug view", folders: ["Developer"], tags: ["dbg", "developer", "overlay"] },
  { id: "btn:Reset to defaults", label: "Reset to defaults", folders: [], tags: ["defaults", "factory", "clear all"] },
];

export interface QueryCase {
  q: string;
  /** What the query is for. */
  why: string;
  /** The best match (null: nothing matches). */
  top?: string | null;
  /** Rows that must match. */
  has?: string[];
  /** Rows that must not match. */
  not?: string[];
  /** The exact result order. */
  order?: string[];
}

export const QUERIES: QueryCase[] = [
  { q: "weave", why: "a label word", top: "weaveDensity" },
  { q: "Weave Density", why: "case is ignored", top: "weaveDensity" },
  { q: "density weave", why: "words in any order", top: "weaveDensity" },
  { q: "tw", why: "the link key, as a tag", top: "threadWidth" },
  { q: "thick", why: "a synonym tag", top: "threadWidth" },
  { q: "tempreature", why: "a swapped pair", top: "temperature" },
  { q: "minotuar", why: "a swapped pair", top: "minotaurIndicator", has: ["minotaur", "gameMode"] },
  { q: "mino", why: "a prefix", top: "minotaurIndicator", has: ["minoWanderPace", "minoHuntPace", "minoSight", "minotaur"] },
  { q: "hunter", why: "an option label", top: "minotaur" },
  { q: "stalker", why: "an option label", top: "minotaur" },
  { q: "speed", why: "an exact word never fuzzes", has: ["minoWanderPace", "minoHuntPace", "fireSpeed", "backgroundSpeed"], not: ["seed"] },
  { q: "seed", why: "an exact word never fuzzes", top: "seed", not: ["minoHuntPace", "fireSpeed"] },
  { q: "fire speed", why: "two label words", top: "fireSpeed", not: ["fireDelay"] },
  { q: "firespeed", why: "words run together", top: "fireSpeed" },
  { q: "fireSpeed", why: "the param name", top: "fireSpeed" },
  { q: "monster", why: "a tag on two rows: panel order", order: ["minotaur", "minotaurIndicator"] },
  { q: "wiggle", why: "a tag", top: "temperature" },
  { q: "agit", why: "a prefix of the label", top: "temperature" },
  { q: "xyzzy", why: "nothing", top: null },
  { q: "colour", why: "a spelling, as a tag", top: "colorScheme" },
  { q: "colr", why: "a missing letter in a prefix", top: "colorScheme" },
  { q: "sond", why: "a missing letter", top: "soundMode" },
  { q: "lenght", why: "a swapped pair", top: "trailLength" },
  { q: "volune", why: "a wrong letter", top: "volume" },
  { q: "volme", why: "a missing letter", top: "volume" },
  { q: "voluume", why: "an extra letter", top: "volume" },
  { q: "loud", why: "a tag prefix", top: "volume" },
  { q: "quiet", why: "an exact tag beats a longer one", top: "muted", has: ["volume"] },
  { q: "reset", why: "buttons", has: ["btn:Reset path", "btn:Reset to defaults"] },
  { q: "scissors", why: "what a row is, as a player sees it", top: "cut" },
  { q: "burn", why: "name > tag > option > folder", order: ["burnt", "fireSpeed", "gameMode", "fireDelay"] },
  { q: "pluck ripple", why: "a camelCase label", top: "pluckRipple" },
  { q: "wave", why: "an option; weave is not a typo of an exact word", top: "pluckRipple", not: ["weaveDensity"] },
  { q: "debug", why: "a label word", top: "showDebug" },
  { q: "daily", why: "a button", top: "btn:Daily" },
  { q: "random", why: "a tag", top: "seed" },
  { q: "gs", why: "a link key", top: "gridSize" },
  { q: "minotaur speed", why: "an AND across folder and label", has: ["minoWanderPace", "minoHuntPace"], not: ["fireSpeed", "backgroundSpeed", "minotaurIndicator"] },
  { q: "minotuar sight", why: "a typo AND a word", top: "minoSight" },
  { q: "guard", why: "an option label", top: "minotaur" },
  { q: "echo", why: "a synonym tag", top: "reverb" },
  { q: "accessibility", why: "ties keep panel order", order: ["reducedMotion", "highContrast", "motion"] },
  { q: "AGITATIÓN", why: "case and accents are ignored", top: "temperature" },
  { q: "sight (runs)", why: "punctuation separates words", top: "minoSight" },
];
