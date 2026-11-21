# K1551 calibration: set each kind's threshold on the ODD-numbered labelled sites of link A,
# report it on the EVEN-numbered ones (brief Done 2). Reads census.py's score TSV + the eye classes.
#   python calib.py <scores.tsv> <classes.txt> <sites.json>
# A kind is USABLE when, on the even sites, its flag catches >= half of its labelled sites and flags
# no more clean sites than faulted ones (the brief: "more clean sites than faulted ones" is unusable).
# Prints, per kind: odd-fit threshold, even TP / kind-total, even clean-flagged, even
# other-kind-flagged, and the verdict. Threshold search on the odd sites: among thresholds catching
# >= half the odd kind with clean <= faulted, the one flagging fewest clean.
import csv, json, re, sys
from collections import defaultdict

KINDMAP = {"sliver": "sliver", "wedge": "wedge", "notch": "notch",
           "dot": "thin", "tick": "thin", "dash": "thin", "break": "bstub", "stub": "bstub"}
COL = {"wedge": "wedge", "notch": "notch", "sliver": "sliver", "thin": "thin", "bstub": "bstub"}


def num(site):
    m = re.match(r"[jt](\d+)", site)
    return int(m.group(1)) if m else -1


def main():
    scores = {r["site"]: r for r in csv.DictReader(open(sys.argv[1]), delimiter="\t")}
    labels = {}
    for ln in open(sys.argv[2]):
        if ln.strip() and not ln.startswith("#"):
            s, c, px = ln.split()
            labels[s] = KINDMAP[c]
    sites = [s["site"] for s in json.load(open(sys.argv[3]))["sites"]]
    odd = [s for s in sites if num(s) % 2 == 1]
    even = [s for s in sites if num(s) % 2 == 0]

    def stats(kind, group, thr):
        tp = sum(1 for s in group if labels.get(s) == kind and float(scores[s][COL[kind]]) >= thr)
        nk = sum(1 for s in group if labels.get(s) == kind)
        clean = sum(1 for s in group if s not in labels and float(scores[s][COL[kind]]) >= thr)
        other = sum(1 for s in group if s in labels and labels[s] != kind and float(scores[s][COL[kind]]) >= thr)
        return tp, nk, clean, other

    for kind in COL:
        vals = sorted({float(scores[s][COL[kind]]) for s in odd}, reverse=True)
        best = None
        for thr in vals + [float("inf")]:
            tp, nk, clean, other = stats(kind, odd, thr)
            if nk and tp >= (nk + 1) // 2 and clean <= tp:
                if best is None or clean < best[2] or (clean == best[2] and tp > best[0]):
                    best = (tp, nk, clean, other, thr)
        if best is None:
            print(f"{kind}: no threshold on odd sites catches half its kind with clean < faulted -> NOT USABLE")
            continue
        thr = best[4]
        etp, enk, eclean, eother = stats(kind, even, thr)
        usable = enk > 0 and etp * 2 >= enk and eclean <= etp
        print(f"{kind}: thr {thr:g} (odd: {best[0]}/{best[1]} kind, {best[2]} clean) -> "
              f"even: {etp}/{enk} kind, {eclean} clean, {eother} other-kind -> "
              f"{'USABLE' if usable else 'NOT USABLE'}")


if __name__ == "__main__":
    main()
