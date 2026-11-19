# K1482 s19: the bake probe's crossings (gf_look.ts d19 log, cap15's k15log_<name>.json) near world points.
#   python log19.py <k15log.json> <wx,wy,R;wx,wy,R;...> [slots=1]
# Per crossing: over/under chains, arcs, the window, caps, joint room, both chains' joint arcs, the membership runs
# (+-3 arc around the crossing; M/N = the crossing's own sample member or not, m = member, . = not) and the slots
# (under sample k, its arc offset from the crossing, the baked flag bits).
import sys, json, math
L = json.load(open(sys.argv[1]))
pts = [tuple(map(float, s.split(","))) for s in sys.argv[2].split(";") if s]
showS = len(sys.argv) <= 3 or sys.argv[3] != "0"
for (wx, wy, R) in pts:
    print(f"== near ({wx},{wy}) R {R}")
    rows = sorted(((math.hypot(v["at"][0] - wx, v["at"][1] - wy), k, v) for k, v in L.items() if not k.startswith("__")), key=lambda t: t[0])
    for d, k, v in rows:
        if d > R: break
        print(f"{k} d{d:.2f} xi{v['xi']} over{v['over']} under{v['under']} oC{v['oC']} uC{v['uC']} at{v['at']} win{v['win']} cap{v['cap']} jRoom{v['jRoom']} sc{v['sc']}")
        print(f"   jU {v['jU']}  jO {v['jO']}  jc {v['jc']:.3f} arcPer {v['arcPer']} totals {v['totals']} closed {v['closed']}")
        print(f"   runO |{v['runO']}|\n   runU |{v['runU']}|")
        if showS:
            sl = sorted(v["slots"], key=lambda s: s[1])
            print("   slots " + " ".join(f"{s[1]:+.2f}:{s[2]}" for s in sl))
