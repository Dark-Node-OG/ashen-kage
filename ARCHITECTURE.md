ASHEN KAGE — TECHNICAL ARCHITECTURE
===================================

STACK
- HTML5 Canvas 2D for rendering (silhouettes + additive light layer).
- Vanilla JavaScript ES modules (import/export). No bundler, no framework.
- Fixed-timestep simulation (120 Hz) with variable render for stable physics.
- Served as static files; deployable to any web host, Android WebView, or PWA later.

WHY THIS STACK
- Silhouette + fog art is cheap on Canvas -> smooth on modest hardware (Intel UHD class).
- One codebase runs on PC, Android browser, and web. Offline friendly.
- No build step -> edit a file, refresh the page, see the change. Fast iteration with Claude Code.

FILE MAP  (game/src)
  main.js .......... bootstrap + fixed-timestep game loop
  input.js ......... keyboard + touch -> abstract actions (edge-detected jump)
  physics.js ....... AABB test, swept move-and-collide, gravity constants
  camera.js ........ smooth follow, look-ahead, deadzone, screen shake, bounds
  entities.js ...... Solid, Box, Spikes, Gate, PressurePlate, Lever, MovingPlatform,
                     Checkpoint, Light, StoryProp, Goal  (each system modular)
  player.js ........ the ashen figure: movement, jump, crouch, grab/push/pull, ledge climb
  renderer.js ...... atmosphere: sky+moon, parallax mountains, fog bands, silhouettes,
                     additive lights, ash particles, vignette
  game.js .......... state machine (title/play/dead/complete), world assembly,
                     death/checkpoint/goal logic, HUD wiring
  levels/chapter1.js  data-driven level definition (pure data + a build function)

SEPARATION (per spec section 30)
  gameplay/loop ....... main.js, game.js
  player .............. player.js
  physics ............. physics.js
  interaction/puzzles . entities.js (boxes, plates, gates, levers)
  hazards ............. entities.js (Spikes) + game.js death checks
  checkpoints ......... entities.js (Checkpoint) + game.js respawn
  levels .............. levels/*.js
  camera .............. camera.js
  visuals ............. renderer.js
  story ............... entities.js (StoryProp) + renderer story pass
  ui .................. index.html + styles.css + game.js ui wiring

COLLISION MODEL
- Static geometry, closed gates, moving platforms, and crates are all "solids".
- Player resolves X then Y against the solid list (stable platforming, no tunneling at 120 Hz).
- Crates: gravity + rest; move horizontally only when the player grabs and pushes/pulls them.
- Moving platforms carry the rider by adding their per-frame delta to the player.

TO ADD A NEW LEVEL
- Create levels/chapterN.js exporting a build function returning the same world shape.
- Point game.js _load() at it (later: a level manager + chapter select).

TO ADD A NEW MECHANIC
- Add an entity class in entities.js, include it in the world facade + solids() if solid,
  update it in game.js update(), and draw it in renderer.js. Keep classes small.
