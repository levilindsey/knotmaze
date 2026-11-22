# K1582 (27Z5): the bisect step table from the captured border frames.
#   python table.py
# Per captured commit, in chain order: px over 2 levels in each spot's red
# box against the Nov 18 frame (cumulative) and against the previous
# captured commit (the step). Frames: out/27Z5/bisect_<short>/<scene>/.
import subprocess, sys
K = r"C:\Users\lsl\Repositories\knotmaze"
N18 = {
 "muse_hash": K + r"\.claude\worktrees\agent-a5dca968eeb3d79f3\.claude\probes\K1436\out\bar\k1482s5\base-9f2c226f\cap\muse_hash\border.png",
 "g41_user_tw64": K + r"\.claude\worktrees\agent-a5dca968eeb3d79f3\.claude\probes\K1436\out\bar\k1482s5\base-9f2c226f\cap\g41_user_tw64\border.png",
}
C = {"muse_hash": ("1087.393295744791", "746.8591231377336"), "g41_user_tw64": ("2432.202822309035", "1081.1512845061616")}
ORDER = ["9f2c226f2","3c6a52ca1","3d7acffe4","5c058f5cd","9ae14f277","41c13cf6f","53833035e","363b69487","970b6ece0","b0f4f9a7d","3971ec643","b8e2027d6","0cee0dc16","dfcbd69e0","e6eab6bbf","cf38cf6bb","a682b3a15","af7b6ae0a","1c763ce39","6e0a51c2f","650aac4fa","c40417678","87727fafd","c651efe12","d136ec526","f9d12313a","386744b36"]
def px2(a, b, scene):
    out = subprocess.run([sys.executable, K + r"\.claude\probes\K1582\boxdiff.py", a, b, *C[scene]], capture_output=True, text=True).stdout
    return out.split("px>2 ")[1].split(" ")[0] if "px>2" in out else "?"
prev = dict(N18)
for s in ORDER:
    row = [s]
    for scene in ("muse_hash", "g41_user_tw64"):
        p = f"{K}\\.claude\\probes\\K1582\\out\\27Z5\\bisect_{s}\\{scene}\\border.png"
        try: open(p, "rb").close()
        except OSError: row.append("  -  "); continue
        row.append(f"cum {px2(N18[scene], p, scene)} step {px2(prev[scene], p, scene)}")
        prev[scene] = p
    print(" | ".join(row))
for scene in ("muse_hash", "g41_user_tw64"):
    t = f"{K}\\.claude\\probes\\K1582\\out\\27Z5\\today2\\{scene}\\border.png"
    print(f"today2 {scene}: cum {px2(N18[scene], t, scene)} step-from-last {px2(prev[scene], t, scene)}")
