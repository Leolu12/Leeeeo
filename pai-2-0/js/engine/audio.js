/* PAI 2.0 — audio.js
 * Chiptune em WebAudio puro: trilhas (sequenciador com lookahead), efeitos
 * sonoros e "vozes" (blips de máquina de escrever). Nenhum arquivo de áudio.
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
 *   ITEM   lead/bass/harm(notes): nota  C5, F#4, Bb3, ou dupla  C5+E5
 *          harm (modo arp/pad):   cifra C, Am, G7, Fmaj7, Dm9, Bbmaj7, A7sus4,
 *                                 Em7b5, Bdim7, Fmaj7#11, G/B (baixo da barra é ignorado)
 *          drums: k bumbo, b batida de coração, s caixa, h chimbal, o chimbal
 *                 aberto, c prato, t tom, x bloco/aro, z shaker, p palma;
 *                 simultâneos com '+':  k+c
 *          '.' pausa    '_' liga (prolonga a nota anterior)    '%' repete o compasso
 *   '!' acento (mais forte)   '?' nota fantasma (mais fraca)
 *   DUR    duração em passos (1 = semicolcheia, 2 = colcheia, 4 = semínima,
 *          16 = semibreve). Sem DUR usa o padrão do canal (`len`).
 *   A soma de cada compasso precisa dar 16 — _lib.validate() confere.
 *   Canais: lead (melodia), harm (acordes: arpejo/pad, ou contracanto), bass
 *   (triângulo) e drums (ruído/seno). Uma faixa = partes (A, B, …) + `form`
 *   (ordem em loop). `swing` (0..0.67) atrasa as colcheias do contratempo.
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
  const DRUM_KEYS = 'kbshoctxzp';
  const STEPS = 16; // passos por compasso (4/4 em semicolcheias)

  // =====================================================================
  // 2. Instrumentos padrão por canal (cada faixa/parte pode sobrescrever)
  //    wave: pulse12 | pulse25 | pulse50 (quadrada) | triangle | sine | sawtooth
  //    a/d/s/r: envelope (s = fração do pico), gate = fração da duração soando,
  //    vib = vibrato em cents (entra após vibDelay s), lp = passa-baixa no canal.
  // =====================================================================
  const INS_DEF = {
    lead: { wave: 'pulse25', vol: 0.1, a: 0.008, d: 0.12, s: 0.72, r: 0.07, gate: 0.92, vib: 12, vibRate: 5.4, vibDelay: 0.2, len: 2 },
    harm: { wave: 'pulse12', vol: 0.04, a: 0.004, d: 0.09, s: 0.55, r: 0.05, gate: 0.85, mode: 'arp', rate: 1, pattern: 'up', oct: 4, len: 16 },
    bass: { wave: 'triangle', vol: 0.22, a: 0.004, d: 0.1, s: 0.85, r: 0.04, gate: 0.85, len: 2 },
    drums: { vol: 1, len: 2 },
  };
  const ARP = {
    up: [0, 1, 2, 3], down: [3, 2, 1, 0], updown: [0, 1, 2, 3, 2, 1], alberti: [0, 2, 1, 2],
    broken: [0, 2, 1, 3], up8: [0, 1, 2, 3, 4, 5, 4, 3], triad: [0, 1, 2], pendulo: [0, 2, 3, 2],
  };
  const CH = ['lead', 'harm', 'bass', 'drums'];

  // =====================================================================
  // 3. As trilhas
  // =====================================================================
  const bars = function () { return Array.prototype.slice.call(arguments).join(' | '); };
  const rep = (bar, n) => Array(n).fill(bar).join(' | ');
  // baixo "motor" em semicolcheias (grave grave agudo grave) x4
  const drive = (lo, hi) => Array(4).fill(lo + ':1 ' + lo + ':1 ' + hi + ':1 ' + lo + ':1').join(' ');
  // baixo pulsante em colcheias com oitava
  const oct8 = (lo, hi) => [lo, lo, hi, lo, lo, lo, hi, lo].map((n) => n + ':2').join(' ');
  // acordes curtos nos tempos 2 e 4 / em todos os contratempos
  const stab24 = (c) => '.:4 ' + c + ':2 .:2 .:4 ' + c + ':2 .:2';
  const skank = (c) => Array(4).fill('.:2 ' + c + ':2').join(' ');

  const PAD = { mode: 'pad', wave: 'pulse25', vol: 0.03, a: 0.09, d: 0.3, s: 0.8, r: 0.35, gate: 0.98 };

  // --- Tema da Faísca (titulo): E-G-C' pontuado sobe como faísca, B-G-E desce.
  const TEMA = bars(
    'E5:3 G5:1 C6:4 B5:2 G5:2 E5:4', //        C
    'D5:3 G5:1 B5:4 A5:2 G5:2 D5:4', //        G   (sequência um grau abaixo)
    'C5:2 E5:2 A5:4 G5:2 E5:2 C5:2 D5:2', //   Am
    'F5:6 E5:2 D5:4 C5:4', //                  F
    'E5:3 G5:1 C6:4 B5:2 G5:2 E5:4', //        C
    'D5:3 G5:1 B5:4 D6:2 C6:2 B5:4', //        G   (variação: sobe)
    'A5:2 C6:2 A5:2 F5:2 G5:2 B5:2 D6:2 B5:2', // F G
    'C6:8 .:2 G5:2 E5:2 D5:2' //               C   (anacruse volta ao E5)
  );
  const TEMA_H = bars('C', 'G', 'Am', 'F', 'C', 'G', 'F:8 G:8', 'C');
  const TEMA_B = bars(
    'C3 C3 G2 G2 C3 C3 E3 G3', 'G2 G2 D3 D3 G2 G2 B2 D3', 'A2 A2 E3 E3 A2 A2 C3 E3', 'F2 F2 C3 C3 F2 F2 A2 C3',
    'C3 C3 G2 G2 C3 C3 E3 G3', 'G2 G2 D3 D3 G2 A2 B2 G2', 'F2 F2 A2 C3 G2 G2 B2 D3', 'C3:4 G2:2 C3:2 .:2 G2:2 A2:2 B2:2'
  );
  const POP = 'k h s h k k s h';

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
  const MANHA_B = bars(
    'F2:6 C3:2 A2:4 G2:4', 'A2:6 E3:2 A2:4 C3:4', 'Bb2:6 F2:2 Bb2:4 A2:4', 'C3:6 G2:2 C3:4 E2:4',
    'F2:6 C3:2 A2:4 C3:4', 'D3:6 A2:2 F2:4 A2:4', 'G2:6 D3:2 G2:4 Bb2:4', 'C3:6 G2:2 C3:4 E2:4'
  );

  const TRAB_L = bars(
    'D5:2 G5:2 .:1 G5:1 A5:2 B5:3 A5:1 G5:2 E5:2', //  G
    'F#5:3 D5:3 B4:2 .:2 D5:2 F#5:2 A5:2', //          Bm7
    'G5:3 E5:3 C5:2 .:2 B4:2 C5:2 E5:2', //            Cmaj7
    'D5:6 .:2 A4:2 B4:2 C5:2 C#5:2', //                D
    'D5:2 G5:2 .:1 G5:1 A5:2 B5:3 A5:1 G5:2 E5:2', //  G
    'F#5:3 A5:3 B5:2 .:2 A5:2 B5:2 D6:2', //           Bm7
    'C6:3 B5:3 A5:2 G5:2 E5:2 G5:2 A5:2', //           Am7
    'G5:4 F#5:2 E5:2 F#5:2 A5:2 .:4' //                D7sus4 D7
  );
  const TRAB_H = bars(skank('G'), skank('Bm7'), skank('Cmaj7'), skank('D'), skank('G'), skank('Bm7'), skank('Am7'),
    '.:2 D7sus4:2 .:2 D7:2 .:2 D7:2 .:2 D7:2');
  const TRAB_B = bars(
    'G2:3 G2:3 D3:2 .:2 G2:2 A2:2 B2:2', 'B2:3 B2:3 F#2:2 .:2 B2:2 A2:2 B2:2', 'C3:3 C3:3 G2:2 .:2 C3:2 B2:2 A2:2',
    'D3:3 D3:3 A2:2 .:2 D3:2 C3:2 B2:2', 'G2:3 G2:3 D3:2 .:2 G2:2 A2:2 B2:2', 'B2:3 B2:3 F#2:2 .:2 B2:2 A2:2 B2:2',
    'A2:3 A2:3 E2:2 .:2 A2:2 B2:2 C3:2', 'D3:3 D3:3 A2:2 .:2 C3:2 B2:2 A2:2'
  );
  const GROOVE = 'k:2 h:2 s:2 h:1 k:1 h:2 k:2 s:2 h:1 h?:1';
  const GROOVE_FILL = 'k:2 h:2 s:2 h:1 k:1 s:1 s:1 s:1 s:1 t:2 t:2';

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
  const MIST_D = 'k h? x h? k h? x h?';

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
    'Ab2:6 Eb3:2 .:2 Ab2:2 G2:4', 'G2:6 D3:2 .:2 G2:2 F2:4', 'F2:6 C3:2 .:2 F2:2 Ab2:4', 'Bb2:6 F2:2 .:2 Bb2:2 D3:4',
    'Eb3:6 Bb2:2 .:2 Eb3:2 D3:4', 'C3:6 G2:2 .:2 C3:2 G2:4', 'F2:6 C3:2 .:2 F2:2 Ab2:4', 'Bb2:6 F2:2 .:2 Bb2:2 A2:4'
  );
  const LOFI = 'k:2 h?:2 s?:2 h?:2 .:2 k:2 s?:2 h?:2';

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
    'D2 D2 A2 D2 D2 D2 Ab2 D2', 'D2 D2 Ab2 D2 D2 D2 Ab2 D2', 'Bb2 Bb2 F2 Bb2 Bb2 Bb2 E2 Bb2', 'A2 A2 E2 A2 A2 A2 Eb2 A2'
  );
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
  const SONHO_H = bars('Fmaj7#11', 'G', 'Fmaj7#11', 'G', 'Am7', 'G', 'Fmaj7#11', 'Em7');
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
  const CHEF_B = bars(drive('E2', 'E3'), drive('C3', 'C4'), drive('D3', 'D4'), drive('E2', 'E3'), drive('E2', 'E3'),
    drive('C3', 'C4'), drive('A2', 'A3'), 'B2:1 B2:1 B3:1 B2:1 B2:1 B2:1 B3:1 B2:1 B2:1 B2:1 B3:1 B2:1 B2:1 A2:1 G2:1 F#2:1');
  const ROCK = 'k:2 h:2 s:2 h:1 k:1 k:2 h:2 s:2 h:2';

  const TRACKS = {
    // ---------------------------------------------------------------
    // TITULO — Dó maior, 100 bpm, quente e esperançoso. A = Tema da Faísca
    // (I–V–vi–IV), B = ponte em Lá menor com frases longas, A2 = tema cheio.
    // ---------------------------------------------------------------
    titulo: {
      bpm: 100, key: 'C', mode: 'major',
      ch: { lead: { vol: 0.1 }, harm: { rate: 2, pattern: 'up' }, bass: { gate: 0.78 } },
      parts: {
        A: {
          lead: TEMA, harm: TEMA_H, bass: TEMA_B,
          drums: bars('k+c h? s? h? k h? s? h?', rep('k h? s? h? k k? s? h?', 6), 'k h s h s:1 s:1 s:1 s:1 t t'),
        },
        B: {
          lead: bars(
            'A5:4 G5:2 E5:2 C5:4 E5:4', //          Am
            'G5:4 E5:2 D5:2 B4:8', //               Em
            'A5:4 C6:2 A5:2 G5:4 F5:4', //          F
            'E5:6 D5:2 C5:4 G4:4', //               C
            'F5:3 E5:1 D5:2 F5:2 A5:4 C6:4', //     Dm7
            'B5:6 A5:2 G5:4 D5:4', //               G
            'G5:4 B5:4 C6:4 A5:4', //               Em7 Am7
            'D6:4 C6:2 B5:2 A5:2 G5:2 F5:2 D5:2' // Dm7 G7
          ),
          harm: bars('Am', 'Em', 'F', 'C', 'Dm7', 'G', 'Em7:8 Am7:8', 'Dm7:8 G7:8'),
          bass: bars('A2:6 E3:2 A2:4 G2:4', 'E2:6 B2:2 E2:4 G2:4', 'F2:6 C3:2 F2:4 A2:4', 'C3:6 G2:2 C3:4 E3:4',
            'D3:6 A2:2 D3:4 F3:4', 'G2:6 D3:2 G2:4 B2:4', 'E3:4 B2:4 A2:4 C3:4', 'D3:4 A2:4 G2:4 B2:4'),
          drums: bars(rep('k h h h s h h k', 7), 'k h h h s:1 s:1 s:1 s:1 s:1 s:1 s:1 s:1'),
          cfg: { lead: { wave: 'pulse12', vol: 0.11 }, harm: { rate: 1, pattern: 'updown', vol: 0.034 } },
        },
        A2: {
          lead: TEMA, harm: TEMA_H, bass: TEMA_B,
          drums: bars('k+c h s h k k s h', rep(POP, 6), 'k h s h s:1 s:1 s:1 s:1 t t'),
          cfg: { harm: { rate: 1, pattern: 'up', vol: 0.034 } },
        },
      },
      form: ['A', 'B', 'A2'],
    },

    // ---------------------------------------------------------------
    // MANHA — Fá maior, 88 bpm. Café da manhã: acordes com sétima,
    // arpejos suaves em colcheias, melodia com respiros.
    // ---------------------------------------------------------------
    manha: {
      bpm: 88, key: 'F', mode: 'major',
      ch: {
        lead: { wave: 'pulse50', vol: 0.07, lp: 2400, a: 0.014, vib: 10 },
        harm: { wave: 'pulse25', vol: 0.034, lp: 3000, rate: 2, pattern: 'up' },
        bass: { vol: 0.21, gate: 0.92 },
        drums: { vol: 0.75 },
      },
      parts: {
        A: { lead: MANHA_L, harm: MANHA_H, bass: MANHA_B, drums: rep('k z z z k z z z', 8) },
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
          harm: bars('Bbmaj7', 'C', 'Am7', 'Dm7', 'Gm7', 'Am7', 'Bbmaj7', 'C7sus4:8 C7:8'),
          bass: bars('Bb2:6 F3:2 D3:4 Bb2:4', 'C3:6 G2:2 E2:4 G2:4', 'A2:6 E3:2 A2:4 C3:4', 'D3:6 A2:2 D3:4 A2:4',
            'G2:6 D3:2 Bb2:4 G2:4', 'A2:6 E3:2 A2:4 C3:4', 'Bb2:6 F2:2 Bb2:4 A2:4', 'C3:6 G2:2 C3:4 E2:4'),
          drums: rep('k z x z z k x z', 8),
          cfg: { harm: { pattern: 'broken' } },
        },
        A2: {
          lead: MANHA_L, harm: MANHA_H, bass: MANHA_B,
          drums: bars(rep('k z x z z k x z', 7), 'k z x z k:1 k:1 x:2 x?:2 z:2'),
          cfg: { harm: { rate: 1, pattern: 'alberti', vol: 0.028 } },
        },
      },
      form: ['A', 'B', 'A2'],
    },

    // ---------------------------------------------------------------
    // TRABALHO — Sol maior, 118 bpm. Groove de escritório: baixo sincopado
    // (colcheia pontuada), acordes curtos no contratempo, ponte com ii–V.
    // ---------------------------------------------------------------
    trabalho: {
      bpm: 118, key: 'G', mode: 'major',
      ch: {
        lead: { wave: 'pulse25', vol: 0.09, gate: 0.8, vib: 8 },
        harm: { mode: 'pad', wave: 'pulse12', vol: 0.05, a: 0.003, d: 0.06, s: 0.5, r: 0.04, gate: 0.6, oct: 4 },
        bass: { vol: 0.24, gate: 0.7 },
      },
      parts: {
        A: { lead: TRAB_L, harm: TRAB_H, bass: TRAB_B, drums: bars(rep(GROOVE, 7), GROOVE_FILL) },
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
          harm: bars('Cmaj7', 'Bm7', 'Am7', 'G', 'Cmaj7', 'Bm7', 'Em7:8 A7:8', 'D7'),
          bass: bars('C3:3 C3:3 G2:2 .:2 C3:2 G2:2 C3:2', 'B2:3 B2:3 F#2:2 .:2 B2:2 F#2:2 B2:2', 'A2:3 A2:3 E2:2 .:2 A2:2 E2:2 A2:2',
            'G2:3 G2:3 D3:2 .:2 G2:2 A2:2 B2:2', 'C3:3 C3:3 G2:2 .:2 C3:2 G2:2 C3:2', 'B2:3 B2:3 F#2:2 .:2 B2:2 F#2:2 B2:2',
            'E2:3 E2:3 B2:2 A2:3 A2:3 C#3:2', 'D3:3 D3:3 A2:2 .:2 D3:2 B2:2 A2:2'),
          drums: bars('k+c:2 h:2 s:2 o:1 k:1 h:2 k:2 s:2 o:2', rep('k:2 h:2 s:2 o:1 k:1 h:2 k:2 s:2 o:2', 6), GROOVE_FILL),
          cfg: { harm: { mode: 'arp', wave: 'pulse12', vol: 0.034, rate: 1, pattern: 'up', gate: 0.85, s: 0.55, d: 0.09 }, lead: { gate: 0.92 } },
        },
        A2: {
          lead: TRAB_L, harm: TRAB_H, bass: TRAB_B,
          drums: bars('k+c:2 h:2 s:2 h:1 k:1 h:2 k:2 s:2 h:1 h?:1', rep(GROOVE, 6), GROOVE_FILL),
          cfg: { lead: { wave: 'square', vol: 0.075 } },
        },
        C: { // ponte "digitando": respostas curtas, sem caixa até o final
          lead: bars(
            '.:4 B5:1 B5:1 .:2 G5:2 A5:2 B5:4', //     Em7
            '.:4 D6:1 D6:1 .:2 B5:2 A5:2 G5:4', //     Em7
            '.:4 G5:1 G5:1 .:2 E5:2 F#5:2 G5:4', //    Cmaj7
            '.:4 B5:1 B5:1 .:2 A5:2 G5:2 E5:4', //     Cmaj7
            'C6:2 .:2 C6:2 B5:2 A5:2 .:2 E5:4', //     Am7
            'G5:2 .:2 G5:2 A5:2 C6:2 .:2 E6:4', //     Am7
            'D6:4 C6:2 A5:2 F#5:4 A5:4', //            D
            'A5:2 G5:2 F#5:2 E5:2 D5:2 C5:2 B4:2 C5:2' // D7
          ),
          harm: bars('Em7', 'Em7', 'Cmaj7', 'Cmaj7', 'Am7', 'Am7', 'D', 'D7'),
          bass: bars('E2:4 .:2 E2:2 .:2 E3:2 D3:2 B2:2', '%', 'C3:4 .:2 C3:2 .:2 C3:2 B2:2 G2:2', '%',
            'A2:4 .:2 A2:2 .:2 A2:2 G2:2 E2:2', '%', 'D3:4 .:2 D3:2 .:2 D3:2 C3:2 A2:2', 'D3:2 D3:2 D3:2 D3:2 D3:2 C3:2 B2:2 A2:2'),
          drums: bars(rep('k:4 h:2 h:2 k:4 h:2 h:2', 6), 'k h s h k h s h', 's:1 s:1 s:1 s:1 s:1 s:1 s:1 s:1 s:2 s:2 s!:2 s!:2'),
          cfg: { harm: { mode: 'arp', wave: 'pulse12', vol: 0.032, rate: 1, pattern: 'updown', gate: 0.8, s: 0.5, d: 0.08 }, lead: { gate: 0.6 } },
        },
      },
      form: ['A', 'B', 'A2', 'C'],
    },

    // ---------------------------------------------------------------
    // MISTERIO — Lá menor, 100 bpm, swing leve. Detetive cômico: melodia
    // em staccato com bordaduras cromáticas, baixo caminhante em semínimas,
    // acordes nos tempos 2 e 4. B passa por A7 (surpresa maior) e Bb7.
    // ---------------------------------------------------------------
    misterio: {
      bpm: 100, key: 'A', mode: 'minor', swing: 0.45,
      ch: {
        lead: { wave: 'pulse25', vol: 0.1, gate: 0.5, vib: 0, r: 0.04 },
        harm: { mode: 'pad', wave: 'pulse12', vol: 0.05, a: 0.003, d: 0.05, s: 0.45, r: 0.04, gate: 0.55, oct: 4 },
        bass: { vol: 0.24, gate: 0.72, len: 4 },
      },
      parts: {
        A: { lead: MIST_L, harm: bars.apply(null, MIST_CH.map(stab24)), bass: MIST_B, drums: rep(MIST_D, 8) },
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
          harm: bars(stab24('Dm7'), stab24('E7'), stab24('Am'), stab24('A7'), stab24('Dm7'), stab24('Bb7'), stab24('E7'), 'E7:2 .:14'),
          bass: bars('D3 F3 A2 F2', 'E2 G#2 B2 G#2', 'A2 C3 E3 G#2', 'A2 C#3 E3 C#3', 'D3 C3 A2 B2', 'Bb2 D3 F3 F2', 'E2 G#2 B2 D3', 'E2:2 .:14'),
          drums: bars(rep(MIST_D, 7), 'k:2 .:6 .:4 t:1 t:1 t:1 t:1'),
        },
        A2: {
          lead: MIST_L,
          harm: bars.apply(null, MIST_CH),
          bass: MIST_B,
          drums: bars(rep('k h? x o? k h? x h?', 7), 'k h? x h? s:1 s:1 s:1 s:1 x x'),
          cfg: { lead: { wave: 'pulse12', vol: 0.11 }, harm: { mode: 'arp', rate: 2, pattern: 'updown', vol: 0.032, gate: 0.5, s: 0.4 } },
        },
      },
      form: ['A', 'B', 'A2'],
    },

    // ---------------------------------------------------------------
    // CASA — Mi bemol maior, 80 bpm, swing forte. Lo-fi aconchegante:
    // acordes com sétima (IV–iii–ii–V–I), baixo preguiçoso, bateria boom-bap
    // abafada e um eco curto.
    // ---------------------------------------------------------------
    casa: {
      bpm: 80, key: 'Eb', mode: 'major', swing: 0.6,
      echo: { steps: 3, fb: 0.28, mix: 0.2, from: ['lead'] },
      ch: {
        lead: { wave: 'pulse50', vol: 0.065, lp: 1800, a: 0.02, vib: 9, vibRate: 4.6 },
        harm: { wave: 'pulse25', vol: 0.036, lp: 1700, rate: 2, pattern: 'broken' },
        bass: { vol: 0.22, gate: 0.9 },
        drums: { vol: 0.85 },
      },
      parts: {
        A: { lead: CASA_L, harm: CASA_H, bass: CASA_B, drums: rep(LOFI, 8) },
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
          harm: bars('Cm7', 'Fm7', 'Bb7', 'Ebmaj7', 'Abmaj7', 'Dbmaj7', 'Fm7', 'Bb7sus4:8 Bb7:8'),
          bass: bars('C3:6 G2:2 .:2 C3:2 G2:4', 'F2:6 C3:2 .:2 F2:2 Ab2:4', 'Bb2:6 F2:2 .:2 Bb2:2 D3:4', 'Eb3:6 Bb2:2 .:2 Eb3:2 G2:4',
            'Ab2:6 Eb3:2 .:2 Ab2:2 C3:4', 'Db3:6 Ab2:2 .:2 Db3:2 Eb3:4', 'F2:6 C3:2 .:2 F2:2 Ab2:4', 'Bb2:6 F2:2 .:2 Bb2:2 A2:4'),
          drums: bars(rep(LOFI, 7), 'k:2 h?:2 s?:2 h?:2 .:2 k:2 s:1 s?:1 o?:2'),
        },
        A2: {
          lead: CASA_L, harm: CASA_H, bass: CASA_B, drums: rep('k:2 h?:2 s?:2 h?:2 .:2 k:2 s?:2 o?:2', 8),
          cfg: { harm: PAD, lead: { wave: 'pulse25', vol: 0.06 } },
        },
      },
      form: ['A', 'B', 'A2'],
    },

    // ---------------------------------------------------------------
    // AULA — Ré maior, 110 bpm, brincalhona. Melodia de arpejos e escalas
    // ("subindo e descendo a lição"), baixo oom-pah, bloco de madeira no B.
    // ---------------------------------------------------------------
    aula: {
      bpm: 110, key: 'D', mode: 'major',
      ch: {
        lead: { wave: 'pulse25', vol: 0.095, gate: 0.72, vib: 8 },
        harm: { rate: 2, pattern: 'alberti' },
        bass: { gate: 0.7 },
      },
      parts: {
        A: { lead: AULA_L, harm: AULA_H, bass: AULA_B, drums: bars(rep('k h s h k h s h', 7), 'k h s h k:2 s:1 s:1 s s') },
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
          harm: bars('Bm', 'F#m', 'G', 'D', 'Em', 'A', 'G', 'A7'),
          bass: bars('B2 . F#2 . B2 . A2 .', 'F#2 . C#3 . F#2 . E2 .', 'G2 . D3 . G2 . B2 .', 'D3 . A2 . D3 . F#3 .',
            'E3 . B2 . E3 . B2 .', 'A2 . E3 . A2 . C#3 .', 'G2 . D3 . G2 . B2 .', 'A2 . E3 . A2 . C#3 .'),
          drums: bars(rep('k h x h k h x x?', 7), 'k h x h x:1 x:1 x:1 x:1 x:2 x:2'),
          cfg: { harm: { rate: 1, pattern: 'up', vol: 0.032 }, lead: { wave: 'pulse12', vol: 0.1, gate: 0.85 } },
        },
        A2: {
          lead: AULA_L, harm: AULA_H, bass: AULA_B,
          drums: bars('k+c h s h k h s h', rep('k h s h k h s p', 6), 'k h s h k:2 s:1 s:1 s s'),
          cfg: { harm: { rate: 1, pattern: 'alberti', vol: 0.032 } },
        },
      },
      form: ['A', 'B', 'A2'],
    },

    // ---------------------------------------------------------------
    // TENSAO — Ré menor, 76 bpm. Ostinato grave com trítono (D–Ab),
    // bumbo de coração, melodia esparsa e eco. B sobe cromaticamente
    // (D→Eb→E→F→F#→G→Ab→A) até o A7 que volta para o início.
    // ---------------------------------------------------------------
    tensao: {
      bpm: 76, key: 'D', mode: 'minor',
      echo: { steps: 3, fb: 0.32, mix: 0.22, from: ['lead'] },
      ch: {
        lead: { wave: 'pulse25', vol: 0.075, a: 0.04, d: 0.3, s: 0.7, r: 0.2, vib: 16, vibRate: 4.5, vibDelay: 0.3 },
        harm: { wave: 'pulse12', vol: 0.026, rate: 2, pattern: 'pendulo', oct: 4, gate: 0.6 },
        bass: { vol: 0.26, gate: 0.45 },
        drums: { vol: 1 },
      },
      parts: {
        A: { lead: TENS_L, harm: TENS_H, bass: TENS_B, drums: rep(HEART, 8) },
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
          harm: bars('Dm', 'Eb', 'Em7b5', 'F', 'F#dim7', 'Gm', 'Ab', 'A7'),
          bass: bars(oct8('D2', 'D3'), oct8('Eb2', 'Eb3'), oct8('E2', 'E3'), oct8('F2', 'F3'), oct8('F#2', 'F#3'), oct8('G2', 'G3'), oct8('Ab2', 'Ab3'), oct8('A2', 'A3')),
          drums: rep('b:3 b?:3 .:2 x?:4 x?:4', 8),
          cfg: { harm: { rate: 1, pattern: 'pendulo', vol: 0.022 } },
        },
        A2: {
          lead: TENS_L, harm: TENS_H, bass: TENS_B,
          drums: rep('b:3 b?:3 .:2 b:3 b?:3 .:2', 8),
          cfg: { harm: { rate: 1, pattern: 'alberti', vol: 0.022 } },
        },
      },
      form: ['A', 'B', 'A2'],
    },

    // ---------------------------------------------------------------
    // SONHO — Fá lídio (Si natural), 70 bpm. Arpejos etéreos em semicolcheias
    // com eco de colcheia pontuada; alternância Fmaj7#11 ↔ G/F (cor lídia).
    // ---------------------------------------------------------------
    sonho: {
      bpm: 70, key: 'F', mode: 'lydian',
      echo: { steps: 3, fb: 0.42, mix: 0.32, from: ['harm', 'lead'] },
      ch: {
        lead: { wave: 'triangle', vol: 0.17, a: 0.05, d: 0.3, s: 0.75, r: 0.35, vib: 14, vibRate: 4.2, vibDelay: 0.35 },
        harm: { wave: 'pulse25', vol: 0.03, lp: 2800, rate: 1, pattern: 'up8', a: 0.006, gate: 0.7 },
        bass: { vol: 0.17, a: 0.06, r: 0.3, gate: 0.96 },
        drums: { vol: 0.7 },
      },
      parts: {
        A: { lead: SONHO_L, harm: SONHO_H, bass: SONHO_B },
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
          harm: bars('Dm9', 'Em7', 'Fmaj7#11', 'G', 'Em7', 'Am7', 'Fmaj7#11', 'G/F'),
          bass: bars('D3:8 A2:8', 'E2:8 B2:8', 'F2:8 C3:8', 'G2:8 D3:8', 'E2:8 B2:8', 'A2:8 E3:8', 'F2:8 C3:8', 'F2:8 C3:8'),
          drums: rep('b?:8 z?:4 z?:4', 8),
          cfg: { lead: { wave: 'pulse12', vol: 0.06 } },
        },
        A2: {
          lead: SONHO_L, harm: SONHO_H, bass: SONHO_B,
          drums: rep('b?:8 z?:8', 8),
          cfg: { harm: { pattern: 'down', vol: 0.03 } },
        },
      },
      form: ['A', 'B', 'A2'],
    },

    // ---------------------------------------------------------------
    // CHEFAO — Mi menor, 148 bpm. Batalha: baixo em semicolcheias, riff
    // i–bVI–bVII, B heroico em Sol/Dó citando o Tema da Faísca, ponte C
    // com acordes em síncope e F#m7b5 → B7 (dominante harmônica).
    // ---------------------------------------------------------------
    chefao: {
      bpm: 148, key: 'E', mode: 'minor',
      ch: {
        lead: { wave: 'square', vol: 0.07, gate: 0.88, vib: 14, vibDelay: 0.16 },
        harm: { wave: 'pulse25', vol: 0.03, rate: 1, pattern: 'up' },
        bass: { vol: 0.24, gate: 0.7, a: 0.002 },
      },
      parts: {
        A: { lead: CHEF_L, harm: CHEF_H, bass: CHEF_B, drums: bars('k+c:2 h:2 s:2 h:1 k:1 k:2 h:2 s:2 h:2', rep(ROCK, 6), 'k:2 h:2 s:2 h:1 k:1 s:1 s:1 s:1 s:1 t:1 t:1 t:1 t:1') },
        B: {
          lead: bars(
            'E5:3 G5:1 C6:4 B5:2 G5:2 E5:4', //       C   (Tema da Faísca!)
            'F#5:3 A5:1 D6:4 C6:2 A5:2 F#5:4', //     D
            'G5:3 B5:1 D6:4 G6:8', //                 G
            'F#6:4 E6:4 B5:4 G5:4', //                Em
            'E5:3 G5:1 C6:4 E6:4 D6:2 C6:2', //       C
            'D6:3 A5:1 F#5:4 A5:2 D6:2 F#6:4', //     D
            'G6:8 F#6:4 E6:4', //                     G
            'D#6:4 F#6:4 B5:4 A5:2 F#5:2' //          B7
          ),
          harm: bars('C', 'D', 'G', 'Em', 'C', 'D', 'G', 'B7'),
          bass: bars(oct8('C3', 'C4'), oct8('D3', 'D4'), oct8('G2', 'G3'), oct8('E2', 'E3'), oct8('C3', 'C4'), oct8('D3', 'D4'), oct8('G2', 'G3'),
            'B2:2 B2:2 B3:2 B2:2 A2:2 G2:2 F#2:2 D#2:2'),
          drums: bars('k+c:4 h:2 h:2 s:4 h:2 k:2', rep('k:4 h:2 h:2 s:4 h:2 k:2', 3), 'k+c:4 h:2 h:2 s:4 h:2 k:2',
            rep('k:4 h:2 h:2 s:4 h:2 k:2', 2), 'k:2 h:2 s:2 h:2 s:1 s:1 s:1 s:1 s:1 s:1 s:1 s:1'),
          cfg: { harm: { pattern: 'updown', vol: 0.028 }, lead: { vol: 0.075, wave: 'pulse25' } },
        },
        A2: {
          lead: CHEF_L, harm: CHEF_H, bass: CHEF_B,
          drums: bars('k+c:2 h:2 s:2 h:1 k:1 k:2 h:2 s:2 h:2', rep(ROCK, 3), 'k+c:2 h:2 s:2 h:1 k:1 k:2 h:2 s:2 h:2', rep(ROCK, 2),
            'k:2 h:2 s:2 h:1 k:1 s:1 s:1 s:1 s:1 t:1 t:1 t:1 t:1'),
          cfg: { harm: { pattern: 'up8', vol: 0.028 } },
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
          harm: bars('Am:2 .:1 Am:1 .:2 Am:2 Am:2 .:2 Am:4', '%', 'C:2 .:1 C:1 .:2 C:2 C:2 .:2 C:4', '%',
            'F#m7b5:4 F#m7b5:4 F#m7b5:4 F#m7b5:4', '%', 'B7:4 B7:4 B7:4 B7:4', '%'),
          bass: bars('A2:2 .:1 A2:1 .:2 A2:2 A2:2 .:2 A2:4', '%', 'C3:2 .:1 C3:1 .:2 C3:2 C3:2 .:2 C3:4', '%',
            drive('F#2', 'F#3'), drive('F#2', 'F#3'), drive('B2', 'B3'), 'B2:1 B2:1 B3:1 B2:1 B2:1 B2:1 B3:1 B2:1 B2:1 B2:1 B3:1 B2:1 B2:1 A2:1 G2:1 F#2:1'),
          drums: bars('k+c:2 .:1 k:1 .:2 s:2 k:2 .:2 s:4', rep('k:2 .:1 k:1 .:2 s:2 k:2 .:2 s:4', 3), rep('k:2 h:2 s:2 h:2 k:2 h:2 s:2 h:2', 2),
            's:2 s:2 s:2 s:2 s:1 s:1 s:1 s:1 s:1 s:1 s:1 s:1', 's?:1 s?:1 s?:1 s?:1 s:1 s:1 s:1 s:1 s:1 s:1 s:1 s:1 s!:1 s!:1 s!:1 s!:1'),
          cfg: { harm: { mode: 'pad', wave: 'pulse25', vol: 0.034, a: 0.004, d: 0.08, s: 0.6, r: 0.05, gate: 0.8 } },
        },
      },
      form: ['A', 'B', 'A2', 'C'],
    },

    // ---------------------------------------------------------------
    // FINAL — créditos, 96 bpm. Intro com o motivo lento → Tema da Faísca
    // em Dó (harmonia com sétimas) → desenvolvimento (motivo em sequência
    // Am–Em–F–C subindo) → modulação para Ré maior via A7 (reprise
    // triunfal) → coda que volta para Dó pelo Dm7 (nota comum Ré).
    // ---------------------------------------------------------------
    final: {
      bpm: 96, key: 'C', mode: 'major',
      ch: { lead: { vol: 0.095, vib: 14 }, harm: { rate: 2, pattern: 'up' }, bass: { gate: 0.85 } },
      parts: {
        I: {
          lead: bars('.:4 E5:2 G5:2 C6:8', 'B5:4 A5:4 G5:4 D5:4', 'E5:6 G5:2 C6:4 B5:2 A5:2', 'A5:4 G5:4 F5:4 D5:4'),
          harm: bars('Fmaj7', 'G', 'Em7:8 Am7:8', 'Dm7:8 G7:8'),
          bass: bars('F2:16', 'G2:16', 'E2:8 A2:8', 'D3:8 G2:8'),
          drums: bars('.:16', '.:16', '.:16', '.:8 s?:2 s?:2 s:2 s:2'),
          cfg: { harm: PAD, lead: { wave: 'triangle', vol: 0.18, a: 0.03 } },
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
          harm: bars('Cadd9', 'G/B', 'Am7', 'Fmaj7', 'C/E', 'G', 'Fmaj7:8 G:8', 'C'),
          bass: bars('C3:8 G2:4 C3:4', 'B2:8 G2:4 B2:4', 'A2:8 E2:4 G2:4', 'F2:8 C3:4 F2:4', 'E2:8 G2:4 C3:4', 'G2:8 D3:4 B2:4', 'F2:8 G2:8', 'C3:8 G2:4 E2:4'),
          drums: bars('k+c:4 h:4 s:4 h:2 k:2', rep('k:4 h:4 s:4 h:2 k:2', 6), 'k:4 h:4 s:4 s:2 s:2'),
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
          harm: bars('Am', 'Em', 'F', 'C', 'Dm7', 'Em7', 'Fmaj7', 'A7sus4:8 A7:8'),
          bass: bars(oct8('A2', 'A3'), oct8('E2', 'E3'), oct8('F2', 'F3'), oct8('C3', 'C4'), oct8('D3', 'D4'), oct8('E2', 'E3'), oct8('F2', 'F3'),
            'A2:2 A2:2 A3:2 A2:2 A2:2 A2:2 B2:2 C#3:2'),
          drums: bars(rep(POP, 7), 'k h s h s:1 s:1 s:1 s:1 s:1 s:1 s:1 s!:1'),
          cfg: { harm: { rate: 1, pattern: 'updown', vol: 0.034 } },
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
          harm: bars('D', 'A/C#', 'Bm7', 'Gmaj7', 'D/F#', 'A', 'Gmaj7:8 A:8', 'D'),
          bass: bars('D3 D3 A2 A2 D3 D3 F#3 D3', 'C#3 C#3 A2 A2 C#3 C#3 E3 C#3', 'B2 B2 F#2 F#2 B2 B2 D3 B2', 'G2 G2 D3 D3 G2 G2 B2 D3',
            'F#2 F#2 A2 A2 D3 D3 F#3 D3', 'A2 A2 E3 E3 A2 A2 C#3 E3', 'G2 G2 B2 D3 A2 A2 C#3 E3', 'D3:4 A2:4 D3:4 D2:4'),
          drums: bars('k+c h s h k k s h', rep(POP, 6), 'k+c:4 .:12'),
          cfg: { harm: { rate: 1, pattern: 'up', vol: 0.034 }, lead: { wave: 'square', vol: 0.075 } },
        },
        C: {
          lead: bars('D6:4 C6:4 A5:4 F5:4', 'C6:6 B5:2 G5:8', 'E5:4 G5:4 C6:8', 'D6:4 A5:4 B5:4 F5:4'),
          harm: bars('Dm7', 'G', 'Em7:8 Am7:8', 'Dm7:8 G7:8'),
          bass: bars('D3:8 A2:8', 'G2:8 D3:8', 'E2:8 A2:8', 'D3:8 G2:8'),
          drums: bars(rep('k:4 h?:4 h:4 h?:4', 3), 'k:4 h?:4 s?:2 s?:2 s?:2 s:2'),
          cfg: { harm: PAD },
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

  const compiled = {};
  function compile(name) {
    if (compiled[name]) return compiled[name];
    const T = TRACKS[name];
    if (!T) return null;
    const errors = [], events = [], chords = [], parts = [];
    const sw = T.swing || 0;
    const swing = (s) => {
      const b = Math.floor(s / 4) * 4, p = s - b;
      return b + (p <= 2 ? (p * (2 + sw)) / 2 : 2 + sw + ((p - 2) * (2 - sw)) / 2);
    };
    const lp = {};
    CH.forEach((ch) => { const c = T.ch && T.ch[ch]; if (c && c.lp) lp[ch] = c.lp; });
    const vstate = { prev: null };
    let offset = 0;
    T.form.forEach((pn) => {
      const P = T.parts[pn];
      if (!P) { errors.push(name + ': parte "' + pn + '" não existe'); return; }
      let partSteps = null;
      const info = { part: pn, bars: 0, channels: {} };
      CH.forEach((ch) => {
        if (P[ch] == null) return;
        const ins = Object.assign({}, INS_DEF[ch], T.ch && T.ch[ch], P.cfg && P.cfg[ch]);
        const kind = ch === 'drums' ? 'drum' : ch === 'harm' && ins.mode !== 'notes' ? 'chord' : 'note';
        const r = parseChannel(P[ch], kind, ins.len, name + '.' + pn + '.' + ch, errors);
        info.channels[ch] = r.bars;
        if (partSteps == null) partSteps = r.steps;
        else if (Math.abs(r.steps - partSteps) > 1e-6) {
          errors.push(name + '.' + pn + ': canal ' + ch + ' tem ' + r.bars + ' compassos (' + r.steps + ' passos); esperado ' + partSteps + ' passos');
        }
        r.events.forEach((e) => {
          const t = offset + e.t;
          if (kind === 'drum') events.push({ t: t, len: e.len, ch: ch, type: 'd', drums: e.data, v: e.v, ins: ins });
          else if (kind === 'note') events.push({ t: t, len: e.len, ch: ch, type: 'n', m: e.data, v: e.v / Math.sqrt(e.data.length), ins: ins });
          else {
            chords.push({ t: t, len: e.len, root: e.data.root, pcs: e.data.iv.map((i) => (e.data.root + i) % 12) });
            const vo = voiceChord(e.data, ins.oct, vstate);
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
    const S = {
      name: name, bpm: T.bpm, key: T.key, mode: T.mode, stepDur: 60 / T.bpm / 4, loopSteps: offset,
      bars: offset / STEPS, seconds: (offset * 60) / T.bpm / 4, events: events, chords: chords, parts: parts,
      form: T.form.slice(), errors: errors, lp: lp, echo: T.echo || null,
    };
    compiled[name] = S;
    return S;
  }
  function validate(name) {
    const S = compile(name);
    if (!S) return { name: name, errors: ['faixa inexistente'] };
    return { name: name, bpm: S.bpm, key: S.key + ' ' + S.mode, bars: S.bars, seconds: S.seconds, parts: S.parts, form: S.form, events: S.events.length, errors: S.errors };
  }

  // =====================================================================
  // 5. Síntese (funciona com qualquer BaseAudioContext: real ou offline)
  // =====================================================================
  const waveCache = new WeakMap();
  function pulseWave(c, duty) {
    let m = waveCache.get(c);
    if (!m) { m = {}; waveCache.set(c, m); }
    if (m[duty]) return m[duty];
    const N = 64, re = new Float32Array(N), im = new Float32Array(N);
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
    else if (w === 'triangle' || w === 'sine' || w === 'sawtooth') osc.type = w;
    else osc.type = 'square';
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
  let distCurve = null;
  function getDist() {
    if (distCurve) return distCurve;
    const n = 1024, k = 6;
    distCurve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      distCurve[i] = ((1 + k) * x) / (1 + k * Math.abs(x)) * 0.8;
    }
    return distCurve;
  }
  const after = (node) => { try { node.disconnect(); } catch (e) { /* ok */ } };

  // Nota musical com envelope ADSR (sem cliques) e vibrato atrasado.
  function note(c, out, t, dur, f, ins, v) {
    const o = c.createOscillator();
    setWave(c, o, ins.wave);
    o.frequency.setValueAtTime(f, t);
    const g = c.createGain(), gg = g.gain;
    const peak = ins.vol * v, a = ins.a, d = ins.d, sus = peak * ins.s, r = ins.r;
    const on = Math.max(a + 0.012, dur * ins.gate);
    gg.setValueAtTime(0, t);
    gg.linearRampToValueAtTime(peak, t + a);
    if (on > a + d) { gg.linearRampToValueAtTime(sus, t + a + d); gg.setValueAtTime(sus, t + on); }
    else gg.linearRampToValueAtTime(peak + (sus - peak) * ((on - a) / d), t + on);
    gg.linearRampToValueAtTime(0, t + on + r);
    o.connect(g);
    g.connect(out);
    const end = t + on + r + 0.02;
    if (ins.vib && on > ins.vibDelay + 0.1) {
      const l = c.createOscillator(), lg = c.createGain();
      l.frequency.value = ins.vibRate || 5.4;
      lg.gain.setValueAtTime(0, t);
      lg.gain.setValueAtTime(0, t + ins.vibDelay);
      lg.gain.linearRampToValueAtTime(ins.vib, t + ins.vibDelay + 0.25);
      l.connect(lg);
      lg.connect(o.detune);
      l.start(t);
      l.stop(end);
    }
    o.start(t);
    o.stop(end);
    o.onended = () => after(g);
  }

  // Tom genérico para efeitos. o: {w, f, f1 (destino), ft (tempo do glide), lin,
  // d (duração), v (volume), a, r, exp (decaimento exponencial), lp, det, vib, vr}
  function tone(c, out, t, o) {
    const osc = c.createOscillator();
    setWave(c, osc, o.w || 'square');
    osc.frequency.setValueAtTime(Math.max(20, o.f), t);
    if (o.f1) {
      const tt = t + (o.ft || o.d);
      if (o.lin) osc.frequency.linearRampToValueAtTime(o.f1, tt);
      else osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), tt);
    }
    if (o.det) osc.detune.setValueAtTime(o.det, t);
    const g = c.createGain(), gg = g.gain, a = o.a != null ? o.a : 0.004, d = Math.max(o.d, a + 0.01), vol = o.v;
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
    let node = osc;
    if (o.lp) {
      const bq = c.createBiquadFilter();
      bq.type = 'lowpass';
      bq.frequency.value = o.lp;
      osc.connect(bq);
      node = bq;
    }
    node.connect(g);
    g.connect(out);
    if (o.vib) {
      const l = c.createOscillator(), lg = c.createGain();
      l.frequency.value = o.vr || 6;
      lg.gain.value = o.vib;
      l.connect(lg);
      lg.connect(osc.detune);
      l.start(t);
      l.stop(t + d + 0.03);
    }
    osc.start(t);
    osc.stop(t + d + 0.03);
    osc.onended = () => after(g);
    return osc;
  }

  // Ruído filtrado. o: {d, v, a, type, f, f1, ft, q, exp (padrão true), r}
  function noise(c, out, t, o) {
    const src = c.createBufferSource();
    src.buffer = noiseBuf(c);
    src.loop = true;
    let node = src;
    if (o.type) {
      const bq = c.createBiquadFilter();
      bq.type = o.type;
      bq.frequency.setValueAtTime(o.f, t);
      if (o.f1) bq.frequency.exponentialRampToValueAtTime(o.f1, t + (o.ft || o.d));
      if (o.q != null) bq.Q.value = o.q;
      src.connect(bq);
      node = bq;
    }
    const g = c.createGain(), gg = g.gain, a = o.a != null ? o.a : 0.002, d = Math.max(o.d, a + 0.01), vol = o.v;
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
    src.onended = () => after(g);
    return src;
  }

  // Sino/celesta: parciais senoidais com decaimento.
  function bell(c, out, t, f, d, v, harmonic) {
    const P = harmonic ? [[1, 1], [2, 0.3], [3, 0.12]] : [[1, 1], [2.76, 0.32], [5.4, 0.12], [8.93, 0.05]];
    P.forEach(([r, amp]) => {
      if (f * r > 16000) return;
      tone(c, out, t, { w: 'sine', f: f * r, d: d / (1 + (r - 1) * 0.35), v: v * amp, a: 0.002, exp: true });
    });
  }

  // Sequência curta em notação de tokens (sem barras): 'C5 E5 G5:2 C6+E6:4'
  function seq(c, out, t, str, o) {
    const step = o.step || 0.1, p = o.p || 1, gate = o.gate || 0.92;
    let pos = 0;
    str.trim().split(/\s+/).forEach((tk) => {
      const m = TOK_RE.exec(tk);
      if (!m) return;
      const len = m[3] ? parseFloat(m[3]) : 1, acc = m[2] === '!' ? 1.3 : m[2] === '?' ? 0.55 : 1;
      if (m[1] !== '.') {
        const ms = m[1].split('+').map(noteMidi).filter((x) => x != null);
        const tt = t + pos * step, dd = Math.max(0.03, len * step * gate) + (o.tail || 0);
        const vv = (o.v * acc) / Math.sqrt(ms.length || 1);
        ms.forEach((mm) => {
          const f = mtof(mm) * p;
          if (o.bell) bell(c, out, tt, f, dd, vv, o.harmonic);
          else tone(c, out, tt, { w: o.w, f: f, d: dd, v: vv, a: o.a, r: o.r, exp: o.exp, vib: o.vib, vr: o.vr, lp: o.lp, det: o.det });
        });
      }
      pos += len;
    });
    return pos * step + (o.tail || 0) + 0.05;
  }

  // Bateria. v = intensidade (0..~1.3)
  function drum(c, out, t, k, v) {
    switch (k) {
      case 'k':
        tone(c, out, t, { w: 'sine', f: 150, f1: 42, ft: 0.13, d: 0.3, v: 0.5 * v, a: 0.003, exp: true });
        noise(c, out, t, { d: 0.012, v: 0.07 * v, type: 'highpass', f: 2500 });
        break;
      case 'b': // batida de coração: grave e arredondada
        tone(c, out, t, { w: 'sine', f: 95, f1: 38, ft: 0.16, d: 0.34, v: 0.55 * v, a: 0.008, exp: true });
        break;
      case 's':
        noise(c, out, t, { d: 0.16, v: 0.22 * v, type: 'bandpass', f: 2200, q: 0.7 });
        tone(c, out, t, { w: 'triangle', f: 210, f1: 150, ft: 0.06, d: 0.08, v: 0.16 * v, exp: true });
        break;
      case 'h':
        noise(c, out, t, { d: 0.04, v: 0.075 * v, type: 'highpass', f: 7500 });
        break;
      case 'o':
        noise(c, out, t, { d: 0.22, v: 0.06 * v, type: 'highpass', f: 6500 });
        break;
      case 'c':
        noise(c, out, t, { d: 1.1, v: 0.09 * v, type: 'highpass', f: 4500 });
        break;
      case 't':
        tone(c, out, t, { w: 'sine', f: 210, f1: 105, ft: 0.2, d: 0.24, v: 0.32 * v, exp: true });
        noise(c, out, t, { d: 0.03, v: 0.05 * v, type: 'lowpass', f: 1500 });
        break;
      case 'x': // bloco de madeira / aro
        tone(c, out, t, { w: 'sine', f: 1150, f1: 950, ft: 0.04, d: 0.06, v: 0.16 * v, a: 0.001, exp: true });
        tone(c, out, t, { w: 'triangle', f: 2300, d: 0.02, v: 0.04 * v, a: 0.001, exp: true });
        break;
      case 'z':
        noise(c, out, t, { d: 0.07, v: 0.06 * v, a: 0.012, type: 'bandpass', f: 6500, q: 1.2 });
        break;
      case 'p':
        for (let i = 0; i < 3; i++) noise(c, out, t + i * 0.011, { d: 0.012, v: 0.16 * v, type: 'bandpass', f: 1400, q: 0.9 });
        noise(c, out, t + 0.033, { d: 0.14, v: 0.14 * v, type: 'bandpass', f: 1400, q: 0.9 });
        break;
      default:
    }
  }

  // ---------------------------------------------------------------------
  // Player: toca uma faixa compilada num destino de qualquer contexto.
  // ---------------------------------------------------------------------
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
    const out = (this.out = c.createGain());
    if (fadeIn > 0) {
      out.gain.setValueAtTime(0, Math.min(c.currentTime, t0));
      out.gain.linearRampToValueAtTime(1, t0 + fadeIn);
    } else out.gain.value = 1;
    out.connect(dest);
    this.bus = {};
    CH.forEach((ch) => {
      const g = c.createGain();
      if (S.lp[ch]) {
        const f = c.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = S.lp[ch];
        f.Q.value = 0.5;
        g.connect(f);
        f.connect(out);
      } else g.connect(out);
      this.bus[ch] = g;
    });
    if (S.echo) {
      const E = S.echo, dl = c.createDelay(2), fb = c.createGain(), lp = c.createBiquadFilter(), wet = c.createGain();
      dl.delayTime.value = Math.min(1.9, E.steps * this.sd);
      fb.gain.value = E.fb;
      lp.type = 'lowpass';
      lp.frequency.value = 2400;
      wet.gain.value = E.mix;
      (E.from || ['lead']).forEach((ch) => this.bus[ch].connect(dl));
      dl.connect(lp);
      lp.connect(fb);
      fb.connect(dl);
      lp.connect(wet);
      wet.connect(out);
    }
  }
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
    const c = this.c;
    if (e.type === 'd') {
      const vol = e.v * (e.ins.vol == null ? 1 : e.ins.vol);
      for (let i = 0; i < e.drums.length; i++) drum(c, this.bus.drums, t, e.drums[i], vol);
      return;
    }
    const out = this.bus[e.ch], dur = e.d * this.sd;
    for (let i = 0; i < e.m.length; i++) note(c, out, t, dur, mtof(e.m[i]), e.ins, e.v);
  };
  Player.prototype.fadeOut = function (d) {
    const c = this.c, now = c.currentTime, g = this.out.gain;
    try {
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(0, now + d);
    } catch (e) { /* ok */ }
    this.endAt = now + d;
  };
  Player.prototype.dispose = function () { after(this.out); };

  // =====================================================================
  // 6. Efeitos sonoros — cada um: (ctx, saída, t, pitch) → duração (s)
  // =====================================================================
  const nf = (n) => mtof(noteMidi(n));
  const SPARK = ['C7', 'G6', 'E7', 'A6', 'D7', 'G7'].map(nf);
  const SFX = {
    blip: (c, o, t, p) => { tone(c, o, t, { w: 'pulse25', f: 1046 * p, d: 0.045, v: 0.14, a: 0.002, r: 0.02 }); return 0.06; },
    select: (c, o, t, p) => {
      tone(c, o, t, { w: 'pulse25', f: 784 * p, d: 0.05, v: 0.13, r: 0.02 });
      tone(c, o, t + 0.05, { w: 'pulse25', f: 1175 * p, d: 0.08, v: 0.13 });
      return 0.14;
    },
    confirm: (c, o, t, p) => seq(c, o, t, 'C6 E6 G6 C7:4', { step: 0.045, w: 'square', v: 0.085, p: p, exp: true }),
    cancel: (c, o, t, p) => seq(c, o, t, 'E5 A4:3', { step: 0.06, w: 'pulse25', v: 0.13, p: p, exp: true }),
    back: (c, o, t, p) => {
      tone(c, o, t, { w: 'triangle', f: 660 * p, f1: 392 * p, ft: 0.1, d: 0.13, v: 0.3 });
      tone(c, o, t, { w: 'pulse25', f: 660 * p, f1: 392 * p, ft: 0.1, d: 0.1, v: 0.04 });
      return 0.15;
    },
    success: (c, o, t, p) => {
      seq(c, o, t, 'C5 E5 G5 C6:5', { step: 0.07, w: 'pulse25', v: 0.12, p: p, exp: true, tail: 0.15 });
      seq(c, o, t, 'C4:3 G4+C5:5', { step: 0.07, w: 'triangle', v: 0.2, p: p, exp: true, tail: 0.15 });
      bell(c, o, t + 0.22, 2093 * p, 0.5, 0.05);
      bell(c, o, t + 0.27, 3136 * p, 0.45, 0.035);
      return 0.85;
    },
    fail: (c, o, t, p) => {
      seq(c, o, t, 'G4:2 F#4:2', { step: 0.1, w: 'pulse25', v: 0.11, p: p, lp: 1800 });
      tone(c, o, t + 0.4, { w: 'pulse25', f: 349 * p, f1: 311 * p, ft: 0.5, d: 0.55, v: 0.11, lp: 1800, vib: 35, vr: 7 });
      seq(c, o, t, 'G3:2 F#3:2 F3:6', { step: 0.1, w: 'triangle', v: 0.2, p: p });
      return 1.0;
    },
    error: (c, o, t, p) => {
      [0, 0.13].forEach((dt, i) => {
        tone(c, o, t + dt, { w: 'square', f: 185 * p, d: 0.1 + i * 0.05, v: 0.06, lp: 1400 });
        tone(c, o, t + dt, { w: 'square', f: 196 * p, d: 0.1 + i * 0.05, v: 0.06, lp: 1400 });
      });
      return 0.32;
    },
    coin: (c, o, t, p) => {
      tone(c, o, t, { w: 'square', f: 988 * p, d: 0.07, v: 0.08, r: 0.01 });
      tone(c, o, t + 0.07, { w: 'square', f: 1319 * p, d: 0.38, v: 0.08, exp: true });
      return 0.48;
    },
    notify: (c, o, t, p) => {
      bell(c, o, t, 1319 * p, 0.5, 0.12, true);
      bell(c, o, t + 0.11, 1976 * p, 0.7, 0.11, true);
      return 0.85;
    },
    email: (c, o, t, p) => {
      noise(c, o, t, { d: 0.2, v: 0.14, a: 0.08, type: 'bandpass', f: 600, f1: 3500, q: 1, exp: false });
      bell(c, o, t + 0.16, 1568 * p, 0.55, 0.11, true);
      bell(c, o, t + 0.25, 2093 * p, 0.7, 0.1, true);
      return 1.0;
    },
    alarm: (c, o, t, p) => {
      for (let i = 0; i < 4; i++) tone(c, o, t + i * 0.13, { w: 'square', f: 1046 * p, d: 0.075, v: 0.075, lp: 3200, r: 0.01 });
      return 0.6;
    },
    phone_ring: (c, o, t, p) => { // campainha de telefone fixo: trinado de ~1 s ("trrriiim")
      for (let i = 0; i < 22; i++) {
        const f = (i % 2 ? 1480 : 1245) * p;
        tone(c, o, t + i * 0.045, { w: 'triangle', f: f, d: 0.06, v: 0.12, a: 0.002, exp: true });
        tone(c, o, t + i * 0.045, { w: 'sine', f: f * 2.01, d: 0.04, v: 0.03, a: 0.002, exp: true });
      }
      return 1.1;
    },
    phone_vibrate: (c, o, t, p) => {
      [0, 0.45].forEach((dt) => {
        tone(c, o, t + dt, { w: 'sawtooth', f: 150 * p, d: 0.32, v: 0.1, a: 0.02, lp: 420, r: 0.03 });
        tone(c, o, t + dt, { w: 'sawtooth', f: 157 * p, d: 0.32, v: 0.1, a: 0.02, lp: 420, r: 0.03 });
        noise(c, o, t + dt, { d: 0.32, v: 0.05, a: 0.02, type: 'lowpass', f: 300, exp: false, r: 0.03 });
      });
      return 0.8;
    },
    whoosh: (c, o, t, p) => {
      noise(c, o, t, { d: 0.4, v: 0.32, a: 0.16, type: 'bandpass', f: 350 * p, f1: 3000 * p, ft: 0.32, q: 1.3, exp: false, r: 0.22 });
      return 0.42;
    },
    sparkle: (c, o, t, p) => {
      SPARK.forEach((f, i) => bell(c, o, t + i * 0.045, f * p, 0.35, 0.065, true));
      return 0.65;
    },
    hit: (c, o, t, p) => {
      noise(c, o, t, { d: 0.14, v: 0.35, type: 'lowpass', f: 3000 * p, f1: 600 * p });
      tone(c, o, t, { w: 'square', f: 260 * p, f1: 60 * p, ft: 0.12, d: 0.12, v: 0.09, exp: true, lp: 2000 });
      return 0.2;
    },
    crit: (c, o, t, p) => {
      SFX.hit(c, o, t, p);
      noise(c, o, t, { d: 0.06, v: 0.25, type: 'highpass', f: 2000 });
      tone(c, o, t, { w: 'pulse25', f: 1760 * p, f1: 880 * p, ft: 0.25, d: 0.28, v: 0.06, exp: true });
      SFX.hit(c, o, t + 0.08, p * 0.8);
      return 0.38;
    },
    heal: (c, o, t, p) => {
      seq(c, o, t, 'C5 E5 G5 C6 E6 G6:4', { step: 0.06, w: 'triangle', v: 0.2, p: p, exp: true, tail: 0.3 });
      seq(c, o, t + 0.03, 'C6 E6 G6 C7 E7 G7:4', { step: 0.06, bell: true, harmonic: true, v: 0.03, p: p, tail: 0.2 });
      return 0.95;
    },
    heart_lose: (c, o, t, p) => { // descida triste com a última nota "murchando"
      seq(c, o, t, 'A5:2 E5:2 C5:2', { step: 0.09, w: 'pulse25', v: 0.11, p: p, lp: 2600 });
      tone(c, o, t + 0.54, { w: 'pulse25', f: 440 * p, f1: 415 * p, ft: 0.45, d: 0.55, v: 0.11, lp: 2200, vib: 22, vr: 5 });
      seq(c, o, t, 'A3:2 A3:2 F3:8', { step: 0.09, w: 'triangle', v: 0.18, p: p });
      return 1.15;
    },
    typing: (c, o, t, p) => {
      [0, 0.065, 0.12, 0.2, 0.255, 0.33, 0.4].forEach((dt, i) => {
        noise(c, o, t + dt, { d: 0.022, v: 0.13, type: 'highpass', f: (2500 + (i % 3) * 900) * p });
        tone(c, o, t + dt, { w: 'square', f: 180 * p, d: 0.012, v: 0.025, a: 0.001, exp: true });
      });
      return 0.45;
    },
    page: (c, o, t, p) => {
      noise(c, o, t, { d: 0.22, v: 0.2, a: 0.06, type: 'bandpass', f: 900 * p, f1: 3800 * p, q: 0.7, exp: false, r: 0.1 });
      noise(c, o, t + 0.14, { d: 0.1, v: 0.06, type: 'highpass', f: 5000 });
      return 0.3;
    },
    star: (c, o, t, p) => {
      bell(c, o, t, 1568 * p, 0.6, 0.1, true);
      bell(c, o, t + 0.07, 2349 * p, 0.7, 0.085, true);
      tone(c, o, t, { w: 'pulse12', f: 3136 * p, d: 0.08, v: 0.03, exp: true });
      return 0.8;
    },
    achievement: (c, o, t, p) => { // fanfarra: arpejo, resposta e acorde final
      const st = 0.07;
      seq(c, o, t, 'G5 C6 E6 G6:3 E6 G6:6', { step: st, w: 'square', v: 0.07, p: p, tail: 0.2, vib: 10 });
      seq(c, o, t, 'E5 G5 C6 E6:3 C6 E6:6', { step: st, w: 'pulse25', v: 0.05, p: p, tail: 0.2 });
      seq(c, o, t, 'C3:3 G3:3 C4:7', { step: st, w: 'triangle', v: 0.22, p: p, tail: 0.15 });
      drum(c, o, t, 'k', 0.6);
      drum(c, o, t + st * 6, 'k', 0.6);
      drum(c, o, t + st * 6, 'c', 0.8);
      SPARK.forEach((f, i) => bell(c, o, t + st * 6 + i * 0.05, f * p, 0.4, 0.035, true));
      return 1.4;
    },
    rewind: (c, o, t, p) => { // fita voltando: chiado e pitch subindo com "wow" rápido
      const osc = c.createOscillator(), g = c.createGain(), l = c.createOscillator(), lg = c.createGain(), bq = c.createBiquadFilter();
      setWave(c, osc, 'pulse25');
      osc.frequency.setValueAtTime(300 * p, t);
      osc.frequency.exponentialRampToValueAtTime(1500 * p, t + 0.7);
      l.frequency.setValueAtTime(14, t);
      l.frequency.linearRampToValueAtTime(32, t + 0.7);
      lg.gain.setValueAtTime(120 * p, t);
      lg.gain.linearRampToValueAtTime(380 * p, t + 0.7);
      l.connect(lg);
      lg.connect(osc.frequency);
      bq.type = 'lowpass';
      bq.frequency.value = 3500;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.02, t + 0.05);
      g.gain.linearRampToValueAtTime(0.1, t + 0.66);
      g.gain.linearRampToValueAtTime(0, t + 0.72);
      osc.connect(bq);
      bq.connect(g);
      g.connect(o);
      osc.start(t); l.start(t);
      osc.stop(t + 0.75); l.stop(t + 0.75);
      osc.onended = () => after(g);
      noise(c, o, t, { d: 0.72, v: 0.08, a: 0.6, type: 'bandpass', f: 1500, f1: 5000, q: 1, exp: false, r: 0.06 });
      return 0.8;
    },
    thunder: (c, o, t, p) => {
      noise(c, o, t, { d: 0.18, v: 0.22, type: 'highpass', f: 1200 });
      noise(c, o, t + 0.02, { d: 2.2, v: 0.42, a: 0.02, type: 'lowpass', f: 900 * p, f1: 110 * p, ft: 1.5 });
      noise(c, o, t + 0.1, { d: 2.3, v: 0.3, a: 0.4, type: 'lowpass', f: 180 * p, q: 0.8 });
      return 2.5;
    },
    step: (c, o, t, p) => {
      noise(c, o, t, { d: 0.06, v: 0.28, type: 'lowpass', f: 450 * p });
      tone(c, o, t, { w: 'sine', f: 140 * p, f1: 70 * p, d: 0.07, v: 0.22, exp: true });
      return 0.1;
    },
    jump: (c, o, t, p) => { tone(c, o, t, { w: 'pulse25', f: 300 * p, f1: 760 * p, ft: 0.14, d: 0.16, v: 0.1, r: 0.04 }); return 0.18; },
    pop: (c, o, t, p) => {
      tone(c, o, t, { w: 'sine', f: 380 * p, f1: 1000 * p, ft: 0.05, d: 0.07, v: 0.3, exp: true });
      noise(c, o, t, { d: 0.015, v: 0.08, type: 'highpass', f: 3000 });
      return 0.1;
    },
    buzz: (c, o, t, p) => {
      tone(c, o, t, { w: 'square', f: 110 * p, d: 0.38, v: 0.07, lp: 1400 });
      tone(c, o, t, { w: 'square', f: 116.5 * p, d: 0.38, v: 0.07, lp: 1400 });
      return 0.42;
    },
    tick: (c, o, t, p) => {
      noise(c, o, t, { d: 0.018, v: 0.22, type: 'highpass', f: 3500 * p });
      tone(c, o, t, { w: 'sine', f: 2600 * p, d: 0.012, v: 0.05, a: 0.001, exp: true });
      return 0.04;
    },
    glitch: (c, o, t, p) => {
      [880, 220, 1760, 440, 1320, 110, 660, 1980, 330, 1100, 165, 1500].forEach((f, i) => {
        if (i % 3 === 2) noise(c, o, t + i * 0.028, { d: 0.02, v: 0.11, type: 'highpass', f: 2000 });
        else tone(c, o, t + i * 0.028, { w: i % 2 ? 'square' : 'pulse12', f: f * p, d: 0.024, v: 0.055, a: 0.001, r: 0.004 });
      });
      return 0.37;
    },
    confetti: (c, o, t, p) => {
      SFX.pop(c, o, t, p);
      noise(c, o, t + 0.01, { d: 0.15, v: 0.16, type: 'bandpass', f: 3000, q: 0.5 });
      SPARK.forEach((f, i) => bell(c, o, t + 0.08 + i * 0.035, f * p, 0.3, 0.05, true));
      return 0.55;
    },
    drumroll: (c, o, t, p) => {
      const n = 26;
      for (let i = 0; i < n; i++) drum(c, o, t + i * 0.042, 's', 0.2 + (0.65 * i) / n);
      const e = t + n * 0.042 + 0.02;
      drum(c, o, e, 'k', 1);
      drum(c, o, e, 's', 1);
      drum(c, o, e, 'c', 1.3);
      return e - t + 1.1;
    },
    magic: (c, o, t, p) => {
      const run = 'C6 D6 E6 F#6 G#6 A#6 C7:4';
      seq(c, o, t, run, { step: 0.045, w: 'triangle', v: 0.16, p: p, exp: true, tail: 0.25 });
      seq(c, o, t + 0.16, run, { step: 0.045, w: 'triangle', v: 0.06, p: p, exp: true, tail: 0.25 });
      seq(c, o, t + 0.32, run, { step: 0.045, w: 'triangle', v: 0.025, p: p, exp: true, tail: 0.25 });
      noise(c, o, t, { d: 0.7, v: 0.03, a: 0.3, type: 'highpass', f: 6000, exp: false, r: 0.35 });
      return 1.0;
    },
    door: (c, o, t, p) => { // rangido + baque
      const osc = c.createOscillator(), bq = c.createBiquadFilter(), g = c.createGain(), l = c.createOscillator(), lg = c.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(95 * p, t);
      osc.frequency.linearRampToValueAtTime(140 * p, t + 0.22);
      osc.frequency.linearRampToValueAtTime(85 * p, t + 0.45);
      l.frequency.value = 17;
      lg.gain.value = 45;
      l.connect(lg);
      lg.connect(osc.detune);
      bq.type = 'bandpass';
      bq.frequency.value = 900;
      bq.Q.value = 3;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.16, t + 0.05);
      g.gain.setValueAtTime(0.16, t + 0.38);
      g.gain.linearRampToValueAtTime(0, t + 0.46);
      osc.connect(bq);
      bq.connect(g);
      g.connect(o);
      osc.start(t); l.start(t);
      osc.stop(t + 0.48); l.stop(t + 0.48);
      osc.onended = () => after(g);
      noise(c, o, t + 0.47, { d: 0.18, v: 0.4, type: 'lowpass', f: 260 });
      tone(c, o, t + 0.47, { w: 'sine', f: 95 * p, f1: 55 * p, d: 0.2, v: 0.32, exp: true });
      return 0.7;
    },
    coffee: (c, o, t, p) => { // borbulhar da cafeteira
      noise(c, o, t, { d: 0.75, v: 0.05, a: 0.1, type: 'bandpass', f: 1100, q: 1.5, exp: false, r: 0.2 });
      [[0, 520], [0.07, 700], [0.16, 610], [0.21, 820], [0.3, 560], [0.38, 900], [0.43, 680], [0.52, 760], [0.6, 640]].forEach(([dt, f]) => {
        tone(c, o, t + dt, { w: 'sine', f: f * p, f1: f * 1.6 * p, ft: 0.035, d: 0.045, v: 0.13, a: 0.003, r: 0.015 });
      });
      return 0.8;
    },
    card: (c, o, t, p) => {
      noise(c, o, t, { d: 0.08, v: 0.22, a: 0.005, type: 'highpass', f: 2200 * p, f1: 5000 * p });
      tone(c, o, t + 0.01, { w: 'triangle', f: 1400 * p, d: 0.025, v: 0.06, exp: true });
      return 0.1;
    },
    drop: (c, o, t, p) => {
      tone(c, o, t, { w: 'sine', f: 1000 * p, f1: 200 * p, ft: 0.22, d: 0.24, v: 0.2, r: 0.03 });
      noise(c, o, t + 0.23, { d: 0.08, v: 0.25, type: 'lowpass', f: 400 });
      tone(c, o, t + 0.23, { w: 'sine', f: 110 * p, f1: 60 * p, d: 0.1, v: 0.25, exp: true });
      return 0.38;
    },
    pickup: (c, o, t, p) => seq(c, o, t, 'G5 C6 E6 G6:3', { step: 0.04, w: 'pulse25', v: 0.11, p: p, exp: true }),
    level_up: (c, o, t, p) => {
      seq(c, o, t, 'C5 E5 G5 C6 E6 G6 C7:6', { step: 0.055, w: 'square', v: 0.075, p: p, exp: true, tail: 0.15 });
      seq(c, o, t, 'C3:3 G3:3 C4:7', { step: 0.055, w: 'triangle', v: 0.22, p: p });
      SPARK.forEach((f, i) => bell(c, o, t + 0.36 + i * 0.04, f * p, 0.35, 0.04, true));
      return 1.0;
    },
    boss_hit: (c, o, t, p) => {
      noise(c, o, t, { d: 0.3, v: 0.4, type: 'lowpass', f: 2200 * p, f1: 400 * p });
      tone(c, o, t, { w: 'square', f: 170 * p, f1: 38 * p, ft: 0.25, d: 0.28, v: 0.1, exp: true, lp: 1200 });
      noise(c, o, t, { d: 0.05, v: 0.22, type: 'highpass', f: 3000 });
      tone(c, o, t, { w: 'sine', f: 70 * p, f1: 40 * p, d: 0.3, v: 0.4, exp: true });
      return 0.4;
    },
    boss_heal: (c, o, t, p) => { // cura sombria (menor, subindo, com vibrato)
      tone(c, o, t, { w: 'sawtooth', f: 110 * p, f1: 440 * p, ft: 0.8, d: 0.9, v: 0.05, lp: 900, a: 0.1, r: 0.2 });
      seq(c, o, t, 'A3 C4 E4 A4 C5 E5:4', { step: 0.09, w: 'triangle', v: 0.17, p: p, vib: 25, vr: 6, tail: 0.15 });
      return 1.05;
    },
    boss_roar: (c, o, t, p) => {
      const ws = c.createWaveShaper(), bq = c.createBiquadFilter(), g = c.createGain(), am = c.createGain(), l = c.createOscillator(), lg = c.createGain();
      ws.curve = getDist();
      bq.type = 'lowpass';
      bq.frequency.setValueAtTime(700, t);
      bq.frequency.exponentialRampToValueAtTime(220, t + 1.25);
      am.gain.value = 0.6;
      l.frequency.value = 23;
      lg.gain.value = 0.4;
      l.connect(lg);
      lg.connect(am.gain);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.12);
      g.gain.setValueAtTime(0.18, t + 0.8);
      g.gain.linearRampToValueAtTime(0, t + 1.25);
      [82, 87].forEach((f) => {
        const osc = c.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f * p, t);
        osc.frequency.exponentialRampToValueAtTime(f * 0.7 * p, t + 1.25);
        osc.connect(ws);
        osc.start(t);
        osc.stop(t + 1.28);
      });
      ws.connect(bq);
      bq.connect(am);
      am.connect(g);
      g.connect(o);
      l.start(t);
      l.stop(t + 1.28);
      l.onended = () => after(g);
      noise(c, o, t, { d: 1.2, v: 0.2, a: 0.1, type: 'lowpass', f: 500, f1: 150, exp: false, r: 0.4 });
      return 1.35;
    },
    shrink: (c, o, t, p) => {
      tone(c, o, t, { w: 'square', f: 1300 * p, f1: 140 * p, ft: 0.55, d: 0.58, v: 0.06, vib: 60, vr: 16, lp: 3000 });
      tone(c, o, t, { w: 'triangle', f: 650 * p, f1: 70 * p, ft: 0.55, d: 0.58, v: 0.12 });
      return 0.62;
    },
    camera: (c, o, t, p) => {
      noise(c, o, t, { d: 0.025, v: 0.3, type: 'highpass', f: 3000 });
      tone(c, o, t, { w: 'square', f: 1800 * p, d: 0.01, v: 0.04, a: 0.001, exp: true });
      noise(c, o, t + 0.08, { d: 0.06, v: 0.28, type: 'bandpass', f: 1800, q: 1 });
      tone(c, o, t + 0.08, { w: 'sine', f: 300 * p, d: 0.03, v: 0.1, exp: true });
      return 0.2;
    },
    chime: (c, o, t, p) => {
      bell(c, o, t, 1319 * p, 1.6, 0.12);
      bell(c, o, t + 0.12, 1976 * p, 1.4, 0.08);
      return 1.75;
    },
    jingle_capitulo: (c, o, t, p) => { // fragmento do Tema da Faísca + acorde
      const st = 0.1;
      seq(c, o, t, 'G4 C5 E5:2 G5:2 E5 G5 C6:7', { step: st, w: 'pulse25', v: 0.1, p: p, vib: 12, tail: 0.25 });
      seq(c, o, t, '.:8 C5+E5+G5:7', { step: st, w: 'pulse12', v: 0.06, p: p, a: 0.02, tail: 0.25 });
      seq(c, o, t, 'C3:4 E3:2 G3:2 C3:7', { step: st, w: 'triangle', v: 0.22, p: p, tail: 0.15 });
      drum(c, o, t, 'k', 0.7);
      drum(c, o, t + st * 2, 'h', 0.8);
      drum(c, o, t + st * 4, 's', 0.6);
      drum(c, o, t + st * 6, 'h', 0.8);
      drum(c, o, t + st * 8, 'k', 0.8);
      drum(c, o, t + st * 8, 'c', 0.9);
      return 2.0;
    },
    jingle_vitoria: (c, o, t, p) => { // C – Dm7 – G – C, "ta-ta-ta TAAA" subindo
      const st = 0.085;
      seq(c, o, t, 'G5 G5 G5 C6:3 A5 A5 A5 D6:3 B5 C6 D6 E6:8', { step: st, w: 'square', v: 0.07, p: p, vib: 12, tail: 0.2 });
      seq(c, o, t, 'E5 E5 E5 G5:3 F5 F5 F5 A5:3 G5 A5 B5 C6:8', { step: st, w: 'pulse25', v: 0.055, p: p, tail: 0.2 });
      seq(c, o, t, 'C3:6 D3:6 G2:3 C3:8', { step: st, w: 'triangle', v: 0.22, p: p, tail: 0.15 });
      [[0, 'k'], [3, 's'], [6, 'k'], [9, 's'], [12, 'k'], [13, 's'], [14, 's'], [15, 'k'], [15, 'c']].forEach(([s, k]) => drum(c, o, t + s * st, k, 0.75));
      return 2.6;
    },
    jingle_fato: (c, o, t, p) => { // "você sabia?": sininhos subindo e parando na 9ª (curiosidade)
      const st = 0.09;
      seq(c, o, t, 'E6 G6 C7:2 B6 D7:6', { step: st, bell: true, v: 0.11, p: p, tail: 0.8 });
      seq(c, o, t, 'E5 G5 C6:2 B5 D6:6', { step: st, w: 'pulse12', v: 0.035, p: p, exp: true, tail: 0.3 });
      seq(c, o, t, 'C4+G4+B4:11', { step: st, w: 'triangle', v: 0.1, p: p, a: 0.08, tail: 0.5 });
      return 1.9;
    },
  };

  // =====================================================================
  // 7. Vozes (blips de diálogo)
  // =====================================================================
  const VOICES = {
    pai: { w: 'triangle', f: 147, v: 0.3, d: 0.04, lp: 1100, w2: 'pulse25', v2: 0.025, off: [0, 2, -2, 3, 0, -1, 4, 1] },
    filho: { w: 'pulse25', f: 262, v: 0.06, d: 0.035, lp: 2200, off: [0, 3, 5, 2, -2, 4, 7, 0] },
    faisca: { w: 'pulse12', f: 784, f1: 1.22, v: 0.06, d: 0.032, lp: 5000, w2: 'sine', v2: 0.04, m2: 2, off: [0, 4, 7, 5, 9, 2, 12, 7] },
    chefe: { w: 'square', f: 196, v: 0.05, d: 0.036, lp: 1200, a: 0.001, off: [0, 0, 2, -2, 0, 3, -1, 0] },
    jorge: { w: 'triangle', f: 247, bounce: 1.3, v: 0.27, d: 0.044, lp: 3000, off: [0, 5, 2, 7, 4, 9, 0, 5] },
    golpista: { w: 'sawtooth', f: 98, v: 0.06, d: 0.045, lp: 650, dist: true, det: 25, off: [0, -1, 1, -2, 0, 1, -3, 0] },
    duvida: { w: 'sine', f: 87, v: 0.34, d: 0.05, wob: 90, w2: 'triangle', v2: 0.08, m2: 2, off: [0, -3, 2, -5, 0, 3, -2, 1] },
    narrador: { w: 'sine', f: 523, v: 0.1, d: 0.03, w2: 'triangle', v2: 0.03, m2: 1, off: [0, 2, 4, 2, -1, 0, 5, 3] },
  };
  function voiceAt(c, out, t, who, k) {
    const V = VOICES[who] || VOICES.narrador;
    const f = V.f * Math.pow(2, V.off[k % V.off.length] / 12);
    const d = V.d, a = V.a || 0.004, end = t + d;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(V.v, t + a);
    g.gain.setValueAtTime(V.v, t + d * 0.45);
    g.gain.linearRampToValueAtTime(0, end);
    let head = g;
    if (V.lp) {
      const bq = c.createBiquadFilter();
      bq.type = 'lowpass';
      bq.frequency.value = V.lp;
      bq.connect(g);
      head = bq;
    }
    let sink = head;
    if (V.dist) {
      const ws = c.createWaveShaper();
      ws.curve = getDist();
      ws.connect(head);
      sink = ws;
    }
    g.connect(out);
    const mk = (w, freq) => {
      const o = c.createOscillator();
      setWave(c, o, w);
      o.frequency.setValueAtTime(freq, t);
      if (V.f1) o.frequency.exponentialRampToValueAtTime(freq * V.f1, end);
      if (V.bounce) {
        o.frequency.linearRampToValueAtTime(freq * V.bounce, t + d * 0.45);
        o.frequency.linearRampToValueAtTime(freq, end);
      }
      o.start(t);
      o.stop(end + 0.01);
      return o;
    };
    const o1 = mk(V.w, f);
    o1.connect(sink);
    o1.onended = () => after(g);
    if (V.det) { const o3 = mk(V.w, f); o3.detune.value = V.det; o3.connect(sink); }
    if (V.wob) {
      const l = c.createOscillator(), lg = c.createGain();
      l.frequency.value = 14;
      lg.gain.value = V.wob;
      l.connect(lg);
      lg.connect(o1.detune);
      l.start(t);
      l.stop(end + 0.01);
    }
    if (V.w2) {
      const o2 = mk(V.w2, f * (V.m2 || 1)), g2 = c.createGain();
      g2.gain.value = V.v2 / V.v;
      o2.connect(g2);
      g2.connect(sink);
    }
    return d + 0.02;
  }

  // =====================================================================
  // 8. Cadeia de saída e runtime (AudioContext real)
  // =====================================================================
  const MUSIC_SCALE = 0.62, SFX_SCALE = 0.85, DUCK = 0.35;
  function buildChain(c) {
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.knee.value = 10;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.22;
    const master = c.createGain(), music = c.createGain(), sfx = c.createGain();
    master.gain.value = 0.9;
    music.connect(master);
    sfx.connect(master);
    master.connect(comp);
    comp.connect(c.destination);
    return { master: master, comp: comp, music: music, sfx: sfx };
  }
  function setParam(p, v, c, ramp) {
    const now = c.currentTime;
    try {
      p.cancelScheduledValues(now);
      p.setValueAtTime(p.value, now);
      p.linearRampToValueAtTime(v, now + (ramp || 0.05));
    } catch (e) { p.value = v; }
  }

  const A = (P2.audio = P2.audio || {});
  let ctx = null, chain = null, supported = true, enabled = true, ducked = false, hiddenPause = false;
  const vols = { music: 0.7, sfx: 0.8 };
  let player = null, timer = null, offTimer = null, voiceN = 0, lastVoice = -1;
  const fading = [], lastSfx = {}, loops = [];
  A.current = null;

  const ready = () => !!(ctx && chain && enabled);
  function applyVolumes(ramp) {
    if (!ctx || !chain) return;
    setParam(chain.music.gain, vols.music * MUSIC_SCALE * (ducked ? DUCK : 1), ctx, ramp);
    setParam(chain.sfx.gain, vols.sfx * SFX_SCALE, ctx, ramp);
  }
  function tick() {
    try {
      if (!ctx) return;
      if (ctx.state === 'running') {
        const until = ctx.currentTime + 0.12;
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
        chain.master.gain.value = enabled ? 0.9 : 0;
        applyVolumes(0.01);
        try { // destrava o áudio no iOS com um buffer mudo
          const b = ctx.createBufferSource();
          b.buffer = ctx.createBuffer(1, 1, 22050);
          b.connect(ctx.destination);
          b.start(0);
        } catch (e) { /* ok */ }
      }
      if (enabled && ctx.state !== 'running' && !document.hidden) {
        const r = ctx.resume();
        if (r && r.catch) r.catch(() => {});
      }
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
        if (!document.hidden) { const r = ctx.resume(); if (r && r.catch) r.catch(() => {}); }
        setParam(chain.master.gain, 0.9, ctx, 0.1);
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

  A.sfx = function (name, opts) {
    try {
      if (!ready() || !SFX[name]) return null;
      if (ctx.state !== 'running' && hiddenPause) return null;
      opts = opts || {};
      const now = ctx.currentTime;
      if (!opts.loop && lastSfx[name] != null && now - lastSfx[name] < 0.03 && now >= lastSfx[name]) return null;
      lastSfx[name] = now;
      const pitch = Math.max(0.25, Math.min(4, opts.pitch != null && isFinite(opts.pitch) ? +opts.pitch : 1));
      const vol = Math.max(0, Math.min(2, opts.vol != null && isFinite(opts.vol) ? +opts.vol : 1));
      const h = { stopped: false, timer: null, outs: [] };
      const fire = () => {
        if (h.stopped || !ready()) return;
        const out = ctx.createGain();
        out.gain.value = vol;
        out.connect(chain.sfx);
        const dur = SFX[name](ctx, out, ctx.currentTime + 0.005, pitch) || 0.5;
        h.outs.push(out);
        setTimeout(() => { after(out); const i = h.outs.indexOf(out); if (i >= 0) h.outs.splice(i, 1); }, (dur + 0.6) * 1000);
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
        } else if (hiddenPause) {
          hiddenPause = false;
          if (enabled) { const r = ctx.resume(); if (r && r.catch) r.catch(() => {}); }
        }
      } catch (e) { /* ok */ }
    });
  } catch (e) { /* ok */ }

  // Ferramentas internas (testes/renderização offline). Não usar no jogo.
  A._lib = {
    TRACKS: TRACKS, SFX: SFX, VOICES: VOICES, CHORDS: CHORDS, noteMidi: noteMidi, mtof: mtof, parseChord: parseChord,
    compile: compile, validate: validate, buildChain: buildChain, Player: Player,
    MUSIC_SCALE: MUSIC_SCALE, SFX_SCALE: SFX_SCALE,
    renderTrack: function (c, dest, name, secs) { const p = new Player(c, dest, name, 0.02, 0); p.pump(secs); return p; },
    playSfx: function (c, dest, name, t, pitch) { return SFX[name] ? SFX[name](c, dest, t, pitch || 1) : 0; },
    playVoice: function (c, dest, who, t, k) { return voiceAt(c, dest, t, who, k || 0); },
    ctx: () => ctx,
    chain: () => chain,
    state: () => ({
      ctx: ctx ? ctx.state : null, time: ctx ? ctx.currentTime : 0, player: player ? player.name : null,
      fading: fading.length, timer: !!timer, enabled: enabled, ducked: ducked, voices: voiceN, loops: loops.length,
      music: chain ? chain.music.gain.value : null, master: chain ? chain.master.gain.value : null,
    }),
  };
})();
