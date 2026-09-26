# Impostor a Bordo

Jogo de dedução social no mapa **The Skeld**, inspirado em *Among Us*, para jogar sozinho no navegador contra tripulantes controlados por IA. Os bots têm visão limitada, memória, personalidade própria e conversam no chat das reuniões. Nenhum bot sabe a função dos outros; só os impostores se conhecem.

> Jogo de fã, sem vínculo com a Innersloth. Todo o visual é desenhado em código (canvas e SVG) e os sons são sintetizados com WebAudio.

## Como jogar

- **Direto do arquivo:** abra `index.html` no navegador. Não precisa de servidor nem de instalação.
- **Arquivo único:** rode `python3 tools/build.py` e abra `dist/impostor-a-bordo.html`. Esse arquivo pode ser enviado para outra pessoa ou publicado no GitHub Pages.
- **GitHub Pages:** em *Settings → Pages*, publique a branch com a pasta `among-us-skeld/` e acesse `…/among-us-skeld/`.

### Controles

| Ação | Teclado | Toque |
|---|---|---|
| Andar | WASD ou setas | joystick |
| Usar, tarefa, botão, câmeras, Admin | E ou Espaço | Usar |
| Reportar corpo | R | Reportar |
| Matar (impostor) | Q | Matar |
| Entrar/sair do duto | V; 1–3 troca de duto | Duto e setas na tela |
| Sabotar (impostor) | X | Sabotar |
| Habilidade da função | F | botão roxo |
| Mapa | M ou Tab | Mapa |
| Fechar ou pausar | Esc | ✕ ou Menu |

Na reunião, digite livremente no chat. Os bots entendem frases como *"eu tava na elétrica com o azul"*, *"vi o vermelho ventar no admin"*, *"verde é safe, fez scan"*, *"rosa onde vc tava?"*, *"corpo na nav"* ou *"skip"*, e respondem, confirmam, contradizem ou questionam.

## O que tem no jogo

**Criação da partida**
- 5 presets: Clássico, Competitivo, Hardcore, Caos e Casual.
- Perfil do jogador: nome, 18 cores, chapéu, visor e pet.
- Sala de 4 a 15 jogadores e de 1 a 3 impostores.
- Sorteio do impostor: aleatório, sempre impostor, sempre tripulante ou com chance personalizada.
- Todas as regras de jogo:
  - Confirmar ejeções.
  - Reuniões de emergência e recarga do botão.
  - Tempos de discussão e votação.
  - Votos anônimos.
  - Velocidade e visão.
  - Recarga e distância de abate.
  - Barra de tarefas.
  - Tarefas visuais.
  - Quantidade de tarefas comuns, longas e curtas.
- 7 funções especiais, cada uma com quantidade e chance: Cientista, Engenheiro, Rastreador, Barulhento, Anjo da Guarda, Metamorfo e Fantasma.
- Bots:
  - Nomes automáticos ou definidos por você.
  - Personalidades sorteadas, filtradas ou atribuídas uma a uma no lobby.
  - Nível dos impostores: Iniciante, Competente, Veterano ou Implacável.
  - Erro humano.
  - Tom do chat (limpo, casual ou raiz) e ritmo do chat.
- Narração: nível do narrador e relatório final.
- Regras da casa:
  - Sem abate duplo.
  - Sem entrar no duto na frente de alguém.
  - Sabotagem crítica só depois do primeiro corpo.
  - Tarefa visual não inocenta de vez.
  - Proibido self-report.
  - Uma regra livre, mostrada na pausa.
- A configuração fica salva no navegador.

**Na nave**
- The Skeld com 14 salas, corredores, portas, 13 dutos interligados, 4 câmeras, o mapa do Admin e o botão de emergência.
- Visão com linha de visada: paredes e portas bloqueiam, e as luzes apagadas reduzem a visão da tripulação.
- 17 tarefas interativas:
  - Passar cartão, fiação, calibrar distribuidor, traçar rota e estabilizar direção.
  - Filtro de O2, desviar energia, escudos, coletores e ligar reator (sequência).
  - Alinhar motores, abastecer, amostra (espera de 60s), scan e download/upload.
  - Asteroides e lixo.
- Tarefas visuais que os outros enxergam: scan, escudos, asteroides e lixo.
- Sabotagens com painel de conserto:
  - Luzes: interruptores.
  - Reator: dois scanners segurados ao mesmo tempo.
  - O2: código nos dois teclados.
  - Comunicações: sintonia.
  - Portas.
- Habilidades: Metamorfo se disfarça, Fantasma fica invisível, Rastreador segue um alvo, Cientista vê os sinais vitais, Anjo protege, Engenheiro usa dutos e o Barulhento dispara um alerta ao morrer.
- Modo fantasma depois de morrer: atravessa paredes, termina as tarefas e tem um chat só dos mortos.
- Narrador com descrição das salas, das sabotagens e do ambiente.

**Bots**
- Percebem só o que está no campo de visão ou nas câmeras.
- Lembram rotas, encontros, quem andava com quem, tarefas visuais, quem os seguiu e quem ficou parado no scanner sem escanear.
- Erram de verdade: às vezes não notam alguém, confundem cores parecidas ou lembram a sala errada.
- Têm 10 personalidades com fala, atenção, memória, limiar de voto e comportamento próprios: Analítico, Impulsivo, Falador, Silencioso, Caótico, Líder, Defensor, Cético, Seguidor e Inexperiente.
- Impostores:
  - Esperam a vítima ficar isolada e evitam corredores cheios.
  - Checam câmeras (a partir do Veterano) e fogem pelos dutos.
  - Fazem self-report, sabotam para separar grupos e fecham portas.
  - Mentem no álibi, incriminam alguém e defendem o parceiro, ou o entregam quando ele já está perdido.
- Nas reuniões:
  - Contam onde estavam e confirmam ou contradizem álibis.
  - Pedem provas, cobram quem está quieto e fazem perguntas diretas a você.
  - Votam por eliminação: quem já foi inocentado sai da lista.

**Relatório final:** revela funções e personalidades, mostra o destino de cada um, as tarefas feitas e o principal suspeito de cada bot. Também traz a linha do tempo completa: abates com testemunhas, dutos, sabotagens, votos e ejeções.

## Estrutura

```
index.html        telas e ordem dos scripts
css/style.css     visual
js/util.js        utilidades
js/config.js      cores, personalidades, níveis, presets e padrões
js/map.js         geometria da Skeld, estações, dutos e tarefas
js/nav.js         A*, linha de visão e polígono de visão
js/game.js        regras: abate, dutos, sabotagem, reuniões e vitória
js/brain.js       bots em campo: percepção, memória, tarefas e impostor
js/mind.js        bots nas reuniões: evidências, fala, reações e voto
js/talk.js        frases, tom do chat e leitura das mensagens do jogador
js/meeting.js     fluxo e interface da reunião
js/render.js      desenho do mapa, tripulantes, efeitos e névoa
js/minigames.js   tarefas e consertos de sabotagem
js/hud.js         HUD, mapa, câmeras, Admin, vitais e joystick
js/menu.js        título, criação, lobby, revelação e relatório final
js/main.js        laço do jogo, teclado e simulação para testes
tools/build.py    gera a versão de arquivo único em dist/
```

## Testes

`AU.debug.simulate({ preset, players, impostors })` roda uma partida inteira só entre bots, sem interface, e devolve o resultado. Com 120 partidas no preset Clássico (10 jogadores, 2 impostores, nível Competente), a tripulação venceu cerca de 62% das vezes e os impostores 38%. No Hardcore (impostores Implacáveis), os impostores venceram cerca de 63%.
