# K1198 Run G (Muse batch 21, 21G) task 2: every ligature pair in Playwrite US Trad.
# Shapes each ordered lowercase pair (26x26) as a word through the kit's own path
# (tools/trace_k879.py shape() with tools/k886lib.py feats_for(), wght 100, the call
# work27/dbg/gen_k1027.py assemble() makes), records the pairs that come back as one
# letter glyph, then finds the HarfBuzz feature that makes each by re-shaping with
# candidate features off, one at a time then together. Then shapes the census corpus
# the same way and names any word still short of glyphs with no listed pair inside it.
# Read-only inputs: the trace's font and tools. Writes ligature_21g.txt/.json beside it.
# Run: <trace>\venv\Scripts\python.exe -I -B .claude\probes\K1198\ligature_21g.py
import json
import os
import sys

T = r"C:\Users\lsl\Repositories\knotmaze\.claude\probes\K863\trace"
KDIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(T, "tools"))
sys.path.insert(0, os.path.join(T, "work27", "dbg"))
import trace_k879 as K  # noqa: E402
import k886lib as L  # noqa: E402
from k863lib import Font  # noqa: E402

ABC = "abcdefghijklmnopqrstuvwxyz"
SINGLES = ["liga", "clig", "dlig", "hlig", "rlig", "calt", "ccmp", "ss02"]
TOGETHER = [
    ("liga+clig+dlig+hlig+rlig", ["liga", "clig", "dlig", "hlig", "rlig"]),
    ("liga kin + calt", ["liga", "clig", "dlig", "hlig", "rlig", "calt"]),
    ("all candidates", SINGLES),
]


def letter_glyphs(font, text, feats):
    """(all glyph names, letter glyph names) for text shaped at wght 100.

    A letter glyph is a shaped glyph that is not a connector (cnct*/entr*) and
    whose cluster character is a letter; a ligature covering two letters leaves
    one letter glyph whose cluster is the first letter.
    """
    sh = K.shape(font, text, 100, feats)
    allnames = [s["name"] for s in sh]
    letters = []
    for s in sh:
        n = s["name"]
        if n.startswith(("cnct", "entr")):
            continue
        c = text[s["cluster"]] if s["cluster"] < len(text) else " "
        if c.isalpha():
            letters.append(n)
    return allnames, letters, [(s["name"], s["cluster"]) for s in sh]


def census_strings():
    """The census corpus strings, built exactly as checks_k1112cusp.ps1 builds $cw."""
    words = ("minimum,bow,woven,boxes,people,hippo,puppy,and,knotmaze,cursive,"
             "quick brown fox,jumps over the lazy dog,be we shoe maze huge bye,"
             "ice jet even,coffee,which,oat,bad,subgroup,lawgiver,vg").split(",")
    opairs = ["o" + c for c in ABC]
    fpairs = ["f" + c for c in ABC]
    bp = ["b" + c for c in ABC]
    vp = ["v" + c for c in ABC]
    wp = ["w" + c for c in ABC]
    cp = ["c" + c for c in ABC]
    lowcusp = [a + b for a in "acdefhin" for b in "ijprstuwy"]
    cw0 = words + opairs + ["nt", "at", "it", "et"] + fpairs + ["of", "after"] + bp + vp + wp + ["wave"] + cp
    have = set(cw0)
    return cw0 + [p for p in lowcusp if p not in have]


