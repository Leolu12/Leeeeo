# Como retomar o Pai 2.0

Resumo do que está pronto: `dev/RELATORIO.md`. Tudo está na branch
`claude/pai-2-0-jogo` (PR #2, draft). Link de teste (privado):
https://claude.ai/artifact/EZKn686ZBrUi8ZttjUZaQQ

## Estado atual (06/10/2026, fim da tarde UTC)

| Parte | Estado |
|---|---|
| Motor 3D, UI, salvamento, layout (desktop / celular em pé / deitado) | Pronto |
| Fontes (154 fatos com selo) e Guia do CEO | Prontos |
| Prólogo e capítulos 1–11 e Epílogo | Revisados (completa: Prólogo e 1–5; focada: 6–11 e Epílogo) e testados de ponta a ponta no computador (filho) e no celular (filha) — ver `dev/RESULTADOS-TESTE.txt` |
| Personagens, cenários | Polidos (direção de arte final) |
| Som | Funciona; nomes conferidos; sem revisão de ouvido |

O que ainda pode melhorar está no fim de `dev/RELATORIO.md`.

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
