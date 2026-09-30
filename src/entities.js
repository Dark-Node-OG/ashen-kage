// entities.js — all interactive world objects. Kept modular per system.
import { aabb, GRAVITY, lerp, clamp } from './physics.js';

// ---- Static solid platform / wall / ground ----
export class Solid{
  constructor(x,y,w,h,tag='ground'){ Object.assign(this,{x,y,w,h,tag}); this.solid=true; this.type='solid'; }
}

// ---- Pushable / climbable crate ----
export class Box{
  constructor(x,y,s=54){ Object.assign(this,{x,y,w:s,h:s}); this.vx=0; this.vy=0; this.solid=true; this.type='box'; this.grabbed=false; }
  update(dt, statics, boxes){
    // gravity (unless being carried horizontally this frame; still fall)
    this.vy += GRAVITY*dt;
    // X handled by player when grabbed; here resolve vertical + settle
    const others = [...statics, ...boxes.filter(b=>b!==this)];
    // Y
    this.y += this.vy*dt;
    for(const s of others){ if(s.solid && aabb(this,s)){
      if(this.vy>0){ this.y = s.y - this.h; } else if(this.vy<0){ this.y = s.y + s.h; }
      this.vy = 0;
    }}
    // friction on vx (only used for tiny nudges)
    this.vx *= Math.pow(0.0001, dt);
  }
  // attempt horizontal move by dx, blocked by statics/other boxes. returns actual dx moved.
  tryMoveX(dx, statics, boxes){
    const others = [...statics, ...boxes.filter(b=>b!==this)];
    this.x += dx;
    for(const s of others){ if(s.solid && aabb(this,s)){
      if(dx>0) this.x = s.x - this.w; else if(dx<0) this.x = s.x + s.w;
      return this.x; // blocked
    }}
    return this.x;
  }
}

// ---- Spikes / instant-death hazard ----
export class Spikes{
  constructor(x,y,w,h=22){ Object.assign(this,{x,y,w,h}); this.type='spikes'; this.solid=false; this.deadly=true; }
}

// ---- Vertical sliding gate (solid when closed) ----
export class Gate{
  constructor(x,y,w,h){ Object.assign(this,{x,y,w,h}); this.type='gate'; this.solid=true;
    this.closedY=y; this.openY=y-h-6; this.open=false; this.t=0; this.baseY=y; }
  update(dt){
    const target = this.open ? 1 : 0;
    this.t = lerp(this.t, target, 1 - Math.pow(0.002, dt));
    this.y = lerp(this.closedY, this.openY, this.t);
    this.solid = this.t < 0.85; // passable once mostly open
  }
}

// ---- Pressure plate: opens a target while weighted ----
export class PressurePlate{
  constructor(x,y,w=70,target=null){ Object.assign(this,{x,y,w,h:14,target}); this.type='plate'; this.solid=false; this.pressed=false; }
  update(bodies){
    const zone = { x:this.x, y:this.y-30, w:this.w, h:44 };
    this.pressed = bodies.some(b => aabb(zone,b));
    if(this.target) this.target.open = this.pressed;
  }
}

// ---- Lever: player toggles it; latches its target open ----
export class Lever{
  constructor(x,y,target=null){ Object.assign(this,{x,y,w:26,h:44,target}); this.type='lever'; this.solid=false; this.on=false; this.cooldown=0; }
  interact(){ this.on = !this.on; if(this.target) this.target.open = this.on; }
}

// ---- Moving platform (solid, carries rider) ----
export class MovingPlatform{
  constructor(x,y,w,h,dx,dy,speed=90){ Object.assign(this,{x,y,w,h}); this.solid=true; this.type='mplat';
    this.ax=x; this.ay=y; this.bx=x+dx; this.by=y+dy; this.speed=speed; this.tt=0; this.dir=1; this.pdx=0; this.pdy=0; }
  update(dt){
    const px=this.x, py=this.y;
    this.tt += this.dir * this.speed * dt / Math.hypot(this.bx-this.ax, this.by-this.ay || 1);
    if(this.tt>=1){ this.tt=1; this.dir=-1; } if(this.tt<=0){ this.tt=0; this.dir=1; }
    const t = this.tt<0.5 ? 2*this.tt*this.tt : 1-Math.pow(-2*this.tt+2,2)/2; // easeInOut
    this.x = lerp(this.ax,this.bx,t); this.y = lerp(this.ay,this.by,t);
    this.pdx = this.x-px; this.pdy = this.y-py;
  }
}

