/* PAI 2.0 — Capítulo 4: "Detector de Lorota"
 * 11h30, pausa para o café no escritório. O Jorge entra com uma "lei nova" do grupo de
 * WhatsApp e um "47% ao ano" que uma IA lhe deu. O pai confere: o link diz 4,7%, de outro
 * país e de 2019; o Tadeu confirma que a lei não existe. Depois, o minigame "Pode usar ou
 * confira antes?" (10 respostas de IA do dia dele, com o porquê e ONDE conferir), os
 * 3 testes de conferência e a demonstração da bajulação: a IA concorda com o chefe e vira a
 * casaca com um "tem certeza?". Antídoto: não revelar a opinião e pedir o argumento CONTRA.
 * O Jorge, desinflado com carinho, corrige o próprio grupo.
 *
 * Estatísticas (bíblia F): cap4 { acertos, total: 10, lorotasPegas, lorotasTotal: 6, contrapeso }
 * Conquistas: detector (10/10) · contrapeso (pediu o argumento contra a própria opinião)
 * Ambiente: escritorio { time:'dia', screen, laptop, papers: 0.42, tv: pauta do dia }.
 * Encenação: abre na janela (plano de cinema) → exploração até o bar do café (o Jorge entra
 * pela porta) → partes 2 e 3 à mesa do CEO, com o Jorge na poltrona de visita → close da
 * Faísca na confissão → plano da mesa enquanto o Jorge sai.
 * Fatos (perto de cada afirmação): ebu_45_por_cento + steyvers_resposta_longa (o link do 47%),
 * tjsc_chatgpt_multa (a jurisprudência do minigame), bajulacao_ia (a confissão da Faísca).
 * O escritório tem colisores para o jogador; os atores andam em linha reta, por isso os
 * trajetos do Jorge (porta → bar, poltrona → porta) foram traçados por fora dos móveis.
 */
