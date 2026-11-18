import json, sys
d = json.load(open(sys.argv[1])); nm = sys.argv[2]; x0, x1, y0, y1 = map(int, sys.argv[3].split(","))
t = d[nm]; R = t["R"]; n = 2 * R; px = t["px"]
ids = {}
def code(v):
    if v not in ids: ids[v] = "abcdefghijklmnopqrstuvwxyz"[len(ids)]
    return ids[v]
for y in range(y0, y1):
    row = ""
    for x in range(x0, x1):
        ink, cov, ch, wk, wa, wb = px[y * n + x]
        row += (str(wk) + code(wa)) if ink >= 0.5 else (" ." if ink < 0.1 else " +")
        row += code(ch) if True else ""
        row += " "
    print(f"{y:2d} {row}")
print({v: k for k, v in ids.items()})
