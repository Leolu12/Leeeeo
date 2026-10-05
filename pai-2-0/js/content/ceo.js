/* PAI 2.0 — ceo.js
 * O mundo do pai CEO: quem é quem na empresa e na família. Os textos dos
 * capítulos usam estes dados pelos tokens ({chefe}, {jorgePapel}...).
 */
(function () {
  'use strict';
  const P2 = (window.P2 = window.P2 || {});
  P2.CEO = {
    id: 'ceo',
    label: 'CEO',
    local: 'escritório',
    noLocal: 'no escritório',
    doLocal: 'do escritório',
    // "Chefe" de um CEO: a presidente do conselho
    chefe: { nome: 'Dona Marta', titulo: 'presidente do conselho', ele: 'ela', artigo: 'a' },
    // Jorge: diretor comercial, gente boa, acredita em tudo que chega no WhatsApp
    jorge: { papel: 'diretor comercial' },
    // Outros diretores (figurantes nas reuniões)
    diretores: [
      { id: 'bia', nome: 'Bia', titulo: 'diretora financeira (CFO)', seed: 3, female: true },
      { id: 'rafael', nome: 'Rafael', titulo: 'diretor de operações', seed: 5, female: false },
      { id: 'luana', nome: 'Luana', titulo: 'diretora de pessoas (RH)', seed: 8, female: true },
      { id: 'tadeu', nome: 'Tadeu', titulo: 'diretor jurídico', seed: 2, female: false },
    ],
    irmao: 'Beto',
    secretaria: 'Sônia',
  };
})();
