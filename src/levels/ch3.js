// CHAPTER III — THE DROWNED TEMPLE  (push a boat into the water, ride it across)
import { Level } from './kit.js';
export const title = 'The Drowned Temple';
export function build(){
  const L = new Level(title, { theme:'temple' });
  const G = L.G;
  L.start(60);

  L.ground(-200,900);                            // left shore (to 700)
  L.checkpoint(120); L.checkpoints[0].active=true;
  L.prop(300,'torii_broken',90,150); L.prop(520,'pagoda',120,220);

  // --- BOAT CROSSING: water you cannot walk on; board the boat and paddle right ---
  L.water(700, G-10, 900, 330, false);           // non-swim water (700 -> 1600)
  L.pit(700, 900, G+250);                         // deadly bottom if you fall in
  L.boat(712, G-60);                              // the raft, floating at the near shore
  L.moon(1150, G-40, 240);
  L.prop(820,'statue',60,160,G+120);

  L.ground(1600,1000);                            // far shore (to 2600)
  L.checkpoint(1660);
  L.prop(1800,'pagoda',120,220);

  // --- dry temple puzzles: lever gate, then crate-on-plate gate ---
  const gate1=L.gate(1980,190); L.lever(1800, gate1);
  const gate2=L.gate(2380,190); L.plate(2240, gate2); L.box(2120);
  L.moon(2403,G-250,140);
  L.checkpoint(2460);

  // --- spikes, then a moving platform over a flooded gap ---
  L.ground(2600,700);                            // to 3300
  L.spike(2800,120); L.pillar(3000,64); L.spike(3120,130);
  L.pit(3300,320); L.mplat(3320, G-26, 120,24, 260,0, 110);

  L.ground(3620,1100);                           // to 4720
  L.checkpoint(3690);
  L.prop(4300,'shrine',200,250); L.prop(4050,'pagoda',120,220);
  L.setGoal(4340);
  return L.build();
}
