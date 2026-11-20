# K1494 (27C): the five worst former dot sides (old run) read what in the fixed run?
#   python .claude/probes/K1494/former5.py <oldFadeJson> <newFadeJson>
import json, sys
old = json.load(open(sys.argv[1])); new = json.load(open(sys.argv[2]))
top = sorted([s for s in old["sides"] if s["dots"]["gf"] > 2], key=lambda s: -s["dots"]["gf"])[:5]
idx = {(s["ci"], s["side"]): s["dots"]["gf"] for s in new["sides"]}
for s in top:
    sg = "+" if s["side"] > 0 else "-"
    print(f"x{s['ci']}{sg} oldDots={s['dots']['gf']} newDots={idx[(s['ci'], s['side'])]}")
print("new sides>2:", sum(1 for s in new["sides"] if s["dots"]["gf"] > 2),
      "total dots:", sum(s["dots"]["gf"] for s in new["sides"]))
