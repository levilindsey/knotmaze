# K1198 Run G (Muse batch 22, 22G) task 3, ij half: the hidden join through the ports.
# Assembles every census word holding ij (from the bench census's word list; in
# practice the word ij itself) on v6.8 (work33/base bodies copied to
# v68_22g/base, work28/ports_k990e.json variant M) twice: with the stock font
# (today: the ligature, no join) and with the ligature-emptied font
# (v68_22g/font_nolig.ttf). Reports each join's solve (status, side, attach),
# its font distance and connector class, and each letter the hand places.
# Kit inputs read in place; K926_FINAL_E=shear, K1009_PINS unset.
# Run: <trace>\venv\Scripts\python.exe -I -B .claude\probes\K1198\ij_check_22g.py
import json
import os
import sys

T = r"C:\Users\lsl\Repositories\knotmaze\.claude\probes\K863\trace"
KDIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(T, "tools"))
sys.path.insert(0, os.path.join(T, "work26", "dbg"))
sys.path.insert(0, os.path.join(T, "work27", "dbg"))
os.environ["K926_FINAL_E"] = "shear"
os.environ.pop("K1009_PINS", None)

import gen_k1027 as G  # noqa: E402
from k863lib import Font  # noqa: E402

BENCH = os.path.join(T, "work33", "census_v68x.json")
BASE = os.path.join(KDIR, "v68_22g", "base")
PORTS = os.path.join(T, "work28", "ports_k990e.json")
STOCK = os.path.join(T, "font", "PlaywriteUSTrad[wght].ttf")
MOD = os.path.join(KDIR, "v68_22g", "font_nolig.ttf")


def bench_words():
    import re
    rows = json.load(open(BENCH, encoding="utf-8"))["rows"]
    by_w = {}
    for r in rows:
        m = re.match(r"w(\d+):", r["id"])
        if m:
            by_w.setdefault(int(m.group(1)), r["word"])
    return [by_w[k] for k in sorted(by_w)]


def main():
    B = json.load(open(os.path.join(BASE, "bodies.json")))
    P = json.load(open(os.path.join(BASE, "join_params.json")))
    ports = G.load_ports(PORTS, "M")
    words = [w for w in bench_words() if "ij" in w]
    lines = [f"K1198 22G ij check: words holding ij in J3i's list: {words} "
             f"(v6.8 base {BASE}, ports {PORTS} variant M)"]
    rec = {}
    for tag, path in (("stock (v6.8 today)", STOCK), ("nolig (22G rule)", MOD)):
        font = Font(path)
        for w in words:
            A = G.assemble(font, B, P, w, with_ref=True, B_ref=B, ports=ports)
            lines.append(f" {tag} {w!r}: letters {[(l['ch'], l['glyph']) for l in A['letters']]} "
                         f"shaping {[(s['name'], s['cluster']) for s in A['shaping']]}")
            rec.setdefault(w, {})[tag] = dict(
                letters=[(l["ch"], l["glyph"]) for l in A["letters"]], joins=[])
            if not A["joins"]:
                lines.append(f" {tag} {w!r}: no join")
            for j in A["joins"]:
                d = dict(pair=j["L"] + j["R"], cls=j["cls"], src=str(j["src"]),
                         dist_u=None if j["dist_u"] != j["dist_u"] else float(j["dist_u"]))
                if "port" in j:
                    sv = j["port"]["solve"]
                    d.update(solved=True, status=sv.get("status"), side_min_u=sv.get("side_min_u"),
                             entry_s_u=j["port"]["entry"]["s_u"], nfev=sv.get("nfev"))
                    lines.append(f" {tag} {w!r} {d['pair']} SOLVED cls {d['cls']} status {d['status']} "
                                 f"side {d['side_min_u']} attach s_u {d['entry_s_u']:.4f} "
                                 f"nfev {d['nfev']} dist {d['dist_u']}")
                else:
                    lines.append(f" {tag} {w!r} {d['pair']} preset {d['src']} cls {d['cls']} dist {d['dist_u']}")
                rec[w][tag]["joins"].append(d)
    out = os.path.join(KDIR, "ij_check_22g.txt")
    with open(out, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(lines) + "\n")
    with open(os.path.join(KDIR, "ij_check_22g.json"), "w", encoding="utf-8", newline="\n") as fh:
        json.dump(rec, fh, indent=1)
    print("\n".join(lines))


if __name__ == "__main__":
    main()