// ---- Checkpoint shrine ----
export class Checkpoint{
  constructor(x,y){ Object.assign(this,{x,y,w:40,h:80}); this.type='checkpoint'; this.solid=false; this.active=false; }
}

// ---- Warm light source (lantern / moon shaft) ----
export class Light{
  constructor(x,y,radius=220,color='rgba(201,146,46,',intensity=0.9){ Object.assign(this,{x,y,radius,color,intensity}); this.flicker=Math.random()*10; }
}

// ---- Environmental-storytelling silhouette prop ----
export class StoryProp{
  constructor(x,y,w,h,kind){ Object.assign(this,{x,y,w,h,kind}); this.type='story'; this.solid=false; }
}

// ---- Crusher: a heavy block that slams down and retracts. Deadly on contact. ----
export class Crusher{
  constructor(x,yUp,w,h,drop,period=3.0,phase=0){
    Object.assign(this,{x,yUp,w,h,drop,period,phase}); this.type='crusher';
    this.solid=false; this.deadly=true; this.y=yUp; }
  update(t){
    const p = (((t+this.phase) % this.period) + this.period) % this.period;
    const f = p/this.period;
    let k;                                   // 0 = up, 1 = down
    if(f<0.12)      k = f/0.12;              // slam down (fast)
    else if(f<0.45) k = 1;                   // hold down
    else if(f<0.68) k = 1-(f-0.45)/0.23;     // retract (slow)
    else            k = 0;                    // hold up
    this.y = this.yUp + this.drop*k;
    this.slam = f<0.12;
  }
}

// ---- Collapsing platform: crumbles shortly after the player stands on it. ----
export class CollapsePlatform{
  constructor(x,y,w,h=20){ Object.assign(this,{x,y,w,h}); this.type='collapse'; this.solid=true;
    this.origY=y; this.state='idle'; this.fuse=0.55; this.vy=0; this.respawn=0; this.shake=0; }
  update(dt, player){
    if(this.state==='idle'){
      const on = player.onGround && Math.abs((player.y+player.h)-this.y)<4 &&
                 player.x+player.w>this.x && player.x<this.x+this.w;
      if(on){ this.state='shake'; this.timer=this.fuse; }
    } else if(this.state==='shake'){
      this.timer-=dt; this.shake=Math.min(6,(this.fuse-this.timer)*14);
      if(this.timer<=0){ this.state='fall'; this.vy=0; this.solid=false; this.shake=0; }
    } else if(this.state==='fall'){
      this.vy+=GRAVITY*dt; this.y+=this.vy*dt;
      if(this.y>this.origY+520){ this.state='gone'; this.respawn=2.2; }
    } else if(this.state==='gone'){
      this.respawn-=dt; if(this.respawn<=0){ this.y=this.origY; this.vy=0; this.state='idle'; this.solid=true; }
    }
  }
}

// ---- Falling rock: drops when the player crosses a trigger; deadly while airborne. ----
export class FallingRock{
  constructor(x,y,w=46,h=46,triggerX,landY){ Object.assign(this,{x,y,w,h,triggerX,landY}); this.type='rock';
    this.solid=false; this.deadly=false; this.startY=y; this.vy=0; this.state='wait'; this.respawn=0; this.justLanded=false; }
  update(dt, player){
    this.justLanded=false;
    if(this.state==='wait'){
      if(player.x+player.w>this.triggerX){ this.state='fall'; this.deadly=true; }
    } else if(this.state==='fall'){
      this.vy+=GRAVITY*dt; this.y+=this.vy*dt;
      if(this.y+this.h>=this.landY){ this.y=this.landY-this.h; this.state='rest';
        this.deadly=false; this.justLanded=true; this.respawn=2.4; }
    } else if(this.state==='rest'){
      this.respawn-=dt; if(this.respawn<=0){ this.y=this.startY; this.vy=0; this.state='wait'; }
    }
  }
}