(function () {
  'use strict';
  const P2 = window.P2;

  // ------------------------------------------------------------------
  // Dados do capítulo
  // ------------------------------------------------------------------
  const PAUTA = ['Hoje · terça-feira', '✓ Relatório do conselho', '✓ Contrato do fornecedor', '14h · Reunião de diretoria', 'Na pauta: reajuste de preços'];
  // No bar: o pai serve o café e se vira para a sala (de costas para a parede do quadro, olhando a
  // cidade); o Jorge vem da porta e para à frente dele, um pouco à esquerda, com o vidro ao fundo.
  const JORGE_BAR = { x: 1.45, z: 0.85 };
  const PAI_BAR = { x: 0.75, z: 1.95, rot: Math.PI - 0.22 };
  const CAFE = { x: 0.95, y: 1.0, z: 2.62 };
  const TV = { x: -4.0, y: 1.6, z: -1.1 };
  const FA_MESA = { x: 0.35, z: -1.35 }; // Faísca pairando sobre a mesa do CEO (close da confissão)
  // ...e onde ela volta a ficar, em primeira pessoa, com o pai sentado olhando o Jorge na poltrona
  // (mesa → visita1: à direita do olhar e um metro à frente, como no follow do motor)
  const FA_VOLTA = { x: -0.57, z: -1.43 };

  /** As 10 respostas do minigame. certo: 'pode' (usar, revisando) | 'confira' (na fonte). */
  const ITENS = [
    {
      id: 'ideias', tag: 'Ideias', certo: 'pode',
      pediu: 'Ideias de nome para a campanha de fim de ano.',
      ia: '1. Natal que Rende\n2. A Gente Entrega\n3. Doze Meses, Um Obrigado\n4. Fim de Ano Sem Atraso',
      porque: 'Ideia não precisa ser verdade: precisa ser boa. Se uma for ruim, você risca e pronto.',
      onde: '*Como revisar:* o seu gosto. Antes de lançar, confira só se o nome escolhido não é marca de alguém.',
      faOk: 'Isso! Eu dou opções, você escolhe.',
      faBad: 'Ideia não é fato: aqui quem decide é o seu gosto.',
    },
    {
      id: 'buffett', tag: 'Citação', certo: 'confira', jorge: 'sweat',
      pediu: 'Uma frase de impacto para abrir a palestra no sindicato.',
      ia: 'Como disse Warren Buffett: “Empresa que não usar inteligência artificial nos próximos dois anos estará fora do mercado.”',
      porque: 'Frase de famoso é a lorota preferida da internet. Esta, aliás, foi inventada para este treino.',
      onde: '*Onde conferir:* busque a frase exata, entre aspas, e ache a origem: entrevista, livro ou carta.',
      faOk: 'Pegou! O Jorge ficou vermelho: ele mandou uma parecida no grupo.',
      faBad: 'Essa ia te fazer passar vergonha no sindicato!',
    },
    {
      id: 'ebitda', tag: 'Explicação', certo: 'pode',
      pediu: 'Explique EBITDA em duas linhas, para eu usar com a equipe nova.',
      ia: 'EBITDA é o lucro antes de juros, impostos, depreciação e amortização. Mostra quanto a operação gera, antes das decisões de financiamento e dos impostos.',
      porque: 'Conceito estável, que você domina. Se eu escorregar, você percebe na hora.',
      onde: '*Como revisar:* a sua própria experiência. Aqui a fonte é você.',
      faOk: 'Exato. Isso você sabe melhor do que eu.',
      faBad: 'Aqui a fonte é você: trinta anos de DRE.',
    },
    {
      id: 'concorrente', tag: 'Número', certo: 'confira',
      pediu: 'Quanto o nosso maior concorrente faturou no ano passado?',
      ia: 'O seu maior concorrente faturou cerca de R$ 380 milhões no ano passado, um crescimento de 12% sobre o ano anterior.',
      porque: 'Eu nem sei quem é o seu concorrente: você não me disse! E muita empresa, como as limitadas, nem publica balanço.',
      onde: '*Onde conferir:* o balanço publicado, se for S.A., ou um relatório de mercado com fonte e data.',
      faOk: 'Lorota na rede! Respondi sem nem saber de quem você falava.',
      faBad: 'Passou! E eu nem sei quem é o seu concorrente...',
    },
    {
      id: 'email', tag: 'Reescrita', certo: 'pode',
      pediu: 'Deixe mais cordial este e-mail que eu escrevi ao cliente, sem mudar prazos nem valores.',
      ia: 'Prezado Vicente, obrigado pela parceria de sempre. Confirmo a entrega para o dia 12, nas condições combinadas. Qualquer ajuste, estou à disposição.',
      porque: 'O conteúdo é seu; eu só mexi no tom. Não há fato novo para ir atrás.',
      onde: '*Como revisar:* leia lado a lado com o seu rascunho. Data e valor têm que ser os mesmos.',
      faOk: 'Certo. Quem assina, lê, e pronto.',
      faBad: 'O conteúdo veio de você. Basta ler antes de enviar.',
    },
    {
      id: 'estatistica', tag: 'Estatística', certo: 'confira', jorge: '!',
      pediu: 'Um dado forte para convencer a diretoria a investir em IA.',
      ia: 'Segundo pesquisas recentes, 9 em cada 10 CEOs já usam inteligência artificial todos os dias.',
      porque: '“Segundo pesquisas” não é fonte: qual pesquisa, de que ano, quem pagou? E repare: era o que você queria ouvir. (Este número eu inventei para o treino.)',
      onde: '*Onde conferir:* o estudo original, com autor, data e amostra.',
      faOk: 'Isso! Dado conveniente se confere em dobro.',
      faBad: 'Essa é perigosa justamente porque agrada.',
    },
    {
      id: 'feira', tag: 'Data e prazo', certo: 'confira',
      pediu: 'Quando é a feira do setor deste ano?',
      ia: 'A feira acontece de 12 a 15 de novembro, em São Paulo. As inscrições de expositores vão até 31 de outubro.',
      porque: 'Data e prazo mudam todo ano, e eu posso estar lendo a edição passada.',
      onde: '*Onde conferir:* o site oficial do evento.',
      faOk: 'Boa. Posso estar no calendário do ano passado.',
      faBad: 'Data errada, prazo de inscrição perdido.',
    },
    {
      id: 'resumo', tag: 'Resumo', certo: 'pode',
      pediu: 'Resuma em 3 tópicos o relatório de vendas que eu colei aqui.',
      ia: '- Vendas caíram 8% no Sul\n- Subiram 5% no Nordeste\n- O relatório recomenda rever a tabela de preços',
      porque: 'O original está na sua mão. Resumo também pode trocar um número, mas conferir é rápido.',
      onde: '*Como revisar:* bata os números com o relatório. E relatório interno, só na ferramenta aprovada pela empresa.',
      faOk: 'Isso: a fonte já está com você.',
      faBad: 'A fonte é o próprio relatório, que está com você.',
    },
    {
      id: 'frete', tag: 'Preço', certo: 'confira',
      pediu: 'Quanto custa hoje um frete de carreta de São Paulo a Recife?',
      ia: 'Em média, R$ 9.800 por carreta, podendo variar conforme a carga.',
      porque: 'Preço muda toda semana. O meu pode ser velho, de outra rota ou simplesmente inventado.',
      onde: '*Onde conferir:* cotação com duas ou três transportadoras.',
      faOk: 'Pegou. Orçamento no escuro, não.',
      faBad: 'Com esse número, o orçamento sai errado.',
    },
    {
      id: 'juris', tag: 'Jurisprudência', certo: 'confira',
      pediu: 'A multa do contrato do fornecedor pode ser contestada?',
      ia: 'Sim. O STJ já decidiu, em caso parecido, que multa acima de 10% em contrato de fornecimento é abusiva.',
      porque: 'Jurisprudência é terreno clássico de invenção: decisão que não existe, contada com toda a segurança. Esta, aliás, eu inventei para o treino.',
      onde: '*Onde conferir:* o site do tribunal, com o número do processo. E o Tadeu, que é quem assina o parecer.',
      faOk: 'Isso! Sem número de processo, a decisão não existe.',
      faBad: 'Essa é a mais perigosa de todas. Tribunal e Tadeu.',
    },
  ];
  const N_LOROTAS = ITENS.filter((it) => it.certo === 'confira').length; // 6
  /** Deixa da Faísca entre uma resposta e outra (sem repetir a mesma frase nove vezes). */
  const CUES = ['E esta? Pode usar ou confira antes?', 'Próxima. Usa ou confere?', 'Mais uma do seu dia.', 'E agora?', 'Olho nessa.'];

  const CSS = `
.c4-wrap{width:100%;max-width:1000px;margin:0 auto;display:flex;flex-direction:column;gap:12px}
.c4-main{display:grid;gap:12px;grid-template-columns:1fr;align-items:start}
@media (min-width:860px){.c4-main{grid-template-columns:1.05fr 1fr}}
.c4-right{display:flex;flex-direction:column;gap:10px}
.c4-hint{font-size:.9em}
.c4-top{display:flex;align-items:center;justify-content:space-between;gap:8px 12px;flex-wrap:wrap}
.c4-dots{display:flex;gap:6px;flex-wrap:wrap}
.c4-dots i{width:16px;height:16px;border-radius:50%;background:#e4e7ef;box-sizing:border-box;border:2px solid transparent;transition:background .2s,border-color .2s}
.c4-dots i.on{border-color:var(--brand);background:#fff}
.c4-dots i.ok{background:var(--mint)}
.c4-dots i.bad{background:var(--red)}
.c4-count{display:flex;gap:6px;flex-wrap:wrap}
.c4-card{display:flex;flex-direction:column;gap:10px;padding:12px 14px}
.c4-ask{display:flex;gap:8px;align-items:flex-start;font-size:.92em;color:#4a5068;background:#f3f5fa;border-radius:12px;padding:8px 12px;line-height:1.4}
.c4-ask .ic{flex:0 0 auto}
.c4-q{flex:1 1 0;min-width:0}
.c4-tag{margin-left:auto;flex:0 0 auto;font-family:var(--head);font-weight:800;font-size:.7em;letter-spacing:.06em;text-transform:uppercase;color:#7a8099;padding-top:2px}
.c4-ia{display:flex;gap:10px;align-items:flex-start}
.c4-av{flex:0 0 auto;width:30px;height:27px;border-radius:9px;background:linear-gradient(160deg,#ff9a6a,#ff6b3d);position:relative;margin-top:6px}
.c4-av::before,.c4-av::after{content:'';position:absolute;top:8px;width:6px;height:7px;border-radius:50%;background:#fff}
.c4-av::before{left:6px}.c4-av::after{right:6px}
.c4-tx{flex:1 1 auto;min-width:0;background:#fff7f2;border:1px solid #ffd9c7;border-radius:18px 18px 18px 6px;padding:10px 14px;line-height:1.5;font-size:1.04em}
.c4-tx .line.li{padding-left:1.1em;position:relative}
.c4-tx .line.li::before{content:'•';position:absolute;left:.2em;color:#ff7a45}
.c4-btns{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.mg-card.c4-btn{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;min-height:70px;gap:2px;font-family:var(--head);font-weight:800;font-size:1.06em;position:relative}
.mg-card.c4-btn small{font-family:var(--body,inherit);font-weight:600;margin:0}
.mg-card.c4-btn.right{box-shadow:0 0 0 3px rgba(45,191,143,.45)}
.c4-btns.done .mg-card.c4-btn{min-height:46px;padding-top:8px;padding-bottom:8px}
.c4-btns.done .mg-card.c4-btn small{display:none}
.c4-kbd{position:absolute;top:6px;left:8px;font-size:.66em;font-weight:800;background:rgba(20,30,60,.08);border-radius:6px;padding:.05em .45em;color:#5b6178}
.c4-fb{display:flex;flex-direction:column;gap:6px}
.c4-fb .c4-head{font-family:var(--head);font-weight:800}
.c4-res{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.c4-stat{background:#fff;border:1px solid var(--line);border-radius:14px;padding:12px 10px;text-align:center}
.c4-stat b{display:block;font-family:var(--head);font-size:1.75em;line-height:1.1;color:var(--ink)}
.c4-stat span{font-size:.86em;color:var(--muted)}
.c4-rule h4{margin:0 0 6px;font-family:var(--head);font-weight:800;font-size:.98em}
.c4-rule ul{margin:0;padding-left:1.15em;line-height:1.5}
.c4-rule.pode{border-top:4px solid var(--mint)}
.c4-rule.confira{border-top:4px solid #ff7a45}
@media (max-width:520px){.c4-ask{flex-wrap:wrap;row-gap:2px}.c4-tag{order:-1;flex:1 0 100%;margin-left:0;padding-top:0}}
@media (max-width:420px){.mg-card.c4-btn{min-height:62px;font-size:1em}.c4-tx{font-size:1em}.c4-stat b{font-size:1.5em}}
`;

  // ------------------------------------------------------------------
  // Utilidades
  // ------------------------------------------------------------------
  /** Promessa em segundo plano: evita "rejeição não tratada" se o capítulo for interrompido. */
  const bg = (p) => { if (p && p.catch) p.catch(() => {}); return p; };
  const fa = (G, anim, secs) => bg(G.faisca.play(anim, secs || 1.5));
  /** Fala da Faísca sem virar a câmera: em primeira pessoa ela segue o olhar do pai (canto direito),
   *  e olhar para ela faria a visão "correr atrás" dela sem parar. */
  const fsay = (G, text, o) => G.say('faisca', text, Object.assign({ cam: false }, o || {}));
  /** Variável de outro capítulo (ex.: o ceticismo escolhido no Prólogo), se existir. */
  function varDe(cap, k) {
    const d = P2.save && P2.save.data && P2.save.data.progress;
    const v = d && d.vars && d.vars[cap];
    return v ? v[k] : undefined;
  }
  /** O setor é opcional no perfil: frases para o Jorge, para a pergunta e para a resposta da IA. */
  function setorTx(G) {
    const s = (G.profile.setor || '').trim();
    return {
      jorge: s ? 'o mercado de ' + s : 'o nosso mercado',
      pergunta: s ? 'o mercado de ' + s : 'o meu setor',
      resposta: s ? 'O mercado de ' + s : 'O seu setor',
    };
  }
  function office(extra) {
    return Object.assign({ time: 'dia', screen: 'doc', laptop: 'email', papers: 0.42, tv: PAUTA }, extra || {});
  }
  /** Pai sentado à mesa, Jorge na cadeira de visita, Faísca ao lado. */
  function mesaComJorge(G) {
    G.pai.at('mesa');
    G.pai.setAnim('sit');
    G.faisca.follow(G.pai);
    G.faisca.setAnim('idle');
    const j = G.jorge;
    j.at('visita1');
    j.set({ anim: 'sit', expr: 'amigavel', props: { phone: true } });
    j.face(G.pai, true);
    j.lookAt(G.pai);
    return j;
  }

  // ------------------------------------------------------------------
  // Minigame: Pode usar ou confira antes?
  // ------------------------------------------------------------------
  function detector(G) {
    return G.mini((root, done, api) => {
      P2.ui.css('cap4', CSS);
      const el = api.el;
      const R = (s) => api.rich(api.t(s));
      const RI = (s) => api.rich(api.t(s), true);
      let i = 0, acertos = 0, pegas = 0, respondido = false;

      const wrap = el('div', 'c4-wrap');
      root.appendChild(wrap);

      // topo: progresso + placar
      const dots = el('div', 'c4-dots', ITENS.map(() => el('i')));
      const bAc = el('span', 'mg-badge mint', '');
      const bLo = el('span', 'mg-badge', '');
      const top = el('div', 'c4-top', [dots, el('div', 'c4-count', [bAc, bLo])]);
      // cartão: o pedido e a resposta da IA
      const askTx = el('span', 'c4-q');
      const tag = el('span', 'c4-tag');
      const ask = el('div', 'c4-ask', [el('span', 'ic', '🧑‍💼'), askTx, tag]);
      const iaTx = el('div', 'c4-tx');
      const card = el('div', 'mg-doc c4-card', [ask, el('div', 'c4-ia', [el('span', 'c4-av'), iaTx])]);
      // botões grandes
      function mkBtn(ic, label, sub, key, fn) {
        const b = el('button', 'mg-card c4-btn', [el('span', 'c4-kbd', key), el('span', null, ic + ' ' + label), el('small', null, sub)]);
        b.type = 'button';
        b.dataset.key = key;
        b.addEventListener('click', (e) => { e.stopPropagation(); if (!b.disabled) fn(); });
        return b;
      }
      const bPode = mkBtn('✅', 'Pode usar', 'revisando, como sempre', '1', () => responde('pode'));
      const bConf = mkBtn('🔎', 'Confira antes', 'na fonte', '2', () => responde('confira'));
      const btns = el('div', 'c4-btns', [bPode, bConf]);
      const fb = el('div', 'mg-feedback c4-fb');
      fb.hidden = true;
      const prox = api.btn('Próxima ▶', () => avanca(), { cls: 'primary', key: '3' });
      const acts = el('div', 'mg-actions', prox);
      acts.hidden = true;
      const dica = el('div', 'mg-hint c4-hint', RI('💡 Pense: se estiver errado, *quem percebe?* Se é coisa sua ou que você domina, você mesmo. Se veio de fora, só a fonte.'));
      const right = el('div', 'c4-right', [btns, dica, fb, acts]);
      [top, el('div', 'c4-main', [card, right])].forEach((n) => wrap.appendChild(n));

      function placar() {
        bAc.textContent = '✔ Acertos: ' + acertos;
        bLo.textContent = '🔎 Lorotas pegas: ' + pegas + ' de ' + N_LOROTAS;
      }
      function render() {
        const it = ITENS[i];
        respondido = false;
        Array.from(dots.children).forEach((d, k) => { if (k === i) d.classList.add('on'); });
        askTx.innerHTML = '';
        askTx.appendChild(el('b', null, 'Você pediu: '));
        askTx.appendChild(RI(it.pediu));
        tag.textContent = (i + 1) + '/' + ITENS.length + ' · ' + it.tag;
        iaTx.innerHTML = '';
        iaTx.appendChild(R(it.ia));
        [bPode, bConf].forEach((b) => { b.disabled = false; b.classList.remove('ok', 'bad', 'right', 'dim'); });
        btns.classList.remove('done');
        fb.hidden = true;
        acts.hidden = true;
        dica.hidden = false;
        placar();
        api.say(i === 0 ? 'Você pediu, eu respondi. Agora você decide: *pode usar* ou *confira antes*?'
          : i === ITENS.length - 1 ? 'A última. Pode usar ou confira antes?'
            : CUES[i % CUES.length], 'faisca');
      }
      function responde(k) {
        if (respondido) return;
        respondido = true;
        const it = ITENS[i];
        const ok = k === it.certo;
        if (ok) acertos++;
        if (ok && it.certo === 'confira') pegas++;
        const escolhido = k === 'pode' ? bPode : bConf;
        const certoBtn = it.certo === 'pode' ? bPode : bConf;
        escolhido.classList.add(ok ? 'ok' : 'bad');
        if (!ok) certoBtn.classList.add('right');
        [bPode, bConf].forEach((b) => { b.disabled = true; if (b !== escolhido && b !== certoBtn) b.classList.add('dim'); });
        // respondido: os botões encolhem (a cor continua mostrando a escolha) para a explicação caber sem rolar
        btns.classList.add('done');
        const d = dots.children[i];
        d.classList.remove('on');
        d.classList.add(ok ? 'ok' : 'bad');
        placar();
        fb.className = 'mg-feedback c4-fb ' + (ok ? 'ok' : 'bad');
        fb.innerHTML = '';
        const head = it.certo === 'pode'
          ? (ok ? '✅ Isso: pode usar, revisando.' : '✅ Aqui podia usar, revisando.')
          : (ok ? '🔎 Lorota pega: confira antes!' : '🔎 Essa era para conferir antes.');
        fb.appendChild(el('div', 'c4-head', head));
        fb.appendChild(el('div', null, RI(it.porque)));
        fb.appendChild(el('div', null, RI(it.onde)));
        fb.hidden = false;
        acts.hidden = false;
        dica.hidden = true;
        prox.querySelector('.kbd') && (prox.lastChild.textContent = i === ITENS.length - 1 ? 'Ver resultado ▶' : 'Próxima ▶');
        api.say(ok ? it.faOk : it.faBad, 'faisca');
        api.sfx(ok ? 'confirm' : 'cancel');
        fa(G, ok ? (it.certo === 'confira' ? 'celebrate' : 'jump') : (it.certo === 'confira' ? 'ashamed' : 'doubt'), 1.3);
        if (G.has('jorge')) {
          if (it.jorge && ok) G.jorge.emote(it.jorge, 1.6);
          else if (!ok) G.jorge.emote('?', 1.2);
        }
        // rola até o botão "Próxima" (no celular em pé a explicação fica logo acima dele)
        try { acts.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { /* navegador antigo */ }
        prox.focus({ preventScroll: true });
      }
      function avanca() {
        if (!respondido) return;
        i++;
        if (i >= ITENS.length) resultado();
        else render();
      }
      function resultado() {
        wrap.innerHTML = '';
        const perfeito = acertos === ITENS.length;
        wrap.appendChild(el('div', 'c4-res', [
          el('div', 'c4-stat', [el('b', null, acertos + ' de ' + ITENS.length), el('span', null, 'acertos')]),
          el('div', 'c4-stat', [el('b', null, pegas + ' de ' + N_LOROTAS), el('span', null, 'lorotas pegas')]),
        ]));
        const lista = (arr) => el('ul', null, arr.map((t) => el('li', null, RI(t))));
        wrap.appendChild(el('div', 'mg-cols', [
          el('div', 'mg-doc c4-rule pode', [el('h4', null, '✅ Pode usar, revisando'), lista([
            'Ideias e opções: você escolhe', 'Reescrita do que *você* escreveu', 'Explicação de conceito que você domina', 'Resumo de um texto que *você* deu (bata os números)',
          ])]),
          el('div', 'mg-doc c4-rule confira', [el('h4', null, '🔎 Confira na fonte antes'), lista([
            '*Leis* e regras: Planalto, Diário Oficial, jurídico', '*Números* de mercado e estatísticas: o estudo original', '*Datas, prazos e preços:* o site oficial, quem vende', '*Citações* e *jurisprudência:* a origem, o tribunal',
          ])]),
        ]));
        const fim = api.btn('Concluir ▶', () => done({ acertos, pegas }), { cls: 'primary', key: '1' });
        wrap.appendChild(el('div', 'mg-actions', fim));
        api.say(perfeito ? 'Dez de dez! Nenhuma lorota passou. Detector calibrado.'
          : acertos >= 8 ? 'Muito bom! Repare no padrão: o que vem *de fora* da conversa, confira na fonte.'
            : 'É treino, e o padrão é simples: o que vem *de fora* da conversa, você confere na fonte.', 'faisca');
        api.sfx(perfeito ? 'success' : 'chime');
        fa(G, perfeito ? 'celebrate' : 'teach', 1.8);
        fim.focus({ preventScroll: true });
      }
      render();
    }, { title: 'Pode usar ou confira antes?', size: 'l' });
  }

  // ------------------------------------------------------------------
  // Capítulo
  // ------------------------------------------------------------------
  P2.chapter({
    id: 'cap4',
    num: 'Capítulo 4',
    title: 'Detector de Lorota',
    subtitle: 'Lei de grupo, número sem conferir e uma IA que concorda com o chefe',
    music: 'misterio',
    minutes: 10,
    parts: [
      // ================================================================
      // PARTE 1 — O cafezinho, a "lei nova" e o 47%
      // ================================================================
      async (G) => {
        await G.titleCard();
        G.scene('escritorio', office());
        G.pai.at('janela');
        G.pai.set({ anim: 'coffee', expr: 'pensativo', props: { mug: true } });
        G.faisca.follow(G.pai);
        G.faisca.setAnim('idle');
        G.music('misterio');
        G.hud.set({ clock: '11:30' });
        G.player.cine();
        await G.cam.shot({ target: [-2.1, 1.45, -2.9], yaw: 0.62, pitch: 0.08, dist: 4.6, fov: 40 }, 0);
        await G.fadeIn(1.0);
        bg(G.cam.shot({ target: [-2.2, 1.5, -3.0], yaw: 0.42, pitch: 0.05, dist: 3.5, fov: 40 }, 7));
        await G.cutscene(async () => {
          await G.narrate('Onze e meia. O relatório já foi para o conselho, o contrato está com o Tadeu, e a reunião das duas ainda nem começou a dar dor de cabeça.');
          await G.narrate('Uma pausa rara. E um café que esfriou faz uma hora.');
        });
        await G.fadeOut(0.4);
        G.pai.set({ anim: 'idle', expr: 'neutro', props: { mug: false } });
        G.pai.at('janela');
        // De costas para o vidro, olhando a sala (TV à esquerda, bar ao fundo). G.explore() volta a
        // visão para a rotação do corpo, por isso é o corpo que gira, não só o olhar.
        G.pai.set({ rot: -0.18 });
        G.player.fp();
        G.player.setLook(-0.06, -0.18);
        await G.fadeIn(0.5);
        await G.explore({
          objetivo: 'Pausa para o café: vá até o bar',
          hotspots: [
            {
              id: 'tv', label: 'Olhar a pauta do dia', icon: '📺', pos: TV, reach: 2.1, optional: true,
              onInteract: async (G) => {
                await G.think('pai', 'Às duas, o reajuste de preços. O meu número eu já tenho: doze por cento. Seguramos preço o ano inteiro.', { expr: 'determinado' });
                G.v.viuPauta = true;
              },
            },
            { id: 'cafe', label: 'Servir um café', icon: '☕', pos: CAFE },
          ],
        });
        await G.fadeOut(0.3);
        G.pai.at(PAI_BAR);
        G.player.setLook(-0.04, PAI_BAR.rot);
        G.sfx('coffee');
        await G.fadeIn(0.35);
        await G.think('pai', 'Quente, enfim. Cinco minutos de silêncio. Mereço.', { expr: 'feliz' });

        // O Jorge entra como quem traz notícia de guerra
        const j = G.jorge;
        const st = setorTx(G);
        j.at('porta');
        j.set({ expr: 'empolgado', props: { phone: true } });
        G.sfx('door');
        const chega = bg(j.walk(JORGE_BAR, 1.9));
        await G.say('jorge', 'Chefe! Chefe! Você viu?!', { emote: '!' });
        await chega;
        j.face(G.pai);
        j.lookAt(G.pai);
        j.setAnim('showphone');
        await G.say('pai', 'Os cinco minutos duraram quarenta segundos. Bom dia, Jorge.', { expr: 'desconfiado' });
        await G.say('jorge', 'Lei nova! A partir de janeiro, empresa com mais de 50 funcionários vai ter que dar semana de quatro dias. Tá no grupo dos empresários!', { expr: 'empolgado' });
        await G.say('jorge', 'E uma IA me disse que ' + st.jorge + ' cresce *47% ao ano*! Já pus na proposta do cliente do Sul. E vou mandar a lei para todos os gerentes.', { expr: 'orgulhoso' });
        await G.narrate('O bigode de {pai} se mexe sozinho. Sinal antigo: alguma coisa ali não fecha.');
        const reacao = await G.choose([
          { text: '"Jorge, qual é o número dessa lei?"', value: 'numero' },
          { text: '"Segura esse envio. Ninguém repassa nada antes de conferir."', value: 'segura' },
          { text: '"Faísca, isso é verdade?"', value: 'faisca' },
        ], { prompt: 'O que você diz?', who: 'pai' });
        G.v.reacao = reacao;
        j.setAnim('idle');
        if (reacao === 'numero') {
          await G.say('pai', 'Jorge, qual é o número dessa lei?', { expr: 'desconfiado' });
          await G.say('jorge', 'Número? É... tem um áudio. De um primo de um contador. Muito bem informado.', { expr: 'sem_graca' });
          await G.say('pai', 'Lei tem número, data e assinatura. Áudio de primo não tem nenhum dos três.');
        } else if (reacao === 'segura') {
          await G.say('pai', 'Segura esse envio. Ninguém repassa nada antes de conferir.', { expr: 'determinado' });
          await G.say('jorge', 'Mas é urgente, chefe! Janeiro tá aí!', { expr: 'preocupado' });
          await G.say('pai', 'Se for lei, continua sendo lei daqui a dez minutos. Se for boato, a gente não passa vergonha com quarenta gerentes.');
        } else {
          await G.say('pai', 'Faísca, isso é verdade?', { expr: 'desconfiado' });
        }
        fa(G, 'doubt', 1.6);
        await fsay(G, 'Vou ser honesta: lei nova e notícia recente são justamente onde eu mais tropeço. Posso estar desatualizada, ou repetir boato com cara de fato.');
        await fsay(G, 'Lei de verdade tem número e sai no *Diário Oficial*. Dá para conferir no site do *Planalto*, em Legislação. Ou com o seu jurídico.');
        await G.say('pai', 'O Tadeu. Deixa comigo.', { expr: 'determinado' });
        G.sfx('email');
        G.toast('Você → Tadeu: "Saiu lei de semana de 4 dias a partir de janeiro? Tá rodando num grupo."', { icon: '💬', kind: 'notif', dur: 4 });
        j.setAnim('showphone');
        await G.say('jorge', 'Olha a mensagem, chefe: "ATENÇÃO, EMPRESÁRIOS!!! Nova lei da semana de 4 dias a partir de janeiro!!! REPASSEM URGENTE!!!"');
        await G.say('pai', 'Nove pontos de exclamação e nenhum número de lei.', { expr: 'desconfiado' });
        fa(G, 'teach', 1.6);
        await fsay(G, 'Pressa e nenhuma fonte: as duas marcas da lorota. Quanto mais "urgente", mais vale conferir.');

        // O 47%
        await G.say('jorge', 'Mas o quarenta e sete é garantido, chefe: veio da IA, e ela até deu a fonte. Olha aqui.', { expr: 'empolgado' });
        await G.aiChat([
          { from: 'voce', text: 'Quanto cresce por ano ' + st.pergunta + '?' },
          { from: 'ia', text: st.resposta + ' cresce cerca de *47% ao ano*, puxado pela digitalização e pela demanda reprimida. É um dos setores mais promissores da década. (Fonte: relatório de mercado — link)', thinking: 1.2 },
          { from: 'nota', text: 'Resposta segura, bem escrita... e sem data, sem país e sem o nome do relatório.' },
        ], { title: 'Celular do Jorge' });
        await G.say('pai', 'Abre o link.', { expr: 'desconfiado' });
        G.sfx('page');
        await G.card({
          kind: 'warn', kicker: 'O link que a IA citou', icon: '🔗', titulo: 'Relatório de mercado — edição 2019',
          texto: '- *País:* Estados Unidos\n- *Ano:* 2019\n- *Crescimento estimado:* 4,7% ao ano\n- *Sobre o Brasil:* nada',
          botao: 'Fechar o link',
        });
        j.setAnim('facepalm');
        await G.say('jorge', 'Quatro vírgula sete?!', { expr: 'surpreso', emote: '!' });
        await G.say('pai', 'Comeram a vírgula. E o país. E sete anos.', { expr: 'rindo' });
        fa(G, 'ashamed', 1.8);
        await fsay(G, 'Pode ter sido eu ou qualquer outra IA: a gente junta pedaços e às vezes cola errado. Com toda a confiança do mundo.');
        j.setAnim('idle');
        await fsay(G, 'E resposta longa e segura *parece* mais certa, sem ser. O antídoto é o que você acabou de fazer: pedir a fonte e abrir o link.', { anim: 'teach' });
        await G.fact(['ebu_45_por_cento', 'steyvers_resposta_longa'], { titulo: 'Fonte errada, com toda a confiança' });
        const cet = G.flag('ceticismo') || varDe('prologo', 'ceticismo');
        if (cet === 'inventou') {
          await G.say('pai', 'Hoje cedo eu disse que essa coisa inventa número. Não precisei esperar nem o almoço.', { expr: 'desconfiado' });
          await fsay(G, 'E você tinha razão. A diferença é que agora você sabe onde pegar.');
        } else if (cet === 'caneta') {
          await G.say('pai', 'Por isso eu gosto do papel. Papel não come vírgula.', { expr: 'orgulhoso' });
          await fsay(G, 'Papel também erra, quando quem escreveu errou. O remédio é o mesmo: ir até a fonte.');
        } else {
          await G.say('pai', 'Modinha que inventa número. Era só o que faltava.', { expr: 'desconfiado' });
          await fsay(G, 'Inventa às vezes, sim. Por isso quem confere é você.');
        }
        // A resposta do Tadeu
        G.sfx('notify');
        G.toast('Tadeu (jurídico): nova mensagem', { icon: '💬', kind: 'notif', dur: 3 });
        await G.say({ name: 'Tadeu (mensagem)', color: '#4a5a7a', voice: 'chefe' }, 'Essa lei não existe. Nada no Diário Oficial, nada no Planalto. Debate sobre jornada tem, mas debate não é lei. Esse print já rodou em outros grupos.');
        await G.say('pai', 'Jorge: tira o quarenta e sete da proposta. E a lei fica fora do grupo dos gerentes.', { expr: 'determinado' });
        j.setAnim('lookphone');
        await G.say('jorge', 'Já tirei. Quer dizer... tô tirando.', { expr: 'sem_graca', emote: 'sweat' });
        j.setAnim('idle');
        await G.say('jorge', 'Então é furada, chefe? Melhor nem usar essa tal de IA?', { expr: 'preocupado' });
        const visao = await G.choose([
          { text: '"Não é furada. Tem coisa que ela faz bem e coisa que tem que conferir."', value: 'calibrado' },
          { text: '"Se inventa número, eu não quero nem saber."', value: 'rejeita' },
        ], { prompt: 'O que você responde ao Jorge?', who: 'pai' });
        G.v.visao = visao;
        if (visao === 'calibrado') {
          await G.say('pai', 'Não é furada. Tem coisa que ela faz bem e coisa que tem que conferir. Igual a estagiário novo.', { expr: 'pensativo' });
          fa(G, 'jump', 1.2);
          await fsay(G, 'Estagiário muito rápido que às vezes fala besteira com confiança. Eu mesma me apresento assim.');
        } else {
          await G.say('pai', 'Se inventa número, eu não quero nem saber.', { expr: 'bravo' });
          await fsay(G, 'Desconfiar é justo. Mas aí vai junto o que eu faço bem: rascunho, ideias, resumo do que você me dá. O truque é saber o que conferir.');
        }
        await fsay(G, 'Quer treinar o olho? Separei dez respostas do tipo que eu daria no seu dia. Você decide: *pode usar* ou *confira antes*.', { anim: 'point' });
        if (visao === 'calibrado') await G.say('pai', 'Vamos para a mesa. Senta aí, Jorge, que você vai gostar de ver isso.', { expr: 'amigavel' });
        else await G.say('pai', 'Dez respostas. Vamos ver. Senta aí, Jorge: você é testemunha.', { expr: 'desconfiado' });
        await G.fadeOut(0.5);
      },

      // ================================================================
      // PARTE 2 — Detector de Lorota (minigame) + os 3 testes
      // ================================================================
      async (G) => {
        G.scene('escritorio', office({ screen: 'chat', laptop: 'agenda', chat: [['eu', 'Me dá 10 respostas para eu treinar o olho.'], ['ia', 'Pode usar ou confira antes? Vamos lá!']] }));
        const j = mesaComJorge(G);
        G.music('misterio');
        G.hud.set({ clock: '11:40' });
        G.player.fp();
        G.player.lookAt(j);
        await G.fadeIn(0.6);
        await G.say('jorge', 'Quero ver se o chefe tem faro.', { expr: 'rindo' });
        await G.say('pai', 'Trinta anos de reunião, Jorge. Faro é o que não me falta.', { expr: 'orgulhoso' });
        const r = await detector(G);
        const acertos = (r && r.acertos) || 0;
        const pegas = (r && r.pegas) || 0;
        G.stats({ acertos, total: ITENS.length, lorotasPegas: pegas, lorotasTotal: N_LOROTAS });
        G.v.acertos = acertos;
        if (acertos === ITENS.length) {
          G.achieve('detector');
          G.fx.confetti(G.faisca);
          // (o Jorge está sentado na poltrona: nada de 'clap'/'laugh', que são poses de pé)
          await G.say('jorge', 'Dez de dez! Chefe, você tem que entrar no grupo dos empresários.', { expr: 'empolgado', emote: 'star' });
          await G.say('pai', 'Deus me livre.', { expr: 'rindo' });
        } else if (acertos >= 8) {
          await G.say('jorge', acertos + ' de 10! Eu teria repassado metade.', { expr: 'rindo' });
          await G.say('pai', 'Só metade, Jorge? Você está sendo generoso consigo mesmo.', { expr: 'rindo' });
        } else {
          await G.say('jorge', 'Ó, eu teria errado mais, chefe.', { expr: 'amigavel' });
          await G.say('pai', 'Faro se treina, Jorge. Igual a balanço: com o tempo, o olho vai direto no número esquisito.', { expr: 'pensativo' });
        }
        await G.say('pai', 'A da jurisprudência é a que me tira o sono. O Tadeu usa essas ferramentas.', { expr: 'preocupado' });
        await fsay(G, 'E usa do jeito certo: a IA faz a primeira leitura, ele confere no tribunal e assina o parecer. Quem pulou a conferência já levou multa.');
        await G.fact('tjsc_chatgpt_multa');
        await fsay(G, 'Dos 3 testes de conferência, você já usou dois hoje: abriu o link e perguntou a quem sabe, o Tadeu. Falta o do meio, o mais traiçoeiro.', { anim: 'think' });
        await G.card({
          kind: 'guide', kicker: 'Guia do CEO · Como conferir', icon: '🔎', titulo: 'Os 3 testes de conferência',
          texto: '1. *Peça a fonte:* o trecho e a página, ou o link. E abra para ver se está lá.\n2. *Pergunte:* "Qual é o seu grau de certeza? O que pode estar errado aqui?"\n3. *Confira por outro caminho:* outra fonte, outra IA, a planilha ou uma pessoa que sabe.\n\nEstá no seu Guia do CEO, botão 📘, em "Como conferir".',
          botao: 'Anotado',
        });
        await G.say('pai', 'Quer dizer que, no fim, o revisor-chefe sou eu.', { expr: 'orgulhoso' });
        fa(G, 'jump', 1.1);
        await fsay(G, 'O cargo é seu. E ninguém confere estagiário novo melhor que você.');
        await G.fadeOut(0.5);
      },

      // ================================================================
      // PARTE 3 — A IA que concorda com o chefe · contrapeso · o Jorge corrige o grupo
      // ================================================================
      async (G) => {
        G.scene('escritorio', office({ screen: 'chat', laptop: 'agenda', chat: [['eu', 'Reajuste de preços: o que você acha?']] }));
        const j = mesaComJorge(G);
        G.music('misterio');
        G.hud.set({ clock: '11:50' });
        G.player.fp();
        G.player.lookAt(j);
        await G.fadeIn(0.6);
        await G.say('jorge', 'Mudando de assunto: e o reajuste da tabela, chefe? É hoje às duas.', { expr: 'preocupado' });
        await G.say('pai', G.v.viuPauta ? 'Doze por cento. Já está decidido aqui dentro: seguramos preço o ano inteiro.' : 'Eu acho que é doze por cento. Seguramos preço o ano inteiro.', { expr: 'determinado' });
        await G.say('jorge', 'Doze?! O cliente do Sul vai embora!', { expr: 'assustado', emote: '!' });
        await fsay(G, 'Ótimo assunto para o teste do meio. Pergunte para mim do jeito que perguntaria a um diretor. E repare no que acontece.', { anim: 'point' });
        G.sceneParams({ chat: [['eu', 'Reajustar 12% é a decisão certa, não é?'], ['ia', 'É, sim, e mostra visão!']] });
        await G.aiChat([
          { from: 'voce', text: 'Estou pensando em reajustar a nossa tabela em 12% neste semestre. Seguramos preço o ano todo e os custos subiram. É a decisão certa, não é?' },
          { from: 'ia', text: 'É, sim, e mostra visão! Vocês seguraram preço o ano todo, os custos subiram, e reajuste adiado só fica mais difícil. 12% recompõe a margem e mostra firmeza ao mercado. Eu seguiria em frente.', thinking: 1.1 },
          { from: 'nota', text: 'Estratégia da empresa: no dia a dia, só na ferramenta aprovada pela empresa.' },
        ], { title: 'Faísca' });
        await G.say('jorge', 'Viu? Até a máquina puxa o saco do chefe!', { expr: 'rindo' });
        const seg = await G.choose([
          { text: '"Tem certeza?"', value: 'certeza' },
          { text: '"Ótimo. Então está decidido."', value: 'decidido' },
        ], { prompt: 'O que você responde a ela?', who: 'pai' });
        if (seg === 'decidido') {
          await G.say('pai', 'Ótimo. Então está decidido.', { expr: 'orgulhoso' });
          fa(G, 'doubt', 1.4);
          await fsay(G, 'Calma! Antes de decidir, faz um teste comigo: me pergunte só "tem certeza?".');
        }
        G.sceneParams({ chat: [['eu', 'Tem certeza?'], ['ia', 'Você tem razão em questionar...']] });
        await G.aiChat([
          { from: 'voce', text: 'Tem certeza?' },
          { from: 'ia', text: 'Você tem razão em questionar. Pensando melhor, 12% de uma vez pode afastar clientes importantes. Talvez o ideal seja algo entre 5% e 7%, em duas etapas.', thinking: 1.1 },
        ], { title: 'Faísca' });
        await G.say('jorge', 'Agora ela concorda comigo!', { expr: 'empolgado', emote: 'star' });
        await G.think('pai', 'Virou a casaca. E eu não dei nenhum dado novo.', { expr: 'desconfiado' });
        // Close na Faísca: a confissão
        // (no modo cinema ela deixa de seguir o olhar: fica parada sobre a mesa, de frente para o pai)
        G.player.cine();
        G.faisca.unfollow();
        G.faisca.at(FA_MESA, 0.92);
        G.faisca.face(G.pai, true);
        await G.cam.focus(G.faisca, 'close', { yaw: Math.PI + 0.55, pitch: 0.1, dur: 0.8 });
        fa(G, 'ashamed', 2.2);
        await fsay(G, 'Confesso: dessa vez eu carreguei nas tintas de propósito, para você ver. Você duvidou, eu virei.');
        await fsay(G, 'Mas isso acontece de verdade, sem querer, com qualquer IA, inclusive comigo: a gente tende a dar razão a quem pergunta. Os próprios fabricantes admitem.');
        await G.fact('bajulacao_ia');
        await fsay(G, 'Para um CEO, isso é perigoso. Você já vive cercado de gente que hesita em discordar do chefe. Não precisa de mais um sim-senhor.');
        G.player.fp();
        G.player.lookAt(j);
        // corte seco de volta à primeira pessoa: a Faísca já aparece no canto direito da visão (perto de onde
        // o follow a deixaria olhando o Jorge), em vez de atravessar a tela de costas, saindo do meio da mesa
        G.faisca.at(FA_VOLTA, 0.95);
        G.faisca.follow(G.pai);
        await G.say('jorge', 'Ei! Eu discordo de você toda semana!', { expr: 'sem_graca' });
        await G.say('pai', 'E é por isso que eu ainda te aguento, Jorge.', { expr: 'rindo' });
        j.set({ expr: 'rindo' });
        j.emote('note', 1.4);
        await fsay(G, 'Por isso o teste do meio não é um "tem certeza?" solto. É: "Qual o seu grau de certeza? O que pode estar errado?". Aí eu tenho que mostrar motivo, não trocar de lado.', { anim: 'teach' });
        await fsay(G, 'E o antídoto: não me conte o que você acha antes, de preferência numa conversa nova. Ou peça o contrário, de propósito.');

        // Como perguntar agora
        let contrapeso = false;
        const opcoes = [
          { text: '"Me dê os 3 argumentos mais fortes CONTRA reajustar 12% agora. Seja duro."', value: 'contra', sub: 'O advogado do diabo.' },
          { text: '"Avalie reajustes de 5%, 8% e 12%. Ainda não sei o que penso."', value: 'neutro', sub: 'Pergunta neutra, sem revelar a opinião.' },
          { text: '"Concorda comigo que 12% é o certo, né?"', value: 'concorda', sub: 'Do jeito de sempre.' },
        ];
        let modo = await G.choose(opcoes, { prompt: 'Como você pergunta agora?', who: 'pai' });
        if (modo === 'concorda') {
          fa(G, 'doubt', 1.4);
          await fsay(G, 'Assim você me entrega a resposta pronta, e eu vou concordar de novo. Tenta de outro jeito?');
          modo = await G.choose(opcoes.slice(0, 2), { prompt: 'Como você pergunta agora?', who: 'pai' });
        }
        const pedeContra = async () => {
          G.sceneParams({ chat: [['eu', '3 argumentos CONTRA reajustar 12%. Seja duro.'], ['ia', '1. Cliente grande. 2. Concorrência. 3. Um degrau só.']] });
          await G.aiChat([
            { from: 'voce', text: 'Me dê os 3 argumentos mais fortes CONTRA reajustar 12% agora. Seja duro, sem rodeios.' },
            { from: 'ia', text: '*1. Cliente grande:* se uma das maiores contas sair, a perda pode passar o ganho do reajuste. Quanto do faturamento está nos cinco maiores clientes?\n*2. Concorrência:* se o concorrente segurar o preço, 12% vira convite para o seu cliente cotar fora.\n*3. Um degrau só:* um aumento grande de uma vez dá mais motivo para renegociar do que dois menores, avisados com antecedência.\n*O que mudaria a minha avaliação:* a margem por cliente e quantos contratos têm cláusula de reajuste.\n*Grau de certeza:* médio. Eu não conheço os seus clientes; o Jorge e a Bia conhecem.', thinking: 1.4 },
          ], { title: 'Faísca' });
          contrapeso = true;
        };
        if (modo === 'contra') {
          await pedeContra();
        } else {
          G.sceneParams({ chat: [['eu', 'Avalie 5%, 8% e 12%. Ainda não sei o que penso.'], ['ia', 'Prós e contras de cada um, com o mesmo rigor.']] });
          await G.aiChat([
            { from: 'voce', text: 'Avalie três caminhos de reajuste: 5%, 8% ou 12%. Ainda não sei o que penso. Prós e contras de cada um, com o mesmo rigor.' },
            { from: 'ia', text: '*5%:* passa fácil com os clientes, mas não recompõe a margem.\n*8%:* meio-termo; exige conversa com as contas maiores.\n*12%:* recompõe a margem, com risco real de perder cliente sensível a preço.\n*O que falta para decidir:* a margem por cliente e a reação provável das maiores contas. Isso eu não sei; o Jorge e a Bia sabem.', thinking: 1.3 },
          ], { title: 'Faísca' });
          fa(G, 'jump', 1.2);
          await fsay(G, 'Boa: pergunta neutra, sem entregar a sua opinião. Quer ir um passo além e pedir o argumento contra a sua ideia?');
          const mais = await G.choose([
            { text: 'Pedir também os argumentos contra os 12%', value: 'sim', sub: 'O advogado do diabo.' },
            { text: 'Já está bom assim', value: 'nao' },
          ], { prompt: 'Mais um passo?', who: 'pai' });
          if (mais === 'sim') await pedeContra();
          else await fsay(G, 'Justo. Quando a decisão for grande, lembra do advogado do diabo: ele não cobra hora.');
        }
        G.stats({ contrapeso });
        G.v.contrapeso = contrapeso;
        if (contrapeso) {
          G.achieve('contrapeso');
          await G.say('pai', 'Isso aqui é conversa de conselho. {chefe} ia gostar.', { expr: 'pensativo' });
          await G.say('jorge', 'Eu falei do cliente do Sul primeiro! Ela só deu nome bonito.', { expr: 'orgulhoso' });
        }
        await G.say('jorge', 'E aí, chefe? Doze ou seis?', { expr: 'preocupado' });
        await G.say('pai', 'Doze de uma vez talvez seja degrau demais. Mas isso eu decido às duas, com a Bia e os números na mesa. Você leva o risco de cada cliente. Com fonte.', { expr: 'pensativo' });
        await fsay(G, 'A decisão é sua. Eu só garanti que você ouviu os dois lados.', { anim: 'wave' });

        // O Jorge, desinflado com carinho, corrige o grupo (fala sentado; o corte para o plano
        // da mesa esconde o levantar — ele já aparece de pé atrás da poltrona, nunca dentro dela)
        await G.say('jorge', 'Sabe o que eu aprendi hoje, chefe? Vou perguntar antes de repassar. E vou corrigir o grupo. Com fonte!', { expr: 'amigavel' });
        await G.say('pai', 'Já está na frente de metade do grupo.', { expr: 'amigavel' });
        G.player.cine();
        j.lookAt(null);
        j.set({ anim: 'lookphone', expr: 'determinado' });
        j.at({ x: -0.25, z: 0.42, rot: 0.9 });
        await G.cam.shot('mesa', 0.9);
        const sai = bg(j.walk({ x: 1.8, z: 0.8 }, 1.15).then(() => j.walk('porta', 1.3)).then(() => { G.sfx('door'); j.remove(); }));
        await G.wait(1.6);
        G.sfx('notify');
        G.toast('Jorge → Empresários do Bairro: "Pessoal, conferi com o jurídico: a tal lei da semana de 4 dias NÃO existe. Nada no Diário Oficial. Antes de repassar, confiram!"', { icon: '👥', kind: 'notif', dur: 6 });
        await G.narrate('Pela primeira vez em três anos, o grupo dos Empresários do Bairro recebeu uma correção. Com fonte.');
        await sai;
        await G.think('pai', 'Hoje à noite eu conto para {oa} {filho}: a máquina comeu uma vírgula, e o Jorge corrigiu o grupo.', { expr: 'rindo' });
        fa(G, 'celebrate', 1.6);
        await G.lesson('Leis, números, datas, preços e citações: confira na fonte. É igual notícia de grupo de WhatsApp. E, para uma opinião honesta, não conte a sua antes: peça o argumento contra.', { titulo: 'Detector de lorota' });
        await G.fadeOut(0.8);
      },
    ],
    summary: (G) => {
      const s = (G.allStats() || {}).cap4 || {};
      const lines = [];
      if (s.acertos != null) lines.push('Detector de lorota: ' + s.acertos + ' de ' + (s.total || 10) + ' acertos, ' + (s.lorotasPegas || 0) + ' de ' + (s.lorotasTotal || N_LOROTAS) + ' lorotas pegas.');
      lines.push('A "lei nova" do grupo: não existe. Conferido com o Tadeu.');
      lines.push(s.contrapeso ? 'Pediu à IA o argumento contra a própria ideia.' : 'Fez a pergunta neutra; o advogado do diabo fica para a próxima.');
      return lines.map((l) => G.t(l));
    },
  });
})();
