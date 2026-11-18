# K1482 s3: per-site difference of two mirror_tiles.ts outputs (ink > 0.5 flips, label flips over cov > 0.5).
#   python mt_diff.py <a.json> <b.json> [min=1]   -> sites with flips, sorted by ink flips
import json, sys
A = json.load(open(sys.argv[1])); B = json.load(open(sys.argv[2])); mn = int(sys.argv[3]) if len(sys.argv) > 3 else 1
rows = []
for k in A:
    if k not in B: continue
    pa, pb = A[k]['px'], B[k]['px']
    ink = sum(1 for a, b in zip(pa, pb) if (a[0] > 0.5) != (b[0] > 0.5))
    inkA = sum(1 for a, b in zip(pa, pb) if a[0] > 0.5 and b[0] <= 0.5)
    lab = sum(1 for a, b in zip(pa, pb) if a[1] > 0.5 and b[1] > 0.5 and a[2] != b[2])
    if ink >= mn or lab >= mn: rows.append((ink, inkA, lab, k))
rows.sort(reverse=True)
print(f"sites with flips: {len(rows)}  (ink flips total {sum(r[0] for r in rows)}, label flips total {sum(r[2] for r in rows)})")
for ink, inkA, lab, k in rows: print(f"{k:6s} ink {ink:4d} (a-only {inkA:4d})  label {lab:4d}")
