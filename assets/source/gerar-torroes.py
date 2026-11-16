# Torrão FELUX: bola irregular com textura do grão real de milho, luz de estúdio e fundo claro.
from PIL import Image, ImageFilter, ImageEnhance
import numpy as np
from scipy import ndimage as ndi
TEX=Image.open('/home/user/felux-site/assets/source/grao-mistos-milho.jpg').convert('RGB')
def make(name, seed, scale, rough, out):
    rs=np.random.RandomState(seed)
    W,H=1200,675; S=2; w,h=W*S,H*S
    cx,cy,R=w*0.5,h*0.50,h*0.30
    Y,X=np.mgrid[0:h,0:w].astype(float)
    dx,dy=(X-cx)/R,(Y-cy)/R
    ang=np.arctan2(dy,dx); r=np.hypot(dx,dy)
    # contorno irregular (grumos)
    edge=np.ones_like(ang)
    for k,a in [(3,.035),(5,.03),(9,.022),(17,.016),(31,.012)]:
        edge+=a*rough*np.sin(k*ang+rs.uniform(0,6.3))
    nz=ndi.gaussian_filter(rs.rand(h//6,w//6),1.2); nz=(np.asarray(Image.fromarray((nz*255).astype(np.uint8)).resize((w,h),Image.BICUBIC))/255.-.5)
    edge+=nz*.06*rough
    inside=r<edge
    # esfera: normal e profundidade
    rr=np.clip(r/edge,0,1); z=np.sqrt(np.clip(1-rr**2,0,1))
    # textura do grão mapeada na esfera (distorção esférica)
    t=TEX.resize((int(TEX.width*scale),int(TEX.height*scale)),Image.LANCZOS)
    t=ImageEnhance.Color(t).enhance(1.25)
    ta=np.asarray(t).astype(float)
    k=1/(0.75+0.25*z)
    u=(dx*k*0.40+0.5)*(ta.shape[1]-1); v=(dy*k*0.40+0.5)*(ta.shape[0]-1)
    col=np.stack([ndi.map_coordinates(ta[...,c],[v,u],order=1,mode='mirror') for c in range(3)],-1)
    # cor mais amarela (milho)
    lumc=col.mean(2,keepdims=True); col=0.45*col+0.55*lumc  # menos saturado
    cream=np.array([246,218,148.]); col=cream*(0.92+(lumc-lumc.mean())/255*1.1)
    col=np.clip(col,0,255)
    # iluminação de cima à esquerda + oclusão nas bordas
    L=np.array([-.45,-.62,.64]); L/=np.linalg.norm(L)
    nxn=dx/np.maximum(edge,1e-6); nyn=dy/np.maximum(edge,1e-6)
    lam=np.clip(nxn*L[0]+nyn*L[1]+z*L[2],0,1)
    shade=0.74+0.36*lam
    shade*=0.82+0.18*z**0.5
    # detalhe de grumos (altura da textura vira relevo)
    lum=col.mean(2); rel=lum-ndi.gaussian_filter(lum,6)
    shade=shade*(1+rel/255*1.0)
    col=np.clip(col*shade[...,None],0,255)
    # fundo: cinza claro com leve gradiente
    bg=np.stack([np.full((h,w),float(v)) for v in (226,226,222)],-1)
    bg*= (1.04-0.10*(Y/h))[...,None]
    # sombra de contato
    sh=np.exp(-(((X-cx-R*0.08)/(R*1.05))**2+((Y-(cy+R*0.95))/(R*0.16))**2)*1.6)
    bg*=(1-0.45*sh)[...,None]
    m=ndi.gaussian_filter(inside.astype(float),1.2)[...,None]
    img=bg*(1-m)+col*m
    out_img=Image.fromarray(img.clip(0,255).astype(np.uint8)).resize((W,H),Image.LANCZOS).filter(ImageFilter.UnsharpMask(1.5,60,2))
    out_img.save(out,quality=88)
    return out_img
O='/home/user/felux-site/assets/scenes/'
ims=[make('finos',3,0.55,0.35,O+'torrao-finos.webp'),make('medios',7,0.9,0.6,O+'torrao-medios.webp'),make('mistos',11,0.75,1.0,O+'torrao-mistos.webp')]
s=Image.new('RGB',(1200*3,675)); [s.paste(im,(1200*i,0)) for i,im in enumerate(ims)]; s.resize((1200,225)).save('clumps3.png')
