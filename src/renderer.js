// renderer.js — atmosphere first: silhouettes, fog, moonlight, ash, parallax.
import { Character } from './character.js';

const SIL = '#080a10';        // near-black silhouette
const SIL2 = '#0d1018';
const RIM = 'rgba(150,170,210,0.10)';

// per-chapter mood: sky colours, moon tint, ridge tints, fog haze, far scenery kind
const THEMES = {
  village:  { sky:['#0b0f1a','#0b0e17','#05060a'], moon:'#dee0e8', ridge:['#0c1220','#0a0f1a','#070b12'], haze:'rgba(28,36,56,0.5)',  scenery:'roofs'   },
  forest:   { sky:['#08130d','#0a1410','#04080a'], moon:'#cfe0d0', ridge:['#0a1712','#081210','#050b0a'], haze:'rgba(20,45,35,0.5)',  scenery:'pines'   },
  temple:   { sky:['#08121c','#0a1420','#04080e'], moon:'#cfe0f0', ridge:['#0a1622','#08121c','#050b14'], haze:'rgba(26,56,86,0.55)', scenery:'pagodas' },
  siege:    { sky:['#180f0a','#120c0a','#070405'], moon:'#e8c9a0', ridge:['#160e0a','#120a08','#0a0605'], haze:'rgba(80,38,20,0.5)',  scenery:'ruins', fire:true },
  castle:   { sky:['#0c0e1a','#0b0c16','#05060a'], moon:'#d8dae6', ridge:['#0e1020','#0b0d1a','#070812'], haze:'rgba(40,40,70,0.5)',  scenery:'walls'   },
  mountain: { sky:['#0a0c14','#0b0d16','#050609'], moon:'#e0e2ea', ridge:['#0d1018','#0a0d15','#06080e'], haze:'rgba(50,55,72,0.5)',  scenery:'peaks', heavyAsh:true },
  shadow:   { sky:['#070509','#0a0610','#020103'], moon:'#7a4a6a', ridge:['#0a0710','#07050c','#030206'], haze:'rgba(40,10,30,0.5)',  scenery:'void', dark:true },
};

export class Renderer{
  constructor(canvas){
    this.canvas=canvas; this.ctx=canvas.getContext('2d');
    this.vw=0; this.vh=0; this.dpr=Math.min(window.devicePixelRatio||1, 2);
    this.character = new Character();
    this._blood = []; this._bt = 0;
    this._stars = []; for(let i=0;i<70;i++) this._stars.push(
      { x:Math.random(), y:Math.random()*0.45, s:Math.random()*1.4+0.4, p:Math.random()*6.28 });
    this._mtns = this._genMountains();
    this._ash = []; this._initAsh(90);
    this.resize();
    window.addEventListener('resize', ()=>this.resize());
  }
  resize(){
    this.vw = window.innerWidth; this.vh = window.innerHeight;
    this.canvas.width = this.vw*this.dpr; this.canvas.height = this.vh*this.dpr;
    this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
  }
  _genMountains(){
    const layer=(n,amp,base,seed)=>{ let pts=[],r=seed;
      const rnd=()=>{ r=(r*9301+49297)%233280; return r/233280; };
      for(let i=0;i<=n;i++) pts.push({x:i/n, y:base - rnd()*amp});
      return pts; };
    return [ layer(7,160,0.30,11), layer(10,120,0.46,29), layer(14,90,0.60,53) ];
  }
  _initAsh(n){ this._ash=[]; for(let i=0;i<n;i++) this._ash.push({
    x:Math.random(), y:Math.random(), s:Math.random()*1.8+0.5,
    vy:Math.random()*10+6, vx:-(Math.random()*8+3), a:Math.random()*0.4+0.15 }); }

  bloodBurst(x,y,kind='spike'){
    const n = kind==='crush' ? 30 : 20;
    const cols = ['#6e1f16','#4a1410','#8a2a1e','#37100c'];
    for(let i=0;i<n;i++){
      const a = kind==='crush' ? Math.random()*Math.PI*2 : (-Math.PI/2 + (Math.random()-0.5)*2.2);
      const sp = 120 + Math.random()*320;
      this._blood.push({ x, y:y-14, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp - 120,
        life:0, max:0.7+Math.random()*0.7, size:2+Math.random()*3.5,
        col:cols[(Math.random()*cols.length)|0] });
    }
  }

