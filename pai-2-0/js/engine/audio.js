/* PAI 2.0 — audio.js
 * Trilha sonora e efeitos 100% sintetizados em WebAudio, no estilo
 * "cinemático / lo-fi, quente e premium": piano elétrico FM, pads quentes
 * (serras desafinadas + passa-baixa), kalimba, marimba, vibrafone, celesta,
 * cordas e metais sintéticos, sub-grave redondo, bateria macia (escovinha,
 * lo-fi, aro, shaker, taikos), reverb de convolução com resposta ao impulso
 * gerada em código, delay estéreo ping-pong e compressor + limitador no master.
 * Nenhum arquivo de áudio.
 *
 * API (SPEC §6)
 *   P2.audio.init()                        cria/retoma o AudioContext (chamar num gesto do usuário)
 *   P2.audio.setEnabled(bool)              liga/desliga tudo (desligado = nada é agendado)
 *   P2.audio.setVolumes({music, sfx})      0..1
 *   P2.audio.music(nome|null, {fade:0.8})  troca de faixa com crossfade; null = fade para silêncio
 *   P2.audio.sfx(nome, {pitch, vol, loop}) efeito avulso; pitch = multiplicador (1 = normal).
 *                                          Retorna {stop()} (útil com loop:true, ex. phone_ring) ou null.
 *   P2.audio.voice(quem)                   blip curtinho por personagem (limitado a 1 a cada 45 ms)
 *   P2.audio.duck(bool)                    abaixa a música (menu de pausa)
 *   P2.audio.stopSfx()                     para efeitos em loop
 *   P2.audio.current                       nome da faixa atual (ou null)
 * Antes de init() tudo é no-op seguro; music() chamado antes de init() fica
 * guardado e começa a tocar assim que init() acontecer.
 *
 * ---------------------------------------------------------------------------
 * NOTAÇÃO DAS TRILHAS (tracker em texto)
 *   Cada canal é uma string de compassos separados por '|'. Compasso = 4/4 =
 *   16 passos (1 passo = semicolcheia). Tokens separados por espaço:
 *       ITEM[!|?][:DUR]
 *   ITEM   notas:  C5, F#4, Bb3, ou várias  C5+E5
 *          acordes (canais pad/keys/arp e qualquer canal com mode 'pad'|'arp'):
 *                 C, Am, G7, Fmaj7, Dm9, Bbmaj7, A7sus4, Em7b5, Bdim7, Fmaj7#11,
 *                 Cadd9, Am11, E7b9, G/B (o baixo da barra fica a cargo do canal bass)
 *          drums: k bumbo   b coração   s caixa/escovinha   h chimbal   o chimbal aberto
 *                 c prato   t tom   g taiko   r aro (cross-stick)   x bloco de madeira
 *                 z shaker  p palma   n estalo de dedo   w "swish" de escovinha
 *                 v prato reverso (cresce durante a duração do evento)
 *                 simultâneos com '+':  k+c
 *          '.' pausa    '_' liga (prolonga a nota anterior)    '%' repete o compasso
 *   '!' acento (mais forte)   '?' nota fantasma (mais fraca)
 *   DUR    duração em passos (1 = semicolcheia, 2 = colcheia, 4 = semínima,
 *          16 = semibreve). Sem DUR usa o padrão do canal (`len`).
 *   A soma de cada compasso precisa dar 16 — _lib.validate() confere, e todos
 *   os canais de uma parte precisam ter o mesmo número de compassos.
 *   Canais: lead (melodia), counter (contracanto/celesta), pad (acordes longos),
 *   keys (acordes rítmicos), arp (arpejo), bass (sub-grave) e drums. Outros
 *   nomes valem se `ch.<nome>.like` apontar para um desses (ex.: ost → arp).
 *   Uma faixa = partes (A, B, …) + `form` (ordem em loop). `swing` (0..0.67)
 *   atrasa as colcheias do contratempo. `trim` (dB) normaliza a loudness da faixa
 *   (BS.1770 no loop inteiro, medida pela cadeia do jogo: todas ≈ −19 LUFS no volume
 *   padrão). Instrumento por canal: `inst`
 *   (ep, pad, strings, pluck, upright, kalimba, marimba, vibes, bell, glass,
 *   sub, brass, flute). Mixagem por canal (na faixa): vol, pan, rev (envio p/
 *   reverb), dly (envio p/ delay), lp/lpq/hp (filtros), lfo (no filtro), trem,
 *   autopan, wow (oscilação de afinação "fita"). Se uma parte troca o `inst`
 *   de um canal, os ajustes de timbre do canal na faixa são ignorados nela.
 * ---------------------------------------------------------------------------
 */
