export const meta = {
  name: 'pai20-capitulos-v2',
  description: 'PAI 2.0 (CEO, 3D primeira pessoa): escrever capítulos novos e finalizar os interrompidos, com revisão dura embutida',
  phases: [
    { title: 'Capítulos', detail: 'escrever (novos) ou finalizar + revisar (interrompidos)' },
    { title: 'Revisão', detail: 'diretor de narrativa + QA independente (capítulos novos)' },
  ],
}

const S = '/tmp/claude-0/-home-user-Leeeeo/7293cc00-7428-51ca-a23f-ac6d06631493/scratchpad'
const GAME = '/home/user/Leeeeo/pai-2-0'

const CH = {
  cap1: 'CAP 1 — "A Arte de Pedir"',
  cap2: 'CAP 2 — "O Expediente"',
  cap3: 'CAP 3 — "O Contrato de 80 Páginas"',
  cap4: 'CAP 4 — "Detector de Lorota"',
  cap5: 'CAP 5 — "A Reunião Infinita"',
  cap6: 'CAP 6 — "Números na Mesa"',
  cap7: 'CAP 7 — "O Conselheiro de Bolso"',
  cap8: 'CAP 8 — "Coisas da Casa"',
  cap9: 'CAP 9 — "Aprender Qualquer Coisa"',
  cap10: 'CAP 10 — "A Ligação"',
  cap11: 'CAP 11 — "A Dúvida"',
  epilogo: 'EPÍLOGO — "Pai 2.0"',
}

const READ = (id) => `READ (be economical with context — read what you need, grep the rest):
- ${S}/BRIEFS-CEO.md: sections A–G (design bible, persuasion principles, honesty & safety rules, staging, stats, tokens) + your brief in section H: "${CH[id]}". Also skim the neighbouring chapters' briefs for continuity.
- ${S}/API-CAPITULOS.md (the chapter API). For exact behaviour, GREP the engine (${GAME}/js/engine/director.js, ui.js, stage3d.js) instead of reading it whole.
- ${GAME}/js/chapters/prologo.js — the lead's finished prologue: the reference for voice, pacing and API usage. Continuity it establishes: the father's three rules "Eu confiro. Eu decido. Eu assino."; G.flag('aposta') (bet: the child washes dishes for a month if AI is useless); G.v.ceticismo ('modinha' | 'inventou' | 'caneta'); Faísca's motto; he showed only e-mail SUBJECTS (data minimisation); 47 e-mails, relatório do conselho até 10h (Dona Marta), contrato de 80 páginas (Tadeu, jurídico), reunião de diretoria 14h, conta de luz R$ 412, grupo Empresários do Bairro (Jorge).
- Only the header comments of the env files you use (sed -n 1,60p ${GAME}/js/art3d/env-*.js) for exact params/spots/shots; ${GAME}/js/art3d/chars.js header for actors.
- ${GAME}/js/content/fontes.js lines 1–215 (the key list — use ONLY these keys in G.fact; G.fact silently skips unknown keys, so verify each key you use exists); ${GAME}/js/content/guia-dados.js: your chapter's section(s) (grep "cap: '${id}'") — keep the chapter consistent with the Guia do CEO and point to it naturally ("está no seu Guia do CEO, botão 📘"); ${GAME}/js/content/achievements.js; ${GAME}/js/content/ceo.js.
- ${S}/research/*.json: grep for the topics of your chapter for authentic detail (do not read them whole).
- ${S}/fontes_build/ is NOT for you. Ignore 2D/pixel-art sections of older docs (SPEC.md §3–5).
Other agents work in parallel on other chapters, on art (env-*.js, chars.js, rig.js — spot/shot names are stable) and audio. If an art file is briefly broken, wait a minute and retry.`

const QUALITY = `QUALITY BAR (judge yourself harshly with these lenses before you finish, then fix):
(a) the skeptical CEO father (55+) himself — convinced, or does it feel patronizing, salesy, exaggerated, slow, confusing? His expertise must be respected; invite, never command.
(b) persuasion science (bible B) — open with his concrete pain; the AI drafts and HE corrects/approves (red pen); every limitation comes with its antidote; skepticism becomes method; honest social proof; clear conclusion.
(c) honesty & safety (bible C) — never "AI doesn't err"; never passwords/documents/SMS codes/personal data into AI; AI doesn't replace doctor/lawyer/technical responsibility; decisions about people never delegated to AI; numbers ONLY via G.fact keys that exist (game-internal estimates must be labelled "estimativa do jogo").
(d) Brazilian Portuguese editor — natural, vivid, short lines, no tech jargon, warm humor, no typos, child-gender tokens wherever the child is referred to ({filho} name, and the gendered tokens from bible G).
(e) 3D/UX director — first-person staging: short purposeful G.explore (1–3 per chapter, each with a required hotspot), people facing the player, auto-look on speakers, 1–3 cinematic third-person shots for key moments, nothing clipping, actors not inside furniture, camera not inside walls; minigames readable at 390 px wide, big targets, keyboard shortcuts, immediate WHY feedback, no time pressure.
(f) continuity with the bible timeline and threads, with the prologue, and with the Guia do CEO.
Length: the brief's minutes at a 55+ reader's pace (~7–9 lines/min + minigames). Rich, not padded.`

