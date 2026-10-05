# Pai 2.0 — um dia de CEO com a IA

Aventura narrativa em **3D, em primeira pessoa**, em português do Brasil. É um presente
de um filho ou filha para o pai: um CEO experiente e cético, que passa um dia inteiro
com a Faísca, uma assistente de IA, e decide no fim se ela serve ou não.

O jogo quer convencer **com honestidade**. Mostra onde a IA ajuda de verdade, onde ela
erra e como usar com segurança, e ensina o método que funciona para quem manda:
**eu confiro, eu decido, eu assino**. Toda estatística aparece com a fonte, o selo de
quem fez a pesquisa e o tamanho da amostra. Duração: 60 a 90 minutos, em capítulos
curtos, com salvamento automático.

## Como jogar

1. Abra `index.html` no navegador, no computador, tablet ou celular. Não precisa
   instalar nada. Com internet, as fontes tipográficas vêm do Google Fonts; sem
   internet, o jogo usa as fontes do sistema.
2. Quem vai dar o presente clica em **Começar** e preenche: nome do pai, como chama
   ele, o próprio nome (filho ou filha), a empresa e o ramo (opcionais, aparecem nos
   exemplos e nos pedidos prontos), o tom de pele dos personagens e um recado para o
   final.
3. Entregue para ele jogar.

**Controles**

- Olhar em volta: arrastar a tela ou o mouse.
- Andar: setas ou W A S D; no celular, o controle redondo. Ou toque em **Ir até lá ▶**
  ou no nome do que quer, e ele vai sozinho.
- Avançar o texto: tocar na caixa de texto, **Espaço** ou **Enter**. Opções: **1 a 4**.
  Menu: **Esc**.
- No topo: 📘 Guia do CEO, som, velocidade do texto, tamanho da letra e menu
  (histórico de falas, opções, capítulos).

O progresso fica salvo no próprio navegador (localStorage) a cada parte de capítulo.

## Capítulos

| | Título | O que ensina |
|---|---|---|
| Prólogo | Terça-feira, 6h47 | O trato com o filho; a IA só sabe o que você conta; as três regras dele |
| 1 | A Arte de Pedir | Pedir como quem explica serviço a um diretor novo: papel, objetivo, contexto, formato |
| 2 | O Expediente | A fronteira da IA: rascunho rápido, revisão sua; decisões sobre pessoas nunca vão para ela |
| 3 | O Contrato de 80 Páginas | Ler documentos longos com a ferramenta certa, citações conferidas e o semáforo de dados |
| 4 | Detector de Lorota | Leis, números e notícias: conferir na fonte oficial; a IA também concorda demais |
| 5 | A Reunião Infinita | Pauta, transcrição com consentimento, ata com donos e prazos conferidos |
| 6 | Números na Mesa | A IA interpreta, a planilha calcula; pegar o erro de conta |
| 7 | O Conselheiro de Bolso | IA como parceira de debate: pré-mortem, advogado do diabo, critérios e pesos |
| 8 | Coisas da Casa | Usos do dia a dia, sem substituir médico nem advogado |
| 9 | Aprender Qualquer Coisa | Professora particular com paciência infinita; como a IA funciona por dentro |
| 10 | A Ligação | Golpe do falso diretor e da voz clonada; o que nunca vai para a IA |
| 11 | A Dúvida | O chefão: as objeções dele, respondidas sem exagero |
| Epílogo | Pai 2.0 | As regras da casa para a empresa, o desafio de 7 dias e o recado do filho |

O **Guia do CEO** (botão 📘) reúne os pedidos prontos para copiar, com quando usar,
por que funciona e o cuidado de cada um. As seções abrem conforme os capítulos.

## Tecnologia

HTML, CSS e JavaScript, sem etapa de build. O 3D usa [Three.js](https://threejs.org)
r149 (licença MIT, em `js/lib/`); cenários e personagens são modelados no próprio
código. Música e efeitos são sintetizados com WebAudio, sem arquivos de áudio.
Em máquinas mais fracas, a resolução baixa sozinha para manter o jogo fluido.

```
index.html
css/style.css
js/lib/       three.min.js (r149) e licença
js/engine/    m3d (helpers 3D), rig (personagens articulados, poses, expressões),
              stage3d (cena, câmera, primeira pessoa, efeitos), audio (WebAudio),
              ui (painel, escolhas, chat, cartões, HUD), director (API dos capítulos
              e checkpoints), save (localStorage)
js/art3d/     chars.js (elenco) e env-*.js (casa, trabalho, cenários especiais)
js/content/   ceo.js, fontes.js (fatos verificados com selo), guia.js e guia-dados.js
              (Guia do CEO), achievements.js
js/chapters/  prologo.js, cap1.js … cap11.js, epilogo.js
js/main.js    tela inicial, preparação, capítulos, opções, créditos
```

Atalhos de teste: `index.html?cap=cap3` abre direto um capítulo
(`&part=1`, `&genero=filha`, `&empresa=Andrade%20Alimentos`, `&setor=distribuição`,
`&speed=instantanea` e `&q=low` para qualidade mínima também funcionam).

## Fontes

Os fatos citados estão em `js/content/fontes.js`, com fonte, ano, link, selo
(independente, governo, imprensa, consultoria, fornecedor ou empresa) e a base da
amostra. A lista completa aparece na tela **Fontes e créditos**.
