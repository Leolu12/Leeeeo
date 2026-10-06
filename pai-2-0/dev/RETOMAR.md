# Como retomar o Pai 2.0

Pausa em 06/10/2026, ~01h20 UTC, por fim dos créditos. Resumo do que está pronto: `dev/RELATORIO.md`. Tudo está na branch
`claude/pai-2-0-jogo` (PR #2, draft). Link de teste (privado):
https://claude.ai/artifact/EZKn686ZBrUi8ZttjUZaQQ

## Estado na pausa

| Parte | Estado |
|---|---|
| Motor 3D, UI, salvamento, layout (desktop / celular em pé / deitado) | Pronto |
| Fontes (154 fatos com selo) e Guia do CEO | Prontos |
| Prólogo | Pronto, testado e revisado |
| Capítulos 1–11 e Epílogo | Escritos por agentes; os agentes foram parados no meio do teste/revisão. Ver "Resultado dos testes" abaixo |
| Personagens (rig.js, chars.js), cenários (env-*.js), som (audio.js) | Funcionam; o polimento final de direção de arte e a revisão do som foram interrompidos |

## Resultado dos testes na pausa

(autoplay de ponta a ponta, `q=low`, opção 1 em todas as escolhas)

- **Todos os capítulos** (Prólogo, 1 a 11 e Epílogo) passaram de ponta a ponta, sem erro, e estão no
  link de teste (versão 7).
- Revisão rápida feita (só o crítico: honestidade, segurança, gênero do filho/filha, português, tom,
  coerência) em todos os capítulos; ~20 correções; todos re-testados com sucesso (link versão 8).
- Falta a revisão completa de cada capítulo (encenação, enquadramento, ritmo) e do jogo inteiro.

### Pontos anotados na revisão rápida (para a próxima rodada)
- cap2→cap3: se ele escreve o relatório na mão no cap2 (sai ~11h), o cap3 ainda abre com "Dez e meia".
- cap2: Dona Marta avisa que o conselho vai perguntar de IA, mas ele já disse isso no cap1 (repetição).
- Frases com fato real sem cartão de fonte ao lado: cap1 l.119 (Wharton), cap3 l.114 (fabricantes),
  cap4 (multa por citação inventada; usar tjsc_chatgpt_multa), cap7 (executivos mais otimistas: o
  cartão só aparece no fim), cap10 l.1150 (juiz mandou guardar conversas apagadas: retencao_judicial),
  cap11 l.114 (Klarna: klarna_recuo_atendimento).
- cap5: briefing da IA diz que Jorge tem "medo de perder o cliente" (IA lendo emoção de pessoa).
- cap6: números da DRE são da empresa fictícia; talvez marcar como exemplo.
- cap8: missão do exame manda valores reais (sem nome) para conta pessoal em chat temporário; revisar.
- epílogo: número fictício da pesquisa da Luana ("metade do time") logo antes do cartão
  microsoft_wti_byoai pode ser lido como o mesmo dado.
- Testar todos os capítulos também com --filha e --mobile (a revisão rápida rodou só filho/desktop).

## Como retomar

1. Copie `dev/` para a pasta de rascunho da nova sessão (os scripts usam caminhos absolutos da
   sessão antiga: troque o caminho `/tmp/claude-0/.../scratchpad` pelo novo).
   - `dev/docs/BRIEFS-CEO.md`: a bíblia (princípios de persuasão, regras de honestidade, encenação,
     estatísticas) e o roteiro de cada capítulo.
   - `dev/docs/API-CAPITULOS.md`: a API dos capítulos. `dev/docs/SPEC3D.md`: contrato da arte 3D.
   - `dev/docs/INTEGRACAO.md`: o plano da integração final (próximos passos).
   - `dev/pesquisa/*.json`: a pesquisa verificada. `dev/fontes_build/`: gera `js/content/fontes.js`.
   - `dev/tools/autoplay.js`: joga um capítulo sozinho (`node autoplay.js cap3 x [--mobile] [--filha]
     [--pick=random] [--shots=DIR] [--dump]`). `smoke.js`: testa o fluxo da tela inicial.
     `build-preview.py`: empacota a versão de teste para publicar como Artifact.
   - `dev/workflows/`: os scripts de workflow usados (capítulos e arte/som).
2. Capítulos que falharam no teste: rodar de novo o workflow de capítulos no modo `finish` para cada
   um (`wf-capitulos-v2.js`, args `[{"id":"capX","mode":"finish"}]`), um workflow por capítulo.
3. Capítulos novos que não tiveram a revisão independente (1, 3, 4, 7, 8, 9, Epílogo): rodar o modo
   `finish` também (ele faz a revisão dura e corrige).
4. Arte e som: rodar `wf-arte-som.js` com `["personagens"]`, `["casa"]`, `["trabalho"]`,
   `["especial"]`, `["som"]` (um workflow cada).
5. Depois: seguir `dev/docs/INTEGRACAO.md` (motor, jogo inteiro em sequência, revisão do jogo
   inteiro, QA visual, publicar).

Dica: com muitos agentes ao mesmo tempo a máquina (4 CPUs) fica muito lenta para os testes em
navegador. Uns 6 a 8 agentes por vez funcionam melhor.
