// character.js — the real ashen wanderer: an articulated, eased procedural skeleton
// with a carried lantern, moonlight rim, and a flowing cloak. Readable in silhouette,
// but never invisible. Replaces the old flat player shape.
import { lerp, clamp } from './physics.js';

const RUN = 320;                 // matches player.js RUN for amplitude scaling
const BODY   = '#171c28';        // slightly lifted from the pure-black world silhouettes
const BODY2  = '#10141d';        // back limbs (depth)
const CLOAK  = '#0c1019';
const RIM    = 'rgba(150,180,225,0.55)';   // cold moon rim
const RIMW   = 'rgba(201,146,46,0.35)';    // warm lantern rim on lower body

export class Character{
  constructor(){ this._t = 0; }

  // draws in WORLD space (called inside the camera transform)
  draw(ctx, p, time){
    let dt = time - this._t; this._t = time;
    if(!(dt > 0) || dt > 0.1) dt = 0.016;

    const a = this._anim(p);
    this._retarget(p, a, dt, time);

    const flip = p.facing < 0;
    const ox = p.x + p.w/2;          // local origin X (centre)
    const oy = p.y + p.h;            // local origin Y (feet)
    const F  = flip ? -1 : 1;

    // ---- ground contact shadow ----
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(ox, oy+1, 16 - a.tuck*6, 4, 0, 0, 7); ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(F, 1);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    // pose scalars
    const hipY   = -24 + a.bodyY;                 // pelvis height
    const shY    = hipY - 15 + a.bodyY*0.2;       // shoulders
    const lean   = a.lean;
    const cyc    = a.cycle;
    const amp    = a.amp;

    // ---- cloak (behind everything) ----
    this._cloak(ctx, shY, hipY, lean, a, time);

    // ---- BACK leg ----
    const hipBack  = amp*Math.sin(cyc+Math.PI) + a.tuck*0.5 + lean*0.4 + a.crouch*0.6;
    const kneeBack = Math.max(0, Math.sin(cyc+Math.PI+0.5))*amp*1.3 + a.tuck*1.3 + a.crouch*1.6;
    this._limb(ctx, lean*3, hipY, hipBack, 12, kneeBack, 12, 6.5, BODY2);

    // ---- BACK arm ----
    const shBack  = -amp*Math.sin(cyc)*0.7 - a.armRaise*2.4 - a.hang*3.0 + lean*0.3;
    const elBack  = 0.5 + a.armRaise*0.6 + a.hang*0.2 + a.reach*0.8;
    this._limb(ctx, lean*3+1, shY, shBack, 10, elBack, 9, 5, BODY2);

    // ---- torso + head ----
    this._torso(ctx, hipY, shY, lean, a);

    // ---- FRONT leg ----
    const hipFront  = amp*Math.sin(cyc) + a.tuck*0.9 + lean*0.4 + a.crouch*0.7;
    const kneeFront = Math.max(0, Math.sin(cyc+0.5))*amp*1.3 + a.tuck*1.6 + a.crouch*1.9;
    this._limb(ctx, lean*3, hipY, hipFront, 12, kneeFront, 12, 7, BODY);

    // ---- FRONT arm holds the lantern ----
    const lanternSw = a.lanternSwing;
    const shFront = 0.85 + lanternSw*0.5 - a.armRaise*1.2 - a.hang*3.0 + lean*0.2 + a.reach*0.9;
    const elFront = 0.7 + Math.sin(time*1.6)*0.05 + a.reach*0.6 - a.hang*0.4;
    const hand = this._limb(ctx, lean*3+1, shY, shFront, 10, elFront, 9, 5.5, BODY);

    // ---- lantern in the hand ----
    this._lantern(ctx, hand.x, hand.y, lanternSw, time);

    // store lantern world position so the renderer can cast light from it
    p._lantern = { x: ox + F*hand.x, y: oy + hand.y + 6 };

    // ---- rim lights ----
    this._rim(ctx, hipY, shY, a);

    ctx.restore();
  }

  // draw a two-bone limb; angles measured from straight-down, +forward. returns end point.
  _limb(ctx, x0, y0, a1, L1, a2, L2, w, color){
    const kx = x0 + Math.sin(a1)*L1;
    const ky = y0 + Math.cos(a1)*L1;
    const ex = kx + Math.sin(a1+a2)*L2;
    const ey = ky + Math.cos(a1+a2)*L2;
    ctx.strokeStyle = color; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(kx,ky); ctx.lineTo(ex,ey); ctx.stroke();
    return { x:ex, y:ey, kx, ky };
  }

