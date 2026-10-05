/* PAI 2.0 — cap11.js — CAPÍTULO 11 "A Dúvida"
 * Meia-noite, sem sono (quarto) → sonho (arena) → chefão: a Dúvida, nuvem roxa
 * feita das objeções do próprio pai → vitória: ela vira a "dúvida saudável" →
 * quarta-feira, 6h47 (quarto). Batalha por turnos: para cada objeção, 3 respostas
 * (honesta com antídoto = acerto forte · vaga = arranha e a objeção volta ·
 * exagero = cura a Dúvida e custa 1 coração de Paciência). Sem game over.
 * Stats: cap11 {venceu, coracoes, coracoesMax, turnos} · conquista: diplomata.
 */
(function () {
  'use strict';
  const P2 = window.P2;

  // ------------------------------------------------------------------
  // Utilidades
  // ------------------------------------------------------------------
  const quiet = (p) => { if (p && p.catch) p.catch(() => {}); return p; };
  const DEITADO_EYE = { back: 1.5, h: 0.84 }; // onde o motor põe os olhos do pai deitado (stage3d)

  /** Primeira pessoa DEITADO: aponta a visão para um ponto do mundo.
   *  (O lookAt do motor mede a partir dos pés; aqui compensamos para os olhos no travesseiro.) */
  function olharDeitado(G, alvo) {
    const b = G.pai;
    const ex = b.x - Math.sin(b.rot) * DEITADO_EYE.back;
    const ez = b.z - Math.cos(b.rot) * DEITADO_EYE.back;
    const ey = b.y + DEITADO_EYE.h;
    const dx = alvo.x - ex, dz = alvo.z - ez, dy = (alvo.y == null ? 1 : alvo.y) - ey;
    const yaw = Math.atan2(dx, dz);
    const pitch = Math.max(-0.88, Math.min(0.88, Math.atan2(dy, Math.hypot(dx, dz))));
    G.player.lookAt({ x: b.x + Math.sin(yaw), y: b.y + 1.6 + Math.tan(pitch), z: b.z + Math.cos(yaw) });
  }

  // ------------------------------------------------------------------
  // A BATALHA — objeções do pai (a Dúvida fala; ele responde)
  //   h = honesta (admite o que é verdade + mostra o antídoto) · v = vaga · x = exagero
  // ------------------------------------------------------------------
  const PESO = 10;       // cada objeção vale 10 de vida da Dúvida
  const PESO_FINAL = 20; // a dúvida-mãe vale 20 (8 × 10 + 20 = 100)
  const VAGO = 3;        // resposta vaga só arranha
  const CURA = 6;        // exagero alimenta a Dúvida
  const TAGS = {
    h: { cls: 'mint', txt: '💬 Resposta honesta' },
    v: { cls: '', txt: '🌫️ Resposta vaga' },
    x: { cls: 'red', txt: '🎈 Exagero' },
  };

  const OBJ = [
    {
      id: 'modinha',
      ataque: 'Isso é modinha, {pai}. Modinha cara! Todo CEO gastando uma fortuna... e cadê o dinheiro voltando?',
      curta: 'É modinha cara. Cadê o retorno?',
      h: { txt: 'Em parte, é verdade: a maioria ainda não viu o dinheiro voltar. Por isso não compro milagre. Começo numa tarefa, meço por 30 dias e só amplio o que se pagar.', why: 'Você concordou com a parte verdadeira e respondeu com método: começar pequeno e medir. Isso desarma a Dúvida, e desarmaria qualquer conselho.' },
      v: { txt: 'Ah, mas todo mundo está usando. Não dá pra ficar de fora.', why: 'Medo de ficar para trás não é estratégia. Foi assim que muita empresa gastou antes de saber o que queria.' },
      x: { txt: 'Que nada! Em seis meses a IA paga a empresa inteira sozinha.', why: 'Promessa de milagre é tudo o que a Dúvida quer. Quando o milagre não vem, ela volta maior.' },
      fa: { h: 'Na mosca! Admitiu o que é verdade e trouxe um plano.', v: 'Hmm. Arranhou... mas essa vai voltar.', x: 'Ai, ai! Promessa de milagre é banquete pra ela.' },
    },
    {
      id: 'mentira',
      ataque: 'Ela inventa coisas! Com a maior cara de pau, com vírgula e tudo. Ou já esqueceu da multa de 10% que era de 20%?',
      curta: 'Ela inventa coisas.',
      h: { txt: 'Inventa, às vezes. Por isso eu peço o trecho e a página, pergunto o grau de certeza e confiro por outro caminho. Foi assim que eu peguei a multa.', why: 'Os 3 testes de conferência: trecho e página, grau de certeza, outro caminho. Estão no seu Guia do CEO (botão 📘), em “Como conferir”.' },
      v: { txt: 'Ah, mas gente também erra.', why: 'É verdade, mas não responde. A pergunta é outra: o que você FAZ quando ela erra?' },
      x: { txt: 'As versões novas não erram mais. Dá pra confiar de olho fechado.', why: 'Erram, sim, até resumindo um texto que você mesmo entregou. De olho fechado é o jeito mais rápido de assinar besteira.' },
      fa: { h: 'Isso! E ainda lembrou do meu vexame da multa. Justo.', v: 'Gente erra, eu erro... e aí? Faltou o “e aí”.', x: 'Ei! Eu erro, sim. Não me põe num pedestal, que eu caio.' },
    },
    {
      id: 'dados',
      ataque: 'E os seus dados? O contrato, a ata do conselho, o salário da diretoria... tudo vazando por aí!',
      curta: 'Os dados da empresa vão vazar.',
      h: { txt: 'Dado da empresa, só na ferramenta aprovada, no plano corporativo. Na conta pessoal, nada de cliente, ata ou salário. Senha e código, nunca, em lugar nenhum.', why: 'É o semáforo: verde para o que é público, amarelo só na ferramenta aprovada, vermelho nunca. Separar a conta pessoal da conta da empresa resolve boa parte do risco.' },
      v: { txt: 'Eu troco os nomes antes de colar. Aí fica seguro.', why: 'Trocar nome ajuda, mas não transforma segredo em coisa pública. Ata do conselho continua sendo ata do conselho: só na ferramenta aprovada.' },
      x: { txt: 'É tudo 100% seguro. Pode colar o que quiser.', why: 'Nada é 100% seguro. Conta gratuita pode guardar e até usar as suas conversas, e conversa apagada nem sempre some na hora.' },
      fa: { h: 'Semáforo perfeito. Verde, amarelo, vermelho. Dava um ótimo guarda de trânsito!', v: 'Quase! Trocar o nome não basta para ata do conselho.', x: 'Cem por cento? Nem cofre de banco promete isso!' },
    },
    {
      id: 'puxasaco',
      ataque: 'Ela só concorda com você! Puxa-saco de luxo. É só perguntar “tem certeza?” que ela muda de ideia.',
      curta: 'Ela só concorda comigo.',
      h: { txt: 'Tende a concordar, sim. Então eu não conto a minha opinião antes e peço o melhor argumento contra. Puxa-saco eu reconheço de longe: trinta anos de reunião.', why: 'Esconder a sua preferência e pedir o contra transforma a IA em sparring, não em espelho. No Guia: “Pergunte sem revelar a sua opinião”.' },
      v: { txt: 'Melhor assim. Pelo menos alguém concorda comigo.', why: 'Engraçado, mas perigoso: concordância fácil é o que faz uma decisão ruim parecer boa.' },
      x: { txt: 'Ela é imparcial. É máquina, não tem opinião.', why: 'Ela não tem interesse, mas tem tendência: aprendeu a agradar quem pergunta. Imparcial ela não é.' },
      fa: { h: 'Hahaha! Trinta anos de reunião: o melhor detector de puxa-saco do mercado.', v: 'Hum... eu concordo totalmente com você. Viu o problema?', x: 'Imparcial eu não sou. Eu puxo pro seu lado sem nem perceber.' },
    },
    {
      id: 'trabalho',
      ataque: 'Conferir tudo dá mais trabalho do que fazer! Você vai perder mais tempo do que ganhar.',
      curta: 'Conferir dá mais trabalho que fazer.',
      h: { txt: 'Às vezes dá. Por isso uso onde ela rende (rascunho, resumo, preparação) e meço o tempo contando a conferência. Onde não rende, faço eu mesmo.', why: 'Dentro da fronteira, ela acelera; fora dela, atrapalha. Medir com a conferência incluída é o teste honesto.' },
      v: { txt: 'Depois eu vejo isso com calma.', why: 'Adiar não responde. Medir uma tarefa por 30 dias responde.' },
      x: { txt: 'Que nada. Ela faz tudo e eu nem preciso ler.', why: 'Mandar sem ler é o que dá dor de cabeça. Quem assina, lê. Sempre.' },
      fa: { h: 'Isso! Nem tudo é pra mim, e tudo bem.', v: '“Depois”... é o lugar favorito da Dúvida.', x: 'Nem ler?! Aí quem assina sou eu. E eu nem tenho CPF.' },
    },
    {
      id: 'equipe',
      ataque: 'E a sua equipe? Vão rir pelas costas: “o chefe agora pede tudo pra máquina”. Cadê a autoridade, {pai}?',
      curta: 'A equipe vai achar que eu não sei fazer.',
      h: { txt: 'Autoridade é dar o exemplo. Uso com regra, conto o que ela erra e ensino o time a conferir. Quando o chefe apoia, a equipe adota melhor.', why: 'Líder que usa com método e fala dos limites dá permissão para a equipe aprender junto, em vez de usar escondido. É assim que começam as regras da casa.' },
      v: { txt: 'Ninguém precisa saber que eu uso.', why: 'Usar escondido é o que muita gente já faz, com medo de parecer substituível. Sem regra clara, cada um cola o que quiser onde quiser.' },
      x: { txt: 'Com IA eu nem preciso mais de diretor. Ela faz o trabalho de todos.', why: 'Além de falso, é o jeito mais rápido de perder a equipe. Julgamento e decisões sobre pessoas continuam humanos.' },
      fa: { h: 'Isso é liderança. A Bia ia gostar de ouvir.', v: 'Escondido? Aí cada um faz do seu jeito, e ninguém confere nada.', x: 'Opa! E sem a Bia, quem confere a minha conta de margem?' },
    },
    {
      id: 'emprego',
      ataque: 'E quando ela roubar o seu emprego? E o da Bia, do Rafael, da Sônia? Hein?',
      curta: 'Vai roubar empregos. Inclusive o meu.',
      h: { txt: 'Algumas tarefas vão mudar, sim, e a minha obrigação é preparar o time, não fingir que não. Mas julgamento, relação e assinatura continuam com gente.', why: 'Honestidade com a equipe vale mais que promessa. Teve empresa que trocou atendentes por IA e depois voltou atrás: ficou mais barato, mas pior.' },
      v: { txt: 'Ah, isso é coisa pra daqui a muitos anos.', why: 'Já mexe com tarefas hoje. Fingir que não é o jeito mais rápido de ser pego de surpresa.' },
      x: { txt: 'Ninguém vai perder nada. Só vai sobrar tempo livre pra todo mundo.', why: 'Promessa bonita, mas não é honesta. A equipe percebe, e passa a confiar menos em quem promete o que não pode garantir.' },
      fa: { h: 'Duro, mas justo. É assim que se fala com gente adulta.', v: 'Muitos anos? Ela já mexe com tarefa hoje, {pai}.', x: 'Ui. Essa promessa nem eu assinaria.' },
    },
    {
      id: 'velho',
      ataque: 'Admita, {pai}. Você está velho pra isso. Sempre fez tudo do seu jeito. Pra que mudar agora?',
      expr: 'rindo',
      curta: 'Velho demais pra isso.',
      h: { txt: 'Não vou mudar o meu jeito: vou levar o meu jeito pra ela. Ela rende mais nas mãos de quem sabe julgar a resposta. E julgar eu faço há trinta anos.', why: 'Experiência não é atraso: é o filtro. A IA ajuda mais quem sabe dizer “isso está errado”. Pegar o jeito leva algumas horas de prática, sem pressa.' },
      v: { txt: 'Talvez seja mesmo coisa pros mais novos.', why: 'Não é. Leva algumas horas de prática, no seu ritmo, e a sua experiência pesa a favor, não contra.' },
      x: { txt: 'Com ela eu nem preciso mais de experiência.', why: 'Ao contrário: sem experiência para julgar, a IA atrapalha mais do que ajuda. Os seus trinta anos são justamente a vantagem.' },
      fa: { h: '...Essa me arrepiou. E olha que eu nem tenho pele.', v: 'Ei. Não fala assim de quem pegou a multa errada num contrato de 80 páginas.', x: 'Precisa, sim! Sem você, eu sou só um estagiário rápido falando besteira com confiança.' },
    },
  ];
  const FINAL = {
    id: 'final',
    ataque: 'E SE DER ERRADO? Você confia, ela erra... e você passa vergonha na frente do conselho!',
    curta: 'E se der errado?',
    h: { txt: 'Vai dar errado às vezes: comigo, com ela, com qualquer diretor. O vexame não é usar IA, é assinar sem conferir. E sem conferir eu não assino nada.', why: 'É o que os vexames reais têm em comum: alguém assinou sem conferir. Quem confere, decide e assina corrige o erro antes que ele chegue ao conselho.' },
    v: { txt: 'Aí eu desligo e nunca mais uso.', why: 'Desistir no primeiro erro é deixar a Dúvida decidir por você. Erro pego na conferência vira aprendizado, não vexame.' },
    x: { txt: 'Não vai dar errado. Ela é perfeita, e eu confio de olho fechado.', why: 'É exatamente assim que acontecem os vexames de verdade: advogado multado, relatório devolvido. Em todos, alguém confiou de olho fechado.' },
    fa: { h: 'GOLPE FINAL!', v: 'Não desiste! Erro pego é erro que não chega ao conselho.', x: 'Nããão! Olho fechado é tudo o que ela queria!' },
  };
  const VOLTA = [
    'Voltei! Aquela resposta não me convenceu.',
    'Lembra de mim? Você não me respondeu direito.',
    'De novo eu! Resposta vaga não me derruba, {pai}.',
  ];
  const DICAS = [
    'Qual delas convence de verdade? Leia com calma: aqui não tem relógio.',
    'Pense no que você viu hoje. A resposta forte admite o limite e mostra o antídoto.',
    'Desconfie de resposta bonita demais. Exagero é comida pra ela.',
    'Qual você diria olhando nos olhos do conselho?',
  ];

  const CSS = `
  .c11 { gap: 12px; }
  .c11-obj { display: flex; gap: 12px; align-items: center; color: #fff; border-radius: 16px; padding: 12px 16px;
    background: linear-gradient(135deg, #2b1655 0%, #5a33a2 70%, #7a4ac0 100%); box-shadow: 0 8px 22px rgba(43, 22, 85, 0.28); }
  .c11-obj .mg-label { color: #dccbff; }
  .c11-cloud { flex: 0 0 auto; width: 2.3em; height: 2.3em; border-radius: 50%; display: grid; place-items: center;
    background: rgba(255, 255, 255, 0.15); font-size: 1.15em; }
  .c11-obj-tx { font-family: var(--head); font-weight: 800; font-size: 1.05em; line-height: 1.28; }
  .c11-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
  .c11-hearts { font-size: 0.9em; letter-spacing: 0.08em; white-space: nowrap; }
  .c11-cards { display: grid; gap: 10px; grid-template-columns: 1fr; }
  @media (min-width: 860px) { .c11-cards { grid-template-columns: repeat(3, 1fr); } }
  .mg-card.c11-ans { display: flex; gap: 10px; align-items: flex-start; min-height: 64px; padding: 12px 14px; }
  .c11-k { flex: 0 0 auto; width: 1.8em; height: 1.8em; display: grid; place-items: center; border-radius: 10px;
    background: #f0eafb; color: #5a2fa0; font-family: var(--head); font-weight: 800; }
  .c11-body { display: flex; flex-direction: column; gap: 6px; flex: 1 1 auto; min-width: 0; }
  .c11-tag { display: none; align-self: flex-start; }
  .c11-ans.rev .c11-tag { display: inline-block; }
  .c11-ans.rev:not(.ok):not(.bad) { opacity: 0.62; }
  .c11-ans.tried { opacity: 0.45; }
  .c11-ans.tried .c11-tag { display: inline-block; }
  .c11-fb-h { display: block; font-family: var(--head); font-weight: 800; margin-bottom: 3px; }
  .c11-fb { scroll-margin-bottom: 70px; }
  .c11 .mg-actions .btn { min-width: 9em; }
  `;

  // ------------------------------------------------------------------
  // Estado da batalha
  // ------------------------------------------------------------------
  function novoEstado() {
    const w = {};
    OBJ.forEach((o) => (w[o.id] = PESO));
    w.final = PESO_FINAL;
    return { w, hearts: 3, lost: 0, turnos: 0, tried: {}, metade: false, resolvidas: 0 };
  }
  const hpDe = (st) => Object.keys(st.w).reduce((s, k) => s + st.w[k], 0);
  function hud(G, st) {
    G.hud.set({
      boss: { name: 'A Dúvida', hp: hpDe(st), max: 100 },
      hearts: { value: st.hearts, max: 3, label: 'Paciência' },
      score: { label: 'Objeções vencidas', value: st.resolvidas + ' de ' + (OBJ.length + 1) },
    });
  }
  /** Aplica a resposta e devolve o efeito {tipo, dmg, cura}. */
  function aplicar(st, o, tipo) {
    st.turnos++;
    const ef = { tipo, dmg: 0, cura: 0 };
    if (tipo === 'h') { ef.dmg = st.w[o.id]; st.w[o.id] = 0; st.resolvidas++; }
    else if (tipo === 'v') { ef.dmg = Math.max(0, Math.min(VAGO, st.w[o.id] - 1)); st.w[o.id] -= ef.dmg; }
    else { ef.cura = CURA; st.w[o.id] += CURA; st.hearts = Math.max(0, st.hearts - 1); st.lost++; }
    (st.tried[o.id] = st.tried[o.id] || []).push(tipo);
    return ef;
  }
  /** Tamanho da nuvem e força da tempestade acompanham a vida da Dúvida. */
  function clima(G, st) {
    const k = Math.max(0, Math.min(1.2, hpDe(st) / 100));
    quiet(G.duvida.tween({ scale: 0.62 + 0.38 * k }, 0.9, 'out'));
    G.sceneParams({ intensity: Math.min(1, 0.35 + 0.6 * k) });
  }
  /** Reação 3D imediata (enquanto o jogador lê o porquê). */
  function reagir(G, st, ef, final) {
    const D = G.duvida;
    if (ef.tipo === 'h') {
      quiet(D.play('hurt', 0.7));
      G.sfx(final ? 'crit' : 'boss_hit');
      G.flash(final ? '#ffffff' : '#fff3c8', final ? 0.5 : 0.22);
      G.shake(final ? 5 : 2.4, final ? 0.9 : 0.45);
      G.fx.burst(D, 0, 0, '#ffe8a0', final ? 40 : 22);
      G.fx.float(D, '−' + ef.dmg, '#ffe066');
      quiet(G.faisca.play('celebrate', 1.6));
    } else if (ef.tipo === 'v') {
      quiet(D.play('hurt', 0.35));
      G.sfx('hit');
      if (ef.dmg) G.fx.float(D, '−' + ef.dmg, '#ffffff');
      quiet(G.faisca.play('doubt', 1.6));
    } else {
      quiet(D.play('heal', 1.3));
      G.sfx('boss_heal');
      setTimeout(() => G.sfx('heart_lose'), 260);
      G.fx.float(D, '+' + ef.cura, '#d9c2ff');
      G.fx.smoke(D, 0, 0, 8, '#5a2a9a');
      G.shake(1.2, 0.35);
      quiet(G.faisca.play('scared', 1.6));
    }
    hud(G, st);
    if (!final) clima(G, st);
  }

  // ------------------------------------------------------------------
  // Minigame: um turno da batalha (a mesa de trabalho do duelo)
  // ------------------------------------------------------------------
  function turnoUI(o, st, info) {
    return (root, done, api) => {
      const G = api.G;
      root.classList.add('c11');
      const cartas = api.shuffle(['h', 'v', 'x']).map((tipo) => ({ tipo, txt: o[tipo].txt, why: o[tipo].why }));
      const tentados = st.tried[o.id] || [];

      root.appendChild(api.el('div', 'c11-obj', [
        api.el('span', 'c11-cloud', '☁️'),
        api.el('div', null, [api.el('div', 'mg-label', info.kicker), api.el('div', 'c11-obj-tx', '“' + api.t(o.curta) + '”')]),
      ]));
      const coracoes = () => '❤️'.repeat(st.hearts) + '🤍'.repeat(Math.max(0, 3 - st.hearts));
      const hearts = api.el('span', 'c11-hearts', 'Paciência ' + coracoes());
      root.appendChild(api.el('div', 'c11-row', [api.el('span', 'mg-label', 'Sua resposta: toque ou tecle 1, 2 ou 3'), hearts]));

      const grid = api.el('div', 'c11-cards');
      root.appendChild(grid);
      const fb = api.el('div', 'mg-feedback c11-fb');
      fb.hidden = true;
      root.appendChild(fb);
      const actions = api.el('div', 'mg-actions');
      root.appendChild(actions);

      let locked = false;
      const btns = cartas.map((c, i) => {
        const b = api.el('button', 'mg-card c11-ans');
        b.type = 'button';
        b.dataset.key = String(i + 1);
        const tag = api.el('span', 'mg-badge c11-tag ' + TAGS[c.tipo].cls, TAGS[c.tipo].txt);
        b.appendChild(api.el('span', 'c11-k', String(i + 1)));
        b.appendChild(api.el('span', 'c11-body', [api.el('span', null, api.t(c.txt)), tag]));
        if (c.tipo !== 'h' && tentados.indexOf(c.tipo) >= 0) {
          b.disabled = true;
          b.classList.add('tried');
          tag.textContent = TAGS[c.tipo].txt + ' · já tentou';
        }
        b.addEventListener('click', (e) => { e.stopPropagation(); escolher(c, b); });
        grid.appendChild(b);
        return { b, c };
      });

      function escolher(c, b) {
        if (locked) return;
        locked = true;
        const ef = aplicar(st, o, c.tipo);
        btns.forEach((x) => {
          x.b.disabled = true;
          x.b.classList.add('rev');
          x.b.classList.remove('tried');
        });
        b.classList.add(c.tipo === 'h' ? 'ok' : 'bad');
        reagir(G, st, ef, info.final);
        hearts.textContent = 'Paciência ' + coracoes();
        const head = c.tipo === 'h'
          ? (info.final ? '💥 Golpe final! −' + ef.dmg : '💥 Acerto em cheio! −' + ef.dmg)
          : c.tipo === 'v'
            ? '🌫️ Só arranhou' + (ef.dmg ? ' (−' + ef.dmg + ')' : '') + '. Essa objeção vai voltar.'
            : '🎈 O exagero alimentou a Dúvida (+' + ef.cura + ') e custou 1 coração.';
        fb.className = 'mg-feedback c11-fb ' + (c.tipo === 'h' ? 'ok' : c.tipo === 'v' ? 'warn' : 'bad');
        fb.innerHTML = '';
        fb.appendChild(api.el('b', 'c11-fb-h', head));
        fb.appendChild(api.el('span', null, api.t(c.why)));
        fb.hidden = false;
        api.say(o.fa[c.tipo], 'faisca');
        const cont = api.btn(c.tipo === 'h' && info.final ? 'Ver a Dúvida cair ▶' : 'Continuar ▶', () => done({ tipo: c.tipo, ef }), { cls: 'primary' });
        actions.appendChild(cont);
        api.timeout(() => {
          try { cont.focus({ preventScroll: true }); } catch (e) { /* nada */ }
          try { actions.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { /* nada */ }
        }, 60);
      }
    };
  }

  /** Um turno completo: ataque (fala da Dúvida) → resposta (mini) → paciência. */
  async function turno(G, st, o, info) {
    const D = G.duvida;
    G.player.lookAt(D);
    G.sfx(info.final ? 'thunder' : 'boss_roar');
    quiet(D.play('attack', 0.9));
    G.shake(info.final ? 3.5 : 1.6, 0.5);
    await G.say('duvida', info.volta ? info.volta : o.ataque, { expr: o.expr || 'bravo' });
    D.setExpr('bravo');
    const r = await G.mini(turnoUI(o, st, info), {
      title: info.titulo,
      intro: info.dica,
      introWho: 'faisca',
    });
    if (st.hearts <= 0) await respira(G, st);
    return r;
  }

  /** Paciência zerada: sem game over — a Faísca ajuda a respirar e devolve 1 coração. */
  async function respira(G, st) {
    G.tint('#1a0f3a', 0.25);
    G.sceneParams({ intensity: 0.2 });
    await G.say('faisca', 'Ei, {pai}. Para um pouquinho. Respira.', { anim: 'listen' });
    await G.say('faisca', 'Exagero não convence ninguém: nem a Dúvida, nem o conselho, nem {oa} {filho}.');
    st.hearts = 1;
    G.sfx('heal');
    G.fx.hearts(G.faisca);
    G.tint(null);
    hud(G, st);
    G.faisca.setAnim('idle');
    await G.say('faisca', 'Pronto: um coração de volta. Responde do seu jeito, com o que você viu hoje.', { anim: 'celebrate' });
    G.faisca.setAnim('idle');
    clima(G, st);
  }

  // ------------------------------------------------------------------
  // CAPÍTULO
  // ------------------------------------------------------------------
  P2.chapter({
    id: 'cap11',
    num: 'Capítulo 11',
    title: 'A Dúvida',
    subtitle: 'Meia-noite. O corpo cansado. A cabeça, não.',
    music: 'sonho',
    minutes: 9,
    parts: [
      // ================================================================
      // PARTE 1 — Meia-noite e doze (quarto)
      // ================================================================
      async (G) => {
        P2.ui.css('cap11', CSS);
        await G.titleCard();
        G.scene('quarto', { time: 'noite', clock: '00:12', lamp: false, phoneLit: false });
        G.pai.at('cama');
        G.pai.setAnim('sleep');
        G.faisca.at('faisca');
        G.faisca.setAnim('sleep');
        G.music('sonho');
        // Plano de abertura: a casa dorme; ele, não.
        G.talkCam(false);
        G.player.cine();
        await G.cam.shot('geral', 0);
        await G.fadeIn(1.4);
        quiet(G.cam.shot('cama', 4.5));
        await G.narrate('Meia-noite e doze. A casa inteira dorme.');
        await G.narrate('Quase inteira.');
        // Primeira pessoa: deitado, olhando o teto
        await G.fadeOut(0.35);
        G.player.fp();
        G.player.setLook(0.75, G.pai.rot);
        olharDeitado(G, { x: G.pai.x, y: 2.6, z: G.pai.z + 0.4 });
        await G.fadeIn(0.6);
        await G.think('pai', 'O corpo apagou às onze. A cabeça, não.');
        await G.think('pai', 'Contrato de 80 páginas. Reunião sem fim. Uma conta errada. E uma Bia que não era a Bia.');
        await G.think('pai', 'Foi um dia e tanto. E a Faísca ajudou. Ajudou de verdade.');
        await G.think('pai', 'Então por que é que eu não durmo?', { expr: 'preocupado' });

        // A Faísca "acorda" (modo economia)
        G.sfx('pop');
        G.faisca.setAnim('idle');
        await G.faisca.tween({ x: -0.86, y: 1.12, z: -0.95 }, 0.8, 'out');
        olharDeitado(G, { x: -0.86, y: 1.18, z: -0.95 });
        G.faisca.face({ x: -0.38, z: -1.62 });
        G.faisca.emote('?');
        await G.say('faisca', 'Psst. {pai}? Tá acordado?');
        await G.say('pai', 'Não. Tô ensaiando pra quando eu dormir.', { expr: 'cansado' });
        await G.say('faisca', 'Eu não durmo de verdade, tá? Só fico quietinha, economizando bateria. Quer conversar?');
        await G.say('pai', 'Quero não pensar. Você sabe fazer isso?');
        await G.say('faisca', 'Isso nem eu sei. Mas posso ficar quietinha junto.', { anim: 'sad' });
        G.faisca.setAnim('idle');

        const c = await G.choose([
          { text: 'Levantar e dar uma volta pelo quarto', value: 'levantar', sub: 'Às vezes a cabeça só desliga depois que o corpo anda.' },
          { text: 'Contar carneirinhos', value: 'carneiros', sub: 'Método tradicional. Trinta anos de uso.' },
        ], { prompt: 'Sem sono. E agora?' });
        if (c === 'carneiros') {
          await G.say('pai', 'Um carneiro... dois carneiros... uma cláusula de multa... três carneiros... um reajuste pelo IGP-M...', { expr: 'cansado' });
          await G.say('faisca', 'Seus carneiros vêm com cláusula de reajuste? Acho que o método precisa de atualização.', { anim: 'doubt' });
          await G.say('pai', 'Desisto. Vou levantar.');
        } else {
          await G.say('faisca', 'Boa. E de pijama ninguém te cobra relatório.', { anim: 'jump' });
        }
        G.faisca.setAnim('idle');

        // De pé, com o abajur aceso
        await G.fadeOut(0.4);
        G.pai.at('lado_cama');
        G.pai.setAnim('idle');
        G.sceneParams({ lamp: true, clock: '00:14' });
        G.sfx('tick');
        G.faisca.follow(G.pai);
        G.talkCam(true);
        G.player.lookAt({ x: -2.4, y: 1.4, z: 0.3 });
        await G.fadeIn(0.5);

        let vistos = 0;
        await G.explore({
          objetivo: 'Sem sono. Dê uma volta pelo quarto e, quando quiser, volte para a cama.',
          hotspots: [
            {
              id: 'janela', label: 'Olhar pela janela', icon: '🌃', at: 'janela', y: 1.5, optional: true,
              onInteract: async (G) => {
                vistos++;
                await G.think('pai', 'Lá fora, a cidade não para. Metade dessas janelas acesas é gente respondendo e-mail.');
                await G.think('pai', 'Daqui a cinco anos, quantas dessas mesas ainda vão ter gente?', { expr: 'preocupado' });
              },
            },
            {
              id: 'foto', label: 'Foto da formatura', icon: '🖼️', pos: { x: -0.3, y: 1.12, z: 1.9 }, optional: true,
              onInteract: async (G) => {
                vistos++;
                await G.think('pai', 'A formatura {doda} {filho}. Fui eu que {oa} ensinei a andar de bicicleta.');
                await G.say('pai', 'E agora {eleela} quer me ensinar a conversar com um cubo laranja.', { expr: 'pensativo' });
                await G.say('faisca', 'Coral. Cubo CORAL. E com muito orgulho.', { anim: 'jump' });
                G.faisca.setAnim('idle');
                await G.think('pai', 'Será que eu ainda tenho idade pra aprender coisa nova?');
              },
            },
            {
              id: 'pasta', label: 'A pasta do trabalho', icon: '💼', pos: { x: -1.5, y: 0.62, z: 1.62 }, optional: true,
              onInteract: async (G) => {
                vistos++;
                await G.think('pai', 'A pauta do conselho. Item 4: “IA na empresa: a posição do CEO”.');
                await G.think('pai', 'A Dona Marta não esquece nada. E eu vou dizer o quê? “Usei um dia e gostei”?', { expr: 'preocupado' });
                await G.say('faisca', 'Isso a gente prepara junto. De dia. Com café.', { anim: 'teach' });
                G.faisca.setAnim('idle');
              },
            },
            {
              id: 'relogio', label: 'Despertador', icon: '⏰', pos: { x: -1.12, y: 0.78, z: -1.8 }, optional: true,
              onInteract: async (G) => {
                vistos++;
                G.sceneParams({ clock: '00:19' });
                await G.think('pai', '00:19. Se eu dormir agora, são seis horas e meia de sono. Seis e vinte e oito, na verdade.');
                await G.say('faisca', 'Eu até faria essa conta... mas depois de hoje, melhor conferir na calculadora.', { anim: 'ashamed' });
                G.faisca.setAnim('idle');
              },
            },
            { id: 'cama', label: 'Voltar para a cama', icon: '🛏️', at: 'cama', y: 0.95 },
          ],
        });
        G.v.explorou = vistos;

        // De volta para a cama
        await G.fadeOut(0.45);
        G.faisca.unfollow();
        G.faisca.at('faisca');
        G.faisca.setAnim('sleep');
        G.pai.at('cama');
        G.pai.setAnim('sleep');
        G.sceneParams({ lamp: false, clock: '00:23' });
        G.sfx('tick');
        G.talkCam(false);
        G.player.setLook(0.7, G.pai.rot);
        olharDeitado(G, { x: G.pai.x, y: 2.6, z: G.pai.z + 0.5 });
        await G.fadeIn(0.6);
        await G.say('faisca', 'Boa noite, {pai}. Modo economia ligado.');
        await G.say('pai', 'Boa noite, Faísca. Pelo dia de hoje... obrigado. Mas não se acostuma.', { expr: 'cansado' });
        await G.think('pai', 'Fecha o olho. É só uma tecnologia nova. Não é nenhum bicho de sete cabeças.');
        // ...o sonho começa
        G.sfx('thunder');
        G.flash('#7a4ac0', 0.6);
        G.shake(2, 0.8);
        await G.think('pai', '...Ou é?', { expr: 'preocupado' });
        G.sfx('whoosh');
        await G.fadeOut(1.4, '#1a0b38');
      },

      // ================================================================
      // PARTE 2 — O sonho: a Dúvida aparece (arena)
      // ================================================================
      async (G) => {
        P2.ui.css('cap11', CSS);
        G.scene('arena', { intensity: 0.3, calm: 0 });
        G.pai.at('pai');
        G.pai.setAnim('idle');
        G.pai.setExpr('desconfiado');
        G.music('sonho');
        G.talkCam(false);
        G.player.cine();
        await G.cam.shot('ilha', 0);
        await G.fadeIn(1.4);
        quiet(G.cam.shot('geral', 5));
        await G.narrate('Em sonho, a gente vai parar em cada lugar...');
        await G.narrate('Uma ilha flutuando num céu roxo. E ele de terno. Até sonhando, CEO.');

        // A Faísca chega
        await G.cam.shot('herois', 1.4);
        G.faisca.at('faisca');
        G.faisca.face(G.pai, true);
        G.faisca.setAnim('enter');
        G.fx.sparkles(G.faisca);
        G.sfx('magic');
        await G.wait(1.1);
        G.faisca.setAnim('idle');
        await G.say('faisca', 'Uau. Seu sonho tem orçamento de efeito especial de cinema!', { anim: 'spin' });
        G.faisca.setAnim('idle');
        await G.say('pai', 'Faísca? Você também sonha?', { expr: 'surpreso' });
        await G.say('faisca', 'Não. Eu sou a sua cabeça imaginando que eu estou aqui. Mas vim com prazer.');

        // A revelação
        G.sceneParams({ intensity: 1 });
        G.sfx('thunder');
        G.flash('#c9a8ff', 0.45);
        G.shake(3, 0.9);
        G.music('chefao');
        const D = G.duvida;
        D.at('boss');
        D.setExpr('bravo');
        D.set({ scale: 0.3, alpha: 0 });
        G.pai.face(D);
        G.faisca.face(D);
        await G.cam.shot('baixo', 1.1);
        quiet(D.fadeIn(1.2));
        G.sfx('boss_roar');
        await D.tween({ scale: 1 }, 1.8, 'back');
        G.shake(2.5, 0.6);
        await G.say('duvida', 'Ora, ora. O CEO que confere tudo.', { expr: 'rindo' });
        await G.say('duvida', 'Eu sou a Dúvida. Sou feita de tudo o que você pensou hoje e não disse em voz alta.', { expr: 'bravo' });
        await G.cam.shot('confronto', 1.2);
        await G.say('pai', 'Já encarei auditoria, sócio brigado e três planos econômicos. Não é uma nuvem que vai me tirar o sono.', { expr: 'determinado' });
        await G.say('duvida', 'Já tirei, querido. Você está aqui, não está?', { expr: 'rindo' });
        await G.cam.focus(G.faisca, 'medio', { side: -1, dur: 0.9 });
        await G.say('faisca', 'Ela vai atacar com as suas próprias objeções. As de verdade, as que passaram pela sua cabeça hoje.', { anim: 'teach' });
        await G.say('faisca', 'E você responde com o que viu ao longo do dia. Honestidade com prova acerta em cheio.');
        G.faisca.setAnim('idle');
        quiet(D.play('heal', 1.4));
        G.sfx('boss_heal');
        await G.cam.shot('boss', 0.9);
        await G.say('duvida', 'E exagero me alimenta! Pode exagerar à vontade, {pai}. Eu adoro.', { expr: 'rindo' });
        await G.card({
          kind: 'guide', kicker: 'Como vencer a Dúvida', icon: '⚔️',
          titulo: 'Responda como um bom CEO responde ao conselho',
          texto: '- *Resposta honesta:* admite o que é verdade e mostra o que você faz a respeito. Acerta em cheio.\n- *Resposta vaga:* só arranha. E a objeção volta depois.\n- *Exagero* (“ela nunca erra!”): alimenta a Dúvida e custa 1 coração de Paciência.\n\nSem pressa e sem game over: se a paciência acabar, a gente respira e continua.',
          botao: 'Vamos nessa ▶',
        });
      },

      // ================================================================
      // PARTE 3 — A batalha (arena, primeira pessoa)
      // ================================================================
      async (G) => {
        P2.ui.css('cap11', CSS);
        G.scene('arena', { intensity: 0.95, calm: 0 });
        G.pai.at('pai');
        G.pai.setAnim('idle');
        G.faisca.follow(G.pai);
        const D = G.duvida;
        D.at('boss');
        D.setExpr('bravo');
        G.music('chefao');
        G.player.fp();
        G.player.lookAt(D);
        const st = novoEstado();
        hud(G, st);
        await G.fadeIn(0.6);
        await G.say('duvida', 'Vamos lá, {pai}. Uma de cada vez. E não vale responder “depois eu vejo”.', { expr: 'rindo' });

        // 1ª rodada: as 8 objeções, em ordem (do leve ao pessoal)
        let n = 0;
        for (const o of OBJ) {
          n++;
          await turno(G, st, o, { titulo: '⚔️ Objeção ' + n + ' de ' + OBJ.length, kicker: 'A Dúvida diz', dica: DICAS[(n - 1) % DICAS.length] });
          if (!st.metade && hpDe(st) <= 55) {
            st.metade = true;
            G.duvida.setExpr('surpreso');
            await G.say('duvida', 'Ai! Para de responder direito, que isso dói!', { expr: 'surpreso' });
            G.duvida.setExpr('bravo');
          }
        }
        // As mal respondidas voltam (vaga ou exagero não derrubam objeção)
        let voltas = 0;
        const fila = OBJ.filter((o) => st.w[o.id] > 0);
        if (fila.length) {
          await G.say('faisca', 'Viu? Resposta fraca não derruba nada. Ela vai trazer de volta as que ficaram de pé.', { anim: 'teach' });
          G.faisca.setAnim('idle');
        }
        while (fila.length) {
          const o = fila.shift();
          await turno(G, st, o, {
            titulo: '⚔️ Ela voltou: objeção mal respondida',
            kicker: 'A Dúvida insiste',
            volta: VOLTA[voltas++ % VOLTA.length] + ' “' + o.curta + '”',
            dica: 'Dica: o que você já tentou ficou apagado. A resposta forte admite o limite e mostra o antídoto.',
          });
          if (st.w[o.id] > 0) fila.push(o);
        }

        // A dúvida-mãe
        G.sceneParams({ intensity: 1 });
        quiet(D.tween({ scale: 1.08 }, 1.2, 'out'));
        G.sfx('boss_roar');
        G.shake(4, 1);
        G.flash('#7a4ac0', 0.4);
        await G.say('duvida', 'Chega de detalhe! Agora eu junto tudo numa pergunta só.', { expr: 'bravo' });
        let r = null;
        let tentativa = 0;
        while (!r || r.tipo !== 'h') {
          tentativa++;
          r = await turno(G, st, FINAL, {
            final: true,
            titulo: tentativa === 1 ? '⚔️ A dúvida-mãe' : '⚔️ A dúvida-mãe (de novo)',
            kicker: 'A pergunta que sobrou',
            volta: tentativa > 1 ? 'Não me convenceu! E SE DER ERRADO, {pai}?' : null,
            dica: tentativa === 1 ? 'Essa é a dúvida-mãe. Responde com o seu método, não com promessa.' : 'Sem pressa. Qual resposta você daria olhando nos olhos do conselho?',
          });
        }

        // ---------------- Vitória
        G.hud.set({ boss: { hp: 0 } });
        D.setAnim('defeated');
        D.setExpr('surpreso');
        G.sfx('boss_hit');
        G.flash('#ffffff', 0.8);
        G.shake(5, 1.2);
        G.stats({ venceu: true, coracoes: st.hearts, coracoesMax: 3, turnos: st.turnos });
        G.v.coracoes = st.hearts;
        G.v.perdidos = st.lost;
        G.v.turnos = st.turnos;
        await G.wait(1.4);
        G.hud.clear();
        G.music('sonho');
        G.sceneParams({ calm: 1, intensity: 0 });
        G.talkCam(false);
        G.player.cine();
        await G.letterbox(true);
        await G.cam.shot('amanhecer', 2.6);
        await G.narrate('A tempestade foi baixando. E o céu do sonho, devagar, amanheceu.');
        // A nuvem gigante encolhe até virar uma dúvida pequenininha
        G.fx.sparkles(D, 0, 0, 30, '#e6d4ff');
        G.sfx('magic');
        D.setAnim('small');
        D.set({ scale: 1, alpha: 1 });
        D.setExpr('amigavel');
        const px = G.pai.x, pz = G.pai.z;
        const dx = D.x - px, dz = D.z - pz, dl = Math.hypot(dx, dz) || 1;
        // 1,35 m à frente do pai, um pouco à esquerda (a Faísca fica à direita)
        const tx = px + (dx / dl) * 1.35 + (-dz / dl) * -0.25;
        const tz = pz + (dz / dl) * 1.35 + (dx / dl) * -0.25;
        await G.cam.shot({ target: [(px + D.x) / 2, 1.3, (pz + D.z) / 2], yaw: 0.55, pitch: 0.1, dist: 6.2, fov: 40 }, 1.2);
        await D.tween({ x: tx, z: tz }, 2.4, 'inOut');
        D.face(G.pai, true);
        await G.letterbox(false);
        G.player.fp();
        G.player.lookAt({ x: tx, y: 1.3, z: tz });
        await G.wait(0.5);
        await G.say('duvida', 'Tá bom, tá bom. Você venceu.', { expr: 'amigavel' });
        await G.say('pai', 'Então pode ir embora.', { expr: 'desconfiado' });
        await G.say('duvida', 'Ah, isso não. Eu não vou embora.', { expr: 'amigavel' });
        await G.say('duvida', 'Eu sou o que faz você conferir.', { expr: 'amigavel' });
        await G.say('faisca', 'Ela tem razão, {pai}. Sem ela, você ia confiar em mim de olho fechado. E eu erro.', { anim: 'ashamed' });
        G.faisca.setAnim('idle');
        await G.say('pai', 'Então fica. Mas no seu tamanho.', { expr: 'orgulhoso' });
        await G.say('duvida', 'Combinado. Na hora de assinar, eu dou um cutucão.', { expr: 'amigavel' });
        G.sfx('sparkle');
        G.fx.hearts(G.faisca);
        quiet(G.faisca.play('celebrate', 2));
        if (st.lost === 0) G.achieve('diplomata');
        await G.wait(1.2);
        G.sfx('whoosh');
        await G.fadeOut(1.4, '#fff6ea');
      },

      // ================================================================
      // PARTE 4 — Quarta-feira, 6h47 (quarto) + fato + lição
      // ================================================================
      async (G) => {
        P2.ui.css('cap11', CSS);
        G.scene('quarto', { time: 'amanhecer', clock: '06:47', alarm: true, lamp: false, phoneLit: false });
        G.pai.at('cama');
        G.pai.setAnim('sleep');
        G.faisca.at('faisca');
        G.faisca.setAnim('sleep');
        const D = G.duvida;
        D.at({ x: -1.02, z: -1.62 });
        D.setAnim('small');
        D.set({ scale: 0.62 });
        D.setExpr('amigavel');
        D.face({ x: -0.38, z: -1.62 }, true);
        G.music(null);
        G.talkCam(false);
        G.player.fp();
        G.player.setLook(0.6, G.pai.rot);
        olharDeitado(G, { x: G.pai.x, y: 2.4, z: G.pai.z + 1 });
        const alarme = G.sfx('alarm', { loop: true });
        await G.fadeIn(1.2);
        await G.narrate('Quarta-feira, 6h47.');
        olharDeitado(G, { x: -1.08, y: 0.68, z: -1.75 });
        await G.think('pai', 'Dormi. Dormi mesmo.');
        if (alarme) alarme.stop();
        G.sceneParams({ alarm: false });
        G.sfx('tick');
        G.music('final');
        await G.wait(0.4);
        await G.say('duvida', 'Bom dia! Só passando pra lembrar: confere antes de assinar.', { expr: 'amigavel' });
        await G.think('pai', '...Eu ainda estou sonhando?', { expr: 'surpreso' });
        // A Faísca acorda
        G.faisca.setAnim('idle');
        G.sfx('pop');
        await G.faisca.tween({ x: -0.86, y: 1.12, z: -0.95 }, 0.7, 'out');
        G.faisca.face({ x: -0.38, z: -1.62 });
        olharDeitado(G, { x: -0.9, y: 1.05, z: -1.2 });
        await G.say('faisca', 'Bom dia, {pai}! Dormiu?', { anim: 'wave' });
        G.faisca.setAnim('idle');
        await G.say('pai', 'Sonhei que briguei com uma nuvem roxa.', { expr: 'pensativo' });
        await G.say('faisca', 'E aí? Ganhou?', { anim: 'jump' });
        G.faisca.setAnim('idle');
        await G.say('pai', 'Ganhei. Mas ela ficou.', { expr: 'feliz' });
        await G.say('faisca', 'Eu sei. Ela é das boas.', { anim: 'celebrate' });
        G.faisca.setAnim('idle');

        // Na janela: o dia começa
        await G.fadeOut(0.45);
        G.pai.at('janela');
        G.pai.setAnim('idle');
        G.faisca.follow(G.pai);
        D.remove();
        G.talkCam(true);
        G.player.lookAt({ x: -2.6, y: 1.5, z: -0.2 });
        await G.fadeIn(0.6);
        await G.think('pai', 'Daqui a pouco, no café, {oa} {filho} vai me perguntar: “E aí, serve ou não serve?”');
        await G.think('pai', 'Acho que eu já sei a resposta. Mas vou responder do meu jeito.', { expr: 'determinado' });
        await G.say('faisca', 'Aliás, a Dúvida jogou na sua cara que muita empresa gasta e não vê retorno. Ela não estava errada.', { anim: 'teach' });
        await G.say('faisca', 'Olha os números. E repara no que faz diferença.');
        G.faisca.setAnim('idle');
        await G.fact(['pwc_ceo_2026_retorno', 'bcg_lideres_vs_linha_de_frente'], {
          titulo: 'A Dúvida tinha um pouco de razão',
          texto: 'O retorno ainda não chegou para a maioria. E o exemplo de quem lidera muda o jeito como a equipe usa.',
        });
        await G.lesson('Dúvida boa não paralisa: ela faz você conferir.\nPara cada objeção, uma resposta honesta: admita o limite e mostre o antídoto. Exagero não convence ninguém.', { titulo: 'A dúvida saudável' });
      },
    ],
    summary: (G) => {
      const v = G.v || {};
      const st = (G.allStats().cap11) || {};
      const cor = v.coracoes != null ? v.coracoes : st.coracoes;
      const turnos = v.turnos != null ? v.turnos : st.turnos;
      const out = ['A Dúvida virou dúvida saudável (e ficou com você, no tamanho dela)'];
      if (cor != null) out.push('Paciência no fim: ' + cor + ' de 3 corações' + (v.perdidos ? ' · ' + v.perdidos + ' perdido(s) com exagero' : ' · nenhum perdido'));
      if (turnos != null) out.push('Respostas dadas: ' + turnos + ' (8 objeções + a dúvida-mãe)');
      out.push('Método: admitir o limite, mostrar o antídoto, sem exagero');
      return out;
    },
  });
})();
