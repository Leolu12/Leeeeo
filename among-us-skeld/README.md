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
| Fantasma: seguir alguém | G | 👁 Seguir |
| Fantasma: chat dos mortos | Enter | 👻 Fantasmas |
| Fechar ou pausar | Esc | ✕ ou Menu |

Na reunião, digite livremente no chat. Os bots entendem frases como *"eu tava na elétrica com o azul"*, *"vi o vermelho ventar no admin"*, *"verde é safe, fez scan"*, *"rosa onde vc tava?"*, *"corpo na nav"* ou *"skip"*, e respondem, confirmam, contradizem ou questionam.

No **lobby** tem um chat de verdade: os bots se cumprimentam, comentam as regras escolhidas e respondem ao que você escreve (pela IA quando ela está ligada).

Na reunião, um **mapinha mostra onde você estava** quando ela começou (só o seu lugar, sem corpo nem os outros).

Durante a reunião você pode **pausar** o relógio para ler com calma, rolar o chat para cima (as mensagens novas ficam num aviso "↓ novas mensagens" em vez de puxar a tela) e abrir o **Quadro de álibis**, que resume quem disse onde estava, quem confirma e quem acusa quem. O histórico de todas as reuniões fica no botão 📜 (ou tecla H) durante a partida e no relatório final.

## IA das conversas (modelo de linguagem)

Sem nenhum modelo, os bots já conversam com frases próprias. Com um modelo de linguagem ligado:

