import sys
from PIL import Image
for p in sys.argv[2:]:
    im = Image.open(p); z = int(sys.argv[1]); im.resize((im.width*z, im.height*z), Image.NEAREST).save(p[:-4] + '.png')
