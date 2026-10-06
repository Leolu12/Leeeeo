# Integração final — PAI 2.0

## Em andamento (lançados 23:20 UTC)
- Capítulos (1 workflow cada): cap1 cap3 cap4 cap7 cap8 cap9 epilogo = escrever → revisão independente;
  cap2 cap5 cap6 cap10 cap11 = finalizar + revisar.
- Arte: personagens (chars.js + rig.js), casa, trabalho (inclui carro), especial. Som: audio.js.

## Quando cada um terminar
1. Ler o relatório (engineIssues!). Rodar autoplay q=low do capítulo. Atualizar o link de teste
   (build-preview.py com snapshot testado; smoke.js desktop + mobile antes de publicar).
2. Commit + push do arquivo do capítulo.

## Depois de todos
A. Motor: corrigir todos os engineIssues reportados (um lugar só), sem quebrar os workarounds.
B. Jogo inteiro em sequência (Próximo ▶ de capítulo em capítulo), salvar/continuar, filho/filha,
   desktop 1366×768 + celular 390×844 em pé + deitado 844×390.
C. Revisão do jogo inteiro (workflow): dumps de texto de todos os capítulos →
   - o pai cético lendo do começo ao fim (o arco convence? repetição? cansa?);
   - continuidade (horários, nomes, fios: aposta, regras, Jorge, Dona Marta 10h, contrato, reunião 14h,
     conta de luz R$ 412, golpe, palavra-código, ceticismo do prólogo);
   - honestidade/segurança (cada fato com chave existente; nada de "IA não erra"; semáforo de dados
     coerente com o Guia; nada de decisão sobre pessoas pela IA);
   - revisor de português (vozes, gênero do filho/filha, ritmo).
   → achados com arquivo/linha → um corretor por capítulo → reteste.
D. QA visual: montagem com os momentos-chave de cada capítulo (desktop + celular); corrigir
   enquadramento, gente dentro de móvel, câmera em parede.
E. Publicar o link de teste completo; README; PR pronto (sair de draft só se o usuário pedir).
