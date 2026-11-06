r"""K863 J3j (base = v6.8): writes J3j's ports of J3i's tools into work33/dbg (the originals untouched):
  pairs_k863j.py   <- work32/dbg/pairs_k1112cusp.py, plus seam_detail(): every undesigned seam of each census, one line
                      each (the piece, the seam's text, gap u / angle deg / dk 1/u), the cusp entries apart from the rest
  probe_k863j.ps1  <- work32/dbg/probe_k1112cusp.ps1, retargeted: build v68 (work33/base, work28/ports_k990e.json M,
                      the default) writing work33/probe
  area_k863j.ps1   <- work31/dbg/area_k1112c.ps1 writing work33/sheets/png
  wtcopy_k863j.ps1 <- work32/dbg/wtcopy_k1112cusp.ps1 for work33 and out33 (the worktree copies; the account's dumps left out)
checks_k863j.ps1, account_k863j.py, same_k863j.py and sheetcol_k863j.py are written for J3j (no earlier tool to port).
J3e's steps (template, build, ctx, census_v68) need no port: checks_k863j.ps1 runs J3e's tools in place
(work23/dbg/build_k1019.ps1, work27/dbg/ctx_template_k1027.py, work27/dbg/census_k1027.py), as J3e's checks did.
Run from the trace folder: venv\Scripts\python.exe -I work33\dbg\mk_tools_k863j.py
"""
import os

T = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
D = os.path.join(T, "work33", "dbg")


def sub(s, a, b, n=1):
    assert s.count(a) == n, (s.count(a), a[:80])
    return s.replace(a, b)


def rd(p):
    with open(os.path.join(T, p), encoding="utf-8") as fh:
        return fh.read()


def wr(name, s):
    with open(os.path.join(D, name), "w", encoding="utf-8", newline="\n") as fh:
        fh.write(s)
    print("wrote", os.path.join("work33", "dbg", name))


DETAIL = r'''

def seam_detail():
    """K863 J3j: every undesigned seam of each census (not designed, not G2 by SU.g2), one line each: the piece, where
    (the seam's text), gap u, angle deg (the census's ang_deg; SU.g2 reads angle_deg, which the census does not write,
    so the angle never counts there) and dk 1/u; entries into i j p r s t u w y (the cusp corners) apart from the rest.
    Appended to the output file."""
    out = sys.argv[1]
    L = ["", "K863 J3j: every undesigned seam, per census (piece, where: gap u / angle deg / dk 1/u), largest dk first"]
    for a in sys.argv[2:]:
        name, path = a.split("=", 1)
        rows = json.load(open(path))["rows"]
        cusp, rest = [], []
        for r in rows:
            for s in r.get("seams", []):
                if s.get("designed") or SU.g2(s):
                    continue
                txt = s.get("seam", "")
                (cusp if txt.startswith("entry ") and txt[6:7] in "ijprstuwy" else rest).append((s.get("dk_u", 0), r, s))
        L.append(f"  {name}: {len(cusp) + len(rest)} undesigned seams, {len(cusp)} at an entry into i j p r s t u w y")
        for hd, lst in (("cusp corners", cusp), ("the rest", rest)):
            L.append(f"    {hd} ({len(lst)}):")
            for dk, r, s in sorted(lst, key=lambda x: -x[0]):
                L.append(f"      {r['pair']:4s} {r['id']:36s} {s['seam']}: gap {s.get('gap_u', 0):.3g} u, "
                         f"angle {s.get('ang_deg', 0):.3g} deg, dk {dk:.3g} /u")
    with open(out, "a", encoding="utf-8") as fh:
        fh.write("\n".join(L) + "\n")
    print("\n".join(L))

'''


def pairs():
    s = rd(os.path.join("work32", "dbg", "pairs_k1112cusp.py"))
    s = ("# K863 J3j: copy of work32/dbg/pairs_k1112cusp.py (J3i's, untouched) by work33/dbg/mk_tools_k863j.py, plus\n"
         "# seam_detail() (every undesigned seam: piece, where, gap / angle / dk), run after main().\n" + s)
    t = s.rstrip()
    assert t.endswith("\nmain()"), t[-40:]
    s = t[:-len("main()")].rstrip("\n") + "\n" + DETAIL + "\nmain()\nseam_detail()\n"
    wr("pairs_k863j.py", s)


