// DEV TEST CHAPTER (temporário — será substituído pelo prólogo real)
(function(){
const P2 = window.P2;
P2.chapter({
  id: 'prologo', num: 'Prólogo', title: 'Terça-feira, 6h47', subtitle: 'Teste do motor 3D', music: 'manha', minutes: 6,
  parts: [
    async (G) => {
      await G.titleCard();
      G.scene('escritorio', {time:'dia', screen:'chat', papers: 0.9});
      G.pai.at('mesa');
      G.pai.setAnim('idle');
      G.filho.at('visita1');
      G.filho.face(G.pai);
      G.pai.face(G.filho);
      G.faisca.follow(G.pai);
      await G.fadeIn();
      await G.cutscene(async () => {
        await G.say('narrador', 'Uma terça-feira qualquer. *Muito* cedo.');
        G.pai.emote('sweat');
        await G.say('pai', 'Bom dia, {filho}. Cadê o café?', {expr:'cansado'});
        await G.say('filho', 'Bom dia, {apelido}! Olha só isso aqui.', {expr: 'feliz'});
        await G.say('pai', 'Hum. Sei não...', {expr: 'desconfiado'});
      });
      G.toast('47 e-mails não lidos', {icon:'📧', kind:'email'});
      G.hud.set({clock:'06:47', rep:{value:60, max:100}});
      const v = await G.choose([{text:'Aceitar o trato', value:'sim', sub:'Um dia inteiro com ela'}, {text:'Recusar', value:'nao'}, 'Talvez'], {prompt:'O que você faz?', who:'pai'});
      G.v.escolha = v;
      G.faisca.setAnim('enter');
      G.fx.sparkles(G.faisca);
      await G.say('faisca', 'Oi! Eu sou a Faísca. Sou tipo um estagiário muito rápido que às vezes fala besteira com confiança.');
      G.faisca.setAnim('idle');
      await G.say('pai', 'Interessante.', {expr: 'pensativo'});
    },
    async (G) => {
      G.scene('escritorio', {time:'tarde', screen:'doc', papers: 0.3});
      G.pai.at('mesa').setAnim('type');
      G.faisca.follow(G.pai);
      await G.fadeIn();
      await G.aiChat([{from:'voce', text:'Resuma este contrato em 5 tópicos e me diga a página de cada risco.'}, {from:'ia', text:'Claro! Aqui vai:\n- Vigência de *24 meses* (p. 3)\n- Multa rescisória de 20% (p. 11)\n- Reajuste anual pelo IPCA (p. 7)'}, {from:'nota', text:'Confira cada página citada no PDF original.'}]);
      const r = await G.mini((root, done, api) => {
        api.say('Escolha uma peça:', 'faisca');
        const grid = api.el('div', 'mg-grid');
        ['Contexto bom', 'Contexto vago', 'Contexto ruim'].forEach((t, i) => grid.appendChild(api.btn(t, () => done(i), {key: String(i+1)})));
        root.appendChild(grid);
        root.appendChild(api.meter(40, 'Qualidade'));
      }, {title: 'Monte o Pedido'});
      G.stats({teste: r});
      G.faisca.setAnim('celebrate');
      G.fx.confetti(G.pai);
      await G.fact({titulo:'Teste de fato', texto:'Um fato *real* de teste.', fonte:'Fonte X (2023)', url:'https://example.com'});
      await G.lesson('Você já sabe usar IA: é igual explicar serviço pra um diretor novo.');
      G.achieve('mestre_pedido');
      await G.say('pai', 'Fim do teste.', {expr:'feliz'});
    }
  ],
  summary: (G) => ['Escolha: ' + G.v.escolha],
});
})();
