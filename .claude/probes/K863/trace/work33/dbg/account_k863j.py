r"""K863 J3j (base = v6.8): the account of every piece v6.9, v7.0, v7.1 and v7.2 changed against v6.8.
Written for J3j (no earlier tool did this). bez_pts, resample, dist, raw and rule_pairs are copied from
work32/dbg/locality_k1112cusp.py (J3i's, untouched), and the pieces are assembled as that tool assembles them
(gen_k1027.assemble, with_ref=False, B_ref=B), on J3i's census words (the words of work32/census_v72.json).
  dump <ver> <base> <ports.json> <variant>
      every piece -> work33/account/<ver>.json: joins, leads, tails (keyed as the census keys them, without the word
      number), the e variants' body0 (variant:e:after_o, variant:e:after_g) and every letter stroke
      (<word>:L<i><ch>s<k>) with the joins, lead or tail that cut it (a join's ends matched to the nearest stroke end).
  account <out.txt> <out.json>
      consecutive versions compared piece by piece (the raw coefficients): a piece whose raw JSON differs is measured
      (the largest distance between the two after resampling both to 400 points, u; under 1e-4 u it is numeric only),
      given the stage that moved it and its cause (the brief's list; anything else is unlisted and comes first), and
      the census fields on both sides (dist_max_u, hooks, rough; '-' where that census has no such piece; a stroke has
      none). Also: which letters' bodies, join params and ports each stage changed, per-pair and per-letter counts, and
      each later version against v6.8.
Run from the trace folder: venv\Scripts\python.exe -I work33\dbg\account_k863j.py dump v6.8 work33\base work28\ports_k990e.json M
"""
import json
import os
import re
import sys

T = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(T, "tools"))
sys.path.insert(0, os.path.join(T, "work26", "dbg"))
sys.path.insert(0, os.path.join(T, "work27", "dbg"))
import numpy as np  # noqa: E402
import gen_k1027 as G  # noqa: E402
import fewnode_k930 as FN  # noqa: E402
from k863lib import Font  # noqa: E402

S = 0.24
EPS = 1e-4
ABC = "abcdefghijklmnopqrstuvwxyz"
WORDS = ("minimum,bow,woven,boxes,people,hippo,puppy,and,knotmaze,cursive,quick brown fox,jumps over the lazy dog,"
         "be we shoe maze huge bye,ice jet even,coffee,which,oat,bad,subgroup,lawgiver,vg").split(",")
ORDER = ["v6.8", "v6.9", "v7.0", "v7.1", "v7.2"]
BASE = {"v6.8": ("work33/base", "work28/ports_k990e.json", "M"), "v6.9": ("work29/base", "work29/ports_k1113.json", "P"),
        "v7.0": ("work30/base", "work30/ports_k1119.json", "Pae90"),
        "v7.1": ("work31/base", "work31/ports_k1112c.json", "Pc10"),
        "v7.2": ("work32/base", "work32/ports_k1112cusp.json", "Plc2m")}
CENSUS = {"v6.8": ["work33/census_v68x.json"], "v6.9": ["work29/census_v69.json"],
          "v7.0": ["work31/census_v70.json", "work30/census_v70.json"], "v7.1": ["work32/census_v71.json"],
          "v7.2": ["work32/census_v72.json"]}
STEPS = [("J3f", "v6.8", "v6.9"), ("J3g", "v6.9", "v7.0"), ("J3h", "v7.0", "v7.1"), ("J3i", "v7.1", "v7.2")]
LISTED = {"J3f": "b's, v's and w's exits, every join out of them (the six into a and q, e's entry after them)",
          "J3g": "b's, v's and w's exits, every join out of them (the six into a and q, e's entry after them)",
          "J3h": "c's exit port; the joins out of c stopped reading J2's presets",
          "J3i": "one rule for the cusp entries (a low exit enters i j p r s t u w y up the upstroke)"}


def words():
    cw0 = (WORDS + ["o" + x for x in ABC] + ["nt", "at", "it", "et"] + ["f" + x for x in ABC] + ["of", "after"]
           + [b + x for b in "bvw" for x in ABC] + ["wave"] + ["c" + x for x in ABC])
    have = set(cw0)
    return cw0 + [p for p in (a + b for a in "acdefhin" for b in "ijprstuwy") if p not in have]


