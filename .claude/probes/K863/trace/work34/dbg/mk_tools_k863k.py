r"""K863 J3k (base = v6.8, K1212's kit fixes): writes J3k's ports of earlier stages' tools into work34/dbg (the originals
untouched):
  pairs_k863k.py   <- work33/dbg/pairs_k863j.py (J3j's): SU.g2 reads the census's ang_deg (it read angle_deg, which the
                      census never writes, so the angle never counted); each census is keyed by the piece's id without
                      its word number (a repeated id stops the run); angle_only() lists the seams g2 now fails on the
                      angle alone (gap and dk within G2, angle >= 0.05 deg)
  rowsame_k863k.py <- work28/dbg/rowsame_k990e.py (J3e's): rows matched by the id without its word number (it keyed rows
                      by (word, piece, pair, type) and matched repeats in order), every field compared but the label and
                      the id; the repeats in each file listed and each checked against its first copy; an optional
                      third argument writes the report
  census_k863k.py  <- work27/dbg/census_k1027.py (J3d's): J3d's folder on the import path after its own, so --gen
                      gen_k1027 (the default, J3d's) and --gen gen_k863k (J3k's, work34/dbg) both import; nothing else
  sheet_k863k.py   <- work27/dbg/sheet_k1027.py (J3d's): draws with gen_k863k (gen_k1027 plus the word-end forms a
                      join_params file names under "k863k"; a file without them draws as gen_k1027); --ink <pen u>
                      draws each build's ink at the pen's width, translucent under its centrelines
  area_k863k.ps1   <- work33/dbg/area_k863j.ps1 (J3j's) writing work34/sheets/png
  wtcopy_k863k.ps1 <- work33/dbg/wtcopy_k863j.ps1 (J3j's) for work34 and out34
Written for J3k (no earlier tool to port): checks_k863k.ps1, gen_k863k.py, cand_k863k.py, qfit_k863k.py, qtail_k863k.py,
dots_k863k.py, local_k863k.py, censcmp_k863k.py, look_k863k.py and crop_k863k.py.
Run from the trace folder: venv\Scripts\python.exe -I work34\dbg\mk_tools_k863k.py
"""
import os

T = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
D = os.path.join(T, "work34", "dbg")


def sub(s, a, b, n=1):
    assert s.count(a) == n, (s.count(a), a[:80])
    return s.replace(a, b)


def rd(p):
    with open(os.path.join(T, p), encoding="utf-8") as fh:
        return fh.read()


def wr(name, s):
    with open(os.path.join(D, name), "w", encoding="utf-8", newline="\n") as fh:
        fh.write(s)
    print("wrote", os.path.join("work34", "dbg", name))


# ---------------------------------------------------------------- pairs_k863k.py
ANGLE_ONLY = r'''

def angle_only():
    """K863 J3k (K1212): the seams g2 fails on the angle alone, per census: not designed, gap < 0.01 u and dk < 5e-4 /u
    (G2 by J3j's angle-blind SU.g2) but angle >= 0.05 deg. One line each: the pair, the piece (id), where (the seam's
    text), angle deg, gap u, dk /u, largest angle first; then the count by pair and by where. Appended to the output
    file."""
    out = sys.argv[1]
    L = ["", "K863 J3k (K1212): the seams g2 fails on the angle alone (not designed; gap < 0.01 u and dk < 5e-4 /u; "
         "angle >= 0.05 deg), per census, largest angle first"]
    for a in sys.argv[2:]:
        name, path = a.split("=", 1)
        rows = json.load(open(path, encoding="utf-8"))["rows"]
        hits, also = [], 0
        for r in rows:
            for s in r.get("seams", []):
                if s.get("designed") or s.get("ang_deg", 0) < 0.05:
                    continue
                if s.get("gap_u", 0) < 0.01 and s.get("dk_u", 0) < 0.0005:
                    hits.append((s.get("ang_deg", 0), r, s))
                else:
                    also += 1
        L.append(f"  {name}: {len(hits)} seams on {len({r['id'] for _, r, _ in hits})} pieces fail on the angle alone "
                 f"({also} more undesigned seams have angle >= 0.05 deg and fail on gap or dk too)")
        for ang, r, s in sorted(hits, key=lambda x: -x[0]):
            L.append(f"      {r['pair']:4s} {r['id']:36s} {s['seam']}: angle {ang:.3g} deg, gap {s.get('gap_u', 0):.3g} u, "
                     f"dk {s.get('dk_u', 0):.3g} /u")
        byp, byw = {}, {}
        for ang, r, s in hits:
            byp.setdefault(r["pair"], []).append(ang)
            byw.setdefault(r["type"] + " " + s["seam"].split(" ")[0], []).append(ang)
        L.append("    by pair: " + ", ".join(f"{p} {len(v)} (max {max(v):.3g})"
                                            for p, v in sorted(byp.items(), key=lambda x: -max(x[1]))))
        L.append("    by piece type and seam end: " + ", ".join(f"{p} {len(v)}" for p, v in sorted(byw.items())))
    with open(out, "a", encoding="utf-8") as fh:
        fh.write("\n".join(L) + "\n")
    print("\n".join(L))
'''

