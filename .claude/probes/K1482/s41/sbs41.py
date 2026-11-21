import sys
from PIL import Image, ImageDraw, ImageOps
cap,pgm,cx,cy,R,S,out=sys.argv[1],sys.argv[2],int(sys.argv[3]),int(sys.argv[4]),int(sys.argv[5]),int(sys.argv[6]),sys.argv[7]
im=Image.open(cap).convert('L')
a=ImageOps.autocontrast(im.crop((cx-R,cy-R,cx+R+1,cy+R+1)),cutoff=1)
b=Image.open(pgm).convert('L')
n=2*R+1
W=Image.new('RGB',(2*n*S+8,n*S),(255,255,255))
for i,img in enumerate([a,b]):
  c=img.convert('RGB').resize((n*S,n*S),Image.NEAREST); d=ImageDraw.Draw(c)
  for k in range(0,n,4):
    col=(255,0,0) if (cx-R+k)%8==0 else (255,190,190)
    d.line([(k*S,0),(k*S,n*S)],fill=col); 
    col=(255,0,0) if (cy-R+k)%8==0 else (255,190,190)
    d.line([(0,k*S),(n*S,k*S)],fill=col)
  for k in range(0,n,8):
    d.text((k*S+2,2),str(cx-R+k),fill=(0,160,0)); d.text((2,k*S+2),str(cy-R+k),fill=(0,160,0))
  W.paste(c,(i*(n*S+8),0))
W.save(out)
