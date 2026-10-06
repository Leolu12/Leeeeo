# PAI 2.0 — 3D art contract (environments & characters)

Game folder: `/home/user/Leeeeo/pai-2-0/` · scratchpad: `/tmp/claude-0/-home-user-Leeeeo/7293cc00-7428-51ca-a23f-ac6d06631493/scratchpad/`

PAI 2.0 is a professional 3D narrative game (Brazilian Portuguese) for a skeptical Brazilian CEO (50s–60s): one day of
his life with an AI assistant ("Faísca", a cute coral-orange cube creature). Visual target: **polished stylized 3D
"diorama" look** — think premium mobile narrative games / Pixar-ish toy style: soft rounded shapes, warm believable
lighting, cohesive palettes, lots of tasteful detail, NOT programmer art. It runs in browsers (desktop + phones).

## Tech (hard rules)
- Three.js **r149 UMD** (`js/lib/three.min.js`, global `THREE`) + our helpers `P2.m3d` (`js/engine/m3d.js` — READ IT:
  `mat(color, {rough, metal, emissive, emissiveIntensity, opacity, side})` cached materials, `basic`, `glass`,
  `roundedBoxGeo`, `rbox/box/sphere/capsule/cyl/torus/plane/cone(…, {parent,pos,rot,scale,cast,receive})`, `group`,
  `canvasTex(w,h,draw)`, `textPanel(w,h,{text,color,bg,size,draw})` (with `.userData.setText`), `skyDome`, `skylineTex`,
  `lighting(preset)` → {group, hemi, sun, amb, set(preset)} presets manha|dia|tarde|noite|sonho|alerta, `lampLight`,
  `glow(color,size,opacity)` additive sprite, `rng(seed)`, `ease`.)
- Classic scripts only (no ES modules, no imports, no fetch, no external files/textures/models — everything procedural,
  textures drawn on canvas). Must work from `file://`. Wrap files in an IIFE using `window.P2`.
- Units: meters. Y up. Floor at y = 0. Characters face +Z when rot = 0. Humans ~1.7 m; seats ~0.46 m high; desks ~0.75 m;
  beds top ~0.5 m (the `sleep` pose lifts the body to ~0.62 m).
- Performance budget per environment: ≤ ~250 meshes, reuse geometries/materials (the helpers cache them), shadows only
  from the one directional light in `M.lighting` (plus ≤ 2 PointLights without shadows). Static decor can use
  `receive` shadows only. Target 60 fps on a mid phone.
- Deterministic: no Math.random() — use `M.rng(seed)`.

## Environment contract — `P2.envs.<id> = { name, build(params) }`
`build(params)` returns:
```js
{
  root,                      // THREE.Group with EVERYTHING (lights too: const L = M.lighting('dia'); root.add(L.group))
  spots: { nome: {x, z, rot, y?} },   // where actors stand/sit. rot = facing angle (radians; 0 faces +Z)
  shots: { nome: {target:[x,y,z], yaw, pitch, dist, fov} },  // camera presets. yaw = azimuth of the CAMERA around
                             // target (0 → camera on +Z side looking toward -Z), pitch radians up, dist meters, fov deg
  defaultShot: 'geral',
  walls: [ {obj, px, pz, normal:[nx,0,nz]} ],   // "dollhouse": each wall group + a point on it + normal pointing INTO
                             // the room; the engine hides a wall when the camera is behind it, so the player can orbit 360°.
  background: '#hex',        // clear color seen around the diorama (or add M.skyDome to root)
  fog: {color, near, far} | null,
  setParams(params),         // live changes (time of day, screen content, papers, alert…) — must be idempotent
  update(t, params, dt),     // subtle animation (steam, screens, clouds, blinking lights) — cheap!
  dispose()                  // optional
}
```
Design rules:
- The space is a **diorama**: a room (or set) the camera can orbit 360° around. Walls must be hideable via `walls`
  (put each wall and everything attached to it — windows, shelves, frames — in its own group). Floors extend a bit beyond
  walls; finish the outer edges nicely (a base/plinth under the diorama looks great).
