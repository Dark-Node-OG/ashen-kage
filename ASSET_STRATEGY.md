ASHEN KAGE — ASSET STRATEGY
===========================

RULE (per spec section 24 & 25)
Do NOT download a big asset library. Prove the gameplay first with simple geometry
and procedural silhouettes. Only bring in an external asset when a specific need is proven.

CURRENT (prototype): ZERO external assets.
- Everything is drawn procedurally on Canvas: player, crates, spikes, gates, mountains,
  fog, moon, ash, lanterns, and story silhouettes. This keeps the build tiny and fast.

WHEN WE DO ADD ASSETS
- First candidates are audio, not art: wind loop, footsteps, wood creak, water, temple bell.
- Art stays silhouette-first. If we add art it will be simple 2D shapes/sprites that read
  as pure black against fog. No high-poly, no big textures (spec sections 28-29).
- Any character upgrade must still read in silhouette (spec section 25).

CHARACTER PLAN
- Now: procedural cloaked silhouette (head + cloak + stride + faint sword line).
- Later option: a small hand-made 2D sprite sheet OR a simple Blender-rendered silhouette,
  chosen only if the procedural figure limits animation quality.

REUSE
- Existing Dark Node assets may be reused only if they fit the ashen silhouette style.
- Never add an asset just because it looks impressive. Every asset must serve the game.

LICENSING
- Any external asset must be appropriately licensed and credited before shipping.
