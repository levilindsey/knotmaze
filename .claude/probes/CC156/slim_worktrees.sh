#!/usr/bin/env bash
# slim_worktrees.sh: free disk without losing anything (CC156). In each agent worktree that is merged into
# origin/master, has no tracked change and a last commit before CUTOFF, the TRACKED files under .claude/probes
# are marked skip-worktree and deleted from disk. Every one of them is in git; untracked files stay.
#   bash slim_worktrees.sh [max=40] [cutoff=2026-11-14]        DRY=1 lists only
# Undo in one worktree:
#   git ls-files -v -z -- .claude/probes | grep -z '^S ' | cut -z -c3- | git update-index -z --no-skip-worktree --stdin
#   git checkout -- .claude/probes
MAX=${1:-40}; CUTOFF=${2:-2026-11-14}
ROOT=/c/Users/lsl/Repositories/knotmaze/.claude/worktrees
n=0
for d in $(ls -1tr "$ROOT"); do
  D="$ROOT/$d"; [ -e "$D/.git" ] || continue
  [ "$n" -ge "$MAX" ] && break
  cd "$D" || continue
  when=$(git log -1 --format=%cs 2>/dev/null) || continue
  [[ "$when" < "$CUTOFF" ]] || continue
  git merge-base --is-ancestor HEAD origin/master 2>/dev/null || continue
  [ -z "$(git status --porcelain --untracked-files=no 2>/dev/null | head -1)" ] || continue
  [ -n "$(git ls-files -v -- .claude/probes | grep -m1 '^H ')" ] || continue   # nothing left to slim
  if [ -n "$DRY" ]; then echo "would slim $d ($when)"; n=$((n+1)); continue; fi
  git ls-files -z -- .claude/probes > "$TEMP/slim_list.bin"
  git update-index -z --skip-worktree --stdin < "$TEMP/slim_list.bin" && xargs -0 rm -f < "$TEMP/slim_list.bin"
  echo "slimmed $d ($when) $(tr -cd '\0' < "$TEMP/slim_list.bin" | wc -c) files"
  n=$((n+1))
done
echo "done: $n worktrees"
