/* PAI 2.0 — Epílogo: "Pai 2.0"
 * Quarta-feira, 7h, café na varanda. {filho} pergunta: "Serve ou não serve?" e ele responde do jeito
 * dele. Depois: as Regras da casa (a política de IA de uma página da empresa, rascunhada pela Faísca e
 * passada na caneta vermelha por ele), o relatório do dia, o certificado, o desafio de 7 dias (planos
 * "se… então…"), a carta de {filho}, o Jorge pedindo aula e os créditos com todas as fontes.
 *
 * Partes (checkpoints):
 *   0 — Varanda: chegada (exploração), a resposta, a aposta
 *   1 — Regras da casa (minigame caneta vermelha + compromisso do CEO + documento assinado)
 *   2 — Relatório do dia + certificado
 *   3 — Desafio de 7 dias (minigame)
 *   4 — A carta, o Jorge, o último plano, fatos, lição, créditos
 *
 * Stats (bíblia F): epilogo { regras: [ids], plano7: [ids] }.  Conquistas: lider_exemplo, pai_2_0.
 */
(function () {
  'use strict';
  const P2 = window.P2;
  const quiet = (p) => { if (p && p.catch) p.catch(() => {}); return p; };

  // ------------------------------------------------------------------
  // Regras da casa: o rascunho da Faísca (6 boas + 4 armadilhas comuns)
  // ------------------------------------------------------------------
  const RASCUNHO = [
    {
      id: 'para_que', ok: true,
      txt: 'Usamos IA para rascunhar, resumir, revisar, preparar e aprender. Quem assina, confere.',
      why: 'É a regra-mãe: a IA rascunha, mas quem responde pelo que sai é quem assina.',
    },
    {
      id: 'proibir', ok: false,
      txt: 'Fica proibido usar IA no trabalho até segunda ordem.',
      why: 'Proibir não faz o pessoal parar: faz o pessoal esconder. O uso vai para o celular, em conta gratuita, sem regra nenhuma.',
      fix: 'Pode usar, sim: na ferramenta aprovada pela empresa, no plano corporativo, que não treina com os nossos dados.',
      fixId: 'ferramenta',
    },
    {
      id: 'nunca', ok: true,
      txt: 'Nunca, em nenhuma IA: senhas, códigos do SMS, dados bancários e fotos de documentos.',
      why: 'Isso não entra nem na ferramenta aprovada. Nenhuma IA precisa disso para ajudar.',
    },
    {
      id: 'trocar_nomes', ok: false,
      txt: 'Trocou os nomes, pode colar contrato de cliente em qualquer IA.',
      why: 'Trocar o nome não esconde o resto: valores, cláusulas e o próprio negócio continuam ali.',
      fix: 'Contratos, atas e dados de clientes e de funcionários: só na ferramenta aprovada. Trocar o nome não basta.',
      fixId: 'dados_empresa',
    },
    {
      id: 'direto_cliente', ok: false,
      txt: 'Se o texto da IA estiver bem escrito, pode ir direto para o cliente.',
      why: 'Bem escrito não quer dizer certo. Texto caprichado convence mais, inclusive quando está errado.',
      fix: 'Nada sai para cliente, conselho ou imprensa sem uma pessoa ler inteiro e conferir números, nomes e datas.',
      fixId: 'revisao_humana',
    },
    {
      id: 'reuniao', ok: true,
      txt: 'Gravar ou transcrever reunião só com aviso e concordância de todos.',
      why: 'Ninguém gosta de descobrir depois que foi gravado. Avisar no começo resolve.',
    },
    {
      id: 'pagamento', ok: true,
      txt: 'Pedido urgente de pagamento por WhatsApp, áudio ou vídeo: desligue e ligue de volta no número conhecido. O CEO nunca pede isso por esses canais.',
      why: 'Voz e rosto já podem ser imitados. Ligar de volta é o antídoto, e o exemplo vem de cima.',
    },
    {
      id: 'triagem', ok: false,
      txt: 'Para ganhar tempo, a IA faz a triagem dos currículos e indica quem promover.',
      why: 'Decisão sobre gente é de gente. A IA herda preconceitos dos dados e não conhece as pessoas como você conhece.',
      fix: 'Contratar, promover, avaliar e desligar são decisões humanas. A IA pode ajudar a organizar critérios, não a escolher pessoas.',
      fixId: 'pessoas',
    },
    {
      id: 'avisar', ok: true,
      txt: 'Errou, colou o que não devia ou desconfiou de golpe? Avise na hora. Quem avisa não é punido.',
      why: 'Erro escondido vira problema grande. Erro avisado cedo vira aprendizado.',
    },
    {
      id: 'revisar', ok: true,
      txt: 'Estas regras são revistas a cada 6 meses: as ferramentas mudam rápido.',
      why: 'Planos, nomes e regras de privacidade mudam de um semestre para o outro.',
    },
  ];
  const RUINS = RASCUNHO.filter((r) => !r.ok).length;

  const COMPROMISSOS = [
    { id: 'c_exemplo', text: 'Eu sou o primeiro a usar. E conto nas reuniões quando ela erra.', sub: 'Exemplo de cima: a equipe usa melhor quando vê o chefe usando direito.' },
    { id: 'c_sem_punicao', text: 'Ninguém aqui é punido por admitir que usa IA. A gente corrige o jeito.', sub: 'Uso às claras é uso que dá para orientar.' },
    { id: 'c_pratica', text: 'Quem quiser aprender tem 10 minutos por dia, no expediente, para praticar.', sub: 'Pouco, todo dia, de preferência de manhã.' },
  ];

  // ------------------------------------------------------------------
  // Desafio de 7 dias: planos "se… então…" (ele escolhe até 3)
  // ------------------------------------------------------------------
  const PLANOS = [
    {
      id: 'cafe', icon: '☕', se: 'Se eu sentar para o primeiro café,', entao: 'então faço um pedido pequeno e de verdade.',
      prompt: 'Hoje tenho: [3 compromissos, em termos gerais]. Monte a ordem do dia em blocos de tempo e diga o que dá para delegar. Se faltar informação, me pergunte antes.',
      cuidado: 'Fale da agenda em termos gerais: sem nomes de clientes nem valores.',
    },
    {
      id: 'email', icon: '📧', se: 'Se eu abrir o e-mail às 8h,', entao: 'então peço à IA da empresa para separar os 5 urgentes.',
      prompt: 'Aqui estão só os assuntos dos e-mails de hoje. Separe em: urgente hoje, importante esta semana e pode esperar. Se tiver dúvida em algum, diga.',
      cuidado: 'Só na ferramenta aprovada pela empresa. Confira um dos “urgentes”.',
    },
    {
      id: 'documento', icon: '📄', se: 'Se chegar um documento com mais de 10 páginas,', entao: 'então peço o resumo com página e trecho.',
      prompt: '[Documento primeiro, pergunta no fim.]\nResuma os 10 pontos mais importantes e os riscos. Para cada um, cite a página e o trecho literal. No fim, diga o que este documento NÃO responde.',
      cuidado: 'Documento da empresa: só na ferramenta aprovada. Confira duas citações.',
    },
    {
      id: 'decisao', icon: '⚖️', se: 'Se eu já estiver inclinado a uma decisão grande,', entao: 'então peço os argumentos contra antes de bater o martelo.',
      prompt: 'Estou avaliando [decisão]. Não vou dizer o que prefiro. Liste os 7 argumentos mais fortes CONTRA. Depois imagine que, daqui a um ano, deu errado: por quê?',
      cuidado: 'A decisão continua sua. Ouça também uma pessoa de confiança.',
    },
    {
      id: 'reuniao', icon: '🎙️', se: 'Se eu sair de uma reunião,', entao: 'então dito as decisões e os prazos no caminho.',
      prompt: 'Vou ditar o que foi decidido. Organize em: decisão, responsável, prazo e “a definir”. Não invente nada que eu não disse e marque o que ficou vago.',
      cuidado: 'Confira nomes e datas antes de mandar o resumo.',
    },
    {
      id: 'conferir', icon: '🔎', se: 'Se a IA me der um número, uma lei ou uma citação,', entao: 'então confiro na fonte antes de repassar.',
      prompt: 'De onde veio esse dado? Me dê a fonte, o link e o trecho exato. Qual é o seu grau de certeza e o que pode estar errado?',
      cuidado: 'Abra o link você mesmo: a IA também erra a fonte.',
    },
    {
      id: 'golpe', icon: '📞', se: 'Se alguém pedir dinheiro com pressa e segredo,', entao: 'então desligo e ligo de volta no número que eu conheço.',
      prompt: null,
      semIA: 'Este plano não tem pedido para a IA: aqui quem age é você. Desligar, ligar de volta e, em família, a palavra combinada.',
    },
    {
      id: 'aprender', icon: '🎓', se: 'Se sobrarem 15 minutos à noite,', entao: 'então aprendo uma coisa nova com a IA.',
      prompt: 'Me explique [tema] com comparações com [algo que eu conheço bem]. Depois me faça 3 perguntas, uma de cada vez, e corrija com paciência.',
      cuidado: 'Para assunto sério, abra as fontes que ela citar.',
    },
  ];
  const BALANCO = 'Nesta semana eu usei IA para: [lista]. Me ajude a fazer um balanço honesto: onde poupou tempo, onde errou, o que vale virar hábito e o que eu devo parar de fazer.';

  // ------------------------------------------------------------------
  // CSS do capítulo
  // ------------------------------------------------------------------
  const CSS = `
/* ---- Regras da casa (minigame) ---- */
.ep-rg { display: grid; gap: 14px; grid-template-columns: 1fr; align-items: start; }
@media (min-width: 860px) { .ep-rg { grid-template-columns: 1.2fr 1fr; } .ep-rg .ep-act { order: 2; position: sticky; top: 0; } .ep-rg .ep-page { order: 1; } }
.ep-act { display: flex; flex-direction: column; gap: 10px; }
.ep-top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; }
.ep-dots { display: flex; gap: 5px; flex-wrap: wrap; }
.ep-dots i { width: 12px; height: 12px; border-radius: 50%; background: #e3e6ef; display: inline-block; }
.ep-dots i.cur { background: #ffd9c9; box-shadow: 0 0 0 3px rgba(255,107,61,0.3); }
.ep-dots i.ok { background: var(--mint); }
.ep-dots i.bad { background: var(--red); }
.ep-dots i.warn { background: var(--amber); }
.ep-cur { background: #fff; border: 2px solid var(--brand); border-radius: 16px; padding: 14px 16px; box-shadow: 0 8px 22px rgba(255,107,61,0.14); }
.ep-cur-tx { font-size: 1.06em; line-height: 1.45; margin-top: 4px; color: var(--ink); }
.ep-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.ep-btns .btn { min-height: 56px; justify-content: center; }
.ep-next { display: flex; justify-content: flex-end; }
.ep-next .btn { min-height: 52px; }
.ep-page { background: #fffdf7; border: 1px solid #eadfca; border-radius: 14px; padding: 14px 14px 12px; box-shadow: 0 6px 20px rgba(10,20,50,0.08); font-size: 0.93em; }
.ep-page h4 { margin: 0; font-family: var(--head); font-weight: 800; font-size: 1.02em; color: var(--ink); }
.ep-page .ep-psub { color: var(--muted); font-size: 0.86em; margin: 2px 0 8px; }
.ep-ln { display: flex; gap: 8px; align-items: flex-start; padding: 6px 8px; border-radius: 10px; line-height: 1.4; margin: 1px 0; border: 1px solid transparent; }
.ep-ln .n { flex: 0 0 auto; font-family: var(--head); font-weight: 800; font-size: 0.72em; min-width: 1.9em; text-align: center; background: rgba(20,30,60,0.08); color: var(--muted); border-radius: 6px; padding: 0.15em 0.4em; margin-top: 0.2em; }
.ep-ln .tx { flex: 1 1 auto; }
.ep-ln .mk { flex: 0 0 auto; font-weight: 800; }
.ep-ln.todo { color: #9aa1b4; }
.ep-ln.cur { background: #fff1e8; border-color: var(--brand); color: var(--text); }
.ep-ln.ok .n { background: var(--mint); color: #fff; }
.ep-ln.ok .mk { color: #12684b; }
.ep-ln.fix .n { background: var(--red); color: #fff; }
.ep-ln.out .n { background: #9aa1b4; color: #fff; }
.ep-ln.out .tx { text-decoration: line-through; text-decoration-color: #e5484d; color: #8a8f9e; }
.ep-old { display: block; text-decoration: line-through; text-decoration-color: #e5484d; text-decoration-thickness: 2px; color: #8a8f9e; }
.ep-new { display: block; color: #c0262d; font-family: 'Segoe Print', 'Bradley Hand', 'Comic Sans MS', 'Chalkboard SE', cursive; font-size: 0.97em; margin-top: 2px; }
.ep-count { font-family: var(--head); font-weight: 800; font-size: 0.86em; color: #7a4d00; background: var(--amber-l); border-radius: 99px; padding: 4px 12px; }
.ep-count.done { background: var(--mint-l); color: #12684b; }

/* ---- Desafio de 7 dias (minigame) ---- */
.ep-planos { display: grid; gap: 10px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 250px), 1fr)); }
.ep-plano { display: flex !important; gap: 12px; align-items: flex-start; min-height: 64px; }
.ep-plano .pi { font-size: 1.55em; line-height: 1; margin-top: 2px; }
.ep-plano b { display: block; font-weight: 700; }
.ep-plano .pk { margin-left: auto; flex: 0 0 auto; font-family: var(--head); font-size: 0.7em; font-weight: 800; background: rgba(20,30,60,0.08); border-radius: 6px; padding: 0.1em 0.45em; color: var(--muted); }
.ep-plano.on .pk { background: var(--brand); color: #fff; }
.ep-semana { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; }
.ep-dia { background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 7px 2px 6px; text-align: center; font-family: var(--head); font-size: 0.74em; font-weight: 800; color: var(--muted); }
.ep-dia span { display: block; font-size: 1.7em; line-height: 1.25; margin-top: 2px; }
.ep-dia.bal { background: var(--amber-l); border-color: #f0cf86; color: #7a4d00; }
.ep-plan-card { background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; box-shadow: 0 6px 18px rgba(10,20,50,0.06); }
.ep-plan-card h5 { margin: 0; font-family: var(--head); font-weight: 800; font-size: 0.98em; color: var(--ink); line-height: 1.3; }
.ep-plan-card .ep-days { font-size: 0.8em; color: var(--muted); font-family: var(--head); font-weight: 700; }
.ep-prompt { background: #f6f7fb; border: 1px solid var(--line); border-radius: 12px; padding: 9px 11px; font-size: 0.9em; line-height: 1.5; white-space: pre-wrap; }
.ep-care { font-size: 0.84em; color: #7a4d00; background: var(--amber-l); border-radius: 10px; padding: 6px 10px; }
.ep-row-end { display: flex; justify-content: flex-end; }

/* ---- Telas cheias (overlay) ---- */
.ep-ov .overlay-inner { padding-bottom: 36px; }
.ep-kick { font-family: var(--head); font-size: 0.74em; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #ffb894; text-align: center; }
.ep-h1 { font-family: var(--head); font-weight: 800; font-size: 1.7em; line-height: 1.15; color: #fff; text-align: center; margin: 6px 0 4px; }
.ep-sub { color: #c7cde0; text-align: center; margin: 0 auto 16px; max-width: 640px; }
.ep-acts { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-top: 16px; }
.ep-acts .btn { min-height: 52px; }

/* documento das regras */
.ep-doc { max-width: 760px; margin: 0 auto; padding: 26px 28px 22px; background: #fffdf7; }
.ep-doc .dk { font-family: var(--head); font-weight: 800; font-size: 0.74em; letter-spacing: 0.14em; color: var(--brand-d); }
.ep-doc h2 { font-family: var(--head); font-weight: 800; font-size: 1.3em; margin: 4px 0 2px; color: var(--ink); line-height: 1.2; }
.ep-doc .ds { color: var(--muted); margin: 0 0 12px; font-size: 0.92em; }
.ep-doc ol { margin: 0; padding-left: 1.5em; display: flex; flex-direction: column; gap: 7px; line-height: 1.45; }
.ep-doc li::marker { font-family: var(--head); font-weight: 800; color: var(--brand-d); }
.ep-doc .ceo { margin-top: 14px; padding: 10px 12px; border-left: 4px solid var(--brand); background: #fff3ec; border-radius: 0 12px 12px 0; line-height: 1.45; }
.ep-sign { margin-top: 18px; display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 12px; }
.ep-sign .sl { min-width: 240px; flex: 1 1 240px; }
.ep-sign .sig { height: 52px; border-bottom: 2px solid #2b3150; font-family: 'Segoe Script', 'Brush Script MT', 'Snell Roundhand', 'URW Chancery L', 'Comic Sans MS', cursive; font-size: 2em; color: #1d3a8a; line-height: 52px; white-space: nowrap; overflow: hidden; clip-path: inset(0 100% 0 0); transition: clip-path 1.4s ease-out; }
.ep-sign .sig.on { clip-path: inset(0 0 0 0); }
.ep-sign .sn { font-family: var(--head); font-weight: 800; font-size: 0.86em; margin-top: 4px; }
.ep-sign .sd { color: var(--muted); font-size: 0.84em; }
.ep-doc .dn { margin: 14px 0 0; font-size: 0.82em; color: var(--muted); }

/* relatório do dia */
.ep-rep { max-width: 860px; margin: 0 auto; }
.ep-kpis { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-bottom: 12px; }
@media (max-width: 620px) { .ep-kpis { grid-template-columns: 1fr; } }
.ep-kpi { background: #fff; color: var(--text); border-radius: 18px; padding: 12px 14px; box-shadow: var(--shadow); display: flex; flex-direction: column; gap: 2px; }
.ep-kpi .kl { font-family: var(--head); font-weight: 800; font-size: 0.72em; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
.ep-kpi .kv { font-family: var(--head); font-weight: 800; font-size: 1.55em; color: var(--ink); line-height: 1.15; }
.ep-kpi .kn { font-size: 0.8em; color: var(--muted); }
.ep-rows { background: #fff; color: var(--text); border-radius: 18px; box-shadow: var(--shadow); padding: 6px 14px; }
.ep-r { display: grid; grid-template-columns: 2em 1fr auto; gap: 4px 10px; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--line); }
.ep-r:last-child { border-bottom: 0; }
.ep-r .ri { font-size: 1.35em; text-align: center; }
.ep-r .rl b { display: block; font-family: var(--head); font-weight: 800; font-size: 0.95em; line-height: 1.25; }
.ep-r .rl small { color: var(--muted); font-size: 0.8em; }
.ep-r .rv { font-weight: 700; text-align: right; max-width: 22em; }
.ep-r.miss .rv { color: #9aa1b4; font-weight: 400; }
@media (max-width: 620px) { .ep-r { grid-template-columns: 2em 1fr; } .ep-r .rv { grid-column: 2; text-align: left; } }
.ep-achs { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.ep-achs span { font-size: 1.25em; filter: grayscale(1); opacity: 0.35; }
.ep-achs span.on { filter: none; opacity: 1; }
.ep-note { margin: 12px auto 0; max-width: 860px; font-size: 0.86em; color: #c7cde0; text-align: center; }

/* certificado */
.ep-cert { display: block; width: 100%; max-width: 900px; height: auto; margin: 0 auto; border-radius: 10px; box-shadow: 0 20px 60px rgba(0,0,0,0.5); background: #fffaf0; }

/* carta */
.ep-letter { margin-top: 6px; background: #fffaf0; border: 1px solid #efe1c4; border-radius: 14px; padding: 16px 18px; line-height: 1.65;
  background-image: repeating-linear-gradient(180deg, transparent 0, transparent calc(1.65em - 1px), rgba(170,140,90,0.18) calc(1.65em - 1px), rgba(170,140,90,0.18) 1.65em); background-position: 0 1.05em; }
.ep-letter p { margin: 0 0 0.7em; white-space: pre-wrap; }
.ep-letter .ass { text-align: right; font-family: 'Segoe Script', 'Brush Script MT', 'Snell Roundhand', 'URW Chancery L', 'Comic Sans MS', cursive; font-size: 1.35em; color: #1d3a8a; margin: 0; }

/* créditos */
.ep-cred { text-align: center; max-width: 720px; margin: 0 auto; }
.ep-cred .big { font-family: var(--head); font-weight: 800; font-size: 2.4em; color: #fff; margin: 30px 0 4px; letter-spacing: -0.01em; }
.ep-cred .love { font-family: var(--head); font-weight: 800; font-size: 1.35em; color: #ffb894; margin: 6px 0 2px; }
.ep-cred .para { color: #c7cde0; margin: 0 0 30px; }
.ep-cred h3 { font-family: var(--head); font-weight: 800; font-size: 0.8em; letter-spacing: 0.14em; text-transform: uppercase; color: #ffb894; margin: 34px 0 10px; }
.ep-cast { display: flex; flex-direction: column; gap: 8px; }
.ep-cast div b { color: #fff; }
.ep-cast div span { color: #c7cde0; }
.ep-src-tema { font-family: var(--head); font-weight: 800; color: #fff; margin: 20px 0 6px; font-size: 0.98em; }
.ep-src { margin: 0 0 8px; font-size: 0.9em; color: #c7cde0; line-height: 1.4; }
.ep-src a { color: #9bb8ff; font-weight: 700; }
.ep-cred .fim { font-family: var(--head); font-weight: 800; font-size: 1.6em; color: #fff; margin: 40px 0 6px; }
.ep-cred .muted { color: #9aa3bd; font-size: 0.86em; }
.ep-sticky { position: sticky; bottom: 0; padding: 14px 0 6px; background: linear-gradient(180deg, rgba(8,11,24,0), rgba(8,11,24,0.96) 40%); display: flex; justify-content: center; gap: 10px; }
`;

  // ------------------------------------------------------------------
  // Utilitários
  // ------------------------------------------------------------------
  function el(tag, cls, kids) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (kids != null) (Array.isArray(kids) ? kids : [kids]).forEach((k) => { if (k == null) return; e.appendChild(typeof k === 'string' || typeof k === 'number' ? document.createTextNode(String(k)) : k); });
    return e;
  }
  function copiar(text, btn) {
    if (P2.guia && P2.guia.copyText) { P2.guia.copyText(text, btn); return; }
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    btn.textContent = ok ? '✓ Copiado!' : 'Selecione e copie';
  }
  function imprimir() { try { window.print(); } catch (e) { /* sem impressora: nada a fazer */ } }
  function hoje() {
    try { return new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return new Date().toISOString().slice(0, 10); }
  }
  function ceticismo() {
    const pr = P2.save && P2.save.data && P2.save.data.progress;
    if (!pr) return null;
    return (pr.flags && pr.flags.ceticismo) || (pr.vars && pr.vars.prologo && pr.vars.prologo.ceticismo) || null;
  }
  function durTxt(min) {
    min = Math.round(min);
    if (min < 60) return min + ' min';
    const h = Math.floor(min / 60), m = min % 60;
    return h + 'h' + (m ? (m < 10 ? '0' : '') + m : '');
  }
  const isNum = (v) => typeof v === 'number' && isFinite(v);

  /** Mesa do café: todos nos lugares (início das partes 1–4). */
  function mesa(G) {
    G.scene('mesa_cafe', { steam: true });
    G.filho.at('filho').setAnim('sit').set({ props: { mug: true } });
    G.filho.setExpr('feliz');
    G.filho.lookAt(G.pai);
    G.pai.at('pai').setAnim('sit');
    G.pai.setExpr('neutro');
    G.faisca.at('faisca').setAnim('idle');
    G.faisca.face(G.pai, true);
    if (G.v.duvidaNaMesa) duvidaNaMesa(G, true);
    G.music('final');
    G.player.fp();
  }
  const DUV = { x: -0.45, z: 0.12 };
  function duvidaNaMesa(G, instant) {
    const D = G.duvida;
    D.at(DUV, 0);
    D.setAnim('small');
    D.set({ scale: 0.6 });
    D.setExpr('amigavel');
    D.face(G.pai, true);
    if (!instant) quiet(D.fadeIn(0.6));
    return D;
  }
  /** Olhar para a Dúvida pequenina em cima da mesa (a altura da cabeça dela não serve aqui). */
  function olharDuvida(G) { G.player.lookAt({ x: DUV.x, y: 0.86, z: DUV.z }); }

  // ------------------------------------------------------------------
  // Minigame 1 — Regras da casa (caneta vermelha)
  // ------------------------------------------------------------------
  function miniRegras(G) {
    return G.mini((root, done, api) => {
      const res = { pegas: 0, ruins: RUINS, linhas: [], tiradas: [], porLinha: [] };
      let i = 0;
      const wrap = el('div', 'ep-rg');
      const act = el('div', 'ep-act');
      const page = el('div', 'ep-page');
      wrap.appendChild(act);
      wrap.appendChild(page);
      root.appendChild(wrap);
      page.appendChild(el('h4', null, 'Regras da casa: uso de IA'));
      page.appendChild(el('div', 'ep-psub', api.t('Rascunho da Faísca · ') + api.t('{empresaNome}')));
      const lns = RASCUNHO.map((d, k) => {
        const tx = el('span', 'tx', d.txt);
        const ln = el('div', 'ep-ln todo', [el('span', 'n', String(k + 1)), tx, el('span', 'mk', '')]);
        page.appendChild(ln);
        return ln;
      });
      const dots = el('div', 'ep-dots');
      const dotEls = RASCUNHO.map(() => { const d = el('i'); dots.appendChild(d); return d; });
      const count = el('span', 'ep-count', '');
      const updCount = () => {
        count.textContent = '✍️ Problemas achados: ' + res.pegas + ' de ' + RUINS;
        count.classList.toggle('done', res.pegas === RUINS);
      };
      updCount();

      function marcar(k, kind, d, extra) {
        const ln = lns[k];
        ln.className = 'ep-ln ' + kind;
        const tx = ln.querySelector('.tx');
        const mk = ln.querySelector('.mk');
        tx.innerHTML = '';
        if (kind === 'ok') { tx.textContent = d.txt; mk.textContent = '✓'; }
        else if (kind === 'fix') { tx.appendChild(el('span', 'ep-old', d.txt)); tx.appendChild(el('span', 'ep-new', d.fix)); mk.textContent = extra === 'late' ? '!' : '✍️'; }
        else if (kind === 'out') { tx.textContent = d.txt; mk.textContent = '✗'; }
      }
      function anim(name) { quiet(G.faisca.play(name, 1.3)); }

      function passo() {
        act.innerHTML = '';
        const d = RASCUNHO[i];
        lns.forEach((ln, k) => { if (k === i) ln.className = 'ep-ln cur'; });
        dotEls.forEach((dt, k) => dt.classList.toggle('cur', k === i));
        act.appendChild(el('div', 'ep-top', [dots, count]));
        act.appendChild(el('div', 'ep-cur', [el('div', 'mg-label', 'Linha ' + (i + 1) + ' de ' + RASCUNHO.length), el('div', 'ep-cur-tx', d.txt)]));
        const bM = api.btn('✓ Mantém', () => responder(true), { key: '1', cls: 'big' });
        const bR = api.btn('✍️ Risca', () => responder(false), { key: '2', cls: 'big' });
        act.appendChild(el('div', 'ep-btns', [bM, bR]));
        act.appendChild(el('div', 'mg-small', 'Leia como quem vai assinar. Sem pressa.'));
      }
      function feedback(kind, html) {
        const f = el('div', 'mg-feedback ' + kind);
        f.appendChild(api.rich(html));
        return f;
      }
      function seguir() {
        const ult = i >= RASCUNHO.length - 1;
        const b = api.btn(ult ? 'Passar a limpo ▶' : 'Próxima linha ▶', () => {
          if (ult) { done(res); return; }
          i++;
          passo();
        }, { key: '3', cls: 'primary' });
        act.appendChild(el('div', 'ep-next', b));
        setTimeout(() => { try { b.focus({ preventScroll: true }); } catch (e) { /* nada */ } }, 30);
      }
      function limparBotoes() { const bs = act.querySelector('.ep-btns'); if (bs) bs.remove(); const h = act.querySelector('.mg-small'); if (h) h.remove(); }
      function responder(manter) {
        const d = RASCUNHO[i];
        limparBotoes();
        if (d.ok && manter) {
          marcar(i, 'ok', d);
          dotEls[i].className = 'ok';
          res.linhas.push({ id: d.id, txt: d.txt });
          res.porLinha.push(d.id + ':ok');
          act.appendChild(feedback('ok', '✓ *Fica.* ' + d.why));
          api.sfx('confirm');
          api.say(G.pick(['Boa. Essa fica.', 'Concordo. Essa vale.', 'Essa é das importantes.']), 'faisca');
          seguir();
        } else if (!d.ok && !manter) {
          res.pegas++;
          updCount();
          marcar(i, 'fix', d);
          dotEls[i].className = 'ok';
          res.linhas.push({ id: d.fixId, txt: d.fix });
          res.porLinha.push(d.id + ':pegou');
          act.appendChild(feedback('ok', '✍️ *Bem riscado.* ' + d.why + '\n*No lugar, fica:* ' + d.fix));
          api.sfx('success');
          anim('ashamed');
          api.say(G.pick(['Essa eu escrevi porque aparece muito por aí. Não quer dizer que presta.', 'Pegou. Copiei de um modelo ruim.', 'Ainda bem que você leu essa.']), 'faisca');
          seguir();
        } else if (!d.ok && manter) {
          marcar(i, 'fix', d, 'late');
          dotEls[i].className = 'bad';
          res.linhas.push({ id: d.fixId, txt: d.fix });
          res.porLinha.push(d.id + ':passou');
          act.appendChild(feedback('bad', '⚠️ *Essa tem problema.* ' + d.why + '\n*Troquei por:* ' + d.fix));
          api.sfx('fail');
          anim('ashamed');
          api.say('Essa era uma armadilha comum, e eu caí nela ao escrever. Já corrigi na página.', 'faisca');
          seguir();
        } else {
          // boa, mas ele quer riscar: explica e devolve a caneta
          dotEls[i].className = 'warn';
          act.appendChild(feedback('warn', '🤔 *Essa costuma valer a pena.* ' + d.why + '\nA caneta é sua: fica ou sai?'));
          anim('doubt');
          api.say('Pode riscar à vontade. Eu não fico ofendida. Só quis explicar o porquê.', 'faisca');
          const volta = api.btn('↩ Pode voltar', () => {
            row.remove();
            marcar(i, 'ok', d);
            dotEls[i].className = 'ok';
            res.linhas.push({ id: d.id, txt: d.txt });
            res.porLinha.push(d.id + ':voltou');
            api.sfx('confirm');
            seguir();
          }, { key: '1' });
          const sai = api.btn('Tira mesmo', () => {
            row.remove();
            marcar(i, 'out', d);
            res.tiradas.push(d.id);
            res.porLinha.push(d.id + ':tirou');
            api.sfx('select');
            api.say('Tirei. A página é sua.', 'faisca');
            seguir();
          }, { key: '2' });
          const row = el('div', 'ep-btns', [volta, sai]);
          act.appendChild(row);
        }
      }
      passo();
    }, {
      title: '🖊️ Regras da casa',
      size: 'l',
      intro: 'Juntei o que costuma aparecer em regras de empresa por aí. Nem tudo presta. Linha por linha: mantém ou risca?',
      introWho: 'faisca',
    });
  }

  // ------------------------------------------------------------------
  // Tela cheia — o documento das regras, para assinar
  // ------------------------------------------------------------------
  function textoRegras(G, linhas, comp) {
    const tk = (s) => G.t(s);
    const out = [];
    out.push('REGRAS DA CASA: USO DE INTELIGÊNCIA ARTIFICIAL');
    out.push(G.profile.empresa ? tk('{empresaNome}') : 'Uma página. Vale para todos, a começar pelo CEO.');
    out.push('');
    linhas.forEach((l, k) => out.push((k + 1) + '. ' + l.txt));
    if (comp) { out.push(''); out.push('Compromisso do CEO: ' + comp.text); }
    out.push('');
    out.push(tk('{pai}') + ', CEO · ' + hoje());
    out.push('(Rascunho para o jurídico e a TI revisarem antes de publicar.)');
    return out.join('\n');
  }
  function telaAssinatura(G, linhas, comp) {
    return G.overlay((root, done, api) => {
      root.appendChild(el('div', 'ep-kick', 'Uma página'));
      root.appendChild(el('div', 'ep-h1', 'Regras da casa'));
      root.appendChild(el('p', 'ep-sub', 'Leia mais uma vez. Se estiver de acordo, assine.'));
      const doc = el('div', 'paper ep-doc printable');
      doc.appendChild(el('div', 'dk', 'REGRAS DA CASA'));
      doc.appendChild(el('h2', null, G.profile.empresa ? api.t('Uso de inteligência artificial na {empresaNome}') : 'Uso de inteligência artificial na empresa'));
      doc.appendChild(el('p', 'ds', 'Uma página. Vale para todos, a começar pelo CEO.'));
      const ol = el('ol');
      linhas.forEach((l) => ol.appendChild(el('li', null, l.txt)));
      doc.appendChild(ol);
      if (comp) doc.appendChild(el('div', 'ceo', [el('b', null, 'Compromisso do CEO: '), comp.text]));
      const sig = el('div', 'sig', api.t('{pai}'));
      doc.appendChild(el('div', 'ep-sign', [
        el('div', 'sl', [sig, el('div', 'sn', api.t('{pai}, CEO')), el('div', 'sd', hoje())]),
      ]));
      doc.appendChild(el('p', 'dn', 'Rascunho para o jurídico e a TI revisarem antes de publicar. Modelo completo no Guia do CEO (📘), em “Regras da casa”.'));
      root.appendChild(doc);
      const acts = el('div', 'ep-acts');
      const bCop = api.btn('📋 Copiar texto', (e, b) => copiar(textoRegras(G, linhas, comp), b));
      const bImp = api.btn('🖨️ Imprimir', () => imprimir());
      let assinado = false;
      const bAss = api.btn('✍️ Assinar', () => {
        if (assinado) return;
        assinado = true;
        sig.classList.add('on');
        api.sfx('success');
        bAss.remove();
        const bOk = api.btn('Continuar ▶', () => done(true), { cls: 'primary big' });
        acts.appendChild(bOk);
        setTimeout(() => { try { bOk.focus({ preventScroll: true }); } catch (e) { /* nada */ } }, 60);
      }, { cls: 'primary big' });
      acts.appendChild(bCop);
      acts.appendChild(bImp);
      acts.appendChild(bAss);
      root.appendChild(acts);
    }, { cls: 'ep-ov' });
  }

  // ------------------------------------------------------------------
  // Relatório do dia (lê as estatísticas de todos os capítulos)
  // ------------------------------------------------------------------
  function linhasRelatorio(G) {
    const S = G.allStats();
    const s = (id) => S[id] || {};
    const rows = [];
    const add = (icon, cap, label, val) => rows.push({ icon, cap, label, val: val == null || val === '' ? null : val });
    const c1 = s('cap1');
    add('🎯', 'Capítulo 1', 'Pedidos bem montados', isNum(c1.pedidosBons) ? c1.pedidosBons + ' de ' + (c1.pedidosTotal || 3) : null);
    const c2 = s('cap2');
    add('🖊️', 'Capítulo 2', 'Erros dos rascunhos corrigidos', isNum(c2.errosCorrigidos) && isNum(c2.errosTotal) ? c2.errosCorrigidos + ' de ' + c2.errosTotal : null);
    add('📈', 'Capítulo 2', 'Reputação no fim do expediente', isNum(c2.reputacao) ? c2.reputacao + ' de 100' : null);
    const c3 = s('cap3');
    let v3 = null;
    if (isNum(c3.citacoesConferidas) || c3.citacaoErradaPega != null || c3.injecaoPega != null) {
      const p = [];
      if (isNum(c3.citacoesConferidas)) p.push(c3.citacoesConferidas + ' citações conferidas');
      if (c3.citacaoErradaPega) p.push('multa errada pega');
      if (c3.injecaoPega) p.push('ordem escondida achada');
      v3 = p.join(' · ') || 'contrato revisado';
    }
    add('📑', 'Capítulo 3', 'O contrato de 80 páginas', v3);
    const c4 = s('cap4');
    add('🔎', 'Capítulo 4', 'Lorotas pegas', isNum(c4.lorotasPegas) && isNum(c4.lorotasTotal) ? c4.lorotasPegas + ' de ' + c4.lorotasTotal : (isNum(c4.acertos) ? c4.acertos + ' de ' + (c4.total || 10) + ' acertos' : null));
    const c5 = s('cap5');
    add('📝', 'Capítulo 5', 'Ata da reunião', isNum(c5.acertos) && isNum(c5.total) ? c5.acertos + ' de ' + c5.total + ' trechos no lugar certo' + (c5.consentimento ? ' · pediu licença para gravar' : '') : null);
    const c6 = s('cap6');
    add('🧮', 'Capítulo 6', 'Erro de conta da IA', c6.erroPego === true ? (c6.tentativas === 1 ? 'pego de primeira' : 'pego' + (isNum(c6.tentativas) ? ' na ' + c6.tentativas + 'ª tentativa' : '')) : (c6.erroPego === false ? 'a Faísca mostrou onde estava' : null));
    const c7 = s('cap7');
    const p7 = [];
    if (c7.premortem) p7.push('pré-mortem');
    if (c7.criterios) p7.push('critérios com pesos');
    add('♟️', 'Capítulo 7', 'Decisão estratégica', p7.length ? p7.join(' + ') : (c7.decisao != null ? 'decidida por você' : null));
    const c8 = s('cap8');
    add('🏠', 'Capítulo 8', 'Missões de casa', isNum(c8.estrelas) ? c8.estrelas + ' de ' + (c8.estrelasMax || 18) + ' estrelas' : null);
    const c9 = s('cap9');
    const curso = { violao: 'violão', ingles: 'inglês', ia: 'IA por dentro', ia_por_dentro: 'IA por dentro' }[c9.curso];
    add('🎓', 'Capítulo 9', 'Aula particular' + (curso ? ' de ' + curso : ''), isNum(c9.acertos) && isNum(c9.total) ? c9.acertos + ' de ' + c9.total + ' respostas certas' : null);
    const c10 = s('cap10');
    let v10 = null;
    if (c10.ceoFalsoEvitado != null || c10.golpeEvitado != null) {
      const n = (c10.ceoFalsoEvitado ? 1 : 0) + (c10.golpeEvitado ? 1 : 0);
      v10 = n + ' de 2' + (c10.dePrimeira ? ', de primeira' : '') + (c10.palavraCodigo ? ' · palavra-código combinada' : '');
    }
    add('🛡️', 'Capítulo 10', 'Golpes desmascarados', v10);
    add('🚦', 'Capítulo 10', 'Semáforo de dados', isNum(c10.acertos) && isNum(c10.total) ? c10.acertos + ' de ' + c10.total + ' no lugar certo' : null);
    const c11 = s('cap11');
    add('☁️', 'Capítulo 11', 'A Dúvida', c11.venceu ? 'virou dúvida saudável' + (isNum(c11.coracoes) ? ', com ' + c11.coracoes + ' de ' + (c11.coracoesMax || 3) + ' corações' : '') : null);
    const reg = (G.v.regras || []).length;
    add('🧭', 'Hoje', 'Regras da casa', reg ? reg + ' regras assinadas' + (isNum(G.v.pegas) ? ' · ' + G.v.pegas + ' de ' + RUINS + ' armadilhas riscadas' : '') : null);
    const min = ['cap2', 'cap3', 'cap5', 'cap6'].reduce((a, id) => a + Math.max(0, Number(s(id).minutosEconomizados) || 0), 0);
    const golpes = c10.ceoFalsoEvitado != null || c10.golpeEvitado != null ? (c10.ceoFalsoEvitado ? 1 : 0) + (c10.golpeEvitado ? 1 : 0) : null;
    return { rows, min, golpes };
  }
  function telaRelatorio(G) {
    return G.overlay((root, done, api) => {
      const R = linhasRelatorio(G);
      root.appendChild(el('div', 'ep-kick', 'Relatório do dia · feito pela Faísca'));
      root.appendChild(el('div', 'ep-h1', api.t('A terça-feira de {pai}')));
      root.appendChild(el('p', 'ep-sub', 'Como todo relatório: confira antes de acreditar.'));
      const rep = el('div', 'ep-rep');
      const got = (P2.save.data && P2.save.data.achievements) || {};
      const achs = P2.ACHIEVEMENTS || [];
      const nAch = achs.filter((a) => got[a.id]).length;
      const kpis = el('div', 'ep-kpis');
      kpis.appendChild(el('div', 'ep-kpi', [el('span', 'kl', '⏱️ Tempo poupado'), el('span', 'kv', R.min ? '≈ ' + durTxt(R.min) : '—'), el('span', 'kn', R.min ? 'estimativa do jogo, já contando o tempo de conferir' : 'sem dados dos capítulos de trabalho')]));
      kpis.appendChild(el('div', 'ep-kpi', [el('span', 'kl', '🛡️ Golpes evitados'), el('span', 'kv', R.golpes == null ? '—' : R.golpes + ' de 2'), el('span', 'kn', 'o falso diretor e a voz clonada')]));
      const achRow = el('div', 'ep-achs');
      achs.forEach((a) => { const sp = el('span', got[a.id] ? 'on' : '', a.icon); sp.title = a.titulo; achRow.appendChild(sp); });
      kpis.appendChild(el('div', 'ep-kpi', [el('span', 'kl', '🏆 Conquistas'), el('span', 'kv', nAch + ' de ' + achs.length), achRow]));
      rep.appendChild(kpis);
      const rows = el('div', 'ep-rows');
      R.rows.forEach((r) => {
        rows.appendChild(el('div', 'ep-r' + (r.val ? '' : ' miss'), [
          el('span', 'ri', r.icon),
          el('span', 'rl', [el('b', null, r.label), el('small', null, r.cap)]),
          el('span', 'rv', r.val || '— (não jogado)'),
        ]));
      });
      rep.appendChild(rows);
      root.appendChild(rep);
      root.appendChild(el('p', 'ep-note', 'Os minutos são estimativa do jogo, não medição. Na vida real, marque o tempo de uma tarefa antes e depois, contando o tempo de conferir.'));
      const acts = el('div', 'ep-acts');
      acts.appendChild(api.btn('Continuar ▶', () => done(true), { cls: 'primary big' }));
      root.appendChild(acts);
    }, { cls: 'ep-ov' });
  }

  // ------------------------------------------------------------------
  // Certificado (canvas → imagem para baixar e imprimir)
  // ------------------------------------------------------------------
  function desenharCertificado(G) {
    const W = 1600, H = 1130;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const c = cv.getContext('2d');
    const HEAD = "'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif";
    const READ = "'Atkinson Hyperlegible', 'Segoe UI', Arial, sans-serif";
    const t = (s) => G.t(s);
    // fundo e moldura
    const bg = c.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#fffaf0'); bg.addColorStop(1, '#fdf0dc');
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    c.strokeStyle = '#ff6b3d'; c.lineWidth = 14; c.strokeRect(34, 34, W - 68, H - 68);
    c.strokeStyle = '#e8b48a'; c.lineWidth = 3; c.strokeRect(62, 62, W - 124, H - 124);
    // cantos
    c.fillStyle = '#ff6b3d';
    [[62, 62], [W - 62, 62], [62, H - 62], [W - 62, H - 62]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 12, 0, Math.PI * 2); c.fill(); });
    const center = (txt, y, font, color) => { c.font = font; c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillText(txt, W / 2, y); };
    const wrap = (txt, y, font, color, maxW, lh) => {
      c.font = font; c.fillStyle = color; c.textAlign = 'center';
      const words = txt.split(' ');
      let line = '';
      const lines = [];
      words.forEach((w) => { const tt = line ? line + ' ' + w : w; if (c.measureText(tt).width > maxW && line) { lines.push(line); line = w; } else line = tt; });
      if (line) lines.push(line);
      lines.forEach((l, k) => c.fillText(l, W / 2, y + k * lh));
      return y + lines.length * lh;
    };
    center('PAI 2.0  ·  CERTIFICADO', 170, '800 30px ' + HEAD, '#d9481e');
    let ft = 60;
    c.font = '800 ' + ft + 'px ' + HEAD;
    while (c.measureText('Revisor-chefe de Inteligência Artificial').width > W - 260 && ft > 36) { ft -= 2; c.font = '800 ' + ft + 'px ' + HEAD; }
    center('Revisor-chefe de Inteligência Artificial', 250, '800 ' + ft + 'px ' + HEAD, '#151a2d');
    center('Certificamos que', 335, '400 34px ' + READ, '#5d6478');
    // nome (ajusta o tamanho para caber)
    let fs = 108;
    c.font = '800 ' + fs + 'px ' + HEAD;
    while (c.measureText(t('{pai}')).width > W - 360 && fs > 50) { fs -= 4; c.font = '800 ' + fs + 'px ' + HEAD; }
    center(t('{pai}'), 455, '800 ' + fs + 'px ' + HEAD, '#1d3a8a');
    c.strokeStyle = '#e8b48a'; c.lineWidth = 3; c.beginPath(); c.moveTo(W / 2 - 360, 485); c.lineTo(W / 2 + 360, 485); c.stroke();
    center(G.profile.empresa ? t('CEO de {empresaNome}') : 'CEO', 535, '700 36px ' + HEAD, '#3a4160');
    let y = wrap('passou um dia inteiro com uma inteligência artificial e terminou do jeito que começou: no comando.', 610, '400 36px ' + READ, '#2b3150', 1080, 50);
    // as três regras
    y += 40;
    const regras = ['Eu confiro', 'Eu decido', 'Eu assino'];
    c.font = '800 38px ' + HEAD;
    const gap = 70;
    const widths = regras.map((r) => c.measureText(r).width + 56);
    let x = W / 2 - (widths.reduce((a, b) => a + b, 0) + gap * 2) / 2;
    regras.forEach((r, k) => {
      c.fillStyle = '#2dbf8f';
      c.beginPath(); c.arc(x + 20, y - 13, 20, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#fff'; c.lineWidth = 6; c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(x + 10, y - 13); c.lineTo(x + 18, y - 4); c.lineTo(x + 31, y - 22); c.stroke();
      c.fillStyle = '#151a2d'; c.textAlign = 'left'; c.fillText(r, x + 52, y);
      x += widths[k] + gap;
    });
    // assinaturas
    const sy = 985;
    const sig = (cx, nome, papel) => {
      c.strokeStyle = '#2b3150'; c.lineWidth = 2; c.beginPath(); c.moveTo(cx - 200, sy); c.lineTo(cx + 200, sy); c.stroke();
      c.font = "italic 400 46px 'Segoe Script', 'Brush Script MT', 'Snell Roundhand', 'URW Chancery L', cursive"; c.fillStyle = '#1d3a8a'; c.textAlign = 'center'; c.fillText(nome, cx, sy - 14);
      c.font = '700 24px ' + HEAD; c.fillStyle = '#5d6478'; c.fillText(papel, cx, sy + 36);
    };
    sig(390, 'Faísca', 'assistente de IA (rascunhou)');
    sig(W - 390, t('{filho}'), t('{Filhoa} (conferiu)'));
    // selo central
    const cx = W / 2, cy = 945;
    c.fillStyle = '#ff6b3d'; c.beginPath();
    for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2, r = k % 2 ? 84 : 96; c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    c.closePath(); c.fill();
    c.fillStyle = '#fff3ec'; c.beginPath(); c.arc(cx, cy, 72, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#d9481e'; c.textAlign = 'center';
    c.font = '800 34px ' + HEAD; c.fillText('PAI', cx, cy - 4);
    c.font = '800 40px ' + HEAD; c.fillText('2.0', cx, cy + 36);
    center(hoje(), 1075, '400 26px ' + READ, '#5d6478');
    return cv;
  }
  function telaCertificado(G) {
    return G.overlay((root, done, api) => {
      root.appendChild(el('div', 'ep-kick', 'Presente de ' + api.t('{filho}')));
      root.appendChild(el('div', 'ep-h1', 'Certificado'));
      root.appendChild(el('p', 'ep-sub', 'Para pendurar no escritório. Ou não: a decisão é sua.'));
      const img = el('img', 'ep-cert printable');
      img.alt = api.t('Certificado de Revisor-chefe de Inteligência Artificial para {pai}');
      root.appendChild(img);
      let url = '';
      const draw = () => { try { url = desenharCertificado(G).toDataURL('image/png'); img.src = url; } catch (e) { /* sem canvas: fica só o texto */ } };
      draw();
      // redesenha quando as fontes do jogo terminarem de carregar (se carregarem)
      try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw, () => {}); } catch (e) { /* nada */ }
      const acts = el('div', 'ep-acts');
      acts.appendChild(api.btn('⬇️ Baixar imagem', () => {
        if (!url) return;
        const a = document.createElement('a');
        a.href = url; a.download = 'certificado-pai-2-0.png';
        document.body.appendChild(a); a.click(); a.remove();
      }));
      acts.appendChild(api.btn('🖨️ Imprimir', () => imprimir()));
      acts.appendChild(api.btn('Continuar ▶', () => done(true), { cls: 'primary big' }));
      root.appendChild(acts);
    }, { cls: 'ep-ov' });
  }

  // ------------------------------------------------------------------
  // Minigame 2 — Desafio de 7 dias
  // ------------------------------------------------------------------
  function miniDesafio(G) {
    return G.mini((root, done, api) => {
      const MAX = 3;
      const sel = [];
      function escolher() {
        root.innerHTML = '';
        api.say('Escolha até três. Os que combinam com a sua rotina, não os que parecem bonitos.', 'faisca');
        const info = el('div', 'mg-row');
        const cnt = el('span', 'ep-count', '');
        info.appendChild(cnt);
        info.appendChild(el('span', 'mg-small', 'Toque para escolher ou desmarcar.'));
        root.appendChild(info);
        const grid = el('div', 'ep-planos');
        const cards = PLANOS.map((p, k) => {
          const b = el('button', 'mg-card ep-plano', [el('span', 'pi', p.icon), el('span', null, [el('b', null, p.se), el('small', null, p.entao)]), el('span', 'pk', String(k + 1))]);
          b.type = 'button';
          b.dataset.key = String(k + 1);
          b.addEventListener('click', () => {
            const at = sel.indexOf(p.id);
            if (at >= 0) { sel.splice(at, 1); api.sfx('select'); }
            else if (sel.length >= MAX) { api.sfx('error'); api.say('Três já é um ótimo começo. Para trocar, desmarque um.', 'faisca'); return; }
            else { sel.push(p.id); api.sfx('confirm'); }
            upd();
          });
          grid.appendChild(b);
          return b;
        });
        root.appendChild(grid);
        const go = api.btn('Montar meu desafio ▶', () => { if (sel.length) montar(); }, { cls: 'primary big', key: '9' });
        root.appendChild(el('div', 'mg-actions', go));
        function upd() {
          cards.forEach((b, k) => b.classList.toggle('on', sel.indexOf(PLANOS[k].id) >= 0));
          cnt.textContent = 'Escolhidos: ' + sel.length + ' de ' + MAX;
          cnt.classList.toggle('done', sel.length > 0);
          go.disabled = sel.length === 0;
          if (sel.length === MAX) api.say('Perfeito. Três planos pequenos valem mais do que dez promessas.', 'faisca');
        }
        upd();
      }
      function montar() {
        root.innerHTML = '';
        api.sfx('page');
        api.say('Aqui está. Um pedido pronto para cada plano: é só copiar, trocar o que está entre [colchetes] e conferir.', 'faisca');
        const esc = sel.map((id) => PLANOS.find((p) => p.id === id));
        // semana
        root.appendChild(el('div', 'mg-label', 'Sua semana'));
        const sem = el('div', 'ep-semana');
        const diasDe = {};
        for (let d = 0; d < 6; d++) {
          const p = esc[d % esc.length];
          (diasDe[p.id] = diasDe[p.id] || []).push(d + 1);
          sem.appendChild(el('div', 'ep-dia', ['Dia ' + (d + 1), el('span', null, p.icon)]));
        }
        sem.appendChild(el('div', 'ep-dia bal', ['Dia 7', el('span', null, '🔍')]));
        root.appendChild(sem);
        // planos com pedido pronto
        const list = el('div', 'mg-col');
        esc.forEach((p) => {
          const card = el('div', 'ep-plan-card');
          card.appendChild(el('h5', null, p.icon + ' ' + p.se + ' ' + p.entao));
          card.appendChild(el('div', 'ep-days', 'Dias ' + diasDe[p.id].join(', ')));
          if (p.prompt) {
            const txt = api.t(p.prompt);
            card.appendChild(el('div', 'ep-prompt', txt));
            if (p.cuidado) card.appendChild(el('div', 'ep-care', '⚠️ ' + p.cuidado));
            card.appendChild(el('div', 'ep-row-end', api.btn('📋 Copiar pedido', (e, b) => copiar(txt, b), { cls: 'small' })));
          } else {
            card.appendChild(el('div', 'mg-feedback info', p.semIA));
          }
          list.appendChild(card);
        });
        const bal = el('div', 'ep-plan-card');
        bal.appendChild(el('h5', null, '🔍 Dia 7: o balanço'));
        bal.appendChild(el('div', 'ep-prompt', BALANCO));
        bal.appendChild(el('div', 'ep-row-end', api.btn('📋 Copiar pedido', (e, b) => copiar(BALANCO, b), { cls: 'small' })));
        list.appendChild(bal);
        root.appendChild(list);
        root.appendChild(el('div', 'mg-hint', '💡 Perdeu um dia? Tudo bem: retome no seguinte. Dado da empresa, só na ferramenta aprovada. Estes pedidos e muitos outros estão no seu Guia do CEO (📘).'));
        const acts = el('div', 'mg-actions');
        acts.appendChild(api.btn('↩ Trocar planos', () => escolher(), { key: '8' }));
        acts.appendChild(api.btn('Fechado ▶', () => done(sel.slice()), { cls: 'primary big', key: '9' }));
        root.appendChild(acts);
        const panel = document.getElementById('panel');
        if (panel) panel.scrollTop = 0;
      }
      escolher();
    }, { title: '📅 Desafio de 7 dias', size: 'l' });
  }

  // ------------------------------------------------------------------
  // A carta de {filho}
  // ------------------------------------------------------------------
  function cartaNode(G) {
    const box = el('div', 'ep-letter');
    const recado = String((G.profile && G.profile.recado) || '').trim();
    if (recado) {
      box.appendChild(el('p', null, recado));
    } else {
      [
        '{apelido},',
        'Eu sei que você topou este dia meio a contragosto. Obrigad{oa} por topar mesmo assim.',
        'Eu nunca quis que você confiasse numa máquina. Eu queria que você tivesse mais tempo, e menos noite em claro com papel em cima da mesa.',
        'Você passou trinta anos aprendendo a desconfiar do jeito certo: de relatório bonito demais, de número redondo demais, de pressa demais. É exatamente isso que a IA pede de quem usa.',
        'Se um dia ela te fizer perder tempo, me liga que eu ajudo. Se ela te poupar uma hora, gasta essa hora com a gente.',
        'Com orgulho (e um pouco de sono),',
      ].forEach((l) => box.appendChild(el('p', null, G.t(l))));
    }
    box.appendChild(el('p', 'ass', G.t('{filho}')));
    return box;
  }

  // ------------------------------------------------------------------
  // Créditos (rolam sozinhos; qualquer toque para a rolagem)
  // ------------------------------------------------------------------
  function telaCreditos(G) {
    return G.overlay((root, done, api) => {
      const t = api.t;
      const ov = root.parentElement;
      const box = el('div', 'ep-cred');
      box.appendChild(el('div', 'big', 'Pai 2.0'));
      box.appendChild(el('div', 'love', t('Feito com carinho por {filho}')));
      box.appendChild(el('p', 'para', t('Para {pai}, que confere, decide e assina.')));
      box.appendChild(el('h3', null, 'Elenco'));
      const cast = el('div', 'ep-cast');
      [
        [t('{pai}'), 'ele mesmo, com o bigode desconfiado'],
        [t('{filho}'), 'quem propôs o trato'],
        ['Faísca', 'estagiária muito rápida que às vezes fala besteira com confiança'],
        ['A Dúvida', 'agora no tamanho certo'],
        [t('{chefe}'), t('{chefeTitulo}')],
        ['Jorge', t('{jorgePapel} e aluno novo')],
        ['Bia, Rafael, Luana e Tadeu', 'a diretoria'],
        ['O golpista', 'que saiu de mãos vazias'],
      ].forEach(([a, b]) => cast.appendChild(el('div', null, [el('b', null, a), el('span', null, ' · ' + b)])));
      box.appendChild(cast);
      box.appendChild(el('h3', null, 'De onde vieram os números'));
      box.appendChild(el('p', 'para', 'Todo número do jogo tem fonte. Conferir é a lição número 1, então aqui estão todas.'));
      const F = P2.FONTES || {};
      const TEMAS = P2.FONTES_TEMAS || {};
      const ordem = P2.FONTES_ORDEM || Object.keys(F);
      let tema = null;
      ordem.forEach((k) => {
        const f = F[k];
        if (!f) return;
        if (f.tema !== tema) { tema = f.tema; box.appendChild(el('div', 'ep-src-tema', TEMAS[tema] || tema || 'Outros')); }
        const row = el('p', 'ep-src', [el('span', null, t(f.titulo || '') + ' ')]);
        if (f.url) {
          const a = el('a', null, (f.fonte || f.curta || 'fonte') + ' ↗');
          a.href = f.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
          a.addEventListener('click', (e) => { e.stopPropagation(); G.achieve('leitor_de_fontes'); });
          row.appendChild(a);
        } else if (f.fonte) row.appendChild(el('span', null, '(' + f.fonte + ')'));
        box.appendChild(row);
      });
      box.appendChild(el('h3', null, 'Bastidores'));
      box.appendChild(el('p', 'para', 'Feito com HTML, CSS e JavaScript. Cenários e personagens 3D modelados pelo próprio código (Three.js, licença MIT); música e efeitos sintetizados no navegador. Tipografia: Atkinson Hyperlegible (Braille Institute) e Plus Jakarta Sans.'));
      box.appendChild(el('p', 'muted', 'A Faísca e todos os personagens são fictícios. Nomes de ferramentas de IA citados são só exemplos; o jogo não tem ligação com nenhuma empresa.'));
      box.appendChild(el('div', 'fim', t('Obrigad{oa} por jogar, {apelido}.')));
      box.appendChild(el('p', 'para', 'O Guia do CEO (📘) agora está inteiro, no menu do jogo.'));
      root.appendChild(box);
      const foot = el('div', 'ep-sticky');
      foot.appendChild(api.btn('Fim ▶', () => done(true), { cls: 'primary big' }));
      root.appendChild(foot);
      // rolagem automática suave (para quando a pessoa mexe)
      const reduce = document.documentElement.classList.contains('reduce-motion') || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      if (ov && !reduce) {
        let rolando = true;
        const parar = () => { rolando = false; };
        ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach((ev) => ov.addEventListener(ev, parar, { passive: true }));
        let acc = 0;
        api.timeout(() => {
          api.interval(() => {
            if (!rolando) return;
            acc += 1.1;
            const px = Math.floor(acc);
            acc -= px;
            const max = ov.scrollHeight - ov.clientHeight;
            if (ov.scrollTop >= max - 1) { rolando = false; return; }
            ov.scrollTop += px;
          }, 30);
        }, 2600);
      }
    }, { cls: 'ep-ov ep-ov-cred' });
  }

  // ------------------------------------------------------------------
  // O capítulo
  // ------------------------------------------------------------------
  P2.chapter({
    id: 'epilogo',
    num: 'Epílogo',
    title: 'Pai 2.0',
    subtitle: 'Quarta-feira, 7h: o café, a resposta e as regras da casa',
    music: 'final',
    minutes: 10,
    parts: [
      // ================================================================
      // PARTE 1 — Varanda: chegada, a resposta, a aposta
      // ================================================================
      async (G) => {
        P2.ui.css('epilogo', CSS);
        await G.titleCard();
        G.scene('mesa_cafe', { steam: true });
        G.filho.at('filho').setAnim('sit').set({ props: { mug: true } });
        G.filho.setExpr('feliz');
        G.pai.at('inicio').setAnim('idle');
        G.pai.setExpr('neutro');
        G.faisca.at('faisca').setAnim('idle');
        G.faisca.face('inicio', true);
        G.music('final');
        G.talkCam(false);
        G.player.cine();
        await G.cam.shot('cidade', 0);
        await G.letterbox(true, 0);
        await G.fadeIn(1.4);
        await G.cutscene(async () => {
          await G.narrate('Quarta-feira, 7h. O mesmo café de ontem. Só que hoje na varanda, e com sol.');
          quiet(G.cam.shot('geral', 3.4));
          await G.narrate('Ontem, a esta hora, {pai} tinha quarenta e sete e-mails e nenhuma paciência para inteligência artificial.');
          await G.narrate('Hoje ele tem quarenta e nove e-mails. Mas sabe por onde começar.');
        });
        await G.letterbox(false);
        G.talkCam(true);
        G.player.fp();
        G.pai.at('inicio');
        G.player.lookAt('filho');
        await G.say('filho', 'Bom dia, {apelido}! Hoje é café aqui fora. O sol resolveu colaborar.', { expr: 'feliz' });
        await G.explore({
          objetivo: 'Sente para o café com {filho}',
          hotspots: [
            {
              id: 'cidade', label: 'Olhar a cidade', icon: '🏙️', at: 'cidade', optional: true,
              onInteract: async (G) => {
                G.player.lookAt({ x: 4.5, y: 1.6, z: -0.6 });
                await G.think('pai', 'Lá longe dá para ver o prédio da empresa. Ontem eu saí de lá a tempo de jantar em casa. Fazia tempo.');
              },
            },
            {
              id: 'planta', label: 'A planta do Beto', icon: '🪴', pos: { x: -2.4, y: 0.9, z: -1.85 }, radius: 1.5, optional: true,
              onInteract: async (G) => {
                G.player.lookAt({ x: -2.4, y: 0.9, z: -1.85 });
                await G.think('pai', 'A costela-de-adão que o Beto me deu. Ontem à noite, enfim, respondi a mensagem dele.');
                await G.think('pai', 'A Faísca ajudou a arrumar as palavras. O que eu sinto, escrevi eu.');
              },
            },
            { id: 'sentar', label: 'Sentar com {filho}', icon: '☕', actor: 'filho' },
          ],
        });
        await G.fadeOut(0.35);
        G.pai.at('pai').setAnim('sit');
        G.faisca.face(G.pai, true);
        G.filho.lookAt(G.pai);
        await G.fadeIn(0.45);
        G.player.lookAt('filho');
        await G.say('filho', 'Pão de queijo quentinho. Hoje é dia especial.', { expr: 'feliz' });
        await G.say('pai', 'Especial por quê?', { expr: 'desconfiado' });
        await G.say('filho', 'Porque hoje é dia de resultado. E aí, {apelido}?', { expr: 'rindo' });
        await G.say('filho', '*Serve ou não serve?*', { expr: 'empolgado' });
        const resp = await G.choose([
          { text: '"Serve. Mas do meu jeito."', value: 'jeito' },
          { text: '"Para algumas coisas, serve muito. Para outras, nem chegue perto."', value: 'algumas' },
          { text: '"Posso responder depois do café?"', value: 'cafe' },
        ], { prompt: 'O que você responde?', who: 'pai' });
        G.v.resposta = resp;
        if (resp === 'algumas') {
          await G.say('pai', 'Para algumas coisas, serve muito. Para outras, nem chegue perto.', { expr: 'pensativo' });
          await G.say('filho', 'Essa é a resposta mais honesta que eu já ouvi sobre IA.', { expr: 'surpreso' });
        } else if (resp === 'cafe') {
          await G.say('pai', 'Posso responder depois do café?', { expr: 'desconfiado' });
          await G.say('filho', 'Pode. Mas você já está na segunda xícara.', { expr: 'rindo' });
        } else {
          await G.say('pai', 'Serve.', { expr: 'neutro' });
          await G.say('filho', 'Serve?!', { expr: 'surpreso' });
        }
        // O momento: plano de cinema, ele dizendo do jeito dele
        G.talkCam(false);
        G.player.cine();
        await G.letterbox(true);
        await G.cam.focus(G.pai, 'medio', { dur: 0.9, side: -1, angle: 0.4, pitch: 0.06 });
        await G.say('pai', 'Serve. Mas do meu jeito: *eu confiro, eu decido, eu assino.*', { expr: 'orgulhoso' });
        quiet(G.cam.two(G.pai, G.filho, { dur: 1.1 }));
        G.filho.emote('heart', 1.6);
        await G.say('filho', 'É exatamente o jeito certo.', { expr: 'orgulhoso' });
        await G.letterbox(false);
        G.player.fp();
        G.talkCam(true);
        G.player.lookAt(G.faisca);
        G.faisca.play('celebrate', 1.6);
        await G.say('faisca', 'E eu continuo sendo a estagiária rápida que às vezes fala besteira com confiança. Só que agora com um chefe que confere.');
        G.faisca.setAnim('idle');
        // Eco do ceticismo dele no prólogo
        const cet = ceticismo();
        if (cet === 'modinha') {
          await G.say('pai', 'Modinha ou não, ontem ela me devolveu umas boas horas.', { expr: 'pensativo' });
          await G.say('filho', 'Modinha que devolve hora eu aceito.', { expr: 'rindo' });
        } else if (cet === 'caneta') {
          await G.say('pai', 'E a caneta continuou minha. Vermelha, aliás. Gastei metade.', { expr: 'rindo' });
          await G.say('faisca', 'Pode riscar à vontade. Eu não fico ofendida.');
        } else {
          await G.say('pai', 'E, para constar: ela inventou coisa de novo ontem. Mais de uma vez.', { expr: 'desconfiado' });
          G.faisca.play('ashamed', 1.4);
          await G.say('faisca', 'Inventei. E você pegou. Foi constrangedor e muito educativo.');
          await G.say('pai', 'A diferença é que agora eu sei onde procurar.', { expr: 'orgulhoso' });
        }
        // A aposta do prólogo
        if (G.flag('aposta') === true) {
          await G.say('filho', 'Então... sobre a aposta.', { expr: 'sem_graca' });
          await G.say('pai', 'Se fosse inútil, você lavava a louça por um mês.', { expr: 'desconfiado' });
          await G.say('pai', 'Não foi inútil. Então a louça de hoje é minha. Perdi com dignidade.', { expr: 'rindo' });
          G.faisca.play('jump', 1);
          await G.say('faisca', 'Eu ajudaria, mas não tenho mão. Nem pia.');
          G.filho.play('laugh', 1.4);
        } else {
          await G.say('filho', 'E nem precisou de aposta.', { expr: 'rindo' });
          await G.say('pai', 'Não abusa.', { expr: 'desconfiado' });
        }
        await G.fadeOut(0.5);
      },

      // ================================================================
      // PARTE 2 — Regras da casa
      // ================================================================
      async (G) => {
        P2.ui.css('epilogo', CSS);
        mesa(G);
        await G.fadeIn(0.6);
        G.player.lookAt('filho');
        G.sfx('phone_vibrate');
        G.toast('Dona Marta: "Bom dia! Na sexta, o conselho vai perguntar o que a empresa está fazendo com IA. Tem algo para me mostrar?"', { icon: '💬', kind: 'notif', dur: 7 });
        await G.wait(1.2);
        G.sfx('email');
        G.toast('Luana (RH): "Perguntei no café, aqui no escritório: das 12 pessoas, 7 já usam IA por conta própria, no celular. Precisamos de uma regra."', { icon: '📧', kind: 'email', dur: 7 });
        await G.wait(0.8);
        await G.say('pai', 'Sete de doze. Aqui dentro. Por conta própria, no celular.', { expr: 'surpreso' });
        await G.say('pai', 'E o conselho quer saber o que a empresa está fazendo. Pelo jeito, já está fazendo. Só não sabe.', { expr: 'pensativo' });
        await G.say('filho', 'Você vai proibir?', { expr: 'preocupado' });
        await G.say('pai', 'Se eu proibir, eles param de contar. Não de usar.', { expr: 'desconfiado' });
        G.player.lookAt(G.faisca);
        G.faisca.setAnim('teach');
        await G.say('faisca', 'Exato. E a conversa de café da Luana vai na mesma linha das pesquisas grandes. Olha este dado do Brasil.');
        G.faisca.setAnim('idle');
        await G.fact('microsoft_wti_byoai');
        await G.say('faisca', 'O caminho que costuma funcionar é outro: uma ferramenta segura da empresa, uma regra curta e o exemplo de quem lidera.', { anim: 'teach' });
        G.faisca.setAnim('idle');
        await G.say('faisca', 'Quer que eu rascunhe as *regras da casa*? Uma página. Você risca o que não presta.');
        await G.say('pai', 'Rascunha. Mas eu vou ler linha por linha.', { expr: 'determinado' });
        G.faisca.play('jump', 0.9);
        await G.say('faisca', 'Era exatamente o que eu ia pedir.');
        G.faisca.setAnim('type');
        G.sfx('typing');
        await G.wait(0.9);
        G.faisca.setAnim('idle');

        const res = await miniRegras(G);
        G.v.pegas = res.pegas;
        G.v.tiradas = res.tiradas;
        if (res.pegas === RUINS) {
          G.faisca.play('celebrate', 1.6);
          await G.say('faisca', 'Quatro armadilhas, quatro riscos. Você leu como quem vai assinar.');
        } else if (res.pegas >= 2) {
          await G.say('faisca', 'Você pegou ' + res.pegas + ' das ' + RUINS + ' armadilhas. As outras eu corrigi depois do alerta. Caneta boa.');
        } else {
          G.faisca.play('ashamed', 1.2);
          await G.say('faisca', 'Algumas armadilhas passaram, e a culpa é de quem escreveu: eu. Por isso quem assina lê duas vezes.');
        }
        await G.say('faisca', 'Falta uma linha: a sua. Como CEO, o que você assina embaixo?');
        const cid = await G.choose(COMPROMISSOS.map((c) => ({ text: '"' + c.text + '"', sub: c.sub, value: c.id })), { prompt: 'O seu compromisso, no fim da página:', who: 'pai' });
        const comp = COMPROMISSOS.find((c) => c.id === cid) || COMPROMISSOS[0];
        await G.say('pai', comp.text, { expr: 'determinado' });
        G.faisca.emote('heart', 1.4);
        // A dúvida saudável aparece para o cutucão
        G.talkCam(false);
        G.sfx('pop');
        duvidaNaMesa(G);
        G.fx.sparkles(G.duvida, 0, 0, 14, '#e6d4ff');
        G.v.duvidaNaMesa = true;
        olharDuvida(G);
        await G.wait(0.6);
        await G.say('duvida', 'Psiu. Leu tudo antes de assinar?', { expr: 'amigavel', cam: false });
        await G.say('pai', 'Li. Linha por linha.', { expr: 'orgulhoso' });
        await G.say('duvida', 'Então assina. Eu fico aqui, quietinha.', { expr: 'amigavel', cam: false });
        G.player.lookAt('filho');
        await G.say('filho', '...{apelido}, com quem você está falando?', { expr: 'surpreso', cam: false });
        await G.say('pai', 'Com uma dúvida. Das boas.', { expr: 'rindo' });
        G.talkCam(true);

        await telaAssinatura(G, res.linhas, comp);
        const ids = res.linhas.map((l) => l.id).concat([comp.id]);
        G.v.regras = ids;
        G.v.compromisso = comp.id;
        G.stats({ regras: ids });
        G.sfx('success');
        G.achieve('lider_exemplo');
        G.player.lookAt('filho');
        await G.say('filho', 'Você escreveu a política de IA da empresa no café da manhã.', { expr: 'surpreso' });
        await G.say('pai', 'Escrevi não. Ela rascunhou. Eu risquei, troquei e assinei.', { expr: 'orgulhoso' });
        await G.say('pai', 'Antes de publicar, passa pelo Tadeu e pela TI. E sexta eu levo ao conselho.');
        await G.say('faisca', 'O modelo completo, com as perguntas para o jurídico e a TI, está no Guia do CEO, o botão 📘. Quando a gente terminar este café, ele abre inteiro.');
        G.sfx('notify');
        G.toast('Você → Dona Marta: "Bom dia! Tenho, sim. Uma página. Levo na sexta."', { icon: '✉️', kind: 'ok', dur: 5 });
        await G.wait(1.6);
        G.sfx('phone_vibrate');
        G.toast('Dona Marta: "Uma página? Finalmente alguém com resposta curta para o conselho."', { icon: '💬', kind: 'notif', dur: 6 });
        await G.wait(1.0);
        await G.say('pai', 'Vinte anos de conselho, e é a primeira vez que a Dona Marta elogia um documento meu pelo tamanho.', { expr: 'rindo' });
        await G.fadeOut(0.5);
      },

      // ================================================================
      // PARTE 3 — Relatório do dia + certificado
      // ================================================================
      async (G) => {
        P2.ui.css('epilogo', CSS);
        mesa(G);
        await G.fadeIn(0.6);
        G.player.lookAt(G.faisca);
        await G.say('faisca', 'Antes de você ir: fiz um relatório do seu dia de ontem.', { anim: 'teach' });
        G.faisca.setAnim('idle');
        await G.say('pai', 'Relatório? De quem?', { expr: 'desconfiado' });
        await G.say('faisca', 'Seu. Só com o que você me mostrou ontem: o que deu certo, o que deu errado e onde eu errei.');
        await telaRelatorio(G);
        await G.say('pai', 'Bonito. Agora deixa eu conferir esses minutos.', { expr: 'desconfiado' });
        G.faisca.play('jump', 0.9);
        await G.say('faisca', 'Faz bem. São estimativa minha, não medição. Na vida real, cronometre uma tarefa antes e depois, contando o tempo de conferir.');
        G.player.lookAt('filho');
        await G.say('filho', 'E tem mais uma coisa. Eu mandei fazer um certificado.', { expr: 'empolgado' });
        await G.say('filho', 'Bom: a Faísca rascunhou. Eu conferi.', { expr: 'rindo' });
        await telaCertificado(G);
        await G.say('pai', 'Revisor-chefe. Gostei do cargo.', { expr: 'orgulhoso' });
        await G.say('pai', 'Vou pendurar no escritório, ao lado do diploma.', { expr: 'feliz' });
        await G.say('filho', 'Ao lado?', { expr: 'surpreso' });
        await G.say('pai', 'Um pouco abaixo.', { expr: 'rindo' });
        await G.fadeOut(0.5);
      },

      // ================================================================
      // PARTE 4 — Desafio de 7 dias
      // ================================================================
      async (G) => {
        P2.ui.css('epilogo', CSS);
        mesa(G);
        await G.fadeIn(0.6);
        G.player.lookAt(G.faisca);
        await G.say('faisca', 'Agora o mais importante. E o mais difícil: amanhã.', { anim: 'teach' });
        G.faisca.setAnim('idle');
        await G.say('faisca', 'Ontem foi um dia comigo do lado o tempo todo. O que muda a sua semana é um hábito pequeno, de manhã, escolhido por você.');
        await G.say('pai', 'Hábito eu entendo. Café antes de qualquer coisa, há trinta anos.', { expr: 'neutro' });
        await G.say('faisca', 'Então a gente pendura no café. São planos "se… então…": se acontecer tal coisa, então eu faço tal coisa.');
        const plano = await miniDesafio(G);
        G.v.plano7 = plano;
        G.stats({ plano7: plano });
        G.faisca.play('celebrate', 1.4);
        await G.say('faisca', 'Uma última coisa, com toda a honestidade: hábito leva semanas, não dias. Perdeu um dia? Tudo bem, retoma no outro.');
        await G.say('faisca', 'E pegar o jeito pede umas boas horas de uso de verdade. No começo, conferir vai parecer mais lento. Depois passa.');
        await G.say('pai', 'E se eu achar que não está valendo a pena?', { expr: 'desconfiado' });
        await G.say('faisca', 'Aí troca de tarefa. Ninguém é obrigado a usar IA em tudo. Nem eu acho isso.');
        await G.say('pai', 'Uma IA que não se acha indispensável. Isso eu vou contar no conselho.', { expr: 'rindo' });
        await G.fadeOut(0.5);
      },

      // ================================================================
      // PARTE 5 — A carta, o Jorge, o fim
      // ================================================================
      async (G) => {
        P2.ui.css('epilogo', CSS);
        mesa(G);
        await G.fadeIn(0.6);
        G.player.lookAt('filho');
        await G.say('filho', 'Tenho mais uma coisa para você. Essa, sem IA nenhuma.', { expr: 'sem_graca' });
        G.filho.set({ props: { mug: false, papers: true } });
        quiet(G.filho.play('showphone', 1.6));
        G.sfx('page');
        await G.wait(0.7);
        await G.card({ kind: 'info', kicker: 'Para você', icon: '✉️', titulo: 'Uma carta de {filho}', node: cartaNode(G), botao: 'Guardar a carta', sfx: 'chime' });
        G.filho.set({ props: { papers: false, mug: true } });
        G.pai.setExpr('feliz');
        await G.say('pai', '...Tem alguma coisa no meu olho.', { expr: 'triste' });
        await G.say('filho', 'É o vapor do café.', { expr: 'feliz' });
        await G.say('pai', 'É o vapor do café.', { expr: 'feliz' });
        G.fx.hearts(G.filho);
        G.sfx('heart');
        await G.wait(0.8);
        // O Jorge
        G.sfx('phone_vibrate');
        G.toast('Jorge: "{pai}!! Me ensina esse negócio de IA? No grupo estão dizendo que ela declara o imposto de renda sozinha. É verdade???"', { icon: '💬', kind: 'notif', dur: 7 });
        await G.wait(1.4);
        await G.say('pai', 'O Jorge.', { expr: 'rindo' });
        await G.say('filho', 'O Jorge do grupo Empresários do Bairro?', { expr: 'rindo' });
        await G.say('pai', 'Ele mesmo. Quer aula. E já chegou com lorota: imposto de renda ela não declara sozinha.', { expr: 'orgulhoso' });
        const rj = await G.choose([
          { text: '"Ensino. Amanhã, 8h, no café. Traz uma tarefa chata de verdade."', value: 'tarefa' },
          { text: '"Ensino. Primeira lição: não acredita em tudo que chega no grupo."', value: 'grupo' },
          { text: '"Ensino. E chama a diretoria toda: a gente aprende junto."', value: 'diretoria' },
        ], { prompt: 'Você responde ao Jorge:', who: 'pai' });
        G.v.jorge = rj;
        G.sfx('notify');
        await G.wait(1.0);
        G.sfx('phone_vibrate');
        G.toast('Jorge: "FECHADO!!! Vou avisar no grupo 😄"', { icon: '💬', kind: 'notif', dur: 5 });
        await G.wait(1.0);
        await G.say('pai', 'Era exatamente isso que eu temia.', { expr: 'desconfiado' });
        G.player.lookAt(G.faisca);
        await G.say('faisca', 'Ontem de manhã você era o cético da mesa. Hoje tem fila de aluno.', { anim: 'jump' });
        G.faisca.setAnim('idle');
        G.player.lookAt('filho');
        await G.say('filho', 'Pai 2.0.', { expr: 'orgulhoso' });
        await G.say('pai', 'Pai 1.0 com atualização. O hardware é o mesmo.', { expr: 'rindo' });
        // Plano final de cinema
        G.talkCam(false);
        G.player.cine();
        await G.letterbox(true);
        await G.cam.shot('mesa', 1.2);
        await G.cutscene(async () => {
          quiet(G.cam.shot('geral', 5));
          await G.narrate('{pai} continua desconfiado. Continua conferindo tudo. Continua assinando com a própria caneta.');
          await G.narrate('A diferença é que agora a parte chata chega rascunhada. E sobra tempo para o café.');
          quiet(G.cam.shot('cidade', 5));
          await G.wait(1.2);
        });
        G.achieve('pai_2_0');
        await G.fact(['lally_habito_66_dias', 'mollick_10_horas'], {
          titulo: 'Para o desafio dar certo',
          texto: 'Hábito novo leva semanas. E a IA só mostra o que faz bem e mal no seu caso depois de umas horas de uso real.',
        });
        await G.lesson('A IA rascunha. Quem confere, decide e assina é você.\nComece pequeno, de manhã, numa tarefa de verdade, e com a sua dúvida sempre por perto.', { titulo: 'Pai 2.0', kicker: 'A lição do jogo', icon: '⭐' });
        await G.letterbox(false);
        G.music('final');
        await telaCreditos(G);
        await G.fadeOut(1.0);
      },
    ],
    summary: (G) => {
      const v = G.v || {};
      const out = [];
      const resp = { jeito: 'Serve. Mas do meu jeito.', algumas: 'Para algumas coisas, serve muito.', cafe: 'Depois do café: serve.' }[v.resposta];
      out.push('Resposta do café: "' + (resp || 'Serve. Mas do meu jeito.') + '"');
      if (v.regras) out.push('Regras da casa assinadas: ' + v.regras.length + (typeof v.pegas === 'number' ? ' (' + v.pegas + ' de ' + RUINS + ' armadilhas riscadas)' : ''));
      if (v.plano7) out.push('Desafio de 7 dias: ' + v.plano7.length + ' plano(s) "se… então…"');
      out.push('Eu confiro. Eu decido. Eu assino.');
      return out;
    },
  });
})();