  render(world, player, cam, time){
    const c=this.ctx, vw=this.vw, vh=this.vh;
    let dtB = time - this._bt; this._bt = time; if(!(dtB>0)||dtB>0.1) dtB=0.016;
    c.clearRect(0,0,vw,vh);

    const th = THEMES[world.theme] || THEMES.village;
    this._sky(c,vw,vh,time,th);
    this._farScenery(c,vw,vh,cam,th,time);
    this._parallax(c,vw,vh,cam,th,time);
    this._fogBand(c,vw,vh,0.42,th.haze);

    // ---- world space ----
    c.save(); cam.apply(c);

    this._story(c, world.story, true);        // distant story (behind)
    this._solids(c, world.statics);
    this._mplats(c, world.mplats);
    this._collapses(c, world.collapses);
    this._gates(c, world.gates);
    this._levers(c, world.levers);
    this._plates(c, world.plates);
    this._spikes(c, world.spikes);
    this._traps(c, world.traps);
    this._crushers(c, world.crushers);
    this._rocks(c, world.rocks);
    this._boxes(c, world.boxes);
    this._ropes(c, world.ropes);
    this._water(c, world.waterZones, time);   // translucent, over the submerged floor
    this._boats(c, world.boats);
    this._checkpoints(c, world.checkpoints, time);
    this._story(c, world.story, false);       // near story props
    this._goal(c, world.goal, time);
    if(!player.dead) this.character.draw(c, player, time);
    else this._deadBody(c, player);
    this._bloodDraw(c, dtB);

    c.restore();

    // ---- lights (additive, screen space via camera offset) ----
    this._lights(c, world, cam, time, player);

    // ---- foreground atmosphere ----
    this._fogBand(c,vw,vh,0.72,'rgba(8,10,16,0.55)');
    this._ashParticles(c,vw,vh,time, th);
    this._vignette(c,vw,vh);
  }

  _sky(c,vw,vh,t,th){
    const g=c.createLinearGradient(0,0,0,vh);
    g.addColorStop(0,th.sky[0]); g.addColorStop(0.45,th.sky[1]); g.addColorStop(1,th.sky[2]);
    c.fillStyle=g; c.fillRect(0,0,vw,vh);
    // a far horizon glow (fire for the siege, cold elsewhere, red for the shadow)
    if(th.fire || th.dark){
      const hg=c.createLinearGradient(0,vh*0.72,0,vh*0.45);
      const col = th.fire ? 'rgba(201,90,40,' : 'rgba(150,30,50,';
      hg.addColorStop(0, col+'0.28)'); hg.addColorStop(1, col+'0)');
      c.fillStyle=hg; c.fillRect(0,vh*0.45,vw,vh*0.3);
    }
    // moon
    const mx=vw*0.76, my=vh*0.22, r=th.dark?30:46;
    const mg=c.createRadialGradient(mx,my,0,mx,my,r*7);
    mg.addColorStop(0, this._rgba(th.moon,0.45)); mg.addColorStop(0.12, this._rgba(th.moon,0.15));
    mg.addColorStop(1, this._rgba(th.moon,0));
    c.fillStyle=mg; c.fillRect(0,0,vw,vh);
    // stars (skip the very bright fire sky)
    if(!th.fire){ for(const st of this._stars){
      const tw=0.4+0.6*Math.abs(Math.sin(t*1.5+st.p));
      c.fillStyle=this._rgba(th.moon, (th.dark?0.25:0.5)*tw);
      c.fillRect(st.x*vw, st.y*vh, st.s, st.s);
    }}
    c.fillStyle=this._rgba(th.moon,0.92); c.beginPath(); c.arc(mx,my,r,0,7); c.fill();
    c.fillStyle=th.sky[1]; c.beginPath(); c.arc(mx+16,my-8,r*0.92,0,7); c.fill(); // crescent
  }
  _rgba(hex,a){ const n=parseInt(hex.slice(1),16); const r=(n>>16)&255,g=(n>>8)&255,b=n&255;
    return `rgba(${r},${g},${b},${a})`; }
  _hash(n){ const s=Math.sin(n*127.1+43.7)*43758.5453; return s-Math.floor(s); }