  _torso(ctx, hipY, shY, lean, a){
    const lx = Math.sin(lean)*8;                 // lean pushes shoulders forward
    // body as a tapered shape
    ctx.fillStyle = BODY;
    ctx.beginPath();
    ctx.moveTo(-5, hipY);
    ctx.lineTo(5, hipY);
    ctx.lineTo(6+lx, shY+2);
    ctx.lineTo(-4+lx, shY+2);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = BODY; ctx.lineWidth = 9; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(0,hipY); ctx.lineTo(lx, shY+2); ctx.stroke();

    // head + conical straw-hat-ish silhouette (original, not any existing game)
    const hx = lx*1.3, hy = shY - 6 - a.bodyY*0.2;
    ctx.fillStyle = BODY;
    ctx.beginPath(); ctx.arc(hx, hy, 6, 0, 7); ctx.fill();
    // hat brim
    ctx.beginPath();
    ctx.moveTo(hx-11, hy-3);
    ctx.quadraticCurveTo(hx, hy-13, hx+11, hy-3);
    ctx.quadraticCurveTo(hx, hy-6, hx-11, hy-3);
    ctx.closePath(); ctx.fill();
    // scarf trailing
    const sw = Math.sin(this._t*3)*3 + a.amp*4 + lean*6;
    ctx.strokeStyle = 'rgba(122,36,25,0.5)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(hx-3, hy+4);
    ctx.quadraticCurveTo(-8-sw, shY+6, -14-sw, shY+14); ctx.stroke();
  }

  _cloak(ctx, shY, hipY, lean, a, time){
    const sway = Math.sin(time*2.2)*3 + a.amp*6 + lean*10 + a.tuck*-8;
    ctx.fillStyle = CLOAK;
    ctx.beginPath();
    ctx.moveTo(4, shY+2);
    ctx.quadraticCurveTo(10, hipY, 6, hipY+16);
    ctx.quadraticCurveTo(-4-sway, hipY+22-a.tuck*10, -12-sway, hipY+10-a.tuck*14);
    ctx.quadraticCurveTo(-8, hipY-4, -5, shY+2);
    ctx.closePath(); ctx.fill();
  }

  _lantern(ctx, x, y, swing, time){
    const lx = x + Math.sin(swing)*3;
    const ly = y + 8;
    // cord
    ctx.strokeStyle = BODY; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(lx, ly-4); ctx.stroke();
    // lantern body
    ctx.fillStyle = '#1c150a'; ctx.fillRect(lx-4, ly-4, 8, 10);
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1; ctx.strokeRect(lx-4, ly-4, 8, 10);
    // warm ember core (flickers)
    const fl = 0.7 + Math.sin(time*11)*0.2 + Math.sin(time*3.3)*0.1;
    ctx.fillStyle = `rgba(255,180,80,${0.85*fl})`;
    ctx.fillRect(lx-2.5, ly-2, 5, 7);
    const g = ctx.createRadialGradient(lx, ly+1, 0, lx, ly+1, 20);
    g.addColorStop(0, `rgba(255,190,110,${0.34*fl})`); g.addColorStop(1,'rgba(255,190,110,0)');
    ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.fillStyle=g;
    ctx.beginPath(); ctx.arc(lx, ly+1, 20, 0, 7); ctx.fill(); ctx.restore();
  }

  _rim(ctx, hipY, shY, a){
    // cold moon rim down the back edge
    ctx.strokeStyle = RIM; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-5, shY+1); ctx.lineTo(-5.5, hipY+2); ctx.stroke();
    // warm lantern rim on the lower front
    ctx.strokeStyle = RIMW; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(6, hipY-2); ctx.lineTo(4, hipY+12); ctx.stroke();
  }

  // ---- animation targets (eased so nothing is stiff) ----
  _anim(p){
    if(!p.anim) p.anim = { amp:0, lean:0, bodyY:0, tuck:0, crouch:0, armRaise:0,
                           hang:0, reach:0, cycle:0, lanternSwing:0 };
    return p.anim;
  }
  _retarget(p, a, dt, time){
    const speed = Math.abs(p.vx);
    const moving = speed > 25 && p.onGround && !p.grabbing;
    const k = (rate)=> 1 - Math.pow(rate, dt);   // smoothing helper

    // advance walk cycle by distance travelled (foot never slides oddly)
    a.cycle += speed * dt * 0.04 + (moving ? 0 : 0);
    if(!moving && !p.grabbing) a.cycle += dt * 1.2;   // gentle idle sway

    const tAmp   = moving ? clamp(0.35 + speed/RUN*0.55, 0.35, 0.95) : 0.06;
    const tLean  = clamp(p.vx / RUN, -1, 1) * (p.onGround ? 0.22 : 0.30);
    const tTuck  = (!p.onGround) ? (p.vy < 0 ? 0.9 : 0.5) : 0;   // jump vs fall
    const tCrouch= p.crouch ? 1 : 0;
    const tRaise = (!p.onGround) ? (p.vy < 0 ? 0.7 : 0.45) : 0;
    const tHang  = (p.state==='hang') ? 1 : 0;
    const tReach = (p.grabbing) ? 1 : 0;
    const tBodyY = tCrouch*10 + tHang*-6;
    const tSwing = clamp(-p.vx/RUN*0.6, -0.7, 0.7) + Math.sin(time*2)*0.12;

    a.amp        = lerp(a.amp, tAmp, k(0.0005));
    a.lean       = lerp(a.lean, tLean, k(0.002));
    a.tuck       = lerp(a.tuck, tTuck, k(0.0008));
    a.crouch     = lerp(a.crouch, tCrouch, k(0.0009));
    a.armRaise   = lerp(a.armRaise, tRaise, k(0.001));
    a.hang       = lerp(a.hang, tHang, k(0.0009));
    a.reach      = lerp(a.reach, tReach, k(0.0009));
    a.bodyY      = lerp(a.bodyY, tBodyY, k(0.002));
    a.lanternSwing = lerp(a.lanternSwing, tSwing, k(0.004));
  }
}
