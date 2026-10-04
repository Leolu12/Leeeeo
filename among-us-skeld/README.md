# Impostor a Bordo

Jogo de dedução social no mapa **The Skeld**, inspirado em *Among Us*, para jogar no navegador contra tripulantes controlados por IA — sozinho ou **online com amigos** (os lugares que sobram ficam com bots). Os bots têm visão limitada, memória, personalidade própria e conversam no chat das reuniões. Nenhum bot sabe a função dos outros; só os impostores se conhecem.

O mapa pode ser jogado em **3D** (padrão: luz, sombra e reflexo de verdade, feito com three.js) ou no **2D** de sempre.

> Jogo de fã, sem vínculo com a Innersloth. Todo o visual é desenhado em código (WebGL, canvas e SVG, sem imagens prontas) e os sons são sintetizados com WebAudio. O three.js (licença MIT) vai junto em `vendor/three.min.js`.

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

## Mapa 3D

Feito do zero: a nave inteira é montada em código a partir da mesma planta do 2D (mesmas paredes, portas, dutos, consoles e móveis, com a mesma colisão), então nada muda nas regras — só o que você vê.

- **Materiais com aparência física** (metal, azulejo, carpete, grade, borracha, vidro, plástico com verniz), com texturas geradas no próprio jogo: cor, relevo e aspereza de cada piso e parede, mais uma camada larga de sujeira e variação de tom para não parecer azulejo repetido.
- **Luz**: a luz das luminárias e das máquinas é calculada uma vez para a nave inteira (cada sala fica acesa por todas as lâmpadas dela; a parede bloqueia e a luz passa pelas portas), e algumas luzes de verdade perto de você dão o brilho no metal, entrando e saindo devagar. Reflexos do ambiente nos metais, sombras que acompanham a câmera (presas à grade do mapa de sombra, para as bordas não tremerem) e sombra de contato no pé das paredes e móveis. Brilho suave nas luzes fortes, tom de cinema, vinheta, grão leve e suavização de bordas (FXAA).
- **Névoa de visão** igual à regra do jogo: o que o seu personagem não enxerga fica escuro e sem cor, com o recorte feito pelas paredes. No apagão, as luminárias apagam junto. Fantasma vê tudo, em tom frio.
- **Paredes da frente ficam transparentes** em pontilhado quando você passa atrás delas.
- Personagens 3D com mochila, visor que reflete, chapéus e pets; andam, viram para onde vão, somem no duto, deixam o corpo com o osso, viram fantasma translúcido.
- Animações do mapa: portas que abrem e fecham, tampas dos dutos, reator girando, telas animadas, alarme vermelho na sabotagem crítica, asteroides na janela das Armas, scanner da MedBay, partículas e fumaça.
- **Câmeras de segurança** em 3D de verdade: cada uma desenha a nave do ponto onde está.
- **Qualidade**: Automática, Baixa, Média, Alta e Ultra (sombras maiores, mais luzes, suavização de bordas e sombra de ambiente). Fica em *Narração e interface* e na pausa; dá para trocar no meio da partida. Na Automática, se ficar lento, a resolução baixa sozinha (com folga, sem ficar indo e voltando); se continuar lento mesmo assim, a qualidade desce um degrau e, no último, o jogo passa para o 2D com um aviso.
- **Sem travar**: o 3D é montado aos poucos enquanto você está nos menus (texturas, nave e os programas da placa de vídeo, um pedaço por vez), e a partida já começa com ele pronto. Se você for rápido demais, a tela de revelação espera alguns segundos ("Preparando a nave em 3D…") e, se ainda faltar, a partida começa no 2D e troca sozinha.
- Sem WebGL 2, o jogo fica no 2D. Em aparelho que desenha **sem placa de vídeo** (no processador), o jogo abre no 2D, que fica bem mais leve; o 3D ainda pode ser escolhido nas opções.

## Jogar online

Funciona quando o jogo está aberto **pelo link do claude.ai** (a sala ao vivo e o banco de dados são do próprio claude.ai; abrindo o arquivo direto no computador, a tela do online explica como jogar pelo link).

1. Quem vai criar a sala clica em **Jogar online → Criar sala** e passa o código de 4 letras para os amigos.
2. Os amigos abrem o mesmo link, vão em **Jogar online** e entram pelo código (ou pela lista de salas abertas).
3. Quem criou a sala clica em **Começar partida**. Os lugares que sobrarem até o tamanho da sala ficam com bots (com as configurações de quem criou a sala).

