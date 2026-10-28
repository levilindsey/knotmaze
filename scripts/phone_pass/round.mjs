// round.mjs: the bisect kit's view of a round folder (shared by bisect2.mjs, report_scan.mjs and pdiff.mjs; not run directly).
//
// A round folder is untracked (<repo>/.claude/probes/rounds/<name>/ of the main checkout). It holds one folder per pass
// (s1, d1, e1, ...), a pool/<sha>/ of builds (build_pool.ps1) and round.json, whose list fields are read here:
//   "base":    full sha of list index 0 (the commit before the first one scanned)
//   "head":    full sha of the last list index
//   "commits": a file in the round folder with one full sha per line; line n is list index n, so the list is
//              [base, ...lines, head] and head's index is the line count + 1
// bisect2.mjs's own fields (steps, confirms, confirmLinks) are in its header.
// Paths derive from this file's location (the repo root is two folders up), so the copy in a worktree reads that
// worktree's commits and runs that worktree's scripts.
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const fwd = (p) => p.replace(/\\/g, "/");
export const REPO = fwd(resolve(dirname(fileURLToPath(import.meta.url)), "..", ".."));
const git = (...a) => execFileSync("git", ["-C", REPO, ...a], { encoding: "utf8" }).trim();

export function loadRound(dirArg) {
  if (!dirArg || dirArg.startsWith("--")) throw new Error("the round folder is the first argument (the folder with round.json)");
  const dir = fwd(resolve(dirArg));
  const cfg = existsSync(dir + "/round.json") ? JSON.parse(readFileSync(dir + "/round.json", "utf8")) : {};
  const lines = cfg.commits && existsSync(dir + "/" + cfg.commits) ? readFileSync(dir + "/" + cfg.commits, "utf8").split(/\r?\n/).filter(Boolean) : [];
  const list = [cfg.base, ...lines, cfg.head];
  const full = (i) => list[i];
  const short = (i) => String(list[i]).slice(0, 8);
  // The list index of a sha prefix, or -1 (the pass folders record 8-character shas).
  const idxOf = (sha) => list.findIndex((s) => s && String(s).startsWith(String(sha).slice(0, 8)));
  // A list index or a sha / ref -> the full sha.
  const resolveRef = (v) => (typeof v === "number" ? list[v] : git("rev-parse", "--verify", `${v}^{commit}`));
  const subj = (sha) => { try { return git("log", "-1", "--format=%s", sha).slice(0, 90); } catch { return ""; } };
  return { dir, cfg, list, full, short, idxOf, resolveRef, subj };
}

// The params two runs parsed to (each run records the page's __knotParams()): the keys whose value changed in both,
// and the keys present on one side only. Both empty = the same maze.
export function paramDiff(a, b) {
  if (!a || !b) return null;
  const ch = [], add = [];
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = JSON.stringify(a[k]), y = JSON.stringify(b[k]);
    if (x === y) continue;
    if (a[k] === undefined || b[k] === undefined) add.push(k); else ch.push(`${k}:${x}>${y}`);
  }
  return { ch, add };
}
