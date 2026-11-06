r"""K863 J3j: whether one column of a sheet_k1027 sheet draws what a column of another sheet draws, row by row (rows
matched by their label, the word). A row's group holds, per column, two guide lines, then the font's pale copy, then
the build's strokes and its joins, leads and tails. Where a cell sits depends on the sheet (the column's x origin and
width come from every column's geometry), so each cell is normalised before the comparison: the guide lines are dropped
(their length is the column's width), every x is taken from the leftmost point of the cell's pale font copy and every y
from the cell's baseline guide. Two cells are the same when they hold the same elements, attribute for attribute and
colour for colour, with every coordinate within 0.0105 u (the sheets print 2 decimals at 1 px = 1 u, so a cell drawn at
another offset can round 0.01 apart); a differing row reports its largest coordinate difference, or how its elements
differ.
Run from the trace dir:
  venv\Scripts\python.exe -I work33\dbg\sheetcol_k863j.py <a.svg> <col a> <b.svg> <col b> <out.txt>
(col = the column's index, 0 = the font)."""
import re
import sys

NUM = re.compile(r"(-?\d+\.\d+),(-?\d+\.\d+)")
XA = re.compile(r'\b(x|x1|x2|cx)="(-?[\d.]+)"')
YA = re.compile(r'\b(y|y1|y2|cy)="(-?[\d.]+)"')
TOL = 0.0105


def cells(svg):
    s = open(svg, encoding="utf-8").read()
    out = {}
    for m in re.finditer(r'<g id="case-\d+">\n<text[^>]*>([^<]*)</text>\n(.*?)</g>', s, re.S):
        word, body = m.group(1), m.group(2)
        parts = re.split(r'(?=<line x1="[^"]*" x2="[^"]*" y1="[^"]*" y2="[^"]*" stroke="#bfd0f0")', body)
        out[word] = [p for p in parts if p.strip()]
    return out


def norm(chunk):
    """[(element text with its coordinates replaced by #, [coordinates relative to the font copy and baseline])]."""
    y0 = float(re.search(r'<line [^>]*stroke="#bfd0f0"[^>]*/>', chunk).group(0).split('y1="')[1].split('"')[0])
    body = re.sub(r'<line [^>]*/>', '', chunk)
    els = re.findall(r'<[a-z]+ [^>]*/>', body)
    rest = re.sub(r'<[a-z]+ [^>]*/>', '', body).strip()
    x0 = min(float(m.group(1)) for m in NUM.finditer(els[0]))
    out = []
    for e in els + ([rest] if rest else []):
        nums = []

        def pair(m):
            nums.append(float(m.group(1)) - x0)
            nums.append(float(m.group(2)) - y0)
            return "#,#"

        def ax(m):
            nums.append(float(m.group(2)) - x0)
            return f'{m.group(1)}="#"'

        def ay(m):
            nums.append(float(m.group(2)) - y0)
            return f'{m.group(1)}="#"'
        t = YA.sub(ay, XA.sub(ax, NUM.sub(pair, e)))
        out.append((t, nums))
    return out


def compare(A, B):
    """(same, note)."""
    if len(A) != len(B):
        return False, f"{len(A)} elements vs {len(B)}"
    worst = 0.0
    for i, ((ta, na), (tb, nb)) in enumerate(zip(A, B)):
        if ta != tb or len(na) != len(nb):
            return False, f"element {i} differs ({len(na)} vs {len(nb)} numbers)"
        if na:
            worst = max(worst, max(abs(a - b) for a, b in zip(na, nb)))
    return worst <= TOL, f"largest coordinate difference {worst:.3g} u"


def main():
    a, ca, b, cb, out = sys.argv[1], int(sys.argv[2]), sys.argv[3], int(sys.argv[4]), sys.argv[5]
    A, B = cells(a), cells(b)
    common = [w for w in A if w in B]
    same, diff = [], []
    for w in common:
        ok, note = compare(norm(A[w][ca]), norm(B[w][cb]))
        (same if ok else diff).append((w, note))
    L = [f"K863 J3j: column {ca} of {a} against column {cb} of {b}",
         f"rows: {len(A)} in A, {len(B)} in B, {len(common)} in both: {len(same)} draw the same, {len(diff)} differ; "
         f"only in A {len([w for w in A if w not in B])}, only in B {len([w for w in B if w not in A])}"]
    L += [f"  differ: {w}: {n}" for w, n in diff]
    L += [f"  same: {w}: {n}" for w, n in same]
    L += [f"  only in A: {w}" for w in A if w not in B]
    L += [f"  only in B: {w}" for w in B if w not in A]
    with open(out, "w", encoding="utf-8") as fh:
        fh.write("\n".join(L) + "\n")
    print("\n".join(L[:2] + [x for x in L[2:] if x.startswith("  differ")][:12]))


if __name__ == "__main__":
    main()
