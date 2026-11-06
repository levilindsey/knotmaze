r"""K1112 Run P (22P): writes this run's ports of earlier stages' tools into work35/dbg (the originals untouched):
  census_k1112p.py <- work27/dbg/census_k1027.py (J3d's): work27/dbg on the import path, so gen_k1027 imports
  sheet_k1112p.py  <- work27/dbg/sheet_k1027.py (J3d's): the same import path; it draws with gen_k1027
  solves_k1112p.py <- work29/dbg/solves_k1113.py (J3f's): a build may be named <dir>@<ports>@<variant>
                      (its BUILDS fallback), which is how this run names work34/base with work35's ports
  side_k1112p.py   <- work31/dbg/side_k1112c.py (J3h's): the side test on a solves JSON, letter-neutral already
Run from the trace folder: venv\Scripts\python.exe -I work35\dbg\mk_tools_k1112p.py"""
import os

T = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
D = os.path.join(T, "work35", "dbg")


def rd(p):
    with open(os.path.join(T, p), encoding="utf-8") as fh:
        return fh.read()


def wr(name, s):
    with open(os.path.join(D, name), "w", encoding="utf-8", newline="\n") as fh:
        fh.write(s)
    print("wrote", os.path.join("work35", "dbg", name))


def sub(s, a, b, n=1):
    assert s.count(a) == n, (s.count(a), a[:80])
    return s.replace(a, b)


s = rd(r"work27\dbg\census_k1027.py")
s = ("# K1112 Run P: copy of work27/dbg/census_k1027.py (J3d's, untouched) by work35/dbg/mk_tools_k1112p.py:\n"
     "# work27/dbg on the import path after this folder, so gen_k1027 imports. J3d's header:\n" + s)
s = sub(s, "sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))\n",
        "sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))\n"
        "sys.path.insert(1, os.path.join(TR, \"work27\", \"dbg\"))  # K1112 Run P: gen_k1027 from J3d's folder\n")
wr("census_k1112p.py", s)

s = rd(r"work27\dbg\sheet_k1027.py")
s = ("# K1112 Run P: copy of work27/dbg/sheet_k1027.py (J3d's, untouched) by work35/dbg/mk_tools_k1112p.py:\n"
     "# work27/dbg on the import path after this folder, so gen_k1027 imports. J3d's header:\n" + s)
s = sub(s, "sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))\n",
        "sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))\n"
        "sys.path.insert(1, os.path.join(T, \"work27\", \"dbg\"))  # K1112 Run P: gen_k1027 from J3d's folder\n")
wr("sheet_k1112p.py", s)

s = rd(r"work29\dbg\solves_k1113.py")
s = ("# K1112 Run P: copy of work29/dbg/solves_k1113.py (J3f's, untouched) by work35/dbg/mk_tools_k1112p.py:\n"
     "# builds are named <dir>@<ports>@<variant> on the command line (its BUILDS fallback). J3f's header:\n" + s)
wr("solves_k1112p.py", s)

s = rd(r"work31\dbg\side_k1112c.py")
s = s.replace("K1112 (J3h, v7.1): the side test (K991) on every cusp entry a join out of c makes",
              "K1112 Run P: the side test (K991) on every cusp entry a join out of m or u makes")
s = s.replace("work31\\dbg\\side_k1112c.py", "work35\\dbg\\side_k1112p.py")
wr("side_k1112p.py", s)
