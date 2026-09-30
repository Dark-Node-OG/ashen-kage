// CHAPTER II — THE BLACK FOREST  (levers, collapsing bridges, falling rocks, a rope crossing)
import { Level } from './kit.js';
export const title = 'The Black Forest';
export function build(){
  const L = new Level(title, { theme:'forest' });
  const G = L.G;
  L.start(60);

  L.ground(-200,900);                            // to 700
  L.checkpoint(120); L.checkpoints[0].active=true;
  L.prop(300,'tree',90,220); L.prop(520,'tree',70,180); L.prop(150,'bamboo',40,240);
  L.rope(430, G-300, 150); L.trap(600);
  // gap 700 -> 850

  L.ground(850,900);                             // to 1750
  const gate1=L.gate(1360,190); L.lever(1060, gate1);
  L.checkpoint(960);
  L.prop(1150,'tree',80,200); L.prop(1500,'bamboo',44,260);

  // collapsing bridge over a spiked pit
  L.pit(1750,560); L.collapse(1770,120,G); L.collapse(1950,120,G); L.collapse(2130,120,G);

  L.ground(2310,1000);                           // to 3310
  L.checkpoint(2380); L.trap(2500);
  L.rock(2650,G-380,2540,G);
  L.prop(2500,'tree',90,230); L.prop(2900,'tree',70,190);

  // --- ROPE CROSSING: swing the gap; a lower ledge catches you if you miss ---
  L.ground(3310, 560, G+120);                    // safety ledge below the gap
  // (main path has a gap 3310 -> 3720)
  L.rope(3515, G-330, 220);                      // swing across
  L.ground(3720,1100);                           // main path resumes (to 4820)
  L.checkpoint(3790);
  L.prop(3600,'tree',80,220);

  // one more collapsing run, then the shrine
  L.pit(4000,420); L.collapse(4020,120,G); L.collapse(4200,120,G);
  L.ground(4420,900);                            // to 5320
  L.checkpoint(4490);
  L.prop(4980,'shrine',180,240); L.prop(4760,'tree',90,230);
  L.setGoal(5020);
  return L.build();
}
