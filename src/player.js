// player.js — the small ashen figure. Focused movement vocabulary.
import { Input } from './input.js';
import { aabb, moveAndCollide, GRAVITY, clamp } from './physics.js';

const WALK = 190, RUN = 320, ACCEL = 2400, AIR_ACCEL = 1400, FRICTION = 2600;
const JUMP_VEL = 900, COYOTE = 0.09, JUMP_BUFFER = 0.11, CUT = 0.45;

export class Player{
  constructor(x,y){
    this.x=x; this.y=y; this.w=26; this.h=48;
    this.vx=0; this.vy=0;
    this.facing=1;
    this.onGround=false; this.coyote=0; this.buffer=0;
    this.state='idle'; this.animT=0; this.stepPhase=0;
    this.crouch=false;
    this.grabbing=null;      // Box currently held
    this.hang=null;          // {solid} while hanging on ledge
    this.rope=null;          // Rope currently held
    this.ridingBoat=null;    // Boat currently sailed (set by game)
    this.climbLock=0;        // brief lock during ledge climb
    this.dead=false; this.deadKind='spike'; this.deathT=0; this.deathX=0; this.deathY=0;
  }

  reset(x,y){ this.x=x; this.y=y; this.vx=0; this.vy=0; this.dead=false; this.deathT=0;
    this.grabbing=null; this.hang=null; this.rope=null; this.climbLock=0; this.state='idle'; }

  update(dt, world){
    if(this.dead) return;
    if(this.climbLock>0){ this.climbLock-=dt; this.animT+=dt; return; }

    const A = Input.actions;
    let dir = (A.right?1:0) - (A.left?1:0);
    if(this.ridingBoat){ dir = 0; }        // sitting on the boat: left/right paddles it, not the feet

    // ---------- Water detection ----------
    this.inWater = false;
    if(world.waterZones){
      const cx=this.x+this.w/2, cy=this.y+this.h*0.4;
      for(const z of world.waterZones){
        if(z.swim!==false && cx>z.x && cx<z.x+z.w && cy>z.y && cy<z.y+z.h){ this.inWater=true; break; }
      }
    }

    // ---------- Rope swinging ----------
    if(this.rope){
      const r=this.rope, g=2600;
      let alpha = -(g/r.length)*Math.sin(r.theta) + dir*6.5;   // gravity + pump with left/right
      r.omega += alpha*dt; r.omega *= Math.pow(0.55, dt);
      r.theta += r.omega*dt;
      this.x = r.ax + Math.sin(r.theta)*r.length - this.w/2;
      this.y = r.ay + Math.cos(r.theta)*r.length - this.h*0.5;
      this.vx = r.omega*r.length*Math.cos(r.theta);
      this.vy = -r.omega*r.length*Math.sin(r.theta);
      if(Math.abs(r.omega)>0.05) this.facing = r.omega>0?1:-1;
      this.state='rope'; this.animT+=dt;
      if(Input.jumpPressed){                                   // release and launch
        r.grabbed=false; this.rope=null; this.onGround=false; this.vy -= 250;
        this.coyote=0; this.buffer=0;
      }
      return;
    }
    // try to grab a nearby rope while airborne
    if(!this.rope && Input.grabPressed && !this.onGround && world.ropes){
      for(const r of world.ropes){
        const bx=r.bobX, by=r.bobY;
        if(Math.hypot((this.x+this.w/2)-bx,(this.y+this.h/2)-by) < 48){
          this.rope=r; r.grabbed=true;
          r.theta=Math.atan2((this.x+this.w/2)-r.ax,(this.y+this.h/2)-r.ay);
          r.omega=(this.vx*Math.cos(r.theta) - this.vy*Math.sin(r.theta))/r.length;
          break;
        }
      }
    }

    // ---------- Hanging on a ledge ----------
    if(this.hang){
      this.vx=0; this.vy=0;
      if(A.jump || A.up){ this._climbUp(); return; }
      if(A.down){ this.hang=null; this.vy=60; }
      else { this.animT+=dt; this.state='hang'; return; }
    }

    // ---------- Grab / push / pull ----------
    this._handleGrab(world, dir);

    // ---------- Horizontal movement ----------
    const wantRun = !this.crouch && !this.grabbing;
    let maxSpeed = this.crouch ? WALK*0.55 : (this.grabbing ? WALK*0.7 : RUN);
    const a = this.onGround ? ACCEL : AIR_ACCEL;
    if(dir!==0){
      this.vx += dir * a * dt;
      this.vx = clamp(this.vx, -maxSpeed, maxSpeed);
      if(!this.grabbing) this.facing = dir;
    } else {
      const f = FRICTION*dt;
      if(this.vx>0) this.vx = Math.max(0, this.vx-f); else this.vx = Math.min(0, this.vx+f);
    }

    this.crouch = A.down && this.onGround && !this.grabbing;

    // ---------- Jump (coyote + buffer) ----------
    if(Input.jumpPressed) this.buffer = JUMP_BUFFER;
    this.buffer = Math.max(0, this.buffer-dt);
    this.coyote = this.onGround ? COYOTE : Math.max(0, this.coyote-dt);
    if(!this.inWater && this.buffer>0 && this.coyote>0 && !this.grabbing){
      this.vy = -JUMP_VEL; this.onGround=false; this.coyote=0; this.buffer=0;
      world.onJump && world.onJump(this);
    }
    if(!this.inWater && !A.jump && this.vy<0) this.vy *= Math.pow(CUT, dt*60); // variable height

    // ---------- Gravity / buoyancy ----------
    if(this.inWater){
      this.vx = clamp(this.vx, -maxSpeed*0.72, maxSpeed*0.72);
      this.vy += GRAVITY*0.16*dt;                 // slow sink
      if(A.up)   this.vy -= 1100*dt;              // swim up (hold)
      if(A.down) this.vy += 520*dt;               // dive
      if(Input.jumpPressed) this.vy = -470;       // stroke / leap toward surface
      this.vy = clamp(this.vy, -300, 340);
    } else {
      this.vy += GRAVITY*dt;
      this.vy = Math.min(this.vy, 1800);
    }

    // ---------- Coupled box movement ----------
    if(this.grabbing && dir!==0){
      const box = this.grabbing;
      const before = box.x;
      box.tryMoveX(this.vx*dt, world.statics, world.boxes);
      const moved = box.x - before;
      this.x += moved; // player follows the box exactly
      this.vx = 0;
      // vertical still resolves below
    }

    // ---------- Moving platform carry ----------
    if(this.onGround && this._rideMPlat){
      this.x += this._rideMPlat.pdx; this.y += this._rideMPlat.pdy;
    }
    this._rideMPlat = null;

    // ---------- Collide with world ----------
    const solids = world.solids();
    const res = moveAndCollide(this, solids, dt);
    this.onGround = res.onGround;

    // detect moving-platform we're standing on
    if(res.onGround){
      for(const s of solids){ if((s.type==='mplat'||s.type==='boat') &&
        Math.abs((this.y+this.h)-s.y)<4 && this.x+this.w>s.x && this.x<s.x+s.w){ this._rideMPlat=s; }
      }
    }

    // ---------- Ledge grab detection ----------
    if(!this.onGround && !this.grabbing && this.vy>0 && dir!==0)
      this._tryLedgeGrab(solids, dir);

    // ---------- Animation state ----------
    this.animT += dt;
    if(!this.onGround) this.state = this.vy<0 ? 'jump':'fall';
    else if(this.grabbing) this.state = dir!==0 ? 'push':'grab';
    else if(this.crouch) this.state='crouch';
    else if(Math.abs(this.vx)>30){ this.state = Math.abs(this.vx)>WALK+20?'run':'walk';
      this.stepPhase += Math.abs(this.vx)*dt*0.06; }
    else this.state='idle';
  }