def bez_pts(bzs, n=40):
    out = []
    for b in bzs:
        b = np.asarray(b, float)
        t = np.linspace(0, 1, n)[:, None]
        out.append(((1 - t) ** 3) * b[0] + 3 * ((1 - t) ** 2) * t * b[1] + 3 * (1 - t) * t * t * b[2] + (t ** 3) * b[3])
    return np.vstack(out)


def resample(P, n=400):
    d = np.r_[0.0, np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))]
    if d[-1] <= 0:
        return np.repeat(P[:1], n, axis=0)
    u = np.linspace(0, d[-1], n)
    return np.c_[np.interp(u, d, P[:, 0]), np.interp(u, d, P[:, 1])]


def dist(a, b):
    return float(np.linalg.norm(resample(a) - resample(b), axis=1).max()) * S


def raw(x):
    return json.dumps(x, default=lambda o: np.asarray(o).tolist())


def rule_pairs(ports):
    """The rule's pairs: a low exit with a port (not in HIGH) into a letter whose entry record is a cusp window."""
    PT = ports["ports"]
    low = sorted(X for X in PT if "exit" in PT[X] and X not in G.HIGH)
    cusp = sorted(X for X in PT if PT[X].get("entry", {}).get("kind") == "cusp")
    return low, cusp, {a + b for a in low for b in cusp}


def end_stroke(strokes, pt, last):
    pt = np.asarray(pt, float)
    d = [float(np.linalg.norm(np.asarray(st[-1][3] if last else st[0][0], float) - pt)) for st in strokes]
    return int(np.argmin(d)), min(d)


def dump(ver, base, ports, variant):
    font = Font(os.path.join(T, "font", "PlaywriteUSTrad[wght].ttf"))
    B = json.load(open(os.path.join(T, base, "bodies.json")))
    P = json.load(open(os.path.join(T, base, "join_params.json")))
    pt = G.load_ports(os.path.join(T, ports), variant)
    out = {}
    for w in words():
        A = G.assemble(font, B, P, w, with_ref=False, B_ref=B, ports=pt)
        lets = {lt["i"]: lt for lt in A["letters"]}
        cut = {}

        def find(p_, last):
            best = None
            for lt in A["letters"]:
                s_, d_ = end_stroke(lt["strokes"], p_, last)
                if best is None or d_ < best[2]:
                    best = (lt["i"], s_, d_)
            return best[0], best[1]

        for j in A["joins"]:
            bz = FN.conn_beziers(j["coeffs"])
            pr = j["L"] + j["R"]
            sL = end_stroke(lets[j["iL"]]["strokes"], bz[0][0], True)[0]
            sR = end_stroke(lets[j["iR"]]["strokes"], bz[-1][3], False)[0]
            cut.setdefault((j["iL"], sL), []).append("out " + pr)
            cut.setdefault((j["iR"], sR), []).append("in " + pr)
            out[f"{w}:J{j['iL']}-{j['iR']}{pr}"] = dict(t="join", pair=pr, how="solved" if "port" in j else "preset",
                                                        bz=bz, raw=raw(j["coeffs"]))
        for nm in ("leads", "tails"):
            for k_, j in enumerate(A[nm]):
                bz = FN.conn_beziers(j["coeffs"])
                ch = j["ch"]
                if nm == "leads":
                    li, s_ = find(bz[-1][3], False)
                    t, pr = ("vlead" if "virtual" in j else "lead"), "^" + ch
                else:
                    li, s_ = find(bz[0][0], True)
                    t, pr = "tail", ch + "$"
                cut.setdefault((li, s_), []).append(t)
                out[f"{w}:{nm[:-1]}{k_}{ch}"] = dict(t=t, pair=pr, bz=bz, raw=raw(j["coeffs"]))
        for lt in A["letters"]:
            for si, st in enumerate(lt["strokes"]):
                out[f"{w}:L{lt['i']}{lt['ch']}s{si}"] = dict(t="stroke", pair=lt["ch"], ctx=cut.get((lt["i"], si), []),
                                                             bz=st, raw=raw(st))
    for rec in ("after_o", "after_g"):
        fr = (B.get("e", {}).get(rec) or {}).get("frame") or {}
        if "body0" in fr:
            out["variant:e:" + rec] = dict(t="variant", pair="e/" + rec[-1], bz=fr["body0"], raw=raw(fr["body0"]))
    os.makedirs(os.path.join(T, "work33", "account"), exist_ok=True)
    p = os.path.join(T, "work33", "account", ver + ".json")
    with open(p, "w") as fh:
        json.dump(dict(ver=ver, base=base, ports=ports, variant=variant, words=words(), pieces=out), fh,
                  default=lambda o: np.asarray(o).tolist())
    print(f"{ver}: {len(out)} pieces from {len(words())} words -> {p}")