  _parallax(c,vw,vh,cam,th,t){
    // rolling ridge layers with vertical gradient shading + a lit misty rim = real depth
    const layers=[ {depth:0.06, base:0.50, amp:92, col:th.ridge[0]},
                   {depth:0.13, base:0.60, amp:66, col:th.ridge[1]},
                   {depth:0.24, base:0.70, amp:44, col:th.ridge[2]},
                   {depth:0.40, base:0.80, amp:28, col:th.ridge[2]} ];
    layers.forEach((L,i)=>{
      const off=-cam.x*L.depth;
      const top=[];
      for(let sx=-60; sx<=vw+60; sx+=18){
        const u=(sx-off)*0.0016;
        const n=Math.sin(u+i*2)*0.55 + Math.sin(u*2.7+i)*0.28 + Math.sin(u*5.3+i*3)*0.12;
        top.push([sx, vh*L.base - n*L.amp]);
      }
      // filled body with a gradient (hazier toward the top so it melts into the fog)
      const y0=vh*L.base - L.amp - 10;
      const g=c.createLinearGradient(0,y0,0,vh);
      g.addColorStop(0, this._mix(L.col, th.sky[1], 0.55));
      g.addColorStop(0.5, L.col);
      g.addColorStop(1, this._mix(L.col, '#000000', 0.35));
      c.fillStyle=g; c.beginPath(); c.moveTo(-60,vh);
      for(const p of top) c.lineTo(p[0],p[1]);
      c.lineTo(vw+60,vh); c.closePath(); c.fill();
      // faint moonlit rim along the crest
      c.strokeStyle=this._rgba(th.moon, 0.06+0.05*(3-i)/3); c.lineWidth=1.4;
      c.beginPath(); top.forEach((p,k)=> k?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1])); c.stroke();
    });
  }
  _mix(a,b,t){ const pa=parseInt(a.slice(1),16), pb=parseInt(b.slice(1),16);
    const ar=(pa>>16)&255,ag=(pa>>8)&255,ab=pa&255, br=(pb>>16)&255,bg=(pb>>8)&255,bb=pb&255;
    const r=Math.round(ar+(br-ar)*t),g=Math.round(ag+(bg-ag)*t),b2=Math.round(ab+(bb-ab)*t);
    return `rgb(${r},${g},${b2})`; }

  // distinctive distant silhouettes per chapter, deterministically varied so it never looks flat
  _farScenery(c,vw,vh,cam,th,t){
    const depth=0.22, off=cam.x*depth, horizon=vh*0.66;
    const step=150, col=th.ridge[1];
    c.save();
    for(let k=-1; k*step < vw+off+step; k++){
      const wx=k*step;                      // world-ish x of this item
      const sx=wx-off;
      if(sx<-180||sx>vw+180) continue;
      const r=this._hash(k), r2=this._hash(k*3.3);
      const h=60+r*120;
      c.fillStyle=col;
      switch(th.scenery){
        case 'pines':
          this._pine(c,sx, horizon, 40+r*30, h); break;
        case 'pagodas':
          if(r>0.55) this._pagodaFar(c,sx,horizon, 46+r2*26, h*0.9); else this._pine(c,sx,horizon,20+r*12,h*0.5); break;
        case 'ruins':
          this._ruin(c,sx,horizon, 60+r*70, h*0.8, th); break;
        case 'walls':
          this._wallFar(c,sx,horizon, 80+r*60, 50+r2*60); break;
        case 'peaks':
          this._peak(c,sx,horizon, 120+r*120, 120+r*160); break;
        case 'void':
          if(r>0.7){ c.fillStyle=this._rgba(th.moon,0.15); this._pine(c,sx,horizon,30,h*1.4); } break;
        default: // roofs (village)
          this._roof(c,sx,horizon, 70+r*50, 30+r2*30); break;
      }
    }
    c.restore();
  }
  _pine(c,x,y,w,h){ c.beginPath(); c.moveTo(x,y);
    c.lineTo(x-w/2,y); for(let s=0;s<3;s++){ const yy=y-h*(s+1)/3, ww=w*(1-s*0.28)/2;
      c.lineTo(x-ww,yy); c.lineTo(x,yy-h*0.12); c.lineTo(x+ww,yy); }
    c.lineTo(x+w/2,y); c.closePath(); c.fill();
    c.fillRect(x-2,y,4,10); }
  _pagodaFar(c,x,y,w,h){ for(let i=0;i<3;i++){ const ty=y-h+ i*h*0.32, tw=w*(1-i*0.22);
    c.fillRect(x-tw/2, ty+h*0.1, tw, h*0.14);
    c.beginPath(); c.moveTo(x-tw/2-6,ty+h*0.1); c.lineTo(x,ty); c.lineTo(x+tw/2+6,ty+h*0.1); c.closePath(); c.fill(); }
    c.fillRect(x-w*0.06,y-h*0.1,w*0.12,h*0.1); }
  _ruin(c,x,y,w,h,th){ c.fillRect(x-w/2,y-h,w*0.4,h);
    c.fillRect(x+w*0.06,y-h*0.7,w*0.3,h*0.7);
    if(th.fire && this._hash(x)>0.6){ const g=c.createRadialGradient(x,y-h*0.5,0,x,y-h*0.5,40);
      g.addColorStop(0,'rgba(201,90,40,0.4)'); g.addColorStop(1,'rgba(201,90,40,0)');
      c.save(); c.globalCompositeOperation='lighter'; c.fillStyle=g;
      c.beginPath(); c.arc(x,y-h*0.5,40,0,7); c.fill(); c.restore(); } }
  _wallFar(c,x,y,w,h){ c.fillRect(x-w/2,y-h,w,h);
    for(let bx=x-w/2; bx<x+w/2; bx+=16){ c.fillRect(bx,y-h-8,8,8); } }  // battlements
  _peak(c,x,y,w,h){ c.beginPath(); c.moveTo(x-w/2,y); c.lineTo(x,y-h); c.lineTo(x+w/2,y); c.closePath(); c.fill();
    c.fillStyle='rgba(180,190,210,0.10)'; c.beginPath(); c.moveTo(x,y-h);
    c.lineTo(x-w*0.12,y-h*0.7); c.lineTo(x+w*0.12,y-h*0.7); c.closePath(); c.fill(); }
  _roof(c,x,y,w,h){ c.beginPath(); c.moveTo(x-w/2,y); c.lineTo(x-w*0.4,y-h);
    c.lineTo(x+w*0.4,y-h); c.lineTo(x+w/2,y); c.closePath(); c.fill();
    c.fillRect(x-w*0.4,y-h-4,w*0.8,5); }
  _fogBand(c,vw,vh,yFrac,color){
    const y=vh*yFrac;
    const g=c.createLinearGradient(0,y-vh*0.25,0,vh);
    g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,color);
    c.fillStyle=g; c.fillRect(0,y-vh*0.25,vw,vh-y+vh*0.25);
  }

  _sh(c){ c.fillStyle=SIL; }
  _solids(c,arr){ c.fillStyle=SIL; for(const s of arr){ c.fillRect(s.x,s.y,s.w,Math.min(s.h,900));
    c.fillStyle=RIM; c.fillRect(s.x,s.y,s.w,2); c.fillStyle=SIL; } }
  _mplats(c,arr){ for(const s of arr){ c.fillStyle=SIL2; c.fillRect(s.x,s.y,s.w,s.h);
    c.fillStyle=RIM; c.fillRect(s.x,s.y,s.w,2); } }
  _gates(c,arr){ for(const g of arr){ c.fillStyle='#0a0c14'; c.fillRect(g.x,g.y,g.w,g.h);
    c.fillStyle='rgba(0,0,0,0.5)'; for(let i=0;i<g.h;i+=14) c.fillRect(g.x,g.y+i,g.w,2);
    c.fillStyle=RIM; c.fillRect(g.x,g.y,g.w,2); } }
  _plates(c,arr){ for(const p of arr){ const d=p.pressed?4:0;
    c.fillStyle=p.pressed?'#141824':SIL2; c.fillRect(p.x,p.y+d,p.w,p.h-d);
    c.fillStyle=p.pressed?'rgba(201,146,46,0.5)':'rgba(150,170,210,0.12)';
    c.fillRect(p.x,p.y+d,p.w,2); } }
  _spikes(c,arr){ c.fillStyle='#0b0d14'; for(const s of arr){ const step=16;
    for(let x=s.x; x<s.x+s.w; x+=step){ c.beginPath(); c.moveTo(x,s.y+s.h);
      c.lineTo(x+step/2,s.y); c.lineTo(x+step,s.y+s.h); c.closePath(); c.fill(); }
    c.strokeStyle='rgba(122,36,25,0.35)'; c.lineWidth=1; c.stroke(); } }
  _boxes(c,arr){ for(const b of arr){ c.fillStyle=b.grabbed?'#12151f':SIL2;
    c.fillRect(b.x,b.y,b.w,b.h);
    c.strokeStyle='rgba(0,0,0,0.6)'; c.lineWidth=3; c.strokeRect(b.x+2,b.y+2,b.w-4,b.h-4);
    c.fillStyle=RIM; c.fillRect(b.x,b.y,b.w,2);
    c.strokeStyle='rgba(90,105,140,0.15)'; c.lineWidth=1;
    c.beginPath(); c.moveTo(b.x+4,b.y+4); c.lineTo(b.x+b.w-4,b.y+b.h-4); c.stroke(); } }
  _traps(c,arr){ if(!arr) return; for(const tr of arr){
    const cx=tr.x+tr.w/2, base=tr.y;
    c.fillStyle='#0a0c12'; c.fillRect(tr.x+4, base-6, tr.w-8, 8);       // base plate
    // two jaws: t=0 open (upright), t=1 closed (meeting in the middle)
    const open = 1-tr.t;
    const jawH = 26;
    const drawJaw=(sign)=>{
      const bx = cx + sign*(tr.w/2-6);
      const tipX = cx + sign*(6 + open*(tr.w/2-10));
      const tipY = base-6 - (open*jawH);
      c.fillStyle='#14171f';
      c.beginPath(); c.moveTo(bx, base-6); c.lineTo(tipX, tipY);
      c.lineTo(tipX - sign*6, tipY+4); c.lineTo(bx - sign*6, base-6); c.closePath(); c.fill();
      // teeth
      c.strokeStyle='rgba(150,170,210,0.4)'; c.lineWidth=2;
      for(let k=0.15;k<0.9;k+=0.22){ const px=bx+(tipX-bx)*k, py=(base-6)+(tipY-(base-6))*k;
        c.beginPath(); c.moveTo(px,py); c.lineTo(px+sign*3, py+6); c.stroke(); }
    };
    drawJaw(-1); drawJaw(1);
    if(tr.state!=='open'){ c.fillStyle='rgba(150,40,30,0.5)'; c.fillRect(cx-8, base-10, 16, 5); }
  } }
  _boats(c,arr){ if(!arr) return; for(const b of arr){
    const {x,y,w,h}=b;
    c.fillStyle='#120d08';                       // hull
    c.beginPath(); c.moveTo(x-6,y); c.lineTo(x+w+6,y);
    c.lineTo(x+w-14,y+h+8); c.lineTo(x+14,y+h+8); c.closePath(); c.fill();
    c.fillStyle=RIM; c.fillRect(x-6,y,w+12,2);   // deck rim
    c.fillStyle='#1a130b';                        // little bow/stern posts
    c.fillRect(x-6,y-10,6,12); c.fillRect(x+w,y-10,6,12);
    c.strokeStyle='rgba(0,0,0,0.5)'; c.lineWidth=1;
    for(let px=x+10; px<x+w-10; px+=16){ c.beginPath(); c.moveTo(px,y+2); c.lineTo(px,y+h+6); c.stroke(); }
  } }
  _ropes(c,arr){ if(!arr) return; for(const r of arr){
    const bx=r.bobX, by=r.bobY;
    c.strokeStyle='rgba(120,100,70,0.6)'; c.lineWidth=3; c.lineCap='round';
    c.beginPath(); c.moveTo(r.ax,r.ay); c.lineTo(bx,by); c.stroke();
    c.fillStyle='#1c150a'; c.beginPath(); c.arc(bx,by,5,0,7); c.fill();   // knot
    c.fillStyle=RIM; c.fillRect(r.ax-3,r.ay-3,6,6);                        // anchor
  } }
  _deadBody(c,p){
    const x=p.deathX, y=p.deathY, t=Math.min(1,p.deathT*3);
    c.save(); c.translate(x,y);
    if(p.deadKind==='crush'){
      c.fillStyle='#0d1018'; c.beginPath();
      c.ellipse(0,-4,16+t*8,6-t*2,0,0,7); c.fill();               // flattened
    } else {
      c.fillStyle='#0d1018'; c.beginPath();
      c.ellipse(-4,-8+ (1-t)*20, 16, 9, 0.3, 0, 7); c.fill();     // crumpled heap
      c.beginPath(); c.arc(8,-8,6,0,7); c.fill();                 // head
    }
    c.restore();
  }
  _bloodDraw(c, dt){
    for(let i=this._blood.length-1;i>=0;i--){ const b=this._blood[i];
      b.life+=dt; if(b.life>=b.max){ this._blood.splice(i,1); continue; }
      b.vy += 900*dt; b.x += b.vx*dt; b.y += b.vy*dt;
      const a = 1 - b.life/b.max;
      c.fillStyle = b.col; c.globalAlpha = a;
      c.fillRect(b.x, b.y, b.size, b.size);
    }
    c.globalAlpha = 1;
  }

  _levers(c,arr){ if(!arr) return; for(const lv of arr){
    c.fillStyle=SIL; c.fillRect(lv.x+lv.w/2-3, lv.y+lv.h-4, 6, 20);   // base post
    c.strokeStyle=lv.on?'rgba(201,146,46,0.8)':RIM; c.lineWidth=4; c.lineCap='round';
    const ang = lv.on? 0.7 : -0.7;
    c.beginPath(); c.moveTo(lv.x+lv.w/2, lv.y+lv.h);
    c.lineTo(lv.x+lv.w/2+Math.sin(ang)*22, lv.y+lv.h-Math.cos(ang)*22); c.stroke();
  } }
  _crushers(c,arr){ if(!arr) return; for(const k of arr){
    // guide track up from the block
    c.fillStyle='rgba(20,22,30,0.5)'; c.fillRect(k.x+k.w/2-3, k.yUp-260, 6, k.drop+260);
    c.fillStyle='#0b0d15'; c.fillRect(k.x,k.y,k.w,k.h);
    c.strokeStyle='rgba(0,0,0,0.6)'; c.lineWidth=3; c.strokeRect(k.x+2,k.y+2,k.w-4,k.h-4);
    // dangerous underside
    c.fillStyle= k.slam?'rgba(201,60,40,0.7)':'rgba(122,36,25,0.45)';
    c.fillRect(k.x,k.y+k.h-4,k.w,4);
    c.fillStyle=RIM; c.fillRect(k.x,k.y,k.w,2);
  } }
  _collapses(c,arr){ if(!arr) return; for(const p of arr){
    if(p.state==='gone') continue;
    const sx=(p.state==='shake')?(Math.random()*2-1)*p.shake:0;
    c.fillStyle=SIL2; c.fillRect(p.x+sx,p.y,p.w,p.h);
    c.fillStyle=RIM; c.fillRect(p.x+sx,p.y,p.w,2);
    c.strokeStyle='rgba(0,0,0,0.5)'; c.lineWidth=2;
    c.beginPath(); c.moveTo(p.x+p.w*0.5+sx,p.y+2); c.lineTo(p.x+p.w*0.42+sx,p.y+p.h); c.stroke();
  } }
  _rocks(c,arr){ if(!arr) return; for(const r of arr){
    const {x,y,w,h}=r; c.fillStyle='#0c0e16';
    c.beginPath();
    c.moveTo(x+w*0.1,y+h*0.3); c.lineTo(x+w*0.5,y); c.lineTo(x+w*0.95,y+h*0.35);
    c.lineTo(x+w*0.8,y+h); c.lineTo(x+w*0.2,y+h*0.95); c.closePath(); c.fill();
    c.fillStyle=RIM; c.beginPath(); c.moveTo(x+w*0.5,y); c.lineTo(x+w*0.95,y+h*0.35); c.stroke();
  } }
  _water(c,arr,t){ if(!arr) return; for(const z of arr){
    c.save();
    const g=c.createLinearGradient(0,z.y,0,z.y+z.h);
    g.addColorStop(0,'rgba(40,70,110,0.30)'); g.addColorStop(1,'rgba(15,30,55,0.42)');
    c.fillStyle=g; c.fillRect(z.x,z.y,z.w,z.h);
    // animated surface line
    c.strokeStyle='rgba(150,190,230,0.28)'; c.lineWidth=2; c.beginPath();
    for(let x=z.x; x<=z.x+z.w; x+=18){ const yy=z.y+Math.sin(x*0.03+t*1.6)*3; x===z.x?c.moveTo(x,yy):c.lineTo(x,yy); }
    c.stroke();
    c.restore();
  } }

  _checkpoints(c,arr,t){ for(const cp of arr){
    c.fillStyle=SIL; c.fillRect(cp.x+cp.w/2-4, cp.y, 8, cp.h);            // post
    const lx=cp.x+cp.w/2, ly=cp.y+8; const lit=cp.active;
    c.fillStyle=lit?'#1a140a':'#0a0c12'; c.fillRect(lx-12,ly-4,24,20);   // lantern box
    if(lit){ const fl=0.7+Math.sin(t*6+cp.x)*0.15;
      c.fillStyle=`rgba(201,146,46,${0.5*fl})`; c.beginPath(); c.arc(lx,ly+6,7,0,7); c.fill(); }
  } }
  _goal(c,g,t){ if(!g) return;
    // a lit shrine doorway
    c.fillStyle=SIL; c.fillRect(g.x,g.y,g.w,g.h);
    c.fillStyle='#0e0a06'; c.fillRect(g.x+10,g.y+14,g.w-20,g.h-14);
    const fl=0.75+Math.sin(t*3)*0.15;
    const gg=c.createLinearGradient(0,g.y,0,g.y+g.h);
    gg.addColorStop(0,`rgba(201,146,46,${0.28*fl})`); gg.addColorStop(1,'rgba(201,146,46,0)');
    c.fillStyle=gg; c.fillRect(g.x+10,g.y+14,g.w-20,g.h-14);
  }
  _story(c, arr, distant){ if(!arr) return;
    for(const s of arr){
      const far = ['house_dist','torii_broken','burned_house','shrine'].includes(s.kind);
      if(distant !== (s.kind==='house_dist')) continue;
      c.save();
      if(s.kind==='house_dist'){ c.globalAlpha=0.5; }
      c.fillStyle = s.kind==='house_dist' ? '#0a0d15' : SIL;
      this._drawStory(c,s);
      c.restore();
    }
  }
  _drawStory(c,s){
    const {x,y,w,h,kind}=s;
    if(kind==='torii_broken'){
      c.fillRect(x,y,10,h); c.fillRect(x+w-10,y+30,10,h-30);       // two legs (one fallen)
      c.fillRect(x-8,y,w+16,12); c.fillRect(x-4,y+22,w+8,8);
    } else if(kind==='fallen_body'){
      c.beginPath(); c.ellipse(x+w/2,y+h,w/2,h/1.2,0,Math.PI,0); c.fill();
      c.beginPath(); c.arc(x+w-8,y+h-4,7,0,7); c.fill();
    } else if(kind==='burned_house' || kind==='house_dist'){
      c.beginPath(); c.moveTo(x,y+h); c.lineTo(x,y+h*0.4);
      c.lineTo(x+w*0.5,y); c.lineTo(x+w,y+h*0.35); c.lineTo(x+w,y+h);
      c.closePath(); c.fill();
      c.fillStyle='#05060a'; c.fillRect(x+w*0.35,y+h*0.55,w*0.3,h*0.45); // broken doorway
    } else if(kind==='shrine'){
      c.fillRect(x,y+h*0.2,14,h*0.8); c.fillRect(x+w-14,y+h*0.2,14,h*0.8);
      c.beginPath(); c.moveTo(x-16,y+h*0.2); c.lineTo(x+w/2,y);
      c.lineTo(x+w+16,y+h*0.2); c.closePath(); c.fill();
      c.fillRect(x+16,y+h*0.5,w-32,10);
    } else if(kind==='tree'){
      c.fillRect(x+w*0.42,y+h*0.4,w*0.16,h*0.6);            // trunk
      c.beginPath(); c.ellipse(x+w*0.5,y+h*0.3,w*0.55,h*0.35,0,0,7); c.fill();  // canopy
      c.beginPath(); c.ellipse(x+w*0.25,y+h*0.45,w*0.3,h*0.2,0,0,7); c.fill();
      c.beginPath(); c.ellipse(x+w*0.78,y+h*0.42,w*0.3,h*0.22,0,0,7); c.fill();
    } else if(kind==='dead_tree'){
      c.strokeStyle=c.fillStyle; c.lineWidth=w*0.14; c.lineCap='round';
      c.beginPath(); c.moveTo(x+w/2,y+h); c.lineTo(x+w/2,y+h*0.3);
      c.moveTo(x+w/2,y+h*0.5); c.lineTo(x+w*0.15,y+h*0.2);
      c.moveTo(x+w/2,y+h*0.55); c.lineTo(x+w*0.85,y+h*0.25);
      c.moveTo(x+w/2,y+h*0.4); c.lineTo(x+w*0.3,y+h*0.05); c.stroke();
    } else if(kind==='bamboo'){
      c.strokeStyle=c.fillStyle; c.lineWidth=w*0.5; c.lineCap='round';
      for(let i=0;i<3;i++){ const bx=x+i*w*0.5; c.beginPath();
        c.moveTo(bx,y+h); c.lineTo(bx+Math.sin(i)*6,y); c.stroke(); }
    } else if(kind==='pagoda'){
      for(let i=0;i<3;i++){ const ty=y+i*h*0.3, tw=w*(1-i*0.22);
        c.fillRect(x+(w-tw)/2, ty+h*0.12, tw, h*0.18);
        c.beginPath(); c.moveTo(x+(w-tw)/2-8, ty+h*0.12);
        c.lineTo(x+w/2, ty); c.lineTo(x+(w+tw)/2+8, ty+h*0.12); c.closePath(); c.fill(); }
      c.fillRect(x+w*0.44,y+h*0.9,w*0.12,h*0.1);
    } else if(kind==='statue'){
      c.fillRect(x,y+h*0.85,w,h*0.15);                       // plinth
      c.beginPath(); c.arc(x+w/2,y+h*0.2,w*0.3,0,7); c.fill();// head
      c.fillRect(x+w*0.2,y+h*0.35,w*0.6,h*0.5);              // body
    } else if(kind==='banner'){
      c.fillStyle=c.fillStyle; c.fillRect(x,y,3,h);           // pole
      c.fillStyle='rgba(122,36,25,0.5)';
      c.beginPath(); c.moveTo(x+3,y+6); c.lineTo(x+w,y+10);
      c.lineTo(x+w,y+h*0.7); c.lineTo(x+3,y+h*0.62); c.closePath(); c.fill();
    } else if(kind==='shadow'){
      const g=c.createLinearGradient(0,y,0,y+h);
      g.addColorStop(0,'rgba(0,0,0,0.0)'); g.addColorStop(0.4,'#05060a'); g.addColorStop(1,'#000');
      c.fillStyle=g;
      c.beginPath(); c.moveTo(x+w*0.5,y);
      c.quadraticCurveTo(x+w, y+h*0.4, x+w*0.72, y+h);
      c.lineTo(x+w*0.28,y+h);
      c.quadraticCurveTo(x, y+h*0.4, x+w*0.5, y); c.closePath(); c.fill();
      c.fillStyle='rgba(150,40,30,0.5)';                      // two dim eyes
      c.beginPath(); c.arc(x+w*0.42,y+h*0.28,3,0,7); c.arc(x+w*0.58,y+h*0.28,3,0,7); c.fill();
    }
  }

  _lights(c, world, cam, t, player){
    c.save(); c.globalCompositeOperation='lighter';
    for(const L of world.lights){
      const sx=L.x-cam.x, sy=L.y-cam.y;
      const fl=0.82+Math.sin(t*5+L.flicker)*0.12;
      const r=L.radius*fl;
      const g=c.createRadialGradient(sx,sy,0,sx,sy,r);
      g.addColorStop(0, L.color+(0.55*L.intensity*fl)+')');
      g.addColorStop(0.5, L.color+(0.14*L.intensity)+')');
      g.addColorStop(1, L.color+'0)');
      c.fillStyle=g; c.beginPath(); c.arc(sx,sy,r,0,7); c.fill();
    }
    // the wanderer's own carried lantern — a small pool of light near his feet,
    // biased slightly downward so it lights the ground, not the camera/face.
    if(player && player._lantern && !player.dead){
      const sx=player._lantern.x-cam.x, sy=player._lantern.y-cam.y+16;
      const fl=0.82+Math.sin(t*11)*0.08+Math.sin(t*3.3)*0.05;
      const r=108*fl;
      const g=c.createRadialGradient(sx,sy,0,sx,sy,r);
      g.addColorStop(0,`rgba(255,180,95,${0.22*fl})`);
      g.addColorStop(0.5,`rgba(230,150,70,${0.06})`);
      g.addColorStop(1,'rgba(255,185,100,0)');
      c.fillStyle=g; c.beginPath(); c.arc(sx,sy,r,0,7); c.fill();
    }
    c.restore();
  }

  _ashParticles(c,vw,vh,t,th){
    const col = (th&&th.fire) ? '255,150,70' : (th&&th.dark) ? '180,90,110' : '190,185,175';
    const heavy = th&&th.heavyAsh;
    c.save();
    for(const p of this._ash){
      const sp = heavy?1.5:1;
      p.y += p.vy/vh*0.016*sp; p.x += p.vx/vw*0.016;
      if(p.y>1){ p.y=0; p.x=Math.random(); } if(p.x<0) p.x=1;
      c.fillStyle=`rgba(${col},${p.a})`;
      c.fillRect(p.x*vw, p.y*vh, p.s, p.s);
    }
    c.restore();
  }
  _vignette(c,vw,vh){
    const g=c.createRadialGradient(vw/2,vh/2, vh*0.35, vw/2,vh/2, vh*0.85);
    g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,0.72)');
    c.fillStyle=g; c.fillRect(0,0,vw,vh);
  }
}
