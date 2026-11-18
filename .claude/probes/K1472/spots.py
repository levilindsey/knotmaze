import sys
from PIL import Image, ImageDraw, ImageChops
d=sys.argv[1]; out=sys.argv[2]
spots=[("start marker",59,73),("TL dashed strand",158,126),("lone arc / front end",305,168),("TR cluster",735,158),("R edge loop",819,368),("blue loop",294,546),("centre",462,494),("L middle",126,452),("BL",84,746),("bottom orange",378,767),("BR",693,704),("R flare",756,599),("unrevealed top-mid",525,158)]
frames=["f3","f5","f6","rest"]; cols=["today","master","mine"]; S=100; Z=3; T=S*Z
def im(c,f): return Image.open(f"{d}/levi_{c}_{f}.png").convert("RGB")
I={(c,f):im(c,f) for c in cols for f in frames}
rows=[]
counts=[]
for name,x,y in spots:
  box=(x-S//2,y-S//2,x+S//2,y+S//2)
  r=Image.new("RGB",(len(frames)*3*(T+4),T+18),(255,255,255)); dr=ImageDraw.Draw(r)
  line=[name]
  for j,f in enumerate(frames):
    for k,c in enumerate(cols):
      t=I[(c,f)].crop(box).resize((T,T),Image.NEAREST); X=(j*3+k)*(T+4); r.paste(t,(X,18)); dr.text((X+2,2),f"{name} {f} {c}",fill=(0,0,0))
    a,b,m=[I[(c,f)].crop(box) for c in cols]
    n=lambda p,q: sum(1 for v in ImageChops.difference(p,q).convert("L").getdata() if v>24)
    line.append(f"{f}: today~master {n(a,b)} today~mine {n(a,m)} master~mine {n(b,m)}")
  rows.append(r); counts.append(" | ".join(line))
for g in range(0,len(rows),5):
  part=rows[g:g+5]; W=part[0].width; H=sum(p.height+6 for p in part)
  s=Image.new("RGB",(W,H),(255,0,255)); yy=0
  for p in part: s.paste(p,(0,yy)); yy+=p.height+6
  s.save(f"{out}_{g//5}.png")
print("\n".join(counts))