def probe():
    s = rd(os.path.join("work32", "dbg", "probe_k1112cusp.ps1"))
    s = sub(s, 'param([string[]]$Builds = @("v71", "Plc1", "Plc2", "Plc3"), [string]$Pins = "")',
            'param([string[]]$Builds = @("v68"), [string]$Pins = "")')
    s = sub(s, "New-Item -ItemType Directory -Force work32\\probe | Out-Null",
            "New-Item -ItemType Directory -Force work33\\probe | Out-Null")
    s = sub(s, '$spec = if ($b -eq "v71") {',
            '$spec = if ($b -eq "v68") { "work33/base@work28/ports_k990e.json@M" } elseif ($b -eq "v71") {')
    s = sub(s, '$o = "work32\\probe\\lowcusp_$b$suf"', '$o = "work33\\probe\\lowcusp_$b$suf"', 2)
    s = ("# K863 J3j: copy of work32\\dbg\\probe_k1112cusp.ps1 (J3i's, untouched) by work33\\dbg\\mk_tools_k863j.py:\n"
         "# build v68 (work33/base, work28/ports_k990e.json M) added and the default; output in work33\\probe.\n"
         "# Run: pwsh -NoProfile -File work33\\dbg\\probe_k863j.ps1 [v68,...]. J3i's header:\n" + s)
    wr("probe_k863j.ps1", s)


def area():
    s = rd(os.path.join("work31", "dbg", "area_k1112c.ps1"))
    s = sub(s, '$out = "$T\\work31\\sheets\\png"', '$out = "$T\\work33\\sheets\\png"')
    s = ("# K863 J3j: copy of work31\\dbg\\area_k1112c.ps1 (J3h's, untouched) writing work33\\sheets\\png. Its header:\n"
         + s)
    wr("area_k863j.ps1", s)


def wtcopy():
    s = rd(os.path.join("work32", "dbg", "wtcopy_k1112cusp.ps1"))
    s = sub(s, "work32\\dbg\\wtcopy_k1112cusp.ps1", "work33\\dbg\\wtcopy_k863j.ps1")
    s = sub(s, "is work32/NOTES_k1112cusp.md), the big sheet SVGs (out32/*.svg but the template, on Drive K863/; their PNGs go), the\n"
               "# Drive copies (work32/upload) and the builds (work32/base, work32/det/base: checks_k1112cusp.ps1 remakes them).",
            "is work33/NOTES_k863j.md), the big sheet SVGs (out33/*.svg but the template; their PNGs go), the account's\n"
            "# dumps (work33/account: its account step remakes them) and the builds (work33/base, work33/det/base:\n"
            "# checks_k863j.ps1 remakes them).")
    s = sub(s, '$files += Get-ChildItem "$T\\work32" -File', '$files += Get-ChildItem "$T\\work33" -File')
    s = sub(s, "foreach ($sub in 'dbg', 'probe', 'checks_logs', 'sheets', 'det\\solves_D') {\n"
               "    if (Test-Path \"$T\\work32\\$sub\") { $files += Get-ChildItem \"$T\\work32\\$sub\" -File -Recurse }",
            "foreach ($sub in 'dbg', 'probe', 'checks_logs', 'sheets') {\n"
            "    if (Test-Path \"$T\\work33\\$sub\") { $files += Get-ChildItem \"$T\\work33\\$sub\" -File -Recurse }")
    s = sub(s, '$files += Get-ChildItem "$T\\work32\\det" -File | Where-Object { $_.Extension -ne \'.svg\' }',
            'if (Test-Path "$T\\work33\\det") { $files += Get-ChildItem "$T\\work33\\det" -File | Where-Object { $_.Extension -ne \'.svg\' } }')
    s = sub(s, '$files += Get-ChildItem "$T\\out32\\png" -File -Recurse', '$files += Get-ChildItem "$T\\out33\\png" -File -Recurse')
    s = sub(s, '$files += Get-Item "$T\\out32\\cursive_template.svg"', '$files += Get-Item "$T\\out33\\cursive_template.svg"')
    s = ("# K863 J3j: copy of work32\\dbg\\wtcopy_k1112cusp.ps1 (J3i's, untouched) by work33\\dbg\\mk_tools_k863j.py, for\n"
         "# work33 and out33 (the account's dumps left out too). J3i's header:\n" + s)
    wr("wtcopy_k863j.ps1", s)


if __name__ == "__main__":
    pairs()
    probe()
    area()
    wtcopy()