Como funciona:
- **Quem cria a sala roda a partida** (regras, bots, abates, sabotagens, reuniões). Cada amigo manda a posição dele e as ações (abater, reportar, usar duto, sabotar, votar, falar no chat) e recebe o estado da nave umas 12 vezes por segundo; o próprio personagem anda na hora, sem esperar.
- O anfitrião confere tudo: um amigo não atravessa parede nem anda mais rápido que o permitido, e uma ação só vale se for possível naquele momento.
- **Segredos ficam secretos**: a função, as tarefas e o parceiro de cada um vão cifrados só para aquela pessoa (chave combinada entre os dois aparelhos).
- Mensagens perdidas são reenviadas (testado com 25% de perda); quem atrasa recebe de novo o que faltou.
- Se um amigo sai no meio, **um bot assume o lugar** dele (com mente própria, inclusive no meio da votação). Se quem criou a sala sai, a partida acaba e os amigos voltam ao menu com aviso.
- O chat da reunião é o mesmo: bots e amigos conversam juntos, e os bots leem o que os amigos escrevem (onde estavam, quem acusam, quem confirmam), como leem as falas uns dos outros.
- O **banco de dados** guarda a lista de salas abertas (some quando a sala fecha; salas abandonadas são apagadas sozinhas depois de 15 minutos) e o histórico das últimas partidas online, mostrado na tela do online.
- Permissões do claude.ai: **criar sala** (e gravar no banco) pede acesso de **Colaborador** ou mais ao jogo; **entrar** numa sala funciona para quem pode abrir o link.
- Limites: o simulador da partida é o aparelho de quem criou a sala (se ele travar, todo mundo espera); fantasmas que estão em outro aparelho não têm o chat dos mortos; o relatório final de quem não é o anfitrião é resumido.

## IA das conversas (modelo de linguagem)

Sem nenhum modelo, os bots já conversam com frases próprias. Com um modelo de linguagem ligado, há dois jeitos de os bots pensarem.

### Mente própria (padrão)

Cada bot é uma IA separada, chamada sozinha (nunca dois personagens na mesma chamada). Ela joga como um jogador humano joga:

- **Só sabe o que o personagem viveu**: por quais salas passou e quem estava lá, quem viu e onde, o que viu acontecer (abate, duto, transformação, tarefa visual), os corpos que achou, o resultado e os votos de cada reunião, o que foi dito na reunião anterior e as anotações que ela mesma escreveu. O impostor sabe quem é o parceiro; ninguém mais sabe nada de funções.
- **Decide sozinha o que fazer no mapa**: um plano de alguns passos (fazer tal tarefa, ir a uma sala, seguir, vigiar ou evitar alguém, olhar câmeras ou Admin, patrulhar, reportar, apertar o botão com um motivo, consertar sabotagem; o impostor caça, mata, procura alguém sozinho, finge tarefa, sabota, tranca portas, usa duto). Também faz a **chamadinha**: o zigue-zague de "vem comigo" para mostrar uma tarefa visual, e responde quando alguém faz para ela.
- **Fala e vota sozinha na reunião**: lê o chat e decide se fala (até duas mensagens curtas por vez, no jeito de escrever do personagem) ou fica quieta, responde quando é citada e vota quando quiser durante a votação.
- **O corpo continua sendo o jogo**: andar, desviar, as regras (recarga do abate, portas, dutos) e os reflexos de qualquer pessoa (levar susto e fugir de quem matou na frente, sair de perto do próprio abate). Quando acha um corpo ou começa uma sabotagem crítica, o corpo avisa a mente; se ela não responder em alguns segundos, faz o óbvio (reportar, ir consertar).
- Enquanto a próxima decisão não chega, o bot segue o que a própria mente disse para fazer nesse meio tempo (por exemplo, continuar as tarefas).
- **Custo**: usa bem mais IA (cerca de 12 a 15 chamadas por minuto de partida e umas 15 por reunião, uma por vez no Claude). Se a IA cair, atingir o limite ou falhar várias vezes seguidas, os bots voltam ao sistema de regras sozinhos e a mente volta quando a IA voltar. Dá para desligar em **Mente dos bots**.

### IA ajudando o motor

