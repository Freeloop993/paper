"""Record coarse manual locations and provide enlarged originals for refinement.
All observations are unblinded AI readings of 12 predesignated primary renders.
No input guides or target coordinates used to generate the crops.
"""
from pathlib import Path
import json,math,csv
from PIL import Image,ImageDraw,ImageFont
root=Path(__file__).resolve().parent
images_dir=(root/'images/hexa') if (root/'images/hexa').exists() else (root/'primary-images')
(root/'primary-measure').mkdir(exist_ok=True)
# Coarse locations read from the actual contact sheets (pixels at 260-square
# display scale). Index: LF, RF, RM, RB, LB, LM; y increases down.
coarse={
'0.70-r01':[(93,42),(165,43),(220,129),(165,215),(93,215),(39,128)],
'0.70-r02':[(102,51),(158,51),(190,128),(158,204),(101,203),(70,129)],
'0.70-r03':[(90,45),(168,45),(203,128),(169,207),(93,208),(58,129)],
'0.70-r04':[(92,50),(167,49),(226,128),(165,208),(93,208),(33,129)],
'1.00-r01':[(87,46),(173,47),(217,128),(175,209),(86,209),(42,128)],
'1.00-r02':[(87,58),(171,59),(214,130),(172,199),(87,198),(47,130)],
'1.00-r03':[(88,56),(173,54),(211,130),(174,201),(86,201),(51,131)],
'1.00-r04':[(90,51),(171,52),(224,129),(180,212),(81,212),(36,129)],
'1.30-r01':[(80,60),(178,60),(220,130),(181,196),(80,196),(40,129)],
'1.30-r02':[(83,63),(176,63),(217,132),(177,193),(81,193),(43,133)],
'1.30-r03':[(77,64),(183,64),(215,130),(185,197),(77,197),(44,130)],
'1.30-r04':[(70,49),(187,49),(227,129),(188,213),(70,213),(34,130)]}
ids=list(coarse); font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',16)
for off in range(0,len(ids),4):
    sheet=Image.new('RGB',(7*126,4*145),'#eeefed');d=ImageDraw.Draw(sheet)
    for j,key in enumerate(ids[off:off+4]):
        im=Image.open(images_dir/('HEXA3-wl'+key+'.png')).convert('RGB')
        y=j*145;d.text((2,y+45),key,font=font,fill='black')
        for k,(xx,yy) in enumerate(coarse[key]):
            cx,cy=round(xx*1024/260),round(yy*1024/260)
            crop=im.crop((cx-31,cy-31,cx+32,cy+32)).resize((126,126),Image.Resampling.NEAREST)
            x=(k+1)*126;sheet.paste(crop,(x,y))
            # Short margin ticks point to centre. Image itself is unobscured.
            for delta in (-20,0,20):
                u=62+delta*2
                d.line((x+u,y,x+u,y+6),fill='#c81359',width=2)
                d.line((x,y+u,x+6,y+u),fill='#c81359',width=2)
            d.text((x+8,y+127),f'{cx},{cy}',fill='black',font=font)
    sheet.save(root/'primary-measure'/f'hubs-{off//4+1}.jpg',quality=96,subsampling=0)
