// Gera /home/user/Leeeeo/pai-2-0/js/content/fontes.js a partir de spec.js + JSONs da pesquisa.
const fs = require('fs');
const path = require('path');
const SP = '/tmp/claude-0/-home-user-Leeeeo/7293cc00-7428-51ca-a23f-ac6d06631493/scratchpad';
const OUT = process.argv[2] || '/home/user/Leeeeo/pai-2-0/js/content/fontes.js';
delete require.cache[require.resolve('./spec.js')];
const spec = require('./spec.js');

// ---- fontes de origem
const src = {};
const files = ['persuasao', 'playbook', 'ceo_global', 'ceo_brasil', 'seguranca', 'limites'];
for (const f of files) {
  const j = JSON.parse(fs.readFileSync(path.join(SP, 'research', f + '.json'), 'utf8'));
  j.facts.forEach((x) => { (src[x.key] = src[x.key] || []).push(Object.assign({ _file: f }, x)); });
}
JSON.parse(fs.readFileSync(path.join(SP, 'facts_round1.json'), 'utf8')).forEach((x) => { (src[x.key] = src[x.key] || []).push(Object.assign({ _file: 'round1' }, x)); });

const SELOS = ['independente', 'governo', 'imprensa', 'consultoria', 'fornecedor', 'empresa'];
const TEMAS = spec.temas.map((t) => t[0]);
const errors = [], warns = [];
const out = {};
const seen = new Set();
for (const e of spec.fontes) {
  if (seen.has(e.key)) errors.push('chave duplicada: ' + e.key);
  seen.add(e.key);
  const s = (src[e.src || e.key] || []);
  // prefere a versão de confiança alta
  const best = s.slice().sort((a, b) => (a.confianca === 'alta' ? -1 : 0) - (b.confianca === 'alta' ? -1 : 0))[0];
  if (!best) errors.push('sem fato de origem: ' + e.key);
  const o = {
    titulo: e.titulo,
    texto: e.texto,
    fonte: e.fonte,
    curta: e.curta || (best && best.curta),
    url: e.url || (best && best.url),
    ano: e.ano || (best && Number(best.ano)),
    selo: e.selo,
    amostra: e.amostra,
    tema: e.tema,
  };
  if (best && e.url && e.url !== best.url) warns.push('url trocada em ' + e.key + ': ' + best.url + ' -> ' + e.url);
  if (best && e.ano && Number(e.ano) !== Number(best.ano)) warns.push('ano trocado em ' + e.key + ': ' + best.ano + ' -> ' + e.ano);
  if (best && best.confianca === 'baixa') errors.push('confiança baixa: ' + e.key);
  for (const k of ['titulo', 'texto', 'fonte', 'curta', 'url', 'ano', 'selo', 'tema']) if (o[k] == null || o[k] === '') errors.push('campo vazio ' + k + ' em ' + e.key);
  if (typeof o.amostra !== 'string') errors.push('amostra ausente em ' + e.key);
  if (!/^https:\/\//.test(o.url)) errors.push('url não https em ' + e.key + ': ' + o.url);
  if (!SELOS.includes(o.selo)) errors.push('selo inválido em ' + e.key);
  if (!TEMAS.includes(o.tema)) errors.push('tema inválido em ' + e.key);
  if (o.texto.length > 360) errors.push('texto > 360 em ' + e.key + ' (' + o.texto.length + ')');
  else if (o.texto.length > 330) warns.push('texto > 330 em ' + e.key + ' (' + o.texto.length + ')');
  for (const k of ['titulo', 'texto', 'fonte', 'amostra', 'curta']) if (/[*{}]/.test(o[k] || '')) errors.push('caractere de marcação em ' + k + ' de ' + e.key);
  if (!e.linha) errors.push('sem linha de cabeçalho: ' + e.key);
  out[e.key] = o;
}
// cobertura: toda chave de origem deve estar em FONTES ou em alias (ou ser a origem de um "src")
const usedSrc = new Set(spec.fontes.map((e) => e.src || e.key));
for (const k of Object.keys(src)) {
  if (!out[k] && !spec.alias[k] && !usedSrc.has(k)) errors.push('chave de origem sem destino: ' + k);
}
for (const [a, t] of Object.entries(spec.alias)) {
  if (!out[t]) errors.push('alias para chave inexistente: ' + a + ' -> ' + t);
  if (out[a]) errors.push('alias colide com chave real: ' + a);
}

// ---- emitir
function q(s) { return "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"; }
const ordem = [];
spec.temas.forEach(([t]) => spec.fontes.filter((e) => e.tema === t).forEach((e) => ordem.push(e.key)));
if (ordem.length !== spec.fontes.length) errors.push('ordem incompleta');

let H = '';
H += '/* PAI 2.0 — fontes.js\n';
H += ' * FONTES: todos os fatos verificados que o jogo pode citar. Uso nos capítulos:\n';
H += " *   await G.fact('chave')            // um cartão\n";
H += " *   await G.fact(['chave1','chave2']) // vários cartões juntos\n";
H += ' * Cada entrada: { titulo, texto, fonte, curta, url, ano, selo, amostra, tema }\n';
H += ' *   selo:  independente (pesquisa acadêmica/revisada/independente) · governo (governo, regulador, Justiça)\n';
H += ' *          imprensa (reportagem) · consultoria (PwC, KPMG, McKinsey, BCG, EY, IBM IBV…)\n';
H += ' *          fornecedor (empresa que vende IA ou o produto em questão) · empresa (a própria empresa contando)\n';
H += ' *   amostra: base do número, curta (aparece como "Base: …"); vazia quando não se aplica.\n';
H += ' *   tema: agrupa os créditos (P2.FONTES_ORDEM) e os rótulos em P2.FONTES_TEMAS.\n';
H += ' * Regras de honestidade: os números são exatamente os conferidos na pesquisa (scratchpad/research +\n';
H += ' * facts_round1.json), com a ressalva principal no próprio texto (autodeclarado, estudo do fabricante,\n';
H += ' * amostra pequena, global e não Brasil etc.). Fatos de confiança baixa ficaram de fora. O estudo de\n';
H += ' * balanços de Chicago entra só como "foi retirado" (estudo_balancos_retirado), sem os números dele.\n';
H += ' * Não invente números: se precisar de um dado que não está aqui, não use.\n';
H += ' *\n';
H += ' * ====================== CHAVES POR TEMA (chave — fonte curta — resumo) ======================\n';
spec.temas.forEach(([t, label]) => {
  H += ' *\n * [' + t + '] ' + label + '\n';
  spec.fontes.filter((e) => e.tema === t).forEach((e) => {
    H += ' *   ' + e.key + ' — ' + out[e.key].curta + ' — ' + e.linha + '\n';
  });
});
H += ' *\n * Chaves antigas que continuam funcionando (apelidos de fatos repetidos, mesmos dados):\n';
Object.entries(spec.alias).forEach(([a, t]) => { H += ' *   ' + a + ' → ' + t + '\n'; });
H += ' */\n';
// garante que nada no cabeçalho feche o comentário
if (H.slice(2, -3).includes('*/')) errors.push('cabeçalho contém */');

let B = '';
B += "(function () {\n  'use strict';\n  const P2 = (window.P2 = window.P2 || {});\n\n";
B += '  const FONTES = {\n';
spec.temas.forEach(([t, label]) => {
  const list = spec.fontes.filter((e) => e.tema === t);
  if (!list.length) return;
  B += '    // ================================================================ ' + label + ' (' + t + ')\n';
  list.forEach((e) => {
    const o = out[e.key];
    B += '    ' + e.key + ': {\n';
    B += '      titulo: ' + q(o.titulo) + ',\n';
    B += '      texto: ' + q(o.texto) + ',\n';
    B += '      fonte: ' + q(o.fonte) + ',\n';
    B += '      curta: ' + q(o.curta) + ',\n';
    B += '      url: ' + q(o.url) + ',\n';
    B += '      ano: ' + o.ano + ', selo: ' + q(o.selo) + ', amostra: ' + q(o.amostra) + ', tema: ' + q(o.tema) + ',\n';
    B += '    },\n';
  });
});
B += '  };\n\n';
B += '  /** Rótulos dos temas, na ordem de leitura dos créditos. */\n';
B += '  const TEMAS = {\n';
spec.temas.forEach(([t, l]) => { B += '    ' + t + ': ' + q(l) + ',\n'; });
B += '  };\n\n';
B += '  /** Ordem dos créditos: agrupada por tema, na ordem do dia do jogo. */\n';
B += '  const ORDEM = [\n';
spec.temas.forEach(([t]) => {
  const ks = ordem.filter((k) => out[k].tema === t);
  if (!ks.length) return;
  B += '    // ' + t + '\n';
  let line = '   ';
  ks.forEach((k) => {
    const piece = ' ' + q(k) + ',';
    if ((line + piece).length > 110) { B += line + '\n'; line = '   '; }
    line += piece;
  });
  B += line + '\n';
});
B += '  ];\n\n';
B += '  /** Apelidos: chaves de fatos repetidos na pesquisa que apontam para a versão mantida. */\n';
B += '  const ALIAS = {\n';
Object.entries(spec.alias).forEach(([a, t]) => { B += '    ' + a + ': ' + q(t) + ',\n'; });
B += '  };\n';
B += '  // Os apelidos funcionam em P2.FONTES[chave], mas não aparecem em Object.keys (sem repetição nos créditos).\n';
B += '  Object.keys(ALIAS).forEach(function (old) {\n';
B += '    if (Object.prototype.hasOwnProperty.call(FONTES, old)) return;\n';
B += '    Object.defineProperty(FONTES, old, { enumerable: false, configurable: true, get: function () { return FONTES[ALIAS[old]]; } });\n';
B += '  });\n\n';
B += '  P2.FONTES = FONTES;\n';
B += '  P2.FONTES_TEMAS = TEMAS;\n';
B += '  P2.FONTES_ORDEM = ORDEM;\n';
B += '  P2.FONTES_ALIAS = ALIAS;\n';
B += '})();\n';

if (errors.length) { console.log('ERROS:\n  ' + errors.join('\n  ')); }
if (warns.length) { console.log('AVISOS:\n  ' + warns.join('\n  ')); }
if (!errors.length) {
  fs.writeFileSync(OUT, H + B);
  console.log('OK: ' + spec.fontes.length + ' fontes, ' + Object.keys(spec.alias).length + ' apelidos -> ' + OUT);
}
// relatório de comprimentos
const lens = spec.fontes.map((e) => [e.key, e.texto.length]).sort((a, b) => b[1] - a[1]);
console.log('maiores textos:', lens.slice(0, 12).map((x) => x.join('=')).join(' '));
