# K1583 (Muse batch 27 Run Z7): cut each maze's today|new pair into labelled tiles.
#   python tiles.py --raw <rawDir> --out <tilesDir> --commit <sha>
# The rules, exactly as the code below has them:
# - Grid: 4 columns (a..d) by 3 rows (1..3) over the frame; cell (c, r) is
#   x in [c*W//4, (c+1)*W//4), y in [r*H//3, (r+1)*H//3), device px, no downscale.
# - Ink pixel (per frame): the pixel's max-channel distance from its own cell's
#   per-channel median (the cell's background: threads cover under half a cell)
#   is over 12. A cell holds ink when either frame has over 1000 ink pixels in
#   it; cells with no ink in both frames are skipped and counted in index.json.
#   (On A_3 the background-only cells read 47-302 ink px and the emptiest thread
#   cell 31k, so the count threshold sits in an empty decade; it is biased low
#   on purpose - an extra background tile costs a page, a skipped thread cell
#   would lose a place Levi is to mark.)
# - diffGt24 (per tile, a sort key only, not a verdict): pixels of the cell whose
#   max-channel absolute difference between today and new is over 24.
# - Tile: the cell today (left) | 4 px divider | the cell new (right), full device
#   resolution, under a 36 px label strip reading "<maze> <col><row>   today | new".
# Frames are the pair's still shots (today_b2.png, gf_b2.png; cap27z7.mjs). A pair
# is cut only when cap_meta.json proves it: both hashes equal, both B2 views
# bit-equal, lost 0, gf fallback empty and passes over 0. Outputs stay untracked.
import argparse, json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

MAZES = ["A_3", "A_4", "A_5", "A_6", "A_7", "A_8", "A_9", "A_a", "A_b", "A_c", "A_d",
         "D_1", "D_2", "D_3", "D_4", "D_5", "D_6", "D_7", "D_8", "D_9", "D_a"]
TABLE = {
    "A_3": ("fff8c9e5", "3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1"),
    "A_4": ("17be5630", "4.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1"),
    "A_5": ("c79a38dc", "5.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1"),
    "A_6": ("0effcae3", "6.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1"),
    "A_7": ("b185ec76", "7.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1"),
    "A_8": ("c193f2c9", "8.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1"),
    "A_9": ("056f646d", "9.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1"),
    "A_a": ("11744900", "a.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1"),
    "A_b": ("98ae3432", "b.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1"),
    "A_c": ("076a7008", "c.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1"),
    "A_d": ("190b62ed", "d.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1"),
    "D_1": ("0f28ceb4", "1&xp=off&am=instant&gfh=1&tlk=border"),
    "D_2": ("820b0b4c", "2&xp=off&am=instant&gfh=1&tlk=border"),
    "D_3": ("f9d72040", "3&xp=off&am=instant&gfh=1&tlk=border"),
    "D_4": ("730413eb", "4&xp=off&am=instant&gfh=1&tlk=border"),
    "D_5": ("4886df51", "5&xp=off&am=instant&gfh=1&tlk=border"),
    "D_6": ("754983e6", "6&xp=off&am=instant&gfh=1&tlk=border"),
    "D_7": ("983ff750", "7&xp=off&am=instant&gfh=1&tlk=border"),
    "D_8": ("f8f3b24c", "8&xp=off&am=instant&gfh=1&tlk=border"),
    "D_9": ("6c9228b5", "9&xp=off&am=instant&gfh=1&tlk=border"),
    "D_a": ("dbd0530d", "a&xp=off&am=instant&gfh=1&tlk=border"),
}
LABEL_H, DIVIDER = 36, 4


def ink_count(a, x0, y0, x1, y1):
    cell = a[y0:y1, x0:x1].astype(np.int32)
    med = np.median(cell.reshape(-1, 3), axis=0)
    return int((np.abs(cell - med).max(axis=2) > 12).sum())


