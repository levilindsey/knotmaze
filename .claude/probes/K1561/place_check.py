# K1561 / K1566: is every place a fill-look fix changed one the nub counter names?
# A changed place (diffcap.py's diffcap.json) with no nub-counter place within <tol> world units is gap the
# fix removed that the K1561 model does not call a nub: the fix is wider than the bug there.
#   python place_check.py <diffcap.json> <nub_count.ts's "before" output> [tol=0.35]
# The last line is the test: "WITHOUT: 0 (0 px)" passes.  Run 27Q's fix (dcd8e81e6) read 89 (6556 px).
import json
import re
import sys

places = json.load(open(sys.argv[1], encoding='utf-8'))['places']
raw = open(sys.argv[2], 'rb').read()
tol = float(sys.argv[3]) if len(sys.argv) > 3 else 0.35
txt = raw.decode('utf-16') if raw[:2] in (b'\xff\xfe', b'\xfe\xff') else raw.decode('utf-8-sig', 'replace')
tool = []
scene = None
for line in txt.splitlines():
    m = re.match(r'scene (\S+):', line)
    if m:
        scene = m.group(1)
        continue
    m = re.search(r'world ([\d.\-]+):([\d.\-]+)', line)
    if m and scene:
        px = re.search(r'(\d+)\s*px', line)
        tool.append((scene, float(m.group(1)), float(m.group(2)), int(px.group(1)) if px else 0))
toolScenes = set(t[0] for t in tool)
print('counter places %d in %d scenes; changed places %d in %d scenes' % (
    len(tool), len(toolScenes), len(places), len(set(p['scene'] for p in places))))


def near(p):
    return any(sc == p['scene'] and abs(x - p['world'][0]) < tol and abs(y - p['world'][1]) < tol for sc, x, y, _ in tool)


inScope = [p for p in places if p['scene'] in toolScenes]
un = [p for p in inScope if not near(p)]
by = {}
for p in un:
    by.setdefault(p['scene'], []).append(p)
for s in sorted(by):
    v = sorted(by[s], key=lambda p: -p['n'])
    print('  %-22s %2d places %5d px: %s' % (s, len(v), sum(p['n'] for p in v),
          ', '.join('%d px at %.3f:%.3f' % (p['n'], p['world'][0], p['world'][1]) for p in v[:6])))
out = [p for p in places if p['scene'] not in toolScenes]
miss = [t for t in tool if not any(p['scene'] == t[0] and abs(p['world'][0] - t[1]) < tol and abs(p['world'][1] - t[2]) < tol
                                    for p in places)]
print('changed places in scenes the counter did not run on: %d %s' % (len(out), sorted(set(p['scene'] for p in out))))
print('counter places with no change nearby: %d' % len(miss))
print('changed places in the counter\'s scenes: %d (%d px); WITH a counter place within %.2f: %d (%d px)' % (
    len(inScope), sum(p['n'] for p in inScope), tol, len(inScope) - len(un),
    sum(p['n'] for p in inScope) - sum(p['n'] for p in un)))
print('WITHOUT: %d (%d px)' % (len(un), sum(p['n'] for p in un)))