Com a mente própria desligada:

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
- 5 presets: Clássico, Competitivo, Hardcore, Caos e Casual. Mudou qualquer regra, papel ou nível dos bots e a combinação não bate com nenhum deles, o modo vira **Personalizado** (o card acende sozinho e o resumo mostra "Personalizado"); desfez a mudança, volta para o preset.
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
- Tempos configuráveis: duração e recarga de cada função (disfarce, invisibilidade, rastreio, escudo, duto do engenheiro, bateria do cientista, alerta do barulhento), tempo para consertar reator/O2, espera entre sabotagens (conta a partir do conserto da anterior, como no jogo original: 30 s) e tempo/recarga das portas.
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
- The Skeld com 14 salas (com cantos em diagonal — a visão, a colisão e o desenho da parede seguem a mesma diagonal lisa, e você desliza encostado nela), corredores, portas, 13 dutos interligados, 4 câmeras, o mapa do Admin e o botão de emergência.
- Salas redesenhadas com móveis e consoles de cada uma (turbinas e tanques dos motores, núcleo pulsante do Reator, mesas e máquinas de venda da Cafeteria, macas e scanner da MedBay, gerador de escudos, caixotes e compactador do Depósito, painel de estrelas da Navegação e muito mais), com luzes e telas animadas.
- **Portas** como no original: aberta, o vão fica livre (só o trilho no chão e a ponta das folhas recolhidas no batente); fechada, duas folhas de metal com faixa de perigo se encontram no meio, com a luz vermelha piscando. Antes, a faixa de perigo ficava pintada no chão do vão e a porta aberta parecia fechada. As portas fechadas também aparecem nas câmeras.
- **Móveis sólidos**: não dá para atravessar o botão, as mesas, os motores, as macas nem os consoles; você desliza encostado neles, e os bots desviam pelo mesmo mapa de colisão.
- **Animações** no estilo do original: entrar e sair do duto (tampa abre e o personagem afunda ou salta), portas deslizando, respingo do abate e o corpo cortado com o osso, passada com as pernas alternando, cena da sua morte (o impostor ataca com faca ou língua) e aberturas animadas de "Reunião de emergência" e "Corpo reportado". As cenas tocam inteiras: o corpo só pode ser reportado quando a animação do abate acaba (1,1 s), e se alguém reporta enquanto a cena da sua morte ainda passa, a reunião espera ela terminar para abrir.
- Tarefas visuais que os outros veem acontecer: coluna de luz e faixa do scan, lasers saindo dos canhões pela janela de Armas, colmeia dos escudos acendendo e o lixo despencando no compactador.
- **Sons** sintetizados sem arquivos: passos que mudam com o piso (metal, azulejo, carpete), ambiente próprio de cada sala (motores, reator, elétrica, MedBay…), duto, abate, portas, sirene de crise, buzina de emergência, sirene de corpo reportado e sons dos painéis de tarefa. **Som 3D**: o que acontece no mapa só se ouve de perto, como no original — duto a até ~10 tiles, portas batendo a até ~14 (da porta mais perto de você), abate e escudo do anjo só quando você enxerga — mais baixo com a distância, vindo da direção certa e abafado atrás de parede. Em *Ouvindo por*, **Fone de ouvido** liga o 3D completo (frente, trás e altura); **Caixa de som / celular** (padrão) usa o estéreo limpo, porque o 3D de fone muda o timbre e soa abafado na caixa. Vale também para o fantasma, que antes ouvia os dutos da nave inteira. O ambiente também é 3D: cada sala com máquina (reator, motores, elétrica, escudos, MedBay, comunicações, O2, cafeteria) é uma fonte no mapa, que cresce quando você chega perto, vem do lado dela e sai abafada se há parede ou porta fechada no caminho; por baixo, o zumbido baixo da nave. Sirenes, sabotagens, reunião e votos continuam valendo para todos. No 3D o som ficou ainda mais 3D: cada som tem altura (a porta bate na altura dela, o duto vem do chão), ganha eco conforme o lugar onde **você** está (salas pequenas, salões grandes e corredores têm reverberação própria, e quanto mais longe a fonte, mais eco e menos som direto), perde os agudos com a distância como no ar, e o que está atrás de parede chega **pelo caminho de verdade**: o som vem da direção da porta por onde ele passaria, mais baixo e abafado conforme o tamanho do desvio. Os passos de bots e amigos que você vê perto também soam assim. Os sons da interface (clique, chat, tarefa concluída, votos, painéis) saem secos, sem o eco da sala, e o eco é um só para a nave inteira (muda de tamanho conforme o lugar), leve para o processador. Volume geral, som ligado/desligado e som ambiente das salas ligado/desligado ficam nas configurações (Narração e interface) e na pausa, e valem na hora; o botão Som do jogo também fica salvo para as próximas partidas.
- Visão com linha de visada, como no original: paredes e portas bloqueiam; o raio é 7 tiles vezes a visão configurada (0,25x a 5x, separada para tripulação e impostor); o apagão leva a luz da tripulação a 25% aos poucos (cerca de 1,5 s) e ela volta aos poucos quando consertam; o impostor enxerga normalmente no escuro; o fantasma vê a tela inteira. A borda da luz é suave, e quem está nela aparece escurecido — o nome também, para não entregar quem está no escuro. Você e os bots usam exatamente o mesmo raio.
- 17 tarefas interativas, com painéis de metal desenhados à mão (rebites, faixas de perigo, telas de fósforo) e física onde faz sentido — no lixo, a alavanca abre o alçapão e o lixo despenca de verdade:
  - Passar cartão, fiação, calibrar distribuidor, traçar rota e estabilizar direção.
  - Filtro de O2, desviar energia, escudos, coletores e ligar reator (sequência).
  - Alinhar motores, abastecer, amostra (espera de 60s), scan e download/upload.
  - Asteroides e lixo.
- Tarefas visuais que os outros enxergam: scan, escudos, asteroides e lixo.
- Sabotagens com painel de conserto:
  - Luzes: 5 interruptores no painel da Elétrica, compartilhados (o que um liga vale para todos; se alguém desliga um, desliga para todos). Os bots ligam um por vez, como gente, e religam o que alguém desligar. O aviso e a lista de tarefas mostram quantos já estão ligados ("Luzes · 3/5"). Sem prazo, não é consertado pela reunião e não impede o botão de emergência; portas continuam podendo ser fechadas no escuro.
  - Reator: dois scanners segurados ao mesmo tempo. Os bots se dividem entre os dois lados como gente: contam quem já está segurando, quem está a caminho e para onde você está indo, e quem sobra de um lado corre para o lado vazio.
  - O2: código nos dois teclados.
  - Comunicações: sintonia.
  - Portas.
