# K1482 s36: the flagged sites of one maze grouped by the blob they flag (sites whose widest ink px lie within 4 px
# share one blob: a junction and its tail ends usually do), with a signature of the outline terms the CPU mirror
# gives the blob's disc (class36.ts's TSV):
#   2side      two or more chains' side bands and nothing else (>= 90% of the inked px)
#   side+arc   a junction's fillet arc or tangent term (>= 10%) beside a side band
#   vtx        the vertex cap term (>= 10%)
#   cap        an open end's cap (>= 10%)
#   other
#   python group36.py <maze> <class.tsv> <blobs.json> [out.json]
# Prints one line per blob: signature, strokes, the sites, the widest px, the terms; writes the list as JSON.
import json, sys, csv
maze, tsv, bj = sys.argv[1:4]
B = {s["site"]: s for s in json.load(open(bj))["sites"]}
rows = list(csv.DictReader(open(tsv), delimiter="\t"))
groups = []
for r in rows:
    b = B[r["site"]]["blobs"][0]
    for g in groups:
        if abs(g["mx"] - b["mx"]) <= 4 and abs(g["my"] - b["my"]) <= 4:
            g["sites"].append(r["site"]); break
    else:
        ink = max(1, int(r["mirInk"]))
        side, arc, cap, tan, thru = [int(r[k]) for k in ("nSide", "nArc", "nCap", "nTan", "nThru")]
        vtx = ink - side - arc - cap - tan - thru
        nch = len({t.split(" x")[0] .split(" ")[1].rstrip("+-") for t in r["terms"].split("; ") if t.startswith("side ")})
        if cap >= 0.1 * ink: sig = "cap"
        elif vtx >= 0.1 * ink: sig = "vtx"
        elif arc + tan + thru >= 0.1 * ink: sig = "side+arc"
        elif side >= 0.9 * ink and nch >= 2: sig = "2side"
        else: sig = "other"
        groups.append({"maze": maze, "sig": sig, "sites": [r["site"]], "mx": b["mx"], "my": b["my"], "strokes": b["strokes"], "wedge": float(r["wedge"]),
                       "disc": int(r["disc"]), "ink": ink, "terms": r["terms"], "near": r["near"], "nch": nch})
groups.sort(key=lambda g: (g["sig"], -g["strokes"]))
cnt = {}
for g in groups:
    cnt.setdefault(g["sig"], [0, 0]); cnt[g["sig"]][0] += 1; cnt[g["sig"]][1] += len(g["sites"])
    print(f"{maze} {g['sig']:9s} {g['strokes']:.3f} @{g['mx']},{g['my']} sites {','.join(g['sites'])} | {g['terms']}")
print(f"{maze}: {len(rows)} flagged sites, {len(groups)} blobs; " + "; ".join(f"{k} {v[0]} blobs / {v[1]} sites" for k, v in sorted(cnt.items())))
if len(sys.argv) > 4:
    json.dump(groups, open(sys.argv[4], "w"), indent=1)