- Provide spots for every place a chapter may need (document them in the file header): entry/door, center, positions
  for 2–4 standing people, chairs (seated positions: the actor's root goes at the chair center; with anim 'sit'/'type'
  the hips drop 0.4 m and thighs go forward 0.4 m toward +Z of the actor — so the desk edge must be ~0.45–0.55 m in front
  of the chair spot), and the floating companion spot (Faísca usually follows the father at shoulder height, so keep
  ~0.5 m free to his right).
- Provide shots: 'geral' (establishing, whole room readable), plus 3–6 useful ones (e.g. 'mesa' over the desk,
  'janela', 'porta', 'close_mesa', a dramatic low angle…). The game also frames actors automatically.
- Readability: keep the area behind where people stand relatively calm; strong silhouettes; warm key light + cool fill.
- Screens (laptops, monitors, TVs, whiteboards) use canvas textures and `params` so chapters can change what they show.

## Environments to build (ids and params)
- **quarto** — CEO's bedroom at 6h47, predawn blue light with a warm lamp: bed (spot `cama` for the lying father: actor at
  bed center, rot so head lies toward the headboard — document exact values), nightstand with a digital alarm clock
  showing `params.clock` (default '06:47', blinks red when `params.alarm`), phone on the nightstand that lights when
  `params.phoneLit`, window with dawn gradient, wardrobe, rug, slippers. spots: cama, lado_cama, porta, centro.
- **cozinha** — warm modern Brazilian kitchen. `params.time` 'manha' (sunny) | 'noite'. Coffee machine with steam,
  island/table with 2–4 stools/chairs (seated spots), fridge with magnets, window. spots: mesa1, mesa2, cafe, geladeira,
  porta, centro.
- **sala** — living room at night: sofa (2 seated spots), TV (`params.tv` 'off'|'on'|'jornal'), floor lamp (amber glow:
  the signature cozy look), coffee table, bookshelf, plants, window with night city. `params.alert` true → pulsing red
  emergency mood (scam call). spots: sofa1, sofa2, tv, abajur, porta, centro.
- **mesa_cafe** — next-morning breakfast on a sunny balcony/terrace with plants and the city: table with coffee, bread,
  fruit; 3 seats. Hopeful, golden light. spots: pai, filho, faisca, centro.
- **escritorio** — the CEO's office in a high-rise: big wooden desk with laptop + monitor (`params.screen` 'off'|'on'|
  'chat' (chat UI with an orange assistant dot)|'doc' (a document page)|'planilha' (spreadsheet)), executive chair (spot
  `mesa` = seated at desk), 2 guest chairs facing the desk, small sofa corner, bookshelf, awards, plant, wall TV for
  presentations (`params.tv` text lines), floor-to-ceiling windows with skyline (`params.time` 'dia'|'tarde' (gorgeous
  sunset)|'noite'), stack of papers on desk whose height = `params.papers` 0..1 (1 = comically tall pile, 0 = clean).
  spots: mesa, visita1, visita2, porta, janela, sofa, centro.
- **sala_reuniao** — boardroom: long table with 8 chairs (seated spots c1…c8 + `cabeceira`), wall screen with
  `params.slide` (title + lines), glass wall to the corridor, city view, wall clock showing `params.clock` (default '14:00'),
  `params.chaos` 0..1 adds coffee cups, papers and sticky notes (meeting dragging on). spots: c1..c8, cabeceira, tela, porta, centro.
- **carro** — back seat of an executive car moving through São Paulo: seat with the father (spot `banco`), driver
  silhouette in front (no face needed), windows with an animated city passing by (canvas texture scrolling in `update`),
  phone holder. `params.time` 'dia'|'tarde'. spots: banco, banco2, centro.
- **arena** — the dream boss arena: floating rock island with grass/crystals on the left half (heroes at spot `pai`
  x≈-2.5), the giant boss space on the right (`boss` x≈+2.5, z≈-1), purple/indigo cosmic sky with stars, floating
  debris/rocks, aurora. `params.calm` 0..1 → shifts to a peaceful dawn (lavender/peach) after victory;
  `params.intensity` 0..1 → storm (lightning flashes via update). spots: pai, faisca, boss, centro.
