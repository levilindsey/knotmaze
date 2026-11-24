# Review page: one figure per 27Z7 tile (new renderer only), grouped by maze.
#   python review_page.py <27Z7 dir> <out html>
import json
import os
import sys

src, out = sys.argv[1], sys.argv[2]
idx = json.load(open(os.path.join(src, 'index.json'), encoding='utf-8'))
mz = idx['mazes']
h = ['''<title>Renderer Review Tiles</title>
<style>
:root{--bg:#f4f5f8;--fg:#1c2030;--mut:#5b6278;--card:#fff;--line:#d5d8e2;--acc:#2f55c8}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#12141c;--fg:#e6e8f0;--mut:#9aa1b8;--card:#1b1e2a;--line:#2e3344;--acc:#8fa8ff;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#12141c;--fg:#e6e8f0;--mut:#9aa1b8;--card:#1b1e2a;--line:#2e3344;--acc:#8fa8ff;color-scheme:dark}
body{background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,Segoe UI,Roboto,sans-serif;padding-inline:16px;padding-block:20px 60px;max-width:1100px;margin:0 auto}
h1{font-size:1.5rem;margin:0 0 8px;text-wrap:balance}
h2{font-size:1.15rem;margin:36px 0 10px;padding-top:8px;border-top:1px solid var(--line)}
p{margin:8px 0;max-width:68ch}
.mut{color:var(--mut);font-size:.9rem;font-weight:400}
.how{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:12px 16px}
nav{display:flex;flex-wrap:wrap;gap:6px;margin:16px 0}
nav a{padding:4px 10px;border:1px solid var(--line);border-radius:6px;background:var(--card);color:var(--acc);text-decoration:none;font-variant-numeric:tabular-nums}
figure{margin:0 0 18px}
figure img{display:block;width:100%;height:auto;aspect-ratio:4/3;border-radius:4px;background:#8fa3e8}
figcaption{font-weight:600;margin:0 0 4px}
</style>
<h1>New renderer on all 21 test mazes</h1>
<div class="how"><p><b>What I need:</b> name every place that still looks wrong. Reply with the tile's label and where in it, for example <b>"A_8 b2, top right: notch in the hook"</b>. Anything you do not name I treat as fine.</p>
<p class="mut">Each picture is one part of a maze drawn by the new renderer (build 272edd8c7, which holds the ball you landed today), shown at twice its size and brightened so the borders read. The colours are not the real ones. Empty parts of a maze are left out. Pinch to zoom.</p></div>
<nav>''']
for m in mz:
    h.append('<a href="#%s">%s</a>' % (m['maze'], m['maze'].replace('_', ' ')))
h.append('</nav>')
n = 0
for m in mz:
    h.append('<h2 id="%s">%s <span class="mut">%d tiles</span></h2>' % (m['maze'], m['maze'], len(m['tiles'])))
    for t in m['tiles']:
        f = t['file'].replace('.png', '.jpg')
        lab = m['maze'] + ' ' + t['cell']
        h.append('<figure><figcaption>%s</figcaption><img loading="lazy" src="t/%s" alt="%s, new renderer"></figure>'
                 % (lab, f, lab))
        n += 1
open(out, 'w', encoding='utf-8', newline='\n').write('\n'.join(h) + '\n')
print(n, 'figures')