def main():
    font = Font(os.path.join(T, "font", "PlaywriteUSTrad[wght].ttf"))
    rows = []
    ligated = []
    for a in ABC:
        for b in ABC:
            w = a + b
            feats = L.feats_for(w)
            allnames, letters, full = letter_glyphs(font, w, feats)
            # the same pair with no features at all: does feats_for itself ligate it?
            _, letters_bare, _ = letter_glyphs(font, w, {})
            is_lig = len(letters) == 1
            row = dict(pair=w, glyphs=allnames, letters=letters, shaping=full,
                       feats_for=feats, ligated=is_lig,
                       ligated_bare=len(letters_bare) == 1)
            rows.append(row)
            if is_lig:
                ligated.append(row)
    # feature attribution for each ligated pair
    for row in ligated:
        w = row["pair"]
        base = dict(L.feats_for(w))
        trials = []
        splitter = None
        for f in SINGLES:
            feats = dict(base)
            feats[f] = False
            try:
                _, letters, full = letter_glyphs(font, w, feats)
                split = len(letters) == 2
                trials.append(dict(off=f, letters=letters, shaping=full, split=split))
            except Exception as e:  # a feature this build rejects is recorded, not hidden
                trials.append(dict(off=f, error=repr(e), split=False))
            if trials[-1].get("split") and splitter is None:
                splitter = f
        together = []
        if splitter is None:
            for name, feats_off in TOGETHER:
                feats = dict(base)
                for f in feats_off:
                    feats[f] = False
                _, letters, full = letter_glyphs(font, w, feats)
                split = len(letters) == 2
                together.append(dict(off=name, letters=letters, shaping=full, split=split))
                if split and splitter is None:
                    splitter = name
        row["trials"] = trials
        row["together"] = together
        row["splitter"] = splitter
        row["feats_for_made"] = row["ligated"] and not row["ligated_bare"]
    # census corpus: fewer letter glyphs than letters, with no listed pair inside
    listed = [r["pair"] for r in ligated]
    corpus_hits = []
    for src, strings in (("checks $cw", census_strings()),
                         ("census rows", census_row_words())):
        for w in strings:
            _, letters, full = letter_glyphs(font, w, L.feats_for(w))
            nletters = sum(1 for ch in w if ch.isalpha())
            if len(letters) < nletters:
                inside = [p for p in listed if p in w.replace(" ", "")]
                corpus_hits.append(dict(source=src, word=w, letters=nletters,
                                        glyphs=len(letters), shaping=full,
                                        listed_inside=inside,
                                        longer=not inside))
    out_json = os.path.join(KDIR, "ligature_21g.json")
    with open(out_json, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(dict(pairs=rows, ligated=ligated, corpus=corpus_hits), fh, indent=1)
        fh.write("\n")
    lines = []
    lines.append("K1198 Run G (21G) ligature list: Playwrite US Trad, shaped as words through "
                 "trace_k879.shape(font, text, 100, k886lib.feats_for(text)) (the gen_k1027 path).")
    lines.append(f"pairs tried: {len(rows)} (26x26 ordered lowercase); ligated (one letter glyph "
                 f"for two letters): {len(ligated)}")
    for r in ligated:
        lines.append(f"  {r['pair']} -> {r['letters']} (shaping {r['shaping']}; "
                     f"feats_for {r['feats_for']}; splitter: {r['splitter']}; "
                     f"feats_for itself made it: {r['feats_for_made']})")
        for t in r["trials"]:
            if "error" in t:
                lines.append(f"    off {t['off']}: error {t['error']}")
            else:
                lines.append(f"    off {t['off']}: {t['shaping']} split={t['split']}")
        for t in r["together"]:
            lines.append(f"    off {t['off']}: {t['shaping']} split={t['split']}")
    lines.append(f"corpus strings short of glyphs: {len(corpus_hits)}")
    for h in corpus_hits:
        lines.append(f"  [{h['source']}] {h['word']!r}: {h['letters']} letters -> {h['glyphs']} "
                     f"glyphs {h['shaping']}; listed pairs inside: {h['listed_inside']}; "
                     f"longer ligature: {h['longer']}")
    out_txt = os.path.join(KDIR, "ligature_21g.txt")
    with open(out_txt, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(lines) + "\n")
    print("\n".join(lines))


def census_row_words():
    p = os.path.join(KDIR, "census_Plc1m.json")
    d = json.load(open(p, encoding="utf-8"))
    return sorted({r["word"] for r in d["rows"]})


if __name__ == "__main__":
    main()
