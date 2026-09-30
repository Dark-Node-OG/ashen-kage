// physics.js — small AABB helpers shared by player + boxes
export function aabb(a, b){
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

// Sweep a moving box `m` (with vx,vy already applied to a copy) against static solids.
// Returns collision flags. Resolves X then Y for stable platformer feel.
export function moveAndCollide(body, solids, dt){
  const res = { onGround:false, hitCeiling:false, hitLeft:false, hitRight:false };

  // --- X axis ---
  body.x += body.vx * dt;
  for(const s of solids){
    if(!s.solid) continue;
    if(aabb(body, s)){
      if(body.vx > 0){ body.x = s.x - body.w; res.hitRight = true; }
      else if(body.vx < 0){ body.x = s.x + s.w; res.hitLeft = true; }
      body.vx = 0;
    }
  }

  // --- Y axis ---
  body.y += body.vy * dt;
  for(const s of solids){
    if(!s.solid) continue;
    if(aabb(body, s)){
      if(body.vy > 0){ body.y = s.y - body.h; res.onGround = true; }
      else if(body.vy < 0){ body.y = s.y + s.h; res.hitCeiling = true; }
      body.vy = 0;
    }
  }
  return res;
}

export const GRAVITY = 2600;      // px / s^2
export const clamp = (v,a,b)=> v < a ? a : (v > b ? b : v);
export const lerp  = (a,b,t)=> a + (b-a)*t;