// ---- Water zone: the player swims inside it. ----
export class WaterZone{
  constructor(x,y,w,h,swim=true){ Object.assign(this,{x,y,w,h}); this.type='water'; this.solid=false; this.swim=swim; }
}

// ---- Boat: a raft you push into the water, stand on, and paddle across. ----
export class Boat{
  constructor(x,y,w=132,h=20){ Object.assign(this,{x,y,w,h}); this.vx=0; this.vy=0;
    this.solid=true; this.type='boat'; this.pdx=0; this.pdy=0; this.inWater=false; this.grabbed=false; }
  update(dt, statics, waterZones, drive){
    const px=this.x, py=this.y;
    const cx=this.x+this.w/2, cy=this.y+this.h*0.5;
    const zone = waterZones.find(z=> cx>z.x && cx<z.x+z.w && cy>z.y-6 && cy<z.y+z.h);
    if(zone){
      this.inWater=true;
      const targetY = zone.y - this.h*0.35;           // float with the deck at the surface
      this.y += (targetY-this.y)*Math.min(1, dt*6); this.vy=0;
      this.vx += drive*260*dt;
      if(drive===0) this.vx *= Math.pow(0.15, dt); else this.vx = clamp(this.vx,-160,160);
      this.x += this.vx*dt;
      if(this.x < zone.x){ this.x=zone.x; this.vx=0; }
      if(this.x+this.w > zone.x+zone.w){ this.x=zone.x+zone.w-this.w; this.vx=0; }
    } else {
      this.inWater=false;
      this.vy += GRAVITY*dt; this.x += this.vx*dt; this.y += this.vy*dt;
      this.vx *= Math.pow(0.08, dt);
      for(const s of statics){ if(s.solid && aabb(this,s)){ if(this.vy>0) this.y=s.y-this.h; this.vy=0; } }
    }
    this.pdx=this.x-px; this.pdy=this.y-py;
  }
  tryMoveX(dx, statics){ this.x += dx;
    for(const s of statics){ if(s.solid && aabb(this,s)){ if(dx>0) this.x=s.x-this.w; else this.x=s.x+s.w; return; } } }
}

// ---- Bear trap: open jaws that SNAP SHUT the moment you step in. Jump over it. ----
export class BearTrap{
  constructor(x,groundY){ this.x=x; this.w=60; this.h=30; this.y=groundY;   // base sits on the ground
    this.type='trap'; this.solid=false; this.state='open'; this.t=0; this.deadly=false; this.hold=0; }
  update(dt, player){
    const jaw = { x:this.x+6, y:this.y-30, w:this.w-12, h:34 };            // the dangerous mouth
    if(this.state==='open'){
      this.t = Math.max(0, this.t - dt*6);                                  // jaws fully raised
      if(aabb(player, jaw)){ this.state='closed'; this.deadly=true; this.hold=1.2; this.justSnapped=true; }
    } else {
      this.t = Math.min(1, this.t + dt*22);                                 // snap shut fast
      this.hold -= dt; if(this.hold<=0){ this.state='open'; this.deadly=false; }
    }
  }
  get rect(){ return { x:this.x+6, y:this.y-26, w:this.w-12, h:30 }; }
}

// ---- Rope: a hanging line you can grab and swing on, then release to fly. ----
export class Rope{
  constructor(ax, ay, length){ this.ax=ax; this.ay=ay; this.length=length;
    this.theta=0.12; this.omega=0; this.type='rope'; this.solid=false; this.grabbed=false; }
  get bobX(){ return this.ax + Math.sin(this.theta)*this.length; }
  get bobY(){ return this.ay + Math.cos(this.theta)*this.length; }
  idle(dt){                                       // gentle damped sway when nobody holds it
    if(this.grabbed) return;
    const a = -(1700/this.length)*Math.sin(this.theta);
    this.omega = (this.omega + a*dt) * Math.pow(0.35, dt);
    this.theta += this.omega*dt;
  }
}

// ---- Level goal / exit ----
export class Goal{
  constructor(x,y){ Object.assign(this,{x,y,w:60,h:120}); this.type='goal'; this.solid=false; }
}
