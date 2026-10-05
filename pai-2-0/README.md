# Pai 2.0 — um dia com a IA

Aventura narrativa em pixel art, em português do Brasil, feita para convencer um pai
cético (50+) a experimentar inteligência artificial no trabalho e no dia a dia —
**com honestidade**: o jogo mostra o que a IA faz bem, onde ela erra e como usá-la
com segurança. Duração: 60 a 90 minutos, em capítulos curtos.

## Como jogar

1. Abra `index.html` no navegador (computador ou celular). Não precisa instalar nada
   nem ter internet (só as fontes tipográficas vêm do Google Fonts; sem internet o
   jogo usa fontes do sistema).
2. Quem vai dar o presente clica em **Começar** e preenche: nome do pai, como chama
   ele, o próprio nome (filho ou filha), a profissão dele, o tom de pele dos
   personagens e, se quiser, um recado para o final.
3. Entregue para ele jogar.

**Controles:** toque/clique na caixa de texto ou aperte **Espaço/Enter** para avançar ·
**1–4** escolhem opções · **Esc** abre o menu. No topo: som, velocidade do texto,
tamanho da letra (A / A+ / A++) e menu (histórico de falas, opções, capítulos).

O progresso é salvo no próprio navegador (localStorage) a cada parte de capítulo.

## Capítulos

| | Título | O que ensina |
|---|---|---|
| Prólogo | Terça-feira, 6h47 | O trato: passar um dia com a Faísca |
| 1 | A Arte de Pedir | Contexto + tarefa + formato; refinar |
| 2 | O Expediente | Fronteira da IA: rascunho + revisão; decisões são suas |
| 3 | Detector de Lorota | Leis, números, datas, remédios, preços e citações: conferir |
| 4 | A Reunião Infinita | Usar a voz; transformar anotações em decisões |
| 5 | Números na Mesa | Planilhas: a IA ensina, você confere |
| 6 | Coisas da Casa | Usos do dia a dia, sem substituir médico |
| 7 | Aprender Qualquer Coisa | Professora particular com paciência infinita |
| 8 | A Ligação | Golpe da voz clonada e o que nunca contar para a IA |
| 9 | A Dúvida | Chefão: as objeções, respondidas com honestidade |
| Epílogo | Pai 2.0 | Resultados, certificado, desafio de 7 dias, carta |

As tarefas, o chefe/cliente e as dicas mudam conforme a profissão: Escritório/Gestão,
Comércio/Negócio próprio, Saúde, Engenharia/Obras, Direito, Autônomo/Prestador de serviço.

## Tecnologia

HTML + CSS + JavaScript puro, sem bibliotecas e sem etapa de build. Palco em canvas
320×180 ampliado com `image-rendering: pixelated`; a pixel art é desenhada pelo
código; música chiptune e efeitos são sintetizados com WebAudio.

```
index.html
css/style.css
js/engine/   gfx (primitivas), audio (WebAudio), core (palco/atores), ui (painel/HTML),
             director (API dos capítulos e checkpoints), save (localStorage)
js/art/      personagens (sprites-*.js) e cenários (bg-*.js)
js/content/  profissões, fontes verificadas, conquistas
js/chapters/ prologo.js, cap1.js … cap9.js, epilogo.js
js/main.js   tela inicial, preparação, capítulos, opções, créditos
```

Atalho de teste: `index.html?cap=cap3&prof=saude` abre direto um capítulo
(`&genero=filha`, `&part=1`, `&speed=instantanea` também funcionam).

## Fontes

Toda estatística mostrada no jogo tem a fonte e o link no próprio cartão "Fato real"
e na tela **Fontes e créditos** (lista em `js/content/fontes.js`).