def load_font():
    for p in ("C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/segoeui.ttf"):
        if os.path.exists(p):
            return ImageFont.truetype(p, 22)
    return ImageFont.load_default()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--commit", default="")
    ap.add_argument("--mazes", default="")
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    font = load_font()
    index = {
        "commit": args.commit,
        "inkRule": "max-channel distance from the cell's own per-channel median over 12; cell kept when either frame has over 1000 ink px in it",
        "diffRule": "diffGt24: max-channel absolute difference between today and new over 24 (sort key only)",
        "grid": "4 columns a..d by 3 rows 1..3; cell x [c*W//4,(c+1)*W//4), y [r*H//3,(r+1)*H//3)",
        "mazes": [],
    }
    total_tiles = total_skipped = 0
    mazes = [m for m in MAZES if not args.mazes or m in args.mazes.split(",")]
    for maze in mazes:
        exp_hash, q0 = TABLE[maze]
        raw_maze = os.path.join(args.raw, maze)
        meta = json.load(open(os.path.join(raw_maze, "cap_meta.json"), encoding="utf-8"))
        g, t = meta["loads"]["gf"], meta["loads"]["today"]
        ok = (g["hash"] == t["hash"] == exp_hash and g["view"] == t["view"] and g["view"]
              and g["lost"] == 0 and t["lost"] == 0
              and g["gfStats"]["fallback"] == "" and g["gfStats"]["passes"] > 0)
        if not ok:
            raise SystemExit(f"tiles: {maze} pair not valid: {json.dumps(meta['loads'])}")
        today = Image.open(os.path.join(raw_maze, "today_b2.png")).convert("RGB")
        new = Image.open(os.path.join(raw_maze, "gf_b2.png")).convert("RGB")
        if today.size != new.size:
            raise SystemExit(f"tiles: {maze} frame sizes differ {today.size} {new.size}")
        W, H = today.size
        A = np.asarray(today).astype(np.int32)
        B = np.asarray(new).astype(np.int32)
        diff = np.abs(B - A).max(axis=2)
        tiles, skipped = [], []
        for r in range(3):
            for c in range(4):
                cell = "abcd"[c] + str(r + 1)
                x0, x1 = c * W // 4, (c + 1) * W // 4
                y0, y1 = r * H // 3, (r + 1) * H // 3
                iA = ink_count(A, x0, y0, x1, y1)
                iB = ink_count(B, x0, y0, x1, y1)
                if iA <= 1000 and iB <= 1000:
                    skipped.append({"cell": cell, "inkToday": iA, "inkNew": iB})
                    continue
                cw, ch = x1 - x0, y1 - y0
                tile = Image.new("RGB", (cw * 2 + DIVIDER, LABEL_H + ch), (0, 0, 0))
                tile.paste(today.crop((x0, y0, x1, y1)), (0, LABEL_H))
                d = ImageDraw.Draw(tile)
                d.rectangle([cw, LABEL_H, cw + DIVIDER - 1, LABEL_H + ch - 1], fill=(90, 90, 90))
                tile.paste(new.crop((x0, y0, x1, y1)), (cw + DIVIDER, LABEL_H))
                d.text((10, 6), f"{maze} {cell}   today | new", fill=(255, 255, 255), font=font)
                name = f"{maze}_{cell}.png"
                tile.save(os.path.join(args.out, name), optimize=True)
                tiles.append({"file": name, "cell": cell, "rect": [x0, y0, x1, y1],
                              "diffGt24": int((diff[y0:y1, x0:x1] > 24).sum()),
                              "inkToday": iA, "inkNew": iB})
        q_new = "?" + q0 + "&bgs=0&fw=0&rp=gf"
        q_today = "?" + q0.replace("&gfh=1", "") + "&bgs=0&fw=0"
        index["mazes"].append({
            "maze": maze, "link": q_new, "linkNew": q_new, "linkToday": q_today,
            "hash": g["hash"], "frame": [W, H], "view": g["view"],
            "tiles": tiles, "skippedCells": skipped, "skippedCount": len(skipped)})
        total_tiles += len(tiles)
        total_skipped += len(skipped)
        print(f"{maze}: {len(tiles)} tiles, {len(skipped)} skipped", flush=True)
    png_bytes = sum(os.path.getsize(os.path.join(args.out, f))
                    for f in os.listdir(args.out) if f.endswith(".png"))
    index["totals"] = {"tiles": total_tiles, "skippedCells": total_skipped,
                       "pngBytes": png_bytes}
    if png_bytes > 60 * 1024 * 1024:
        jpg_dir = os.path.join(args.out, "jpg")
        os.makedirs(jpg_dir, exist_ok=True)
        for f in sorted(os.listdir(args.out)):
            if f.endswith(".png"):
                Image.open(os.path.join(args.out, f)).convert("RGB").save(
                    os.path.join(jpg_dir, f[:-4] + ".jpg"), quality=90)
        index["totals"]["jpgBytes"] = sum(
            os.path.getsize(os.path.join(jpg_dir, f)) for f in os.listdir(jpg_dir))
        print(f"png {png_bytes} over 60 MB; jpg written ({index['totals']['jpgBytes']} bytes)")
    with open(os.path.join(args.out, "index.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(index, f, indent=1)
        f.write("\n")
    print(f"tiles {total_tiles} skipped {total_skipped} pngBytes {png_bytes}")


if __name__ == "__main__":
    main()
