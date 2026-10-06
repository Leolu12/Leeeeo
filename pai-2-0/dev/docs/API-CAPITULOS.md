# PAI 2.0 — Chapter API (3D first-person edition) — source of truth: js/engine/director.js, ui.js, stage3d.js

## File & registration
`js/chapters/<id>.js` (ids: prologo, cap1 … cap11, epilogo; ?part=N começa em 0), classic script wrapped in an IIFE:
```js
(function () {
  'use strict';
  const P2 = window.P2;
  const BY = { /* chapter-local data */ };
  P2.chapter({
    id: 'cap3', num: 'Capítulo 3', title: 'O Contrato de 80 Páginas',
    subtitle: 'Uma frase curta que dá vontade de jogar', music: 'misterio', minutes: 8,
    parts: [ async (G) => { /* part 1 */ }, async (G) => { /* part 2 */ } ],
    summary: (G) => ['Citações conferidas: 5 de 5', '…'],   // 2–4 short lines for the "Capítulo concluído" card
  });
})();
```
**Parts = checkpoints.** Before each part the engine clears actors/HUD/hotspots/fx, stops looping sfx, sets the camera
to FIRST PERSON and the screen to BLACK. Every part must: `G.scene(id, params)` → place actors → (music) → `await G.fadeIn()`.
The first part starts with `await G.titleCard()` (shown over black). Cross-part state: `G.v` (persisted object) / `G.stats()`.
Never wrap G calls in try/catch (leaving a chapter aborts via a rejected promise).

## Stage
- `G.scene(id, params)` · `G.sceneParams(partial)` · `await G.sceneFade(id, params, dur)`. Env ids: quarto, cozinha, sala,
  mesa_cafe, escritorio, sala_reuniao, carro, arena, aula, titulo, void. READ the header comment of js/art3d/env-*.js
  for params, spots and shots of each (exact names!).
