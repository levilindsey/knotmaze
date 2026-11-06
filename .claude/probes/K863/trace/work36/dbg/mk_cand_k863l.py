r"""K863 J3l: a candidate build's inputs. Copies <base dir>/bodies.json and writes <out dir>/join_params.json: the base's
join_params plus the "k863k" forms gen_k863k reads ("fin" from the forms files, later files overriding a letter;
"dot" from a join_params that carries J3k's D2) and, if given, q's word-end tail prm (its end frame is kept).
Run from the trace dir:
  venv\Scripts\python.exe -I work36\dbg\mk_cand_k863l.py <base dir> <out dir> <forms.json[,forms2.json...]|->
      <q prm a0,a1,b0,b1|q json with "prm"|-> <dot join_params.json|->"""
import copy
import json
import os
import shutil
import sys


def main():
    base, out, fl, qa, dp = sys.argv[1:6]
    os.makedirs(out, exist_ok=True)
    shutil.copyfile(os.path.join(base, "bodies.json"), os.path.join(out, "bodies.json"))
    P = json.load(open(os.path.join(base, "join_params.json")))
    P = copy.deepcopy(P)
    K = P.setdefault("k863k", {})
    if fl != "-":
        fin = {}
        for f in fl.split(","):
            fin.update(json.load(open(f))["fin"])
        if fin:
            K["fin"] = fin
    if dp != "-":
        K["dot"] = json.load(open(dp))["k863k"]["dot"]
    if qa != "-":
        if qa.endswith(".json"):
            prm = [float(v) for v in json.load(open(qa))["prm"]]
        else:
            prm = [float(v) for v in qa.split(",")]
        assert len(prm) == 4
        P["tail_letter"]["q"]["prm"] = prm
    if not K:
        del P["k863k"]
    with open(os.path.join(out, "join_params.json"), "w", encoding="utf-8") as fh:
        json.dump(P, fh, indent=1)
    print(f"{out}: fin {sorted(K.get('fin', {}))}, dot {sorted(K.get('dot', {}))}, "
          f"q prm {P['tail_letter']['q']['prm']}")


if __name__ == "__main__":
    main()