  _handleGrab(world, dir){
    if(!Input.actions.grab){ this.grabbing=null; return; }
    if(this.grabbing) return; // keep hold
    // find adjacent box in facing direction
    const reach = { x:this.x + (this.facing>0? this.w: -8), y:this.y+8, w:8, h:this.h-12 };
    for(const b of world.boxes){
      if(aabb(reach,b) && this.onGround){ this.grabbing=b; break; }
    }
    if(!this.grabbing && world.boats){
      for(const b of world.boats){ if(!b.inWater && aabb(reach,b) && this.onGround){ this.grabbing=b; break; } }
    }
  }

  _tryLedgeGrab(solids, dir){
    const gx = this.facing>0 ? this.x+this.w : this.x;      // hand x at facing side
    const band = { x: gx-4 + (this.facing>0?0:-6), y:this.y+4, w:12, h:14 };
    for(const s of solids){
      if(!s.solid || s.type==='box' || s.type==='mplat') continue;
      const nearTop = Math.abs(s.y - this.y) < 20;          // hands near ledge top
      const facingWall = this.facing>0 ? Math.abs(s.x-(this.x+this.w))<12
                                       : Math.abs((s.x+s.w)-this.x)<12;
      if(nearTop && facingWall){
        // ensure space above ledge to stand
        const above = { x:(this.facing>0? s.x : s.x+s.w-this.w), y:s.y-this.h-2, w:this.w, h:this.h };
        if(!solids.some(o=>o.solid&&o!==s&&aabb(above,o))){
          this.hang = { solid:s }; this.vx=0; this.vy=0;
          this.y = s.y - this.h*0.55;                        // hang below the ledge
          this.x = this.facing>0 ? s.x-this.w+4 : s.x+s.w-4;
          return;
        }
      }
    }
  }

  _climbUp(){
    const s = this.hang.solid;
    this.x = this.facing>0 ? s.x-this.w+8 : s.x+s.w-8;
    this.y = s.y - this.h;
    this.hang=null; this.onGround=true; this.vy=0; this.vx=0;
    this.climbLock=0.18; this.state='climb';
  }

  kill(kind='spike'){ if(!this.dead){ this.dead=true; this.deadKind=kind; this.deathT=0;
    this.deathX=this.x+this.w/2; this.deathY=this.y+this.h;
    this.vx=0; this.vy=0; this.grabbing=null; this.hang=null;
    if(this.rope){ this.rope.grabbed=false; this.rope=null; } } }
}
