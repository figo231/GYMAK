#!/usr/bin/env python3
"""Original, hand-defined cartoon exercise frames for GYMAK, no external artwork.
Run with Python and Pillow. Points are authored in a 400x260 composition.
These are simplified start/end illustrations, not motion capture.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import json, math
ROOT=Path(__file__).resolve().parents[1]
S=3
# pose: head, left/right shoulder, hip, elbow, wrist, knee, ankle.
def pose(head=(195,55),sh=((183,84),(207,84)),hip=((185,137),(205,137)),el=((174,116),(216,116)),wr=((173,143),(227,143)),kn=((182,174),(213,174)),an=((180,219),(220,219))):
 return dict(head=head,sh=sh,hip=hip,el=el,wr=wr,kn=kn,an=an)
stand=pose()
squat=pose(head=(185,78),sh=((174,106),(195,106)),hip=((159,151),(179,151)),el=((192,125),(216,125)),wr=((203,143),(218,143)),kn=((199,177),(231,177)),an=((173,220),(243,220)))
quad=pose(head=(116,115),sh=((145,131),(153,132)),hip=((235,137),(243,137)),el=((142,177),(164,176)),wr=((140,218),(170,218)),kn=((235,197),(253,197)),an=((282,220),(301,220)))
quadkick=pose(head=(116,115),sh=quad['sh'],hip=quad['hip'],el=quad['el'],wr=quad['wr'],kn=((235,197),(292,132)),an=((282,220),(293,83)))
bridge=pose(head=(88,203),sh=((117,211),(123,208)),hip=((200,202),(205,202)),el=((148,219),(147,223)),wr=((179,223),(176,228)),kn=((260,156),(267,161)),an=((295,219),(305,222)))
bridgeup=pose(head=bridge['head'],sh=bridge['sh'],hip=((198,165),(204,169)),el=bridge['el'],wr=bridge['wr'],kn=bridge['kn'],an=bridge['an'])
plank=pose(head=(99,114),sh=((130,133),(136,136)),hip=((220,164),(224,167)),el=((135,173),(151,170)),wr=((140,215),(171,216)),kn=((268,197),(277,204)),an=((304,221),(319,222)))
lunge=pose(head=(190,52),sh=((179,82),(201,82)),hip=((182,139),(203,139)),el=((166,116),(215,116)),wr=((164,151),(220,150)),kn=((155,171),(243,184)),an=((132,221),(295,220)))
lungedown=pose(head=(187,80),sh=((176,110),(198,110)),hip=((177,165),(198,165)),el=((164,145),(215,144)),wr=((161,180),(219,179)),kn=((131,165),(237,215)),an=((130,221),(290,220)))
# Equipment is drawn independently, under the model.
frames={}
frames['donkey-kicks']=([quad,quadkick],'mat')
frames['fire-hydrant']=([quad,pose(head=quad['head'],sh=quad['sh'],hip=quad['hip'],el=quad['el'],wr=quad['wr'],kn=((235,197),(285,160)),an=((282,220),(319,183)))],'mat')
side=pose(head=(88,188),sh=((117,199),(125,196)),hip=((203,204),(208,200)),el=((135,219),(126,170)),wr=((157,222),(98,179)),kn=((258,211),(263,205)),an=((317,220),(321,213)))
frames['side-lying-leg-raise']=([side,pose(head=side['head'],sh=side['sh'],hip=side['hip'],el=side['el'],wr=side['wr'],kn=((258,211),(255,158)),an=((317,220),(299,112)))],'mat')
inner=pose(head=side['head'],sh=side['sh'],hip=side['hip'],el=side['el'],wr=side['wr'],kn=((261,211),(220,160)),an=((320,220),(247,221)))
frames['inner-thigh-lift']=([inner,pose(head=inner['head'],sh=inner['sh'],hip=inner['hip'],el=inner['el'],wr=inner['wr'],kn=((260,181),(220,160)),an=((317,162),(247,221)))],'mat')
wide=pose(kn=((161,176),(238,176)),an=((139,219),(260,219)),el=((182,116),(208,116)),wr=((191,149),(204,149)))
widedown=pose(head=(195,91),sh=((183,119),(207,119)),hip=((185,169),(205,169)),el=((180,153),(210,153)),wr=((191,178),(204,178)),kn=((148,175),(251,175)),an=wide['an'])
frames['sumo-squat-db']=([wide,widedown],'dumbbell')
frames['curtsy-lunge']=([stand,pose(head=(195,80),sh=((183,110),(207,110)),hip=((185,164),(205,164)),kn=((170,184),(221,204)),an=((162,222),(150,220)))],'floor')
b1=pose(**{**bridge,'kn':((260,156),(249,158)),'an':((295,219),(300,124))})
b2=pose(**{**bridgeup,'kn':((260,156),(238,122)),'an':((295,219),(279,72))})
frames['single-leg-glute-bridge']=([b1,b2],'mat')
frames['frog-pump']=([pose(**{**bridge,'kn':((245,181),(248,228)),'an':((282,215),(282,215))}),pose(**{**bridgeup,'kn':((245,181),(248,228)),'an':((282,215),(282,215))})],'mat')
step0=pose(head=(175,65),sh=((163,95),(185,95)),hip=((165,148),(185,148)),kn=((169,182),(225,149)),an=((170,221),(245,174)))
step1=pose(head=(222,20),sh=((210,47),(232,47)),hip=((212,99),(232,99)),el=((197,82),(247,82)),wr=((194,114),(251,114)),kn=((219,138),(254,146)),an=((225,174),(275,190)))
frames['step-up-db']=([step0,step1],'step')
wallpose=pose(head=(159,82),sh=((155,109),(169,109)),hip=((155,165),(170,165)),kn=((217,167),(228,168)),an=((216,220),(236,220)),el=((182,142),(192,141)),wr=((214,154),(227,155)))
frames['wall-sit']=([pose(head=(157,55),sh=((151,84),(169,84)),hip=((152,140),(170,140))),wallpose],'wall')
knee=pose(head=(117,117),sh=((145,135),(153,137)),hip=((222,170),(229,172)),el=((143,175),(166,177)),wr=((142,220),(174,220)),kn=((277,218),(287,220)),an=((307,182),(318,187)))
kneedown=pose(head=(115,167),sh=((141,177),(153,176)),hip=((220,195),(225,195)),el=((166,202),(178,201)),wr=knee['wr'],kn=knee['kn'],an=knee['an'])
frames['knee-pushup']=([knee,kneedown],'mat')
frames['bird-dog']=([quad,pose(head=quad['head'],sh=quad['sh'],hip=quad['hip'],el=((142,177),(114,125)),wr=((140,218),(69,122)),kn=((235,197),(289,134)),an=((282,220),(337,134)))],'mat')
crunch=pose(head=(196,73),sh=((185,101),(207,101)),hip=((185,150),(205,150)),el=((158,108),(231,105)),wr=((182,70),(216,69)),kn=((180,186),(241,141)),an=((177,223),(250,183)))
handup=pose(el=((154,76),(237,76)),wr=((177,45),(218,45)))
frames['standing-oblique-crunch']=([handup,crunch],'floor')
thrust0=pose(head=(120,114),sh=((137,142),(146,145)),hip=((210,202),(219,201)),el=((165,168),(176,170)),wr=((207,194),(226,194)),kn=((267,172),(279,174)),an=((286,220),(302,220)))
thrust1=pose(head=(112,118),sh=((139,143),(148,144)),hip=((212,151),(221,153)),el=((168,146),(179,150)),wr=((207,148),(226,150)),kn=((267,159),(279,161)),an=thrust0['an'])
frames['w-hip-thrust']=([thrust0,thrust1],'benchbar')
cable0=pose(head=(135,59),sh=((149,86),(161,86)),hip=((175,140),(185,140)),el=((113,102),(118,107)),wr=((83,100),(85,110)),kn=((181,178),(199,178)),an=((180,220),(212,220)))
cable1=pose(**{**cable0,'kn':((181,178),(230,160)),'an':((180,220),(266,180))})
frames['w-cable-kickback']=([cable0,cable1],'cable')
frames['w-bulgarian-split-squat']=([pose(**{**lunge,'kn':((155,171),(247,174)),'an':((132,221),(286,157))}),pose(**{**lungedown,'kn':((131,165),(237,204)),'an':((130,221),(286,157))})],'rearbench')
press0=pose(head=(91,142),sh=((111,162),(120,163)),hip=((170,211),(181,210)),el=((125,200),(134,200)),wr=((151,219),(160,220)),kn=((210,150),(222,152)),an=((250,157),(261,158)))
press1=pose(**{**press0,'kn':((227,161),(237,164)),'an':((277,103),(287,107))})
frames['w-glute-leg-press']=([press0,press1],'legpress')
ab0=pose(head=(195,45),sh=((182,74),(208,74)),hip=((185,130),(207,130)),el=((166,112),(225,112)),wr=((160,149),(231,149)),kn=((184,174),(208,174)),an=((183,220),(210,220)))
ab1=pose(**{**ab0,'kn':((144,170),(247,170)),'an':((135,217),(258,217))})
frames['w-hip-abductor']=([ab0,ab1],'abductor')

def draw(id,pt,equip,frame):
 im=Image.new('RGB',(400*S,260*S),'#fff8f4');d=ImageDraw.Draw(im)
 def line(points,color,width): d.line([(int(x*S),int(y*S)) for x,y in points],fill=color,width=int(width*S),joint='curve')
 def ellipse(box,c):d.ellipse(tuple(int(v*S) for v in box),fill=c)
 def rect(box,c):d.rounded_rectangle(tuple(int(v*S) for v in box),radius=4*S,fill=c)
 def poly(points,c):d.polygon([(int(x*S),int(y*S)) for x,y in points],fill=c)
 line([(30,230),(370,230)],'#e4d8d1',2)
 if equip=='mat':rect((62,226,342,234),'#e2d5ed')
 if equip=='step':rect((228,177,285,226),'#687886');rect((223,170,290,180),'#445260')
 if equip=='wall':rect((129,38,137,230),'#d7d9de')
 if equip in ['benchbar','rearbench']:
  x,y,w=(74,151,90) if equip=='benchbar' else (269,157,70)
  rect((x,y,x+w,y+13),'#465463');line([(x+12,y+13),(x+10,228)],'#9ba6b0',8);line([(x+w-12,y+13),(x+w-10,228)],'#9ba6b0',8)
 if equip=='cable':
  rect((49,30,64,229),'#657885');rect((40,218,96,230),'#657885');line([(64,47),(88,47),(88,217),pt['an'][1]],'#99a5ac',2);ellipse((79,207,97,225),'#44515c')
 if equip=='legpress':
  line([(60,178),(154,231),(210,231)],'#5e6e7b',12);line([(199,228),(311,58)],'#a3aeb7',7)
  a=pt['an'][1];line([(a[0]-15,a[1]-18),(a[0]+20,a[1]+13)],'#495967',13)
 if equip=='abductor':
  rect((168,78,224,147),'#596d7c');rect((164,148,230,161),'#596d7c');line([(175,157),(165,228)],'#8798a6',7);line([(221,157),(235,228)],'#8798a6',7)
 skin='#d89b78'; hair='#3d2a31';shirt='#e86650';pants='#554f85'
 # rear limbs first, curved joins are softened with joint disks
 for j in [0,1]:
  h,k,a=pt['hip'][j],pt['kn'][j],pt['an'][j]
  line([h,k,a],pants,13 if j==0 else 12)
  for x,y in [h,k]:ellipse((x-6,y-6,x+6,y+6),pants)
  line([a,(a[0]+12,a[1]+1)],'#f7f6fb',9);line([(a[0]-3,a[1]+6),(a[0]+16,a[1]+6)],'#4b4a5c',3)
 sh0,sh1=pt['sh'];h0,h1=pt['hip']
 # Torso center stroke stays visible in side-on poses too.
 line([((sh0[0]+sh1[0])/2,(sh0[1]+sh1[1])/2),((h0[0]+h1[0])/2,(h0[1]+h1[1])/2)],shirt,22)
 # torso has a fitted athletic top with a waist taper
 poly([sh0,sh1,(h1[0]-2,h1[1]-3),(h0[0]+2,h0[1]-3)],shirt)
 line([h0,h1],pants,10)
 head=pt['head']; neck=((sh0[0]+sh1[0])/2,(sh0[1]+sh1[1])/2)
 line([head,neck],skin,11)
 for j in [0,1]:
  sh,el,wr=pt['sh'][j],pt['el'][j],pt['wr'][j]
  line([sh,el,wr],skin,8)
  for x,y in [el,wr]:ellipse((x-4,y-4,x+4,y+4),skin)
 hx,hy=head
 ellipse((hx-15,hy-18,hx+15,hy+15),hair);ellipse((hx-10,hy-12,hx+12,hy+13),skin)
 ellipse((hx-17,hy-16,hx+7,hy-5),hair)
 # original ponytail silhouette
 poly([(hx-13,hy-10),(hx-24,hy-7),(hx-28,hy+22),(hx-14,hy+10)],hair)
 ellipse((hx+6,hy-2,hx+8,hy+1),'#4b3131')
 if equip in ['dumbbell','step','rearbench']:
  wx,wy=pt['wr'][0];line([(wx-8,wy+5),(wx+16,wy+5)],'#62727f',5);rect((wx-12,wy-2,wx-5,wy+13),'#354957');rect((wx+13,wy-2,wx+20,wy+13),'#354957')
 if equip=='benchbar':
  x,y=pt['hip'][0];line([(x-49,y),(x+55,y)],'#94a1aa',5);ellipse((x-48,y-19,x-12,y+19),'#394b5a');ellipse((x+19,y-19,x+55,y+19),'#394b5a');ellipse((x+31,y-5,x+41,y+5),'#c5ccd1')
 if equip=='abductor':
  for x,y in pt['kn']:rect((x-13,y-10,x+13,y+10),'#7d919b')
 # two small phase dots, no text baked into the image
 for i in [0,1]:ellipse((181+i*18,245,188+i*18,252),'#ed7658' if frame==i else '#dfd8d4')
 im=im.resize((600,390),Image.Resampling.LANCZOS)
 out=ROOT/'public'/'women-exercises'/id;out.mkdir(parents=True,exist_ok=True)
 im.save(out/f'{frame}.webp','WEBP',quality=88)
 return im
if __name__=='__main__':
 preview=Image.new('RGB',(1200,9*290),'white');dr=ImageDraw.Draw(preview)
 for n,(id,(poses,equip)) in enumerate(frames.items()):
  for f,pt in enumerate(poses):
   im=draw(id,pt,equip,f);im.thumbnail((280,182));preview.paste(im,((n%2)*600+f*290,(n//2)*290+32))
  dr.text(((n%2)*600+12,(n//2)*290+10),id,fill='#342c37')
 preview.save('/downloads/women-original-contact-sheet.jpg')
 print(f'Created {len(frames)*2} original frames.')