- **A IA escreve a reunião inteira**: as falas de abertura, as respostas ao que você digita, as brigas e defesas entre os bots, as cobranças a quem está quieto e os anúncios de voto. Cada bot tem um jeito próprio de escrever (uns certinhos, outros abreviando, poucos com gíria), sem repetir o que já foi dito.
- **A IA decide os votos**: cada bot vota com base no que ele sabe e no que ouviu no chat. Em situação crítica, ele vota em vez de pular.
- **A IA decide as ações no mapa**: os tripulantes escolhem fazer tarefas, andar em dupla, vigiar um suspeito, evitar alguém, olhar câmeras, patrulhar as salas vazias depois das tarefas ou chamar alguém para ver a tarefa visual. Os impostores escolhem a vítima, fingem tarefa, sabotam, trancam portas, usam dutos, atraem alguém para um canto ou combinam double kill.

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
- Tempos configuráveis: duração e recarga de cada função (disfarce, invisibilidade, rastreio, escudo, duto do engenheiro, bateria do cientista, alerta do barulhento), tempo para consertar reator/O2, recarga das sabotagens e tempo/recarga das portas.
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
- Habilidades: Metamorfo se disfarça, Fantasma fica invisível, Rastreador segue um alvo, Cientista vê os sinais vitais,  Anjo protege (escudo de 10 s, recarga de 60 s, como no jogo original), Engenheiro usa dutos e o Barulhento dispara um alerta ao morrer.
- Modo fantasma depois de morrer: atravessa paredes, termina as tarefas, pode **seguir** qualquer vivo (👁 Seguir; mexer-se cancela) e tem o **chat dos fantasmas**, na partida e nas reuniões. Os vivos nunca leem. Os fantasmas-bots sabem quem os matou e o que viram depois de mortos: recebem você, contam quem foi, comentam as ejeções, torcem e respondem ao que você escreve (pela IA, quando ligada).
- Anjo da Guarda bot: protege quem está perto de quem o matou ou sozinho num lugar perigoso (às vezes você). Como uma pessoa, nem sempre está atento quando o escudo fica pronto: usa em mais ou menos metade das chances e, distraído, vai fazer as tarefas de fantasma.
- Memória da partida inteira: quem o bot viu fazer tarefa visual em qualquer rodada é tripulante para sempre (ele não acusa por coisa fraca e defende se alguém acusar); o que viu de grave antes (abate, duto, transformação) continua cobrando; lembra quem pegou mentindo e quem ficou sozinho com ele sem matar.
- Locais certos: o álibi conta as salas em que o bot entrou de verdade (passar pelo corredor não vira "estava na Segurança"), inclui onde estava na hora da reunião e a passagem pela sala do corpo; "passei lá e não tinha ninguém" só se passou mesmo. Chamar alguém de mentiroso exige que não bata de verdade: visto perto do corpo e escondeu isso, ou visto há tão pouco tempo num lugar tão longe que não daria para chegar na sala que disse. Salas digitadas com erro ("eletrca", "reatro") são entendidas.
- Metamorfo e Fantasma: quem vê a transformação nem sempre percebe (distância, luz, ocupado numa tarefa, câmeras), às vezes fica só com uma impressão e confunde a cor, e nem sempre corre para o botão. Uma testemunha sozinha pesa menos para os outros; duas fecham o caso.
- Provar inocência vale entre bots também: o bot acusado oferece fazer a tarefa visual, outros bots vão junto para conferir e, se virem, defendem na reunião seguinte.
- Raciocínio na reunião: tira da lista quem tem álibi firme (tarefa visual, ficou junto um bom tempo, confirmado por alguém de confiança), vota com menos certeza quando várias pistas independentes apontam para a mesma pessoa, dá menos crédito a quem já mentiu ou acusou um inocente comprovado e não conta como prova nova a mesma acusação repetida. Confirmar onde alguém estava só vale com um avistamento recente.
- Truque da barra de tarefas: com a barra sempre visível, quem "termina" uma tarefa de etapa única na frente de alguém e a barra não sobe é pego fingindo; impostores experientes evitam isso fingindo tarefas de várias etapas quando há gente olhando.
- Metamorfo: se alguém com a cara do X estava perto do corpo, mas o X tem álibi confirmado, os bots concluem que era o disfarce e passam a cobrar quem não tem ninguém confirmando onde estava. Com metamorfo na partida, "vi o X matando" de uma testemunha só leva alguém a perguntar quem estava com o X.
- Impostor discreto: o metamorfo se transforma e desfaz o disfarce só onde ninguém vê (nem a vítima), e o fantasma some e reaparece longe dos olhos; se o tempo está acabando com alguém olhando, ele se afasta antes. O metamorfo escolhe copiar quem está longe e sozinho (ou quem a turma já desconfia) e às vezes faz a jogada de matar disfarçado na frente de uma ou duas pessoas, some pelo duto e, na reunião, joga a culpa em quem copiou.
- Versões que não batem: quando alguém diz "vi o X em tal lugar" e o X disse que estava em outro, os bots sabem que um dos dois mente e ficam com a versão que outras pessoas confirmam (ou com o que eles mesmos viram); sem confirmação, os dois ficam na mira.
- O que você fala é assunto: quem aperta o botão tem a palavra primeiro (se demora, perguntam o motivo) e o que contou é discutido por 2 ou 3 bots, que perguntam onde e quando, acreditam, duvidam ou cobram o acusado, que responde. "Ela se transformou na minha frente", "vi sumir do nada" e "tava me seguindo" são entendidos como relato de testemunha.
- Sem cair em truque: o acusado que só devolve "mentiroso, quem acusa é impostor" não convence, e "mentiroso" sem dizer onde nem por quê vale pouco (nas partidas de teste era quase sempre o impostor se defendendo); "vi fulano perto do corpo" contra quem reportou não pesa (ele achou o corpo); ninguém vai na onda de um "acho que é ele" sem motivo; dupla que só confirma um ao outro vale menos; quem já provou ser tripulante e diz que viu algo grave ganha mais crédito.
- Quem reporta também conta quem viu perto antes (vindo de lá, com a vítima), e todo mundo pode dizer quando viu a vítima viva pela última vez, o que fecha a janela do abate e dá álibi a quem estava longe demais para ter matado (contando os dutos).
- O líder fecha a discussão com um resumo (quem está limpo, quem pesa mais e por quê) e, quando um voto errado perde o jogo, alguém avisa que não dá para pular à toa.
- Impostor esperto no álibi: admite ter passado onde sabe que foi visto, em vez de mentir e ser pego, e evita matar quem acabou de ser visto andando com ele.
- Reportou rápido demais: se a vítima foi vista viva poucos segundos antes do report, quem reportou fica sob suspeita (nas partidas de teste, report em até 8s depois do abate era do próprio impostor em ~60% das vezes) — a não ser que alguém estivesse vendo essa pessoa o tempo todo. O impostor experiente sabe disso e evita reportar o próprio abate na hora.
- Reta final: quando mais um abate dá a vitória aos impostores, ninguém pula; a tripulação vota no mais provável (até pista fraca conta: admitiu passar na sala do corpo, ninguém confirmou onde estava) e junta os votos em vez de dividir. Os impostores, do lado deles, votam juntos no mesmo tripulante. Sem tarefa visual e sem confirmação de ejeção (Competitivo, Hardcore), ninguém prova nada: aí só força o voto quem tem pista própria ou relato forte, porque o voto no chute costuma tirar inocente. Sem confirmação, cada bot também estima quantos impostores ainda restam pelo que achava de cada ejetado.
- Votação sem espiar: como no jogo original, durante a votação ninguém vê em quem os outros votaram. Os bots contam só os votos anunciados no chat ("voto no X", "eu pulo", ou "vi o X matando", que é voto certo) e anunciam o próprio voto com mais frequência, como os jogadores fazem.
- Voto que não se divide: se o mais votado também é suspeito para o bot e quem puxou a acusação trouxe prova (ou já provou ser tripulante), ele junta ali.
- Botão de emergência com motivo: quem pega alguém fingindo tarefa ou o scan chama reunião na hora; o cientista que vê uma morte nos sinais vitais sem corpo reportado também.
- Sabotagem com motivo, decidida por cada impostor pelo que ele vê e pelo jeito dele (um gosta de apagar as luzes, outro de reator/O2, outro de trancar portas): apaga as luzes quando alguém está sozinho perto de um impostor pronto, tranca a porta com a vítima dentro, puxa todo mundo para longe do próprio corpo com reator/O2, separa um grupo grande, corta as comunicações só quando tem gente nas câmeras ou no Admin, e trava a tripulação quando as tarefas estão quase no fim (uma vez por rodada). Cada impostor também tem seu jeito sobre o nível (uns usam mais duto, outros perseguem mais ou arriscam mais), e a IA recebe esse estilo.
- "Tava na elétrica" é onde a pessoa estava no fim, não o caminho todo: ter sido visto em outro lugar antes não vira "mentira". Quem passou perto do corpo e não citou recebe uma pergunta ("te vi no admin antes, você passou por lá?") em vez de acusação; só quem contou o trajeto todo ou disse "fiquei o tempo todo" é cobrado por omissão.
- Metamorfo e "não era eu": quando alguém acusado diz que pode ter sido o metamorfo disfarçado, cada bot confere o que sabe. Se viu a pessoa em outro lugar na mesma hora, estava com ela ou ela já provou ser tripulante, conclui que era o disfarce e defende ("eu vi o ciano no admin nessa hora, quem viram em armas era o metamorfo"). Sem confirmação, o "te vi lá" perde força e alguém pergunta quem confirma, mas ninguém é inocentado só por dizer isso. O tripulante bot acusado de estar onde não esteve (ou de um abate que não fez) também se defende assim.
- Impostor caçador: com o abate pronto e ninguém por perto, larga a tarefa falsa e vai até onde viu alguém sozinho há pouco (ou fica de tocaia numa sala isolada); se perde a vítima de vista, vai até onde a viu por último; e espera quando alguém acabou de vê-lo por ali.
- Anjo da guarda que sabe quem o matou fica na cola do assassino e guarda o escudo para a hora em que ele fica sozinho com alguém (usa com a mesma frequência de antes, só que na hora certa).
- A IA (quando ligada) recebe tudo isso: nas reuniões, as regras de reta final e de self report; no mapa, quem pegou tarefa falsa, quem viu morte nos vitais, quem viu o impostor por perto e quem foi visto sozinho há pouco.
- Movimento natural: cada bot tem sua faixa no corredor e sua preferência de caminho (nem todos pisam na mesma linha), desvia de quem está colado, escolhe um lado livre do painel ao fazer tarefa, e o impostor que não consegue matar sem testemunha se afasta em vez de ficar grudado na vítima.
- Tom do chat, em três níveis (vale para as frases dos bots, para a IA, para os fantasmas e para o lobby):
  - **Limpo**: o mais fácil de entender. Português completo, nomes oficiais das salas ("para a Cafeteria", "no Motor Superior"), "15 segundos", sem siglas, gírias ou termos em inglês.
  - **Casual**: como a maioria escreve num chat — minúsculas, vc/pq/tava/pra, kkk às vezes, skip e sus de vez em quando, salas com o nome comum (cafeteria, elétrica, depósito, armas). Sem gíria pesada e sem apelido de sala.
  - **Raiz**: o mais caótico — apelidos das salas (café, elec, nav, med, storage, weapons, upper), siglas (n, q, cmg, dps, mt, ss), gírias (mano, tlgd, tá ligado, slk, pqp, mds), kkkk e CAPS quando se exaltam. A gíria aparece na hora certa (susto, bronca, negação), não colada em qualquer frase.
