// chapter1.js — CHAPTER I: THE FALLEN VILLAGE (vertical slice)
// A compact, handcrafted teaching level, all on one baseline so it is fully walkable:
// move -> jump a gap -> push crate & climb a wall -> spike hops ->
// drag crate onto pressure plate to open a gate -> ride platform over a spike chasm -> reach the shrine.
import { Solid, Box, Spikes, Gate, PressurePlate, MovingPlatform,
         Checkpoint, Light, StoryProp, Goal } from '../entities.js';

export function buildChapter1(){
  const G = 620;                       // single ground baseline
  const statics=[], boxes=[], spikes=[], gates=[], plates=[], levers=[],
        mplats=[], checkpoints=[], lights=[], story=[];
  let goal=null;
  const ground=(x,w,y=G)=> statics.push(new Solid(x,y,w,1200,'ground'));

  // ---------- Segment 1: start + teach jump ----------
  ground(-200, 1200);                  // spans to x=1000
  statics.push(new Solid(-260,-400,60,1600,'wall'));   // frame wall behind spawn
  const cp0 = new Checkpoint(120, G-80); checkpoints.push(cp0); cp0.active=true;
  lights.push(new Light(120, G-70, 160, 'rgba(201,146,46,', 0.8));
  // distant burning village (background storytelling)
  story.push(new StoryProp(520, G-180, 170, 180, 'house_dist'));
  story.push(new StoryProp(360, G-30, 120, 30, 'fallen_body'));
  // gap 1000 -> 1160

  // ---------- Segment 2: push crate, climb the wall ----------
  ground(1160, 1000);                  // spans to 2160
  statics.push(new Solid(1900, G-170, 60, 170, 'wall'));  // too tall to jump; must use crate
  boxes.push(new Box(1440, G-54));                        // crate to push to the wall
  const cp1 = new Checkpoint(1240, G-80); checkpoints.push(cp1);
  lights.push(new Light(1240, G-70, 150, 'rgba(201,146,46,', 0.8));
  story.push(new StoryProp(1640, G-150, 90, 150, 'torii_broken'));

  // ---------- Segment 3: spike hops ----------
  ground(2160, 1100);                  // spans to 3260
  spikes.push(new Spikes(2360, G-22, 130));
  statics.push(new Solid(2560, G-64, 46, 64, 'stone'));   // hop pillar
  spikes.push(new Spikes(2640, G-22, 150));
  statics.push(new Solid(2860, G-104, 46, 104, 'stone')); // taller pillar
  story.push(new StoryProp(2460, G-26, 70, 26, 'fallen_body'));
  const cp2 = new Checkpoint(3120, G-80); checkpoints.push(cp2);
  lights.push(new Light(3120, G-70, 160, 'rgba(201,146,46,', 0.85));

  // ---------- Segment 4: pressure-plate gate ----------
  ground(3260, 1100);                  // spans to 4360
  const gate = new Gate(3820, G-190, 46, 190); gates.push(gate);
  const plate = new PressurePlate(3420, G, 90, gate); plates.push(plate);
  boxes.push(new Box(3330, G-54));                        // drag onto the plate
  lights.push(new Light(3843, G-250, 150, 'rgba(120,150,201,', 0.5)); // cold light past the gate
  story.push(new StoryProp(4060, G-210, 160, 210, 'burned_house'));

  // ---------- Segment 5: spike chasm crossed by a moving platform ----------
  spikes.push(new Spikes(4360, G, 520));                  // the pit floor is deadly
  mplats.push(new MovingPlatform(4380, G-26, 130, 24, 360, 0, 120));

  // ---------- Segment 6: final approach + shrine goal ----------
  ground(4880, 1100);                  // spans to 5980
  const cp3 = new Checkpoint(4940, G-80); checkpoints.push(cp3);
  lights.push(new Light(4940, G-70, 150, 'rgba(201,146,46,', 0.85));
  story.push(new StoryProp(5520, G-260, 200, 260, 'shrine'));
  goal = new Goal(5560, G-120);
  lights.push(new Light(5590, G-90, 320, 'rgba(201,146,46,', 1.0));

  return { statics, boxes, spikes, gates, plates, levers, mplats,
           checkpoints, lights, story, goal,
           spawn:{ x:60, y:G-60 },
           bounds:{ minX:-260, maxX:6100, minY:-500, maxY:1000 },
           title:'The Fallen Village' };
}
