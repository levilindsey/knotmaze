# K1198 Run G (21G) task 1: fr and fs under Plc1m with their pins and without.
# Pins on = K1009_PINS unset (ports file pins, J3e's [2,20] for fr/fs); pins off =
# K1009_PINS={"fr":{},"fs":{}} (gen_k1027.load_ports merges it over the file pins;
# the probe_k1112cusp.ps1 -Pins form, run here by setting the env directly because
# PowerShell mangles the JSON quotes on the way to pwsh). For each pair: the probe
# solve (probe/lowcusp_Plc1m[_nopins].json), a shape hash (SHA-256 of the join's
# cubic coefficients as assembled in the pair word, full float JSON), the font
# distance (assemble's dist_u, the census's own-ends dmax) and the local census
# (every census word holding the pair, assembled both ways). Writes pins_21g.txt.
# Run: <trace>\venv\Scripts\python.exe -I -B .claude\probes\K1198\pins_21g.py
import hashlib
import json
import os
import sys

T = r"C:\Users\lsl\Repositories\knotmaze\.claude\probes\K863\trace"
KDIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(T, "tools"))
sys.path.insert(0, os.path.join(T, "work26", "dbg"))
sys.path.insert(0, os.path.join(T, "work27", "dbg"))
os.environ["K926_FINAL_E"] = "shear"
import gen_k1027 as G  # noqa: E402
from k863lib import Font  # noqa: E402


def shape_hash(coeffs):
    import numpy as np
    s = json.dumps(np.asarray(coeffs, float).tolist())
    return hashlib.sha256(s.encode()).hexdigest()[:16]


def main():
    font = Font(os.path.join(T, "font", "PlaywriteUSTrad[wght].ttf"))
    B = json.load(open(os.path.join(T, "work31", "base", "bodies.json")))
    P = json.load(open(os.path.join(T, "work31", "base", "join_params.json")))
    ports_path = os.path.join(KDIR, "ports_k1112cusp.json")
    cens = json.load(open(os.path.join(KDIR, "census_Plc1m.json"), encoding="utf-8"))
    words = {}
    for r in cens["rows"]:
        if r.get("pair") in ("fr", "fs") and r.get("type") == "join":
            words.setdefault(r["pair"], set()).add(r["word"])
    lines = ["K1198 Run G (21G) fr/fs pins under Plc1m (work31/base, ports Plc1m). "
             "On: file pins; off: K1009_PINS {\"fr\":{},\"fs\":{}}."]
    for tag, pins_env in (("on", None), ("off", '{"fr":{},"fs":{}}')):
        if pins_env is None:
            os.environ.pop("K1009_PINS", None)
        else:
            os.environ["K1009_PINS"] = pins_env
        ports = G.load_ports(ports_path, "Plc1m")
        lines.append(f" pins {tag}: effective pins fr={ports['pins'].get('fr')} fs={ports['pins'].get('fs')}")
        for pair in ("fr", "fs"):
            for w in sorted(words[pair]):
                A = G.assemble(font, B, P, w, with_ref=True, B_ref=B, ports=ports)
                for j in A["joins"]:
                    if j["L"] + j["R"] != pair:
                        continue
                    sv = j["port"]["solve"]
                    lines.append(f"  {tag} {pair} in {w!r}: hash {shape_hash(j['coeffs'])} "
                                 f"dist {float(j['dist_u']):.4f} u prm {[round(float(v), 6) for v in j['prm']]} "
                                 f"attach s_u {j['port']['entry']['s_u']:.4f} status {sv.get('status')} "
                                 f"nfev {sv.get('nfev')} side {sv.get('side_min_u')} J {sv.get('J'):.6g}")
    # probe solves (all-72 runs) for the same pairs
    for f, tag in (("lowcusp_Plc1m.json", "on"), ("lowcusp_Plc1m_nopins.json", "off")):
        d = json.load(open(os.path.join(KDIR, "probe", f), encoding="utf-8"))
        for pair in ("fr", "fs"):
            k = [k for k in d if k.startswith(pair + "|")][0]
            r = d[k]
            lines.append(f"  probe {tag} {pair}: status {r['status']} nfev {r['nfev']} "
                         f"s_u {r['s_u']:.4f} in [{r['lo']}, {r['hi']}] side {r['side_min']} "
                         f"J {r['J']:.6g} note {r['note']}")
    # census rows (pins on, 20G bench) for reference
    for r in cens["rows"]:
        if r.get("pair") in ("fr", "fs") and r.get("type") == "join":
            lines.append(f"  census on {r['id']}: dmax {r['dist_max_u']:.4f} u")
    out = os.path.join(KDIR, "pins_21g.txt")
    with open(out, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(lines) + "\n")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