def census(ver):
    out = {}
    for p in CENSUS[ver]:
        for r in json.load(open(os.path.join(T, p)))["rows"]:
            out.setdefault(re.sub(r"^w\d+:", "", r["id"]), r)
    return out


def cf(r):
    if r is None:
        return None
    return dict(dmax=float(r["dist_max_u"]), hooks=len(r.get("hooks") or []), rough=r.get("rough", "-"))


def fmt_cf(a, b):
    if a is None and b is None:
        return ""
    f = lambda r, k, s: "-" if r is None else (s % r[k])  # noqa: E731
    return (f"  dmax {f(a, 'dmax', '%.2f')}->{f(b, 'dmax', '%.2f')} hooks {f(a, 'hooks', '%d')}->{f(b, 'hooks', '%d')}"
            f" rough {f(a, 'rough', '%s')}->{f(b, 'rough', '%s')}")


def label(p):
    if p["t"] != "stroke":
        return p["pair"]
    prs = sorted({c.split(" ", 1)[1] for c in p.get("ctx", []) if " " in c})
    return "+".join(prs) if prs else p["pair"] + (" (" + ",".join(p["ctx"]) + ")" if p.get("ctx") else " alone")


def letters_of(p):
    if p["t"] == "stroke":
        return {p["pair"]}
    return {c for c in p["pair"] if c.isalpha()}


def cause(step, q, p, rule, chg):
    """(listed?, cause) for a piece the step moved; q = before, p = after; chg = the letters whose body or port the
    step changed (for naming an unlisted cause)."""
    t, pr = p["t"], p["pair"]
    ctx = sorted(set(p.get("ctx", [])) | set(q.get("ctx", [])))
    ins = [c[3:] for c in ctx if c.startswith("in ")]
    outs = [c[4:] for c in ctx if c.startswith("out ")]
    bvw, c3h, c3i = step in ("J3f", "J3g"), step == "J3h", step == "J3i"
    why = None
    if t == "join":
        L_, R_ = pr[0], pr[1]
        if bvw and L_ in "bvw":
            return True, "join out of b, v or w" + (" into a or q" if R_ in "aq" else " into e" if R_ == "e" else "")
        if c3h and L_ == "c":
            return True, "join out of c"
        if c3i and pr in rule:
            return True, "the cusp rule's join (a low exit into i j p r s t u w y)"
        why = "join into " + R_
    elif t == "tail":
        if bvw and pr[0] in "bvw":
            return True, "b, v or w's exit (tail)"
        if c3h and pr[0] == "c":
            return True, "c's exit (tail)"
        why = "tail of " + pr[0]
    elif t in ("lead", "vlead"):
        why = ("virtual lead" if t == "vlead" else "lead") + " into " + pr[1]
    elif t == "variant":
        if bvw:
            return True, "e's entry after b, v and w (the after_o record's body0)"
        why = "e variant"
    else:
        ch = pr
        if bvw and ch in "bvw" and (outs or "tail" in ctx):
            return True, "b, v or w's exit stroke"
        if bvw and any(x[0] in "bvw" for x in ins):
            return True, "the stroke after a join out of b, v or w (its entry)"
        if c3h and ch == "c" and (outs or "tail" in ctx):
            return True, "c's exit stroke"
        if c3h and any(x[0] == "c" for x in ins):
            return True, "the stroke after a join out of c (its entry)"
        if c3i and any(x in rule for x in ins):
            return True, "the cusp letter's stroke after a rule join (its entry)"
        if c3i and any(x in rule for x in outs):
            return True, "the exit stroke a rule join cuts"
        why = f"stroke of {ch}" + (f" ({', '.join(ctx)})" if ctx else " (no join)")
    hit = sorted(letters_of(p) & chg)
    return False, why + (f"; changed in this stage: {', '.join(hit)}" if hit else "; no body or port of its letters changed")


