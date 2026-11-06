# K1198 Run G (Muse batch 22, 22G) task 1: the ligature rule's font.
# Rule (no per-pair data): keep calt on; in memory with fontTools, empty every GSUB
# ligature-substitution lookup -- LookupType 4, found by its type (never by name,
# number or pair); an Extension lookup (type 7) counts by the type its subtables
# wrap, so a wrapped type 4 is emptied the same way. Emptying = clearing each
# LigatureSet's Ligature list, so the lookup applies nowhere while every other
# lookup (calt's connectors included) shapes as before. The emptied font is saved
# beside this script (v68_22g/font_nolig.ttf) only so HarfBuzz can open it as a
# face; the kit's font and tools are read in place and never changed.
# Run: <trace>\venv\Scripts\python.exe -I -B .claude\probes\K1198\font_nolig_22g.py
import json
import os
import sys

T = r"C:\Users\lsl\Repositories\knotmaze\.claude\probes\K863\trace"
KDIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(T, "tools"))
sys.path.insert(0, os.path.join(T, "work27", "dbg"))

from fontTools.ttLib import TTFont  # noqa: E402
import trace_k879 as K  # noqa: E402
import k886lib as L  # noqa: E402
from k863lib import Font  # noqa: E402

SRC = os.path.join(T, "font", "PlaywriteUSTrad[wght].ttf")
OUTDIR = os.path.join(KDIR, "v68_22g")
OUT = os.path.join(OUTDIR, "font_nolig.ttf")


def empty_ligature_subtable(st, where, log):
    """Clear one LigatureSubst subtable's ligatures; return ligatures removed.

    fontTools 4.67 holds them as a dict {first glyph: [Ligature, ...]}; the
    classic form is ligatureSets (a LigatureSet per coverage glyph, each with a
    Ligature list). Clear whichever form is present.
    """
    n = 0
    lig = getattr(st, "ligatures", None)
    if isinstance(lig, dict):
        n += sum(len(v) for v in lig.values())
        st.ligatures = {}
    for ls in getattr(st, "ligatureSets", []) or []:
        n += len(getattr(ls, "Ligature", []) or [])
        ls.Ligature = []
    log.append(f"{where}: LigatureSubst emptied ({n} ligatures)")
    return n


def main():
    os.makedirs(OUTDIR, exist_ok=True)
    tt = TTFont(SRC)
    gsub = tt["GSUB"].table
    log = [f"K1198 22G font rule: empty GSUB ligature-substitution lookups by type "
           f"(type 4; type 7 by its wrapped type); calt kept. Source {SRC}"]
    removed = 0
    lig_lookups = []
    for i, lk in enumerate(gsub.LookupList.Lookup):
        if lk.LookupType == 4:
            lig_lookups.append(i)
            for k, st in enumerate(lk.SubTable):
                removed += empty_ligature_subtable(st, f"lookup {i} subtable {k}", log)
        elif lk.LookupType == 7:
            for k, st in enumerate(lk.SubTable):
                if getattr(st, "ExtensionLookupType", None) == 4:
                    lig_lookups.append(i)
                    inner = getattr(st, "SubTable", None)
                    if inner is not None:
                        removed += empty_ligature_subtable(
                            inner, f"lookup {i} extension subtable {k} (wraps type 4)", log)
    log.append(f"ligature lookups emptied (by index, for the record only): {lig_lookups}; "
               f"{removed} ligature rules removed")
    tt.save(OUT)
    log.append(f"saved {OUT} ({os.path.getsize(OUT)} bytes)")

    # Shaping smoke on the kit's own path (wght 100, feats_for): ij must split,
    # words without ij must shape glyph for glyph as with the stock font.
    stock = Font(SRC)
    mod = Font(OUT)
    for text in ("ij", "minimum", "coffee", "ice jet even", "jumps over the lazy dog"):
        a = [(s["name"], s["cluster"], s["x"]) for s in K.shape(stock, text, 100, L.feats_for(text))]
        b = [(s["name"], s["cluster"], s["x"]) for s in K.shape(mod, text, 100, L.feats_for(text))]
        log.append(f"shape {text!r}: stock {a}")
        log.append(f"shape {text!r}: nolig {b} ({'SAME' if a == b else 'MOVED'})")
    txt = os.path.join(OUTDIR, "font_nolig_22g.txt")
    with open(txt, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(log) + "\n")
    print("\n".join(log))
    print(f"inventory: {txt}")


if __name__ == "__main__":
    main()
