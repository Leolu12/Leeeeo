# Pai 2.0 — relatório do que está pronto

Situação em 06/10/2026, 01h20 (UTC). Branch `claude/pai-2-0-jogo`, PR #2 (rascunho).

**Para jogar agora:** https://claude.ai/artifact/EZKn686ZBrUi8ZttjUZaQQ (versão 8). O link é privado;
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
- Cada capítulo foi jogado de ponta a ponta pelo teste automático, sem erro (versão 8 do link).
- Checagem automática: todas as chaves de fatos e de conquistas existem; nenhuma frase promete que a
  IA não erra.
- **Prólogo:** revisado com calma, frase por frase.
- **Revisão rápida de todos os capítulos** (honestidade, segurança, gênero do filho ou filha,
  português, tom, coerência): umas 20 correções, todas testadas e publicadas na versão 8.
- **Revisão final (interrompida no meio para a pausa):** os agentes corrigiram as pendências de
  texto e ajustaram a encenação a partir das capturas de tela, como filha no celular. Essas mudanças
  estão salvas no git (commit da pausa), mas **ainda não estão no link**: o teste de confirmação no
  computador não terminou. No celular, como filha, todos os capítulos chegaram ao fim; em 6 deles o
  robô de teste não achou o botão "Ir até lá" por um instante (ver pendências).

## Falta (próxima sessão)

1. Terminar a revisão final: rodar o teste de cada capítulo no computador e no celular com as
   mudanças novas e publicar no link.
2. Conferir por que, no celular, o botão "Ir até lá ▶" às vezes demora a aparecer quando a
   exploração começa (capítulos 2, 5, 7, 8, 9 e 10).
3. Revisão completa de encenação e ritmo de cada capítulo, e do jogo inteiro em sequência
   (continuidade entre capítulos, números, português, visual).
4. Polimento final da arte (personagens e cenários) e revisão da trilha sonora.

O passo a passo para retomar está em `pai-2-0/dev/RETOMAR.md`.
