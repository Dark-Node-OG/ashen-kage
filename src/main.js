// main.js — bootstrap + fixed-timestep loop (resilient: never lets one error freeze the game)
import { Input } from './input.js';
import { Game } from './game.js';

function showError(e){
  let d = document.getElementById('errbox');
  if(!d){ d = document.createElement('div'); d.id='errbox';
    d.style.cssText='position:fixed;left:0;right:0;bottom:0;z-index:9999;background:rgba(80,10,10,.92);'
      +'color:#ffd;font:12px monospace;padding:10px 14px;white-space:pre-wrap;max-height:40vh;overflow:auto;';
    document.body.appendChild(d); }
  d.textContent = 'ERROR: ' + (e && e.stack ? e.stack : (e && e.message ? e.message : e));
}
window.addEventListener('error', (ev)=> showError(ev.error || ev.message));
window.addEventListener('unhandledrejection', (ev)=> showError(ev.reason));

const canvas = document.getElementById('game');
Input.init();
const game = new Game(canvas);

const STEP = 1/120;
let acc = 0, last = performance.now();

function frame(now){
  try{
    let dt = (now - last)/1000; last = now;
    if(dt > 0.25) dt = 0.25;
    acc += dt;
    Input.preUpdate();
    let guard = 0;
    while(acc >= STEP && guard++ < 8){ game.update(STEP); Input.postUpdate(); Input.preUpdate(); acc -= STEP; }
    if(guard >= 8) acc = 0;              // don't spiral if a frame was slow
    game.render();
  }catch(e){ showError(e); }
  requestAnimationFrame(frame);          // always keep going
}
requestAnimationFrame(frame);
