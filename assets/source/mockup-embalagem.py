# Gera embalagens "prontas" a partir do molde: grãos finos na janela, alça vazada, saco cheio com volume e selagem.
from PIL import Image, ImageDraw, ImageFilter
import numpy as np, random
from scipy import ndimage as ndi
S=3
WIN=[(316,865),(380,820),(440,790),(490,772),(495,775),(530,785),(560,790),(590,787),(620,782),(630,770),
     (640,765),(652,770),(660,790),(680,800),(705,802),(730,805),(750,810),(755,815),(790,900),(792,980),
     (775,1002),(680,995),(580,977),(505,960),(400,915),(320,872)]
PAL={ # cores dos grãos (base, variações)
 'milho':[(226,186,112),(214,170,96),(236,200,130)],
 'mista':[(226,186,112),(236,226,200),(214,172,100),(244,236,214)],
 'mandioca':[(238,230,208),(228,218,192),(246,240,224)],
}
def fine_grains(size, cols, seed):
    rnd=random.Random(seed); W,H=size
    base=tuple(int(c*0.62) for c in cols[0])
    img=Image.new('RGB',(W,H),base); d=ImageDraw.Draw(img)
    n=int(W*H/12)
    for _ in range(n):
        x=rnd.uniform(0,W); y=rnd.uniform(0,H); r=rnd.uniform(2.4,3.4)
        c=rnd.choice(cols); k=rnd.uniform(.86,1.04)
        cc=tuple(min(255,int(v*k)) for v in c)
        sh=tuple(int(v*.62) for v in cc)
        d.ellipse([x-r,y-r+.6,x+r,y+r+.6],fill=sh)
        d.ellipse([x-r,y-r,x+r,y+r-.4],fill=cc)
        d.ellipse([x-r*.55,y-r*.6,x-r*.05,y-r*.15],fill=tuple(min(255,int(v*1.12)+8) for v in cc))
    return img.filter(ImageFilter.GaussianBlur(.3))

def make(name, seed):
    src=Image.open(f'assets/source/felux-{name}-4kg.webp').convert('RGB')
    src=src.crop((2,2,src.width-2,src.height-2))       # tira a linha do molde
    im=src.resize((src.width*S,src.height*S),Image.LANCZOS)
    W,H=im.size
    # ---- janela com grãos finos ----
    off=(-6,-6)
    poly=[(x+off[0],y+off[1]) for x,y in WIN]
    m=Image.new('L',(W,H),0); ImageDraw.Draw(m).polygon(poly,fill=255)
    m=m.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(1.0))
    g=fine_grains((W,H),PAL[name],seed)
    # sombra das patas e da borda superior da janela
    top=Image.new('L',(W,H),0); ImageDraw.Draw(top).polygon(poly,fill=255)
    ta=np.asarray(top).astype(float)/255
    edge=ndi.gaussian_filter(1-ta,8)
    ga=np.asarray(g).astype(float)*(1-0.55*np.clip(edge*2.2,0,1))[...,None]
    ma=np.asarray(m).astype(float)[...,None]/255
    a=np.asarray(im).astype(float)*(1-ma)+ga*ma
    # ---- alça vazada (no lugar do pontilhado) ----
    alpha=np.full((H,W),255.0)
    hx0,hy0,hx1,hy1=89*S,18*S,182*S,45*S
    hm=Image.new('L',(W,H),0); ImageDraw.Draw(hm).rounded_rectangle([hx0,hy0,hx1,hy1],radius=13*S,fill=255)
    hm=np.asarray(hm.filter(ImageFilter.GaussianBlur(1))).astype(float)/255
    # apaga o pontilhado vermelho: pinta a área ao redor com a cor de fundo
    bgc=np.median(a[5*S:14*S, 60*S:210*S].reshape(-1,3),axis=0)
    ring=Image.new('L',(W,H),0); ImageDraw.Draw(ring).rounded_rectangle([hx0-6*S,hy0-6*S,hx1+6*S,hy1+6*S],radius=16*S,fill=255)
    ring=np.asarray(ring.filter(ImageFilter.GaussianBlur(2))).astype(float)[...,None]/255
    a=a*(1-ring)+bgc*ring
    # sombra interna da alça
    sh=ndi.gaussian_filter(hm,4*S/3)
    a=a*(1-0.25*np.clip(sh-hm,0,1)[...,None]*2)
    alpha*= (1-hm)
    # ---- volume: saco cheio ----
    Y,X=np.mgrid[0:H,0:W].astype(float)
    seal_t, seal_b = 0, H
    # beliscão perto das selagens: a lateral entra nos cantos e estufa no meio
    t=(Y/H)
    pinch=(np.exp(-t/0.07)+np.exp(-(1-t)/0.05))*0.045*W + 0.012*W*(1-np.sin(np.pi*t))
    half=W/2-pinch
    u=(X-W/2)/half
    inside=np.abs(u)<=1
    # remapeia a arte para a silhueta estufada
    srcX=np.clip(W/2+u*W/2,0,W-1)
    a=np.stack([ndi.map_coordinates(a[...,c],[Y,srcX],order=1) for c in range(3)],-1)
    alpha=ndi.map_coordinates(alpha,[Y,srcX],order=1)
    edge_soft=np.clip((1-np.abs(u))*W*0.5,0,1)
    alpha*=edge_soft*inside
    # luz: cilindro + realce vertical + escurecer nas selagens
    shade=0.80+0.20*np.sqrt(np.clip(1-np.abs(u)**2.4,0,1))
    shade+=0.10*np.exp(-((u+0.42)/0.10)**2)+0.05*np.exp(-((u-0.55)/0.06)**2)
    shade*=1-0.20*np.exp(-t/0.035)-0.22*np.exp(-(1-t)/0.03)
    # rugas leves perto das selagens
    wr=np.sin(X/W*38+Y/H*9)*np.exp(-t/0.05)*0.05+np.sin(X/W*44-Y/H*7)*np.exp(-(1-t)/0.04)*0.05
    shade+=wr
    # selagem serrilhada em cima e embaixo
    sealh=int(5.5*S)
    crimp=0.06*np.sign(np.sin(X/(1.6*S)))
    shade+=np.where((Y<sealh)|(Y>H-sealh),crimp-0.04,0)
    a=np.clip(a*shade[...,None],0,255)
    # cantos arredondados
    cm=Image.new('L',(W,H),0); ImageDraw.Draw(cm).rounded_rectangle([0,0,W-1,H-1],radius=6*S,fill=255)
    alpha*=np.asarray(cm).astype(float)/255
    out=Image.fromarray(np.dstack([a,alpha]).astype(np.uint8),'RGBA')
    out=out.resize((W*2//S,H*2//S),Image.LANCZOS)  # 2x para telas retina
    out.save(f'assets/felux-{name}-4kg-pack.webp',quality=90)
    return out
outs=[make(n,i) for i,n in enumerate(['milho','mista','mandioca'])]
w,h=outs[0].size
sheet=Image.new('RGB',(w*3+80,h+40),(246,243,238))
for i,o in enumerate(outs): sheet.paste(o,(20+i*(w+20),20),o)
sheet.save('sheet.png'); print(w,h)
o=outs[0]; Image.composite(o,Image.new('RGBA',o.size,(246,243,238,255)),o).crop((180,500,540,720)).resize((720,440)).save('zoom.png')