(function () {
  'use strict';
  const P2 = (window.P2 = window.P2 || {});

  // =====================================================================
  // 1. Teoria: notas, acordes, tokens
  // =====================================================================
  const NB = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const NOTE_RE = /^([A-G])(#|b)?(-?\d)$/;
  function noteMidi(s) {
    const m = NOTE_RE.exec(s);
    if (!m) return null;
    return NB[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (parseInt(m[3], 10) + 1) * 12;
  }
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // Intervalos (semitons a partir da fundamental)
  const CHORDS = {
    '': [0, 4, 7], m: [0, 3, 7], 5: [0, 7, 12], aug: [0, 4, 8], dim: [0, 3, 6],
    sus2: [0, 2, 7], sus4: [0, 5, 7], 6: [0, 4, 7, 9], m6: [0, 3, 7, 9],
    7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], mmaj7: [0, 3, 7, 11],
    dim7: [0, 3, 6, 9], m7b5: [0, 3, 6, 10], '7sus4': [0, 5, 7, 10],
    add9: [0, 4, 7, 14], madd9: [0, 3, 7, 14], 9: [0, 4, 7, 10, 14],
    maj9: [0, 4, 7, 11, 14], m9: [0, 3, 7, 10, 14], 'maj7#11': [0, 4, 7, 11, 18],
    m11: [0, 3, 7, 10, 14, 17], '7b9': [0, 4, 7, 10, 13],
  };
  const CHORD_RE = /^([A-G])(#|b)?([^/]*)(?:\/([A-G](?:#|b)?))?$/;
  function parseChord(s) {
    const m = CHORD_RE.exec(s);
    if (!m) return null;
    const iv = CHORDS[m[3]];
    if (!iv) return null;
    return { root: (NB[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12, iv: iv };
  }
  const TOK_RE = /^([^!?:]+)([!?])?(?::(\d+(?:\.\d+)?))?$/;
  const DRUM_KEYS = 'kbshoctgrxzpnwv';
  const STEPS = 16; // passos por compasso (4/4 em semicolcheias)

  // pseudoaleatório determinístico (humanização sem Math.random)
  function hsh(i) {
    let x = Math.imul((i | 0) + 0x9e3779b9, 2654435761) >>> 0;
    x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13;
    return (x >>> 0) / 4294967296;
  }

  // =====================================================================
  // 2. Instrumentos e canais
  // =====================================================================
  // Timbre padrão de cada instrumento (a/d/s/r: envelope; d = tempo de queda,
  // s = sustentação (fração do pico), gate = fração da duração soando,
  // ring = instrumentos percutidos soam até o fim da queda mesmo em notas curtas).
  const INST_P = {
    ep: { a: 0.004, d: 1.8, s: 0.22, r: 0.4, gate: 0.96, index: 1.9, indexSus: 0.3, bdec: 0.16, ratio: 1, tine: 0.09, tineR: 4, tdec: 0.3 },
    pad: { a: 0.5, d: 2, s: 0.85, r: 1.3, gate: 1, det: 10, wave: 'sawtooth', voices: 2 },
    strings: { a: 0.14, d: 1, s: 0.85, r: 0.55, gate: 1, det: 8, wave: 'sawtooth', voices: 2, vib: 9, vibRate: 5, vibDelay: 0.3 },
    pluck: { a: 0.003, d: 0.32, s: 0, r: 0.1, gate: 1, wave: 'sawtooth', fenv: 6, fend: 1.3, fdec: 0.07, q: 0.8 },
    upright: { a: 0.004, d: 0.6, s: 0.12, r: 0.09, gate: 0.95, wave: 'triangle', fenv: 5, fend: 1.1, fdec: 0.06, q: 0.6, body: 0.8 },
    kalimba: { a: 0.002, d: 1.0, s: 0, r: 0.15, gate: 1, ring: 1, ratio: 4, index: 2.0, idec: 0.025 },
    marimba: { a: 0.002, d: 0.55, s: 0, r: 0.08, gate: 1, ring: 1, p4: 0.26 },
    vibes: { a: 0.004, d: 1.6, s: 0, r: 0.25, gate: 1, ring: 1, p4: 0.1 },
    bell: { a: 0.002, d: 1.5, s: 0, r: 0.3, gate: 1, ring: 1 },
    glass: { a: 0.002, d: 1.2, s: 0, r: 0.3, gate: 1, ring: 1, partials: [[1, 1, 1], [2.76, 0.2, 0.4], [5.4, 0.06, 0.2]] },
    sub: { a: 0.006, d: 0.4, s: 0.8, r: 0.09, gate: 0.92, tri: 0.32 },
    brass: { a: 0.045, d: 0.5, s: 0.8, r: 0.17, gate: 0.94, det: 8, bright: 4, vib: 9, vibRate: 5.2, vibDelay: 0.25 },
    flute: { a: 0.06, d: 0.4, s: 0.85, r: 0.2, gate: 0.95, tri: 0.22, vib: 12, vibRate: 4.8, vibDelay: 0.22 },
  };
  // Papel de cada canal (sem parâmetros de envelope: esses vêm do instrumento)
  const INS_DEF = {
    lead: { inst: 'ep', vol: 0.17, len: 2, poly: 8 },
    counter: { inst: 'bell', vol: 0.045, len: 2, poly: 10 },
    pad: { inst: 'pad', mode: 'pad', vol: 0.09, oct: 4, len: 16, poly: 16 },
    keys: { inst: 'ep', mode: 'pad', vol: 0.1, oct: 4, len: 16, poly: 14 },
    arp: { inst: 'kalimba', mode: 'arp', rate: 2, pattern: 'up', oct: 4, vol: 0.11, len: 16, poly: 10 },
    bass: { inst: 'sub', vol: 0.15, len: 2, poly: 4 },
    drums: { vol: 1, len: 2, kit: 'soft' },
  };
  // Mixagem padrão de cada canal
  const BUS_DEF = {
    lead: { pan: 0, rev: 0.22, dly: 0.1 },
    counter: { pan: -0.22, rev: 0.45, dly: 0.18 },
    pad: { pan: 0, rev: 0.4, lp: 1600 },
    keys: { pan: -0.16, rev: 0.25 },
    arp: { pan: 0.22, rev: 0.3, dly: 0.12 },
    bass: { pan: 0, rev: 0, lp: 900 },
    drums: { pan: 0, rev: 0.07, side: 0.25 },
  };
  const BUS_KEYS = ['lp', 'lpq', 'hp', 'pan', 'rev', 'dly', 'trem', 'autopan', 'wow', 'lfo', 'side'];
  const KEEP_ON_SWAP = ['len', 'mode', 'oct', 'rate', 'pattern', 'like', 'poly', 'kit'];
  const ARP = {
    up: [0, 1, 2, 3], down: [3, 2, 1, 0], updown: [0, 1, 2, 3, 2, 1], alberti: [0, 2, 1, 2],
    broken: [0, 2, 1, 3], up8: [0, 1, 2, 3, 4, 5, 4, 3], triad: [0, 1, 2], pendulo: [0, 2, 3, 2],
  };

  // =====================================================================
  // 3. As trilhas
  // =====================================================================
  const bars = function () { return Array.prototype.slice.call(arguments).join(' | '); };
  const rep = (bar, n) => Array(n).fill(bar).join(' | ');
  // transpõe oitavas de uma string de notas (contracantos dobrando a melodia)
  const up = (str, k) => String(str).replace(/([A-G](?:#|b)?)(-?\d)(?=$|[\s:!?+|])/g, (m, n, o) => n + (parseInt(o, 10) + k));
  // baixo pontuado: fundamental (6+2), respiro, fundamental, quinta
  const bp = (r, f) => r + ':6 ' + r + ':2 .:2 ' + r + ':2 ' + f + ':4';
  // baixo em colcheias (a última pode ser nota de passagem)
  const b8 = (r, last) => Array(7).fill(r + ':2').concat([(last || r) + ':2']).join(' ');
  const oct8 = (lo, hi) => [lo, lo, hi, lo, lo, lo, hi, lo].map((n) => n + ':2').join(' ');
  // acordes curtos nos tempos 2 e 4 / em todos os contratempos / comping
  const stab24 = (c) => '.:4 ' + c + ':2 .:2 .:4 ' + c + ':2 .:2';
  const skank = (c) => Array(4).fill('.:2 ' + c + ':2').join(' ');
  const comp = (c) => c + ':6 ' + c + ':2 .:4 ' + c + ':4';

  // --- Tema da Faísca (titulo/final/jingle): E-G-C' pontuado sobe como faísca, B-G-E desce.
  const TEMA = bars(
    'E5:3 G5:1 C6:4 B5:2 G5:2 E5:4', //        C
    'D5:3 G5:1 B5:4 A5:2 G5:2 D5:4', //        G   (sequência um grau abaixo)
    'C5:2 E5:2 A5:4 G5:2 E5:2 C5:2 D5:2', //   Am
    'F5:6 E5:2 D5:4 C5:4', //                  F
    'E5:3 G5:1 C6:4 B5:2 G5:2 E5:4', //        C
    'D5:3 G5:1 B5:4 D6:2 C6:2 B5:4', //        G   (variação: sobe)
    'A5:2 C6:2 A5:2 F5:2 G5:2 B5:2 D6:2 B5:2', // F G
    'C6:8 .:4 E5:2 G5:2' //                    C   (anacruse sobe G→A: entra a ponte em Lá menor)
  );
  // A2 (fim do loop, volta para a intro): última nota resolve sem anacruse
  const TEMA_FIM = TEMA.split(' | ').slice(0, 7).concat(['C6:12 .:4']).join(' | ');
  const TEMA_C = bars('Cadd9', 'G', 'Am7', 'Fmaj7', 'Cadd9', 'G', 'Fmaj7:8 G:8', 'C');
  const TEMA_BS = bars(bp('C2', 'G2'), bp('G2', 'D2'), bp('A2', 'E2'), bp('F2', 'C2'), bp('C2', 'G2'), bp('G2', 'D2'),
    'F2:6 F2:2 G2:6 G2:2', 'C2:6 C2:2 .:2 C2:2 G1:4');
  const T_GROOVE = 'k:2 z?:2 r:2 z?:2 k:2 k?:2 r:2 z?:2';
  const T_GROOVE2 = 'k:2 h:1 h?:1 r:2 h:1 h?:1 k:2 k?:1 h?:1 r:2 h:1 h?:1';
  const T_FILL = 'k:2 z?:2 r:2 z?:2 k:2 r?:1 r?:1 t:2 t?:2';

  const MANHA_L = bars(
    'C5:4 F5:2 A5:2 G5:4 E5:4', //       Fmaj7
    'E5:6 C5:2 .:4 E5:2 G5:2', //        Am7
    'F5:4 D5:2 F5:2 A5:4 G5:2 F5:2', //  Bbmaj7
    'G5:6 F5:2 .:4 C5:4', //             C7sus4
    'C5:4 F5:2 A5:2 C6:4 A5:4', //       Fmaj7
    'A5:6 F5:2 .:4 D5:2 E5:2', //        Dm7
    'F5:4 D5:2 Bb4:2 C5:4 D5:4', //      Gm7
    'C5:12 .:4' //                       C7sus4 C7
  );
  const MANHA_H = bars('Fmaj7', 'Am7', 'Bbmaj7', 'C7sus4', 'Fmaj7', 'Dm7', 'Gm7', 'C7sus4:8 C7:8');
  // A → B (Bbmaj7): o último compasso fica suspenso (C7sus4 = Bb/C) e o baixo sobe Lá→Si bemol
  const MANHA_H_A = MANHA_H.replace('C7sus4:8 C7:8', 'C7sus4');
  const MANHA_B = bars(
    'F2:6 C3:2 A2:4 G2:4', 'A2:6 E3:2 A2:4 C3:4', 'Bb2:6 F2:2 Bb2:4 A2:4', 'C3:6 G2:2 C3:4 E2:4',
    'F2:6 C3:2 A2:4 C3:4', 'D3:6 A2:2 F2:4 A2:4', 'G2:6 D3:2 G2:4 Bb2:4', 'C3:6 G2:2 C3:4 E2:4'
  );
  const MANHA_B_A = MANHA_B.replace(/C3:4 E2:4$/, 'C3:4 A2:4');
  // marimba respondendo nos respiros da melodia
  const MANHA_C = bars('.:16', '.:8 G6:2 E6:2 .:4', '.:16', '.:8 F6:2 C6:2 .:4', '.:16', '.:8 A6:2 F6:2 .:4', '.:16',
    '.:4 F6:2 G6:2 Bb6:2 G6:2 E6:4');

  const TRAB_L = bars(
    'D5:2 G5:2 .:1 G5:1 A5:2 B5:3 A5:1 G5:2 E5:2', //  G
    'F#5:3 D5:3 B4:2 .:2 D5:2 F#5:2 A5:2', //          Bm7
    'G5:3 E5:3 C5:2 .:2 B4:2 C5:2 E5:2', //            Cmaj7
    'D5:6 .:2 A4:2 B4:2 C5:2 C#5:2', //                D
    'D5:2 G5:2 .:1 G5:1 A5:2 B5:3 A5:1 G5:2 E5:2', //  G
    'F#5:3 A5:3 B5:2 .:2 A5:2 B5:2 D6:2', //           Bm7
    'C6:3 B5:3 A5:2 G5:2 E5:2 G5:2 A5:2', //           Am7
    'G5:6 E5:2 F#5:2 A5:2 .:4' //                      D7sus4 D7 (o Sol suspenso resolve no Fá# junto com o acorde)
  );
  const TRAB_P = bars('G', 'Bm7', 'Cmaj7', 'D', 'G', 'Bm7', 'Am7', 'D7sus4:8 D7:8');
  const TRAB_K = bars(skank('G'), skank('Bm7'), skank('Cmaj7'), skank('D'), skank('G'), skank('Bm7'), skank('Am7'),
    '.:2 D7sus4:2 .:2 D7sus4:2 .:2 D7:2 .:2 D7:2');
  const TRAB_B = bars(
    'G2:3 G2:3 D3:2 .:2 G2:2 A2:2 B2:2', 'B2:3 B2:3 F#2:2 .:2 B2:2 A2:2 B2:2', 'C3:3 C3:3 G2:2 .:2 C3:2 B2:2 A2:2',
    'D3:3 D3:3 A2:2 .:2 D3:2 C3:2 B2:2', 'G2:3 G2:3 D3:2 .:2 G2:2 A2:2 B2:2', 'B2:3 B2:3 F#2:2 .:2 B2:2 A2:2 B2:2',
    'A2:3 A2:3 E2:2 .:2 A2:2 B2:2 C3:2', 'D3:3 D3:3 A2:2 .:2 C3:2 B2:2 A2:2'
  );
  const GROOVE = 'k:2 h:1 h?:1 s:2 h:1 k:1 h:1 h?:1 k:2 s:2 h:1 h?:1';
  const GROOVE_O = 'k:2 h:1 h?:1 s:2 o?:1 k:1 h:1 h?:1 k:2 s:2 o?:2';
  const GROOVE_FILL = 'k:2 h:1 h?:1 s:2 h:1 k:1 s?:1 s?:1 s:1 s:1 t:2 t?:2';

  const MIST_L = bars(
    'A4:2 .:2 C5:2 .:2 E5:2 D#5:2 E5:2 .:2', //   Am  (na ponta dos pés)
    '.:2 G5:2 F5:2 E5:2 C5:2 .:2 A4:4', //        Am
    'D5:2 .:2 F5:2 .:2 A5:2 G#5:2 A5:2 .:2', //   Dm  (mesmo motivo)
    '.:2 C6:2 B5:2 A5:2 E5:2 .:2 C5:4', //        Am
    'Eb5:2 .:2 F5:2 .:2 A5:2 .:2 C6:2 Eb6:2', //  F7
    'D6:3 .:1 B5:2 G#5:2 .:2 E5:2 G#5:2 B5:2', // E7
    'A5:2 .:2 E5:2 .:2 C5:2 .:2 A4:2 .:2', //     Am
    '.:4 B4:1 C5:1 B4:1 A#4:1 B4:4 .:4' //        E7  ("hã?")
  );
  const MIST_CH = ['Am', 'Am', 'Dm', 'Am', 'F7', 'E7', 'Am', 'E7'];
  const MIST_B = bars('A2 B2 C3 G#2', 'A2 C3 E3 C#3', 'D3 F3 A2 G#2', 'A2 C3 E3 F#2', 'F2 A2 C3 Eb3', 'E3 D3 B2 G#2', 'A2 E2 G2 F2', 'E2 F#2 G2 G#2');
  const MIST_D = 'k:2 h?:2 n:2 h?:2 k?:2 h?:2 n:2 h?:2';

  const CASA_L = bars(
    '.:2 C5:2 Eb5:2 G5:4 F5:2 Eb5:4', //        Abmaj7
    'D5:6 Bb4:2 .:4 F5:2 G5:2', //              Gm7
    'Ab5:4 G5:2 F5:2 Eb5:4 C5:4', //            Fm7
    'D5:8 .:4 Bb4:2 C5:2', //                   Bb7
    'Eb5:2 G5:2 Bb5:4 D6:4 C6:2 Bb5:2', //      Ebmaj7
    'G5:6 Eb5:2 .:4 Bb4:2 C5:2', //             Cm7
    'F5:2 Ab5:2 C6:4 Bb5:2 Ab5:2 G5:4', //      Fm7
    'F5:4 Eb5:4 D5:6 .:2' //                    Bb7sus4 Bb7
  );
  const CASA_H = bars('Abmaj7', 'Gm7', 'Fm7', 'Bb7', 'Ebmaj7', 'Cm7', 'Fm7', 'Bb7sus4:8 Bb7:8');
  const CASA_B = bars(
    'Ab2:6 Eb2:2 .:2 Ab2:2 G2:4', 'G2:6 D2:2 .:2 G2:2 F2:4', 'F2:6 C2:2 .:2 F2:2 Ab2:4', 'Bb1:6 F2:2 .:2 Bb1:2 D2:4',
    'Eb2:6 Bb1:2 .:2 Eb2:2 D2:4', 'C2:6 G2:2 .:2 C2:2 G2:4', 'F2:6 C2:2 .:2 F2:2 Ab2:4', 'Bb1:6 F2:2 .:2 Bb1:2 A1:4'
  );
  // A → B (Cm7): o baixo desce pela terça do Bb7 (Ré → Dó) em vez da aproximação cromática do Láb
  const CASA_B_A = CASA_B.replace(/A1:4$/, 'D2:4');
  const LOFI = 'k:2 h?:2 s:2 h?:2 .:1 k?:1 k:2 s:2 h?:2';

  const AULA_L = bars(
    'D5:2 F#5:2 A5:2 F#5:2 D5:2 .:2 A4:4', //               D
    'B4:2 D5:2 G5:2 D5:2 B4:2 .:2 G4:4', //                 G
    'C#5:2 E5:2 A5:2 G5:2 F#5:2 E5:2 D5:2 C#5:2', //        A   (escala descendo = "lição")
    'D5:4 A5:4 D6:4 .:4', //                                D   ("tcharam")
    'F#5:2 D5:2 B4:2 D5:2 F#5:2 B5:2 A5:2 F#5:2', //        Bm
    'G5:3 F#5:1 E5:2 D5:2 B4:4 .:4', //                     G
    'E5:2 G5:2 B5:2 G5:2 A5:2 C#6:2 E6:2 C#6:2', //         Em7 A7
    'D6:4 A5:2 F#5:2 D5:4 .:4' //                           D
  );
  const AULA_H = bars('D', 'G', 'A', 'D', 'Bm', 'G', 'Em7:8 A7:8', 'D');
  const AULA_B = bars(
    'D3 . A2 . D3 . A2 .', 'G2 . D3 . G2 . D3 .', 'A2 . E3 . A2 . C#3 .', 'D3 . A2 . D3 . C#3 .',
    'B2 . F#2 . B2 . F#2 .', 'G2 . D3 . G2 . B2 .', 'E2 . B2 . A2 . C#3 .', 'D3 . A2 . D3:4 .:4'
  );
  const AULA_AHA = bars('.:16', '.:16', '.:16', '.:12 F#6:1 A6:1 D7:2', '.:16', '.:16', '.:16', '.:12 A6:2 D7:2');
  const AU_D = 'k:2 z?:2 r:2 z?:2 k:2 z?:2 r:2 z?:2';

  const TENS_L = bars(
    'D5:6 Eb5:2 D5:8', //      Dm
    '.:8 A4:4 Ab4:4', //       Dm   (trítono)
    'G4:6 Ab4:2 G4:8', //      Eb
    '.:8 Bb4:4 A4:4', //       Eb
    'D5:6 Eb5:2 F5:8', //      Dm
    '.:8 Ab5:8', //            Bdim7
    'G5:6 F5:2 D5:8', //       Bb
    'C#5:8 .:4 Eb5:4' //       A7  (Eb = trítono, sem resolver)
  );
  const TENS_H = bars('Dm', 'Dm', 'Eb', 'Eb', 'Dm', 'Bdim7', 'Bb', 'A7');
  const TENS_B = bars(
    'D2 D2 A2 D2 D2 D2 Ab2 D2', 'D2 D2 A2 D2 D2 D2 Ab2 D2', 'Eb2 Eb2 Bb2 Eb2 Eb2 Eb2 A2 Eb2', 'Eb2 Eb2 Bb2 Eb2 Eb2 Eb2 A2 Eb2',
    'D2 D2 A2 D2 D2 D2 Ab2 D2', 'D2 D2 Ab2 D2 D2 D2 Ab2 D2', 'Bb1 Bb1 F2 Bb1 Bb1 Bb1 E2 Bb1', 'A1 A1 E2 A1 A1 A1 Eb2 A1'
  );
  // cordas agudas sustentando a tensão (b6, maj7, b9…)
  const TENS_C = bars('A5:16', 'A5:8 Bb5:8', 'Bb5:16', 'A5:16', 'A5:16', 'Ab5:16', 'A5:16', 'Bb5:8 A5:8');
  const HEART = 'b:3 b?:3 .:10';

  const SONHO_L = bars(
    'A5:8 B5:4 C6:4', //       Fmaj7#11 (B = #4 lídio)
    'D6:12 .:4', //            G/F
    'E6:4 C6:4 B5:4 G5:4', //  Fmaj7#11
    'A5:12 .:4', //            G/F
    'C6:6 B5:2 A5:4 E5:4', //  Am7
    'D6:6 C6:2 B5:4 G5:4', //  G
    'A5:4 B5:4 C6:4 E6:4', //  Fmaj7 (subida lídia)
    'D6:8 B5:8' //             Em7
  );
  const SONHO_H = bars('Fmaj7#11', 'G', 'Fmaj7#11', 'G', 'Am7', 'G', 'Fmaj7', 'Em7');
  const SONHO_B = bars('F2:8 C3:8', 'F2:8 D3:8', 'F2:8 C3:8', 'F2:8 D3:8', 'A2:8 E3:8', 'G2:8 D3:8', 'F2:8 C3:8', 'E2:8 B2:8');

  const CHEF_L = bars(
    'E5:3 B4:3 E5:2 F#5:2 G5:2 F#5:2 E5:2', //   Em
    'G5:3 E5:3 C5:2 D5:2 E5:2 G5:2 C6:2', //     C
    'B5:3 A5:3 F#5:2 D5:4 A5:4', //              D
    'B5:6 .:2 E6:2 D6:2 B5:2 G5:2', //           Em
    'E5:3 B4:3 E5:2 F#5:2 G5:2 A5:2 B5:2', //    Em
    'C6:3 B5:3 G5:2 E5:2 G5:2 C6:2 E6:2', //     C
    'E6:3 C6:3 A5:2 B5:2 C6:2 D6:2 E6:2', //     Am
    'D#6:6 .:2 B5:2 F#5:2 D#5:2 B4:2' //         B7
  );
  const CHEF_H = bars('Em', 'C', 'D', 'Em', 'Em', 'C', 'Am', 'B7');
  const CHEF_BS = bars(b8('E2'), b8('C2'), b8('D2'), b8('E2'), b8('E2'), b8('C2'), b8('A1'), 'B1:2 B1:2 B1:2 B1:2 B1:2 B1:2 D2:2 D#2:2');
  const CHEF_B_L = bars(
    'E5:3 G5:1 C6:4 B5:2 G5:2 E5:4', //       C   (Tema da Faísca!)
    'F#5:3 A5:1 D6:4 C6:2 A5:2 F#5:4', //     D
    'G5:3 B5:1 D6:4 G6:8', //                 G
    'F#6:4 E6:4 B5:4 G5:4', //                Em
    'E5:3 G5:1 C6:4 E6:4 D6:2 C6:2', //       C
    'D6:3 A5:1 F#5:4 A5:2 D6:2 F#6:4', //     D
    'G6:8 F#6:4 E6:4', //                     G
    'D#6:4 F#6:4 B5:4 A5:2 F#5:2' //          B7
  );
  // taikos: grave no 1, resposta no "e" do 1, caixa no 2 e 4
  const EPIC = 'g:2 h:1 g?:1 s:2 h:2 g:2 g?:2 s:2 h:1 h?:1';
  const EPIC_C = 'g+c:2 h:1 g?:1 s:2 h:2 g:2 g?:2 s:2 h:1 h?:1';
  const EPIC_FILL = 'g:2 h:1 g?:1 s:2 h:2 t:1 t:1 t:1 t:1 g:1 g:1 g!:1 g!:1';
  const HALF = 'k:4 h:2 h:2 s:4 h:2 g?:2';

  const TRACKS = {
    // ---------------------------------------------------------------
    // TITULO — Dó maior, 92 bpm, esperançoso. Intro de celesta anunciando o
    // motivo → A = Tema da Faísca no piano elétrico → B (ponte em Lá menor)
    // → A2 com a celesta dobrando o tema uma oitava acima ("magia da IA").
    // ---------------------------------------------------------------
    titulo: {
      bpm: 92, key: 'C', mode: 'major', trim: -1.0,
      delay: { l: 3, fb: 0.32, mix: 0.5 },
      ch: {
        lead: { inst: 'ep', vol: 0.19, rev: 0.25, dly: 0.12 },
        counter: { inst: 'bell', vol: 0.05 },
        pad: { vol: 0.088, lp: 2400 },
        arp: { inst: 'kalimba', vol: 0.11, rate: 2, pattern: 'up', oct: 4 },
        bass: { vol: 0.15 },
        drums: { kit: 'soft', vol: 0.9 },
      },
      parts: {
        I: {
          pad: bars('Fmaj7', 'G', 'Am7', 'G7sus4:8 G:8'),
          arp: bars('Fmaj7', 'G', 'Am7', 'G7sus4:8 G:8'),
          counter: bars('E6:3 G6:1 C7:4 B6:2 G6:2 E6:4', '.:16', 'C6:3 E6:1 A6:4 G6:2 E6:2 C6:4', '.:8 G5:2 A5:2 B5:2 D6:2'),
          bass: bars('F2:16', 'G2:16', 'A2:16', 'G2:16'),
          drums: bars('.:16', '.:16', 'z?:4 z?:4 z?:4 z?:2 z?:2', 'v:16'),
          cfg: { arp: { vol: 0.1 }, bass: { vol: 0.13 } },
        },
        A: {
          lead: TEMA, pad: TEMA_C, arp: TEMA_C, bass: TEMA_BS,
          counter: bars('.:16', '.:16', '.:16', '.:8 C7:2 G6:2 E6:4', '.:16', '.:16', '.:16', '.:8 E6:2 G6:2 C7:4'),
          drums: bars('k+c:2 z?:2 r:2 z?:2 k:2 k?:2 r:2 z?:2', rep(T_GROOVE, 6), T_FILL),
        },
        B: {
          lead: bars(
            'A5:4 G5:2 E5:2 C5:4 E5:4', //          Am7
            'G5:4 E5:2 D5:2 B4:8', //               Em7
            'A5:4 C6:2 A5:2 G5:4 F5:4', //          Fmaj7
            'E5:6 D5:2 C5:4 G4:4', //               C
            'F5:3 E5:1 D5:2 F5:2 A5:4 C6:4', //     Dm7
            'B5:6 A5:2 G5:4 D5:4', //               G
            'G5:4 B5:4 C6:4 A5:4', //               Em7 Am7
            'D6:4 C6:2 B5:2 A5:2 G5:2 F5:2 D5:2' // Dm7 G7
          ),
          pad: bars('Am7', 'Em7', 'Fmaj7', 'C', 'Dm7', 'G', 'Em7:8 Am7:8', 'Dm7:8 G7:8'),
          arp: bars('Am7', 'Em7', 'Fmaj7', 'C', 'Dm7', 'G', 'Em7:8 Am7:8', 'Dm7:8 G7:8'),
          bass: bars(bp('A2', 'E2'), bp('E2', 'B1'), bp('F2', 'C2'), bp('C2', 'G2'), bp('D2', 'A2'), bp('G2', 'D2'),
            'E2:6 E2:2 A2:6 A2:2', 'D2:6 D2:2 G2:6 G2:2'),
          drums: bars(rep('k:4 z?:2 z?:2 r:4 z?:2 k?:2', 7), T_FILL),
          cfg: { arp: { pattern: 'updown', vol: 0.095 }, lead: { index: 1.3 } },
        },
        A2: {
          lead: TEMA_FIM, counter: up(TEMA_FIM, 1), pad: TEMA_C, arp: TEMA_C, bass: TEMA_BS,
          drums: bars('k+c:2 h:1 h?:1 r:2 h:1 h?:1 k:2 k?:1 h?:1 r:2 h:1 h?:1', rep(T_GROOVE2, 6),
            'k:2 h:1 h?:1 r:2 h:1 h?:1 k:2 r?:1 r?:1 t:2 v:2'),
          cfg: { counter: { vol: 0.03 }, arp: { pattern: 'up8' } },
        },
      },
      form: ['I', 'A', 'B', 'A2'],
    },

    // ---------------------------------------------------------------
    // MANHA — Fá maior, 84 bpm. Nascer do sol e café: piano elétrico macio,
    // kalimba em colcheias, shaker e aro; marimba responde na volta (A2).
    // ---------------------------------------------------------------
    manha: {
      bpm: 84, key: 'F', mode: 'major', trim: -0.7,
      ch: {
        lead: { inst: 'ep', vol: 0.17, index: 0.9 },
        arp: { inst: 'kalimba', vol: 0.12, rate: 2, pattern: 'up8', oct: 4 },
        pad: { vol: 0.075, lp: 2100 },
        counter: { inst: 'marimba', vol: 0.075, pan: 0.3, rev: 0.35 },
        bass: { vol: 0.14 },
        drums: { kit: 'soft', vol: 0.8 },
      },
      parts: {
        A: { lead: MANHA_L, pad: MANHA_H_A, arp: MANHA_H_A, bass: MANHA_B_A, drums: rep('k:2 z?:2 r?:2 z?:2 k?:2 z?:2 r?:2 z?:2', 8) },
        B: {
          lead: bars(
            'D6:4 C6:2 A5:2 F5:4 A5:4', //   Bbmaj7
            'G5:6 E5:2 C5:4 E5:4', //        C
            'C6:4 A5:2 G5:2 E5:4 G5:4', //   Am7
            'F5:6 E5:2 D5:4 A4:4', //        Dm7
            'Bb5:4 A5:2 G5:2 D5:4 F5:4', //  Gm7
            'E5:4 G5:2 A5:2 C6:4 E6:4', //   Am7
            'D6:6 C6:2 A5:4 F5:4', //        Bbmaj7
            'G5:4 F5:4 E5:4 .:2 G4:2' //     C7sus4 C7
          ),
          pad: bars('Bbmaj7', 'C', 'Am7', 'Dm7', 'Gm7', 'Am7', 'Bbmaj7', 'C7sus4:8 C7:8'),
          arp: bars('Bbmaj7', 'C', 'Am7', 'Dm7', 'Gm7', 'Am7', 'Bbmaj7', 'C7sus4:8 C7:8'),
          bass: bars('Bb2:6 F2:2 D3:4 Bb2:4', 'C3:6 G2:2 E2:4 G2:4', 'A2:6 E3:2 A2:4 C3:4', 'D3:6 A2:2 D3:4 A2:4',
            'G2:6 D3:2 Bb2:4 G2:4', 'A2:6 E3:2 A2:4 C3:4', 'Bb2:6 F2:2 Bb2:4 A2:4', 'C3:6 G2:2 C3:4 E2:4'),
          drums: bars(rep('k:2 z?:2 r:2 z?:2 k?:2 k?:2 r:2 z?:2', 7), 'k:2 z?:2 r:2 z?:2 k:1 k?:1 r?:2 r:2 z:2'),
          cfg: { arp: { pattern: 'broken' } },
        },
        A2: {
          lead: MANHA_L, counter: MANHA_C, pad: MANHA_H, arp: MANHA_H, bass: MANHA_B,
          drums: rep('k:2 h?:1 h?:1 r:2 h?:1 h?:1 k?:2 k?:2 r:2 h?:1 h?:1', 8),
          cfg: { arp: { pattern: 'alberti', vol: 0.1 } },
        },
      },
      form: ['A', 'B', 'A2'],
    },

    // ---------------------------------------------------------------
    // TRABALHO — Sol maior, 112 bpm. Escritório moderno e focado: pluck
    // sintético na melodia, piano elétrico no contratempo, marimba em
    // arpejo, sub-grave sincopado, chimbal em semicolcheias e palma suave.
    // ---------------------------------------------------------------
    trabalho: {
      bpm: 112, key: 'G', mode: 'major', trim: 0.3,
      delay: { l: 3, fb: 0.3, mix: 0.45 },
      ch: {
        lead: { inst: 'pluck', vol: 0.12, wave: 'sawtooth', fenv: 5, fend: 1.5, d: 0.45, s: 0.25, r: 0.1, gate: 0.85, rev: 0.2, dly: 0.14 },
        keys: { inst: 'ep', vol: 0.09, gate: 0.5, index: 1.2, d: 0.6, pan: -0.22 },
        pad: { vol: 0.058, lp: 2200 },
        arp: { inst: 'marimba', vol: 0.12, rate: 2, pattern: 'up', oct: 4 },
        counter: { inst: 'bell', vol: 0.028 },
        bass: { vol: 0.15 },
        drums: { kit: 'soft', vol: 0.85 },
      },
      parts: {
        A: { lead: TRAB_L, keys: TRAB_K, pad: TRAB_P, bass: TRAB_B, drums: bars(rep(GROOVE, 7), GROOVE_FILL) },
        B: {
          lead: bars(
            'E5:4 G5:4 B5:6 A5:2', //                  Cmaj7
            'F#5:4 D5:4 A5:6 G5:2', //                 Bm7
            'E5:4 C5:4 G5:4 E5:2 D5:2', //             Am7
            'D5:8 .:4 B4:2 D5:2', //                   G
            'E5:4 G5:4 B5:4 C6:2 D6:2', //             Cmaj7
            'D6:4 B5:4 F#5:4 A5:2 B5:2', //            Bm7
            'G5:4 E5:4 C#6:4 A5:4', //                 Em7 A7
            'F#5:3 E5:3 D5:2 C5:2 A4:2 B4:2 C5:2' //   D7
          ),
          pad: bars('Cmaj7', 'Bm7', 'Am7', 'G', 'Cmaj7', 'Bm7', 'Em7:8 A7:8', 'D7'),
          arp: bars('Cmaj7', 'Bm7', 'Am7', 'G', 'Cmaj7', 'Bm7', 'Em7:8 A7:8', 'D7'),
          bass: bars('C3:3 C3:3 G2:2 .:2 C3:2 G2:2 C3:2', 'B2:3 B2:3 F#2:2 .:2 B2:2 F#2:2 B2:2', 'A2:3 A2:3 E2:2 .:2 A2:2 E2:2 A2:2',
            'G2:3 G2:3 D3:2 .:2 G2:2 A2:2 B2:2', 'C3:3 C3:3 G2:2 .:2 C3:2 G2:2 C3:2', 'B2:3 B2:3 F#2:2 .:2 B2:2 F#2:2 B2:2',
            'E2:3 E2:3 B2:2 A2:3 A2:3 C#3:2', 'D3:3 D3:3 A2:2 .:2 D3:2 B2:2 A2:2'),
          drums: bars('k+c:2 h:1 h?:1 s:2 o?:1 k:1 h:1 h?:1 k:2 s:2 o?:2', rep(GROOVE_O, 6), GROOVE_FILL),
          cfg: { lead: { inst: 'ep', vol: 0.16 } },
        },
        A2: {
          lead: TRAB_L, counter: up(TRAB_L, 1), keys: TRAB_K, pad: TRAB_P, bass: TRAB_B,
          drums: bars('k+c:2 h:1 h?:1 s+p:2 h:1 k:1 h:1 h?:1 k:2 s+p:2 h:1 h?:1', rep('k:2 h:1 h?:1 s+p:2 h:1 k:1 h:1 h?:1 k:2 s+p:2 h:1 h?:1', 6), GROOVE_FILL),
        },
        C: { // ponte "digitando": respostas curtas, marimba e sem caixa até o final
          lead: bars(
            '.:4 B5:1 B5:1 .:2 G5:2 A5:2 B5:4', //     Em7
            '.:4 D6:1 D6:1 .:2 B5:2 A5:2 G5:4', //     Em7
            '.:4 G5:1 G5:1 .:2 E5:2 F#5:2 G5:4', //    Cmaj7
            '.:4 B5:1 B5:1 .:2 A5:2 G5:2 E5:4', //     Cmaj7
            'C6:2 .:2 C6:2 B5:2 A5:2 .:2 E5:4', //     Am7
            'G5:2 .:2 G5:2 A5:2 C6:2 .:2 E6:4', //     Am7
            'D6:4 B5:2 A5:2 F#5:4 A5:4', //            D
            'A5:2 G5:2 F#5:2 E5:2 D5:2 C5:2 B4:2 C5:2' // D7
          ),
          pad: bars('Em7', 'Em7', 'Cmaj7', 'Cmaj7', 'Am7', 'Am7', 'D', 'D7'),
          arp: bars('Em7', 'Em7', 'Cmaj7', 'Cmaj7', 'Am7', 'Am7', 'D', 'D7'),
          bass: bars('E2:4 .:2 E2:2 .:2 E3:2 D3:2 B2:2', '%', 'C3:4 .:2 C3:2 .:2 C3:2 B2:2 G2:2', '%',
            'A2:4 .:2 A2:2 .:2 A2:2 G2:2 E2:2', '%', 'D3:4 .:2 D3:2 .:2 D3:2 C3:2 A2:2', 'D3:2 D3:2 D3:2 D3:2 D3:2 C3:2 B2:2 A2:2'),
          drums: bars(rep('k:4 h:2 h?:2 k:4 h:2 h?:2', 6), 'k:2 h:2 s:2 h:2 k:2 h:2 s:2 h:2',
            's?:1 s?:1 s?:1 s?:1 s:1 s:1 s:1 s:1 s:2 s:2 s!:2 v:2'),
          cfg: { lead: { gate: 0.6 }, arp: { pattern: 'updown', vol: 0.11 } },
        },
      },
      form: ['A', 'B', 'A2', 'C'],
    },

    // ---------------------------------------------------------------
    // MISTERIO — Lá menor, 96 bpm, swing. Detetive brincalhão (capítulo das
    // fake news): pizzicato com bordaduras cromáticas, contrabaixo andando,
    // vibrafone nos tempos 2 e 4, escovinha e estalos de dedo.
    // ---------------------------------------------------------------
    misterio: {
      bpm: 96, key: 'A', mode: 'minor', swing: 0.45, trim: 1.6,
      ch: {
        lead: { inst: 'pluck', wave: 'triangle', vol: 0.3, fenv: 7, fend: 1.6, fdec: 0.05, d: 0.3, s: 0, r: 0.07, gate: 1, rev: 0.25, dly: 0.08 },
        keys: { inst: 'vibes', vol: 0.1, oct: 4, trem: { rate: 5.2, depth: 0.3 }, rev: 0.35 },
        arp: { inst: 'vibes', vol: 0.08, rate: 2, pattern: 'updown', oct: 4, trem: { rate: 5.2, depth: 0.3 } },
        pad: { vol: 0.045, lp: 1700 },
        bass: { inst: 'upright', vol: 0.17, len: 4 },
        drums: { kit: 'brush', vol: 0.95 },
      },
      parts: {
        A: { lead: MIST_L, keys: bars.apply(null, MIST_CH.map(stab24)), pad: bars.apply(null, MIST_CH), bass: MIST_B, drums: rep(MIST_D, 8) },
        B: {
          lead: bars(
            'F5:3 E5:1 D5:2 .:2 A5:4 .:4', //               Dm7
            'G#5:3 A5:1 B5:2 .:2 D6:4 .:4', //              E7
            'C6:2 B5:2 A5:2 E5:2 .:4 A5:1 A5:1 .:2', //     Am
            'C#6:2 .:2 E6:2 .:2 G5:2 .:2 C#5:4', //         A7  (surpresa!)
            'D6:2 C6:2 A5:2 F5:2 .:2 D5:2 F5:2 A5:2', //    Dm7
            'Ab5:2 .:2 F5:2 .:2 D5:2 .:2 Bb4:4', //         Bb7
            'B4:2 .:2 B4:2 .:2 B4:2 C5:2 B4:2 .:2', //      E7  (suspense)
            'E5:2 .:6 .:4 E4:1 F4:1 F#4:1 G#4:1' //         E7  (parada + corrida)
          ),
          keys: bars(stab24('Dm7'), stab24('E7'), stab24('Am'), stab24('A7'), stab24('Dm7'), stab24('Bb7'), stab24('E7'), 'E7:2 .:14'),
          pad: bars('Dm7', 'E7', 'Am', 'A7', 'Dm7', 'Bb7', 'E7', 'E7:2 .:14'),
          bass: bars('D3 F3 A2 F2', 'E2 G#2 B2 G#2', 'A2 C3 E3 G#2', 'A2 C#3 E3 C#3', 'D3 C3 A2 B2', 'Bb2 D3 F3 F2', 'E2 G#2 B2 D3', 'E2:2 .:14'),
          drums: bars(rep(MIST_D, 7), 'k:2 .:6 .:4 t:1 t:1 t:1 t:1'),
        },
        A2: {
          lead: MIST_L, arp: bars.apply(null, MIST_CH), pad: bars.apply(null, MIST_CH), bass: MIST_B,
          drums: bars(rep('k:2 h?:2 n:2 w?:2 k?:2 h?:2 n:2 h?:2', 7), 'k:2 h?:2 n:2 h?:2 s:1 s:1 s:1 s:1 r:2 r:2'),
          cfg: { lead: { vol: 0.32 } },
        },
      },
      form: ['A', 'B', 'A2'],
    },

    // ---------------------------------------------------------------
    // CASA — Mi bemol maior, 76 bpm, swing forte. Noite aconchegante lo-fi:
    // piano elétrico com "wow" de fita, acordes quebrados, pad abafado,
    // bateria boom-bap macia e um chiado de vinil bem discreto.
    // ---------------------------------------------------------------
    casa: {
      bpm: 76, key: 'Eb', mode: 'major', swing: 0.55, trim: -0.2,
      delay: { l: 3, fb: 0.28, mix: 0.5 },
      crackle: 0.15,
      ch: {
        lead: { inst: 'ep', vol: 0.18, index: 0.85, lp: 2600, wow: 6, rev: 0.3, dly: 0.16 },
        arp: { inst: 'ep', vol: 0.09, rate: 2, pattern: 'broken', oct: 4, index: 0.7, lp: 2200, wow: 6, autopan: { rate: 0.13, depth: 0.35 } },
        keys: { inst: 'ep', vol: 0.08, index: 0.7, lp: 2200, wow: 6 },
        pad: { vol: 0.055, lp: 1100 },
        bass: { vol: 0.15 },
        drums: { kit: 'lofi', vol: 0.9 },
      },
      parts: {
        A: { lead: CASA_L, arp: CASA_H, pad: CASA_H, bass: CASA_B_A, drums: rep(LOFI, 8) },
        B: {
          lead: bars(
            'G5:2 Bb5:2 G5:2 Eb5:2 .:4 C5:2 D5:2', //   Cm7
            'Eb5:4 C5:2 Ab4:2 .:4 Ab4:2 Bb4:2', //      Fm7
            'C5:4 D5:2 F5:2 Ab5:4 G5:4', //             Bb7
            'G5:8 .:4 Bb4:2 Eb5:2', //                  Ebmaj7
            'G5:2 Ab5:2 C6:4 Bb5:2 Ab5:2 G5:4', //      Abmaj7
            'F5:4 Ab5:2 C6:2 .:4 Db6:2 C6:2', //        Dbmaj7 (bVII emprestado)
            'Ab5:3 G5:1 F5:2 Eb5:2 C5:4 .:4', //        Fm7
            'Eb5:4 F5:4 D5:6 .:2' //                    Bb7sus4 Bb7
          ),
          arp: bars('Cm7', 'Fm7', 'Bb7', 'Ebmaj7', 'Abmaj7', 'Dbmaj7', 'Fm7', 'Bb7sus4:8 Bb7:8'),
          pad: bars('Cm7', 'Fm7', 'Bb7', 'Ebmaj7', 'Abmaj7', 'Dbmaj7', 'Fm7', 'Bb7sus4:8 Bb7:8'),
          bass: bars('C2:6 G2:2 .:2 C2:2 G2:4', 'F2:6 C2:2 .:2 F2:2 Ab2:4', 'Bb1:6 F2:2 .:2 Bb1:2 D2:4', 'Eb2:6 Bb1:2 .:2 Eb2:2 G2:4',
            'Ab2:6 Eb2:2 .:2 Ab2:2 C2:4', 'Db2:6 Ab2:2 .:2 Db2:2 Eb2:4', 'F2:6 C2:2 .:2 F2:2 Ab2:4', 'Bb1:6 F2:2 .:2 Bb1:2 A1:4'),
          drums: bars(rep(LOFI, 7), 'k:2 h?:2 s:2 h?:2 .:2 k:2 s:1 s?:1 o?:2'),
        },
        A2: {
          lead: CASA_L, pad: CASA_H, bass: CASA_B,
          keys: bars(comp('Abmaj7'), comp('Gm7'), comp('Fm7'), comp('Bb7'), comp('Ebmaj7'), comp('Cm7'), comp('Fm7'), 'Bb7sus4:6 Bb7sus4:2 Bb7:8'),
          drums: rep('k:2 h?:2 s:2 h?:2 .:1 k?:1 k:2 s:2 o?:2', 8),
        },
      },
      form: ['A', 'B', 'A2'],
    },

    // ---------------------------------------------------------------
    // AULA — Ré maior, 104 bpm, curiosa. Marimba subindo e descendo a
    // "lição", pizzicato em Alberti, contrabaixo oom-pah, bloco de madeira
    // e celesta no "tcharam".
    // ---------------------------------------------------------------
    aula: {
      bpm: 104, key: 'D', mode: 'major', trim: 0.6,
      ch: {
        lead: { inst: 'marimba', vol: 0.25, rev: 0.22, dly: 0.08 },
        arp: { inst: 'pluck', wave: 'triangle', vol: 0.13, rate: 2, pattern: 'alberti', oct: 4, fenv: 6, d: 0.22, s: 0 },
        pad: { vol: 0.055, lp: 2100 },
        counter: { inst: 'bell', vol: 0.06 },
        bass: { inst: 'upright', vol: 0.16 },
        drums: { kit: 'soft', vol: 0.85 },
      },
      parts: {
        A: {
          lead: AULA_L, arp: AULA_H, pad: AULA_H, bass: AULA_B, counter: AULA_AHA,
          drums: bars(rep(AU_D, 7), 'k:2 z?:2 r:2 z?:2 k:2 r:1 r:1 x:2 x:2'),
        },
        B: {
          lead: bars(
            'B5:4 A5:2 F#5:2 D5:4 F#5:4', //                 Bm
            'C#6:4 A5:2 F#5:2 C#5:4 E5:4', //                F#m
            'D5:2 G5:2 B5:2 D6:2 B5:2 G5:2 D5:2 B4:2', //    G
            'A4:4 D5:4 F#5:8', //                            D
            'G5:2 F#5:2 E5:2 B4:2 G5:2 F#5:2 E5:2 B4:2', //  Em
            'A5:2 G5:2 E5:2 C#5:2 A5:2 G5:2 E5:2 C#5:2', //  A
            'B5:3 C#6:1 D6:4 B5:2 G5:2 D5:4', //             G
            'E5:2 F#5:2 G5:2 A5:2 C#6:4 .:2 A4:2' //         A7
          ),
          arp: bars('Bm', 'F#m', 'G', 'D', 'Em', 'A', 'G', 'A7'),
          pad: bars('Bm', 'F#m', 'G', 'D', 'Em', 'A', 'G', 'A7'),
          bass: bars('B2 . F#2 . B2 . A2 .', 'F#2 . C#3 . F#2 . E2 .', 'G2 . D3 . G2 . B2 .', 'D3 . A2 . D3 . F#3 .',
            'E3 . B2 . E3 . B2 .', 'A2 . E3 . A2 . C#3 .', 'G2 . D3 . G2 . B2 .', 'A2 . E3 . A2 . C#3 .'),
          drums: bars(rep('k:2 z?:2 x:2 z?:2 k:2 z?:2 x:2 x?:2', 7), 'k:2 z?:2 x:2 z?:2 x:1 x:1 x:1 x:1 x:2 x:2'),
          cfg: { arp: { inst: 'kalimba', rate: 2, pattern: 'up', vol: 0.1 } },
        },
        A2: {
          lead: AULA_L, counter: up(AULA_L, 1), arp: AULA_H, pad: AULA_H, bass: AULA_B,
          drums: bars('k+c:2 z?:2 r:2 z?:2 k:2 z?:2 r+p:2 z?:2', rep('k:2 z?:2 r:2 z?:2 k:2 z?:2 r+p:2 z?:2', 6), 'k:2 z?:2 r:2 z?:2 k:2 r:1 r:1 x:2 x:2'),
          cfg: { counter: { vol: 0.026 } },
        },
      },
      form: ['A', 'B', 'A2'],
    },

    // ---------------------------------------------------------------
    // TENSAO — Ré menor, 72 bpm. Golpe por telefone: batida de coração,
    // pulso grave com trítono, pad escuro com filtro respirando, flauta
    // esparsa com eco e cordas agudas sustentando dissonâncias. Inquietante,
    // nunca terror. B sobe cromaticamente (D→…→A) até o A7.
    // ---------------------------------------------------------------
    tensao: {
      bpm: 72, key: 'D', mode: 'minor', trim: 2.0,
      delay: { l: 3, fb: 0.4, mix: 0.55 },
      ch: {
        lead: { inst: 'flute', vol: 0.1, vib: 16, vibRate: 4.4, rev: 0.4, dly: 0.3 },
        pad: { vol: 0.08, lp: 800, lfo: { rate: 0.07, depth: 320 }, rev: 0.5 },
        counter: { inst: 'strings', vol: 0.018, a: 1.2, r: 1.5, vib: 18, vibRate: 3.5, lp: 3000, rev: 0.5, pan: 0.25 },
        bass: { vol: 0.14, gate: 0.4 },
        drums: { kit: 'soft', vol: 1 },
      },
      parts: {
        A: { lead: TENS_L, pad: TENS_H, bass: TENS_B, counter: TENS_C, drums: rep(HEART, 8) },
        B: {
          lead: bars(
            'F5:2 .:2 F5:2 .:2 E5:4 D5:4', //    Dm
            'G5:2 .:2 G5:2 .:2 F5:4 Eb5:4', //   Eb
            'Bb5:2 .:2 Bb5:2 .:2 G5:4 E5:4', //  Em7b5
            'C6:2 .:2 C6:2 .:2 A5:4 F5:4', //    F
            'C6:4 A5:4 F#5:4 Eb5:4', //          F#dim7
            'D6:4 Bb5:4 G5:4 D5:4', //           Gm
            'Eb6:8 D6:8', //                     Ab  (D = trítono)
            'C#6:4 .:4 A5:2 .:2 Eb5:4' //        A7
          ),
          pad: bars('Dm', 'Eb', 'Em7b5', 'F', 'F#dim7', 'Gm', 'Ab', 'A7'),
          bass: bars(oct8('D2', 'D3'), oct8('Eb2', 'Eb3'), oct8('E2', 'E3'), oct8('F2', 'F3'), oct8('F#2', 'F#3'), oct8('G2', 'G3'), oct8('Ab2', 'Ab3'), oct8('A2', 'A3')),
          drums: rep('b:3 b?:3 .:2 x?:4 x?:4', 8),
        },
        A2: {
          lead: TENS_L, pad: TENS_H, bass: TENS_B, counter: TENS_C,
          drums: rep('b:3 b?:3 .:2 b:3 b?:3 .:2', 8),
        },
      },
      form: ['A', 'B', 'A2'],
    },

    // ---------------------------------------------------------------
    // SONHO — Fá lídio (Si natural), 66 bpm. Celesta em semicolcheias com eco
    // de colcheia pontuada, pad enorme e lento, piano elétrico puro;
    // alternância Fmaj7#11 ↔ G/F (cor lídia).
    // ---------------------------------------------------------------
    sonho: {
      bpm: 66, key: 'F', mode: 'lydian', trim: 1.6,
      delay: { l: 3, fb: 0.42, mix: 0.6 },
      ch: {
        lead: { inst: 'ep', vol: 0.15, index: 0.6, rev: 0.5, dly: 0.25 },
        arp: { inst: 'bell', vol: 0.05, rate: 1, pattern: 'up8', oct: 5, rev: 0.6, dly: 0.25, partials: [[1, 1, 1], [2, 0.2, 0.5]], d: 1.3 },
        pad: { vol: 0.08, lp: 2400, a: 1.2, r: 2.2, rev: 0.6, lfo: { rate: 0.05, depth: 400 } },
        bass: { vol: 0.11, a: 0.08, r: 0.4 },
        drums: { kit: 'soft', vol: 0.6 },
      },
      parts: {
        A: { lead: SONHO_L, arp: SONHO_H, pad: SONHO_H, bass: SONHO_B },
        B: {
          lead: bars(
            'F5:4 A5:4 E6:8', //       Dm9
            'D6:4 B5:4 G5:8', //       Em7
            'A5:4 C6:4 B5:8', //       Fmaj7#11 (#11 sustentado)
            'D6:8 .:8', //             G
            'G6:4 E6:4 D6:4 B5:4', //  Em7
            'C6:8 A5:8', //            Am7
            'B5:6 A5:2 E5:8', //       Fmaj7#11
            'D5:8 .:8' //              G/F
          ),
          arp: bars('Dm9', 'Em7', 'Fmaj7#11', 'G', 'Em7', 'Am7', 'Fmaj7#11', 'G/F'),
          pad: bars('Dm9', 'Em7', 'Fmaj7#11', 'G', 'Em7', 'Am7', 'Fmaj7#11', 'G/F'),
          bass: bars('D3:8 A2:8', 'E2:8 B2:8', 'F2:8 C3:8', 'G2:8 D3:8', 'E2:8 B2:8', 'A2:8 E3:8', 'F2:8 C3:8', 'F2:8 C3:8'),
          drums: rep('k?:8 w?:8', 8),
          cfg: { lead: { inst: 'flute', vol: 0.085, vib: 10 } },
        },
        A2: {
          lead: SONHO_L, arp: SONHO_H, pad: SONHO_H, bass: SONHO_B,
          cfg: { arp: { pattern: 'down' } },
        },
      },
      form: ['A', 'B', 'A2'],
    },

    // ---------------------------------------------------------------
    // CHEFAO — Mi menor, 140 bpm. Batalha épica: metais sintéticos na
    // melodia, cordas em ostinato de semicolcheias, taikos, sub-grave em
    // colcheias. B cita o Tema da Faísca (metais + celesta em uníssono);
    // ponte C com acordes em síncope e F#m7b5 → B7.
    // ---------------------------------------------------------------
    chefao: {
      bpm: 140, key: 'E', mode: 'minor', trim: -2.4,
      delay: { l: 3, fb: 0.25, mix: 0.4 },
      ch: {
        lead: { inst: 'brass', vol: 0.16, rev: 0.25, dly: 0.06 },
        ost: { like: 'arp', inst: 'pluck', wave: 'sawtooth', vol: 0.1, rate: 1, pattern: 'up', oct: 3, fenv: 0, d: 0.16, s: 0, gate: 0.9, pan: -0.25, lp: 1800, rev: 0.15, dly: 0 },
        pad: { inst: 'strings', vol: 0.07, lp: 3000, rev: 0.4 },
        keys: { inst: 'brass', vol: 0.08, gate: 0.8, bright: 3, vib: 0, pan: 0.18, rev: 0.25 },
        counter: { inst: 'bell', vol: 0.045, pan: 0.2 },
        bass: { vol: 0.16 },
        drums: { kit: 'epic', vol: 1 },
      },
      parts: {
        A: { lead: CHEF_L, ost: CHEF_H, pad: CHEF_H, bass: CHEF_BS, drums: bars(EPIC_C, rep(EPIC, 6), EPIC_FILL) },
        B: {
          lead: CHEF_B_L, counter: CHEF_B_L,
          pad: bars('C', 'D7', 'G', 'Em', 'C', 'D', 'G', 'B7'), // D7: o Dó da melodia vira 7ª da dominante (→ G)
          ost: bars('C', 'D7', 'G', 'Em', 'C', 'D', 'G', 'B7'),
          bass: bars(oct8('C2', 'C3'), oct8('D2', 'D3'), oct8('G1', 'G2'), oct8('E2', 'E3'), oct8('C2', 'C3'), oct8('D2', 'D3'), oct8('G1', 'G2'),
            'B1:2 B1:2 B2:2 B1:2 A1:2 G1:2 F#1:2 D#2:2'),
          drums: bars('g+c:4 h:2 h:2 s:4 h:2 g?:2', rep(HALF, 3), 'g+c:4 h:2 h:2 s:4 h:2 g?:2', rep(HALF, 2),
            'g:2 h:2 s:2 h:2 s:1 s:1 s:1 s:1 t:1 t:1 g:1 g:1'),
          cfg: { ost: { pattern: 'updown' } },
        },
        A2: {
          lead: CHEF_L, ost: CHEF_H, pad: CHEF_H, bass: CHEF_BS,
          drums: bars(EPIC_C, rep(EPIC, 3), EPIC_C, rep(EPIC, 2), EPIC_FILL),
          cfg: { ost: { pattern: 'up8' } },
        },
        C: {
          lead: bars(
            'A5:2 .:1 A5:1 .:2 A5:2 C6:2 .:2 B5:4', //   Am
            'A5:2 .:1 A5:1 .:2 A5:2 E6:2 .:2 D6:4', //   Am
            'G5:2 .:1 G5:1 .:2 G5:2 C6:2 .:2 B5:4', //   C
            'G5:2 .:1 G5:1 .:2 G5:2 E6:2 .:2 D6:4', //   C
            'C6:4 A5:4 F#5:4 E5:4', //                   F#m7b5
            'A5:4 C6:4 E6:4 F#6:4', //                   F#m7b5
            'F#6:6 D#6:2 B5:4 A5:4', //                  B7
            'B5:1 C6:1 B5:1 A#5:1 B5:4 F#5:2 G5:2 A5:2 B5:2' // B7
          ),
          keys: bars('Am:2 .:1 Am:1 .:2 Am:2 Am:2 .:2 Am:4', '%', 'C:2 .:1 C:1 .:2 C:2 C:2 .:2 C:4', '%',
            'F#m7b5:4 F#m7b5:4 F#m7b5:4 F#m7b5:4', '%', 'B7:4 B7:4 B7:4 B7:4', '%'),
          pad: bars('Am', 'Am', 'C', 'C', 'F#m7b5', 'F#m7b5', 'B7', 'B7'),
          bass: bars('A1:2 .:1 A1:1 .:2 A1:2 A1:2 .:2 A1:4', '%', 'C2:2 .:1 C2:1 .:2 C2:2 C2:2 .:2 C2:4', '%',
            b8('F#2'), b8('F#2'), b8('B1'), 'B1:2 B1:2 B1:2 B1:2 B1:2 A1:2 G1:2 F#1:2'),
          drums: bars('g+c:2 .:1 k:1 .:2 s:2 g:2 .:2 s:4', rep('g:2 .:1 k:1 .:2 s:2 g:2 .:2 s:4', 3), rep('g:2 h:2 s:2 h:2 g:2 h:2 s:2 h:2', 2),
            's:2 s:2 s:2 s:2 g:1 g:1 g:1 g:1 s:1 s:1 s:1 s:1', 's?:1 s?:1 s?:1 s?:1 s:1 s:1 s:1 s:1 g:1 g:1 g:1 g:1 s!:1 s!:1 v:2'),
          cfg: { pad: { vol: 0.055 } },
        },
      },
      form: ['A', 'B', 'A2', 'C'],
    },

    // ---------------------------------------------------------------
    // FINAL — créditos, 92 bpm. Intro com o motivo lento → Tema da Faísca
    // em Dó (piano elétrico + cordas) → desenvolvimento (motivo em menor,
    // subindo) → modulação para Ré maior via A7 (reprise triunfal com metais
    // e celesta) → coda que volta para Dó pelo Dm7 (nota comum Ré) e termina
    // com o motivo pousando na tônica (a celesta responde).
    // ---------------------------------------------------------------
    final: {
      bpm: 92, key: 'C', mode: 'major', trim: -0.3,
      delay: { l: 3, fb: 0.32, mix: 0.5 },
      ch: {
        lead: { inst: 'ep', vol: 0.18, rev: 0.3, dly: 0.1 },
        counter: { inst: 'bell', vol: 0.035 },
        pad: { inst: 'strings', vol: 0.075, lp: 2700, a: 0.4, r: 1.0, rev: 0.45 },
        arp: { inst: 'kalimba', vol: 0.095, rate: 2, pattern: 'up', oct: 4 },
        bass: { vol: 0.14 },
        drums: { kit: 'soft', vol: 0.9 },
      },
      parts: {
        I: {
          lead: bars('.:4 E5:2 G5:2 C6:8', 'B5:4 A5:4 G5:4 D5:4', 'E5:6 G5:2 C6:4 B5:2 A5:2', 'A5:4 G5:4 F5:4 D5:4'),
          pad: bars('Fmaj7', 'G', 'Em7:8 Am7:8', 'Dm7:8 G7:8'),
          counter: bars('.:16', '.:8 D7:4 B6:4', '.:16', '.:8 F6:4 B6:4'),
          bass: bars('F2:16', 'G2:16', 'E2:8 A2:8', 'D2:8 G2:8'),
          drums: bars('.:16', '.:16', '.:16', 'v:16'),
          cfg: { pad: { a: 1.0 } },
        },
        A: {
          lead: bars(
            'E5:3 G5:1 C6:4 B5:2 G5:2 E5:4', //        Cadd9
            'D5:3 G5:1 B5:4 A5:2 G5:2 D5:4', //        G/B
            'C5:2 E5:2 A5:4 G5:2 E5:2 C5:2 D5:2', //   Am7
            'F5:4 A5:4 G5:4 E5:4', //                  Fmaj7
            'E5:3 G5:1 C6:4 D6:2 E6:2 C6:4', //        C/E (o motivo vai mais alto)
            'B5:4 A5:2 G5:2 D6:8', //                  G
            'C6:4 A5:4 B5:4 D6:4', //                  Fmaj7 G
            'C6:12 G5:2 E5:2' //                       C
          ),
          pad: bars('Cadd9', 'G/B', 'Am7', 'Fmaj7', 'C/E', 'G', 'Fmaj7:8 G:8', 'C'),
          arp: bars('Cadd9', 'G/B', 'Am7', 'Fmaj7', 'C/E', 'G', 'Fmaj7:8 G:8', 'C'),
          bass: bars('C2:8 G2:4 C2:4', 'B1:8 G1:4 B1:4', 'A1:8 E2:4 G2:4', 'F2:8 C2:4 F2:4', 'E2:8 G2:4 C2:4', 'G2:8 D2:4 B1:4', 'F2:8 G2:8', 'C2:8 G1:4 E2:4'),
          drums: bars('k+c:2 z?:2 r:2 z?:2 k:2 k?:2 r:2 z?:2', rep(T_GROOVE, 6), T_FILL),
        },
        B: {
          lead: bars(
            'A5:3 C6:1 E6:4 D6:2 C6:2 A5:4', //   Am  (motivo em menor)
            'G5:3 B5:1 E6:4 D6:2 B5:2 G5:4', //   Em
            'A5:3 C6:1 F6:4 E6:2 C6:2 A5:4', //   F
            'G5:3 C6:1 E6:4 D6:2 C6:2 G5:4', //   C
            'F5:4 A5:4 C6:4 D6:4', //             Dm7
            'E6:4 D6:4 B5:4 G5:4', //             Em7
            'A5:4 C6:4 E6:6 D6:2', //             Fmaj7
            'D6:8 C#6:4 E5:2 F#5:2' //            A7sus4 A7 → Ré maior
          ),
          pad: bars('Am', 'Em', 'F', 'C', 'Dm7', 'Em7', 'Fmaj7', 'A7sus4:8 A7:8'),
          arp: bars('Am', 'Em', 'F', 'C', 'Dm7', 'Em7', 'Fmaj7', 'A7sus4:8 A7:8'),
          bass: bars(bp('A1', 'E2'), bp('E2', 'B1'), bp('F2', 'C2'), bp('C2', 'G2'), bp('D2', 'A1'), bp('E2', 'B1'), bp('F2', 'C2'),
            'A1:6 A1:2 .:2 A1:2 B1:2 C#2:2'),
          drums: bars(rep(T_GROOVE2, 7), 'k:2 h:1 h?:1 r:2 h:1 h?:1 r:1 r:1 r:1 r:1 t:1 t:1 t:1 t!:1'),
          cfg: { arp: { pattern: 'updown' } },
        },
        D: {
          lead: bars(
            'F#5:3 A5:1 D6:4 C#6:2 A5:2 F#5:4', //     D
            'E5:3 A5:1 C#6:4 B5:2 A5:2 E5:4', //       A/C#
            'D5:2 F#5:2 B5:4 A5:2 F#5:2 D5:2 E5:2', // Bm7
            'G5:4 B5:4 A5:4 F#5:4', //                 Gmaj7
            'F#5:3 A5:1 D6:4 E6:2 F#6:2 D6:4', //      D/F#
            'C#6:4 B5:2 A5:2 E6:8', //                 A
            'D6:4 B5:4 C#6:4 E6:4', //                 Gmaj7 A
            'D6:16' //                                 D
          ),
          counter: up(bars(
            'F#5:3 A5:1 D6:4 C#6:2 A5:2 F#5:4', 'E5:3 A5:1 C#6:4 B5:2 A5:2 E5:4', 'D5:2 F#5:2 B5:4 A5:2 F#5:2 D5:2 E5:2',
            'G5:4 B5:4 A5:4 F#5:4', 'F#5:3 A5:1 D6:4 E6:2 F#6:2 D6:4', 'C#6:4 B5:2 A5:2 E6:8', 'D6:4 B5:4 C#6:4 E6:4', 'D6:16'), 1),
          pad: bars('D', 'A/C#', 'Bm7', 'Gmaj7', 'D/F#', 'A', 'Gmaj7:8 A:8', 'D'),
          arp: bars('D', 'A/C#', 'Bm7', 'Gmaj7', 'D/F#', 'A', 'Gmaj7:8 A:8', 'D'),
          bass: bars(bp('D2', 'A1'), bp('C#2', 'A1'), bp('B1', 'F#2'), bp('G1', 'D2'), bp('F#2', 'D2'), bp('A1', 'E2'), 'G1:6 G1:2 A1:6 A1:2', 'D2:4 A1:4 D2:4 D2:4'),
          drums: bars('g+c:2 z?:2 r:2 z?:2 k:2 k?:2 r:2 z?:2', rep('k:2 h:1 h?:1 r:2 h:1 h?:1 g:2 k?:1 h?:1 r:2 h:1 h?:1', 6), 'g+c:4 .:12'),
          cfg: { lead: { inst: 'brass', vol: 0.17, bright: 3.2 }, counter: { vol: 0.034 }, pad: { vol: 0.09 }, arp: { pattern: 'up8' } }, // clímax: a reprise vem cheia
        },
        C: { // coda: ii–V–iii–vi–ii–V e o motivo da Faísca pousa em Dó; a celesta ecoa e o loop recomeça no Fmaj7
          lead: bars('D6:4 C6:4 A5:4 F5:4', 'C6:6 B5:2 G5:8', 'E5:4 G5:4 C6:8', 'D6:4 A5:4 B5:4 F5:4', 'E5:3 G5:1 C6:12', '.:16'),
          pad: bars('Dm7', 'Gsus4:6 G:10', 'Em7:8 Am7:8', 'Dm7:8 G7:8', 'Cadd9', '_:16'),
          counter: bars('.:16', '.:8 D7:4 B6:4', '.:8 G6:4 C7:4', '.:16', '.:16', 'E6:3 G6:1 C7:4 .:8'),
          bass: bars('D2:8 A1:8', 'G1:8 D2:8', 'E2:8 A1:8', 'D2:8 G1:8', 'C2:12 G1:4', 'C2:16'),
          drums: bars(rep('k:4 h?:4 h:4 h?:4', 3), 'k:4 h?:4 s?:2 s?:2 s?:2 s:2', 'k+c:4 .:12', '.:16'),
        },
      },
      form: ['I', 'A', 'B', 'D', 'C'],
    },
  };

  // =====================================================================
  // 4. Compilação: texto → eventos (com validação de compassos)
  // =====================================================================
  function parseChannel(str, kind, defLen, where, errors) {
    const out = [];
    const barStrs = String(str).split('|');
    let pos = 0, last = null, prev = null;
    barStrs.forEach((bs, bi) => {
      let toks = bs.trim().split(/\s+/).filter(Boolean);
      if (toks.length === 1 && toks[0] === '%') toks = prev || [];
      prev = toks;
      if (!toks.length) errors.push(where + ' compasso ' + (bi + 1) + ': vazio');
      let sum = 0;
      toks.forEach((tk) => {
        const m = TOK_RE.exec(tk);
        if (!m) { errors.push(where + ' c.' + (bi + 1) + ': token inválido "' + tk + '"'); return; }
        const item = m[1], len = m[3] ? parseFloat(m[3]) : defLen;
        const v = m[2] === '!' ? 1.3 : m[2] === '?' ? 0.5 : 1;
        if (item === '.') last = null;
        else if (item === '_') {
          if (last && Math.abs(last.t + last.len - pos) < 1e-6) last.len += len;
          else errors.push(where + ' c.' + (bi + 1) + ': ligadura "_" sem nota anterior');
        } else {
          let data = null;
          if (kind === 'drum') {
            const ks = item.split('+');
            if (ks.every((k) => k.length === 1 && DRUM_KEYS.indexOf(k) >= 0)) data = ks;
          } else if (kind === 'chord') data = parseChord(item);
          else {
            const ms = item.split('+').map(noteMidi);
            if (ms.every((x) => x != null)) data = ms;
          }
          if (!data) errors.push(where + ' c.' + (bi + 1) + ': "' + item + '" não reconhecido');
          else { last = { t: pos, len: len, data: data, v: v }; out.push(last); }
        }
        pos += len;
        sum += len;
      });
      if (Math.abs(sum - STEPS) > 1e-6) errors.push(where + ' compasso ' + (bi + 1) + ': soma ' + sum + ' passos (deveria ser ' + STEPS + ')');
    });
    return { events: out, bars: barStrs.length, steps: pos };
  }

  // Escolhe a inversão do acorde mais próxima do registro alvo (e do acorde anterior).
  function voiceChord(ch, oct, state) {
    const target = 12 * (oct + 1) + 7;
    let best = null, bestScore = Infinity, bestMean = 0;
    for (let o = oct - 1; o <= oct; o++) {
      const base = 12 * (o + 1) + ch.root;
      for (let k = 0; k < ch.iv.length; k++) {
        if (ch.iv[k] >= 12) continue;
        const set = {};
        ch.iv.forEach((iv, i) => { set[base + iv + (i < k && iv < 12 ? 12 : 0)] = 1; });
        const v = Object.keys(set).map(Number).sort((a, b) => a - b);
        const mean = v.reduce((a, b) => a + b, 0) / v.length;
        const score = Math.abs(mean - target) + (state.prev != null ? 0.6 * Math.abs(mean - state.prev) : 0);
        if (score < bestScore) { bestScore = score; best = v; bestMean = mean; }
      }
    }
    state.prev = bestMean;
    return best;
  }

  // Configuração de um canal numa parte: timbre do instrumento < papel do canal
  // < ajustes da faixa < ajustes da parte.
  function insFor(T, P, ch) {
    const tc = (T.ch && T.ch[ch]) || {}, pc = (P && P.cfg && P.cfg[ch]) || {};
    const base = INS_DEF[pc.like || tc.like || ch] || INS_DEF.lead;
    const tInst = tc.inst || base.inst, inst = pc.inst || tInst;
    let tcx = tc;
    if (inst !== tInst) { tcx = {}; KEEP_ON_SWAP.forEach((k) => { if (tc[k] != null) tcx[k] = tc[k]; }); }
    return Object.assign({}, INST_P[inst] || {}, base, tcx, pc, { inst: inst });
  }
  function busFor(T, ch) {
    const tc = (T.ch && T.ch[ch]) || {};
    const B = Object.assign({}, BUS_DEF[tc.like || ch] || BUS_DEF.lead);
    BUS_KEYS.forEach((k) => { if (tc[k] !== undefined) B[k] = tc[k]; });
    return B;
  }
  const kindOf = (ch, ins) => (ch === 'drums' || ins.kind === 'drum' ? 'drum' : ins.mode === 'pad' || ins.mode === 'arp' ? 'chord' : 'note');

  const compiled = {};
  function compile(name) {
    if (compiled[name]) return compiled[name];
    const T = TRACKS[name];
    if (!T) return null;
    const errors = [], events = [], chords = [], parts = [], chans = [], bus = {}, vst = {};
    const sw = T.swing || 0;
    const swing = (s) => {
      const b = Math.floor(s / 4) * 4, p = s - b;
      return b + (p <= 2 ? (p * (2 + sw)) / 2 : 2 + sw + ((p - 2) * (2 - sw)) / 2);
    };
    let offset = 0;
    T.form.forEach((pn) => {
      const P = T.parts[pn];
      if (!P) { errors.push(name + ': parte "' + pn + '" não existe'); return; }
      let partSteps = null;
      const info = { part: pn, bars: 0, channels: {} };
      const names = Object.keys(P).filter((k) => k !== 'cfg');
      const ref = ['pad', 'keys', 'arp'].find((k) => P[k] != null);
      names.forEach((ch) => {
        if (P[ch] == null) return;
        if (chans.indexOf(ch) < 0) { chans.push(ch); bus[ch] = busFor(T, ch); }
        const ins = insFor(T, P, ch);
        const kind = kindOf(ch, ins);
        const r = parseChannel(P[ch], kind, ins.len, name + '.' + pn + '.' + ch, errors);
        info.channels[ch] = r.bars;
        if (partSteps == null) partSteps = r.steps;
        else if (Math.abs(r.steps - partSteps) > 1e-6) {
          errors.push(name + '.' + pn + ': canal ' + ch + ' tem ' + r.bars + ' compassos (' + r.steps + ' passos); esperado ' + partSteps + ' passos');
        }
        if (kind !== 'drum' && !INST[ins.inst]) errors.push(name + '.' + pn + '.' + ch + ': instrumento "' + ins.inst + '" não existe');
        if (kind === 'drum' && ins.kit && !KITS[ins.kit]) errors.push(name + '.' + pn + '.' + ch + ': kit "' + ins.kit + '" não existe');
        const vs = vst[ch] || (vst[ch] = { prev: null });
        r.events.forEach((e) => {
          const t = offset + e.t;
          if (kind === 'drum') events.push({ t: t, len: e.len, ch: ch, type: 'd', drums: e.data, v: e.v, ins: ins });
          else if (kind === 'note') events.push({ t: t, len: e.len, ch: ch, type: 'n', m: e.data, v: e.v / Math.sqrt(e.data.length), ins: ins });
          else {
            if (ch === ref) chords.push({ t: t, len: e.len, root: e.data.root, pcs: e.data.iv.map((i) => (e.data.root + i) % 12) });
            const vo = voiceChord(e.data, ins.oct, vs);
            if (ins.mode === 'pad') events.push({ t: t, len: e.len, ch: ch, type: 'n', m: vo, v: e.v / Math.sqrt(vo.length), ins: ins });
            else {
              const pat = Array.isArray(ins.pattern) ? ins.pattern : ARP[ins.pattern] || ARP.up;
              const rate = ins.rate || 1, n = vo.length;
              for (let i = 0, s = 0; s < e.len - 1e-6; i++, s += rate) {
                const k = pat[i % pat.length];
                events.push({ t: t + s, len: Math.min(rate, e.len - s), ch: ch, type: 'n', m: [vo[k % n] + 12 * Math.floor(k / n)], v: e.v, ins: ins });
              }
            }
          }
        });
      });
      if (partSteps == null) { errors.push(name + '.' + pn + ': parte vazia'); partSteps = 0; }
      info.bars = partSteps / STEPS;
      parts.push(info);
      offset += partSteps;
    });
    events.forEach((e) => {
      e.st = e.t;
      const a = swing(e.t), b = swing(e.t + e.len);
      e.t = a;
      e.d = b - a;
    });
    events.sort((a, b) => a.t - b.t);
    events.forEach((e, i) => { e.i = i; });
    chords.sort((a, b) => a.t - b.t);
    const S = {
      name: name, bpm: T.bpm, key: T.key, mode: T.mode, stepDur: 60 / T.bpm / 4, loopSteps: offset,
      bars: offset / STEPS, seconds: (offset * 60) / T.bpm / 4, events: events, chords: chords, parts: parts,
      form: T.form.slice(), errors: errors, chans: chans, bus: bus, delay: T.delay || null, crackle: T.crackle || 0,
      trim: T.trim || 0,
    };
    compiled[name] = S;
    return S;
  }
  function validate(name) {
    const S = compile(name);
    if (!S) return { name: name, errors: ['faixa inexistente'] };
    return {
      name: name, bpm: S.bpm, key: S.key + ' ' + S.mode, bars: S.bars, seconds: S.seconds, parts: S.parts, form: S.form,
      events: S.events.length, channels: S.chans.slice(), errors: S.errors,
    };
  }

  // =====================================================================
  // 5. Síntese (funciona com qualquer BaseAudioContext: real ou offline)
  // =====================================================================
  const waveCache = new WeakMap();
  function pulseWave(c, duty) {
    let m = waveCache.get(c);
    if (!m) { m = {}; waveCache.set(c, m); }
    if (m[duty]) return m[duty];
    const N = 32, re = new Float32Array(N), im = new Float32Array(N);
    for (let n = 1; n < N; n++) {
      re[n] = Math.sin(2 * Math.PI * n * duty) / (Math.PI * n);
      im[n] = (1 - Math.cos(2 * Math.PI * n * duty)) / (Math.PI * n);
    }
    m[duty] = c.createPeriodicWave(re, im);
    return m[duty];
  }
  function setWave(c, osc, w) {
    if (w === 'pulse12') osc.setPeriodicWave(pulseWave(c, 0.125));
    else if (w === 'pulse25') osc.setPeriodicWave(pulseWave(c, 0.25));
    else if (w === 'square' || w === 'triangle' || w === 'sine' || w === 'sawtooth') osc.type = w;
    else osc.type = 'sine';
  }
  function osc(c, w, f, t) {
    const o = c.createOscillator();
    setWave(c, o, w);
    o.frequency.setValueAtTime(f, t);
    return o;
  }
  function gainNode(c, v) { const g = c.createGain(); g.gain.value = v; return g; }
  function biquad(c, type, f, q) {
    const b = c.createBiquadFilter();
    b.type = type;
    b.frequency.value = f;
    if (q != null) b.Q.value = q;
    return b;
  }
  const noiseCache = new WeakMap();
  function noiseBuf(c) {
    let b = noiseCache.get(c);
    if (b) return b;
    const len = Math.floor(c.sampleRate * 2);
    b = c.createBuffer(1, len, c.sampleRate);
    const d = b.getChannelData(0);
    let s = 0x2f6b1a3;
    for (let i = 0; i < len; i++) {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
      d[i] = ((s >>> 0) / 4294967296) * 2 - 1;
    }
    noiseCache.set(c, b);
    return b;
  }
  // Chiado de vinil: estalinhos esparsos (só na faixa "casa")
  const crackleCache = new WeakMap();
  function crackleBuf(c) {
    let b = crackleCache.get(c);
    if (b) return b;
    const len = Math.floor(c.sampleRate * 2.7);
    b = c.createBuffer(1, len, c.sampleRate);
    const d = b.getChannelData(0);
    let s = 0x51ab3c7;
    const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
    for (let i = 0; i < len - 4; i++) {
      d[i] += (rnd() * 2 - 1) * 0.015;
      if (rnd() < 0.00035) {
        const a = (0.25 + rnd() * 0.75) * (rnd() < 0.5 ? -1 : 1);
        d[i] += a; d[i + 1] -= a * 0.6; d[i + 2] += a * 0.25;
      }
    }
    crackleCache.set(c, b);
    return b;
  }
  // Resposta ao impulso do reverb: sala média e quente (T60 ≈ 2 s), cauda
  // escurecendo com o tempo, pré-atraso de 14 ms e reflexões iniciais.
  const irCache = new WeakMap();
  function getIR(c) {
    let b = irCache.get(c);
    if (b) return b;
    const sr = c.sampleRate, secs = 2.2, len = Math.floor(sr * secs), pre = Math.floor(0.014 * sr), T60 = 1.9;
    b = c.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      let s = (0x1234567 + ch * 0x3779b9) | 0, l1 = 0, l2 = 0, a = 0;
      const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) / 4294967296) * 2 - 1; };
      let e2 = 0;
      for (let i = pre; i < len; i++) {
        const x = (i - pre) / sr;
        if (((i - pre) & 63) === 0) a = Math.exp((-2 * Math.PI * (4800 * Math.exp(-x * 1.3) + 700)) / sr);
        l1 = (1 - a) * rnd() + a * l1;
        l2 = (1 - a) * l1 + a * l2;
        const v = l2 * Math.exp((-x * 6.91) / T60) * Math.min(1, x / 0.025) * (1 - Math.max(0, (i - len + sr * 0.1) / (sr * 0.1)));
        d[i] = v;
        e2 += v * v;
      }
      const k = 1 / Math.sqrt(e2 || 1);
      for (let i = 0; i < len; i++) d[i] *= k;
      [[0.011, 0.16], [0.017, -0.12], [0.023, 0.1], [0.031, -0.09], [0.043, 0.07], [0.057, -0.05]].forEach(([tt, gn], j) => {
        const i = Math.floor((tt + (ch ? 0.0021 : 0) * ((j % 3) + 1)) * sr);
        if (i < len) d[i] += gn * (ch && j % 2 ? -1 : 1);
      });
    }
    irCache.set(c, b);
    return b;
  }
  let clipCurve = null;
  function getClip() { // limitador suave final: linear até 0,8 e teto em ~0,94
    if (clipCurve) return clipCurve;
    const n = 2049;
    clipCurve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1, ax = Math.abs(x);
      clipCurve[i] = ax <= 0.8 ? x : Math.sign(x) * (0.8 + 0.17 * Math.tanh((ax - 0.8) / 0.17));
    }
    return clipCurve;
  }
  let distCurve = null;
  function getDist() {
    if (distCurve) return distCurve;
    const n = 1024, k = 4;
    distCurve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      distCurve[i] = ((1 + k) * x) / (1 + k * Math.abs(x)) * 0.8;
    }
    return distCurve;
  }
  const after = (node) => { try { node.disconnect(); } catch (e) { /* ok */ } };

  // Envelope ADSR com quedas exponenciais (sem cliques). Retorna o fim real.
  function env(p, t, peak, a, d, s, on, r) {
    p.value = 0;
    p.setValueAtTime(0, t);
    p.linearRampToValueAtTime(peak, t + a);
    p.setTargetAtTime(peak * s, t + a, Math.max(0.004, d / 3));
    const rel = t + Math.max(on, a + 0.004);
    p.setTargetAtTime(0, rel, Math.max(0.004, r / 4));
    return rel + r * 1.7 + 0.01;
  }
  const ringOn = (I, dur, dd) => (I.ring ? Math.max(dur * I.gate, dd * I.ring) : dur * I.gate);
  function vibrato(c, oscs, t, end, I) {
    if (!I.vib || end - t < (I.vibDelay || 0.2) + 0.15) return;
    const l = c.createOscillator(), lg = c.createGain();
    l.frequency.value = I.vibRate || 5;
    lg.gain.value = 0;
    lg.gain.setValueAtTime(0, t + (I.vibDelay || 0.2));
    lg.gain.linearRampToValueAtTime(I.vib, t + (I.vibDelay || 0.2) + 0.3);
    l.connect(lg);
    oscs.forEach((o) => lg.connect(o.detune));
    l.start(t);
    l.stop(end);
    l.onended = () => after(lg);
  }
  // "wow" de fita (LFO compartilhado do canal → afinação de cada nota)
  function wowOn(X, oscs) {
    if (!X || !X.wow) return null;
    oscs.forEach((o) => { try { X.wow.connect(o.detune); } catch (e) { /* ok */ } });
    return () => oscs.forEach((o) => { try { X.wow.disconnect(o.detune); } catch (e) { /* ok */ } });
  }
  function bendTo(oscs, t, end, cents) {
    if (!cents) return;
    oscs.forEach((o) => { o.detune.setValueAtTime(o.detune.value, t); o.detune.linearRampToValueAtTime(o.detune.value + cents, end); });
  }

  // ---------------------------------------------------------------------
  // Instrumentos: (ctx, saída, t, duração, freq, I = parâmetros, vel, X = extras
  // do canal) → instante em que a voz termina (para controle de polifonia).
  // ---------------------------------------------------------------------
  const INST = {
    // Piano elétrico FM (portadora + moduladora 1:1, índice decaindo = ataque
    // brilhante que amacia). Notas agudas ganham menos índice (sem aspereza).
    ep(c, out, t, dur, f, I, v, X) {
      const g = c.createGain(), mg = c.createGain();
      const car = osc(c, 'sine', f, t), mod = osc(c, 'sine', f * (I.ratio || 1), t);
      const k = f > 440 ? Math.sqrt(440 / f) : 1;
      const ix = f * I.index * (0.55 + 0.45 * Math.min(1.3, v)) * k;
      mg.gain.value = 0;
      mg.gain.setValueAtTime(ix, t);
      mg.gain.setTargetAtTime(ix * I.indexSus, t + 0.003, I.bdec);
      mod.connect(mg);
      mg.connect(car.frequency);
      car.connect(g);
      g.connect(out);
      const end = env(g.gain, t, I.vol * v, I.a, I.d, I.s, Math.max(0.06, dur * I.gate), I.r);
      let tg = null;
      if (I.tine && f * I.tineR < c.sampleRate * 0.4) { // "tine": brilho curtinho do ataque (2 oitavas acima)
        const to = osc(c, 'sine', f * I.tineR, t);
        tg = c.createGain();
        const te = env(tg.gain, t, I.vol * v * I.tine * Math.min(1.2, v), 0.002, I.tdec, 0, I.tdec, 0.05);
        to.connect(tg);
        tg.connect(out);
        to.start(t);
        to.stop(Math.min(end, te));
      }
      bendTo([car, mod], t + dur * 0.4, t + dur, I.bend);
      vibrato(c, [car], t, end, I);
      const un = wowOn(X, [car, mod]);
      car.start(t); mod.start(t); car.stop(end); mod.stop(end);
      car.onended = () => { after(g); after(mg); if (tg) after(tg); if (un) un(); };
      return end;
    },
    // Pad/cordas: serras (ou outra onda) desafinadas; o filtro fica no canal.
    pad(c, out, t, dur, f, I, v, X) {
      const g = c.createGain(), n = I.voices || 2, oscs = [];
      for (let i = 0; i < n; i++) {
        const o = osc(c, I.wave || 'sawtooth', f, t);
        o.detune.setValueAtTime(n === 1 ? 0 : ((i / (n - 1)) * 2 - 1) * I.det, t);
        o.connect(g);
        oscs.push(o);
      }
      g.connect(out);
      const end = env(g.gain, t, (I.vol * v) / Math.sqrt(n), I.a, I.d, I.s, Math.max(0.1, dur * I.gate), I.r);
      vibrato(c, oscs, t, end, I);
      const un = wowOn(X, oscs);
      oscs.forEach((o) => { o.start(t); o.stop(end); });
      oscs[0].onended = () => { after(g); if (un) un(); };
      return end;
    },
    // Pluck / pizzicato / contrabaixo: onda + passa-baixa com envelope próprio.
    pluck(c, out, t, dur, f, I, v, X) {
      const g = c.createGain(), o = osc(c, I.wave || 'sawtooth', f, t), nyq = c.sampleRate * 0.45;
      let lp = null;
      if (I.fenv) { // envelope de filtro por nota (fenv = 0: só o filtro do canal, mais barato)
        lp = c.createBiquadFilter();
        lp.type = 'lowpass';
        lp.Q.value = I.q || 0.7;
        lp.frequency.setValueAtTime(Math.min(nyq, Math.max(180, f * I.fenv * (0.6 + 0.4 * Math.min(1.3, v)))), t);
        lp.frequency.exponentialRampToValueAtTime(Math.min(nyq, Math.max(120, f * I.fend)), t + I.fdec * 3); // rampa finita: filtro volta a ser barato
        o.connect(lp);
        lp.connect(g);
      } else o.connect(g);
      const oscs = [o];
      let bg = null;
      if (I.body) {
        const o2 = osc(c, 'sine', f, t);
        bg = gainNode(c, I.body);
        o2.connect(bg);
        bg.connect(g);
        oscs.push(o2);
      }
      g.connect(out);
      const dd = I.d;
      const end = env(g.gain, t, I.vol * v, I.a, dd, I.s, Math.max(0.02, ringOn(I, dur, dd)), I.r);
      const un = wowOn(X, oscs);
      oscs.forEach((x) => { x.start(t); x.stop(end); });
      o.onended = () => { after(g); if (lp) after(lp); if (bg) after(bg); if (un) un(); };
      return end;
    },
    // Kalimba: FM com moduladora aguda e índice que some em ~20 ms ("plim").
    kalimba(c, out, t, dur, f, I, v) {
      const g = c.createGain(), mg = c.createGain();
      const car = osc(c, 'sine', f, t), mod = osc(c, 'sine', f * I.ratio, t);
      const ix = f * I.index * Math.min(1.2, v) * (f > 800 ? 800 / f : 1);
      mg.gain.value = 0;
      mg.gain.setValueAtTime(ix, t);
      mg.gain.setTargetAtTime(0, t + 0.001, I.idec);
      mod.connect(mg);
      mg.connect(car.frequency);
      car.connect(g);
      g.connect(out);
      const dd = I.d * Math.max(0.45, Math.min(1.5, Math.sqrt(600 / f)));
      const end = env(g.gain, t, I.vol * v, I.a, dd, 0, ringOn(I, dur, dd), I.r);
      car.start(t); mod.start(t);
      mod.stop(Math.min(end, t + 0.25));
      car.stop(end);
      car.onended = () => { after(g); after(mg); };
      return end;
    },
    // Marimba / vibrafone: fundamental + 4º harmônico que morre rápido.
    marimba(c, out, t, dur, f, I, v) {
      const g1 = c.createGain(), o1 = osc(c, 'sine', f, t);
      const dd = I.d * Math.max(0.45, Math.min(1.6, Math.sqrt(500 / f)));
      const end = env(g1.gain, t, I.vol * v, I.a, dd, 0, ringOn(I, dur, dd), I.r);
      o1.connect(g1);
      g1.connect(out);
      o1.start(t);
      o1.stop(end);
      let g2 = null;
      if (f * 4 < c.sampleRate * 0.45 && I.p4) {
        g2 = c.createGain();
        const o2 = osc(c, 'sine', f * 4, t), e2 = Math.min(end, t + dd * 0.35 + 0.05);
        env(g2.gain, t, I.vol * v * I.p4, 0.001, dd * 0.15, 0, dd * 0.15, 0.05);
        o2.connect(g2);
        g2.connect(out);
        o2.start(t);
        o2.stop(e2);
      }
      o1.onended = () => { after(g1); if (g2) after(g2); };
      return end;
    },
    // Sino / celesta: parciais senoidais com quedas proporcionais.
    bell(c, out, t, dur, f, I, v) {
      const P = I.partials || [[1, 1, 1], [2, 0.25, 0.55]];
      const nyq = c.sampleRate * 0.45, gs = [];
      const dd = I.d * Math.max(0.4, Math.min(1.4, Math.sqrt(1000 / f)));
      let end = t;
      P.forEach(([r, amp, dk]) => {
        if (f * r > nyq) return;
        const g = c.createGain(), o = osc(c, 'sine', f * r, t), d2 = dd * dk;
        const e = env(g.gain, t, I.vol * v * amp, I.a, d2, 0, ringOn(I, dur, d2), I.r * dk);
        o.connect(g);
        g.connect(out);
        o.start(t);
        o.stop(e);
        o.onended = () => after(g);
        gs.push(g);
        if (e > end) end = e;
      });
      return end;
    },
    // Sub-grave: senoide + um pouco de triângulo (aparece em caixinhas pequenas).
    sub(c, out, t, dur, f, I, v, X) {
      const g = c.createGain(), o = osc(c, 'sine', f, t), oscs = [o];
      o.connect(g);
      let tg = null;
      if (I.tri) {
        const o2 = osc(c, 'triangle', f, t);
        tg = gainNode(c, I.tri);
        o2.connect(tg);
        tg.connect(g);
        oscs.push(o2);
      }
      g.connect(out);
      const end = env(g.gain, t, I.vol * v, I.a, I.d, I.s, Math.max(0.05, dur * I.gate), I.r);
      bendTo(oscs, t + dur * 0.3, t + dur, I.bend);
      oscs.forEach((x) => { x.start(t); x.stop(end); });
      o.onended = () => { after(g); if (tg) after(tg); };
      return end;
    },
    // Metais sintéticos: serras desafinadas + filtro que "sopra" no ataque.
    brass(c, out, t, dur, f, I, v) {
      const g = c.createGain(), lp = c.createBiquadFilter(), oscs = [];
      [-1, 1].forEach((s) => {
        const o = osc(c, 'sawtooth', f, t);
        o.detune.setValueAtTime(s * I.det, t);
        o.connect(lp);
        oscs.push(o);
      });
      const nyq = c.sampleRate * 0.45, br = I.bright * (0.7 + 0.3 * Math.min(1.3, v));
      lp.type = 'lowpass';
      lp.Q.value = 0.9;
      lp.frequency.setValueAtTime(Math.min(nyq, f * 1.1), t);
      lp.frequency.linearRampToValueAtTime(Math.min(nyq, 4200, f * br), t + I.a * 1.6);
      lp.frequency.exponentialRampToValueAtTime(Math.min(nyq, 3000, f * br * 0.55), t + I.a * 1.6 + 0.45);
      lp.connect(g);
      g.connect(out);
      const end = env(g.gain, t, I.vol * v * 0.75, I.a, I.d, I.s, Math.max(0.06, dur * I.gate), I.r);
      vibrato(c, oscs, t, end, I);
      oscs.forEach((o) => { o.start(t); o.stop(end); });
      oscs[0].onended = () => { after(g); after(lp); };
      return end;
    },
    // Flauta suave: senoide + triângulo, vibrato atrasado.
    flute(c, out, t, dur, f, I, v, X) {
      const g = c.createGain(), o = osc(c, 'sine', f, t), oscs = [o];
      o.connect(g);
      let tg = null;
      if (I.tri) {
        const o2 = osc(c, 'triangle', f, t);
        tg = gainNode(c, I.tri);
        o2.connect(tg);
        tg.connect(g);
        oscs.push(o2);
      }
      g.connect(out);
      const end = env(g.gain, t, I.vol * v, I.a, I.d, I.s, Math.max(0.06, dur * I.gate), I.r);
      bendTo(oscs, t + dur * 0.4, t + dur, I.bend);
      vibrato(c, oscs, t, end, I);
      oscs.forEach((x) => { x.start(t); x.stop(end); });
      o.onended = () => { after(g); if (tg) after(tg); };
      return end;
    },
  };
  INST.strings = INST.pad;
  INST.upright = INST.pluck;
  INST.vibes = INST.marimba;
  INST.glass = INST.bell;

  // ---------------------------------------------------------------------
  // Utilitários para efeitos: tom com glide e ruído filtrado
  // ---------------------------------------------------------------------
  // o: {w, f, f1 (destino), ft (tempo do glide), lin, d, v, a, r, exp, lp, det, vib, vr}
  function tone(c, out, t, o) {
    const oc = c.createOscillator();
    setWave(c, oc, o.w || 'sine');
    oc.frequency.setValueAtTime(Math.max(20, o.f), t);
    if (o.f1) {
      const tt = t + (o.ft || o.d);
      if (o.lin) oc.frequency.linearRampToValueAtTime(o.f1, tt);
      else oc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), tt);
    }
    if (o.det) oc.detune.setValueAtTime(o.det, t);
    const g = c.createGain(), gg = g.gain, a = o.a != null ? o.a : 0.004, d = Math.max(o.d, a + 0.01), vol = o.v;
    gg.value = 0;
    gg.setValueAtTime(0, t);
    gg.linearRampToValueAtTime(vol, t + a);
    if (o.exp) {
      gg.exponentialRampToValueAtTime(Math.max(1e-4, vol * 0.003), t + d);
      gg.linearRampToValueAtTime(0, t + d + 0.012);
    } else {
      const r = o.r != null ? o.r : Math.min(0.05, d * 0.4);
      gg.setValueAtTime(vol, t + Math.max(a, d - r));
      gg.linearRampToValueAtTime(0, t + d);
    }
    let node = oc, bq = null;
    if (o.lp) {
      bq = biquad(c, 'lowpass', o.lp, 0.7);
      oc.connect(bq);
      node = bq;
    }
    node.connect(g);
    g.connect(out);
    let lg = null;
    if (o.vib) {
      const l = c.createOscillator();
      lg = c.createGain();
      l.frequency.value = o.vr || 6;
      lg.gain.value = o.vib;
      l.connect(lg);
      lg.connect(oc.detune);
      l.start(t);
      l.stop(t + d + 0.03);
    }
    oc.start(t);
    oc.stop(t + d + 0.03);
    oc.onended = () => { after(g); if (bq) after(bq); if (lg) after(lg); };
    return oc;
  }

  // Ruído filtrado. o: {d, v, a, type, f, f1, ft, q, lp2, exp (padrão true), r}
  function noise(c, out, t, o) {
    const src = c.createBufferSource();
    src.buffer = noiseBuf(c);
    src.loop = true;
    let node = src;
    const fl = [];
    if (o.type) {
      const bq = c.createBiquadFilter();
      bq.type = o.type;
      bq.frequency.setValueAtTime(o.f, t);
      if (o.f1) bq.frequency.exponentialRampToValueAtTime(o.f1, t + (o.ft || o.d));
      if (o.q != null) bq.Q.value = o.q;
      node.connect(bq);
      node = bq;
      fl.push(bq);
    }
    if (o.lp2) {
      const b2 = biquad(c, 'lowpass', o.lp2, 0.6);
      node.connect(b2);
      node = b2;
      fl.push(b2);
    }
    const g = c.createGain(), gg = g.gain, a = o.a != null ? o.a : 0.002, d = Math.max(o.d, a + 0.01), vol = o.v;
    gg.value = 0;
    gg.setValueAtTime(0, t);
    gg.linearRampToValueAtTime(vol, t + a);
    if (o.exp !== false) {
      gg.exponentialRampToValueAtTime(Math.max(1e-4, vol * 0.003), t + d);
      gg.linearRampToValueAtTime(0, t + d + 0.01);
    } else {
      const r = o.r != null ? o.r : d * 0.4;
      gg.setValueAtTime(vol, t + Math.max(a, d - r));
      gg.linearRampToValueAtTime(0, t + d);
    }
    node.connect(g);
    g.connect(out);
    src.start(t, (t * 0.37) % 1.5);
    src.stop(t + d + 0.03);
    src.onended = () => { after(g); fl.forEach(after); };
    return src;
  }

  // ---------------------------------------------------------------------
  // Bateria. v = intensidade (0..~1.3); K = kit; side = canal lateral (chimbal/shaker)
  // ---------------------------------------------------------------------
  const KITS = {
    soft: { kf: 1, kd: 0.34, kv: 1, sv: 1, sf: 1900, sd: 0.16, sa: 0.002, slp: 5200, ht: 1, hv: 1, rf: 1 },
    lofi: { kf: 0.92, kd: 0.3, kv: 1.05, sv: 0.85, sf: 1500, sd: 0.15, sa: 0.003, slp: 3200, ht: 0.75, hv: 0.8, rf: 0.8 },
    brush: { kf: 0.95, kd: 0.28, kv: 0.9, sv: 0.7, sf: 1700, sd: 0.24, sa: 0.012, slp: 3600, ht: 0.7, hv: 0.9, rf: 0.85 },
    epic: { kf: 0.86, kd: 0.42, kv: 1.05, sv: 1.1, sf: 1700, sd: 0.22, sa: 0.002, slp: 5200, ht: 1, hv: 0.85, rf: 1 },
  };
  // Receita de cada peça (volumes para v = 1). Componentes: tom {w, f, f1, ft, d, v, a}
  // ou ruído {n:1, d, v, a, type, f, f1, ft, q, lp2}; `at` = atraso dentro da peça.
  function drumRecipe(k, K) {
    switch (k) {
      case 'k': return [ // bumbo macio e redondo
        { w: 'sine', f: 118 * K.kf, f1: 46 * K.kf, ft: 0.08, d: K.kd, v: 0.5 * K.kv, a: 0.002 },
        { n: 1, d: 0.014, v: 0.06, type: 'lowpass', f: 2400 }];
      case 'b': return [ // coração: "tum" grave e abafado
        { w: 'sine', f: 70, f1: 42, ft: 0.08, d: 0.26, v: 0.62, a: 0.006 },
        { n: 1, d: 0.06, v: 0.1, type: 'lowpass', f: 200 }];
      case 's': return [ // caixa lo-fi / escovinha
        { n: 1, d: K.sd, v: 0.3 * K.sv, a: K.sa, type: 'bandpass', f: K.sf, q: 0.6, lp2: K.slp },
        { w: 'triangle', f: 200, f1: 160, ft: 0.05, d: 0.09, v: 0.13 * K.sv }];
      case 'h': return [{ n: 1, d: 0.055, v: 0.34 * K.hv, type: 'bandpass', f: 7600 * K.ht, q: 0.9, lp2: 10000 }];
      case 'o': return [{ n: 1, d: 0.22, v: 0.2 * K.hv, type: 'bandpass', f: 7000 * K.ht, q: 0.8, lp2: 10000 }];
      case 'z': return [{ n: 1, d: 0.08, v: 0.3, a: 0.018, type: 'bandpass', f: 5200 * K.ht, q: 1.3, lp2: 8000 }]; // shaker
      case 'c': return [ // prato suave
        { n: 1, d: 1.6, v: 0.07, a: 0.004, type: 'bandpass', f: 6200, q: 0.5, lp2: 9000 },
        { n: 1, d: 0.5, v: 0.03, type: 'bandpass', f: 3200, q: 0.8 }];
      case 't': return [ // tom
        { w: 'sine', f: 165, f1: 105, ft: 0.18, d: 0.32, v: 0.42, a: 0.002 },
        { n: 1, d: 0.05, v: 0.05, type: 'lowpass', f: 900 }];
      case 'g': return [ // taiko: grave enorme + pele + ar
        { w: 'sine', f: 92, f1: 50, ft: 0.18, d: 0.7, v: 0.66, a: 0.003 },
        { w: 'triangle', f: 175, f1: 110, ft: 0.08, d: 0.2, v: 0.14 },
        { n: 1, d: 0.16, v: 0.2, type: 'lowpass', f: 900, f1: 260, a: 0.002 }];
      case 'r': return [ // aro / cross-stick
        { w: 'triangle', f: 1250 * K.rf, f1: 1050 * K.rf, ft: 0.02, d: 0.05, v: 0.15, a: 0.001 },
        { w: 'sine', f: 470 * K.rf, d: 0.05, v: 0.15, a: 0.001 },
        { n: 1, d: 0.025, v: 0.09, type: 'bandpass', f: 2500, q: 1.2 }];
      case 'x': return [ // bloco de madeira
        { w: 'sine', f: 980, f1: 860, ft: 0.04, d: 0.07, v: 0.15, a: 0.001 },
        { w: 'sine', f: 2650, d: 0.02, v: 0.025, a: 0.001 }];
      case 'p': return [0, 0.01, 0.02].map((at) => ({ n: 1, at: at, d: 0.012, v: 0.12, type: 'bandpass', f: 1300, q: 0.8, lp2: 5000 }))
        .concat([{ n: 1, at: 0.03, d: 0.14, v: 0.11, type: 'bandpass', f: 1300, q: 0.8, lp2: 5000 }]); // palma suave
      case 'n': return [ // estalo de dedo
        { n: 1, d: 0.035, v: 0.22, type: 'bandpass', f: 2300, q: 2.2, a: 0.001 },
        { w: 'sine', f: 1650, f1: 1300, ft: 0.02, d: 0.025, v: 0.04, a: 0.001 }];
      default: return null;
    }
  }
  // Coeficientes RBJ como o BiquadFilterNode (Q em dB para passa-baixa/alta, linear no passa-banda).
  function rbj(type, f, q, sr) {
    const w = (2 * Math.PI * Math.min(f, sr * 0.49)) / sr, cs = Math.cos(w), sn = Math.sin(w);
    let b0, b1, b2, al;
    if (type === 'bandpass') { al = sn / (2 * q); b0 = al; b1 = 0; b2 = -al; }
    else {
      al = sn / (2 * Math.pow(10, q / 20));
      if (type === 'lowpass') { b1 = 1 - cs; b0 = b2 = b1 / 2; } else { b1 = -(1 + cs); b0 = b2 = (1 + cs) / 2; }
    }
    const a0 = 1 + al;
    return [b0 / a0, b1 / a0, b2 / a0, (-2 * cs) / a0, (1 - al) / a0];
  }
  // Renderiza a receita em JS (uma vez) → AudioBuffer mono.
  function renderDrum(c, rec, seed) {
    const sr = c.sampleRate;
    let len = 0;
    rec.forEach((o) => { len = Math.max(len, (o.at || 0) + Math.max(o.d, (o.a || 0.002) + 0.01) + 0.02); });
    const n = Math.ceil(len * sr), buf = c.createBuffer(1, n, sr), out = buf.getChannelData(0);
    let s = (0x2545f491 + seed * 7919) | 0;
    const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) / 4294967296) * 2 - 1; };
    rec.forEach((o) => {
      const a = o.a != null ? o.a : o.n ? 0.002 : 0.004, d = Math.max(o.d, a + 0.01), tail = o.n ? 0.01 : 0.012;
      const i0 = Math.floor((o.at || 0) * sr), m = Math.min(n - i0, Math.ceil((d + tail) * sr));
      const ft = o.ft || d, lnE = Math.log(0.003);
      let ph = 0, x1 = 0, x2 = 0, y1 = 0, y2 = 0, z1 = 0, z2 = 0, w1 = 0, w2 = 0, C = null, C2 = null;
      if (o.n) { C = rbj(o.type, o.f, o.q != null ? o.q : 1, sr); if (o.lp2) C2 = rbj('lowpass', o.lp2, 0.6, sr); }
      for (let i = 0; i < m; i++) {
        const tt = i / sr;
        const g = tt < a ? (o.v * tt) / a : tt <= d ? o.v * Math.exp((lnE * (tt - a)) / (d - a)) : o.v * 0.003 * Math.max(0, 1 - (tt - d) / tail);
        let x;
        if (o.n) {
          if (o.f1 && (i & 31) === 0) C = rbj(o.type, tt < ft ? o.f * Math.pow(o.f1 / o.f, tt / ft) : o.f1, o.q != null ? o.q : 1, sr);
          const xi = rnd();
          let y = C[0] * xi + C[1] * x1 + C[2] * x2 - C[3] * y1 - C[4] * y2;
          x2 = x1; x1 = xi; y2 = y1; y1 = y;
          if (C2) { const yy = C2[0] * y + C2[1] * z1 + C2[2] * z2 - C2[3] * w1 - C2[4] * w2; z2 = z1; z1 = y; w2 = w1; w1 = yy; y = yy; }
          x = y;
        } else {
          const f = o.f1 ? (tt < ft ? o.f * Math.pow(o.f1 / o.f, tt / ft) : o.f1) : o.f;
          ph += f / sr;
          ph -= Math.floor(ph);
          x = o.w === 'triangle' ? 1 - 4 * Math.abs(ph - 0.5) : Math.sin(2 * Math.PI * ph);
        }
        out[i0 + i] += x * g;
      }
    });
    return buf;
  }
  const drumCache = new WeakMap();
  function drumBuf(c, K, k) {
    let m = drumCache.get(c);
    if (!m) { m = new Map(); drumCache.set(c, m); }
    let km = m.get(K);
    if (!km) { km = {}; m.set(K, km); }
    if (km[k] === undefined) {
      const rec = drumRecipe(k, K);
      km[k] = rec ? renderDrum(c, rec, k.charCodeAt(0)) : null;
    }
    return km[k];
  }
  const SIDE_KEYS = 'hoz';
  // Bateria. v = intensidade (0..~1.3); K = kit; side = canal lateral (chimbal/shaker).
  // Cada peça é sintetizada uma única vez por contexto/kit e depois só tocada (CPU baixa).
  function drum(c, out, side, t, k, v, K, dur) {
    K = K || KITS.soft;
    side = side || out;
    dur = dur || 0.25;
    if (k === 'w') { // "swish" de escovinha (depende da duração)
      noise(c, side, t, { d: Math.max(0.15, dur), v: 0.08 * v, a: Math.max(0.05, dur * 0.6), type: 'bandpass', f: 2600, q: 0.7, lp2: 6000, exp: false, r: Math.max(0.06, dur * 0.35) });
      return;
    }
    if (k === 'v') { // prato reverso: cresce até o fim do evento
      const d = Math.max(0.3, dur);
      noise(c, out, t, { d: d, v: 0.07 * v, a: d * 0.94, type: 'bandpass', f: 2200, f1: 6500, ft: d, q: 0.6, lp2: 9000, exp: false, r: 0.04 });
      return;
    }
    const buf = drumBuf(c, K, k);
    if (!buf) return;
    const src = c.createBufferSource(), g = gainNode(c, v);
    src.buffer = buf;
    src.connect(g);
    g.connect(SIDE_KEYS.indexOf(k) >= 0 ? side : out);
    src.start(t);
    src.onended = () => after(g);
  }

  // ---------------------------------------------------------------------
  // Player: toca uma faixa compilada num destino de qualquer contexto.
  // dest._rev (se existir) recebe o envio para o reverb compartilhado.
  // ---------------------------------------------------------------------
  function mkLfo(P, c, rate, depth, param, t0) {
    const o = c.createOscillator(), g = c.createGain();
    o.frequency.value = rate;
    g.gain.value = depth;
    o.connect(g);
    if (param) g.connect(param);
    o.start(Math.max(0, t0));
    P.lfos.push(o);
    P.nodes.push(g);
    return g;
  }
  function Player(c, dest, name, t0, fadeIn) {
    const S = compile(name);
    this.c = c;
    this.S = S;
    this.name = name;
    this.sd = S.stepDur;
    this.L = S.loopSteps * S.stepDur;
    this.t0 = t0;
    this.idx = 0;
    this.loop = 0;
    this.endAt = Infinity;
    this.lfos = [];
    this.nodes = [];
    this.act = {};
    this.wow = {};
    // trim: normalização de loudness da faixa (dB, medida BS.1770 pela cadeia do jogo)
    const lvl = (this.lvl = Math.pow(10, (S.trim || 0) / 20));
    const out = (this.out = c.createGain()), wet = (this.wet = c.createGain());
    [out, wet].forEach((g) => {
      if (fadeIn > 0) {
        g.gain.value = 0;
        g.gain.setValueAtTime(0, Math.min(c.currentTime, t0));
        g.gain.linearRampToValueAtTime(lvl, t0 + fadeIn);
      } else g.gain.value = lvl;
    });
    out.connect(dest);
    let rev = dest && dest._rev;
    if (!rev) { // destino sem reverb compartilhado (testes): reverb próprio
      rev = c.createConvolver();
      rev.normalize = false;
      rev.buffer = getIR(c);
      const rg = gainNode(c, REV_RETURN);
      rev.connect(rg);
      rg.connect(dest);
      this.nodes.push(rev, rg);
    }
    wet.connect(rev);
    const dIn = S.chans.some((ch) => S.bus[ch].dly > 0) ? this.mkDelay(S.delay || {}) : null;
    this.bus = {};
    this.side = {};
    S.chans.forEach((ch) => {
      const B = S.bus[ch], g = c.createGain();
      let node = g;
      this.nodes.push(g);
      if (B.hp) { const f = biquad(c, 'highpass', B.hp, 0.6); node.connect(f); node = f; this.nodes.push(f); }
      if (B.lp) {
        const f = biquad(c, 'lowpass', B.lp, B.lpq || 0.6);
        if (B.lfo) mkLfo(this, c, B.lfo.rate, B.lfo.depth, f.frequency, t0);
        node.connect(f);
        node = f;
        this.nodes.push(f);
      }
      if (B.trem) {
        const tg = gainNode(c, 1 - B.trem.depth / 2);
        mkLfo(this, c, B.trem.rate, B.trem.depth / 2, tg.gain, t0);
        node.connect(tg);
        node = tg;
        this.nodes.push(tg);
      }
      this.toOut(node, B.pan, B.autopan, t0);
      this.send(node, B.rev, wet);
      if (dIn) this.send(node, B.dly, dIn);
      if (B.wow) this.wow[ch] = { wow: mkLfo(this, c, 0.55, B.wow, null, t0) };
      if (ch === 'drums') { // chimbal/shaker levemente para o lado
        const sg = c.createGain();
        this.nodes.push(sg);
        this.toOut(sg, B.side || 0, null, t0);
        this.send(sg, B.rev, wet);
        this.side[ch] = sg;
      }
      this.bus[ch] = g;
    });
    S.events.forEach((e) => { // pré-sintetiza as peças de bateria desta faixa
      if (e.type === 'd') e.drums.forEach((k) => drumBuf(c, KITS[e.ins.kit] || KITS.soft, k));
    });
    if (S.crackle) {
      const src = c.createBufferSource(), hp = biquad(c, 'highpass', 900, 0.5), lp = biquad(c, 'lowpass', 7000, 0.5), g = gainNode(c, S.crackle);
      src.buffer = crackleBuf(c);
      src.loop = true;
      src.connect(hp); hp.connect(lp); lp.connect(g);
      this.toOut(g, 0.1, null, t0);
      src.start(Math.max(0, t0));
      this.lfos.push(src);
      this.nodes.push(hp, lp, g);
    }
  }
  Player.prototype.toOut = function (node, pan, autopan, t0) {
    const c = this.c;
    if ((pan || autopan) && c.createStereoPanner) {
      const p = c.createStereoPanner();
      p.pan.value = pan || 0;
      if (autopan) mkLfo(this, c, autopan.rate, autopan.depth, p.pan, t0);
      node.connect(p);
      p.connect(this.out);
      this.nodes.push(p);
    } else node.connect(this.out);
  };
  Player.prototype.send = function (node, amt, to) {
    if (!amt || !to) return;
    const s = gainNode(this.c, amt);
    node.connect(s);
    s.connect(to);
    this.nodes.push(s);
  };
  // Delay estéreo ping-pong sincronizado ao andamento (padrão: colcheia pontuada).
  Player.prototype.mkDelay = function (cfg) {
    const c = this.c, E = Object.assign({ l: 3, fb: 0.3, mix: 0.5, lp: 2600, hp: 300 }, cfg);
    const inp = c.createGain(), hp = biquad(c, 'highpass', E.hp, 0.5), lp = biquad(c, 'lowpass', E.lp, 0.5);
    const dl = c.createDelay(2), dr = c.createDelay(2), x = gainNode(c, 0.85), fb = gainNode(c, E.fb), mix = gainNode(c, E.mix), ws = gainNode(c, 0.25);
    const T = Math.min(1.9, E.l * this.sd);
    dl.delayTime.value = T;
    dr.delayTime.value = T;
    inp.connect(hp); hp.connect(lp); lp.connect(dl);
    dl.connect(x); x.connect(dr); dr.connect(fb); fb.connect(dl);
    if (c.createChannelMerger) {
      const m = c.createChannelMerger(2);
      dl.connect(m, 0, 0);
      dr.connect(m, 0, 1);
      m.connect(mix);
      this.nodes.push(m);
    } else { dl.connect(mix); dr.connect(mix); }
    mix.connect(this.out);
    mix.connect(ws);
    ws.connect(this.wet);
    this.nodes.push(inp, hp, lp, dl, dr, x, fb, mix, ws);
    return inp;
  };
  Player.prototype.pump = function (until) {
    const ev = this.S.events, n = ev.length, c = this.c;
    if (!n || !this.L) return;
    const now = c.currentTime;
    for (let guard = 0; guard < 6000; guard++) {
      const e = ev[this.idx];
      let t = this.t0 + this.loop * this.L + e.t * this.sd;
      if (t >= until || t >= this.endAt) break;
      if (t < now - 0.2) { // a aba travou: continua de onde parou, sem atropelar notas
        this.t0 += now + 0.03 - t;
        t = now + 0.03;
      }
      try { this.play(e, Math.max(t, now)); } catch (err) { /* nota perdida não derruba a música */ }
      if (++this.idx >= n) { this.idx = 0; this.loop++; }
    }
  };
  Player.prototype.play = function (e, t) {
    const c = this.c, h = hsh(e.i), dur = e.d * this.sd;
    if (e.type === 'd') {
      const vol = e.v * (e.ins.vol == null ? 1 : e.ins.vol) * (0.9 + 0.2 * h);
      const K = KITS[e.ins.kit] || KITS.soft;
      for (let i = 0; i < e.drums.length; i++) drum(c, this.bus[e.ch], this.side[e.ch], t, e.drums[i], vol, K, dur);
      return;
    }
    const ins = e.ins, fn = INST[ins.inst] || INST.ep, out = this.bus[e.ch];
    const act = this.act[e.ch] || (this.act[e.ch] = []);
    for (let i = act.length - 1; i >= 0; i--) if (act[i] <= t) act.splice(i, 1);
    const cap = ins.poly || 12, v = e.v * (0.95 + 0.1 * h);
    for (let i = 0; i < e.m.length; i++) {
      if (act.length >= cap) break; // limite de polifonia: descarta em vez de estourar a CPU
      act.push(fn(c, out, t, dur, mtof(e.m[i]), ins, v, this.wow[e.ch]));
    }
  };
  Player.prototype.fadeOut = function (d) {
    const c = this.c, now = c.currentTime;
    [this.out, this.wet].forEach((n) => {
      const g = n.gain;
      try {
        g.cancelScheduledValues(now);
        g.setValueAtTime(g.value, now);
        g.linearRampToValueAtTime(0, now + d);
      } catch (e) { /* ok */ }
    });
    this.endAt = now + d;
  };
  Player.prototype.dispose = function () {
    after(this.out);
    after(this.wet);
    this.lfos.forEach((o) => { try { o.stop(); } catch (e) { /* ok */ } after(o); });
    this.nodes.forEach(after);
    this.lfos = [];
    this.nodes = [];
  };

  // =====================================================================
  // 6. Efeitos sonoros — cada um: (ctx, saída, t, pitch) → duração (s)
  // =====================================================================
  const nf = (n) => mtof(noteMidi(n));
  // Toca uma nota avulsa num instrumento (timbre padrão + ajustes).
  function nt(c, out, t, inst, f, dur, o) {
    const I = Object.assign({ vol: 0.15 }, INST_P[inst], o);
    return INST[inst](c, out, t, Math.max(0.02, dur), f, I, 1, null);
  }
  // Sequência curta em tokens (sem barras): 'C5 E5 G5:2 C6+E6:4'
  function seq(c, out, t, str, o) {
    const step = o.step || 0.1, p = o.p || 1, inst = o.inst || 'marimba', vol = o.vol || 0.15;
    let pos = 0;
    str.trim().split(/\s+/).forEach((tk) => {
      const m = TOK_RE.exec(tk);
      if (!m) return;
      const len = m[3] ? parseFloat(m[3]) : 1, acc = m[2] === '!' ? 1.25 : m[2] === '?' ? 0.55 : 1;
      if (m[1] !== '.') {
        const ms = m[1].split('+').map(noteMidi).filter((x) => x != null);
        const vv = (vol * acc) / Math.sqrt(ms.length || 1);
        ms.forEach((mm) => nt(c, out, t + pos * step, inst, mtof(mm) * p, len * step * (o.gate || 1) + (o.tail || 0), Object.assign({}, o, { vol: vv })));
      }
      pos += len;
    });
    return pos * step + (o.tail || 0);
  }
  const SPARK = ['C7', 'G6', 'E7', 'A6', 'D7', 'G7'].map(nf);
  const sparkle = (c, o, t, p, vol, gap) => SPARK.forEach((f, i) => nt(c, o, t + i * (gap || 0.05), 'bell', f * p, 0.1, { vol: vol, d: 0.9 }));
  // pad de triângulos (efeitos não passam pelo filtro de canal)
  const softPad = (c, o, t, notes, dur, vol, p, a) => notes.split(' ').forEach((n) => nt(c, o, t, 'pad', nf(n) * p, dur, { wave: 'triangle', vol: vol, a: a || 0.08, r: 0.5, det: 6 }));

  const SFX = {
    click: (c, o, t, p) => { // botão físico (despertador, interruptor): "tic" + "clac" suave da volta
      noise(c, o, t, { d: 0.018, v: 0.15, type: 'bandpass', f: 2600 * p, q: 1.4, lp2: 7000 });
      tone(c, o, t, { w: 'sine', f: 1150 * p, f1: 700 * p, ft: 0.015, d: 0.03, v: 0.09, a: 0.001, exp: true });
      tone(c, o, t, { w: 'sine', f: 210 * p, f1: 150 * p, ft: 0.03, d: 0.045, v: 0.08, a: 0.002, exp: true });
      noise(c, o, t + 0.05, { d: 0.012, v: 0.06, type: 'bandpass', f: 3400 * p, q: 1.6, lp2: 8000 });
      tone(c, o, t + 0.05, { w: 'sine', f: 1480 * p, d: 0.018, v: 0.03, a: 0.001, exp: true });
      return 0.12;
    },
    blip: (c, o, t, p) => { nt(c, o, t, 'kalimba', 1319 * p, 0.05, { vol: 0.14, d: 0.16, index: 1.1 }); return 0.22; },
    select: (c, o, t, p) => {
      nt(c, o, t, 'marimba', 1047 * p, 0.05, { vol: 0.2, d: 0.22 });
      nt(c, o, t + 0.055, 'marimba', 1568 * p, 0.05, { vol: 0.17, d: 0.28 });
      return 0.4;
    },
    confirm: (c, o, t, p) => {
      seq(c, o, t, 'C6 G6:3', { inst: 'marimba', step: 0.065, vol: 0.22, p: p, d: 0.4 });
      nt(c, o, t + 0.065, 'bell', 2093 * p, 0.2, { vol: 0.035, d: 0.6 });
      return 0.6;
    },
    cancel: (c, o, t, p) => seq(c, o, t, 'G5 D5:3', { inst: 'marimba', step: 0.07, vol: 0.2, p: p, d: 0.3 }) + 0.2,
    back: (c, o, t, p) => {
      tone(c, o, t, { w: 'sine', f: 600 * p, f1: 360 * p, ft: 0.09, d: 0.12, v: 0.16, a: 0.004, exp: true });
      nt(c, o, t, 'marimba', 587 * p, 0.05, { vol: 0.08, d: 0.25 });
      return 0.3;
    },
    success: (c, o, t, p) => {
      seq(c, o, t, 'C5 E5 G5 C6:6', { inst: 'ep', step: 0.07, vol: 0.2, p: p, d: 1.2, index: 1.1, tail: 0.4 });
      seq(c, o, t + 0.21, 'E6 G6 C7:4', { inst: 'bell', step: 0.05, vol: 0.05, p: p, d: 1.0 });
      softPad(c, o, t + 0.2, 'C4 E4 G4 B4 D5', 0.6, 0.035, p, 0.1);
      seq(c, o, t, 'C3:3 C2:6', { inst: 'sub', step: 0.07, vol: 0.22, p: p });
      return 1.4;
    },
    fail: (c, o, t, p) => {
      seq(c, o, t, 'E5:2 C5:2', { inst: 'ep', step: 0.1, vol: 0.18, p: p, index: 0.9 });
      nt(c, o, t + 0.4, 'ep', 440 * p, 0.55, { vol: 0.18, index: 0.9, bend: -70 });
      seq(c, o, t, 'A2:4 F2:7', { inst: 'sub', step: 0.1, vol: 0.2, p: p });
      return 1.3;
    },
    error: (c, o, t, p) => {
      seq(c, o, t, 'A4 Ab4:2', { inst: 'pluck', wave: 'triangle', fenv: 4, fend: 1.2, d: 0.2, step: 0.11, vol: 0.28, p: p });
      tone(c, o, t, { w: 'sine', f: 150 * p, f1: 110 * p, ft: 0.2, d: 0.26, v: 0.16, exp: true });
      return 0.42;
    },
    coin: (c, o, t, p) => {
      nt(c, o, t, 'glass', 988 * p, 0.07, { vol: 0.13, d: 0.5 });
      nt(c, o, t + 0.07, 'glass', 1319 * p, 0.3, { vol: 0.14, d: 0.9 });
      return 0.9;
    },
    notify: (c, o, t, p) => { // aviso de celular moderno: duas notas de vidro
      seq(c, o, t, 'E6 B6:3', { inst: 'glass', step: 0.09, vol: 0.13, p: p, d: 1.1 });
      seq(c, o, t, 'E5 B5:3', { inst: 'kalimba', step: 0.09, vol: 0.09, p: p });
      return 1.2;
    },
    email: (c, o, t, p) => {
      noise(c, o, t, { d: 0.18, v: 0.06, a: 0.07, type: 'bandpass', f: 700, f1: 3000, q: 1, lp2: 6000, exp: false });
      seq(c, o, t + 0.15, 'G6 C7:3', { inst: 'glass', step: 0.09, vol: 0.11, p: p, d: 1.0 });
      return 1.3;
    },
    alarm: (c, o, t, p) => seq(c, o, t, 'C6 E6 G6 E6', { inst: 'marimba', step: 0.08, vol: 0.2, p: p, d: 0.3 }) + 0.3,
    phone_ring: (c, o, t, p) => { // toque de celular: frase de marimba (repete a cada 2,6 s em loop)
      const ph = 'E6 B5 E6 G#6 F#6:2 B5:2 E6 B5 E6 G#6 B6:4';
      seq(c, o, t, ph, { inst: 'marimba', step: 0.095, vol: 0.2, p: p, d: 0.45 });
      seq(c, o, t, ph, { inst: 'bell', step: 0.095, vol: 0.025, p: p * 2, d: 0.4 });
      seq(c, o, t, 'E4+B4:8 E4+G#4:6', { inst: 'kalimba', step: 0.095, vol: 0.08, p: p });
      return 1.9;
    },
    phone_vibrate: (c, o, t, p) => {
      [0, 0.45].forEach((dt) => {
        tone(c, o, t + dt, { w: 'sine', f: 150 * p, d: 0.32, v: 0.16, a: 0.02, r: 0.04 });
        tone(c, o, t + dt, { w: 'sine', f: 157 * p, d: 0.32, v: 0.14, a: 0.02, r: 0.04 });
        tone(c, o, t + dt, { w: 'triangle', f: 300 * p, d: 0.32, v: 0.03, a: 0.02, lp: 500, r: 0.04 });
        noise(c, o, t + dt, { d: 0.32, v: 0.04, a: 0.02, type: 'lowpass', f: 260, exp: false, r: 0.04 });
      });
      return 0.8;
    },
    whoosh: (c, o, t, p) => {
      let dst = o, pn = null;
      if (c.createStereoPanner) {
        pn = c.createStereoPanner();
        pn.pan.setValueAtTime(-0.6, t);
        pn.pan.linearRampToValueAtTime(0.6, t + 0.45);
        pn.connect(o);
        dst = pn;
      }
      const src = noise(c, dst, t, { d: 0.44, v: 0.3, a: 0.17, type: 'bandpass', f: 380 * p, f1: 2400 * p, ft: 0.36, q: 1.1, lp2: 6000, exp: false, r: 0.22 });
      if (pn) { const prev = src.onended; src.onended = () => { if (prev) prev(); after(pn); }; }
      return 0.5;
    },
    sparkle: (c, o, t, p) => {
      sparkle(c, o, t, p, 0.055, 0.05);
      noise(c, o, t, { d: 0.5, v: 0.012, a: 0.2, type: 'bandpass', f: 7000, q: 1, exp: false, r: 0.25 });
      return 1.2;
    },
    hit: (c, o, t, p) => {
      tone(c, o, t, { w: 'sine', f: 150 * p, f1: 55 * p, ft: 0.1, d: 0.2, v: 0.5, a: 0.002, exp: true });
      tone(c, o, t, { w: 'triangle', f: 320 * p, f1: 130 * p, ft: 0.06, d: 0.08, v: 0.1, exp: true });
      noise(c, o, t, { d: 0.12, v: 0.3, type: 'lowpass', f: 2200 * p, f1: 500 * p });
      return 0.25;
    },
    crit: (c, o, t, p) => {
      SFX.hit(c, o, t, p);
      nt(c, o, t + 0.01, 'glass', 1760 * p, 0.2, { vol: 0.1, d: 0.6 });
      SFX.hit(c, o, t + 0.08, p * 0.8);
      return 0.7;
    },
    heal: (c, o, t, p) => {
      seq(c, o, t, 'C6 E6 G6 C7 E7 G7:4', { inst: 'bell', step: 0.06, vol: 0.07, p: p, d: 1.0 });
      seq(c, o, t, 'C5 E5 G5 C6 E6 G6:4', { inst: 'kalimba', step: 0.06, vol: 0.1, p: p });
      softPad(c, o, t, 'C4 G4 E5', 0.7, 0.035, p, 0.2);
      return 1.3;
    },
    heart: (c, o, t, p) => { // corações (momento de carinho): "tum-tum" macio + kalimba + celesta em Fá maj7
      [0, 0.16].forEach((dt, i) => tone(c, o, t + dt, { w: 'sine', f: 92 * p, f1: 62 * p, ft: 0.08, d: 0.16, v: i ? 0.1 : 0.13, a: 0.006, exp: true }));
      nt(c, o, t, 'kalimba', nf('E5') * p, 0.2, { vol: 0.1 });
      nt(c, o, t + 0.16, 'kalimba', nf('A5') * p, 0.2, { vol: 0.09 });
      seq(c, o, t + 0.3, 'C6 E6 A6:4', { inst: 'bell', step: 0.075, vol: 0.06, p: p, d: 1.1 });
      softPad(c, o, t, 'F4 A4 C5 E5', 0.9, 0.028, p, 0.12);
      return 1.4;
    },
    heart_lose: (c, o, t, p) => { // descida triste com a última nota "murchando"
      seq(c, o, t, 'A5:2 E5:2 C5:2', { inst: 'ep', step: 0.09, vol: 0.17, p: p, index: 0.9 });
      nt(c, o, t + 0.54, 'ep', 440 * p, 0.6, { vol: 0.17, index: 0.9, bend: -60 });
      seq(c, o, t, 'A2:6 F2:8', { inst: 'sub', step: 0.09, vol: 0.2, p: p });
      return 1.4;
    },
    typing: (c, o, t, p) => {
      [0, 0.065, 0.12, 0.2, 0.255, 0.33, 0.4].forEach((dt, i) => {
        noise(c, o, t + dt, { d: 0.022, v: 0.09, type: 'bandpass', f: (1900 + (i % 3) * 450) * p, q: 1.3, lp2: 5500 });
        tone(c, o, t + dt, { w: 'sine', f: (250 - (i % 2) * 30) * p, f1: 180 * p, ft: 0.02, d: 0.03, v: 0.06, a: 0.001, exp: true });
      });
      return 0.45;
    },
    page: (c, o, t, p) => {
      noise(c, o, t, { d: 0.22, v: 0.14, a: 0.06, type: 'bandpass', f: 900 * p, f1: 3200 * p, q: 0.7, lp2: 5500, exp: false, r: 0.1 });
      noise(c, o, t + 0.14, { d: 0.08, v: 0.035, type: 'highpass', f: 4000, lp2: 8000 });
      return 0.3;
    },
    star: (c, o, t, p) => {
      nt(c, o, t, 'glass', 1568 * p, 0.2, { vol: 0.12, d: 0.9 });
      nt(c, o, t + 0.07, 'glass', 2349 * p, 0.2, { vol: 0.09, d: 1.0 });
      nt(c, o, t, 'kalimba', 784 * p, 0.2, { vol: 0.08 });
      return 1.1;
    },
    achievement: (c, o, t, p) => { // fanfarra: metais, celesta, taikos e prato
      const st = 0.075;
      seq(c, o, t, 'G4+C5+E5:2 G4+C5+E5:1 .:1 A4+C5+F5:2 B4+D5+G5:2 C5+E5+G5+C6:8', { inst: 'brass', step: st, vol: 0.2, p: p, gate: 0.9, vib: 8 });
      seq(c, o, t, 'C2:4 F2:2 G2:2 C2:8', { inst: 'sub', step: st, vol: 0.22, p: p });
      drum(c, o, o, t, 'g', 0.7, KITS.epic);
      drum(c, o, o, t + st * 8, 'g', 0.9, KITS.epic);
      drum(c, o, o, t + st * 8, 'c', 1.1, KITS.epic);
      sparkle(c, o, t + st * 8, p, 0.04, 0.05);
      return 1.9;
    },
    rewind: (c, o, t, p) => { // fita voltando: chiado e pitch subindo com "wow" rápido
      const oc = c.createOscillator(), g = c.createGain(), l = c.createOscillator(), lg = c.createGain(), bq = c.createBiquadFilter();
      oc.type = 'triangle';
      oc.frequency.setValueAtTime(300 * p, t);
      oc.frequency.exponentialRampToValueAtTime(1400 * p, t + 0.7);
      l.frequency.setValueAtTime(14, t);
      l.frequency.linearRampToValueAtTime(30, t + 0.7);
      lg.gain.setValueAtTime(100 * p, t);
      lg.gain.linearRampToValueAtTime(320 * p, t + 0.7);
      l.connect(lg);
      lg.connect(oc.frequency);
      bq.type = 'lowpass';
      bq.frequency.value = 2400;
      g.gain.value = 0;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.03, t + 0.05);
      g.gain.linearRampToValueAtTime(0.14, t + 0.66);
      g.gain.linearRampToValueAtTime(0, t + 0.72);
      oc.connect(bq);
      bq.connect(g);
      g.connect(o);
      oc.start(t); l.start(t);
      oc.stop(t + 0.75); l.stop(t + 0.75);
      oc.onended = () => { after(g); after(bq); after(lg); };
      noise(c, o, t, { d: 0.72, v: 0.06, a: 0.6, type: 'bandpass', f: 1200, f1: 4000, q: 1, lp2: 6000, exp: false, r: 0.06 });
      return 0.8;
    },
    thunder: (c, o, t, p) => { // estalo seco + trovão rolando com corpo na região média (aparece em alto-falante pequeno)
      noise(c, o, t, { d: 0.3, v: 0.2, type: 'highpass', f: 1700 * p, lp2: 7000 });
      noise(c, o, t, { d: 0.22, v: 0.2, type: 'bandpass', f: 1100 * p, q: 0.5 });
      noise(c, o, t + 0.03, { d: 2.4, v: 0.5, a: 0.03, type: 'lowpass', f: 1500 * p, f1: 170 * p, ft: 1.7 });
      noise(c, o, t + 0.3, { d: 2.1, v: 0.32, a: 0.35, type: 'bandpass', f: 300 * p, f1: 160 * p, q: 0.6, exp: false, r: 1.2 });
      tone(c, o, t, { w: 'sine', f: 64 * p, f1: 38 * p, ft: 0.5, d: 0.9, v: 0.3, a: 0.01, exp: true });
      return 2.6;
    },
    step: (c, o, t, p) => {
      noise(c, o, t, { d: 0.06, v: 0.22, type: 'lowpass', f: 450 * p });
      tone(c, o, t, { w: 'sine', f: 140 * p, f1: 70 * p, d: 0.07, v: 0.2, exp: true });
      return 0.1;
    },
    jump: (c, o, t, p) => {
      tone(c, o, t, { w: 'sine', f: 320 * p, f1: 720 * p, ft: 0.14, d: 0.17, v: 0.2, r: 0.05 });
      tone(c, o, t, { w: 'triangle', f: 320 * p, f1: 720 * p, ft: 0.14, d: 0.15, v: 0.04, lp: 1800, r: 0.05 });
      return 0.2;
    },
    pop: (c, o, t, p) => {
      tone(c, o, t, { w: 'sine', f: 380 * p, f1: 1000 * p, ft: 0.05, d: 0.07, v: 0.28, exp: true });
      noise(c, o, t, { d: 0.015, v: 0.05, type: 'bandpass', f: 3000, q: 1 });
      return 0.1;
    },
    buzz: (c, o, t, p) => {
      tone(c, o, t, { w: 'triangle', f: 110 * p, d: 0.36, v: 0.2, lp: 700, a: 0.01 });
      tone(c, o, t, { w: 'triangle', f: 116.5 * p, d: 0.36, v: 0.2, lp: 700, a: 0.01 });
      tone(c, o, t, { w: 'sine', f: 220 * p, d: 0.36, v: 0.05, a: 0.01 });
      return 0.42;
    },
    tick: (c, o, t, p) => {
      tone(c, o, t, { w: 'sine', f: 1900 * p, f1: 1700 * p, ft: 0.02, d: 0.035, v: 0.1, a: 0.001, exp: true });
      noise(c, o, t, { d: 0.012, v: 0.05, type: 'bandpass', f: 3500 * p, q: 2 });
      return 0.06;
    },
    glitch: (c, o, t, p) => {
      [880, 220, 1760, 440, 1320, 110, 660, 1980, 330, 1100, 165, 1500].forEach((f, i) => {
        if (i % 3 === 2) noise(c, o, t + i * 0.028, { d: 0.02, v: 0.06, type: 'bandpass', f: 2500, q: 0.8 });
        else tone(c, o, t + i * 0.028, { w: i % 2 ? 'triangle' : 'pulse25', f: f * p, d: 0.024, v: 0.045, a: 0.001, r: 0.004, lp: 4000 });
      });
      return 0.37;
    },
    confetti: (c, o, t, p) => {
      SFX.pop(c, o, t, p);
      noise(c, o, t + 0.01, { d: 0.15, v: 0.1, type: 'bandpass', f: 3000, q: 0.5, lp2: 7000 });
      sparkle(c, o, t + 0.08, p, 0.045, 0.035);
      return 1.0;
    },
    drumroll: (c, o, t, p) => {
      const n = 26;
      for (let i = 0; i < n; i++) drum(c, o, o, t + i * 0.042, 's', 0.2 + (0.6 * i) / n, KITS.soft);
      const e = t + n * 0.042 + 0.02;
      drum(c, o, o, e, 'g', 1, KITS.epic);
      drum(c, o, o, e, 's', 1, KITS.soft);
      drum(c, o, o, e, 'c', 1.4, KITS.soft);
      return e - t + 1.2;
    },
    magic: (c, o, t, p) => { // corrida de tons inteiros na celesta + brilho
      const run = 'C6 D6 E6 F#6 G#6 A#6 C7:4';
      seq(c, o, t, run, { inst: 'bell', step: 0.045, vol: 0.09, p: p, d: 0.9 });
      seq(c, o, t + 0.16, run, { inst: 'bell', step: 0.045, vol: 0.035, p: p, d: 0.9 });
      softPad(c, o, t, 'C5 E5 G#5', 0.6, 0.03, p, 0.25);
      noise(c, o, t, { d: 0.7, v: 0.012, a: 0.3, type: 'bandpass', f: 6500, q: 1, exp: false, r: 0.35 });
      return 1.3;
    },
    door: (c, o, t, p) => { // rangido + baque
      const oc = c.createOscillator(), bq = c.createBiquadFilter(), g = c.createGain(), l = c.createOscillator(), lg = c.createGain();
      oc.type = 'sawtooth';
      oc.frequency.setValueAtTime(95 * p, t);
      oc.frequency.linearRampToValueAtTime(140 * p, t + 0.22);
      oc.frequency.linearRampToValueAtTime(85 * p, t + 0.45);
      l.frequency.value = 17;
      lg.gain.value = 45;
      l.connect(lg);
      lg.connect(oc.detune);
      bq.type = 'bandpass';
      bq.frequency.value = 800;
      bq.Q.value = 3;
      g.gain.value = 0;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.12, t + 0.05);
      g.gain.setValueAtTime(0.12, t + 0.38);
      g.gain.linearRampToValueAtTime(0, t + 0.46);
      oc.connect(bq);
      bq.connect(g);
      g.connect(o);
      oc.start(t); l.start(t);
      oc.stop(t + 0.48); l.stop(t + 0.48);
      oc.onended = () => { after(g); after(bq); after(lg); };
      noise(c, o, t + 0.47, { d: 0.18, v: 0.35, type: 'lowpass', f: 260 });
      tone(c, o, t + 0.47, { w: 'sine', f: 95 * p, f1: 55 * p, d: 0.2, v: 0.3, exp: true });
      return 0.7;
    },
    coffee: (c, o, t, p) => { // borbulhar da cafeteira
      noise(c, o, t, { d: 0.75, v: 0.04, a: 0.1, type: 'bandpass', f: 1100, q: 1.5, exp: false, r: 0.2 });
      [[0, 520], [0.07, 700], [0.16, 610], [0.21, 820], [0.3, 560], [0.38, 900], [0.43, 680], [0.52, 760], [0.6, 640]].forEach(([dt, f]) => {
        tone(c, o, t + dt, { w: 'sine', f: f * p, f1: f * 1.6 * p, ft: 0.035, d: 0.045, v: 0.11, a: 0.003, r: 0.015 });
      });
      return 0.8;
    },
    card: (c, o, t, p) => {
      noise(c, o, t, { d: 0.08, v: 0.16, a: 0.005, type: 'bandpass', f: 2200 * p, f1: 4500 * p, q: 0.8, lp2: 7000 });
      tone(c, o, t + 0.01, { w: 'sine', f: 1400 * p, d: 0.025, v: 0.05, exp: true });
      return 0.1;
    },
    drop: (c, o, t, p) => {
      tone(c, o, t, { w: 'sine', f: 1000 * p, f1: 200 * p, ft: 0.22, d: 0.24, v: 0.18, r: 0.03 });
      noise(c, o, t + 0.23, { d: 0.08, v: 0.22, type: 'lowpass', f: 400 });
      tone(c, o, t + 0.23, { w: 'sine', f: 110 * p, f1: 60 * p, d: 0.1, v: 0.25, exp: true });
      return 0.38;
    },
    pickup: (c, o, t, p) => seq(c, o, t, 'G5 C6 E6 G6:3', { inst: 'kalimba', step: 0.045, vol: 0.17, p: p }) + 0.5,
    level_up: (c, o, t, p) => {
      seq(c, o, t, 'C5 E5 G5 C6 E6 G6 C7:6', { inst: 'ep', step: 0.055, vol: 0.16, p: p, index: 1.1, d: 1.2 });
      seq(c, o, t, 'C3:3 G2:3 C2:7', { inst: 'sub', step: 0.055, vol: 0.22, p: p });
      softPad(c, o, t + 0.33, 'C4 G4 E5 B5', 0.6, 0.03, p, 0.08);
      sparkle(c, o, t + 0.36, p, 0.035, 0.04);
      return 1.4;
    },
    boss_hit: (c, o, t, p) => {
      drum(c, o, o, t, 'g', 1.2 * Math.min(1.3, p), KITS.epic);
      noise(c, o, t, { d: 0.3, v: 0.32, type: 'lowpass', f: 2000 * p, f1: 300 * p });
      tone(c, o, t, { w: 'sine', f: 70 * p, f1: 38 * p, d: 0.35, v: 0.45, exp: true });
      noise(c, o, t, { d: 0.05, v: 0.12, type: 'bandpass', f: 3000, q: 0.8 });
      return 0.8;
    },
    boss_heal: (c, o, t, p) => { // cura sombria (menor, subindo, com vibrato)
      softPad(c, o, t, 'A3 C4 E4', 0.9, 0.045, p, 0.3);
      seq(c, o, t, 'A3 C4 E4 A4 C5 E5:4', { inst: 'flute', step: 0.09, vol: 0.14, p: p, vib: 25, vibRate: 6, vibDelay: 0.05, tail: 0.15 });
      tone(c, o, t, { w: 'sine', f: 110 * p, f1: 220 * p, ft: 0.8, d: 0.9, v: 0.08, a: 0.1, r: 0.2 });
      return 1.4;
    },
    boss_roar: (c, o, t, p) => { // rugido: serras graves saturadas + filtro ressonante fechando (rosnado na região média)
      const ws = c.createWaveShaper(), bq = c.createBiquadFilter(), g = c.createGain(), am = c.createGain(), l = c.createOscillator(), lg = c.createGain();
      ws.curve = getDist();
      bq.type = 'lowpass';
      bq.Q.value = 4;
      bq.frequency.setValueAtTime(1100, t);
      bq.frequency.exponentialRampToValueAtTime(260, t + 1.25);
      am.gain.value = 0.6;
      l.frequency.value = 23;
      lg.gain.value = 0.4;
      l.connect(lg);
      lg.connect(am.gain);
      g.gain.value = 0;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.16, t + 0.12);
      g.gain.setValueAtTime(0.16, t + 0.8);
      g.gain.linearRampToValueAtTime(0, t + 1.25);
      [82, 87].forEach((f) => {
        const oc = c.createOscillator();
        oc.type = 'sawtooth';
        oc.frequency.setValueAtTime(f * p, t);
        oc.frequency.exponentialRampToValueAtTime(f * 0.7 * p, t + 1.25);
        oc.connect(ws);
        oc.start(t);
        oc.stop(t + 1.28);
      });
      ws.connect(bq);
      bq.connect(am);
      am.connect(g);
      g.connect(o);
      l.start(t);
      l.stop(t + 1.28);
      l.onended = () => { after(g); after(ws); after(bq); after(am); after(lg); };
      noise(c, o, t, { d: 1.2, v: 0.16, a: 0.1, type: 'lowpass', f: 500, f1: 150, exp: false, r: 0.4 });
      noise(c, o, t, { d: 1.1, v: 0.1, a: 0.08, type: 'bandpass', f: 900 * p, f1: 350 * p, q: 1.2, exp: false, r: 0.45 }); // fôlego
      return 1.35;
    },
    shrink: (c, o, t, p) => {
      tone(c, o, t, { w: 'triangle', f: 1100 * p, f1: 140 * p, ft: 0.55, d: 0.58, v: 0.1, vib: 40, vr: 14, lp: 2500 });
      tone(c, o, t, { w: 'sine', f: 550 * p, f1: 70 * p, ft: 0.55, d: 0.58, v: 0.15 });
      return 0.62;
    },
    camera: (c, o, t, p) => {
      noise(c, o, t, { d: 0.025, v: 0.22, type: 'bandpass', f: 3500, q: 0.7, lp2: 8000 });
      tone(c, o, t, { w: 'sine', f: 1800 * p, d: 0.01, v: 0.04, a: 0.001, exp: true });
      noise(c, o, t + 0.08, { d: 0.06, v: 0.22, type: 'bandpass', f: 1800, q: 1 });
      tone(c, o, t + 0.08, { w: 'sine', f: 300 * p, d: 0.03, v: 0.1, exp: true });
      return 0.2;
    },
    chime: (c, o, t, p) => {
      nt(c, o, t, 'bell', 1319 * p, 0.3, { vol: 0.13, d: 2.0 });
      nt(c, o, t + 0.12, 'bell', 1976 * p, 0.3, { vol: 0.09, d: 1.8 });
      return 2.0;
    },
    jingle_capitulo: (c, o, t, p) => { // o motivo do Tema da Faísca (E–G–C', B–D'–C') + Cadd9
      const st = 0.085;
      seq(c, o, t, 'E5:3 G5:1 C6:4 B5:2 D6:2 C6:8', { inst: 'ep', step: st, vol: 0.2, p: p, d: 1.4, tail: 0.3 });
      seq(c, o, t, 'E6:3 G6:1 C7:4 B6:2 D7:2 C7:8', { inst: 'bell', step: st, vol: 0.03, p: p, d: 1.0 });
      softPad(c, o, t + st * 12, 'C4 E4 G4 D5', st * 8 + 0.2, 0.035, p, 0.15);
      seq(c, o, t, 'C2:8 G1:4 C2:8', { inst: 'sub', step: st, vol: 0.22, p: p });
      drum(c, o, o, t, 'k', 0.7);
      drum(c, o, o, t + st * 2, 'z', 0.8);
      drum(c, o, o, t + st * 4, 'r', 0.8);
      drum(c, o, o, t + st * 6, 'z', 0.8);
      drum(c, o, o, t + st * 8, 'k', 0.7);
      drum(c, o, o, t + st * 10, 'r', 0.6);
      drum(c, o, o, t + st * 12, 'k', 0.8);
      drum(c, o, o, t + st * 12, 'c', 0.9);
      return st * 20 + 0.5;
    },
    jingle_vitoria: (c, o, t, p) => { // C – Dm7 – G – C, "ta-ta-ta TAAA" subindo
      const st = 0.085;
      seq(c, o, t, 'G5 G5 G5 C6:3 A5 A5 A5 D6:3 B5 C6 D6 E6:8', { inst: 'brass', step: st, vol: 0.12, p: p, gate: 0.85, tail: 0.15 });
      seq(c, o, t, 'E5 E5 E5 G5:3 F5 F5 F5 A5:3 G5 A5 B5 C6:8', { inst: 'brass', step: st, vol: 0.08, p: p, gate: 0.85, tail: 0.15 });
      seq(c, o, t + st * 15, 'E6 G6 C7:4', { inst: 'bell', step: 0.05, vol: 0.04, p: p, d: 1.0 });
      seq(c, o, t, 'C2:6 D2:6 G1:3 C2:8', { inst: 'sub', step: st, vol: 0.22, p: p });
      [[0, 'g'], [3, 's'], [6, 'g'], [9, 's'], [12, 'g'], [13, 's'], [14, 's'], [15, 'g'], [15, 'c']].forEach(([s, k]) => drum(c, o, o, t + s * st, k, 0.75, KITS.epic));
      return 2.7;
    },
    jingle_fato: (c, o, t, p) => { // "você sabia?": celesta subindo e parando na 9ª (curiosidade)
      const st = 0.09;
      seq(c, o, t, 'E6 G6 C7:2 B6 D7:6', { inst: 'bell', step: st, vol: 0.09, p: p, d: 1.2, tail: 0.6 });
      seq(c, o, t, 'E5 G5 C6:2 B5 D6:6', { inst: 'kalimba', step: st, vol: 0.08, p: p });
      softPad(c, o, t, 'C4 G4 B4 E5', st * 11, 0.03, p, 0.12);
      return 2.0;
    },
  };
  // Quanto de cada efeito vai para o reverb (o resto é seco)
  const SFX_REV = {
    click: 0.04, blip: 0.04, select: 0.06, tick: 0.03, typing: 0.03, card: 0.05, step: 0.03, camera: 0.04, pop: 0.08,
    sparkle: 0.45, magic: 0.5, notify: 0.3, chime: 0.4, star: 0.3, coin: 0.2, email: 0.25, heal: 0.35,
    success: 0.25, achievement: 0.3, level_up: 0.3, jingle_capitulo: 0.3, jingle_vitoria: 0.3, jingle_fato: 0.35,
    heart: 0.35, boss_hit: 0.2, boss_heal: 0.3, boss_roar: 0.2, thunder: 0.3, phone_ring: 0.18, confetti: 0.25,
  };
  const SFX_REV_DEF = 0.12;
  // Ajuste fino de nível (dB) por efeito, medido em loudness momentânea (BS.1770) contra a música:
  // micro-UI audível sem incomodar, e os efeitos frequentes de acerto/erro sem estourar.
  const SFX_TRIM = {
    click: 5, tick: 3, typing: 4, card: 3, camera: 2, glitch: 4, whoosh: 3, page: 2,
    success: -3, fail: -2.5, heart_lose: -2.5, boss_heal: -2.5, buzz: -2, pickup: -1.5,
    boss_roar: 3.5, // o ataque da Dúvida precisa atravessar o 'chefao'
  };

  // =====================================================================
  // 7. Vozes (blips de diálogo) — bem suaves: tocam o tempo todo
  // =====================================================================
  // Níveis calibrados (BS.1770, 20 blips/s, volume de efeitos padrão): todas entre −30 e −33 LUFS
  // (~12–15 LU abaixo da música). Vozes graves ganham harmônicos (h2–h4) para aparecerem em
  // alto-falantes pequenos sem ficarem mais altas que as agudas no fone de ouvido.
  const VOICES = {
    pai: { f: 185, h2: 0.5, h3: 0.2, h4: 0.06, v: 0.0404, d: 0.05, off: [0, 2, -2, 3, 0, -1, 4, 1] },
    filho: { f: 277, h2: 0.3, h3: 0.06, v: 0.0405, d: 0.042, off: [0, 3, 5, 2, -2, 4, 7, 0] },
    faisca: { f: 880, fm: 2, idx: 0.5, glide: 1.06, v: 0.0291, d: 0.045, wet: 0.25, off: [0, 4, 7, 2, 9, 4, 12, 7] },
    chefe: { f: 165, h2: 0.5, h3: 0.2, h4: 0.06, v: 0.0433, d: 0.045, off: [0, 0, 2, -2, 0, 3, -1, 0] },
    jorge: { f: 247, h2: 0.3, h3: 0.06, bounce: 1.12, v: 0.0366, d: 0.05, off: [0, 5, 2, 7, 4, 9, 0, 5] },
    golpista: { f: 131, h2: 0.6, h3: 0.3, h4: 0.1, det: 22, detA: 0.35, wob: 25, v: 0.032, d: 0.055, off: [0, -1, 1, -2, 0, 1, -3, 0] },
    duvida: { f: 147, h2: 0.5, h3: 0.22, h4: 0.07, wob: 40, wobR: 9, v: 0.0389, d: 0.06, off: [0, -3, 2, -5, 0, 3, -2, 1] },
    narrador: { f: 523, h2: 0.12, v: 0.0377, d: 0.035, off: [0, 2, 4, 2, -1, 0, 5, 3] },
  };
  function voiceAt(c, out, t, who, k) {
    const V = VOICES[who] || VOICES.narrador;
    const f = V.f * Math.pow(2, V.off[k % V.off.length] / 12);
    const d = V.d, a = 0.005, hold = t + a + d * 0.3, end = hold + d * 0.3 * 6;
    const g = c.createGain();
    g.gain.value = 0;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(V.v, t + a);
    g.gain.setValueAtTime(V.v, hold);
    g.gain.setTargetAtTime(0, hold, d * 0.3);
    g.connect(out);
    const extra = [];
    const mk = (freq, amp) => {
      const o = c.createOscillator();
      o.frequency.setValueAtTime(freq, t);
      if (V.glide) o.frequency.exponentialRampToValueAtTime(freq * V.glide, end);
      if (V.bounce) {
        o.frequency.linearRampToValueAtTime(freq * V.bounce, t + d * 0.4);
        o.frequency.linearRampToValueAtTime(freq, end);
      }
      if (amp !== 1) {
        const gg = gainNode(c, amp);
        o.connect(gg);
        gg.connect(g);
        extra.push(gg);
      } else o.connect(g);
      o.start(t);
      o.stop(end);
      return o;
    };
    const o1 = mk(f, 1);
    if (V.det) mk(f, V.detA || 0.7).detune.value = V.det;
    if (V.h2) mk(f * 2, V.h2);
    if (V.h3) mk(f * 3, V.h3);
    if (V.h4) mk(f * 4, V.h4);
    if (V.fm) {
      const m = c.createOscillator(), mg = c.createGain();
      m.frequency.value = f * V.fm;
      mg.gain.value = 0;
      mg.gain.setValueAtTime(f * V.idx, t);
      mg.gain.setTargetAtTime(0, t, d * 0.4);
      m.connect(mg);
      mg.connect(o1.frequency);
      m.start(t);
      m.stop(end);
      extra.push(mg);
    }
    if (V.wob) {
      const l = c.createOscillator(), lg = gainNode(c, V.wob);
      l.frequency.value = V.wobR || 13;
      l.connect(lg);
      lg.connect(o1.detune);
      l.start(t);
      l.stop(end);
      extra.push(lg);
    }
    if (V.wet && out._rev) {
      const s = gainNode(c, V.wet);
      g.connect(s);
      s.connect(out._rev);
      extra.push(s);
    }
    o1.onended = () => { after(g); extra.forEach(after); };
    return end - t;
  }

  // =====================================================================
  // 8. Cadeia de saída e runtime (AudioContext real)
  // =====================================================================
  const MUSIC_SCALE = 0.62, SFX_SCALE = 0.85, DUCK = 0.35, REV_RETURN = 0.5, MASTER = 0.9;
  // music/sfx → master → compressor (cola) → limitador → clip suave → saída.
  // Os envios de reverb (mWet/sWet) seguem o volume de cada barramento.
  function buildChain(c) {
    const music = c.createGain(), sfx = c.createGain(), mWet = c.createGain(), sWet = c.createGain();
    const master = gainNode(c, MASTER), revIn = c.createGain();
    revIn.channelCount = 1; // reverb alimentado em mono: convolução bem mais barata
    revIn.channelCountMode = 'explicit';
    const rhp = biquad(c, 'highpass', 220, 0.5), rlp = biquad(c, 'lowpass', 6500, 0.5);
    const conv = c.createConvolver();
    conv.normalize = false;
    conv.buffer = getIR(c);
    const revRet = gainNode(c, REV_RETURN);
    mWet.connect(revIn);
    sWet.connect(revIn);
    revIn.connect(rhp);
    rhp.connect(rlp);
    rlp.connect(conv);
    conv.connect(revRet);
    revRet.connect(master);
    music.connect(master);
    sfx.connect(master);
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 10;
    comp.ratio.value = 2.5;
    comp.attack.value = 0.01;
    comp.release.value = 0.25;
    const lim = c.createDynamicsCompressor();
    lim.threshold.value = -3;
    lim.knee.value = 0;
    lim.ratio.value = 20;
    lim.attack.value = 0.001;
    lim.release.value = 0.1;
    const clip = c.createWaveShaper();
    clip.curve = getClip();
    master.connect(comp);
    comp.connect(lim);
    lim.connect(clip);
    clip.connect(c.destination);
    music._rev = mWet;
    sfx._rev = sWet;
    return { master: master, comp: comp, lim: lim, clip: clip, music: music, sfx: sfx, mWet: mWet, sWet: sWet, rev: conv };
  }
  function setParam(p, v, c, ramp) {
    const now = c.currentTime;
    try {
      p.cancelScheduledValues(now);
      p.setValueAtTime(p.value, now);
      p.linearRampToValueAtTime(v, now + (ramp || 0.05));
    } catch (e) { p.value = v; }
  }
  // Efeito com saída própria (volume, stop) + envio para o reverb.
  function sfxOut(c, dest, name, vol) {
    const out = gainNode(c, vol * (SFX_TRIM[name] ? Math.pow(10, SFX_TRIM[name] / 20) : 1));
    out.connect(dest);
    let s = null;
    if (dest._rev) {
      s = gainNode(c, SFX_REV[name] != null ? SFX_REV[name] : SFX_REV_DEF);
      out.connect(s);
      s.connect(dest._rev);
    }
    return { out: out, send: s };
  }

  const A = (P2.audio = P2.audio || {});
  let ctx = null, chain = null, supported = true, enabled = true, ducked = false, hiddenPause = false;
  const vols = { music: 0.7, sfx: 0.8 };
  let player = null, timer = null, offTimer = null, voiceN = 0, lastVoice = -1, resumeAt = -1e9;
  const fading = [], lastSfx = {}, loops = [], live = [];
  const MAX_LIVE_SFX = 32;
  A.current = null;

  const ready = () => !!(ctx && chain && enabled);
  // Pede ao navegador para retomar o contexto (assíncrono). Efeitos disparados logo depois
  // (o clique que destravou o áudio) ainda são agendados; fora dessa janela, contexto parado = silêncio
  // (evita uma rajada de efeitos acumulados quando o sistema devolve o áudio).
  function resumeCtx() {
    if (!ctx || ctx.state === 'running' || ctx.state === 'closed') return;
    resumeAt = Date.now();
    const r = ctx.resume();
    if (r && r.catch) r.catch(() => {});
  }
  function applyVolumes(ramp) {
    if (!ctx || !chain) return;
    const m = vols.music * MUSIC_SCALE * (ducked ? DUCK : 1), s = vols.sfx * SFX_SCALE;
    setParam(chain.music.gain, m, ctx, ramp);
    setParam(chain.mWet.gain, m, ctx, ramp);
    setParam(chain.sfx.gain, s, ctx, ramp);
    setParam(chain.sWet.gain, s, ctx, ramp);
  }
  function tick() {
    try {
      if (!ctx) return;
      if (ctx.state === 'running') {
        const until = ctx.currentTime + 0.22; // folga para engasgos do thread principal (cena 3D)
        if (player) player.pump(until);
        for (let i = fading.length - 1; i >= 0; i--) {
          const f = fading[i];
          if (ctx.currentTime > f.endAt + 0.4) { f.dispose(); fading.splice(i, 1); }
          else f.pump(until);
        }
      }
      if (!player && !fading.length && timer) { clearInterval(timer); timer = null; }
    } catch (e) { /* nunca derruba o jogo */ }
  }
  function ensureTimer() { if (!timer) timer = setInterval(tick, 25); }
  function startPlayer(name, fade) {
    if (!ready() || !name) return;
    player = new Player(ctx, chain.music, name, ctx.currentTime + 0.06, fade);
    ensureTimer();
    tick();
  }
  function stopPlayer(fade) {
    if (!player) return;
    player.fadeOut(fade);
    fading.push(player);
    player = null;
    ensureTimer();
  }
  function killAll() {
    if (player) { player.dispose(); player = null; }
    while (fading.length) fading.pop().dispose();
    if (timer) { clearInterval(timer); timer = null; }
  }

  A.init = function () {
    try {
      if (!supported) return false;
      if (!ctx) {
        const C = window.AudioContext || window.webkitAudioContext;
        if (!C) { supported = false; return false; }
        try { ctx = new C({ latencyHint: 'interactive' }); } catch (e) { ctx = new C(); }
        chain = buildChain(ctx);
        chain.master.gain.value = enabled ? MASTER : 0;
        applyVolumes(0.01);
        try { // destrava o áudio no iOS com um buffer mudo
          const b = ctx.createBufferSource();
          b.buffer = ctx.createBuffer(1, 1, 22050);
          b.connect(ctx.destination);
          b.start(0);
        } catch (e) { /* ok */ }
      }
      if (enabled && !document.hidden) resumeCtx();
      if (enabled && A.current && !player) startPlayer(A.current, 0.6);
      return true;
    } catch (e) {
      return false;
    }
  };

  A.setEnabled = function (on) {
    on = !!on;
    if (on === enabled) return;
    enabled = on;
    try {
      if (!ctx) return;
      clearTimeout(offTimer);
      if (!on) {
        setParam(chain.master.gain, 0, ctx, 0.08);
        stopPlayer(0.08);
        A.stopSfx();
        offTimer = setTimeout(() => {
          try {
            if (enabled) return;
            killAll();
            ctx.suspend();
          } catch (e) { /* ok */ }
        }, 200);
      } else {
        killAll();
        if (!document.hidden) resumeCtx();
        setParam(chain.master.gain, MASTER, ctx, 0.1);
        if (A.current) startPlayer(A.current, 0.5);
      }
    } catch (e) { /* ok */ }
  };

  A.setVolumes = function (o) {
    try {
      if (!o) return;
      const cl = (x) => Math.max(0, Math.min(1, +x));
      if (o.music != null && isFinite(o.music)) vols.music = cl(o.music);
      if (o.sfx != null && isFinite(o.sfx)) vols.sfx = cl(o.sfx);
      applyVolumes(0.08);
    } catch (e) { /* ok */ }
  };

  A.duck = function (on) {
    ducked = !!on;
    try { applyVolumes(0.25); } catch (e) { /* ok */ }
  };

  A.music = function (name, opts) {
    try {
      opts = opts || {};
      if (name != null && !TRACKS[name]) return;
      const fade = opts.fade != null && isFinite(opts.fade) ? Math.max(0.02, +opts.fade) : 0.8;
      const same = (name || null) === A.current;
      if (same && (player || !ready()) && !opts.restart) return;
      A.current = name || null;
      if (!ready()) return; // guarda o nome; começa no init()/setEnabled(true)
      stopPlayer(fade);
      if (name) startPlayer(name, fade);
    } catch (e) { /* ok */ }
  };

  function release(o, fadeT) {
    const i = live.indexOf(o);
    if (i >= 0) live.splice(i, 1);
    if (fadeT) { try { setParam(o.gain, 0, ctx, fadeT); } catch (e) { /* ok */ } }
  }
  A.sfx = function (name, opts) {
    try {
      if (!ready() || !SFX[name]) return null;
      if (ctx.state !== 'running' && (hiddenPause || Date.now() - resumeAt > 1500)) return null;
      opts = opts || {};
      const now = ctx.currentTime;
      if (!opts.loop && lastSfx[name] != null && now - lastSfx[name] < 0.03 && now >= lastSfx[name]) return null;
      lastSfx[name] = now;
      const pitch = Math.max(0.25, Math.min(4, opts.pitch != null && isFinite(opts.pitch) ? +opts.pitch : 1));
      const vol = Math.max(0, Math.min(2, opts.vol != null && isFinite(opts.vol) ? +opts.vol : 1));
      const h = { stopped: false, timer: null, outs: [] };
      const fire = () => {
        if (h.stopped || !ready()) return;
        while (live.length >= MAX_LIVE_SFX) release(live[0], 0.03); // rouba o efeito mais antigo
        const so = sfxOut(ctx, chain.sfx, name, vol), out = so.out;
        live.push(out);
        const dur = SFX[name](ctx, out, ctx.currentTime + 0.005, pitch) || 0.5;
        h.outs.push(out);
        setTimeout(() => {
          release(out);
          after(out);
          if (so.send) after(so.send);
          const i = h.outs.indexOf(out);
          if (i >= 0) h.outs.splice(i, 1);
        }, (dur * (pitch < 1 ? 1 / Math.sqrt(pitch) : 1) + 0.6) * 1000); // pitch grave = caudas mais longas
        if (opts.loop) {
          const every = opts.every || { phone_ring: 2.6, phone_vibrate: 1.4, alarm: 0.9 }[name] || dur + 0.25;
          h.timer = setTimeout(fire, every * 1000);
        }
      };
      h.stop = function () {
        h.stopped = true;
        clearTimeout(h.timer);
        h.outs.forEach((g) => { try { setParam(g.gain, 0, ctx, 0.05); } catch (e) { /* ok */ } });
        const i = loops.indexOf(h);
        if (i >= 0) loops.splice(i, 1);
      };
      fire();
      if (opts.loop) loops.push(h);
      return h;
    } catch (e) {
      return null;
    }
  };
  A.stopSfx = function () { loops.slice().forEach((h) => h.stop()); };

  A.voice = function (who) {
    try {
      if (!ready() || ctx.state !== 'running') return;
      const now = ctx.currentTime;
      if (lastVoice >= 0 && now - lastVoice < 0.045 && now >= lastVoice) return;
      lastVoice = now;
      const out = ctx.createGain();
      out.connect(chain.sfx);
      out._rev = chain.sWet;
      const d = voiceAt(ctx, out, now + 0.003, who, voiceN++);
      setTimeout(() => after(out), (d + 0.3) * 1000);
    } catch (e) { /* ok */ }
  };

  A.isEnabled = () => enabled;
  A.isReady = () => !!ctx;
  A.getVolumes = () => ({ music: vols.music, sfx: vols.sfx });
  A.tracks = Object.keys(TRACKS);
  A.sfxNames = Object.keys(SFX);
  A.voices = Object.keys(VOICES);

  // Pausa tudo quando a aba fica oculta (e retoma ao voltar).
  try {
    document.addEventListener('visibilitychange', function () {
      try {
        if (!ctx) return;
        if (document.hidden) {
          if (ctx.state === 'running') { hiddenPause = true; ctx.suspend(); }
        } else {
          // volta à aba: retoma se fomos nós que pausamos (ou se o som foi ligado com a aba oculta)
          const was = hiddenPause;
          hiddenPause = false;
          if (enabled && (was || ctx.state !== 'running')) resumeCtx();
        }
      } catch (e) { /* ok */ }
    });
  } catch (e) { /* ok */ }

  // Ferramentas internas (testes/renderização offline). Não usar no jogo.
  A._lib = {
    TRACKS: TRACKS, SFX: SFX, VOICES: VOICES, CHORDS: CHORDS, INST: INST, INST_P: INST_P, KITS: KITS,
    noteMidi: noteMidi, mtof: mtof, parseChord: parseChord, compile: compile, validate: validate,
    buildChain: buildChain, Player: Player, getIR: getIR,
    MUSIC_SCALE: MUSIC_SCALE, SFX_SCALE: SFX_SCALE, DUCK: DUCK,
    // volumes da cadeia sem rampa (renderização offline)
    setLevels: function (ch, music, sfx) {
      ch.music.gain.value = ch.mWet.gain.value = music * MUSIC_SCALE;
      ch.sfx.gain.value = ch.sWet.gain.value = sfx * SFX_SCALE;
    },
    renderTrack: function (c, dest, name, secs) { const p = new Player(c, dest, name, 0.02, 0); p.pump(secs); return p; },
    playSfx: function (c, dest, name, t, pitch) {
      if (!SFX[name]) return 0;
      const so = sfxOut(c, dest, name, 1);
      return SFX[name](c, so.out, t, pitch || 1);
    },
    playVoice: function (c, dest, who, t, k) { return voiceAt(c, dest, t, who, k || 0); },
    ctx: () => ctx,
    chain: () => chain,
    state: () => ({
      ctx: ctx ? ctx.state : null, time: ctx ? ctx.currentTime : 0, player: player ? player.name : null,
      fading: fading.length, timer: !!timer, enabled: enabled, ducked: ducked, voices: voiceN, loops: loops.length,
      liveSfx: live.length, music: chain ? chain.music.gain.value : null, master: chain ? chain.master.gain.value : null,
    }),
  };
})();
