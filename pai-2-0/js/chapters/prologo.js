// DEV TEST CHAPTER (temporário — será substituído pelo prólogo real)
(function(){
const P2 = window.P2;
P2.chapter({
  id: 'prologo', num: 'Prólogo', title: 'Terça-feira, 6h47', subtitle: 'Teste do motor 3D em primeira pessoa', music: 'manha', minutes: 6,
  parts: [
    async (G) => {
      await G.titleCard();
      G.scene('quarto', {});
      G.pai.at('centro');
      G.filho.at('lado_cama');
      G.faisca.follow(G.pai);
      G.player.fp();
      await G.fadeIn();
      await G.say('narrador', 'Uma terça-feira qualquer. *Muito* cedo.');
      await G.say('filho', 'Bom dia, {apelido}! Vem cá, quero te mostrar uma coisa.', {expr:'feliz'});
      const id = await G.explore({
        objetivo: 'Pegue um café e fale com {filho}',
        hotspots: [
          { id: 'cafe', label: 'Pegar café', icon: '☕', at: 'janela', optional: true, onInteract: async (G) => { await G.say('pai', 'Café primeiro. Sempre.', {expr:'cansado'}); } },
          { id: 'filho', label: 'Falar com {filho}', actor: 'filho' },
        ],
      });
      await G.say('pai', 'Fala, {filho}. O que é?', {expr: 'desconfiado'});
      await G.say('faisca', 'Oi! Eu sou a Faísca. Sou tipo um estagiário muito rápido que às vezes fala besteira com confiança.');
      G.v.escolha = id;
    },
  ],
  summary: (G) => ['Teste: ' + G.v.escolha],
});
})();
