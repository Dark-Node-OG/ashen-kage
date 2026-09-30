// CHAPTER VII — THE SHADOW  (the climax: a long, tense descent to the source)
import { Level } from './kit.js';
export const title = 'The Shadow';
export function build(){
  const L = new Level(title, { theme:'shadow' });
  const G = L.G;
  L.start(60);

  L.ground(-200,900);                            // to 700
  L.checkpoint(120); L.checkpoints[0].active=true;
  L.prop(300,'statue',60,180); L.prop(520,'torii_broken',90,150);

  L.pit(700,540); L.collapse(720,120,G); L.collapse(900,120,G); L.collapse(1080,120,G);

  L.ground(1240,760);                            // to 2000
  L.checkpoint(1320);
  L.crusher(1520,G-300,64,150,200,2.4,0.0);
  L.crusher(1720,G-300,64,150,200,2.4,1.2);

  L.pit(2000,320); L.mplat(2020, G-30,120,24, 260,0,105);

  L.ground(2320,1000);                           // to 3320
  L.checkpoint(2400);
  L.crusher(2620,G-300,64,150,200,2.2,0.4);
  L.crusher(2860,G-300,64,150,200,2.2,1.3);
  L.prop(2700,'statue',60,180);

  L.pit(3320,420); L.collapse(3340,120,G); L.collapse(3520,120,G);

  L.ground(3740,1300);                           // to 5040
  L.checkpoint(3810);
  // the shadow itself, then the final warm shrine
  L.light(4120, G-140, 440, 'rgba(90,110,160,', 0.7);
  L.prop(4080,'shadow',120,320);
  L.prop(4620,'shrine',220,280);
  L.setGoal(4700);
  return L.build();
}