def data_diff(a, b):
    """The letters whose bodies, join params or ports differ between versions a and b (raw JSON per key)."""
    res = {}
    for nm in ("bodies.json", "join_params.json"):
        X = json.load(open(os.path.join(T, BASE[a][0], nm)))
        Y = json.load(open(os.path.join(T, BASE[b][0], nm)))
        res[nm] = [k for k in sorted(set(X) | set(Y)) if raw(X.get(k)) != raw(Y.get(k))]
    pa = G.load_ports(os.path.join(T, BASE[a][1]), BASE[a][2])
    pb = G.load_ports(os.path.join(T, BASE[b][1]), BASE[b][2])
    PA, PB = pa.get("ports", {}), pb.get("ports", {})
    res["ports"] = [k for k in sorted(set(PA) | set(PB)) if raw(PA.get(k)) != raw(PB.get(k))]
    res["ports (other keys)"] = [k for k in sorted((set(pa) | set(pb)) - {"ports"}) if raw(pa.get(k)) != raw(pb.get(k))]
    return res


def account(out_txt, out_json):
    D = {}
    for v in ORDER:
        with open(os.path.join(T, "work33", "account", v + ".json")) as fh:
            D[v] = json.load(fh)["pieces"]
    C = {v: census(v) for v in ORDER}
    rule = rule_pairs(G.load_ports(os.path.join(T, BASE["v7.2"][1]), BASE["v7.2"][2]))[2]
    cw = {re.sub(r"^w\d+:", "", r["id"]).split(":")[0] for r in json.load(open(os.path.join(T, "work32", "census_v72.json")))["rows"]
          if r["type"] != "variant"}
    L = [f"K863 J3j: the account of every piece v6.9, v7.0, v7.1 and v7.2 changed against v6.8 (work33/account/*.json, "
         f"{len(words())} words: J3i's census words; they {'equal' if cw == set(words()) else 'DIFFER from'} the words of "
         f"work32/census_v72.json). A piece moved when its raw coefficients differ by at least {EPS} u after resampling; "
         f"under that it is numeric only. Census fields: dist_max_u (the font distance), hooks, rough, before->after, "
         f"from {', '.join(f'{v} {CENSUS[v][0]}' for v in ORDER)} ('-': not in that census; strokes have none).",
         f"the cusp rule's pairs (v7.2's ports): {len(rule)}", ""]
    recs, data, only = [], {}, {}
    for st, a, b in STEPS:
        data[st] = data_diff(a, b)
        A_, B_ = D[a], D[b]
        only[st] = sorted(set(A_) ^ set(B_))
        chg = set(data[st]["bodies.json"]) | set(data[st]["ports"])
        for k in A_:
            if k not in B_ or A_[k]["raw"] == B_[k]["raw"]:
                continue
            pa, pb = bez_pts(A_[k]["bz"]), bez_pts(B_[k]["bz"])
            m = dist(pa, pb)
            listed, why = cause(st, A_[k], B_[k], rule, chg)
            recs.append(dict(step=st, frm=a, to=b, key=k, t=B_[k]["t"], label=label(B_[k]), letters=sorted(letters_of(B_[k])),
                             move=m, start=float(np.linalg.norm(pa[0] - pb[0])) * S,
                             end=float(np.linalg.norm(pa[-1] - pb[-1])) * S, numeric=m < EPS, listed=listed, cause=why,
                             before=cf(C[a].get(k)), after=cf(C[b].get(k)), v68=cf(C["v6.8"].get(k)),
                             ctx=sorted(set(A_[k].get("ctx", [])) | set(B_[k].get("ctx", [])))))
    mv = [r for r in recs if not r["numeric"]]
    L.append("(0) what each stage changed in the data (raw JSON per key)")
    for st, a, b in STEPS:
        d = data[st]
        L.append(f"  {st} ({a} -> {b}): bodies {d['bodies.json']}; join params {d['join_params.json']}; ports "
                 f"{d['ports']}; other port keys {d['ports (other keys)']}; pieces in one version only: {len(only[st])}"
                 + (f" {only[st][:12]}" if only[st] else ""))
    L.append("")
    L.append("(1) per stage: pieces compared, moved (>= 1e-4 u), numeric only; by cause: pieces, the largest move")
    for st, a, b in STEPS:
        rs = [r for r in recs if r["step"] == st]
        L.append(f"  {st} ({a} -> {b}): {len(D[a])} pieces, {sum(not r['numeric'] for r in rs)} moved, "
                 f"{sum(r['numeric'] for r in rs)} numeric only; listed cause: {LISTED[st]}")
        cs = {}
        for r in rs:
            cs.setdefault((not r["listed"], r["numeric"], r["cause"].split(";")[0]), []).append(r)
        for (un, nu, c_), lst in sorted(cs.items()):
            top = max(lst, key=lambda r: r["move"])
            L.append(f"    {'UNLISTED ' if un else 'listed   '}{'numeric ' if nu else ''}{c_:60s} {len(lst):4d}, largest "
                     f"{top['move']:.3g} u ({top['key']})")
    L.append("")
    L.append("(2) FIRST FINDING: the pieces moved for a cause not listed in the brief (>= 1e-4 u), by stage and cause, "
             "largest first")
    un = [r for r in mv if not r["listed"]]
    L.append(f"  {len(un)} pieces" + ("" if un else ": none"))
    L += detail(un)
    L.append("")
    L.append("(3) the pieces moved for a listed cause, by stage and cause, with counts per letter pair")
    L += detail([r for r in mv if r["listed"]])
    L.append("")
    L.append("(4) numeric-only differences (< 1e-4 u), by stage and cause")
    L += detail([r for r in recs if r["numeric"]], brief=True)
    L.append("")
    L.append("(5) per letter: moved pieces (>= 1e-4 u) that hold the letter (a join or lead or tail by its pair, a stroke "
             "by its own letter), per stage; listed / unlisted")
    for st, a, b in STEPS:
        cnt = {}
        for r in mv:
            if r["step"] != st:
                continue
            for ch in r["letters"]:
                c_ = cnt.setdefault(ch, [0, 0])
                c_[0 if r["listed"] else 1] += 1
        L.append(f"  {st}: " + (", ".join(f"{ch} {x}/{y}" for ch, (x, y) in sorted(cnt.items())) or "none"))
    L.append("")
    L.append("(6) each later version against v6.8 directly (raw coefficients; moved >= 1e-4 u), by type")
    for v in ORDER[1:]:
        cnt, tot, top = {}, 0, (0.0, "")
        for k, p in D["v6.8"].items():
            if k not in D[v] or p["raw"] == D[v][k]["raw"]:
                continue
            m = dist(bez_pts(p["bz"]), bez_pts(D[v][k]["bz"]))
            if m < EPS:
                continue
            tot += 1
            cnt[p["t"]] = cnt.get(p["t"], 0) + 1
            top = max(top, (m, k))
        L.append(f"  v6.8 -> {v}: {tot} pieces differ ({', '.join(f'{t} {n}' for t, n in sorted(cnt.items()))}); largest "
                 f"{top[0]:.3g} u ({top[1]})")
    with open(out_txt, "w", encoding="utf-8") as fh:
        fh.write("\n".join(L) + "\n")
    with open(out_json, "w") as fh:
        json.dump(dict(steps=STEPS, data=data, only=only, moved=recs), fh, indent=0)
    print("\n".join(l_ for l_ in L if not l_.startswith("      ")))


