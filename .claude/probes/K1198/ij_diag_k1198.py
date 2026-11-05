# K1198 (Muse batch 20 Run G): where ij's join goes. Assembles ij (and ii/aj/ji as controls)
# under Pc10 and under Plc2m with the kit's own path (work27/dbg/gen_k1027.py assemble, the call
# work29/dbg/solves_k1113.py makes; that solver is read-only and skips a pair whose assembly has
# no joins, which is ij's "(no row)"). Read-only inputs: the trace's work31/base, J3h's ports
# (Pc10) and this folder's ports_k1112cusp.json (Plc2m). Writes nothing.
# Run: <trace>\venv\Scripts\python.exe -I -B .claude\probes\K1198\ij_diag_k1198.py
import json, os, sys
T = r"C:\Users\lsl\Repositories\knotmaze\.claude\probes\K863\trace"
K = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(T, "tools"))
sys.path.insert(0, os.path.join(T, "work26", "dbg"))
sys.path.insert(0, os.path.join(T, "work27", "dbg"))
import gen_k1027 as G
from k863lib import Font
font = Font(os.path.join(T, "font", "PlaywriteUSTrad[wght].ttf"))
for spec in ("work31/base@work31/ports_k1112c.json@Pc10",
             "work31/base@K1198PORTS@Plc2m"):
    d, pp, v = spec.split("@")
    pp = pp.replace("K1198PORTS", os.path.join(K, "ports_k1112cusp.json"))
    B = json.load(open(os.path.join(T, d, "bodies.json")))
    P = json.load(open(os.path.join(T, d, "join_params.json")))
    ports = G.load_ports(pp if os.path.isabs(pp) else os.path.join(T, pp), v)
    print("==", d, "@", pp if os.path.isabs(pp) else os.path.join(T, pp), "@", v)
    print(" PT i:", ports["ports"].get("i"))
    print(" PT j:", ports["ports"].get("j"))
    print(" pins ij:", ports["pins"].get("ij"))
    for w in ("ij", "ii", "aj", "ji"):
        A = G.assemble(font, B, P, w, with_ref=False, B_ref=B, ports=ports)
        print(" ", w, "letters", [(l["ch"], l["glyph"]) for l in A["letters"]],
              "joins", [(j["L"] + j["R"], j["src"], "port" in j, j.get("cls")) for j in A["joins"]],
              "leads", len(A["leads"]), "tails", len(A["tails"]),
              "shaping", [(s["name"], s["cluster"]) for s in A["shaping"]])
