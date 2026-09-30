// CHAPTER I — THE FALLEN VILLAGE  (teaches the basics, long and gentle)
import { Level } from './kit.js';
export const title = 'The Fallen Village';
export function build(){
  const L = new Level(title, { theme:'village' });
  const G = L.G;
  L.start(60);

  // --- start plateau: walk, an optional rope, a bear trap ---
  L.ground(-200,1200);                          // to 1000
  L.checkpoint(120); L.checkpoints[0].active=true;
  L.prop(360,'fallen_body',120,30); L.prop(520,'house_dist',170,180);
  L.prop(200,'tree',90,220); L.prop(760,'tree',70,190);
  L.rope(900, G-300, 150);                       // optional swing over safe ground
  // gap 1000 -> 1160

  // --- crate + shelf climb ---
  L.ground(1160,1100);                           // to 2260
  L.trap(1360);
  L.checkpoint(1250);
  L.prop(1520,'tree',80,200);
  L.box(1650); L.ledge(1830, G-96, 540);         // push crate, hop the shelf
  L.light(1900, G-150, 170);

  // --- spike gauntlet ---
  L.ground(2260,1200);                           // to 3460
  L.spike(2460,120); L.pillar(2660,64); L.spike(2740,140); L.pillar(2980,104);
  L.spike(3160,120);
  L.prop(2560,'fallen_body',70,26); L.prop(3050,'tree',80,200);
  L.checkpoint(3360);

  // --- a second pushing puzzle: crate onto a plate opens a gate ---
  L.ground(3460,1200);                           // to 4660
  const g1=L.gate(4020,190); L.plate(3680,g1); L.box(3560);
  L.moon(4043,G-250,150);
  L.prop(4260,'burned_house',160,210);
  L.trap(4460);

  // --- moving platform over a chasm ---
  L.pit(4660,520);                               // 4660 -> 5180
  L.mplat(4680, G-26, 130,24, 360,0, 120);
  L.checkpoint(5240);

  // --- final stretch: short jumps + shrine ---
  L.ground(5180,1500);                           // to 6680
  L.spike(5520,110); L.pillar(5720,70); L.spike(5900,120);
  L.prop(6320,'shrine',200,260);
  L.setGoal(6360);
  return L.build();
}
