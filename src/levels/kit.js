// kit.js — a small level-building DSL so each chapter file stays short and readable.
// Every helper returns the created entity so chapters can wire targets (lever -> gate, etc.).
import { Solid, Box, Spikes, Gate, PressurePlate, Lever, MovingPlatform, Crusher,
         CollapsePlatform, FallingRock, WaterZone, BearTrap, Rope, Boat,
         Checkpoint, Light, StoryProp, Goal }
  from '../entities.js';

export class Level{
  constructor(title, opts={}){
    this.title = title;
    this.theme = opts.theme || 'village';   // controls sky colours + far scenery
    this.G = opts.G ?? 620;                 // ground baseline
    this.statics=[]; this.boxes=[]; this.spikes=[]; this.gates=[]; this.plates=[]; this.levers=[];
    this.mplats=[]; this.crushers=[]; this.collapses=[]; this.rocks=[]; this.waterZones=[];
    this.traps=[]; this.ropes=[]; this.boats=[];
    this.checkpoints=[]; this.lights=[]; this.story=[];
    this.goal=null; this.spawn={ x:60, y:this.G-60 };
    this.minX=-320; this.maxX=1200;
  }
  _ext(x){ if(x+240>this.maxX) this.maxX=x+240; }

  start(x){ this.spawn={ x, y:this.G-60 }; this.minX=x-320; return this; }

  ground(x,w,y=this.G){ this.statics.push(new Solid(x,y,w,1400,'ground')); this._ext(x+w); return this; }
  wall(x,y,w,h){ const s=new Solid(x,y,w,h,'wall'); this.statics.push(s); this._ext(x+w); return s; }
  ledge(x,y,w,h=1400){ const s=new Solid(x,y,w,h,'stone'); this.statics.push(s); this._ext(x+w); return s; }
  pillar(x,y,h,w=46){ const s=new Solid(x,this.G-h,w,h,'stone'); this.statics.push(s); return s; }

  box(x,y=null,s=54){ const b=new Box(x, y==null?this.G-s:y, s); this.boxes.push(b); return b; }
  spike(x,w,y=this.G){ this.spikes.push(new Spikes(x,y-22,w)); return this; }   // sits on a surface
  pit(x,w,y=this.G){ this.spikes.push(new Spikes(x,y,w)); return this; }         // deadly gap floor

  gate(x,h=190,y=null){ const g=new Gate(x,(y==null?this.G-h:y),46,h); this.gates.push(g); return g; }
  plate(x,target=null,w=90,y=this.G){ const p=new PressurePlate(x,y,w,target); this.plates.push(p); return p; }
  lever(x,target=null,y=this.G){ const l=new Lever(x,y-44,target); this.levers.push(l); return l; }
  mplat(x,y,w,h,dx,dy,speed=100){ const m=new MovingPlatform(x,y,w,h,dx,dy,speed); this.mplats.push(m); this._ext(x+dx+w); return m; }
  crusher(x,yUp,w,h,drop,period=3,phase=0){ const c=new Crusher(x,yUp,w,h,drop,period,phase); this.crushers.push(c); return c; }
  collapse(x,w,y,h=18){ const c=new CollapsePlatform(x,y,w,h); this.collapses.push(c); this._ext(x+w); return c; }
  rock(x,startY,triggerX,landY,s=46){ const r=new FallingRock(x,startY,s,s,triggerX,landY); this.rocks.push(r); return r; }
  water(x,y,w,h,swim=true){ const z=new WaterZone(x,y,w,h,swim); this.waterZones.push(z); this._ext(x+w); return z; }
  trap(x,y=this.G){ const t=new BearTrap(x,y); this.traps.push(t); return t; }
  rope(ax,ay,length){ const r=new Rope(ax,ay,length); this.ropes.push(r); this._ext(ax); return r; }
  boat(x,y){ const b=new Boat(x,y); this.boats.push(b); this._ext(x); return b; }

  checkpoint(x,y=this.G){ const c=new Checkpoint(x,y-80); this.checkpoints.push(c);
    this.light(x+20,y-70,150); return c; }
  light(x,y,r=180,color='rgba(201,146,46,',intensity=0.85){ const L=new Light(x,y,r,color,intensity); this.lights.push(L); return L; }
  moon(x,y,r=200){ return this.light(x,y,r,'rgba(120,150,201,',0.5); }
  prop(x,kind,w,h,y=null){ this.story.push(new StoryProp(x,(y==null?this.G-h:y),w,h,kind)); return this; }

  setGoal(x,y=null){ const gy=(y==null?this.G-120:y); this.goal=new Goal(x,gy);
    this.light(x+30,gy+30,340,'rgba(201,146,46,',1.0); this._ext(x+160); return this.goal; }

  build(){
    return { statics:this.statics, boxes:this.boxes, spikes:this.spikes, gates:this.gates,
      plates:this.plates, levers:this.levers, mplats:this.mplats, crushers:this.crushers,
      collapses:this.collapses, rocks:this.rocks, waterZones:this.waterZones,
      traps:this.traps, ropes:this.ropes, boats:this.boats,
      checkpoints:this.checkpoints, lights:this.lights, story:this.story,
      goal:this.goal, spawn:this.spawn, title:this.title, theme:this.theme,
      bounds:{ minX:this.minX, maxX:this.maxX, minY:-600, maxY:1000 } };
  }
}