const TEST = (id, dir) => `TESTING (mandatory): node ${S}/tools/autoplay.js ${id} x --dump --shots=${dir}/shots (also with --filha, --mobile, --pick=random) until it reaches "Capítulo concluído" (epilogue: returns to the title) with ZERO errors. The tool already uses low render quality (q=low) so it runs fast; if the machine is busy, be patient. Write a targeted Playwright driver (WebGL flags in API-CAPITULOS.md; add &q=low to the URL) for your minigames' right AND wrong paths and assert P2.save.data.progress.stats.${id}. Screenshot every minigame and the key 3D moments on desktop 1366×768 and mobile 390×844 (for beauty shots drop &q=low) and LOOK at them (Read the PNGs); fix anything ugly, cramped or mispositioned. Read your --dump text back once and polish it.`

const RULES = (id) => `CONSTRAINTS: only create/modify ${GAME}/js/chapters/${id}.js (+ files in ${S}/ch3d-${id}/). Never edit engine/art/css/content/main or other chapters; if you find an engine bug or missing feature, work around it in your file and report it precisely in engineIssues. No git.`

const REPORT = {
  type: 'object',
  properties: {
    file: { type: 'string' },
    estMinutes: { type: 'number' },
    dialogueLines: { type: 'number' },
    parts: { type: 'number' },
    factsUsed: { type: 'array', items: { type: 'string' } },
    achievements: { type: 'array', items: { type: 'string' } },
    statsKeys: { type: 'string' },
    envsSpotsUsed: { type: 'string' },
    engineIssues: { type: 'array', items: { type: 'string' }, description: 'engine bugs/missing features (minimal repro) + your workaround' },
    testSummary: { type: 'string' },
    notes: { type: 'string', description: 'what you changed in the self-review / remaining concerns' },
  },
  required: ['file', 'estMinutes', 'dialogueLines', 'parts', 'factsUsed', 'achievements', 'statsKeys', 'envsSpotsUsed', 'engineIssues', 'testSummary'],
}

const writePrompt = (id) => `You are a senior narrative designer AND gameplay programmer on "PAI 2.0" (CEO edition): a professional first-person 3D narrative game in Brazilian Portuguese, a gift from a son/daughter to their father, a skeptical Brazilian CEO (55+), to genuinely convince him to use generative AI and teach him the best, safe ways a CEO can use it.

${READ(id)}

YOUR TASK: write ${GAME}/js/chapters/${id}.js — ${CH[id]} — following the brief closely and making it EXCELLENT. Split into parts at scene breaks (each part: G.scene → place actors → music → await G.fadeIn()). First part starts with await G.titleCard(). Close with the "Fato real" card(s) then the lesson card. Provide summary(G). Minigames: polished "work-desk" UIs with mg-* classes. Write stats exactly as bible F says and award your achievements.
(If ${GAME}/js/chapters/${id}.js already exists from an interrupted earlier attempt, read it first and decide whether to continue from it or rewrite it.)

${QUALITY}

${TEST(id, `${S}/ch3d-${id}`)}

When the chapter works, do ONE explicit harsh self-review pass with the lenses above (as a separate narrative director would), fix what you find, and re-run the tests.

${RULES(id)}
Return the structured report.`

const finishPrompt = (id) => `You are the NARRATIVE DIRECTOR + QA LEAD on "PAI 2.0" (CEO edition): a professional first-person 3D narrative game in Brazilian Portuguese, a gift from a son/daughter to their father, a skeptical Brazilian CEO (55+), to genuinely convince him to use generative AI and teach him the best, safe ways a CEO can use it.

${GAME}/js/chapters/${id}.js — ${CH[id]} — was written by a writer who was interrupted by a usage limit while testing it. It may be complete or may have loose ends.

${READ(id)}

YOUR TASK:
1) Read the chapter file fully and compare it with its brief. Finish anything missing.
2) PLAY IT: ${TEST(id, `${S}/ch3d-${id}-fin`)}
3) Do a harsh, independent review with the lenses below, then FIX everything you find directly in the chapter file and re-run all tests until clean.

${QUALITY}

${RULES(id)}
Return the structured report (notes: what you changed and any remaining concerns).`