s = rd(r"work33\dbg\pairs_k863j.py")
s = ("# K863 J3k: copy of work33/dbg/pairs_k863j.py (J3j's, untouched) by work34/dbg/mk_tools_k863k.py (K1212): SU.g2 reads\n"
     "# the census's ang_deg; each census keyed by the piece's id without its word number (a repeat stops the run);\n"
     "# angle_only(), the seams g2 now fails on the angle alone, run after seam_detail(). J3j's header:\n" + s)
s = sub(s, "import json\nimport sys\n", "import json\nimport re\nimport sys\n")
s = sub(s, '"""work29/dbg/sum_k1113.py\'s definitions, copied unchanged."""',
        '"""work29/dbg/sum_k1113.py\'s definitions, copied; K863 J3k (K1212): g2 reads the census\'s ang_deg (sum_k1113\n'
        '    and J3j read angle_deg, which the census never writes, so a seam\'s angle never counted)."""')
s = sub(s, 's.get("angle_deg", 0) < 0.05', 's.get("ang_deg", 0) < 0.05')
s = sub(s, '        C.append((n, {r["id"]: r for r in rows}))\n',
        '        # K863 J3k (K1212): keyed by the id without its word number (w<n>:), so the word lists\' order does not\n'
        '        # matter; a word list holds each id once, and a repeated id stops the run\n'
        '        R = {}\n'
        '        for r in rows:\n'
        '            k = re.sub(r"^w\\d+:", "", r["id"])\n'
        '            assert k not in R, f"{p}: the id {k} twice (K1212: a word list holds each id once)"\n'
        '            R[k] = r\n'
        '        C.append((n, R))\n')
s = sub(s, "(the census's ang_deg; SU.g2 reads angle_deg, which the census does not write,\n"
           "    so the angle never counts there)",
        "(the census's ang_deg, which SU.g2 reads since K863 J3k; J3j's\n"
        "    SU.g2 read angle_deg, never written, so the angle never counted there)")
s = sub(s, 'L = ["", "K863 J3j: every undesigned seam, per census',
        'L = ["", "K863 J3k (g2 reads the angle): every undesigned seam, per census')
s = sub(s, "\n\nmain()\nseam_detail()\n", ANGLE_ONLY + "\n\nmain()\nseam_detail()\nangle_only()\n")
wr("pairs_k863k.py", s)

