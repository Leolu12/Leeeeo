# Como retomar o Pai 2.0

Pausa em 06/10/2026, ~00h10 UTC, por fim dos créditos. Tudo está na branch
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

- Passaram de ponta a ponta, sem erro, e estão no link de teste (versão 2): **Prólogo, 1, 3, 6, 9 e 10**.
- Ainda testando quando a sessão pausou: 2, 4, 5, 7, 8, 11 e Epílogo (os arquivos estão completos;
  falta confirmar no teste). Resultado em `dev/RESULTADOS-TESTE.txt` se chegou a sair.
- Nenhum capítulo além do Prólogo teve a revisão final completa (os agentes pararam no meio).

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
