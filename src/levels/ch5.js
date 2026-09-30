// CHAPTER V — THE FORGOTTEN CASTLE  (combine everything — long)
import { Level } from './kit.js';
export const title = 'The Forgotten Castle';
export function build(){
  const L = new Level(title, { theme:'castle' });
  const G = L.G;
  L.start(60);

  L.ground(-200,1000);                           // to 800
  L.checkpoint(120); L.checkpoints[0].active=true;
  L.prop(300,'burned_house',180,220); L.prop(560,'banner',30,180);
  const gate1=L.gate(700,190); L.lever(470, gate1);

  L.ground(800,1300);                            // to 2100
  L.crusher(1000,G-280,70,140,200,2.4,0.0);
  L.crusher(1300,G-280,70,140,200,2.4,1.2);
  L.checkpoint(1500);
  L.pit(1650,540); L.collapse(1670,120,G); L.collapse(1850,120,G); L.collapse(2030,120,G);

  L.ground(2190,1400);                           // to 3590
  L.checkpoint(2270); L.rock(2500,G-400,2400,G);
  L.pit(2700,360); L.mplat(2720, G-30,120,24, 260,0,110);
  const gate2=L.gate(3300,190); L.plate(3160,gate2); L.box(3080);
  L.moon(3323,G-250,150); L.prop(3000,'banner',30,180);

  L.ground(3590,1300);                           // to 4890
  L.checkpoint(3660);
  L.crusher(3900,G-280,70,140,200,2.1,0.4);
  L.crusher(4160,G-280,70,140,200,2.1,1.3);
  L.pit(4400,360); L.collapse(4420,120,G); L.collapse(4600,120,G);

  L.ground(4820,1000);                           // to 5820
  L.checkpoint(4890);
  L.prop(5400,'shrine',210,260); L.prop(5180,'burned_house',180,220);
  L.setGoal(5440);
  return L.build();
}