- Anjo da guarda (quando ligado nas funções): no computador, o chat dos fantasmas abre sozinho depois da sua morte mas não prende mais o teclado (antes, o F do anjo e as teclas de andar iam parar no campo de texto); Enter abre o chat para escrever e, depois de mandar, o teclado volta para o jogo. Em 100 partidas com até 2 anjos: 1,3 escudo por anjo, 36 abates bloqueados, 36 escudos em você.
- Habilidades: Metamorfo se disfarça, Fantasma fica invisível, Rastreador segue um alvo, Cientista vê os sinais vitais, Anjo protege (escudo de 10 s, recarga de 60 s, como no jogo original), Engenheiro usa dutos e o Barulhento dispara um alerta ao morrer. Como no original, durante o disfarce/invisibilidade o botão vira "Desfazer"/"Aparecer" (volta antes da hora) e mostra quanto falta, tremendo nos últimos 3 s; o botão de sabotar abre o mapa sempre (a espera aparece em cada sabotagem e em cada porta). Nos sinais vitais, vermelho = morreu desde a última reunião; cinza = morto de rodadas anteriores.
- Modo fantasma depois de morrer: atravessa paredes, termina as tarefas, pode **seguir** qualquer vivo (👁 Seguir; mexer-se cancela) e tem o **chat dos fantasmas**, na partida e nas reuniões. Os vivos nunca leem. Os fantasmas-bots sabem quem os matou e o que viram depois de mortos: recebem você, contam quem foi, comentam as ejeções, torcem e respondem ao que você escreve (pela IA, quando ligada).
- Anjo da Guarda bot: protege quem está perto de quem o matou ou sozinho num lugar perigoso (às vezes você). Como uma pessoa, nem sempre está atento quando o escudo fica pronto: usa em mais ou menos metade das chances e, distraído, vai fazer as tarefas de fantasma.
- Memória da partida inteira: quem o bot viu fazer tarefa visual em qualquer rodada é tripulante para sempre (ele não acusa por coisa fraca e defende se alguém acusar); o que viu de grave antes (abate, duto, transformação) continua cobrando; lembra quem pegou mentindo e quem ficou sozinho com ele sem matar.
- Locais certos: o álibi conta as salas em que o bot entrou de verdade (passar pelo corredor não vira "estava na Segurança"), inclui onde estava na hora da reunião e a passagem pela sala do corpo; "passei lá e não tinha ninguém" só se passou mesmo. Chamar alguém de mentiroso exige que não bata de verdade: visto perto do corpo e escondeu isso, ou visto há tão pouco tempo num lugar tão longe que não daria para chegar na sala que disse. Salas digitadas com erro ("eletrca", "reatro") são entendidas.
- Metamorfo e Fantasma: quem vê a transformação nem sempre percebe (distância, luz, ocupado numa tarefa, câmeras), às vezes fica só com uma impressão e confunde a cor, e nem sempre corre para o botão. Uma testemunha sozinha pesa menos para os outros; duas fecham o caso.
- Provar inocência vale entre bots também: o bot acusado oferece fazer a tarefa visual, outros bots vão junto para conferir e, se virem, defendem na reunião seguinte.
- Raciocínio na reunião: tira da lista quem tem álibi firme (tarefa visual, ficou junto um bom tempo, confirmado por alguém de confiança), vota com menos certeza quando várias pistas independentes apontam para a mesma pessoa, dá menos crédito a quem já mentiu ou acusou um inocente comprovado e não conta como prova nova a mesma acusação repetida. Confirmar onde alguém estava só vale com um avistamento recente.
- Truque da barra de tarefas: com a barra sempre visível, quem fica numa tarefa de etapa única na frente de alguém pelo tempo que ela leva, sai e a barra não sobe é pego fingindo; impostores experientes evitam isso fingindo tarefas de várias etapas quando há gente olhando. O bot espera uns segundos antes de concluir (quem errou ou desistiu e abre de novo não conta), e você pode se explicar no chat ("desisti da tarefa", "não consegui"): a pista perde força.
- Dois iguais ao mesmo tempo: o bot tripulante que vê dois X de uma vez (pelos olhos ou pelas câmeras), ou alguém com a própria cara, percebe que um deles é o metamorfo. Não é na hora: precisa reparar (atenção, luz, ocupado numa tarefa, câmera, muita gente em volta). Ele para e olha, evita ficar a sós com quem tem essa cara, repara mais se o disfarce se desfizer na frente dele e, se viu "o X" matar com o X de verdade à vista (ou alguém com a cara dele matando), chama reunião e não acusa o X. Na reunião conta o que viu ("vi dois vermelhos ao mesmo tempo na cafeteria, um era o metamorfo"), sabe que o X de verdade não é o metamorfo, trata como possível disfarce o que "o X" fez perto dessa hora e defende o X se alguém o acusar por isso. Com um impostor só em jogo, o X e quem estava à vista nessa hora são inocentes com certeza. Você também pode contar ("vi dois azuis", "tinha alguém com a minha cara"). Nas partidas de teste é raro (o metamorfo evita), quase sempre alguém vendo a própria cara.
- Metamorfo: se alguém com a cara do X estava perto do corpo, mas o X tem álibi confirmado, os bots concluem que era o disfarce e passam a cobrar quem não tem ninguém confirmando onde estava. Com metamorfo na partida, "vi o X matando" de uma testemunha só leva alguém a perguntar quem estava com o X.
- Impostor discreto: o metamorfo se transforma e desfaz o disfarce só onde ninguém vê (nem a vítima), e o fantasma some e reaparece longe dos olhos; se o tempo está acabando com alguém olhando, ele se afasta antes. O metamorfo escolhe copiar quem está longe e sozinho (ou quem a turma já desconfia) e às vezes faz a jogada de matar disfarçado na frente de uma ou duas pessoas, some pelo duto e, na reunião, joga a culpa em quem copiou. Disfarçado, ele percebe quando alguém anda atrás dele ou quando a própria pessoa que ele imita o vê (ela sabe que é falso) e reage como gente: a sós com quem sabe e com o abate pronto, cala essa pessoa; senão fecha as portas da sala onde ela ficou, some pelo duto fora da vista dela ou sai de vista e desfaz o disfarce onde ninguém vê.
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
- Testemunha de abate reage como gente: leva 1–2 s de susto antes de agir; se o assassino continua do lado, foge e vai apertar o botão; se ele saiu, volta e reporta. Quem acha um corpo também leva um instante para perceber.
- Visão no escuro: com as luzes apagadas, o bot tripulante enxerga o mesmo raio curto que você (o impostor não perde visão, como no original); quem segue alguém no escuro chega perto o bastante para enxergar e, perdendo de vista, desiste em 2 s. Impostores bot não sabem onde está quem eles não viram, nem se alguém está nas câmeras ou no Admin sem ter visto.
- Com metamorfo na partida, "vi fulano matar" pesa menos (pode ser o disfarce); com engenheiro, quem vê alguém no duto pergunta "é engenheiro?" antes de acusar (nos testes, as expulsões de inocente por duto caíram de 5 para 0).
- Ver alguém no duto não vira reunião automática. Com engenheiro possível na partida, o bot guarda a informação e pergunta na reunião; só chama reunião se for estranho (corpo ali perto, alguém de quem já desconfiava, ou a vaga de engenheiro já foi assumida por outra pessoa). Sem engenheiro na partida, é flagrante, mas nem todo mundo corre para o botão: uns se afastam e guardam para a reunião.
- Voto aberto (sem voto anônimo): todo mundo vê quem votou em quem. Quem pulou ou votou em outro quando todos tiraram um impostor confirmado é cobrado na reunião seguinte (nos testes, acertou 82%). Com voto anônimo, ninguém sabe quem votou em quem.
- Funções de tripulante: o engenheiro usa o duto como atalho para tarefas/consertos longe e para fugir de perigo, evita ser visto e, se foi visto, avisa que é engenheiro; quem vê no duto alguém que já provou ser tripulante pergunta "é engenheiro?" em vez de acusar. Mais gente dizendo ter uma função do que ela existe = alguém mente. Se o parceiro de dupla fica parado à toa, quem seguia passa a ir na frente. O rastreador guarda o rastreio para suspeitos (ou quem vai ficar sozinho), acusa quem estava na sala do corpo na janela do abate, dá álibi a quem estava longe e desmente quem diz uma sala diferente da rastreada.
- Sabotagem com motivo, decidida por cada impostor pelo que ele vê e pelo jeito dele (um gosta de apagar as luzes, outro de reator/O2, outro de trancar portas): apaga as luzes quando alguém está sozinho perto de um impostor pronto, tranca a porta com a vítima dentro, puxa todo mundo para longe do próprio corpo com reator/O2, separa um grupo grande, corta as comunicações só quando tem gente nas câmeras ou no Admin, e trava a tripulação quando as tarefas estão quase no fim (uma vez por rodada). Cada impostor também tem seu jeito sobre o nível (uns usam mais duto, outros perseguem mais ou arriscam mais), e a IA recebe esse estilo.
- "Tava na elétrica" é onde a pessoa estava no fim, não o caminho todo: ter sido visto em outro lugar antes não vira "mentira". E se o bot viu a pessoa na sala que ela disse, ter sido vista saindo de lá depois também não (gente conta onde fez a tarefa, não onde parou quando a reunião começou). Mentira que fica na memória para as próximas reuniões só quando é clara. Quem passou perto do corpo e não citou recebe uma pergunta ("te vi no admin antes, você passou por lá?") em vez de acusação; só quem contou o trajeto todo ou disse "fiquei o tempo todo" é cobrado por omissão.
- Metamorfo e "não era eu": quando alguém acusado diz que pode ter sido o metamorfo disfarçado, cada bot confere o que sabe. Se viu a pessoa em outro lugar na mesma hora, estava com ela ou ela já provou ser tripulante, conclui que era o disfarce e defende ("eu vi o ciano no admin nessa hora, quem viram em armas era o metamorfo"). Sem confirmação, o "te vi lá" perde força e alguém pergunta quem confirma, mas ninguém é inocentado só por dizer isso. O tripulante bot acusado de estar onde não esteve (ou de um abate que não fez) também se defende assim.
- Impostor caçador: com o abate pronto e ninguém por perto, larga a tarefa falsa e vai até onde viu alguém sozinho há pouco (ou fica de tocaia numa sala isolada); se perde a vítima de vista, vai até onde a viu por último; e espera quando alguém acabou de vê-lo por ali.
- Anjo da Guarda como no jogo original: não é sorteado no começo (todo mundo vê só "Tripulante" na revelação). Quando um tripulante sem outra função morre, abatido ou ejetado, tem a chance configurada de virar anjo, na ordem das mortes, até a quantidade máxima (até 5). Vale para você e para os bots; você recebe o aviso depois da tela de morte e o botão "Proteger". O anjo bot que sabe quem o matou fica na cola do assassino e guarda o escudo para a hora em que ele fica sozinho com alguém.
- Acusações contra você com motivo de verdade: palpite ("meu instinto diz...") só sobre quem tem alguma pista, nunca sorteado; contra você, palpite, "vamos votar nele" do líder, resposta a "quem vocês acham?" e voto por instinto exigem pista real (o que o bot viu ou ouviu com motivo), não só a desconfiança aleatória de cada personalidade. "Estava me seguindo" não vale contra quem ficou a sós com o bot e não fez nada; "como sabia onde era o corpo?" só se você acertou a sala; quem pergunta onde você estava espera mais antes de estranhar o silêncio (gente digita devagar). Com a IA ligada, uma fala que acusa alguém sem base no que o bot sabe (ou conta um flagrante que ele não viu) não aparece. Em 48 partidas simuladas com você desistindo de tarefas e seguindo bots, você levou 0,24 acusação e 0,25 voto por reunião, contra 0,28 e 0,30 de um bot inocente; "tarefa falsa" contra você sumiu e "mentira" caiu à metade.
- A IA (quando ligada) recebe tudo isso: nas reuniões, as regras de reta final e de self report; no mapa, quem pegou tarefa falsa, quem viu morte nos vitais, quem viu o impostor por perto e quem foi visto sozinho há pouco.
- Movimento natural: cada bot tem sua faixa no corredor e sua preferência de caminho (nem todos pisam na mesma linha), desvia de quem está colado, escolhe um lado livre do painel ao fazer tarefa (quem chega com o painel ocupado dá um passo para o lado, sem ficar um em cima do outro), evita um pouco a tarefa onde já tem gente, e o impostor que não consegue matar sem testemunha se afasta em vez de ficar grudado na vítima.
- Tom do chat, em três níveis (vale para as frases dos bots, para a IA, para os fantasmas e para o lobby):
  - **Limpo**: o mais fácil de entender. Português completo, nomes oficiais das salas ("para a Cafeteria", "no Motor Superior"), "15 segundos", sem siglas, gírias ou termos em inglês.
  - **Casual**: como a maioria escreve num chat — minúsculas, vc/pq/tava/pra, kkk às vezes, skip e sus de vez em quando, salas com o nome comum (cafeteria, elétrica, depósito, armas). Sem gíria pesada e sem apelido de sala.
  - **Raiz**: o mais caótico — apelidos das salas (café, elec, nav, med, storage, weapons, upper), siglas (n, q, cmg, dps, mt, ss), gírias (mano, tlgd, tá ligado, slk, pqp, mds), kkkk e CAPS quando se exaltam. A gíria aparece na hora certa (susto, bronca, negação), não colada em qualquer frase.