# ---------------------------------------------------------------- rowsame_k863k.py
TAIL0 = 'A, B = (json.load(open(p)) for p in sys.argv[1:3])\n'
TAIL = r'''A, B = (json.load(open(p, encoding="utf-8")) for p in sys.argv[1:3])
OUT = sys.argv[3] if len(sys.argv) > 3 else None
# K863 J3k (K1212): a row's key is its id without the word number (w<n>:), so a word list's order and its repeats do not
# shift the match; every field is compared but the label and the id
key = lambda r: re.sub(r"^w\d+:", "", r["id"])
SKIP = ("label", "id")
L = [f"A = {sys.argv[1]}", f"B = {sys.argv[2]}"]
ia, ib = {}, {}
for r in A["rows"]:
    ia.setdefault(key(r), []).append(r)
for r in B["rows"]:
    ib.setdefault(key(r), []).append(r)
for nm, ix in (("A", ia), ("B", ib)):
    rep = {k: len(v) for k, v in ix.items() if len(v) > 1}
    L.append(f"{nm}: {sum(len(v) for v in ix.values())} rows, {len(ix)} ids, {len(rep)} ids repeated"
             + (": " + ", ".join(f"{k} x{n}" for k, n in sorted(rep.items())) if rep else ""))


def diff_of(a, b):
    return [f for f in sorted(set(a) | set(b)) if f not in SKIP and not same(a.get(f), b.get(f))]


neq, nsame, rep_same, rep_diff = 0, 0, 0, 0
for k in sorted(set(ia) & set(ib)):
    d = diff_of(ia[k][0], ib[k][0])
    if d:
        neq += 1
        L.append("%-40s %s" % (k[:40], ",".join(d)[:110]))
    else:
        nsame += 1
    for nm, ix in (("A", ia), ("B", ib)):
        for c in ix[k][1:]:
            d2 = diff_of(ix[k][0], c)
            if d2:
                rep_diff += 1
                L.append(f"repeat in {nm} of {k} differs from its first copy: {','.join(d2)[:100]}")
            else:
                rep_same += 1
oa, ob = sorted(set(ia) - set(ib)), sorted(set(ib) - set(ia))
L += ["only in A: " + k for k in oa] + ["only in B: " + k for k in ob]
L.append("ids: %d equal, %d differ, %d only in B, %d only in A; repeated copies: %d equal to their first, %d not"
         % (nsame, neq, len(ob), len(oa), rep_same, rep_diff))
print("\n".join(L))
if OUT:
    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write("\n".join(L) + "\n")
'''
s = rd(r"work28\dbg\rowsame_k990e.py")
assert s.count(TAIL0) == 1
s = s[:s.index(TAIL0)] + TAIL
s = ("# K863 J3k: copy of work28/dbg/rowsame_k990e.py (J3e's, untouched) by work34/dbg/mk_tools_k863k.py (K1212): rows\n"
     "# matched by the id without its word number, every field compared but the label and the id, repeats listed;\n"
     "# Run: venv\\Scripts\\python.exe -I work34\\dbg\\rowsame_k863k.py <a.json> <b.json> [<out.txt>]. J3e's header:\n" + s)
s = sub(s, "import json\nimport math\nimport sys\n", "import json\nimport math\nimport re\nimport sys\n")
wr("rowsame_k863k.py", s)

# ---------------------------------------------------------------- census_k863k.py
s = rd(r"work27\dbg\census_k1027.py")
s = ("# K863 J3k: copy of work27/dbg/census_k1027.py (J3d's, untouched) by work34/dbg/mk_tools_k863k.py: J3d's folder on\n"
     "# the import path after this one, so --gen gen_k1027 (the default) and --gen gen_k863k both import. J3d's header:\n" + s)
s = sub(s, "sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))\n",
        "sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))\n"
        "sys.path.insert(1, os.path.join(TR, \"work27\", \"dbg\"))  # K863 J3k: gen_k1027 from J3d's folder\n")
wr("census_k863k.py", s)

# ---------------------------------------------------------------- sheet_k863k.py
s = rd(r"work27\dbg\sheet_k1027.py")
s = ("# K863 J3k: copy of work27/dbg/sheet_k1027.py (J3d's, untouched) by work34/dbg/mk_tools_k863k.py: it draws with\n"
     "# gen_k863k (gen_k1027 plus the word-end forms a join_params file names under \"k863k\"). J3d's header:\n" + s)
s = sub(s, "sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))\n",
        "sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))\n"
        "sys.path.insert(1, os.path.join(T, \"work27\", \"dbg\"))  # K863 J3k: gen_k1027 from J3d's folder\n")
