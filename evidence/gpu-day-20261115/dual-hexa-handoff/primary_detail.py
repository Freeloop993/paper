from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,hashlib
root=Path(__file__).resolve().parent
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',19)
def whole_pair():
    ids=['HEXA3-wl0.70-r02','HEXA3-wl1.30-r03']
    sheet=Image.new('RGB',(1100,710),'#f3f4f1');d=ImageDraw.Draw(sheet)
    for i,name in enumerate(ids):
        images=(root/'images/hexa') if (root/'images/hexa').exists() else (root/'primary-images')
        with Image.open(images/(name+'.png')) as src:
            im=src.convert('RGB')
        off=10+i*550;d.text((off,5),name,fill='black',font=font)
        sheet.paste(im.resize((430,430),Image.Resampling.LANCZOS),(off,42))
        # Insets use native pixels without rotation or modifying any blade.
        crop=((135,388,370,623),(20,388,255,623))[i]
        sheet.paste(im.crop(crop),(off,467))
        mini=tuple(int(n*430/1024) for n in crop)
        d.rectangle((off+mini[0],42+mini[1],off+mini[2],42+mini[3]),outline='#bd2451',width=2)
        d.text((off+245,520),'左侧中间旋翼 · 等倍',font=font,fill='black')
    sheet.save(root/'hexa-blade-exceptions.jpg',quality=94)
if __name__=='__main__':whole_pair()