- Actors: `G.pai` (the player's body), `G.filho`, `G.faisca`, `G.chefe` (Dona Marta), `G.jorge`, `G.golpista`, `G.duvida`,
  and directors via `G.actor('bia')`, `G.actor('rafael')`, `G.actor('luana')`, `G.actor('tadeu')` (seeded NPCs).
  Accessing creates the actor (visible). `G.has('jorge')`, `G.jorge.remove()`, `G.clearActors()`.
- Actor methods: `at(spotName | {x,z,rot})` (also snaps the FP view to the spot's rot for G.pai) · `face('camera' | actor |
  spotName | {x,z} | radians)` · `setAnim(name)` · `setExpr(name)` · `set({anim, expr, props, scale, alpha, visible, y, rot})`
  · `await walk(spot, speed)` · `await jump(h)` · `await play(anim, secs)` (temporary) · `emote(type, secs)` (types: '!', '?',
  '...', heart, sweat, angry, idea, zzz, note, star, check, x) · `show() / hide()` · `await fadeIn(d) / fadeOut(d)` ·
  `follow(G.pai)` / `unfollow()` · `await tween({x, z, y, rot, scale, alpha}, secs, ease)` · `lookAt(actor | null)` (head turn) ·
  props: `set({props: {phone: true, mug: true, papers: true, tablet: true, pen: true}})`.
- Human anims: idle, talk(auto while talking), walk, sit, sittalk, type, phone, sitphone, lookphone, showphone, think,
  sitthink, cheer, clap, sleep, coffee, point, shrug, facepalm, stretch, wave, arms, laugh, sad, scared.
  Exprs: neutro, feliz, rindo, orgulhoso, cansado, preocupado, bravo, surpreso, assustado, triste, pensativo,
  desconfiado, sem_graca, empolgado, impaciente, amigavel, determinado.
- Faísca anims: idle, walk, jump, spin, type, doubt, scared, sad, ashamed, sleep, celebrate, enter, teach, listen,
  wave, point, think. Dúvida anims: idle, talk, attack, hurt, heal, defeated, small; exprs bravo, rindo, surpreso, amigavel.
  Golpista: idle (+ fadeIn/fadeOut, smoke via `G.fx.smoke(actor)`).

## First person & camera
- Default: **first person** (`G.player.fp()`), camera at the father's eyes; his body is invisible. `G.pai.at('mesa')`
  + `G.pai.setAnim('sit'|'type')` sits him (eye height drops); `G.pai.setAnim('sleep')` at the bed spot = lying view.
- `await G.player.walkTo(spot)` — scripted walk, camera follows. `G.player.lookAt('filho' | actor | spot | {x,y,z})`.
- When someone else speaks (`G.say`), the view turns to them automatically. Disable with `G.talkCam(false)`.
- `await G.explore({ objetivo, hotspots })` — free walking (WASD/arrows/joystick/drag-to-look/click-floor/"Ir até lá ▶").
  Hotspot: `{ id, label, icon, actor: 'filho' | at: 'spot' | pos: {x, y, z}, radius: 1.6, optional: true,
  onInteract: async (G) => { … } }`. Returns the id of the required (non-optional) hotspot chosen. Optional ones run
  onInteract and exploration continues (removed after use unless `once:false`). Keep explorations short and purposeful.
- Cinematic (third person, the father visible): `G.player.cine()`, then `await G.cam.shot('geral' | {target:[x,y,z], yaw,
  pitch, dist, fov}, dur)`, `await G.cam.focus(actor, 'close'|'medio'|'plano'|'geral', {yaw, angle, side, pitch, zoom,
  dur})`, `await G.cam.two(a, b, opts)`, `G.cam.reset()`. Return with `G.player.fp()`.
- Effects: `G.flash(color, d)`, `G.shake(mag, d)`, `G.tint(color|null, alpha)`, `await G.letterbox(true|false)`,
  `await G.rewind(secs)`, `await G.zoom(scale, d)` (cine), `await G.fadeOut(d, color)`, `await G.fadeIn(d)`, `await G.wait(s)`.
- Particles: `G.fx.confetti(actor|'id'|x,y,z)`, `G.fx.sparkles(actor)`, `G.fx.hearts(actor)`, `G.fx.burst(actor, ..., color)`,
  `G.fx.float(actor, '+25 MIN', '#ffe066')`, `G.fx.smoke(actor)`.
- Audio: `G.music(name|null)` (titulo, manha, trabalho, misterio, casa, aula, tensao, sonho, chefao, final),
  `G.sfx(name)`, `const h = G.sfx('phone_ring', {loop:true}); h && h.stop()`, `G.stopSfx()`.

## Dialogue, choices, chat, cards
- `await G.say(who, text, {expr, anim, emote, auto, cam:false})` — who: 'pai' | 'filho' | 'faisca' | 'chefe' | 'jorge' |
  'golpista' | 'duvida' | 'bia' | 'rafael' | 'luana' | 'tadeu' | 'narrador' | `{name, color, voice, actor}`.
  `await G.narrate(text)`, `await G.think('pai', text)`.
- `const v = await G.choose([{text, value, sub, disabled}…], {prompt, who})` (max 4).
- `await G.aiChat([{from:'voce'|'ia'|'nota', text, thinking}], {title, thinking})` — chat window (Faísca types).
- `await G.cutscene(async () => { … })` — skippable storytelling block (no choices/minigames/explore inside).
- `await G.titleCard({kicker, title, sub})`, `await G.fact('key' | ['k1','k2'], {titulo})` (keys from js/content/fontes.js
  ONLY — read its header list), `await G.lesson(texto, {titulo})`, `await G.card({kind:'info'|'warn'|'ok'|'guide'|'lesson',
  kicker, icon, titulo, texto, html, node, botao, botoes:[{label, value, primary}]})`, `G.toast(text, {icon, kind:'notif'|
  'email'|'warn'|'money'|'ok', dur})`, `G.achieve(id)`.
- HUD: `G.hud.set({clock:'09:00', rep:{value, max, label}, hearts:{value, max, label}, boss:{name, hp, max},
  score:{label, value}, meter:{label, value}, objetivo:{text, go}})`, `G.hud.clear()`.
- Text markup: `*bold*`, `\n`, lines starting with "- " become bullets. Tokens: see BRIEFS-CEO §G.

## Minigames
`const r = await G.mini((root, done, api) => { … done(result) }, {title, size:'m'|'l', intro, introWho})` —
api: `el(tag, cls, content)`, `btn(label, fn, {cls, key})`, `stars(n, max)`, `meter(v, label)` (`.set(v)`), `shuffle(arr)`,
`sfx(n)`, `say(text, who)`, `timeout(fn, ms)`, `interval(fn, ms)`, `chat(container)` → `{add(from, text, {instant}) → {tw},
dots(), scroll()}`, `typewriter`, `rich(text)`, `t(str)` (apply tokens to your own DOM strings), `G`.
Use the shared `mg-*` classes (SPEC §11: mg-row, mg-col, mg-cols, mg-grid, mg-actions, mg-card(.on/.ok/.bad/.dim),
mg-chip, mg-line, mg-zone(.target)+mg-zone-title, mg-doc, mg-prompt(.slot.ctx/.task/.fmt/.empty), mg-phone(.inner),
mg-feedback(.ok/.bad/.info/.warn), mg-badge(.mint/.red/.blue), mg-title, mg-label, mg-small, mg-hint). Extra CSS only via
`P2.ui.css('cap3', css)`. Big touch targets, keyboard shortcuts (data-key via `api.btn(..., {key:'1'})`), works at 390 px
wide, no drag-only interactions (tap-to-select then tap-target), no timers that pressure the player. Call done() once.
`G.overlay(build, {cls})` = same but full screen (epilogue screens).

## State
`G.profile` ({pai, apelido, filho, genero, skin, empresa, setor, recado}), `G.isFilha`, `G.P` (P2.CEO data),
`G.v`, `G.stats(obj)`, `G.allStats()`, `G.flag(name, value?)`, `G.shuffle(arr)`, `G.pick(arr)`, `G.t(str)`.

## Testing
`file:///home/user/Leeeeo/pai-2-0/index.html?cap=<id>&speed=instantanea` (+ `&part=N`, `&genero=filha`,
`&empresa=Andrade%20Alimentos&setor=distribui%C3%A7%C3%A3o`). Headless Chromium needs WebGL flags:
`chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']})`.
Autoplay: `node scratchpad/tools/autoplay.js <id> x [--mobile] [--filha] [--pick=random] [--shots=DIR] [--dump]`
(explorations are completed by clicking the objective's "Ir até lá ▶" button / hotspot labels — make sure every
exploration has at least one required hotspot). Write your own targeted Playwright driver for minigame right/wrong
paths and check `P2.save.data.progress.stats.<id>`. Look at screenshots (desktop 1366×768 and mobile 390×844).
