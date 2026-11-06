# K1198 Run G (Muse batch 22, 22G) task 3, census runner: J3i's word list on the
# rebuild, twice. Words come from the bench census itself (work33/census_v68x.json,
# bench word order, duplicates kept as the bench ran them), so the rebuild runs
# the bench's list exactly. Each run is the kit's census (work27/dbg/census_k1027.py,
# in place) on v6.8 (v68_22g/base = work33/base bodies, byte-identical to
# work28/base; work28/ports_k990e.json variant M) with the ligature-emptied font
# (v68_22g/font_nolig.ttf). K926_FINAL_E=shear, K1009_PINS unset. Hashes of both
# runs go to census_hash_22g.txt; the runs must hash the same.
# Run: <trace>\venv\Scripts\python.exe -I -B .claude\probes\K1198\run_census_22g.py
import hashlib
import json
import os
import re
import subprocess
import sys

T = r"C:\Users\lsl\Repositories\knotmaze\.claude\probes\K863\trace"
KDIR = os.path.dirname(os.path.abspath(__file__))
PY = os.path.join(T, "venv", "Scripts", "python.exe")
BENCH = os.path.join(T, "work33", "census_v68x.json")
BASE = os.path.join(KDIR, "v68_22g", "base")
FONT = os.path.join(KDIR, "v68_22g", "font_nolig.ttf")
PORTS = os.path.join(T, "work28", "ports_k990e.json")
CENSUS = os.path.join(T, "work27", "dbg", "census_k1027.py")
OUTDIR = os.path.join(KDIR, "v68_22g")


def bench_words():
    rows = json.load(open(BENCH, encoding="utf-8"))["rows"]
    by_w = {}
    for r in rows:
        m = re.match(r"w(\d+):", r["id"])
        if m:
            by_w.setdefault(int(m.group(1)), r["word"])
    return [by_w[k] for k in sorted(by_w)]


def sha(p):
    return hashlib.sha256(open(p, "rb").read()).hexdigest()


def main():
    words = bench_words()
    env = dict(os.environ, K926_FINAL_E="shear")
    env.pop("K1009_PINS", None)
    hashes = {}
    for tag in ("census_22g", "census_22g_run2"):
        txt = os.path.join(OUTDIR, tag + ".txt")
        js = os.path.join(OUTDIR, tag + ".json")
        cmd = [PY, "-I", CENSUS, "run", FONT, os.path.join(BASE, "bodies.json"),
               os.path.join(BASE, "join_params.json"), txt, js,
               "--ports", PORTS, "--variant", "M",
               "--label", "v6.8 (M) ligatures emptied (22G), J3i's words",
               "--words", ",".join(words)]
        print(f"run {tag}: {len(words)} words", flush=True)
        r = subprocess.run(cmd, cwd=T, env=env, capture_output=True, text=True)
        print("\n".join((r.stdout or "").splitlines()[:6]), flush=True)
        if r.returncode != 0:
            print(r.stderr[-3000:], flush=True)
            sys.exit(f"census {tag} failed with {r.returncode}")
        hashes[tag] = (sha(txt), sha(js))
        print(f"{tag}: txt {hashes[tag][0][:16]} json {hashes[tag][1][:16]}", flush=True)
    same = hashes["census_22g"] == hashes["census_22g_run2"]
    lines = [f"K1198 22G census determinism: run1 txt {hashes['census_22g'][0]} json {hashes['census_22g'][1]}",
             f"run2 txt {hashes['census_22g_run2'][0]} json {hashes['census_22g_run2'][1]}",
             f"two runs hash the same: {same}"]
    with open(os.path.join(KDIR, "census_hash_22g.txt"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(lines) + "\n")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
