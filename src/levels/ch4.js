// CHAPTER IV — THE SIEGE  (crushers, moving platforms, falling rocks — long)
import { Level } from './kit.js';
export const title = 'The Siege';
export function build(){
  const L = new Level(title, { theme:'siege' });
  const G = L.G;
  L.start(60);

  L.ground(-200,1900);                           // continuous (to 1700)
  L.checkpoint(120); L.checkpoints[0].active=true;
  L.prop(300,'burned_house',170,200); L.prop(600,'banner',30,160);

  L.crusher(620, G-280,70,140,200,2.2,0.0);
  L.crusher(920, G-280,70,140,200,2.2,0.9);
  L.crusher(1220,G-280,70,140,200,2.2,1.7);
  L.checkpoint(1420); L.prop(1000,'banner',30,160);
  L.crusher(1520,G-280,70,140,200,2.4,0.5);

  L.pit(1700,420); L.mplat(1720, G-30,120,24, 300,0,110);
  L.crusher(1900,G-320,70,150,190,2.6,0.4);

  L.ground(2120,1500);                           // to 3620
  L.checkpoint(2200);
  L.rock(2500,G-400,2400,G); L.rock(2850,G-420,2740,G);
  L.prop(2600,'burned_house',160,190); L.prop(3050,'banner',30,160);
  L.crusher(3000,G-280,70,140,200,2.2,0.2);
  L.crusher(3260,G-280,70,140,200,2.2,1.1);

  // war-gate: crate onto plate
  const gate=L.gate(3520,190); L.plate(3380,gate); L.box(3280);

  L.ground(3620,1300);                           // to 4920
  L.checkpoint(3690);
  L.crusher(3980,G-280,70,140,200,2.0,0.3);
  L.crusher(4240,G-280,70,140,200,2.0,1.2);
  L.rock(4500,G-420,4400,G);
  L.prop(4300,'burned_house',160,200);
  L.prop(4640,'shrine',200,250);
  L.setGoal(4680);
  return L.build();
}