def detail(rs, brief=False):
    L = []
    for st, _, _ in STEPS:
        gs = {}
        for r in rs:
            if r["step"] == st:
                gs.setdefault(r["cause"].split(";")[0], []).append(r)
        for c_, lst in sorted(gs.items()):
            pc = {}
            for r in lst:
                pc[r["label"]] = pc.get(r["label"], 0) + 1
            L.append(f"  {st} | {c_}: {len(lst)} pieces; per pair: "
                     + ", ".join(f"{p} {n}" for p, n in sorted(pc.items(), key=lambda x: (-x[1], x[0]))))
            if brief:
                L.append("      " + ", ".join(f"{r['key']} {r['move']:.2g}" for r in sorted(lst, key=lambda r: -r["move"])))
                continue
            for r in sorted(lst, key=lambda r: (-r["move"], r["key"])):
                ex = "" if r["t"] != "stroke" else f"  start {r['start']:.3f} end {r['end']:.3f} u"
                nm = r["cause"].split(";", 1)[1].strip() if ";" in r["cause"] else ""
                L.append(f"      {r['label']:9s} {r['move']:7.3f} u  {r['key']:40s} {r['t']:6s}{fmt_cf(r['before'], r['after'])}"
                         f"{ex}{('  [' + nm + ']') if nm else ''}")
    return L


if __name__ == "__main__":
    if sys.argv[1] == "dump":
        dump(*sys.argv[2:6])
    elif sys.argv[1] == "account":
        account(sys.argv[2], sys.argv[3])
    else:
        raise SystemExit(__doc__)
