// camera.js — smooth follow with look-ahead + gentle deadzone + screen shake
import { lerp, clamp } from './physics.js';

export class Camera{
  constructor(){
    this.x = 0; this.y = 0;
    this.zoom = 1;
    this.shake = 0;
    this.bounds = null; // {minX,maxX,minY,maxY} in world px
  }
  setBounds(b){ this.bounds = b; }
  addShake(v){ this.shake = Math.min(this.shake + v, 30); }

  follow(target, vw, vh, dt){
    // desired: player slightly below centre, look ahead in facing direction
    const lookAhead = (target.facing || 1) * 90;
    const tx = target.x + target.w/2 + lookAhead - vw/2;
    const ty = target.y + target.h/2 - vh*0.58;

    this.x = lerp(this.x, tx, 1 - Math.pow(0.0009, dt));
    this.y = lerp(this.y, ty, 1 - Math.pow(0.004, dt));

    if(this.bounds){
      this.x = clamp(this.x, this.bounds.minX, Math.max(this.bounds.minX, this.bounds.maxX - vw));
      this.y = clamp(this.y, this.bounds.minY, Math.max(this.bounds.minY, this.bounds.maxY - vh));
    }
    if(this.shake > 0.2){ this.shake *= Math.pow(0.001, dt); } else this.shake = 0;
  }

  apply(ctx){
    let sx = 0, sy = 0;
    if(this.shake > 0){
      sx = (Math.random()*2-1) * this.shake;
      sy = (Math.random()*2-1) * this.shake;
    }
    ctx.translate(-Math.round(this.x + sx), -Math.round(this.y + sy));
  }
}
