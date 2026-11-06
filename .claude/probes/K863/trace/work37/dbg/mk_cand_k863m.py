r"""K863 J3m: a candidate build's inputs. Copies <base dir>/bodies.json and writes <out dir>/join_params.json: the base's
join_params with the "k863m" forms of <k863m.json> (gen_k863m reads them) and, for every letter that file gives a
"k863m" fin, that letter's "k863k" fin removed (a letter has one word-end form).
Run from the trace dir:
  venv\Scripts\python.exe -I work37\dbg\mk_cand_k863m.py <base dir> <out dir> <k863m.json>"""
import copy
import json
import os
import shutil
import sys


def main():
    base, out, mp = sys.argv[1:4]
    os.makedirs(out, exist_ok=True)
    shutil.copyfile(os.path.join(base, "bodies.json"), os.path.join(out, "bodies.json"))
    P = copy.deepcopy(json.load(open(os.path.join(base, "join_params.json"))))
    M = json.load(open(mp))
    fk = P.get("k863k", {}).get("fin", {})
    for X in M.get("fin", {}):
        fk.pop(X, None)
    P["k863m"] = M
    with open(os.path.join(out, "join_params.json"), "w", encoding="utf-8") as fh:
        json.dump(P, fh, indent=1)
    print(f"{out}: k863k fin {sorted(fk)}, k863m fin {sorted(M.get('fin', {}))}, exit {sorted(M.get('exit', {}))}")


if __name__ == "__main__":
    main()