const reviewPrompt = (id, rep) => `You are the NARRATIVE DIRECTOR + QA LEAD doing an INDEPENDENT second pass on ${GAME}/js/chapters/${id}.js — ${CH[id]} — of "PAI 2.0" (CEO edition, first-person 3D, Brazilian Portuguese, a gift to a skeptical Brazilian CEO 55+, to genuinely convince him to use AI well and safely).

${READ(id)}

The writer's report:
${JSON.stringify(rep)}

1) PLAY IT: ${TEST(id, `${S}/ch3d-${id}-rev`)}
2) JUDGE it harshly and independently (do not trust the writer's self-assessment):
${QUALITY}
3) FIX everything you find directly in the chapter file and re-run all tests until clean.

${RULES(id)}
Return the structured report (notes: what you changed and any remaining concerns).`

const ORDER = ['prologo', 'cap1', 'cap2', 'cap3', 'cap4', 'cap5', 'cap6', 'cap7', 'cap8', 'cap9', 'cap10', 'cap11', 'epilogo']
const deepPrompt = (id) => {
  const i = ORDER.indexOf(id), prev = ORDER[i - 1], next = ORDER[i + 1]
  return `You are the NARRATIVE DIRECTOR + QA LEAD doing the FULL, CAREFUL final pass on ${GAME}/js/chapters/${id}.js — ${CH[id]} — of "PAI 2.0" (CEO edition): a professional first-person 3D narrative game in Brazilian Portuguese, a gift from a son/daughter to their father, a skeptical Brazilian CEO (55+), to genuinely convince him to use generative AI and teach him the best, safe ways a CEO can use it.

State: the chapter is written and plays end to end; it already had a quick critical review (honesty/safety/child gender/pt-BR) and a partial staging pass (interrupted). Nobody has yet done a full director pass with real attention to pacing, staging and persuasion. That is your job. Take your time and do it well (about an hour), but don't waste effort re-reading files.

${READ(id)}
Continuity: read the LAST part of ${prev ? GAME + '/js/chapters/' + prev + '.js' : '(none)'} and the FIRST part of ${next ? GAME + '/js/chapters/' + next + '.js' : '(none)'} so the hand-offs (time of day, place, who is present, what was promised) match. Do not edit those files; if a hand-off needs a change on their side, report it in notes.
Art agents are polishing env-*.js / chars.js / rig.js in parallel (spot and shot names stay stable; an art file may be briefly mid-edit — if a test fails inside an art file, wait a minute and retry).

YOUR TASK:
1) PLAY IT: ${TEST(id, `${S}/ch3d-${id}-deep`)}
   Also play it with --filha --mobile --pick=random. (The autoplay tool already tolerates the moment when the father arrives at a hotspot and the "Ir até lá" button disappears.)
2) Read the --dump text from start to end as the father would, then JUDGE harshly with the lenses below. Pay special attention to: pacing (cut padding, keep it rich), whether each persuasion beat lands, Faísca's charm without sycophancy, the father's ironic warm voice, minigame clarity and feedback, every number backed by a G.fact card shown near the claim, the child-gender tokens, and 3D staging (people facing the player, nobody inside furniture or off-screen while speaking, cinematic shots framing the right people, nothing clipping on 390 px mobile).
3) FIX everything directly in the chapter file; re-run the tests (desktop filho + mobile filha) until both end with "ok": true.

${QUALITY}

${RULES(id)}
Return the structured report (notes: what you changed, hand-off issues for neighbouring chapters, remaining concerns).`
}
const items = (Array.isArray(args) ? args : []).filter((it) => it && CH[it.id])
log('Capítulos: ' + items.map((it) => it.id + '(' + it.mode + ')').join(', '))
const results = await pipeline(
  items,
  (it) => agent(it.mode === 'deep' ? deepPrompt(it.id) : it.mode === 'finish' ? finishPrompt(it.id) : writePrompt(it.id), {
    label: (it.mode === 'deep' ? 'revisar:' : it.mode === 'finish' ? 'finalizar:' : 'escrever:') + it.id,
    phase: 'Capítulos',
    schema: REPORT,
  }),
  (rep, it) => (rep && it.mode === 'write'
    ? agent(reviewPrompt(it.id, rep), { label: 'revisar:' + it.id, phase: 'Revisão', schema: REPORT }).then((r) => r || rep)
    : rep),
)
return items.map((it, i) => ({ id: it.id, mode: it.mode, report: results[i] }))
