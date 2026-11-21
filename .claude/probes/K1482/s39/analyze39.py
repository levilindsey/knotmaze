# K1482 s39: read diffseq39.ps1's text for each maze (out/s39/diff_<sub>/diffseq_<maze>[_off].txt), append one line
# per maze to out/s39/mazes.txt and one line per changed place (start m vs candidate c, gf_b2, the still border shot)
# to out/s39/places.txt, and make one sheet per place with place39.py into out/s39/sheets/.
#   python analyze39.py <maze>[,_off] ... [--sub raw] [--img gf_b2] [--tag m,c] [--no-sheets]
# A maze with a floor (m vs m2 or c vs c2) above 0 px is flagged RECAPTURE.
import os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", "out", "s39"))
sys.path.insert(0, HERE)
args = [a for a in sys.argv[1:] if not a.startswith("--")]
opt = {a.split("=")[0]: (a.split("=")[1] if "=" in a else "1") for a in sys.argv[1:] if a.startswith("--")}
sub = opt.get("--sub", "raw"); img = opt.get("--img", "gf_b2"); a_t, b_t = opt.get("--tag", "m,c").split(",")
fa2 = "m2" if a_t == "m" else a_t; 
sheets = "--no-sheets" not in opt
from place39 import sheet
from PIL import Image
cache = {}
op = lambda p: cache.setdefault(p, Image.open(p).convert("RGB"))
for mz in args:
    log = os.path.join(OUT, f"diff_{sub}", f"diffseq_{mz}.txt")
    txt = open(log, encoding="utf-8-sig", errors="replace").read().splitlines()
    loads = [l for l in txt if l.startswith("load ")]
    hashes = sorted(set(re.findall(r"hash (\w+) lost (\d+)", " ".join(loads))))
    passes = re.findall(r"passes (\d+)", " ".join(loads))
    def block(title):
        i = [k for k, l in enumerate(txt) if l.startswith(f"== {mz} {img} {title}")]
        if not i: return None
        j = i[0] + 1; b = []
        while j < len(txt) and not txt[j].startswith("== "): b.append(txt[j]); j += 1
        return b
    b1 = block(f"{a_t} vs {b_t} (floor"); b2 = block(f"{fa2} vs {b_t}2 (floor") or block(f"{fa2} vs {b_t}2 ("); b3 = block(f"{b_t} vs {b_t}2 (")
    num = lambda b, key: (int(re.search(key + r": (\d+) px", " ".join(b)).group(1)) if b and re.search(key + r": (\d+) px", " ".join(b)) else None)
    floor_a = num(b1, "floor \\(today vs today again\\)"); floor_b = num(b3, "today vs new")
    ab = num(b1, "today vs new"); ab2 = num(b2, "today vs new")
    ph = re.search(r"today vs new: .*? places (\d+)", " ".join(b1 or [])); np_ = int(ph.group(1)) if ph else None
    places = []
    for l in (b1 or []):
        m = re.match(r"\s+(\d+),(\d+) near (\S+) \((\d+) px\): n (\d+) gain (\d+) lose (\d+)", l)
        if m: places.append(tuple(m.groups()))
    gained = sum(int(p[5]) for p in places); lost = sum(int(p[6]) for p in places)
    flag = "" if (floor_a == 0 and floor_b == 0) else " RECAPTURE"
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, "mazes.txt"), "a", encoding="utf-8") as f:
        f.write(f"{mz}\thash {','.join(h for h,_ in hashes)} lost {','.join(l for _,l in hashes)} passes {','.join(passes)}\t{a_t}-vs-{fa2} {floor_a} px\t{b_t}-vs-{b_t}2 {floor_b} px\t{a_t}-vs-{b_t} {ab} px in {np_} places (gained {gained}, lost {lost})\trepeat {fa2}-vs-{b_t}2 {ab2} px{flag}\n")
    print(f"{mz}: floors {floor_a}/{floor_b}, {a_t}-vs-{b_t} {ab} px, {np_} places, gained {gained} lost {lost}, repeat {ab2}{flag}; hash {hashes}")
    for (x, y, nm, dd, n, g, ls) in places:
        sp = ""
        if sheets:
            nm_ = re.sub(r"[^\w+.-]", "_", nm)
            sp = os.path.join(OUT, "sheets", f"{mz}_{x}x{y}_{nm_}.png")
            bp = os.path.join(OUT, sub, a_t, mz, img + ".png"); cp = os.path.join(OUT, sub, b_t, mz, img + ".png")
            sheet(sp, f"{mz} near {nm}", int(x), int(y), bp, cp, op(bp), op(cp))
        with open(os.path.join(OUT, "places.txt"), "a", encoding="utf-8") as f:
            f.write(f"{mz}\t{x},{y}\t{n} px changed\t{g} px gained\t{ls} px lost\tnear {nm}\t{sp}\n")