- **aula** — a cozy imagined classroom/study at night: chalkboard showing `params.lines` (array of up to 4 short strings,
  chalk style), teacher desk, globe, `params.tema` 'violao' (guitar on a stand) | 'ingles' (a world map / ABC poster) |
  'negocios' (a flip chart). spots: quadro, mesa, aluno, centro.
- **titulo** — title screen diorama: the CEO's high-rise office (or a stylized building + house) at dusk with city
  lights, very beautiful, gentle animated details (lights turning on, a slow plane, clouds). The engine slowly orbits the
  camera around `shots.geral.target`. Keep the upper-middle area of the frame calm for the DOM logo. spots: centro, faisca.
- **void** — elegant abstract space for transitions/fact cards: soft gradient, floating glowing particles/shapes;
  `params.color` tint. spots: centro.

## Characters (`js/art3d/chars.js`, built on `P2.rig.human` in `js/engine/rig.js`)
Already working: pai (CEO: navy blazer, light-blue shirt, gray receding hair, mustache, glasses, slight belly), filho /
filha (`opts.genero`), chefe (board chair "Dona Marta": wine blazer, gray bun, glasses), jorge (sales director: bald top,
loud yellow patterned shirt, belly), golpista (hooded shadow, red eyes, smoke), npc (seeded variety for meetings),
faisca (floater), duvida (boss + `small` form). Poses in `P2.rig.POSES`; expressions in `P2.rig.EXPRS`.
Controller contract: `{root, height, headY, kind:'human'|'floater'|'boss', update(dt, actor), dispose()}` where actor has
`anim, animT, t, expr, talking, blink, walkT, props, alpha, look, lookYaw`.

## Test harness
`scratchpad/t3d/test.html` + `shot.js` show how to boot the engine without the UI (P2.core.init(wrap); setScene; actors;
cam.shot) and screenshot with Playwright (`--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`; allow
~2.5 s for the first frame). `scratchpad/tools/montage.js out.png cols a.png b.png …` builds contact sheets. Read the PNGs
to judge your work — iterate until it looks like a polished commercial game.

## ⚠️ UPDATE (mandatory, overrides earlier text): THE GAME IS NOW FIRST-PERSON
The client decided the player **walks in first person** (the player IS the father, eye height ~1.62 m standing,
~1.2 m seated), exploring each environment freely, plus some third-person cinematic shots in cutscenes.
Every environment must therefore ALSO satisfy:
- **Ceilings**: every interior needs a ceiling (with recessed lights / lamps / beams — it will be seen when looking up).
  Add the ceiling group to `walls` too, with `normal: [0,-1,0]` and `py` = ceiling height (the engine now hides any
  wall/ceiling whose inner side faces away from the camera, using the full 3D normal: d = dot(cam - point, normal)),
  so third-person orbit shots from above still work. Wall entries may give `py` (default 1.4).
- **Eye-level quality**: the player will walk up close to everything. Furniture, props, screens, windows, frames and
  decor must look good at 0.5–1.5 m distance (no crude placeholders, no visible gaps, no z-fighting, textures not too
  blurry; canvas textures ≥ 512 px for things you can read). The view out of windows must look convincing at eye level
  (skyline/backdrop far enough and large enough to fill windows when looking through them).
- **Collisions**: return `colliders: [ {x, z, w, d, rot?} ]` — axis-aligned (or rotated by rot) rectangles on the floor
  for every solid thing the player must not walk through (walls, furniture, counters, beds, tables, plants), and
  `bounds: {minX, maxX, minZ, maxZ}` of the walkable floor. Leave clear walking paths (≥ 0.8 m) between doors, key spots
  and characters. Chairs where the father sits are interaction spots (not colliders blocking access to them).
- **Player start**: add `spots.inicio` (where the player appears, rot facing into the room) and make sure key spots
  (where characters stand) are reachable in straight-ish lines from inicio.
- **Interaction points**: add spots in front of interactable things the story will use (e.g. `cafe` in front of the
  coffee machine, `geladeira`, `janela`, `quadro`, `foto` (family photo), `notebook`/`mesa`, `tv`, `cama`), each with
  rot facing the object. Document them in the file header.
- Keep the third-person `shots` (used for cinematic cutscenes and the title screen) — they must also still look good.