s = sub(s, "import gen_k1027 as G  # noqa: E402", "import gen_k863k as G  # noqa: E402  (K863 J3k)")
# --ink <pen u>: each build's ink at the pen's width, translucent under its centrelines (a dot's loop reads as a ring
# as a centreline; the pen fills it): the dots sheet and the test words
s = sub(s, '    side_path = opt("--sidecar")\n',
        '    side_path = opt("--sidecar")\n'
        '    ink = opt("--ink")       # J3k: the pen\'s width in u: each build\'s ink drawn translucent under its centrelines\n'
        '    ink = float(ink) if ink else None\n')
s = sub(s, "           f'and tails. Units: 1 px = 1 u (x-height 120 u).</text>']",
        "           f'and tails. Units: 1 px = 1 u (x-height 120 u).'\n"
        "           + (f' Translucent grey under the centrelines: the ink at the pen\\'s width ({ink:g} u).' if ink else '')\n"
        "           + '</text>']")
s = sub(s, '            A = c["row"][ci - 1]\n            for lt in A["letters"]:',
        '            A = c["row"][ci - 1]\n'
        '            if ink:     # one group at uniform opacity, so the pen\'s overlaps (a dot\'s loop) read as one ink\n'
        '                ds = [bz_d(st, P) for lt in A["letters"] for st in lt["strokes"]]\n'
        '                ds += [bz_d([[list(map(float, q)) for q in b] for b in FN.conn_beziers(j["coeffs"])], P)\n'
        '                       for nm in ("joins", "leads", "tails") for j in A[nm]]\n'
        '                out.append(\'<g opacity="0.3">\' + "".join(\n'
        '                    f\'<path d="{d_}" fill="none" stroke="#000" stroke-width="{ink:.2f}" stroke-linecap="round" \'\n'
        '                    f\'stroke-linejoin="round"/>\' for d_ in ds) + \'</g>\')\n'
        '            for lt in A["letters"]:')
wr("sheet_k863k.py", s)

# ---------------------------------------------------------------- area_k863k.ps1
s = rd(r"work33\dbg\area_k863j.ps1")
s = "# K863 J3k: copy of work33\\dbg\\area_k863j.ps1 (J3j's, untouched) writing work34\\sheets\\png. Its header:\n" + s
s = sub(s, '$out = "$T\\work33\\sheets\\png"', '$out = "$T\\work34\\sheets\\png"')
wr("area_k863k.ps1", s)

# ---------------------------------------------------------------- wtcopy_k863k.ps1
s = rd(r"work33\dbg\wtcopy_k863j.ps1")
s = ("# K863 J3k: copy of work33\\dbg\\wtcopy_k863j.ps1 (J3j's, untouched) by work34\\dbg\\mk_tools_k863k.py, for work34\n"
     "# and out34: the subfolders dbg, cand (the candidates' inputs), look, checks_logs and sheets; work34\\base and\n"
     "# each candidate's census builds are remade by checks_k863k.ps1. This stage's NOTES section is work34\\NOTES_k863k.md.\n"
     "# J3j's header:\n" + s)
s = sub(s, "foreach ($sub in 'dbg', 'probe', 'checks_logs', 'sheets') {", "foreach ($sub in 'dbg', 'cand', 'look', 'checks_logs', 'sheets') {")
s = sub(s, 'Get-ChildItem "$T\\work33" -File\n', 'Get-ChildItem "$T\\work34" -File\n')
s = sub(s, 'if (Test-Path "$T\\work33\\$sub") { $files += Get-ChildItem "$T\\work33\\$sub" -File -Recurse }',
        'if (Test-Path "$T\\work34\\$sub") { $files += Get-ChildItem "$T\\work34\\$sub" -File -Recurse }')
s = sub(s, 'if (Test-Path "$T\\work33\\det") { $files += Get-ChildItem "$T\\work33\\det" -File | Where-Object { $_.Extension -ne \'.svg\' } }\n', '')
s = sub(s, '$files += Get-ChildItem "$T\\out33\\png" -File -Recurse', '$files += Get-ChildItem "$T\\out34\\png" -File -Recurse')
s = sub(s, '$files += Get-Item "$T\\out33\\cursive_template.svg"', '$files += Get-Item "$T\\out34\\cursive_template.svg"')
wr("wtcopy_k863k.ps1", s)