- Conversa com cara de chat de verdade: quem responde a uma mensagem antiga diz com quem está falando ("verde, pq eu?"), quem já ouviu a mesma garantia só confirma ("também vi"), ninguém repete palavra por palavra o que outro disse, cada um dá o álibi do seu jeito (às vezes só "admin fazendo os fios"), quem estava junto não é acusado de "me seguir" e ninguém dá o álibi duas vezes (se perguntam de novo: "já falei, tava na elétrica").
- Chat dos fantasmas esperto: sabe quem foi ejetado e quem foi morto (ninguém pergunta "quem te matou" para quem saiu na votação, e quem morreu e diz "fui ejetado" é corrigido), conta quem matou quem, quem fez tarefa visual e de quem desconfiava quando estava vivo, quantos vivos e impostores sobram, e reage à votação dos vivos ("não!! foi o verde"). Morto não diz que vai voltar nem fala com os vivos; impostor morto admite. Cada fantasma sabe que está morto, onde está e o que está fazendo ("tô na elétrica fazendo task de fantasma"). Entre fantasmas ninguém é suspeito: se você (fantasma) escreve "me segue", "vem aqui" ou "vem na elétrica", ou faz o zigue-zague perto de um deles, ele vai junto de verdade; "pode ir" ou "valeu" libera.
- Bots que terminam as tarefas não ficam parados: rondam as salas isoladas procurando corpos, olham câmeras e Admin, acompanham quem ainda tem tarefa ou vigiam um suspeito de longe. Andam como gente: caminhadas contínuas até onde vão, sem o "para-anda-para" de NPC e sem ficar dando voltas dentro da sala à toa. Ao chegar numa sala param e olham dali; esperando ao lado de alguém ficam parados (só dão um passo para o lado se esbarrarem em alguém); seguindo alguém que anda, andam junto.
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
js/ghosts.js      chat dos fantasmas: o que cada morto sabe e as falas deles
js/lobby.js       chat do lobby antes da partida
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

`AU.debug.simulate({ preset, players, impostors })` roda uma partida inteira só entre bots, sem interface, e devolve o resultado. No preset Clássico (10 jogadores, 2 impostores, nível Competente), a tripulação venceu cerca de 48% das vezes (42% a 56% por amostra de 100) e ~63% dos ejetados eram impostores. Por nível de impostor, no Clássico, a tripulação vence cerca de 62% contra o Iniciante, 45% contra o Competente, 37% contra o Veterano e 34% contra o Implacável. No Casual, a tripulação venceu 77%; no Competitivo, ~39%; no Hardcore (visão 0,7, recarga de 35 s, sem tarefa visual, sem confirmação, impostores Implacáveis), ~30%.
