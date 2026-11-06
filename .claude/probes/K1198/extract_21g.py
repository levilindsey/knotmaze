# K1198 Run G (21G) task 1 numbers from existing censuses (no solver calls):
# ai/ar/ei/ni font distances under v7.1, v7.2 and Plc1m, and Plc1m's largest
# locality moves. Sources: trace work32 census_v71/v72.json (J3i, read-only),
# this folder's census_Plc1m.json and locality_k1112cusp.txt (20G). Writes
# distances_21g.txt beside it. Shape hash etc. for fr/fs live in pins_21g.py.
# Run: <trace>\venv\Scripts\python.exe -I -B .claude\probes\K1198\extract_21g.py
import json
import os
import re

T = r"C:\Users\lsl\Repositories\knotmaze\.claude\probes\K863\trace"
KDIR = os.path.dirname(os.path.abspath(__file__))


def pair_dist(path, pair):
    d = json.load(open(path, encoding="utf-8"))
    rows = [r for r in d["rows"] if r.get("pair") == pair and r.get("word") == pair
            and r.get("type") == "join"]
    assert len(rows) == 1, (path, pair, len(rows))
    r = rows[0]
    return r["dist_max_u"], r["id"], r.get("solve", {}).get("s_u")


def main():
    src = {
        "v7.1": os.path.join(T, "work32", "census_v71.json"),
        "v7.2": os.path.join(T, "work32", "census_v72.json"),
        "Plc1m": os.path.join(KDIR, "census_Plc1m.json"),
    }
    pairs = ["ai", "ar", "ei", "ni", "ci", "cr", "cs", "cy", "er", "es"]
    lines = ["K1198 Run G (21G) task 1: font distance dmax (u) of the two-letter word's join, "
             "by hand. v7.1/v7.2 from trace work32 censuses (J3i), Plc1m from census_Plc1m.json (20G)."]
    vals = {}
    for p in pairs:
        vals[p] = {h: pair_dist(src[h], p) for h in src}
        v = vals[p]
        lines.append(f"  {p}: v7.1 {v['v7.1'][0]:.4f} ({v['v7.1'][1]}), "
                     f"v7.2 {v['v7.2'][0]:.4f}, Plc1m {v['Plc1m'][0]:.4f}; "
                     f"attach s_u v7.1 {v['v7.1'][2]}, v7.2 {v['v7.2'][2]}, Plc1m {v['Plc1m'][2]}")
    four = ["ai", "ar", "ei", "ni"]
    lines.append("four never-measured in 20G (ai, ar, ei, ni):")
    for p in four:
        v = vals[p]
        lines.append(f"  {p}: v7.2 nearer than v7.1: {v['v7.2'][0] < v['v7.1'][0]} "
                     f"({v['v7.1'][0]:.2f} -> {v['v7.2'][0]:.2f}); "
                     f"Plc1m nearer than v7.2: {v['Plc1m'][0] < v['v7.2'][0]} "
                     f"({v['v7.2'][0]:.2f} -> {v['Plc1m'][0]:.2f}, delta {v['Plc1m'][0]-v['v7.2'][0]:+.4f})")
    for h in ("v7.1", "v7.2", "Plc1m"):
        m = sum(vals[p][h][0] for p in four) / 4.0
        lines.append(f"  mean over ai/ar/ei/ni {h}: {m:.4f}")
    lines.append(f"  Plc1m mean minus v7.2 mean: "
                 f"{sum(vals[p]['Plc1m'][0] for p in four)/4.0 - sum(vals[p]['v7.2'][0] for p in four)/4.0:+.4f} u")
    # Plc1m locality largest moves (20G file): the sorted 'every moved' list
    loc = open(os.path.join(KDIR, "locality_k1112cusp.txt"), encoding="utf-8").read()
    lines.append("Plc1m locality (locality_k1112cusp.txt, v7.1 against Plc1m): largest moved touched pieces:")
    sec = loc.split("every moved touched piece", 1)[1]
    got = []
    for ln in sec.splitlines()[1:]:
        m = re.match(r"\s+(.+?)\s{2,}([0-9]+\.[0-9]+)\s+(.+)$", ln)
        if m:
            got.append((float(m.group(2)), m.group(1).strip(), m.group(3).strip()))
    for kind in ("exit stroke of a touched join", "stroke 0 after a touched join", "touched join fi",
                 "touched join it", "touched join ei", "touched join ci"):
        sub = [g for g in got if g[1] == kind][:6]
        for d, k, piece in sub:
            lines.append(f"  {d:.3f} u  {k}  {piece}")
    lines.append("  largest touched joins overall:")
    joins = sorted([g for g in got if g[1].startswith("touched join")], reverse=True)[:8]
    for d, k, piece in joins:
        lines.append(f"  {d:.3f} u  {k}  {piece}")
    txt = os.path.join(KDIR, "distances_21g.txt")
    with open(txt, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(lines) + "\n")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