- Conversa com cara de chat de verdade: quem responde a uma mensagem antiga diz com quem está falando ("verde, pq eu?"), quem já ouviu a mesma garantia só confirma ("também vi"), ninguém repete palavra por palavra o que outro disse, cada um dá o álibi do seu jeito (às vezes só "admin fazendo os fios"), quem estava junto não é acusado de "me seguir" e ninguém dá o álibi duas vezes (se perguntam de novo: "já falei, tava na elétrica").
- Chat dos fantasmas esperto: sabe quem foi ejetado e quem foi morto (ninguém pergunta "quem te matou" para quem saiu na votação, e quem morreu e diz "fui ejetado" é corrigido), conta quem matou quem, quem fez tarefa visual e de quem desconfiava quando estava vivo, quantos vivos e impostores sobram, e reage à votação dos vivos ("não!! foi o verde"). Morto não diz que vai voltar nem fala com os vivos; impostor morto admite. Cada fantasma sabe que está morto, onde está e o que está fazendo ("tô na elétrica fazendo task de fantasma"). Entre fantasmas ninguém é suspeito: se você (fantasma) escreve "me segue", "vem aqui" ou "vem na elétrica", ou faz o zigue-zague perto de um deles, ele vai junto de verdade; "pode ir" ou "valeu" libera. O que se fala muda o que eles fazem: "fica de olho no verde" (vão assistir o verde), "vamos fazer as tasks" (largam o que estavam fazendo e vão), "rosa, protege o azul" (o anjo vai até lá e põe o escudo; quem não é anjo avisa que não pode). Fantasma que sabe quem é o assassino vai assistir ele e conta no chat ("vou ficar de olho no verde"), e outros podem ir junto.
- Bots que terminam as tarefas não ficam parados: rondam as salas isoladas procurando corpos, olham câmeras e Admin, acompanham quem ainda tem tarefa ou vigiam um suspeito de longe. Andam como gente: caminhadas contínuas até onde vão, sem o "para-anda-para" de NPC e sem ficar dando voltas dentro da sala à toa. Ao chegar numa sala param e olham dali; seguindo alguém que anda, andam junto. Esperando alguém terminar uma tarefa, fazem a própria tarefa se ela estiver ali do lado e depois voltam a acompanhar; dois bots que seguem um ao outro não ficam parados se olhando (um assume a frente). Fantasma sem tarefa vai assistir alguém vivo em vez de ficar parado numa sala (e conta no chat: "tô na elétrica assistindo o verde").
- Narrador com descrição das salas, das sabotagens e do ambiente.

