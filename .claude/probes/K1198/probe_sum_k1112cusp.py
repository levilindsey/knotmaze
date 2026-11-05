r"""K1198 (Muse batch 20 Run G) COPY of work32/dbg/probe_sum_k1112cusp.py (untouched in
.claude/probes/K863/trace/): argv-driven, no retarget needed; Run G points it at this folder's
probe/lowcusp_Plc1m.json beside the trace's read-only lowcusp_Plc2m/Plc3m JSONs.
K1112 (J3i, v7.2): the probe's solves (work29/dbg/solves_k1113.py JSONs, one per build) side by side, one row per
pair: the attach s (u) in the right letter's window ('lo' at the lower bound, 'hi' at the upper), the solve's status
and nfev ('MX' = MAXFEV), J, kmax (1/u), side_min (u) and the meet turn (deg). Then per build: the pairs at the lower
bound, at MAXFEV, below the side tolerance (-0.05 u), and the mean J.
Run from the trace dir: venv\Scripts\python.exe -I work32\dbg\probe_sum_k1112cusp.py <out.txt> <name=solves.json> ..."""
import json
import sys

out_path, specs = sys.argv[1], sys.argv[2:]
builds = []
for sp in specs:
    nm, p = sp.split("=", 1)
    J = json.load(open(p))
    builds.append((nm, {r["pair"]: r for r in J.values()}))
pairs = list(dict.fromkeys(p for _, R in builds for p in R))
lines = ["pair  " + "  ".join(f"{nm:>44s}" for nm, _ in builds),
         "      " + "  ".join(f"{'s_u   win      st nfev    J      kmax  side  turn':>44s}" for _ in builds)]
stats = {nm: dict(lo=[], mx=[], side=[], J=[], hi=[]) for nm, _ in builds}
for p in pairs:
    row = f"{p:5s} "
    for nm, R in builds:
        r = R.get(p)
        if r is None or not r.get("solved"):
            row += f"{'preset' if r else '-':>44s}  "
            continue
        lo, hi, s = r["lo"], r["hi"], r["s_u"]
        b = "lo" if hi - lo > 0.01 and abs(s - lo) < 0.05 else ("hi" if hi - lo > 0.01 and abs(s - hi) < 0.05 else "  ")
        st = "MX" if r["status"] != 0 else "ok"
        sm = r.get("side_min")
        row += (f"{s:6.2f}{b} [{lo:4.1f},{hi:4.1f}] {st} {r['nfev']:5d} {r['J']:8.3g} {r['kmax']:5.3f} "
                f"{(sm if sm is not None else float('nan')):6.3f} {r['meet_turn']:5.1f}  ")
        S = stats[nm]
        if b == "lo":
            S["lo"].append(p)
        if b == "hi":
            S["hi"].append(p)
        if st == "MX":
            S["mx"].append(p)
        if sm is not None and sm < -0.05:
            S["side"].append(p)
        S["J"].append(r["J"])
    lines.append(row.rstrip())
lines.append("")
for nm, _ in builds:
    S = stats[nm]
    lines.append(f"{nm}: {len(S['J'])} solved; at the lower bound {len(S['lo'])}: {','.join(S['lo'])}; at the upper "
                 f"bound {len(S['hi'])}: {','.join(S['hi'])}; MAXFEV {len(S['mx'])}: {','.join(S['mx'])}; side below "
                 f"-0.05 u {len(S['side'])}: {','.join(S['side'])}; mean J {sum(S['J']) / max(len(S['J']), 1):.4g}")
open(out_path, "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")
print("\n".join(lines))
