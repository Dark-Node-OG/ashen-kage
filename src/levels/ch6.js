// CHAPTER VI — THE ASHEN MOUNTAIN  (mastery: dense combos + a rope crossing — long)
import { Level } from './kit.js';
export const title = 'The Ashen Mountain';
export function build(){
  const L = new Level(title, { theme:'mountain' });
  const G = L.G;
  L.start(60);

  L.ground(-200,900);                            // to 700
  L.checkpoint(120); L.checkpoints[0].active=true;
  L.prop(280,'dead_tree',90,240); L.prop(500,'dead_tree',70,200);

  L.pit(700,560); L.collapse(720,110,G); L.collapse(900,110,G); L.collapse(1080,110,G);

  L.ground(1260,900);                            // to 2160
  L.checkpoint(1330);
  L.crusher(1460,G-300,64,150,210,2.0,0.0);
  L.crusher(1640,G-300,64,150,210,2.0,0.7);
  L.crusher(1820,G-300,64,150,210,2.0,1.4);
  L.prop(1500,'dead_tree',80,220);

  L.pit(2160,420); L.mplat(2180, G-30,120,24, 300,0,125); L.rock(2360,G-460,2260,G+520);
  L.moon(2360,G-260,200);

  L.ground(2580,900);                            // to 3480
  L.checkpoint(2660);
  L.crusher(2900,G-300,64,150,200,1.9,0.3);
  L.crusher(3140,G-300,64,150,200,1.9,1.1);

  // --- ROPE CROSSING with a safety ledge below ---
  L.ground(3480,560,G+120);                      // net
  L.rope(3685, G-330, 220);                      // swing the gap (3480 -> 3900)
  L.ground(3900,1300);                           // to 5200
  L.checkpoint(3970);
  L.crusher(4220,G-300,64,150,200,1.9,0.5);
  L.crusher(4460,G-300,64,150,200,1.9,1.4);
  L.pit(4700,360); L.collapse(4720,120,G); L.collapse(4900,120,G);

  L.ground(5200,1000);                           // to 6200
  L.checkpoint(5270);
  L.prop(5780,'shrine',210,260); L.prop(5540,'dead_tree',90,230);
  L.setGoal(5820);
  return L.build();
}