**Bots**
- Percebem só o que está no campo de visão ou nas câmeras.
- Lembram rotas, encontros, quem andava com quem, tarefas visuais, quem os seguiu e quem ficou parado no scanner sem escanear.
- Erram de verdade: às vezes não notam alguém, confundem cores parecidas ou lembram a sala errada.
- Têm 10 personalidades com fala, atenção, memória, limiar de voto e comportamento próprios: Analítico, Impulsivo, Falador, Silencioso, Caótico, Líder, Defensor, Cético, Seguidor e Inexperiente.
- Cada bot é único dentro da personalidade: tem os próprios números (mais ou menos atento, memória melhor ou pior, desconfia mais rápido ou mais devagar, acredita mais ou menos nos outros, fala mais ou menos, vota rápido ou por último, faz tarefa mais rápido ou mais devagar) e dois hábitos sorteados com peso pela personalidade: faz a tarefa visual primeiro, segue a lista na ordem, gosta de câmeras e Admin, faz ronda, anda junto, prefere tarefa sozinho, aperta o botão fácil. Os hábitos aparecem no relatório final, e a IA (quando ligada) recebe os traços de cada um.
- Detectores de tarefa falsa só acusam o que dá para ver: "terminou e a barra não subiu" só conta se o bot viu a pessoa sair da tarefa (não vale reunião no meio, nem quem largou para consertar sabotagem), e "parado no scanner sem escanear" só conta quem está fazendo a tarefa ali (não quem espera a vez). Quem já foi visto fazendo tarefa visual não é acusado por isso. Nas partidas de teste, as acusações falsas desses detectores (contra tripulantes) caíram de 23 em 60 partidas para 1 em 80.
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
- Chamado e resposta: quem chama vai na frente e quem aceita vai atrás (nunca o contrário). A resposta pode ser outro zigue-zague ("tô indo") ou simplesmente vir chegando perto; bots respondem assim entre si e para você. Quem responde entende o motivo pelo lugar: do lado de uma tarefa visual é "vem ver eu provar" (assiste a tarefa inteira); com o parceiro de dupla é "vem comigo". Quem vai na frente espera se o parceiro ficou para trás e chama de novo se ele se afastar.
- Duplas combinadas na reunião: "vamos ficar juntos", "fica comigo", "eu te sigo", "bora de dupla a partida toda". Quem confia aceita ("fechou, me segue então"), quem desconfia recusa; "eu te sigo" deixa o bot na frente, "me segue" deixa você na frente. No mapa a dupla anda junto (quem segue faz as tarefas que estiverem ali do lado) e vira álibi na reunião seguinte. Os bots também combinam duplas entre si. O combinado é público: se o parceiro morre, perguntam onde a dupla se separou, e o impostor esperto não mata o próprio parceiro.
- "Vou fazer os escudos", "faço o scan", "tenho lixo", "vou provar, me segue": sem prova forte contra, ganha o benefício da dúvida (principalmente no começo), e quem acompanha assiste a tarefa inteira e só sai quando você termina (vale também para quem te segue depois do zigue-zague). Nos testes, acusado por duas pessoas na 1ª reunião, oferecer prova deixa os votos em você em ~5% (só negando: 13–15%).
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
js/minds.js       mente própria: cada bot é uma IA separada (memória, plano no mapa, fala e voto)
js/ghosts.js      chat dos fantasmas: o que cada morto sabe e as falas deles
js/lobby.js       chat do lobby antes da partida
js/meeting.js     fluxo e interface da reunião (tablet), quadro de álibis e histórico
js/props.js       móveis sólidos e consoles: colisão, grade de navegação e posição dos consoles
js/audio.js       sons sintetizados: passos por piso, ambiente de cada sala e efeitos
js/decor.js       desenho das salas: pisos, paredes, móveis, consoles e partes animadas
js/render.js      desenho dos tripulantes, efeitos, tarefas visuais e névoa (2D)
js/render3d.js    mapa 3D: montagem em etapas, câmera, luzes, névoa de visão, efeitos, câmeras de segurança
js/r3d/kit.js     3D: texturas geradas, materiais e o montador que junta peças por material
js/r3d/world.js   3D: pisos, paredes, casco, portas, dutos, janelas e todos os móveis e consoles
js/r3d/actors.js  3D: tripulantes, fantasmas, corpos e pets
js/net.js         online: salas, anfitrião que roda a partida, amigos, segredos cifrados e banco
vendor/three.min.js  three.js (MIT), embutido
js/scenes.js      cenas de tela cheia: a sua morte e as aberturas das reuniões
js/minigames.js   tarefas e consertos de sabotagem
js/hud.js         HUD, mapa, câmeras, Admin, vitais e joystick
js/menu.js        título, criação, lobby, revelação e relatório final
js/main.js        laço do jogo, teclado e simulação para testes
tools/build.py    gera a versão de arquivo único em dist/
```

## Testes

- **Tela piscando no 3D** (versão 33): o ajuste automático de resolução trocava o tamanho da tela logo depois de desenhar, e aquele quadro ia para a tela preto (brilho medido de 97 para 17); agora a troca acontece antes de desenhar e com folga. As luzes que pulavam de lugar viraram luz calculada. Andando 3 cm, os pontos da tela que mudam muito caíram de 1,06% para 0,42% (Média) e de 1,43% para 0,34% (Alta), com a suavização de bordas, a sombra presa à grade e mais raios na borda da visão. A parede da frente agora some inteira perto de você (antes ficava uma tela pontilhada tremendo).
- **Som** (versão 34): o som 3D de fone (HRTF) estava ligado em todo computador; medido, ele muda o timbre em 10 a 12 dB entre graves e agudos, o que na caixa de som soa abafado e estranho. Agora é escolha (*Ouvindo por: Caixa de som / celular* ou *Fone de ouvido*), e na caixa sai o estéreo limpo. Passos dos outros só de quem você vê, sem batidas abafadas atrás da parede.
- **Som** (versão 33): três salas de eco rodando ao mesmo tempo custavam 19% do processador só para o som (numa máquina rápida); com um eco só, 10%. Passos dos outros sem HRTF e no máximo uns 6 por segundo. Gravação da saída numa partida: sem estouro, sem estalos, sem buracos.
- **3D** (medido sem placa de vídeo, o pior caso): antes, clicar em começar travava a tela por 8 a 11 s enquanto a nave era montada; agora ela é montada nos menus e o 3D aparece 0,2–0,3 s depois do clique, com o pior quadro do início em 0,1–0,15 s. Trocar a qualidade no meio da partida desligava o 3D (a tela de desenho ficava presa ao contexto descartado) — corrigido.
- **Online**: duas e três abas com uma imitação da sala ao vivo: listar e entrar na sala, papéis e tarefas iguais nos dois lados, movimento (mesma posição no anfitrião e no amigo), tarefa feita pelo amigo, efeitos, reunião com chat e voto do amigo, fim de jogo com as mesmas funções, histórico gravado; o mesmo com 25% das mensagens perdidas; amigo saindo na votação (o bot assume e vota) e anfitrião fechando a aba (o amigo volta ao menu). A presença maior ficou em ~0,5 KB (limite de 4 KB).

`AU.debug.simulate({ preset, players, impostors })` roda uma partida inteira só entre bots, sem interface, e devolve o resultado. Medido nesta versão (Clássico e Hardcore com 600 partidas cada, variação de uns ±2 pontos; amostras de 300 variam uns ±3):
- Clássico (10 jogadores, 2 impostores, nível Competente): a tripulação vence cerca de 38–40% (várias rodadas de 300 partidas); ~57–59% dos ejetados são impostores. As regras são as padrão do Among Us. Era ~44% até a correção da caçada: o impostor que decidia matar alguém parado a menos de ~2,2 tiles não fechava a distância até o alcance do abate (1,9) e desistia — agora chega perto e mata.
- Competitivo: ~35% (amostra de 150, antes da correção das rotas).
- Hardcore (visão 0,7, recarga de abate de 40 s, sem tarefa visual, sem confirmação, impostores Implacáveis): ~35–37%, perto do teto da faixa de 30–35% pedida. Medido de novo com calma na versão 28: a versão 27, medida 5 vezes com 300 partidas cada, deu 27%, 31%, 34%, 41% e 41% (média ~35%) — uma rodada só varia bem mais do que parece, então os números aqui são médias de várias rodadas. Parte dessa variação vinha dos bots: o tempo de caminho entre duas salas era calculado com um ponto sorteado em cada sala e guardado para a sessão inteira, e um sorteio ruim entortava as contas de álibi em todas as partidas seguintes. Agora é um ponto fixo (o lugar livre mais perto do centro da sala), igual em toda sessão. Outras recargas testadas: 40,5 s → 33%, 41 s → 35% (600 partidas cada), 41,5 s → 37%, 42,5 s → 38%, 45 s → 47%; com a recarga antiga de 35 s, ~28%.
- Medidos numa versão anterior: por nível de impostor, no Clássico, a tripulação vence cerca de 62% contra o Iniciante, 45% contra o Competente, 37% contra o Veterano e 34% contra o Implacável; no Casual, ~81%.
- Desempenho (celular simulado com CPU 4x mais lenta, 390x844): ao andar, o jogo gerava 4 ou 5 pedaços do mapa no mesmo quadro (40–58 ms); agora eles são preparados antes, um por quadro, e os canvas são reaproveitados — pior quadro de desenho de 58,6 para 34,6 ms, canvas criados de 145 para 25, quadros acima de 100 ms de 41 para 11. Na reunião o mapa não é mais desenhado por baixo (quadros da abertura de 100–160 para 55–110 ms) e o preparo dos bots é espalhado pela abertura (clique até a reunião abrir: de 293 para 102 ms na primeira reunião).
- Visão (100 partidas cada, Clássico): com a visão da tripulação em 0,25x/0,5x/1x/2x/5x, a tripulação vence 27%/32%/45%/62%/88%. Com a visão do impostor em 0,25x ela vence ~95% (antes 99%): o impostor que enxerga menos que a tripulação passa a lembrar por mais tempo de quem viu por perto, segue a vítima mais de perto e continua a caçada por até 2 s quando ela sai de vista; nos presets, onde o impostor enxerga igual ou mais, nada muda.
- Apagão em 100 partidas (Clássico): dura em média 12 s (mediana 9 s, 90% em até 27 s); ~1,8 bots vão ao painel; no escuro saem de 40% a 65% mais abates por minuto que no claro (duas amostras).
- Sabotagem de reator em 400 partidas entre bots: os dois painéis ficam cobertos em 11,3 s em média (antes da divisão, 13,3 s), e "um lado com 2 ou mais e o outro vazio" aos 10 s caiu de 64 para 5 casos.
