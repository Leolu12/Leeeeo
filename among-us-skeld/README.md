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

Durante a reunião você pode **pausar** o relógio para ler com calma, rolar o chat para cima (as mensagens novas ficam num aviso "↓ novas mensagens" em vez de puxar a tela) e abrir o **Quadro de álibis**, que resume quem disse onde estava, quem confirma e quem acusa quem. O histórico de todas as reuniões fica no botão 📜 (ou tecla H) durante a partida e no relatório final.

## IA das conversas (modelo de linguagem)

Sem nenhum modelo, os bots já conversam com frases próprias. Com um modelo de linguagem ligado:

- **A IA escreve a reunião inteira**: as falas de abertura, as respostas ao que você digita, as brigas e defesas entre os bots, as cobranças a quem está quieto e os anúncios de voto. Cada bot tem um jeito próprio de escrever (uns certinhos, outros abreviando, poucos com gíria), sem repetir o que já foi dito.
- **A IA decide os votos**: cada bot vota com base no que ele sabe e no que ouviu no chat. Em situação crítica, ele vota em vez de pular.
- **A IA decide as ações no mapa**: os tripulantes escolhem fazer tarefas, andar em dupla, vigiar um suspeito, evitar alguém, olhar câmeras ou chamar alguém para ver a tarefa visual. Os impostores escolhem a vítima, fingem tarefa, sabotam, trancam portas, usam dutos, atraem alguém para um canto ou combinam double kill.

O motor do jogo executa as ordens e garante as regras e os reflexos (reportar corpo, fugir de quem viu matar, não matar com testemunha). Dá para deixar só a conversa com a IA em **Votos e ações dos bots**.

Como funciona:
- O motor do jogo continua decidindo o que cada bot sabe, de quem desconfia, o que afirma e em quem vota. Um "diretor" junta essas falas em rodadas e pede ao modelo para escrevê-las como um chat de verdade, cada bot no seu estilo.
- Nos silêncios, o diretor dá a vez a quem tem motivo para falar: quem foi acusado, quem recebeu pergunta, quem desconfia de alguém, o líder que cobra quem não disse onde estava.
- Quando você escreve, os bots citados, os que você cobrou e os que sabem algo do assunto respondem primeiro.
- O modelo só recebe as anotações de cada bot (onde esteve, quem viu, de quem desconfia). O impostor aparece só com a versão que ele conta, então o modelo nunca sabe quem é impostor.
- O selo no topo da reunião mostra se a IA está ativa. Se não estiver, passe o mouse (ou toque) para ver o motivo.

Onde cada opção funciona:

| Opção | Onde funciona | Custo |
|---|---|---|
| **Claude** | No link publicado no claude.ai, aberto no navegador com a sua conta. Na primeira fala o claude.ai mostra um aviso pedindo permissão. | Grátis para jogar; conta no seu uso do Claude. |
| **Modelo local (WebLLM)** | Só com o arquivo do jogo aberto direto no navegador (ou no GitHub Pages), no Chrome ou Edge com WebGPU. Baixa uma vez um modelo pequeno (Qwen 2.5 ou Gemma 2, de 1 a 2 GB). | Grátis. |
| **API compatível com OpenAI** | Só fora do claude.ai. Presets para OpenRouter (modelos `:free`), Groq, Google Gemini e Ollama. Cole sua chave, liste os modelos e teste. | Plano grátis do serviço. |
| **Desligada** | Em qualquer lugar. | — |

Dentro do claude.ai a página roda sem acesso à internet, por isso lá só o Claude funciona. A chave de API fica salva só no seu navegador (`localStorage`) e é enviada apenas para o endereço que você escolheu.

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
- The Skeld com 14 salas (com cantos em diagonal, pisos próprios e móveis: mesas da Cafeteria, macas da MedBay, turbinas dos motores, núcleo do Reator, janelas da Navegação), corredores, portas, 13 dutos interligados, 4 câmeras, o mapa do Admin e o botão de emergência.
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

**Sinais e inteligência no mapa**
- Linguagem corporal, sem texto nem botão: faça zigue-zague no lugar (vai e volta rápido) perto de alguém. Quem está olhando talvez perceba, dependendo da atenção, da distância, de estar ocupado e da luz, e, se confiar em você, passa a te seguir. Quem te segue vigia você: se você ficar parado à toa, levar para um canto isolado ou fizer algo estranho, ele para de seguir ou foge.
- Os bots também fazem zigue-zague para chamar você ou outros e mostrar uma tarefa visual (álibi). Se você segue alguém de confiança, ele percebe e mostra a tarefa visual.
- Seguir tem propósito: quem segue para de seguir quando vê a tarefa visual (ou quando nada acontece por um tempo) e volta às próprias tarefas. Na reunião, conta: "segui o Léo, fez scan na minha frente, é inocente".
- Na reunião dá para oferecer prova ("me sigam que eu faço o scan"): um ou dois bots combinam de seguir na próxima rodada. Quem promete e não prova vira suspeito. Os bots fazem o mesmo entre si, e o impostor às vezes blefa.
- Os bots andam em dupla com quem confiam, vigiam de longe quem é suspeito, se juntam quando as luzes caem e mudam o comportamento depois de cada reunião: quem foi acusado tenta provar inocência; o impostor acusado se esconde no grupo e guarda rancor de quem o acusou.
- Impostores: álibi no começo da rodada, isca ("vem comigo" até um canto vazio), parceria falsa e double kill. Se você for impostor e fizer zigue-zague perto do parceiro bot, ele entende, fica por perto e mata junto quando você matar.
- Conhecimento de mapa: rede de dutos da Skeld, Elétrica como sala mais perigosa, câmeras nos corredores. Quem fica parado numa tarefa visual (scan, asteroides, escudos) sem a animação é pego fingindo; o impostor prefere matar perto de duto e tirar primeiro quem lidera ou já provou inocência; quem terminou as tarefas faz ronda nas salas isoladas.
- Nas reuniões os bots deduzem: quem vinha da direção do corpo, quem disse que estava justamente na sala do corpo, quem sabia onde era o corpo antes de alguém contar, quem apareceu do nada numa sala ligada por duto ao corpo, quem mentiu no álibi. Eles também lembram quem já respondeu, conhecem as regras e as funções da partida (metamorfo, engenheiro etc.) e o impostor defende o parceiro com discrição, ou o entrega quando ele já está perdido.

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
js/llm.js         provedores de modelo de linguagem (Claude, WebLLM, APIs)
js/voice.js       diretor da reunião: o que cada bot sabe, falas e votos pela IA
js/tactics.js     estrategista: ações no mapa decididas pela IA
js/meeting.js     fluxo e interface da reunião, quadro de álibis e histórico
js/decor.js       desenho estático das salas: pisos, paredes, móveis e consoles
js/render.js      desenho dos tripulantes, efeitos e névoa
js/minigames.js   tarefas e consertos de sabotagem
js/hud.js         HUD, mapa, câmeras, Admin, vitais e joystick
js/menu.js        título, criação, lobby, revelação e relatório final
js/main.js        laço do jogo, teclado e simulação para testes
tools/build.py    gera a versão de arquivo único em dist/
```

## Testes

`AU.debug.simulate({ preset, players, impostors })` roda uma partida inteira só entre bots, sem interface, e devolve o resultado. Com 120 partidas no preset Clássico (10 jogadores, 2 impostores, nível Competente), a tripulação venceu cerca de 62% das vezes e os impostores 38%. No Hardcore (impostores Implacáveis), os impostores venceram cerca de 63%.
