# Pai 2.0 — relatório do que está pronto

Situação em 06/10/2026, fim da tarde (UTC). Branch `claude/pai-2-0-jogo`, PR #2 (rascunho).

**Para jogar agora:** https://claude.ai/artifact/EZKn686ZBrUi8ZttjUZaQQ (versão 9). O link é privado;
para o seu pai abrir, compartilhe pelo menu Compartilhar da página. No computador também dá para
abrir `pai-2-0/index.html` direto no navegador.

## Pronto

### O jogo
- Aventura em **3D, em primeira pessoa**, em português, para computador, tablet e celular (em pé e
  deitado). Andar com teclado, controle na tela ou o botão **"Ir até lá ▶"**; olhar em 360° arrastando.
- Tela inicial com cenário em 3D; **preparação** para quem dá o presente: nome do pai, apelido,
  nome e gênero de quem dá o jogo, empresa e ramo (aparecem nos exemplos), tom de pele e recado final.
- **13 capítulos**, de 60 a 90 minutos ao todo, com salvamento automático a cada parte:

| | Capítulo | O que ensina |
|---|---|---|
| Prólogo | Terça-feira, 6h47 | O trato com o filho ou filha; as regras "eu confiro, eu decido, eu assino" |
| 1 | A Arte de Pedir | Pedir como quem explica serviço a um diretor novo |
| 2 | O Expediente | Onde a IA ajuda e onde não; decisões sobre pessoas são dele |
| 3 | O Contrato de 80 Páginas | Ler documentos longos com segurança e conferir as citações |
| 4 | Detector de Lorota | Conferir leis, números e notícias na fonte oficial |
| 5 | A Reunião Infinita | Pauta, transcrição com consentimento, ata com donos e prazos |
| 6 | Números na Mesa | A IA explica, a planilha calcula; pegar o erro de conta |
| 7 | O Conselheiro de Bolso | IA como parceira de debate: pré-mortem e advogado do diabo |
| 8 | Coisas da Casa | Usos do dia a dia, sem substituir médico |
| 9 | Aprender Qualquer Coisa | Aula particular; como a IA funciona por dentro |
| 10 | A Ligação | Golpe do falso diretor e da voz clonada; palavra-código da família |
| 11 | A Dúvida | O chefão: as objeções dele, respondidas sem exagero |
| Epílogo | Pai 2.0 | Regras da casa para a empresa, desafio de 7 dias e o recado |

- **Faísca**, a mascote, com animações e o lema "sou um estagiário muito rápido que às vezes fala
  besteira com confiança". Personagens: o pai, o filho ou filha, Dona Marta (conselho), os diretores
  Bia, Rafael, Luana e Tadeu, o Jorge, o golpista e A Dúvida.
- Minijogos em todos os capítulos, conquistas, escolhas com consequência.
- **Guia do CEO** (botão 📘): pedidos prontos para copiar, com quando usar, por que funciona e o
  cuidado de cada um. Abre por seções conforme ele avança.
- **154 fatos verificados**, cada um com fonte, ano, link, selo de quem fez a pesquisa
  (independente, governo, imprensa, consultoria, fornecedor, empresa) e o tamanho da amostra.
  Tela "Fontes e créditos" com a lista completa.
- Trilha e efeitos sonoros gerados pelo próprio jogo, sem arquivos.
- Opções: som, velocidade do texto, tamanho da letra, histórico de falas, escolher capítulo.
- Em computador ou celular mais fraco, a resolução baixa sozinha para não travar.

### Regras de conteúdo
- Toda estatística aparece com a fonte. O jogo nunca diz que a IA não erra.
- IA não substitui médico, advogado nem responsabilidade técnica.
- Nunca senhas, documentos ou códigos de SMS na IA. Decisões sobre pessoas são dele.

### Testes e revisões feitos
- **Revisão completa** (diretor de narrativa + QA, com testes no computador e no celular): Prólogo e
  capítulos 1 a 5 (os revisores do 2 ao 5 foram parados já nos testes finais, para acelerar; o teste
  final confirmou cada um). **Revisão focada** (texto, encenação, fontes, segurança): capítulos 6 a 11 e Epílogo.
  Antes disso, todos já tinham passado pela revisão crítica de honestidade, segurança, gênero e português.
- **Continuidade do jogo inteiro** conferida: horários (6h47 → 7h10 → 9h → 10h30 → 11h30 → 13h50 →
  16h30 → 18h → noite em casa → 22h30 → 0h12 → quarta, 7h), lugares, quem está presente e os fios da
  história (a aposta da louça, o relatório das 10h, o contrato do Tadeu, a reunião das 14h, a conta de
  luz, o Jorge, a falsa Bia, a palavra-código, o veredito no café).
- Repetição de "trinta anos" (aparecia ~35 vezes e supunha a carreira do pai) trocada por variações.
- **Arte polida:** personagens (cabelos, golas, barbas, expressões, golpista, Dúvida), casa, escritório,
  sala de reunião, carro, arena, sala de aula e tela inicial. **Som:** todos os efeitos e músicas usados
  existem.
- **Motor:** no celular em pé, a cena fica maior e ocupa a tela toda sem texto; botões e rótulos não
  saem da tela; o campo de visão se adapta à tela estreita; a resolução baixa sozinha em aparelho fraco;
  a cena é redesenhada na hora ao mudar de tamanho (sem piscar preto).
- **Teste final** de ponta a ponta, sem erro, de todos os capítulos: no computador (filho) e no
  celular (filha, escolhas aleatórias). Ver `dev/RESULTADOS-TESTE.txt`.

## O que ainda pode melhorar (opcional)
- Conferir no celular de verdade os momentos que, no teste automático com a máquina sobrecarregada,
  saíram escuros nas fotos (provavelmente só o tempo de transição).
- Uma revisão completa (de uma hora) também nos capítulos 6 a 11, como a feita do 1 ao 5.
- Trilha sonora: só foi conferida por nome; uma revisão de ouvido seria bem-vinda.
