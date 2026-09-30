ASHEN KAGE — DEVELOPMENT ROADMAP
================================

Studio: DARK NODE
Genre: Cinematic 2.5D atmospheric puzzle-platformer
Engine: HTML5 Canvas + vanilla JavaScript modules (no build step)
Run locally: python -m http.server 8899  (open http://127.0.0.1:8899/)

NORTH STAR
A tiny mysterious figure moving through a huge, beautiful, dying world.
The player is not powerful. The world is the challenge.

PHASES (build in order, do not skip a broken phase)
1  Project foundation ............ DONE (structure, loop, server)
2  Player movement ............... DONE (walk/run/jump/crouch/coyote/buffer)
3  Camera ........................ DONE (smooth follow, look-ahead, shake)
4  Physics / interactions ........ DONE (AABB, crates push/pull, plates, gate, moving platform)
5  Puzzle framework .............. IN PROGRESS (plate+gate, crate-climb working)
6  Hazard / death / checkpoint ... DONE (spikes, fall death, shrine checkpoints, respawn)
7  Level framework ............... DONE (data-driven levels, Chapter I slice)
8  Atmosphere / lighting ......... DONE (fog, moonlight, ash, parallax, silhouettes, vignette)
9  Story / environmental systems . STARTED (silhouette story props in Chapter I)
10 Progression / mastery ......... TODO (save file, deaths, best time, mastery %)
11 Challenge mode (Ashen Trials) . TODO (no-death, time trial, one life)
12 New Game+ ..................... TODO
13 Polish and optimization ....... ONGOING

CURRENT VERTICAL SLICE (Chapter I — The Fallen Village)
Teaches: move -> jump -> push crate + climb -> spike timing -> plate/gate -> moving platform -> shrine.
Has: silhouette player, cinematic camera, atmosphere, hazards, death, checkpoints, one story moment, real end.

NEXT UP
- Audio layer (wind, footsteps, temple bell, silence).
- Save system (localStorage) + level results screen data.
- Second teaching beat variety (lever, pull, timing gate).
- Refine crate-climb and ledge-grab feel from playtest.
