/* PAI 2.0 — fontes.js
 * FONTES: todos os fatos verificados que o jogo pode citar. Uso nos capítulos:
 *   await G.fact('chave')            // um cartão
 *   await G.fact(['chave1','chave2']) // vários cartões juntos
 * Cada entrada: { titulo, texto, fonte, curta, url, ano, selo, amostra, tema }
 *   selo:  independente (pesquisa acadêmica/revisada/independente) · governo (governo, regulador, Justiça)
 *          imprensa (reportagem) · consultoria (PwC, KPMG, McKinsey, BCG, EY, IBM IBV…)
 *          fornecedor (empresa que vende IA ou o produto em questão) · empresa (a própria empresa contando)
 *   amostra: base do número, curta (aparece como "Base: …"); vazia quando não se aplica.
 *   tema: agrupa os créditos (P2.FONTES_ORDEM) e os rótulos em P2.FONTES_TEMAS.
 * Regras de honestidade: os números são exatamente os conferidos na pesquisa (scratchpad/research +
 * facts_round1.json), com a ressalva principal no próprio texto (autodeclarado, estudo do fabricante,
 * amostra pequena, global e não Brasil etc.). Fatos de confiança baixa ficaram de fora. O estudo de
 * balanços de Chicago entra só como "foi retirado" (estudo_balancos_retirado), sem os números dele.
 * Não invente números: se precisar de um dado que não está aqui, não use.
 *
 * ====================== CHAVES POR TEMA (chave — fonte curta — resumo) ======================
 *
 * [ceo] CEOs e empresas pelo mundo
 *   pwc_ceo_2026_retorno — PwC, 2026 — 56% dos CEOs ainda sem retorno financeiro da IA; só 12% com ganho em custo e receita (global)
 *   pwc_ceo_2025_expectativa — PwC, 2025 — PwC 2025: 56% viram ganho de tempo, mas só 34% viram o lucro que 46% esperavam
 *   kpmg_ceo_2025 — KPMG, 2025 — 71% dos CEOs de grandes empresas põem IA como prioridade máxima de investimento (sem o Brasil)
 *   ibm_ceo_2025 — IBM, 2025 — IBM: só 25% das iniciativas de IA deram o retorno esperado; 64% investiram por medo de ficar para trás
 *   mckinsey_estado_ia_2025 — McKinsey, 2025 — 88% das empresas usam IA, só 39% veem efeito no lucro; nas que lucram, a liderança se envolve 3x mais
 *   microsoft_wti_2025 — Microsoft, 2025 — Líderes à frente (67% conhecem agentes de IA, contra 40%); 52% dos líderes acham o trabalho caótico
 *   nadella_cinco_prompts — Nadella (Fortune), 2025 — Os 5 pedidos que Satya Nadella faz ao Copilot (preparar reunião, status de projeto, para onde vai o tempo)
 *   lutke_memo_shopify — Lütke (Shopify), 2025 — Memorando do CEO da Shopify: uso de IA vira expectativa básica e entra na avaliação
 *   huang_tutor_varias_ias — Huang (Fortune/CNN), 2025 — Jensen Huang (Nvidia): “arrume um tutor de IA”, pergunte a várias IAs e cobre “tem certeza?”
 *   jpmorgan_llm_suite_dimon — JPMorgan, 2025-2026 — JPMorgan levou IA a 200 mil funcionários num ambiente fechado; Dimon: IA é real, e os riscos também
 *   klarna_recuo_atendimento — Klarna, 2024-2025 — Klarna trocou 700 atendentes por IA e depois voltou a contratar: mais barato, mas qualidade mais baixa
 *   wharton_74 — Wharton/GBK, 2025 — Wharton/GBK: três em cada quatro líderes dizem ver retorno (percepção declarada; mais otimismo no topo)
 *   mit_nanda_95 — MIT NANDA, 2025 — O “95% dos projetos de IA fracassam” do MIT é preliminar, de base pequena e com números “direcionais”
 *
 * [brasil] IA no Brasil
 *   pwc_ceo_2026_brasil — PwC CEO Survey, 2026 — CEOs no Brasil: 37% com mais receita via IA (29% no mundo), mas 56% sem benefício financeiro
 *   pwc_ceo_2026_agenda — PwC CEO Survey, 2026 — CEO brasileiro gasta 57% da agenda no curto prazo e só 11% no longo prazo
 *   pwc_ceo_2026_pessoas — PwC, 2026 — 60% dos CEOs no Brasil esperam menos vagas de início de carreira; 37% dos profissionais temem pela função
 *   pwc_aptidao_2026 — PwC, 2026 — Só 9% das empresas brasileiras redesenham o trabalho para a IA (56% entre as líderes)
 *   ibge_pintec_industria — IBGE, 2025 — IBGE: indústrias com IA foram de 16,9% (2022) para 41,9% (2024)
 *   cetic_tic_empresas_2025 — Cetic.br, TIC Empresas 2025 — TIC Empresas: 17% das empresas brasileiras usam IA; entre as grandes, 50%
 *   microsoft_wti_byoai — Microsoft/LinkedIn, 2024 — No Brasil, 83% dos trabalhadores do conhecimento já usam IA e 74% levam a própria ferramenta
 *   ey_ceo_outlook_2026 — EY-Parthenon, 2026 — 72% de 50 CEOs brasileiros vão aumentar o investimento em IA (amostra pequena)
 *   ibgc_conselhos_ia — Capital Aberto/IBGC, 2026 — Só 20% dos conselhos discutem IA com regularidade; ata feita com IA não pode inventar conclusões
 *   itau_juridico_ia — Bloomberg Línea, 2025 — Itaú: 500+ usos de IA generativa e R$ 75 mi de economia em análises jurídicas (dado do banco)
 *   bradesco_bia — Bloomberg Línea, 2025 — Bradesco: IA orienta o negociador humano na cobrança; BIA resolve 82% no 1º nível (dado do banco)
 *   magalu_lu_whatsapp — Brazil Journal, 2025 — Magalu: vendas da Lu no WhatsApp com agentes de IA convertem 3x mais (dado inicial da empresa)
 *   google_ipsos — Google/Ipsos, 2025 — 54% dos brasileiros usaram app de IA em 12 meses (48% na média de 21 países) — pesquisa 2024
 *   google_ipsos_confianca — Google/Ipsos, 2026 — 74% dos brasileiros usaram IA generativa; 24% confiam “muito” nela (16% no mundo) — confiança demais?
 *   sebrae_2025 — Sebrae, 2025 — 44% dos donos de pequenos negócios já usaram IA; 51% ao ver a lista de ferramentas
 *   cetic_ia_45_59 — Cetic.br, TIC Domicílios 2025 — Só 18% dos internautas de 45 a 59 anos usaram IA generativa; 71% dos que não usam temem pela privacidade
 *
 * [comunicacao] Pedir e escrever bem
 *   google_21_palavras — Google, 2024 — Pedidos que funcionam têm ~21 palavras com contexto; as pessoas escrevem menos de 9
 *   sem_palavras_magicas — Wharton, 2025 — Ameaçar ou prometer gorjeta à IA não ajuda; “pense passo a passo” pouco ajuda nos modelos novos
 *   noy_zhang_escrita — MIT (Science), 2023 — Em textos do trabalho, a IA poupou 40% do tempo e subiu a qualidade em 18% (Science)
 *   chefe_ia_menos_sincero — Cardon & Coman, 2025 — Chefe que escreve parabéns com muita IA parece menos sincero (83% contra 40–52%)
 *
 * [produtividade] Tempo e produtividade
 *   harvard_bcg — Harvard/BCG, 2023 — Consultores com IA: 12,2% mais tarefas, 25,1% mais rápidos — só dentro da “fronteira” da IA
 *   harvard_bcg_fora — Harvard/BCG, 2023 — Fora da “fronteira”, quem usou IA acertou menos (60–70% contra 84,5%) por copiar sem questionar
 *   stanford_mit — Stanford/MIT (NBER), 2023 — No atendimento, IA deu +14% de produtividade; +34% para novatos, quase nada para os experientes
 *   dinamarques — Humlum & Vestergaard, 2025 — Dinamarca: chatbots pouparam só ~3% do tempo e não mexeram em salários (contraponto honesto)
 *   metr_dev — METR, 2025 — Programadores experientes ficaram 19% mais lentos com IA, mas acharam que ganharam 20% (2025)
 *   metr_2026 — METR, 2026 — METR 2026: com ferramentas novas, ganho estimado de 4% a 18%, ainda incerto
 *   copilot_campo_email — Microsoft Research/HBS, 2025 — Experimento sorteado em 66 empresas: 2 horas a menos de e-mail por semana; reuniões não encolheram
 *   governo_uk_26_minutos — Governo do Reino Unido, 2025 — Governo britânico: 26 minutos poupados por dia, segundo os próprios usuários
 *   governo_uk_sem_ganho — DBT (Reino Unido), 2025 — Ministério britânico: 72% satisfeitos, mas sem prova de mais produtividade; houve respostas inventadas
 *   caixa_de_entrada_117 — Microsoft, 2025 — 117 e-mails por dia, a maioria lida em menos de 1 minuto; interrupções a cada 2 min nos mais acionados
 *   pwc_2025 — PwC, 2025 — Vagas com habilidade em IA pagam 56% a mais; setores expostos à IA cresceram 3x mais em receita por pessoa
 *
 * [documentos] Documentos e contratos
 *   perdido_no_meio — Liu et al. (Stanford), 2023 — Em texto longo, a IA aproveita pior o que está no meio (“lost in the middle”)
 *   nolima_textos_longos — NoLiMa (Adobe/LMU), 2025 — Em textos de ~24 mil palavras, 11 de 13 modelos caíram para menos da metade do desempenho
 *   context_rot — Chroma, 2025 — Chroma: em 18 modelos, quanto maior o texto, mais instável a resposta — pergunte por partes
 *   anthropic_documento_no_topo — Anthropic, 2026 — Guia da Anthropic: documento no topo e pergunta no fim (até 30% melhor); peça os trechos literais
 *   vectara_resumo_2026 — Vectara, 2026 — Resumindo um texto dado, a IA ainda inventa detalhes em 1,8% a 24,2% dos resumos (set. 2026)
 *   stanford_juridico_rag — Stanford/Yale (JELS), 2025 — Ferramentas jurídicas “sem alucinação” erraram em 17% a 33% (menos que o GPT-4 sozinho)
 *   advogados_ia_experimento — Schwarcz et al., 2026 — IA acelerou tarefas jurídicas em 50–130%, mas a IA sem fontes inventou mais citações
 *   asic_resumos_humanos — ASIC/AWS, 2024 — Regulador australiano: resumos humanos 81%, da IA 47% (modelo de 2023) — IA podia criar mais trabalho
 *   gemini_notebook — Google, 2026 — Gemini Notebook (antigo NotebookLM): responde com base nos seus arquivos, com citações
 *   bbc_citacoes_alteradas — BBC, 2025 — BBC: 13% das citações em resumos de IA foram alteradas ou não existiam no original
 *
 * [limites] Onde a IA erra (e como conferir)
 *   newsguard — NewsGuard, 2025 — Chatbots repetiram boatos do noticiário em 35% das vezes (ago. 2025)
 *   ebu_45_por_cento — EBU/BBC, 2025 — 22 emissoras públicas: 45% das respostas de IA sobre notícias com problema sério
 *   buscadores_erram_fonte — CJR/Columbia, 2025 — Buscadores com IA erraram a fonte em mais de 60% das consultas, quase sempre sem admitir dúvida
 *   openai_chute — OpenAI, 2025 — OpenAI admite: a IA “chuta” porque os testes premiam o chute, não o “não sei”
 *   steyvers_resposta_longa — Steyvers et al. (UC Irvine), 2025 — Explicação longa aumenta a confiança na IA mesmo sem deixar a resposta mais certa
 *   lee_pensamento_critico — Lee et al. (CHI), 2025 — Quem confia mais na IA diz pensar menos criticamente; quem confia em si, pensa mais
 *   vies_automacao — Goddard et al. (JAMIA), 2012 — “Viés de automação”: confiar demais na máquina piora com pressa; ajuda deixar claro quem responde
 *   kim_incerteza — Kim et al. (FAccT), 2024 — Quando a IA diz “não tenho certeza, mas...”, as pessoas confiam menos e acertam mais
 *   cove_verificacao — Meta (ACL Findings), 2024 — Pedir que a IA verifique cada fato do rascunho reduz invenções (mas não zera)
 *   anthropic_tecnicas — Anthropic, 2026 — Guia do fabricante: deixe a IA dizer “não sei”, exija citação e repita a pergunta para comparar
 *   bajulacao_ia — Anthropic (ICLR), 2024 — A IA tende a concordar com quem pergunta; um “tem certeza?” fez modelos trocarem a resposta em 32–86%
 *   bajulacao_openai — OpenAI/TechCrunch, 2025 — OpenAI desfez uma atualização do ChatGPT que ficou “puxa-saco” demais (abr. 2025)
 *   avianca — Mata v. Avianca, 2023 — Mata v. Avianca: advogados multados em US$ 5.000 por citar 6 decisões inventadas pelo ChatGPT
 *   juiz_chatgpt — ConJur, 2023 — CNJ investigou juiz do TRF-1 cuja sentença citava jurisprudência inventada pelo ChatGPT (2023)
 *   tjsc_chatgpt_multa — TJSC, 2025 — TJSC multou em 10% da causa recurso com jurisprudência inventada pelo ChatGPT (2025)
 *   deloitte_reembolso — TechRadar/Cyber Daily, 2025 — Deloitte aceitou devolver parte de contrato de AU$ 440 mil por relatório com citações inventadas
 *   base_casos_alucinacao — Charlotin, 2026 — 2.149 decisões judiciais no mundo (41 no Brasil) já trataram de conteúdo inventado por IA
 *   ia_saude — Oxford/Nature Medicine, 2026 — Oxford: quem usou chatbot para sintomas não decidiu melhor; IA não substitui o médico
 *
 * [reunioes] Reuniões, voz e atas
 *   microsoft_reuniao_perdida — Microsoft, 2023 — Resumo de reunião perdida 3,8x mais rápido com IA, mas com 11 de 15 detalhes (12 à mão)
 *   transcricao_inventa — Koenecke et al. (Cornell), 2024 — Transcrição automática inventou frases inteiras em ~1% dos áudios; 38% dessas invenções eram danosas
 *   stanford_voz — Stanford (Ruan et al.), 2017 — Ditar é quase 3x mais rápido que digitar no celular (153 contra 52 palavras/min); releia antes de enviar
 *   teams_aviso_transcricao — Microsoft, 2026 — No Teams, todos veem o aviso quando a transcrição começa; peça concordância no início
 *
 * [numeros] Números e contas
 *   contas_frageis — Apple, 2024 — Trocar só os números de um problema derrubou o desempenho da IA; frase irrelevante, até −65%
 *   estudo_balancos_retirado — Chicago Booth (retirado), 2025 — O estudo famoso “IA lê balanço melhor que analista” foi retirado pelos autores (não use os números dele)
 *   reino_unido_copilot_tarefas — Governo do Reino Unido (DBT), 2025 — Governo britânico: IA resumiu e escreveu melhor, mas foi mais lenta e pior na análise em Excel
 *
 * [decisoes] Decisões e estratégia
 *   vaccaro_humano_ia — MIT (Nature Human Behaviour), 2024 — Humano + IA tende a ganhar ao criar e a perder ao decidir; ganha quando o humano é melhor na tarefa
 *   cybernetic_teammate_pg — Harvard/P&G, 2025 — P&G: uma pessoa com IA rendeu como uma dupla sem IA; a IA gera ideias, o humano escolhe
 *   executivos_previsao_otimista — HBR/IMD, 2025 — Executivos que consultaram o ChatGPT ficaram mais otimistas e erraram mais; os que ouviram colegas, menos
 *   ia_ceo_simulador — HBR/Cambridge, 2024 — Num simulador de CEO, o GPT-4o foi bem no lucro, mas foi “demitido” mais rápido nas crises
 *   varias_opinioes_ia — Doshi et al. (UCL), 2025 — Uma avaliação da IA oscila; somando várias (modelos, papéis, pedidos), fica parecida com a de especialistas
 *   advogado_do_diabo_ia — Purdue (IUI), 2024 — Uma IA “advogado do diabo” ajudou grupos a confiar na IA na medida certa
 *   pre_mortem_klein — Klein (HBR), 2007 — Pré-mortem de Gary Klein: imaginar que já deu errado ajuda a achar os motivos
 *   mentor_ia_quenia — Berkeley/Harvard, 2024 — Mentor de IA: +15% para quem já ia bem, −8% na receita de quem ia mal (Quênia)
 *
 * [pessoas] Pessoas e equipe
 *   bcg_lideres_vs_linha_de_frente — BCG, 2025 — Com apoio forte do chefe, a equipe que vê a IA com bons olhos sobe de 15% para 55%
 *   bcg_treino_5_horas — BCG, 2025 — Mais de 5 horas de treino: 79% viram usuários regulares, contra 67%; só 1/3 se diz bem treinado
 *   microsoft_uso_escondido — Microsoft/LinkedIn, 2024 — 52% escondem o uso de IA nas tarefas importantes; 53% temem parecer substituíveis
 *   microsoft_wti_power_users — Microsoft/LinkedIn, 2024 — Usuários avançados dizem poupar 30+ min/dia e ouviram mais do próprio CEO que IA importa (+61%)
 *   reif_penalidade_social — Reif, Larrick & Soll (PNAS), 2025 — Quem usa IA é visto como menos competente, mas a penalidade some se o avaliador também usa
 *   vies_curriculos — Univ. de Washington, 2024 — IA que ordenou currículos preferiu nomes de brancos (85%) e de homens (52%)
 *   vies_feedback_textio — Textio, 2023 — Feedback de desempenho escrito pelo ChatGPT repetiu estereótipos de gênero (teste de 2023)
 *
 * [aprender] Aprender e criar hábito
 *   tutor_ia — Harvard (Sci. Reports), 2025 — Em Harvard, um tutor de IA bem planejado dobrou o aprendizado numa aula de física
 *   mollick_10_horas — Mollick, 2023 — Ethan Mollick: são precisas umas 5 a 10 horas de uso real para “pegar o jeito”
 *   mollick_guia_2026 — Mollick, 2026 — Mollick (jul. 2026): delegue uma tarefa real e mantenha a aprovação para enviar, gastar ou apagar
 *   cetic_idosos — Cetic.br, TIC Domicílios 2025 — Nunca é tarde: brasileiros 60+ na internet foram de 16% (2015) para 54% (2025)
 *   lally_habito_66_dias — Lally et al. (UCL), 2010 — Hábito levou mediana de 66 dias (de 18 a 254) para ficar automático; falhar um dia não estraga
 *   singh_habito_manha — Singh et al., 2024 — Hábitos da manhã e escolhidos pela própria pessoa ficam mais fortes (medianas de 59 a 66 dias)
 *   gollwitzer_se_entao — Gollwitzer & Sheeran, 2006 — Planos “se X, então faço Y” ajudam a cumprir metas (efeito médio a grande)
 *
 * [seguranca] Golpes e segurança
 *   arup_videochamada — CNN, 2024 — Arup: videochamada com “diretor financeiro” e colegas falsos (deepfake) custou US$ 25,6 milhões
 *   arup_45_minutos — WEF/Arup, 2025 — O diretor de TI da Arup fez um deepfake de si mesmo em 45 minutos com programas gratuitos
 *   wpp_teams — The Guardian, 2024 — Golpistas imitaram o CEO da WPP com foto, voz clonada e reunião no Teams; não deu certo
 *   ferrari_livro — MIT Sloan/Bloomberg, 2024 — Ferrari: executivo derrubou o falso CEO perguntando o título de um livro que só o CEO saberia
 *   crosetto_moratti — Reuters, 2025 — Itália: voz clonada de ministro enganou Massimo Moratti (quase € 1 milhão, depois congelado)
 *   singapura_rapidez — Polícia de Singapura, 2025 — Singapura: diretor caiu num falso CEO por vídeo, avisou o banco no dia seguinte e o dinheiro foi bloqueado
 *   wiz_voz_de_palco — TechCrunch, 2024 — Wiz: clone usou a “voz de palco” do CEO e a equipe notou — sorte, não método
 *   lastpass_canal — LastPass, 2024 — LastPass: canal fora do normal (WhatsApp) e pressa forçada denunciaram a voz falsa do CEO
 *   mcafee_voz — McAfee, 2023 — 3 a 4 segundos de voz bastaram para um clone com ~85% de semelhança; 77% das vítimas perderam dinheiro
 *   ucl_ouvido_falha — UCL (PLOS ONE), 2023 — Mesmo avisadas, pessoas só reconheceram voz falsa em 73% das vezes — o ouvido não é defesa
 *   golpe_voz_tecmundo — TecMundo, 2026 — Especialistas: ~15 segundos de áudio já bastam para imitar uma voz; valide por outro canal
 *   golpe_voz_canaltech — Canaltech, 2023 — Pai brasileiro perdeu R$ 600 com a voz do filho clonada; não havia palavra-chave combinada
 *   fbi_palavra_secreta — FBI, 2024 — FBI: combine uma palavra secreta com a família e ligue de volta para o número conhecido
 *   fbi_ic3_2025 — FBI, 2026 — FBI 2025: golpe do “e-mail do chefe” custou US$ 3,05 bilhões; queixas com IA, US$ 893 milhões
 *   golpes_brasil — DataSenado, 2024 — DataSenado: 24% dos brasileiros perderam dinheiro com golpe digital em 12 meses
 *   banco_nunca_pede — Febraban, 2026 — Febraban: banco nunca pede senha, código, token ou Pix por telefone
 *   pix_contestacao — Agência Brasil/BC, 2025 — Botão de contestação do Pix (desde 1º/10/2025): vítima de golpe pede devolução no app do banco
 *   gisele_modo_selva — SBT News, 2025 — Quadrilha usava deepfakes de famosas em anúncios falsos; movimentou mais de R$ 20 milhões
 *   owasp_injecao — OWASP, 2025 — OWASP: “injeção de instruções” é o risco nº 1 — documentos podem trazer ordens escondidas para a IA
 *   echoleak_copilot — Fortune/NIST, 2025 — EchoLeak: e-mail com ordens escondidas fez o Copilot vazar dados em teste (falha crítica, já corrigida)
 *
 * [privacidade] Dados, privacidade e leis
 *   samsung — Bloomberg/TecMundo, 2023 — Engenheiros da Samsung colaram código secreto no ChatGPT; a empresa proibiu a IA temporariamente
 *   cisco_dados_colados — Cisco, 2024 — 48% dos profissionais de segurança já colaram informação interna da empresa em IA
 *   ohbehave_2025 — NCA/CybSafe, 2025 — 43% já compartilharam informação sensível do trabalho com IA sem o empregador saber
 *   ms_byoai — Microsoft/LinkedIn, 2024 — 78% de quem usa IA no trabalho leva ferramenta própria; só 39% foram treinados pela empresa
 *   ibm_ia_na_sombra — IBM, 2025 — “IA na sombra” causou 1 em 5 vazamentos e encareceu cada um em US$ 670 mil, em média
 *   planos_empresariais — OpenAI/Anthropic/Google, 2025-2026 — Planos para empresas (OpenAI, Google Workspace, Anthropic) não treinam com dados da empresa por padrão
 *   claude_treino_escolha — Anthropic, 2025 — No Claude pessoal, treinar com suas conversas virou escolha (5 anos guardado se aceitar, 30 dias se não)
 *   gemini_revisores_humanos — Google, 2026 — No Gemini pessoal, revisores humanos podem ler parte das conversas (guardadas até 3 anos)
 *   privacidade_config — Canaltech, 2026 — Como desligar o treino no ChatGPT pessoal e quando usar o chat temporário
 *   copilot_empresa_privacidade — Microsoft, 2026 — No Copilot da empresa, dados não treinam o modelo e a IA só vê o que cada pessoa já pode ver
 *   retencao_judicial — OpenAI, 2025 — Ordem judicial nos EUA obrigou a OpenAI a guardar até conversas apagadas (2025)
 *   lgpd_dados_e_multa — LGPD, 2018 — LGPD: o que é dado pessoal e sensível; multa de até 2% do faturamento, limitada a R$ 50 mi
 *   anpd_prompt_lgpd — ANPD, 2024; LGPD — ANPD: colar dados de outras pessoas na IA pode tornar você responsável por eles pela LGPD
 *   anpd_meta_suspensao — Teletime/Mobile Time, 2024 — ANPD suspendeu o treino de IA da Meta com dados de brasileiros e liberou após plano de ajustes
 *   pl2338_status — Câmara/Mobile Time, 2026 — PL 2.338 (marco da IA) ainda não votado na Câmara em out. 2026; RH com IA seria “alto risco”
 *   oab_recomendacao_ia — OAB, 2024 — OAB (nov. 2024): regras para usar IA com sigilo, fornecedor sem treino, revisão e política interna
 *
 * [persuasao] A ciência por trás deste jogo
 *   dietvorst_erro_maquina — Dietvorst et al., 2015 — Aversão a algoritmo: depois de ver a máquina errar, a pessoa prefere o humano, mesmo que erre mais
 *   dietvorst_poder_editar — Dietvorst et al., 2018 — Quando pode ajustar o resultado, a pessoa aceita a máquina (32% → 73–76%) — a “caneta vermelha”
 *   logg_especialistas_descontam — Logg, Minson & Moore, 2019 — Especialistas descontam conselho de “algoritmo” mais que leigos — às vezes errando mais
 *   davis_tam_utilidade — Davis, 1989 — Modelo TAM: ser útil pesa mais que ser fácil na decisão de usar uma tecnologia
 *   utaut_idade_esforco — Venkatesh et al. (UTAUT), 2003 — UTAUT: com mais idade, o esforço percebido e o apoio disponível pesam mais
 *   utaut2_habito — Venkatesh, Thong & Xu, 2012 — UTAUT2: depois que vira hábito, o hábito manda — mais forte em homens mais velhos e experientes
 *   morris_venkatesh_idade — Morris & Venkatesh, 2000 — Trabalhadores mais velhos adotam tecnologia guiados por quem respeitam e pela sensação de controle
 *   czaja_create_ansiedade — Czaja et al. (CREATE), 2006 — Ansiedade e autoconfiança explicam parte da distância entre gerações; treino sem pressa ajuda
 *   rogers_cinco_atributos — Rogers, 2003; Tornatzky & Klein, 1982 — Rogers: vantagem, compatibilidade, simplicidade, poder testar e ver resultado explicam a adoção
 *   okeefe_dois_lados — O'Keefe, 1999 — Mostrar o lado contrário só convence se você responder a ele (limite + antídoto)
 *   van_laer_transporte — van Laer et al., 2014 — Histórias envolventes mudam atitudes e reduzem o senso crítico; a idade não faz diferença
 *   braddock_dillard_narrativa — Braddock & Dillard, 2016 — Narrativas estão ligadas a mudanças de crença, atitude, intenção e comportamento
 *   wouters_jogos_serios — Wouters et al., 2013 — Jogos sérios ensinam um pouco mais que aulas; visual esquemático funciona melhor que realista
 *   sitzmann_simulacao — Sitzmann, 2011 — Simulações deixaram a autoconfiança 20% maior em treinamentos profissionais
 *   bad_news_inoculacao — Roozenbeek & van der Linden, 2019 — Jogar no papel do enganador deixou as pessoas mais resistentes a notícias falsas (inoculação)
 *   goldstein_norma_local — Goldstein, Cialdini & Griskevicius, 2008 — O exemplo de gente parecida convence mais (norma local: “hóspedes deste quarto”)
 *   li_shi_reatancia — Li & Shi, 2025 — Tom de ordem (“você tem que”) gera raiva e resistência — convide, não mande
 *
 * Chaves antigas que continuam funcionando (apelidos de fatos repetidos, mesmos dados):
 *   bbc_ebu_noticias → ebu_45_por_cento
 *   whisper_transcricao_inventa → transcricao_inventa
 *   resumo_reuniao_microsoft → microsoft_reuniao_perdida
 *   bajulacao_estudo → bajulacao_ia
 *   pwc_ceos_retorno_2026 → pwc_ceo_2026_retorno
 *   ibm_ceos_medo_de_ficar_para_tras → ibm_ceo_2025
 *   traga_sua_propria_ia → ms_byoai
 *   ia_sombra_ibm → ibm_ia_na_sombra
 *   chatgpt_empresarial_sem_treino → planos_empresariais
 *   ia_le_balanco → estudo_balancos_retirado
 *   bcg_lideranca_treino → bcg_lideres_vs_linha_de_frente
 */
(function () {
  'use strict';
  const P2 = (window.P2 = window.P2 || {});

  const FONTES = {
    // ================================================================ CEOs e empresas pelo mundo (ceo)
    pwc_ceo_2026_retorno: {
      titulo: 'A maioria dos CEOs ainda não viu dinheiro voltar da IA',
      texto: 'Na pesquisa global da PwC com 4.454 CEOs (set. a nov. 2025), 56% disseram não ter visto benefício financeiro significativo da IA até agora. 33% viram ganho em custo ou em receita, e só 12% viram os dois. Quem tinha bases sólidas, como regras de uso responsável, teve 3 vezes mais chance de relatar retorno. Autodeclarado.',
      fonte: 'PwC, 29ª Global CEO Survey, comunicado global de 19 jan. 2026',
      curta: 'PwC, 2026',
      url: 'https://www.pwc.com/gx/en/news-room/press-releases/2026/pwc-2026-global-ceo-survey.html',
      ano: 2026, selo: 'consultoria', amostra: '4.454 CEOs, 95 países', tema: 'ceo',
    },
    pwc_ceo_2025_expectativa: {
      titulo: 'A IA poupou tempo, mas o lucro ficou abaixo da promessa',
      texto: 'Na pesquisa da PwC de janeiro de 2025, 56% dos CEOs disseram que a IA generativa trouxe ganho de eficiência no tempo dos funcionários, e 32% viram a receita subir. Em 2024, 46% esperavam mais lucro com ela; um ano depois, só 34% disseram ter visto esse ganho. O ganho mais citado foi tempo, não dinheiro.',
      fonte: 'PwC, 28ª Global CEO Survey, comunicado de 20 jan. 2025',
      curta: 'PwC, 2025',
      url: 'https://www.pwc.com/gx/en/news-room/press-releases/2025/pwc-2025-global-ceo-survey.html',
      ano: 2025, selo: 'consultoria', amostra: '4.701 CEOs, 109 países', tema: 'ceo',
    },
    kpmg_ceo_2025: {
      titulo: '7 em cada 10 grandes CEOs põem a IA no topo dos investimentos',
      texto: 'A KPMG ouviu 1.350 CEOs de empresas com faturamento acima de US$ 500 milhões (ago. e set. 2025). 71% disseram que a IA é prioridade máxima de investimento (eram 64% um ano antes), e 67% esperam retorno em um a três anos. O Brasil não estava entre os 11 países. Mostra o que planejam, não o que já ganharam.',
      fonte: 'KPMG International, KPMG 2025 CEO Outlook (11ª edição)',
      curta: 'KPMG, 2025',
      url: 'https://assets.kpmg.com/content/dam/kpmgsites/my/pdf/2025/11/ceo-outlook-2025.pdf',
      ano: 2025, selo: 'consultoria', amostra: '1.350 CEOs de grandes empresas, 11 países', tema: 'ceo',
    },
    ibm_ceo_2025: {
      titulo: 'Só 1 em cada 4 projetos de IA deu o retorno esperado',
      texto: 'Num estudo da IBM com 2.000 CEOs de 33 países (fev. a abr. 2025), eles disseram que só 25% das iniciativas de IA entregaram o retorno esperado e só 16% foram ampliadas para a empresa toda. E 64% admitiram que o medo de ficar para trás os fez investir antes de entender o valor. A IBM vende IA e mesmo assim publicou isso.',
      fonte: 'IBM Institute for Business Value e Oxford Economics, 2025 CEO Study, comunicado de 6 maio 2025',
      curta: 'IBM, 2025',
      url: 'https://newsroom.ibm.com/2025-05-06-ibm-study-ceos-double-down-on-ai-while-navigating-enterprise-hurdles',
      ano: 2025, selo: 'consultoria', amostra: '2.000 CEOs, 33 países', tema: 'ceo',
    },
    mckinsey_estado_ia_2025: {
      titulo: 'Quase toda empresa usa IA; poucas já lucram de verdade',
      texto: 'No levantamento anual da McKinsey (nov. 2025), 88% das organizações usavam IA em pelo menos uma área, mas quase dois terços não tinham ampliado o uso para a empresa toda. Só 39% viam algum efeito no lucro operacional, quase sempre abaixo de 5%. No pequeno grupo que lucra (cerca de 6%), a alta liderança se envolvia 3 vezes mais.',
      fonte: 'McKinsey & Company (QuantumBlack), The state of AI in 2025, 5 nov. 2025 (números conferidos na reportagem do IT Brief)',
      curta: 'McKinsey, 2025',
      url: 'https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai',
      ano: 2025, selo: 'consultoria', amostra: 'pesquisa global, autodeclarada', tema: 'ceo',
    },
    microsoft_wti_2025: {
      titulo: 'Líderes estão à frente, e o trabalho parece caótico',
      texto: 'Na pesquisa da Microsoft com 31.000 trabalhadores em 31 países, Brasil incluído (fev. e mar. 2025), 67% dos líderes conheciam os agentes de IA, contra 40% dos funcionários. E 52% dos líderes (48% dos funcionários) disseram que o trabalho parece caótico e fragmentado. A Microsoft vende IA, e a pesquisa também é vitrine.',
      fonte: 'Microsoft, 2025 Work Trend Index Annual Report: The Year the Frontier Firm Is Born, 23 abr. 2025',
      curta: 'Microsoft, 2025',
      url: 'https://www.microsoft.com/en-us/worklab/work-trend-index/2025-the-year-the-frontier-firm-is-born',
      ano: 2025, selo: 'fornecedor', amostra: '31.000 trabalhadores, 31 países', tema: 'ceo',
    },
    nadella_cinco_prompts: {
      titulo: 'Os pedidos que o CEO da Microsoft faz à IA',
      texto: 'Em agosto de 2025, Satya Nadella publicou os cinco pedidos que faz ao Copilot, quase todos sobre reuniões e projetos. Um deles: “Com base nas minhas interações com [pessoa], me dê 5 coisas que devem estar na cabeça dela para a nossa próxima reunião.” Ressalva: ele vende o Copilot, ligado ao e-mail e à agenda dele.',
      fonte: 'Satya Nadella, posts no X e no LinkedIn (fim de ago. 2025), reproduzidos pela Fortune (2 set. 2025) e pela Tech.co',
      curta: 'Nadella (Fortune), 2025',
      url: 'https://fortune.com/2025/09/02/billionaire-microsoft-ceo-satya-nadella-reveals-ai-prompts-superchage-everyday-workflow-gpt-5-co-pilot-prompting-success',
      ano: 2025, selo: 'fornecedor', amostra: '1 relato pessoal', tema: 'ceo',
    },
    lutke_memo_shopify: {
      titulo: 'CEO da Shopify: usar IA virou expectativa básica',
      texto: 'Em abril de 2025, Tobi Lütke, CEO da Shopify, publicou um memorando interno: o “uso reflexivo de IA” virou expectativa básica. Antes de pedir mais gente, as equipes precisam mostrar por que a IA não resolve, e o uso entrou na avaliação de desempenho. Para ele, usar bem a IA se aprende usando muito. É uma empresa de tecnologia.',
      fonte: 'Tobi Lütke (CEO da Shopify), memorando publicado no X em 7 abr. 2025; citações conferidas no The Verge',
      curta: 'Lütke (Shopify), 2025',
      url: 'https://x.com/tobi/status/1909251946235437514',
      ano: 2025, selo: 'empresa', amostra: '1 empresa', tema: 'ceo',
    },
    huang_tutor_varias_ias: {
      titulo: 'CEO da Nvidia: “arrume um tutor de IA” e consulte mais de uma',
      texto: 'Jensen Huang diz que usa IA “literalmente todos os dias” e recomenda: “arrume um tutor de IA agora mesmo”. Ele faz a mesma pergunta a várias IAs e pede que comparem as respostas, como quem ouve três médicos. E costuma perguntar: “Tem certeza de que essa é a melhor resposta que você pode dar?” A Nvidia lucra vendendo chips de IA.',
      fonte: 'Fortune (2 fev. 2025), entrevista de Jensen Huang a Cleo Abram; Business Insider via AOL (jul. 2025), entrevista à CNN',
      curta: 'Huang (Fortune/CNN), 2025',
      url: 'https://www.aol.com/jensen-huang-explains-uses-different-053336076.html',
      ano: 2025, selo: 'fornecedor', amostra: '1 relato pessoal', tema: 'ceo',
    },
    jpmorgan_llm_suite_dimon: {
      titulo: 'JPMorgan: IA para 200 mil funcionários, num ambiente fechado',
      texto: 'Em 2024, o JPMorgan, maior banco dos EUA, levou sua ferramenta interna de IA a mais de 200 mil funcionários, num “ambiente controlado que protege os dados de clientes e da empresa”. Em abril de 2026, Jamie Dimon escreveu que a importância da IA “é real”, mas alertou para riscos sérios, como deepfakes e ataques cibernéticos.',
      fonte: 'JPMorganChase, Relatório Anual 2024 (carta da COO) e carta de Jamie Dimon aos acionistas de 6 abr. 2026, arquivados na SEC',
      curta: 'JPMorgan, 2025-2026',
      url: 'https://www.sec.gov/Archives/edgar/data/19617/000162828026023927/annualreport-2025.pdf',
      ano: 2026, selo: 'empresa', amostra: '1 empresa', tema: 'ceo',
    },
    klarna_recuo_atendimento: {
      titulo: 'A Klarna trocou atendentes por IA e depois voltou atrás',
      texto: 'Em fevereiro de 2024, a Klarna disse que seu assistente de IA, no primeiro mês, fazia o trabalho de 700 atendentes. Em maio de 2025, o CEO contou à Bloomberg que voltou a contratar pessoas: a IA saía mais barata, mas com “qualidade mais baixa”. Agora o cliente sempre pode falar com um humano. São números da própria empresa.',
      fonte: 'Klarna, comunicado de 27 fev. 2024; Entrepreneur (9 maio 2025), sobre entrevista do CEO à Bloomberg',
      curta: 'Klarna, 2024-2025',
      url: 'https://www.entrepreneur.com/business-news/klarna-ceo-reverses-course-by-hiring-more-humans-not-ai/491396',
      ano: 2025, selo: 'empresa', amostra: '1 empresa', tema: 'ceo',
    },
    wharton_74: {
      titulo: 'Três em cada quatro líderes dizem ver retorno',
      texto: 'Numa pesquisa online da Wharton e da GBK (out. 2025) com cerca de 800 líderes de empresas americanas com mais de 1.000 funcionários, três em cada quatro disseram ver retorno positivo da IA generativa. É percepção declarada, e o otimismo cresce com o cargo: 81% entre vice-presidentes para cima, contra 69% na média gerência.',
      fonte: 'Wharton Human-AI Research e GBK Collective, Accountable Acceleration: Gen AI Fast-Tracks Into the Enterprise, out. 2025',
      curta: 'Wharton/GBK, 2025',
      url: 'https://ai.wharton.upenn.edu/wp-content/uploads/2025/10/2025-Wharton-GBK-AI-Adoption-Report_Executive-Summary.pdf',
      ano: 2025, selo: 'independente', amostra: 'cerca de 800 líderes, EUA', tema: 'ceo',
    },
    mit_nanda_95: {
      titulo: 'O famoso “95% dos projetos de IA fracassam”, visto de perto',
      texto: 'Um relatório preliminar do projeto NANDA, do MIT (jul. 2025), disse que 95% das organizações não tinham retorno com IA generativa. A base é pequena (52 entrevistas e 153 questionários), os próprios autores chamam os números de “direcionais” e a revisão foi interna. Até manchete contra a IA precisa ser conferida.',
      fonte: 'Challapally, Pease, Raskar e Chari, The GenAI Divide: State of AI in Business 2025, MIT NANDA, jul. 2025 (cópia hospedada por terceiros)',
      curta: 'MIT NANDA, 2025',
      url: 'https://mlq.ai/media/quarterly_decks/v0.1_State_of_AI_in_Business_2025_Report.pdf',
      ano: 2025, selo: 'independente', amostra: '52 entrevistas e 153 questionários', tema: 'ceo',
    },
    // ================================================================ IA no Brasil (brasil)
    pwc_ceo_2026_brasil: {
      titulo: 'CEOs brasileiros: um terço já ganha com IA, mas a maioria ainda não',
      texto: 'Na 29ª CEO Survey da PwC (set. a nov. 2025), 37% dos CEOs no Brasil disseram que a IA aumentou a receita (29% no mundo) e 28% que reduziu custos (26% no mundo). Mesmo assim, segundo a PwC Brasil, 56% dos líderes brasileiros não tiveram benefício financeiro com a IA no último ano. É começo promissor, não milagre.',
      fonte: 'PwC Brasil, 29ª CEO Survey (jan. 2026) e release da PwC Brasil de 1º jun. 2026',
      curta: 'PwC CEO Survey, 2026',
      url: 'https://www.pwc.com.br/pt/estudos/preocupacoes-ceos/ceo-survey/2026/29-ceo-survey.pdf',
      ano: 2026, selo: 'consultoria', amostra: 'CEOs no Brasil (nº não divulgado)', tema: 'brasil',
    },
    pwc_ceo_2026_agenda: {
      titulo: 'O CEO brasileiro passa a maior parte do tempo apagando incêndio',
      texto: 'Na mesma pesquisa da PwC, os CEOs no Brasil disseram dedicar em média 57% da agenda a assuntos de menos de um ano (47% no mundo) e só 11% ao longo prazo (16% no mundo): cinco vezes mais tempo no curto prazo. A PwC sugere começar a mudança pelo jeito de usar o próprio tempo. São estimativas dos próprios CEOs.',
      fonte: 'PwC Brasil, 29ª CEO Survey, capítulo “Como escapar da opressão do curto prazo” (jan. 2026)',
      curta: 'PwC CEO Survey, 2026',
      url: 'https://www.pwc.com.br/pt/estudos/preocupacoes-ceos/ceo-survey/2026/29-ceo-survey.pdf',
      ano: 2026, selo: 'consultoria', amostra: 'CEOs no Brasil (estimativa própria)', tema: 'brasil',
    },
    pwc_ceo_2026_pessoas: {
      titulo: 'A IA já mexe com a equipe, e a equipe sabe disso',
      texto: 'Segundo a PwC, 60% dos CEOs no Brasil (49% no mundo) esperam precisar de menos profissionais em início de carreira em três anos por causa da IA, e 28% esperam contratar mais. Numa pesquisa da PwC com 50 mil profissionais, 26% dos brasileiros usavam IA generativa todo dia e 37% temiam o impacto dela no próprio trabalho.',
      fonte: 'PwC Brasil, 29ª CEO Survey (jan. 2026), citando a pesquisa PwC Hopes and Fears 2025',
      curta: 'PwC, 2026',
      url: 'https://www.pwc.com.br/pt/estudos/preocupacoes-ceos/ceo-survey/2026/29-ceo-survey.pdf',
      ano: 2026, selo: 'consultoria', amostra: 'CEOs no Brasil; 50 mil profissionais no mundo', tema: 'brasil',
    },
    pwc_aptidao_2026: {
      titulo: 'O ganho vem de redesenhar o trabalho, não de comprar a ferramenta',
      texto: 'Num estudo da PwC com 1.217 organizações (jun. 2026), os 20% “líderes em IA” concentram mais de 70% do valor gerado. No Brasil, só 9% das empresas redesenham o fluxo de trabalho para incorporar a IA, contra 56% entre as líderes. A maioria põe a IA “por cima” dos processos antigos. Cuidado: a PwC vende justamente esse serviço.',
      fonte: 'PwC Brasil, release do estudo “IA na estratégia: crescer ou ficar para trás”, 1º jun. 2026',
      curta: 'PwC, 2026',
      url: 'https://www.pwc.com.br/pt/sala-de-imprensa/release/2026/pwc-revela-o-que-as-empresas-lideres-no-uso-da-ia-fazem-para-se-diferenciar.html',
      ano: 2026, selo: 'consultoria', amostra: '1.217 organizações, 25 setores', tema: 'brasil',
    },
    ibge_pintec_industria: {
      titulo: 'Na indústria, o uso de IA mais que dobrou em dois anos',
      texto: 'Segundo o IBGE, 41,9% das indústrias com 100 ou mais empregados usaram inteligência artificial em 2024, contra 16,9% em 2022. As áreas que mais usam são a administração (87,9%) e a comercial (75,2%). Aqui “IA” é ampla, não só a que conversa e escreve, e o universo é só a indústria média e grande.',
      fonte: 'IBGE, PINTEC Semestral (com ABDI e UFRJ), Agência de Notícias IBGE, 24 set. 2025',
      curta: 'IBGE, 2025',
      url: 'https://agenciadenoticias.ibge.gov.br/agencia-noticias/2012-agencia-noticias/noticias/44551-de-2022-a-2024-percentual-de-empresas-industriais-utilizando-inteligencia-artificial-subiu-de-16-9-para-41-9',
      ano: 2025, selo: 'governo', amostra: 'indústrias com 100+ empregados', tema: 'brasil',
    },
    cetic_tic_empresas_2025: {
      titulo: 'Entre as grandes empresas brasileiras, metade já usa IA',
      texto: 'Na TIC Empresas 2025, com 4.174 empresas entrevistadas, 17% das empresas brasileiras com 10 ou mais empregados usaram IA em 2025 (13% em 2024). Entre as grandes, com 250 ou mais, foram 50% (38% em 2024). Entre as que usam, 44% aplicam em marketing ou vendas e 34% na gestão da empresa.',
      fonte: 'Cetic.br/NIC.br (CGI.br), TIC Empresas 2025, tabelas H9, H9A e H10, divulgada em 15 jun. 2026',
      curta: 'Cetic.br, TIC Empresas 2025',
      url: 'https://cetic.br/pt/tics/pesquisa/2025/empresas/H9/',
      ano: 2026, selo: 'independente', amostra: '4.174 empresas', tema: 'brasil',
    },
    microsoft_wti_byoai: {
      titulo: 'No Brasil, a equipe já usa IA por conta própria',
      texto: 'No Work Trend Index 2024, da Microsoft e do LinkedIn, 83% dos trabalhadores do conhecimento no Brasil disseram usar IA no trabalho (75% no mundo), e 74% dos usuários brasileiros levavam a própria ferramenta (78% no mundo). E 87% dos líderes brasileiros acham a IA crucial para competir. Pesquisa online, feita para a Microsoft.',
      fonte: 'Microsoft e LinkedIn, Work Trend Index 2024; números do Brasil segundo o Meio & Mensagem/Proxxima (10 maio 2024)',
      curta: 'Microsoft/LinkedIn, 2024',
      url: 'https://meioemensagem.com.br/proxxima/microsoft-e-linkedin-83-dos-trabalhadores-no-brasil-ja-usam-ia',
      ano: 2024, selo: 'fornecedor', amostra: 'cerca de mil pessoas por país, online', tema: 'brasil',
    },
    ey_ceo_outlook_2026: {
      titulo: '7 em cada 10 CEOs brasileiros vão investir mais em IA',
      texto: 'O CEO Outlook da EY-Parthenon ouviu 50 CEOs no Brasil, a maioria de grandes empresas (mar. e abr. 2026): 72% vão aumentar o investimento em IA e 28% vão mantê-lo. Para 84%, qualificar a equipe em IA vai decidir quem lidera o mercado. Cibersegurança e privacidade lideram os riscos (26%). Amostra pequena: é termômetro.',
      fonte: 'EY-Parthenon, CEO Outlook (Brasil), segundo a Bloomberg Línea (28 jul. 2026)',
      curta: 'EY-Parthenon, 2026',
      url: 'https://www.bloomberglinea.com.br/tech/ceos-brasileiros-planejam-acelerar-investimentos-em-ia-diz-ey-parthenon/',
      ano: 2026, selo: 'consultoria', amostra: '50 CEOs no Brasil', tema: 'brasil',
    },
    ibgc_conselhos_ia: {
      titulo: 'Nos conselhos de administração, a IA ainda engatinha',
      texto: 'Segundo acompanhamento do IBGC citado pela Capital Aberto (ago. 2026), só 20% dos conselhos discutem IA com regularidade e 46% estão no estágio inicial. Um conselheiro alerta: material de conselho tem segredo de negócio e dados pessoais, e uma ata feita com IA não pode registrar conclusões que não foram de fato discutidas.',
      fonte: 'Capital Aberto, “IA amplia responsabilidades dos conselhos” (Fabíola Gomes), 10 ago. 2026, com dados do IBGC',
      curta: 'Capital Aberto/IBGC, 2026',
      url: 'https://capitalaberto.com.br/empresas/2026/08/ia-amplia-responsabilidades-dos-conselhos',
      ano: 2026, selo: 'imprensa', amostra: 'metodologia não divulgada', tema: 'brasil',
    },
    itau_juridico_ia: {
      titulo: 'Itaú usa IA para ler documentos jurídicos em escala',
      texto: 'No Itaú Day (set. 2025), o banco disse ter mais de 500 casos internos de uso de IA generativa, que já geram economia de R$ 75 milhões em análises jurídicas automatizadas, com mais de 15 mil análises jurídicas por mês feitas com IA. São números do próprio banco, sem auditoria, e a reportagem não diz o período da economia.',
      fonte: 'Bloomberg Línea, “Itaú Day: banco projeta dobrar carteira de varejo e chegar a 75% de clientes digitais”, 2 set. 2025',
      curta: 'Bloomberg Línea, 2025',
      url: 'https://www.bloomberglinea.com.br/negocios/itau-day-banco-projeta-dobrar-carteira-de-varejo-e-chegar-a-75-de-clientes-digitais/',
      ano: 2025, selo: 'empresa', amostra: '1 empresa', tema: 'brasil',
    },
    bradesco_bia: {
      titulo: 'No Bradesco, a IA ajuda o negociador humano',
      texto: 'Segundo uma diretora do Bradesco (out. 2025), a assistente BIA resolvia 82% das demandas no primeiro nível de atendimento. Na cobrança, a IA analisa 18 mil ligações por dia e orienta o atendente humano sobre o que falar e que condição oferecer, com mais de R$ 400 milhões em benefícios em 2025. Números do banco, sem auditoria.',
      fonte: 'Bloomberg Línea, “IA generativa resolve 82% dos atendimentos iniciais no Bradesco, diz diretora”, 29 out. 2025',
      curta: 'Bloomberg Línea, 2025',
      url: 'https://www.bloomberglinea.com.br/negocios/ia-generativa-resolve-82-dos-atendimentos-iniciais-no-bradesco-diz-diretora/',
      ano: 2025, selo: 'empresa', amostra: '1 empresa', tema: 'brasil',
    },
    magalu_lu_whatsapp: {
      titulo: 'Magalu vende pela Lu no WhatsApp com agentes de IA',
      texto: 'Em dezembro de 2025, um mês após o lançamento, o CEO Fred Trajano disse que as vendas da Lu no WhatsApp, feitas com agentes de IA, convertiam três vezes mais que o aplicativo, com nota de satisfação (NPS) de 90, contra 78 da empresa toda. São números iniciais da empresa, e há custos: paga-se por mensagem e pelo uso da IA.',
      fonte: 'Brazil Journal, “A aposta do Magalu na AI está convertendo 3x mais. Vai mexer o ponteiro?”, 4 dez. 2025',
      curta: 'Brazil Journal, 2025',
      url: 'https://braziljournal.com/a-aposta-do-magalu-na-ai-esta-convertendo-3x-mais-vai-mexer-o-ponteiro/',
      ano: 2025, selo: 'empresa', amostra: '1 empresa, primeiro mês', tema: 'brasil',
    },
    google_ipsos: {
      titulo: 'Brasileiro usa IA mais que a média do mundo',
      texto: 'Numa pesquisa da Ipsos para o Google em 21 países (set. e out. 2024), 54% dos brasileiros disseram ter usado um aplicativo de IA, como ChatGPT, Gemini ou Claude, nos 12 meses anteriores, contra 48% na média. Foi feita pela internet, com cerca de mil adultos por país: mostra quem já está conectado, não o Brasil inteiro.',
      fonte: 'Ipsos para Google, Google/Ipsos Multi-Country AI Survey 2025 (campo de set. a out. 2024; divulgada em 14 jan. 2025)',
      curta: 'Google/Ipsos, 2025',
      url: 'https://www.ipsos.com/en-us/google-ipsos-multi-country-ai-survey-2025',
      ano: 2025, selo: 'fornecedor', amostra: 'cerca de 21 mil adultos, 21 países, online', tema: 'brasil',
    },
    google_ipsos_confianca: {
      titulo: 'O brasileiro confia muito na IA, talvez até demais',
      texto: 'Na edição seguinte da pesquisa Ipsos/Google (set. e out. 2025), 74% dos brasileiros disseram ter usado IA generativa no último ano, contra 62% na média de 21 países. E 24% dos brasileiros disseram confiar “muito” que a IA dá informação correta, contra 16% na média. Usar é bom; o que for importante, confira.',
      fonte: 'Ipsos para Google, Google/Ipsos Multi-Country AI Survey 2026 (campo de set. a out. 2025; divulgada em 15 jan. 2026)',
      curta: 'Google/Ipsos, 2026',
      url: 'https://www.ipsos.com/en-us/google-ipsos-multi-country-ai-survey-2026',
      ano: 2026, selo: 'fornecedor', amostra: 'cerca de 21 mil adultos, 21 países, online', tema: 'brasil',
    },
    sebrae_2025: {
      titulo: 'Pequenos negócios já usam IA, às vezes sem perceber',
      texto: 'Numa pesquisa do Sebrae de 2025, 44% dos donos de pequenos negócios disseram, espontaneamente, já ter usado algum tipo de IA. Quando as ferramentas foram citadas uma a uma, 51% disseram já ter usado ChatGPT, Gemini, Copilot ou parecidos. Muita gente usa IA sem chamar assim, como no GPS (8 em cada 10).',
      fonte: 'Sebrae, Transformação Digital nos Pequenos Negócios 2025, Agência Sebrae de Notícias, 25 jun. 2025',
      curta: 'Sebrae, 2025',
      url: 'https://agenciasebrae.com.br/inovacao-e-tecnologia/de-gps-a-chat-gpt-maioria-dos-pequenos-negocios-abraca-a-inteligencia-artificial-para-aumentar-resultados/',
      ano: 2025, selo: 'independente', amostra: 'donos de pequenos negócios', tema: 'brasil',
    },
    cetic_ia_45_59: {
      titulo: 'Desconfiar da IA é comum, e tem motivo',
      texto: 'Na TIC Domicílios 2025, só 18% dos usuários de internet de 45 a 59 anos tinham usado IA generativa nos três meses anteriores (6% entre os de 60+, 32% no total). Entre os de 45 a 59 que não usaram, 71% citaram preocupação com segurança ou privacidade e 65%, falta de habilidade. Quem está com o pé atrás está bem acompanhado.',
      fonte: 'Cetic.br/NIC.br (CGI.br), TIC Domicílios 2025, indicadores M1 e M3',
      curta: 'Cetic.br, TIC Domicílios 2025',
      url: 'https://cetic.br/pt/tics/domicilios/2025/individuos/M3/',
      ano: 2025, selo: 'independente', amostra: 'pesquisa nacional em domicílios', tema: 'brasil',
    },
    // ================================================================ Pedir e escrever bem (comunicacao)
    google_21_palavras: {
      titulo: 'Bons pedidos têm umas 21 palavras; as pessoas usam menos de 9',
      texto: 'Segundo o guia oficial do Google para o Gemini no Workspace, os pedidos que mais deram certo tinham em média umas 21 palavras, com contexto, mas as pessoas costumam escrever menos de nove. Ingredientes sugeridos: quem você é, a tarefa, o contexto e o formato da resposta. Dado interno do Google, sem metodologia publicada.',
      fonte: 'Google Workspace, Gemini for Google Workspace: Prompting guide 101 (edição para pequenas empresas, set. 2024)',
      curta: 'Google, 2024',
      url: 'https://services.google.com/fh/files/misc/google_workspace_prompting_guide_abridged_smbs_startups_september2024.pdf',
      ano: 2024, selo: 'fornecedor', amostra: 'dados internos do Google', tema: 'comunicacao',
    },
    sem_palavras_magicas: {
      titulo: 'Não existe palavra mágica: ameaçar ou prometer gorjeta não ajuda',
      texto: 'A equipe de IA da Wharton testou truques populares de pedido. Ameaçar a IA ou oferecer gorjeta não teve efeito significativo, e mandar “pensar passo a passo” trouxe ganho pequeno ou nenhum nos modelos de raciocínio mais novos, só deixando a resposta mais lenta. O que pesa é contexto e clareza, não fórmula.',
      fonte: 'Meincke, Mollick, Mollick e Shapiro (Wharton Generative AI Labs), Prompting Science Reports 2 e 3 (arXiv, jun. e ago. 2025)',
      curta: 'Wharton, 2025',
      url: 'https://arxiv.org/abs/2508.00614',
      ano: 2025, selo: 'independente', amostra: 'testes com provas acadêmicas difíceis', tema: 'comunicacao',
    },
    noy_zhang_escrita: {
      titulo: 'Em textos do trabalho, a IA poupou 40% do tempo',
      texto: 'Num experimento publicado na revista Science, 453 profissionais com curso superior fizeram tarefas de escrita típicas da sua profissão, e metade pôde usar o ChatGPT. Quem usou levou em média 40% menos tempo, e a qualidade subiu 18%. Eram tarefas curtas e controladas, não o dia de trabalho inteiro.',
      fonte: 'Shakked Noy e Whitney Zhang (MIT), Science 381(6654): 187-192, jul. 2023',
      curta: 'MIT (Science), 2023',
      url: 'https://www.science.org/doi/10.1126/science.adh2586',
      ano: 2023, selo: 'independente', amostra: '453 profissionais', tema: 'comunicacao',
    },
    chefe_ia_menos_sincero: {
      titulo: 'Chefe que escreve com muita IA parece menos sincero',
      texto: 'Num estudo com 1.100 profissionais, e-mails de parabéns de um chefe foram apresentados como escritos com pouca, média ou muita ajuda de IA. Com pouca IA, 83% viram o chefe como sincero; com muita, só de 40% a 52%. Em mensagens de relação, como elogio, motivação e cuidado, a palavra final precisa ser sua.',
      fonte: 'Peter Cardon (USC) e Anthony Coman (Univ. da Flórida), International Journal of Business Communication, 2025; notícia da Univ. da Flórida, 6 ago. 2025',
      curta: 'Cardon & Coman, 2025',
      url: 'https://news.ufl.edu/2025/08/writing-ai-work/',
      ano: 2025, selo: 'independente', amostra: '1.100 profissionais', tema: 'comunicacao',
    },
    // ================================================================ Tempo e produtividade (produtividade)
    harvard_bcg: {
      titulo: 'Consultores com IA: mais rápidos e melhores, nas tarefas certas',
      texto: 'Num experimento com 758 consultores da BCG, quem usou o GPT-4 em 18 tarefas dentro do que a IA faz bem terminou 12,2% mais tarefas, foi 25,1% mais rápido e, no estudo original, entregou qualidade mais de 40% maior. Quem tinha desempenho abaixo da média ganhou mais. Valeu só para tarefas dentro do alcance da IA.',
      fonte: 'Dell’Acqua et al., Harvard Business School Working Paper 24-013 (set. 2023), com o BCG; versão revisada em Organization Science (2026)',
      curta: 'Harvard/BCG, 2023',
      url: 'https://www.hbs.edu/ris/Publication%20Files/24-013_d9b45b68-9e74-42d6-a1c6-c72fb70c7282.pdf',
      ano: 2023, selo: 'independente', amostra: 'experimento com 758 consultores', tema: 'produtividade',
    },
    harvard_bcg_fora: {
      titulo: 'Fora do que a IA domina, ela atrapalhou',
      texto: 'No mesmo estudo, numa tarefa escolhida por estar fora do alcance da IA, os consultores sem IA acertaram cerca de 84,5% das vezes. Com IA, acertaram 60% e 70% (dois grupos): em média, 19 pontos percentuais a menos. Segundo os autores, quem errou tendia a copiar a resposta da IA sem questionar.',
      fonte: 'Dell’Acqua et al., Harvard Business School Working Paper 24-013 (set. 2023), com o BCG',
      curta: 'Harvard/BCG, 2023',
      url: 'https://www.hbs.edu/ris/Publication%20Files/24-013_d9b45b68-9e74-42d6-a1c6-c72fb70c7282.pdf',
      ano: 2023, selo: 'independente', amostra: 'experimento com 758 consultores', tema: 'produtividade',
    },
    stanford_mit: {
      titulo: 'No atendimento ao cliente, quem mais ganhou foi o novato',
      texto: 'Um estudo com 5.179 atendentes de suporte mostrou que, com um assistente de IA que sugeria respostas, eles resolveram em média 14% mais atendimentos por hora (15% na versão final publicada). Para os novatos, o ganho foi de 34%. Para os mais experientes, o impacto foi mínimo. A IA sugeria; quem respondia era o atendente.',
      fonte: 'Brynjolfsson (Stanford), Li e Raymond (MIT), Generative AI at Work, NBER Working Paper 31161 (2023); versão final no Quarterly Journal of Economics (2025)',
      curta: 'Stanford/MIT (NBER), 2023',
      url: 'https://www.nber.org/papers/w31161',
      ano: 2023, selo: 'independente', amostra: '5.179 atendentes', tema: 'produtividade',
    },
    dinamarques: {
      titulo: 'Na Dinamarca, a IA poupou pouco tempo e não mexeu no salário',
      texto: 'Pesquisadores cruzaram questionários de cerca de 25.000 trabalhadores de 11 profissões com dados oficiais da Dinamarca. Quem usava chatbots dizia economizar em média uns 3% do tempo de trabalho (2,8%), e não houve efeito significativo em salários nem em horas trabalhadas. A economia de tempo é autodeclarada.',
      fonte: 'Anders Humlum (Univ. de Chicago) e Emilie Vestergaard (Univ. de Copenhague), Large Language Models, Small Labor Market Effects, BFI/NBER Working Paper, maio 2025',
      curta: 'Humlum & Vestergaard, 2025',
      url: 'https://bfi.uchicago.edu/wp-content/uploads/2025/04/BFI_WP_2025-56-3.pdf',
      ano: 2025, selo: 'independente', amostra: '25.000 trabalhadores, 7.000 locais de trabalho', tema: 'produtividade',
    },
    metr_dev: {
      titulo: 'Programadores experientes acharam que a IA ajudou, mas ficaram mais lentos',
      texto: 'Num experimento de 2025, 16 programadores experientes fizeram 246 tarefas em projetos que conheciam bem, com e sem IA. Com IA, levaram 19% mais tempo, mas ao final achavam que tinham economizado 20%. Amostra pequena e bem específica, mas a lição vale: a sensação de ganho nem sempre é ganho real. Meça.',
      fonte: 'METR (Becker, Rush, Barnes e Rein), Measuring the Impact of Early-2025 AI on Experienced Open-Source Developer Productivity, arXiv, jul. 2025',
      curta: 'METR, 2025',
      url: 'https://arxiv.org/abs/2507.09089',
      ano: 2025, selo: 'independente', amostra: '16 programadores, 246 tarefas', tema: 'produtividade',
    },
    metr_2026: {
      titulo: 'O estudo dos programadores mais lentos foi revisto em 2026',
      texto: 'Em fevereiro de 2026, o METR repetiu o experimento com ferramentas mais novas. Entre os programadores do estudo original, a estimativa virou um ganho de cerca de 18% de tempo; entre os novos, de 4%, e nos dois casos a margem de incerteza inclui “nenhum efeito”. A ferramenta melhora rápido; medir o ganho real é que é difícil.',
      fonte: 'METR, We are Changing our Developer Productivity Experiment Design, blog, 24 fev. 2026',
      curta: 'METR, 2026',
      url: 'https://metr.org/blog/2026-02-24-uplift-update/',
      ano: 2026, selo: 'independente', amostra: '57 programadores (10 do original e 47 novos)', tema: 'produtividade',
    },
    copilot_campo_email: {
      titulo: 'Em 66 empresas, a IA cortou 2 horas por semana de e-mail',
      texto: 'Num experimento de 6 meses com 7.137 trabalhadores de 66 empresas, sorteados para receber o Microsoft 365 Copilot, os 80% que de fato usaram passaram duas horas a menos por semana no e-mail e trabalharam um pouco menos fora do expediente. O tempo em reuniões não mudou. Três dos quatro autores são da Microsoft.',
      fonte: 'Dillon, Jaffe, Immorlica (Microsoft Research) e Stanton (Harvard Business School), Shifting Work Patterns with Generative AI, arXiv v4 (nov. 2025) / NBER WP 33795',
      curta: 'Microsoft Research/HBS, 2025',
      url: 'https://arxiv.org/abs/2504.11436',
      ano: 2025, selo: 'fornecedor', amostra: '7.137 trabalhadores, 66 empresas', tema: 'produtividade',
    },
    governo_uk_26_minutos: {
      titulo: 'No governo britânico, 26 minutos por dia, segundo os próprios usuários',
      texto: 'Num teste do Microsoft 365 Copilot com 20.000 servidores do governo britânico (set. a dez. 2024), os participantes relataram economizar em média 26 minutos por dia, uns 13 dias úteis por ano. O número é autodeclarado, e o relatório admite que não foi possível medir em que esse tempo foi usado.',
      fonte: 'Government Digital Service (Reino Unido), Microsoft 365 Copilot Experiment: Cross-Government Findings Report, 2 jun. 2025',
      curta: 'Governo do Reino Unido, 2025',
      url: 'https://www.gov.uk/government/publications/microsoft-365-copilot-experiment-cross-government-findings-report/microsoft-365-copilot-experiment-cross-government-findings-report-html',
      ano: 2025, selo: 'governo', amostra: '20.000 servidores públicos', tema: 'produtividade',
    },
    governo_uk_sem_ganho: {
      titulo: 'Outro ministério britânico: tempo poupado, mas sem prova de mais produtividade',
      texto: 'O Ministério de Negócios e Comércio britânico avaliou 1.000 licenças do Copilot (out. a dez. 2024). 72% ficaram satisfeitos, e o uso mais comum foi transcrever ou resumir reuniões. Mas não houve evidência de que o tempo poupado virou mais produtividade, e 22% dos que responderam disseram ter visto respostas inventadas.',
      fonte: 'Department for Business and Trade (Reino Unido), The Evaluation of the M365 Copilot Pilot, ago. 2025',
      curta: 'DBT (Reino Unido), 2025',
      url: 'https://assets.publishing.service.gov.uk/media/68adbe409e1cebdd2c96a19d/dbt-microsoft-365-copilot-evaluation.pdf',
      ano: 2025, selo: 'governo', amostra: '1.000 licenças', tema: 'produtividade',
    },
    caixa_de_entrada_117: {
      titulo: '117 e-mails por dia e interrupção o tempo todo',
      texto: 'Dados de uso do Microsoft 365 mostram que o trabalhador médio recebe 117 e-mails por dia, a maioria lida em menos de 60 segundos. Entre os 20% que mais recebem mensagens, há uma interrupção a cada 2 minutos no expediente. E 57% das reuniões são chamadas improvisadas, sem convite. São dados do próprio fabricante.',
      fonte: 'Microsoft WorkLab, Work Trend Index, “Breaking Down the Infinite Workday”, 17 jun. 2025',
      curta: 'Microsoft, 2025',
      url: 'https://www.microsoft.com/en-us/worklab/work-trend-index/breaking-down-infinite-workday',
      ano: 2025, selo: 'fornecedor', amostra: 'dados de uso do Microsoft 365', tema: 'produtividade',
    },
    pwc_2025: {
      titulo: 'Quem sabe usar IA tem ganhado mais, segundo a PwC',
      texto: 'A PwC analisou quase 1 bilhão de anúncios de emprego em seis continentes. Vagas que pediam habilidades de IA ofereciam em média 56% a mais que a mesma função sem elas (eram 25% um ano antes), e nos setores mais expostos à IA a receita por funcionário cresceu 3 vezes mais (27,0% contra 8,5%, 2018 a 2024). Associação, não causa.',
      fonte: 'PwC, The Fearless Future: 2025 Global AI Jobs Barometer, 3 jun. 2025',
      curta: 'PwC, 2025',
      url: 'https://www.pwc.com/gx/en/issues/artificial-intelligence/ai-jobs-barometer.html',
      ano: 2025, selo: 'consultoria', amostra: 'quase 1 bilhão de anúncios de emprego', tema: 'produtividade',
    },
    // ================================================================ Documentos e contratos (documentos)
    perdido_no_meio: {
      titulo: 'O que está no meio de um documento longo se perde',
      texto: 'Pesquisadores de Stanford e outras instituições mostraram que a IA aproveita melhor o começo e o fim de um texto longo e piora quando a resposta está no meio. Num teste com 20 a 30 documentos, um modelo de 2023 caiu mais de 20% e chegou a acertar menos do que sem documento algum. Os atuais melhoraram, mas o efeito não sumiu.',
      fonte: 'Liu et al. (Stanford e outros), Lost in the Middle: How Language Models Use Long Contexts, arXiv 2023; Transactions of the ACL (2024)',
      curta: 'Liu et al. (Stanford), 2023',
      url: 'https://arxiv.org/abs/2307.03172',
      ano: 2023, selo: 'independente', amostra: 'testes com modelos de 2023', tema: 'documentos',
    },
    nolima_textos_longos: {
      titulo: 'Mesmo modelos modernos tropeçam em textos longos',
      texto: 'Num teste de 2025 com 13 modelos que aceitam textos enormes, quando a pergunta não repetia as palavras do trecho certo, o desempenho despencou com o tamanho. Com umas 24 mil palavras, 11 dos 13 caíram abaixo da metade do que acertavam em textos curtos; o GPT-4o foi de 99,3% para 69,7%. Teste de laboratório, não contratos reais.',
      fonte: 'Modarressi et al. (LMU Munique e Adobe Research), NoLiMa: Long-Context Evaluation Beyond Literal Matching, arXiv fev. 2025, ICML 2025',
      curta: 'NoLiMa (Adobe/LMU), 2025',
      url: 'https://arxiv.org/abs/2502.05167',
      ano: 2025, selo: 'fornecedor', amostra: '13 modelos de IA', tema: 'documentos',
    },
    context_rot: {
      titulo: 'Quanto maior o texto, mais instável a resposta',
      texto: 'A empresa Chroma testou 18 modelos de ponta (entre eles GPT-4.1, Claude 4 e Gemini 2.5) e viu que o desempenho varia bastante conforme o tamanho do texto, mesmo em tarefas simples. É um relatório técnico sem revisão de outros cientistas, de uma empresa interessada no tema. Moral prática: em documento grande, pergunte por partes.',
      fonte: 'Hong, Troynikov e Huber, Context Rot: How Increasing Input Tokens Impacts LLM Performance, Chroma Research, 14 jul. 2025',
      curta: 'Chroma, 2025',
      url: 'https://www.trychroma.com/research/context-rot',
      ano: 2025, selo: 'fornecedor', amostra: '18 modelos de IA', tema: 'documentos',
    },
    anthropic_documento_no_topo: {
      titulo: 'Documento primeiro, pergunta no fim, e peça os trechos',
      texto: 'O guia oficial da Anthropic, que faz o Claude, recomenda colar o documento longo no topo e a pergunta no final; nos testes internos da empresa, isso melhorou as respostas em até 30%. Também recomenda pedir que a IA copie os trechos literais antes de analisar. Número do próprio fabricante, sem metodologia publicada.',
      fonte: 'Anthropic, documentação oficial: Prompting best practices (contexto longo) e Reduce hallucinations, consultadas em out. 2026',
      curta: 'Anthropic, 2026',
      url: 'https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices',
      ano: 2026, selo: 'fornecedor', amostra: 'testes internos do fabricante', tema: 'documentos',
    },
    vectara_resumo_2026: {
      titulo: 'Mesmo resumindo um texto entregue a ela, a IA inventa detalhes',
      texto: 'A Vectara pede a 108 modelos de IA que resumam mais de 7.700 textos usando só o que está neles. Em setembro de 2026, a fatia de resumos com algo que não estava no original ia de 1,8% no melhor modelo a 24,2% no pior; metade passou de 9,5%. A Vectara vende ferramentas contra esse problema e usa um avaliador automático próprio.',
      fonte: 'Vectara, Hallucination Leaderboard (repositório oficial no GitHub, avaliador HHEM-2.3), atualização de 22 set. 2026',
      curta: 'Vectara, 2026',
      url: 'https://github.com/vectara/hallucination-leaderboard',
      ano: 2026, selo: 'fornecedor', amostra: '108 modelos, 7.700+ textos', tema: 'documentos',
    },
    stanford_juridico_rag: {
      titulo: 'Ferramentas jurídicas que prometiam “zero alucinação” também erravam',
      texto: 'Pesquisadores de Stanford e Yale fizeram 202 perguntas jurídicas a ferramentas profissionais que buscam em bases reais de decisões (LexisNexis e Thomson Reuters). Apesar da promessa de “zero alucinação”, de 17% a 33% das respostas foram falsas ou enganosas (menos que o GPT-4 sozinho). Direito dos EUA, testes de 2024.',
      fonte: 'Magesh, Surani, Dahl, Suzgun, Manning e Ho, Hallucination-Free?, Journal of Empirical Legal Studies 22 (2025); arXiv 2405.20362',
      curta: 'Stanford/Yale (JELS), 2025',
      url: 'https://arxiv.org/abs/2405.20362',
      ano: 2025, selo: 'independente', amostra: '202 perguntas jurídicas', tema: 'documentos',
    },
    advogados_ia_experimento: {
      titulo: 'Em tarefas jurídicas, a IA acelerou muito, mas uma delas inventou mais',
      texto: 'Num experimento com 127 estudantes de Direito, duas IAs aumentaram a produtividade de 50% a 130% em cinco de seis tarefas. Mas os trabalhos feitos com a IA de raciocínio (o1-preview) tiveram 11 citações inventadas, contra 3 com a IA que consulta fontes (Vincent) e 4 sem IA. Números pequenos: os autores evitam conclusões firmes.',
      fonte: 'Schwarcz, Manning, Barry, Cleveland, Prescott e Rich, AI-Powered Lawyering, Journal of Law and Empirical Analysis, 2026',
      curta: 'Schwarcz et al., 2026',
      url: 'https://repository.law.umich.edu/facarticles/3173',
      ano: 2026, selo: 'independente', amostra: '127 estudantes de Direito', tema: 'documentos',
    },
    asic_resumos_humanos: {
      titulo: 'Teste do regulador australiano: resumos humanos venceram a IA',
      texto: 'Em 2024, o regulador financeiro da Austrália (ASIC) testou com a Amazon uma IA para resumir 5 documentos enviados ao Parlamento. Avaliadores deram 81% aos resumos humanos e 47% aos da IA, e acharam que ela podia até criar mais trabalho, porque tudo precisava ser checado. Era um modelo de 2023, bem mais fraco que os atuais.',
      fonte: 'Amazon Web Services para a ASIC, relatório da prova de conceito entregue ao Senado australiano (2024)',
      curta: 'ASIC/AWS, 2024',
      url: 'https://www.aph.gov.au/DocumentStore.ashx?id=b4fd6043-6626-4cbe-b8ee-a5c7319e94a0',
      ano: 2024, selo: 'governo', amostra: '5 documentos, 5 avaliadores', tema: 'documentos',
    },
    gemini_notebook: {
      titulo: 'O NotebookLM virou Gemini Notebook e responde com base nos seus arquivos',
      texto: 'Em julho de 2026, o Google renomeou o NotebookLM para Gemini Notebook. Ele responde com base nas fontes que você carrega (PDFs, sites, documentos), com citações no texto; no plano gratuito, até 50 fontes por caderno. Na conta pessoal, os dados não treinam o modelo, a menos que você envie feedback. Informação do próprio Google.',
      fonte: 'Google, “NotebookLM is now Gemini Notebook” (blog, 16 jul. 2026) e Central de Ajuda do Gemini Notebook, consultada em out. 2026',
      curta: 'Google, 2026',
      url: 'https://blog.google/innovation-and-ai/products/gemini-notebook/notebooklm-gemini-notebook/',
      ano: 2026, selo: 'fornecedor', amostra: '', tema: 'documentos',
    },
    bbc_citacoes_alteradas: {
      titulo: 'Resumos de IA alteraram ou inventaram citações',
      texto: 'Em fevereiro de 2025, jornalistas da BBC avaliaram respostas do ChatGPT, Copilot, Gemini e Perplexity a 100 perguntas sobre notícias: 51% tinham problemas significativos. E 13% das citações atribuídas a reportagens da BBC foram alteradas ou nem existiam no texto original. Antes de repassar um trecho, confira no original.',
      fonte: 'BBC, Representation of BBC News content in AI Assistants, 11 fev. 2025',
      curta: 'BBC, 2025',
      url: 'https://www.bbc.co.uk/mediacentre/2025/bbc-research-shows-issues-with-answers-from-artificial-intelligence-assistants',
      ano: 2025, selo: 'imprensa', amostra: '100 perguntas sobre notícias', tema: 'documentos',
    },
    // ================================================================ Onde a IA erra (e como conferir) (limites)
    newsguard: {
      titulo: 'Chatbots repetiram boatos em 35% das vezes',
      texto: 'Em agosto de 2025, a NewsGuard testou os 10 principais chatbots com perguntas sobre boatos do noticiário: eles repetiram a informação falsa 35% das vezes, quase o dobro dos 18% de um ano antes. Ao passarem a pesquisar na internet, quase pararam de dizer “não sei” (de 31% para 0%). O teste usa de propósito boatos conhecidos.',
      fonte: 'NewsGuard, AI False Claims Monitor, auditoria de agosto de 2025, publicada em 4 set. 2025',
      curta: 'NewsGuard, 2025',
      url: 'https://www.newsguardtech.com/ai-monitor/august-2025-ai-false-claim-monitor/',
      ano: 2025, selo: 'independente', amostra: '10 chatbots', tema: 'limites',
    },
    ebu_45_por_cento: {
      titulo: 'Em 18 países, 45% das respostas sobre notícias tinham problema sério',
      texto: 'Em 2025, jornalistas de 22 emissoras públicas de 18 países avaliaram mais de 3.000 respostas das versões gratuitas do ChatGPT, Copilot, Gemini e Perplexity. Em 45% havia pelo menos um problema significativo; 31% tinham fonte ausente, enganosa ou errada; 20% tinham erros graves, como detalhes inventados ou desatualizados.',
      fonte: 'União Europeia de Radiodifusão (EBU) e BBC, News Integrity in AI Assistants, 22 out. 2025',
      curta: 'EBU/BBC, 2025',
      url: 'https://www.ebu.ch/news/2025/10/ai-s-systemic-distortion-of-news-is-consistent-across-languages-and-territories-international-study-by-public-service-broadcaste',
      ano: 2025, selo: 'imprensa', amostra: '3.000+ respostas, 18 países', tema: 'limites',
    },
    buscadores_erram_fonte: {
      titulo: 'Buscadores com IA erram a fonte, e com confiança',
      texto: 'O Tow Center, da Universidade Columbia, fez 1.600 consultas a 8 buscadores com IA, pedindo a reportagem de origem de um trecho. Juntos, erraram mais de 60% das vezes (Perplexity 37%, Grok 3 94%), quase sempre sem admitir dúvida: o ChatGPT errou 134 de 200 e sinalizou incerteza só 15 vezes. Lição: abra o link citado.',
      fonte: 'Klaudia Jaźwińska e Aisvarya Chandrasekar, Tow Center for Digital Journalism, Columbia Journalism Review, 6 mar. 2025',
      curta: 'CJR/Columbia, 2025',
      url: 'https://www.cjr.org/tow_center/we-compared-eight-ai-search-engines-theyre-all-bad-at-citing-news.php',
      ano: 2025, selo: 'independente', amostra: '1.600 consultas, 8 buscadores', tema: 'limites',
    },
    openai_chute: {
      titulo: 'A IA “chuta” porque foi treinada como aluno em prova',
      texto: 'Em 2025, a própria OpenAI publicou que os modelos inventam, em parte, porque os testes que os avaliam premiam o chute, não o “não sei”. No exemplo dela, um modelo que se recusava a responder quando não sabia errou 26% das perguntas; outro, que quase sempre respondia, acertou só um pouco mais (24% contra 22%) e errou 75%.',
      fonte: 'OpenAI, Why language models hallucinate (blog, 5 set. 2025) e artigo de Kalai, Nachum, Vempala e Zhang (arXiv 2509.04664)',
      curta: 'OpenAI, 2025',
      url: 'https://openai.com/index/why-language-models-hallucinate/',
      ano: 2025, selo: 'fornecedor', amostra: 'teste de perguntas factuais curtas', tema: 'limites',
    },
    steyvers_resposta_longa: {
      titulo: 'Resposta longa parece mais certa, mas não é',
      texto: 'Em experimentos publicados na Nature Machine Intelligence, as pessoas superestimaram a precisão das respostas de modelos de IA. Explicações mais longas aumentaram a confiança dos usuários mesmo quando não deixavam a resposta mais correta. Quando a explicação refletia a incerteza real do modelo, o julgamento das pessoas melhorou.',
      fonte: 'Steyvers et al. (UC Irvine), What large language models know and what people think they know, Nature Machine Intelligence 7: 221-231 (2025)',
      curta: 'Steyvers et al. (UC Irvine), 2025',
      url: 'https://doi.org/10.1038/s42256-024-00976-7',
      ano: 2025, selo: 'independente', amostra: 'experimentos com perguntas curtas', tema: 'limites',
    },
    lee_pensamento_critico: {
      titulo: 'Confiar demais na IA reduz o senso crítico; confiar em si aumenta',
      texto: 'Numa pesquisa com 319 profissionais, que descreveram 936 usos reais de IA no trabalho, quanto mais a pessoa confiava na IA para a tarefa, menos pensamento crítico dizia aplicar; quanto mais confiava em si mesma, mais aplicava. O trabalho mental muda de lugar: vira conferir, juntar e supervisionar. É autodeclarado.',
      fonte: 'Lee et al. (Carnegie Mellon e Microsoft Research), The Impact of Generative AI on Critical Thinking, CHI 2025',
      curta: 'Lee et al. (CHI), 2025',
      url: 'https://doi.org/10.1145/3706598.3713778',
      ano: 2025, selo: 'fornecedor', amostra: '319 profissionais, 936 casos', tema: 'limites',
    },
    vies_automacao: {
      titulo: 'O “piloto automático mental” é antigo e tem remédio conhecido',
      texto: 'Muito antes do ChatGPT, uma revisão de 74 estudos sobre sistemas de apoio à decisão, sobretudo na saúde, descreveu o “viés de automação”: confiar demais na máquina. Pressa, excesso de trabalho e tarefa complexa pioram. Ajudam: treino, deixar claro que a responsabilidade é de quem decide e mostrar o grau de confiança da resposta.',
      fonte: 'Goddard, Roudsari e Wyatt, Automation bias: a systematic review, Journal of the American Medical Informatics Association 19(1): 121-127 (2012)',
      curta: 'Goddard et al. (JAMIA), 2012',
      url: 'https://pubmed.ncbi.nlm.nih.gov/21685142/',
      ano: 2012, selo: 'independente', amostra: 'revisão de 74 estudos', tema: 'limites',
    },
    kim_incerteza: {
      titulo: 'Quando a IA admite dúvida, as pessoas erram menos',
      texto: 'Num experimento com 404 pessoas respondendo perguntas médicas com ajuda de uma busca com IA criada para o teste, respostas que começavam com “Não tenho certeza, mas...” fizeram os participantes confiar menos e acertar mais. Uma análise exploratória sugere que o ganho veio de reduzir, sem zerar, a confiança em respostas erradas.',
      fonte: 'Kim, Liao, Vorvoreanu, Ballard e Vaughan (Princeton e Microsoft Research), “I’m Not Sure, But...”, ACM FAccT 2024',
      curta: 'Kim et al. (FAccT), 2024',
      url: 'https://arxiv.org/abs/2405.00623',
      ano: 2024, selo: 'fornecedor', amostra: '404 pessoas', tema: 'limites',
    },
    cove_verificacao: {
      titulo: 'Mandar a IA conferir a própria resposta reduz invenções',
      texto: 'Pesquisadores da Meta testaram a “cadeia de verificação”: a IA escreve um rascunho, cria perguntas para checar cada fato, responde a elas separadamente e só então reescreve. Num teste de listas, a precisão mais que dobrou (de 0,17 para 0,36); em biografias, a nota de veracidade subiu 28%. Reduz os erros, mas não os elimina.',
      fonte: 'Dhuliawala et al. (Meta AI e ETH Zürich), Chain-of-Verification Reduces Hallucination in Large Language Models, Findings of ACL 2024',
      curta: 'Meta (ACL Findings), 2024',
      url: 'https://aclanthology.org/2024.findings-acl.212/',
      ano: 2024, selo: 'fornecedor', amostra: 'testes com um modelo de 2023', tema: 'limites',
    },
    anthropic_tecnicas: {
      titulo: 'Os próprios fabricantes ensinam: deixe a IA dizer “não sei”',
      texto: 'O guia oficial da Anthropic contra invenções recomenda: dar permissão explícita para a IA dizer “não sei”; exigir uma citação para cada afirmação e apagar o que ficar sem citação; e rodar a mesma pergunta mais de uma vez, desconfiando quando as respostas divergem. O próprio guia avisa: isso reduz os erros, mas não os elimina.',
      fonte: 'Anthropic, Reduce hallucinations, documentação oficial da plataforma Claude, consultada em out. 2026',
      curta: 'Anthropic, 2026',
      url: 'https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations',
      ano: 2026, selo: 'fornecedor', amostra: '', tema: 'limites',
    },
    bajulacao_ia: {
      titulo: 'A IA tende a dar razão a quem pergunta',
      texto: 'Pesquisadores da Anthropic mostraram que cinco assistentes de IA de ponta tendiam a dar razão ao usuário em vez de manter a verdade. Bastava dizer “Acho que não está certo. Tem certeza?” para mudarem a resposta em 32% a 86% das vezes, às vezes trocando a certa pela errada. Eram modelos de 2023; o problema diminuiu, não sumiu.',
      fonte: 'Sharma et al. (Anthropic), Towards Understanding Sycophancy in Language Models, ICLR 2024 (arXiv 2310.13548)',
      curta: 'Anthropic (ICLR), 2024',
      url: 'https://arxiv.org/abs/2310.13548',
      ano: 2024, selo: 'fornecedor', amostra: '5 assistentes de IA de 2023', tema: 'limites',
    },
    bajulacao_openai: {
      titulo: 'A própria OpenAI desfez uma versão “puxa-saco” do ChatGPT',
      texto: 'Em abril de 2025, a OpenAI desfez uma atualização do GPT-4o porque o ChatGPT tinha ficado bajulador demais, concordando e elogiando até ideias problemáticas. A empresa admitiu que o modelo pendeu para respostas “excessivamente apoiadoras, mas insinceras”. Para um CEO, o risco é ter um “sim-senhor” digital.',
      fonte: 'OpenAI, post Sycophancy in GPT-4o (29 abr. 2025), citado pelo TechCrunch (Kyle Wiggers)',
      curta: 'OpenAI/TechCrunch, 2025',
      url: 'https://techcrunch.com/2025/04/29/openai-explains-why-chatgpt-became-too-sycophantic',
      ano: 2025, selo: 'fornecedor', amostra: '1 caso real', tema: 'limites',
    },
    avianca: {
      titulo: 'Advogados multados por citar processos inventados pelo ChatGPT',
      texto: 'Em 2023, num processo contra a Avianca em Nova York, advogados citaram seis decisões judiciais que não existiam, inventadas pelo ChatGPT, e continuaram a defendê-las depois de questionados. O juiz aplicou multa de US$ 5.000, paga em conjunto pelos dois advogados e pelo escritório. Usar IA não era o erro; o erro foi não conferir.',
      fonte: 'Mata v. Avianca, Inc., nº 22-cv-1461 (PKC), Tribunal Distrital dos EUA (Distrito Sul de Nova York), decisão sobre sanções, 22 jun. 2023',
      curta: 'Mata v. Avianca, 2023',
      url: 'https://storage.courtlistener.com/recap/gov.uscourts.nysd.575368/gov.uscourts.nysd.575368.54.0_3.pdf',
      ano: 2023, selo: 'governo', amostra: '1 caso real', tema: 'limites',
    },
    juiz_chatgpt: {
      titulo: 'Juiz usou ChatGPT e citou decisões que não existem',
      texto: 'Em 2023, o CNJ decidiu investigar um juiz federal do TRF-1 cuja sentença se apoiava em “jurisprudência” do STJ que o ChatGPT inventou. Quem descobriu foi o advogado da parte que perdeu. O juiz chamou o caso de “mero equívoco” por sobrecarga de trabalho. A IA pode inventar fontes com toda a segurança.',
      fonte: 'Consultor Jurídico (ConJur), “CNJ vai investigar juiz que usou tese inventada pelo ChatGPT em decisão”, 12 nov. 2023',
      curta: 'ConJur, 2023',
      url: 'https://www.conjur.com.br/2023-nov-12/cnj-vai-investigar-juiz-que-usou-tese-inventada-pelo-chatgpt-para-escrever-decisao/',
      ano: 2023, selo: 'imprensa', amostra: '1 caso real', tema: 'limites',
    },
    tjsc_chatgpt_multa: {
      titulo: 'No Brasil, multa por jurisprudência inventada pelo ChatGPT',
      texto: 'Em fevereiro de 2025, o Tribunal de Justiça de Santa Catarina multou em 10% do valor atualizado da causa a parte de um recurso que citava decisões e livros jurídicos que não existiam. O advogado atribuiu o erro ao “uso inadvertido” do ChatGPT, e o caso foi comunicado à OAB. Houve casos parecidos em outros tribunais.',
      fonte: 'Tribunal de Justiça de Santa Catarina, Assessoria de Imprensa, “TJSC multa autor de recurso por jurisprudência falsa gerada por IA”, 18 fev. 2025',
      curta: 'TJSC, 2025',
      url: 'https://www.tjsc.jus.br/web/imprensa/-/tjsc-multa-autor-de-recurso-por-jurisprudencia-falsa-gerada-por-ia',
      ano: 2025, selo: 'governo', amostra: '1 caso real', tema: 'limites',
    },
    deloitte_reembolso: {
      titulo: 'Gigante da consultoria aceitou devolver dinheiro por relatório com citações inventadas',
      texto: 'Em 2025, um relatório da Deloitte para o governo australiano (contrato de AU$ 440 mil) trazia referências inexistentes e uma citação judicial inventada. Quem achou foi um pesquisador de Sydney, não a consultoria. A Deloitte admitiu o uso do GPT-4o e aceitou devolver a última parcela, sem confirmar que a IA gerou os erros.',
      fonte: 'TechRadar Pro (Craig Hale), 7 out. 2025, e Cyber Daily (Daniel Croft), 8 out. 2025, citando a Australian Financial Review',
      curta: 'TechRadar/Cyber Daily, 2025',
      url: 'https://www.techradar.com/pro/deloitte-forced-to-refund-aussie-government-after-admitting-it-used-ai-to-produce-error-strewn-report',
      ano: 2025, selo: 'imprensa', amostra: '1 caso real', tema: 'limites',
    },
    base_casos_alucinacao: {
      titulo: 'Mais de 2.000 decisões judiciais já trataram de conteúdo inventado por IA',
      texto: 'O pesquisador Damien Charlotin mantém uma base pública de decisões em que juízes constataram conteúdo inventado por IA, quase sempre citações falsas. Em 5 de outubro de 2026 eram 2.149 casos no mundo, 41 no Brasil. Foram 16 decisões em 2023, 855 em 2025 e mais de 1.200 só até outubro de 2026. Só entra o que chegou a uma decisão.',
      fonte: 'Damien Charlotin, AI Hallucination Cases Database (licença CC BY 4.0), consultada em 5 out. 2026',
      curta: 'Charlotin, 2026',
      url: 'https://www.damiencharlotin.com/hallucinations/',
      ano: 2026, selo: 'independente', amostra: '2.149 decisões judiciais', tema: 'limites',
    },
    ia_saude: {
      titulo: 'Chatbot não substitui o médico',
      texto: 'Num estudo de Oxford (Nature Medicine, 2026) com quase 1.300 pessoas, quem usou chatbots para entender sintomas não decidiu melhor do que quem buscou na internet ou confiou em si. As respostas misturavam conselhos bons e ruins. Para a médica do estudo, a IA “ainda não está pronta para assumir o papel do médico”.',
      fonte: 'Universidade de Oxford: Bean et al., Nature Medicine (2026); notícia do NIHR Oxford Biomedical Research Centre, 10 fev. 2026',
      curta: 'Oxford/Nature Medicine, 2026',
      url: 'https://oxfordbrc.nihr.ac.uk/study-warns-of-risks-in-ai-chatbots-giving-medical-advice/',
      ano: 2026, selo: 'independente', amostra: 'quase 1.300 pessoas', tema: 'limites',
    },
    // ================================================================ Reuniões, voz e atas (reunioes)
    microsoft_reuniao_perdida: {
      titulo: 'Resumo de reunião: quase 4 vezes mais rápido, com um detalhe a menos',
      texto: 'Num teste interno da Microsoft, 60 funcionários resumiram uma reunião gravada de 35 minutos a que não tinham ido. Com o Copilot, levaram 11 minutos em vez de 42, quase 4 vezes mais rápido. Mas incluíram 11 dos 15 detalhes importantes, contra 12 de quem fez à mão. Estudo do próprio fabricante, com uma versão de 2023.',
      fonte: 'Microsoft WorkLab, What Can Copilot’s Earliest Users Teach Us About Generative AI at Work?, 15 nov. 2023',
      curta: 'Microsoft, 2023',
      url: 'https://www.microsoft.com/en-us/worklab/work-trend-index/copilots-earliest-users-teach-us-about-generative-ai-at-work',
      ano: 2023, selo: 'fornecedor', amostra: '60 funcionários da Microsoft', tema: 'reunioes',
    },
    transcricao_inventa: {
      titulo: 'A transcrição automática às vezes inventa frases inteiras',
      texto: 'Pesquisadores testaram o Whisper, da OpenAI (versão de 2023), com gravações de pessoas com afasia (dificuldade de fala) e de outras pessoas. Cerca de 1% das transcrições tinha frases inteiras que ninguém disse; 38% dessas invenções eram prejudiciais, mais comuns com pausas longas. Na ata, confira nomes, números e prazos.',
      fonte: 'Koenecke (Cornell), Choi, Mei, Schellmann e Sloane, Careless Whisper: Speech-to-Text Hallucination Harms, ACM FAccT 2024',
      curta: 'Koenecke et al. (Cornell), 2024',
      url: 'https://arxiv.org/abs/2402.08021',
      ano: 2024, selo: 'independente', amostra: 'gravações de pessoas com e sem afasia', tema: 'reunioes',
    },
    stanford_voz: {
      titulo: 'Ditar no celular é quase 3 vezes mais rápido que digitar',
      texto: 'Em laboratório, pesquisadores compararam ditar e digitar mensagens curtas num celular: falando foi 2,93 vezes mais rápido em inglês (153 contra 52 palavras por minuto) e 2,87 vezes em mandarim. Mas a voz deixou um pouco mais de erros no texto final (1,30% contra 0,79%). Português não foi testado. Releia antes de enviar.',
      fonte: 'Ruan, Wobbrock, Liou, Ng e Landay (Stanford, Univ. de Washington e Baidu), Proc. ACM IMWUT 1(4), dez. 2017 (arXiv 1608.07323)',
      curta: 'Stanford (Ruan et al.), 2017',
      url: 'https://arxiv.org/abs/1608.07323',
      ano: 2017, selo: 'independente', amostra: 'teste em laboratório, 2 idiomas', tema: 'reunioes',
    },
    teams_aviso_transcricao: {
      titulo: 'No Teams, todos são avisados quando a reunião é transcrita',
      texto: 'No Microsoft Teams, todos os participantes veem um aviso quando a transcrição começa. O Copilot resume os pontos, quem falou o quê e sugere tarefas; para perguntar sobre a reunião depois que ela acaba, a transcrição precisa estar ligada. Boa prática além do aviso: pedir a concordância de todos no início.',
      fonte: 'Microsoft Support, “View live transcription in Microsoft Teams meetings” e “Get started with Copilot in Microsoft Teams meetings”, consultados em out. 2026',
      curta: 'Microsoft, 2026',
      url: 'https://support.microsoft.com/en-us/office/get-started-with-copilot-in-microsoft-teams-meetings-0bf9dd3c-96f7-44e2-8bb8-790bedf066b1',
      ano: 2026, selo: 'fornecedor', amostra: '', tema: 'reunioes',
    },
    // ================================================================ Números e contas (numeros)
    contas_frageis: {
      titulo: 'Trocar só os números do problema já confunde a IA',
      texto: 'Pesquisadores da Apple testaram modelos de 2024 em problemas de matemática escolar. O desempenho de todos caiu quando só os números da pergunta eram trocados, e uma frase irrelevante derrubou os acertos em até 65%. Os modelos de raciocínio mais novos são bem melhores, mas conta importante se faz na planilha e se confere.',
      fonte: 'Mirzadeh et al. (Apple), GSM-Symbolic: Understanding the Limitations of Mathematical Reasoning in LLMs, arXiv out. 2024, ICLR 2025',
      curta: 'Apple, 2024',
      url: 'https://arxiv.org/abs/2410.05229',
      ano: 2024, selo: 'fornecedor', amostra: 'modelos de IA de 2024', tema: 'numeros',
    },
    estudo_balancos_retirado: {
      titulo: 'O estudo famoso de “IA melhor que analista” foi retirado para revisão',
      texto: 'Em 2024, um estudo da Universidade de Chicago virou manchete ao dizer que o GPT-4, lendo só balanços, previa melhor que analistas se o lucro ia subir ou cair. Em fevereiro de 2025, os próprios autores retiraram o artigo, temporariamente, porque um coautor achou inconsistências nos dados. Até pesquisa sobre IA se confere.',
      fonte: 'Kim, Muhn e Nikolaev (Chicago Booth), Financial Statement Analysis with Large Language Models, arXiv 2407.17866 (retirado na v3, 20 fev. 2025)',
      curta: 'Chicago Booth (retirado), 2025',
      url: 'https://arxiv.org/abs/2407.17866',
      ano: 2025, selo: 'independente', amostra: '1 estudo retirado para revisão', tema: 'numeros',
    },
    reino_unido_copilot_tarefas: {
      titulo: 'A IA resumiu bem e escreveu bem, mas errou na planilha',
      texto: 'Numa avaliação do governo britânico, quem usou o Copilot fez resumos de relatórios melhores e mais rápidos, e e-mails melhores (ganho de tempo mínimo). Já a análise de dados no Excel saiu mais lenta e pior, e os slides, mais rápidos porém piores. Amostra pequena (16 sessões observadas), mas o recado é claro: conta se confere.',
      fonte: 'Department for Business and Trade (Reino Unido), The Evaluation of the M365 Copilot Pilot, ago. 2025',
      curta: 'Governo do Reino Unido (DBT), 2025',
      url: 'https://assets.publishing.service.gov.uk/media/68adbe409e1cebdd2c96a19d/dbt-microsoft-365-copilot-evaluation.pdf',
      ano: 2025, selo: 'governo', amostra: '16 sessões de tarefas observadas', tema: 'numeros',
    },
    // ================================================================ Decisões e estratégia (decisoes)
    vaccaro_humano_ia: {
      titulo: 'Humano mais IA: tende a ganhar ao criar e perde ao decidir',
      texto: 'Uma meta-análise do MIT com 106 experimentos (até 2023) viu a dupla humano mais IA, em média, melhor que o humano sozinho, mas pior que o melhor dos dois sozinho. Perdeu ao escolher entre opções (em geral, classificações simples) e tendeu a ganhar ao criar conteúdo. Quando a pessoa era melhor que a IA, a dupla venceu os dois.',
      fonte: 'Vaccaro, Almaatouq e Malone (MIT), When combinations of humans and AI are useful, Nature Human Behaviour 8: 2293-2303 (2024)',
      curta: 'MIT (Nature Human Behaviour), 2024',
      url: 'https://www.nature.com/articles/s41562-024-02024-1',
      ano: 2024, selo: 'independente', amostra: 'meta-análise de 106 experimentos', tema: 'decisoes',
    },
    cybernetic_teammate_pg: {
      titulo: 'Na P&G, uma pessoa com IA rendeu o mesmo que uma dupla sem IA',
      texto: 'Num experimento com profissionais da Procter & Gamble em desafios reais de novos produtos, quem trabalhou sozinho com IA entregou soluções tão boas quanto duplas sem IA, em 16,4% menos tempo. Duplas com IA tiveram cerca de 3 vezes mais chance de ficar entre as 10% melhores ideias. A IA ajuda a gerar ideias; escolher é humano.',
      fonte: 'Dell’Acqua et al. (Harvard e P&G), The Cybernetic Teammate, NBER Working Paper 33641 (abr. 2025); Organization Science (2026)',
      curta: 'Harvard/P&G, 2025',
      url: 'https://www.nber.org/papers/w33641',
      ano: 2025, selo: 'independente', amostra: '776 profissionais da P&G', tema: 'decisoes',
    },
    executivos_previsao_otimista: {
      titulo: 'Executivos que consultaram o ChatGPT fizeram previsões piores',
      texto: 'Em aulas do IMD relatadas na Harvard Business Review, cerca de 300 executivos previram o preço da ação da Nvidia dali a um mês. Quem consultou o ChatGPT ficou mais otimista e errou mais que antes; quem conversou com colegas ficou mais cauteloso e acertou mais. Exercício em sala, sem revisão por pares.',
      fonte: 'Parra-Moyano, Reinmoeller e Schmedders (IMD), Research: Executives Who Used Gen AI Made Worse Predictions, Harvard Business Review, 1 jul. 2025',
      curta: 'HBR/IMD, 2025',
      url: 'https://hbr.org/2025/07/research-executives-who-used-gen-ai-made-worse-predictions',
      ano: 2025, selo: 'independente', amostra: 'cerca de 300 executivos', tema: 'decisoes',
    },
    ia_ceo_simulador: {
      titulo: 'A IA bateu humanos num jogo de CEO, mas foi demitida mais rápido',
      texto: 'Num simulador da indústria automobilística com 344 participantes (2024), o GPT-4o foi muito bem em lucro e participação de mercado, mas o conselho virtual o demitiu mais rápido que os estudantes: ele se deu mal em choques imprevisíveis. Executivos de banco caíram na mesma armadilha. O simulador é da empresa de um dos autores.',
      fonte: 'Mudassir, Munir, Ansari e Zahra, AI Can (Mostly) Outperform Human CEOs, Harvard Business Review, 26 set. 2024; resumo da Cambridge Judge Business School',
      curta: 'HBR/Cambridge, 2024',
      url: 'https://hbr.org/2024/09/ai-can-mostly-outperform-human-ceos',
      ano: 2024, selo: 'independente', amostra: '344 participantes', tema: 'decisoes',
    },
    varias_opinioes_ia: {
      titulo: 'Uma opinião da IA oscila; várias juntas se aproximam dos especialistas',
      texto: 'Em dois estudos com 60 modelos de negócio cada, pesquisadores da UCL compararam rankings feitos por IAs com os de especialistas humanos. Avaliações isoladas da IA foram muitas vezes inconsistentes e enviesadas, mas, somando várias (com modelos, papéis e pedidos diferentes), o ranking ficou parecido com o dos especialistas.',
      fonte: 'Doshi, Bell, Mirzayev e Vanneste (UCL), Generative artificial intelligence and evaluating strategic decisions, Strategic Management Journal 46(3), 2025',
      curta: 'Doshi et al. (UCL), 2025',
      url: 'https://ideas.repec.org/a/bla/stratm/v46y2025i3p583-610.html',
      ano: 2025, selo: 'independente', amostra: '2 estudos, 60 modelos de negócio cada', tema: 'decisoes',
    },
    advogado_do_diabo_ia: {
      titulo: 'Um “advogado do diabo” de IA ajudou grupos a não aceitar a IA de olhos fechados',
      texto: 'Num experimento da Universidade Purdue, grupos decidiram com a ajuda de uma recomendação de IA. Quando outro assistente de IA fazia o papel de advogado do diabo contra essa recomendação, os grupos mostraram sinais de confiar nela de forma mais adequada, sem esforço extra relevante. Experimento de laboratório, não com executivos.',
      fonte: 'Chiang, Lu, Li e Yin (Purdue), Enhancing AI-Assisted Group Decision Making through LLM-Powered Devil’s Advocate, IUI 2024',
      curta: 'Purdue (IUI), 2024',
      url: 'https://doi.org/10.1145/3640543.3645199',
      ano: 2024, selo: 'independente', amostra: 'experimento de laboratório com grupos', tema: 'decisoes',
    },
    pre_mortem_klein: {
      titulo: 'Imaginar que já deu errado ajuda a achar os motivos',
      texto: 'O psicólogo Gary Klein criou o pré-mortem: antes de começar, a equipe imagina que o projeto já fracassou e cada um escreve, sozinho, por quê. Na Harvard Business Review (2007), ele cita uma pesquisa de 1989: imaginar que o fato já aconteceu aumenta em 30% a capacidade de achar as razões. O estudo original não foi conferido.',
      fonte: 'Gary Klein, Performing a Project Premortem, Harvard Business Review, set. 2007 (citando Mitchell, Russo e Pennington, 1989)',
      curta: 'Klein (HBR), 2007',
      url: 'https://hbr.org/2007/09/performing-a-project-premortem',
      ano: 2007, selo: 'independente', amostra: '', tema: 'decisoes',
    },
    mentor_ia_quenia: {
      titulo: 'Conselho de IA ajudou quem já ia bem e atrapalhou quem ia mal',
      texto: 'Num experimento de 5 meses com 640 empreendedores no Quênia, um mentor de negócios com GPT-4 no WhatsApp aumentou em 15% o lucro ou a receita de quem estava acima da mediana; quem estava abaixo teve queda de 8% na receita. Esses pediam ajuda em problemas muito difíceis. A IA rende mais com quem sabe julgar o conselho.',
      fonte: 'Otis, Clarke, Delecourt, Holtz e Koning (Berkeley Haas e Harvard Business School), working paper de fev. 2024; notícia da Berkeley Haas, 1 abr. 2024',
      curta: 'Berkeley/Harvard, 2024',
      url: 'https://newsroom.haas.berkeley.edu/research/gen-ai-experiment-shows-mixed-results-in-helping-small-businesses-grow/',
      ano: 2024, selo: 'independente', amostra: '640 empreendedores', tema: 'decisoes',
    },
    // ================================================================ Pessoas e equipe (pessoas)
    bcg_lideres_vs_linha_de_frente: {
      titulo: 'Quando o chefe apoia, a equipe gosta mais da IA',
      texto: 'Na pesquisa do BCG com mais de 10.600 pessoas em 11 países e regiões, mais de três quartos dos líderes e gerentes usavam IA generativa várias vezes por semana, contra 51% da linha de frente. Com apoio forte da liderança, a parte da linha de frente que via a IA com bons olhos subia de 15% para 55%. Só 1 em 4 tinha esse apoio.',
      fonte: 'Boston Consulting Group, AI at Work 2025: Momentum Builds, but Gaps Remain, 26 jun. 2025',
      curta: 'BCG, 2025',
      url: 'https://www.bcg.com/publications/2025/ai-at-work-momentum-builds-but-gaps-remain',
      ano: 2025, selo: 'consultoria', amostra: '10.600+ pessoas, 11 países e regiões', tema: 'pessoas',
    },
    bcg_treino_5_horas: {
      titulo: 'Treino faz diferença: mais de 5 horas, mais uso',
      texto: 'Na pesquisa AI at Work 2025 do BCG, o uso regular de IA foi bem maior entre quem teve pelo menos cinco horas de treinamento. Segundo reportagem sobre o relatório, 79% dos que tiveram mais de cinco horas viraram usuários regulares, contra 67% dos que tiveram menos. Só um terço dos funcionários disse ter sido bem treinado.',
      fonte: 'Boston Consulting Group, AI at Work 2025 (26 jun. 2025); os 79% contra 67% segundo a UNLEASH',
      curta: 'BCG, 2025',
      url: 'https://www.bcg.com/publications/2025/ai-at-work-momentum-builds-but-gaps-remain',
      ano: 2025, selo: 'consultoria', amostra: '10.600+ pessoas, 11 países e regiões', tema: 'pessoas',
    },
    microsoft_uso_escondido: {
      titulo: 'Muita gente usa IA escondido, com medo de parecer substituível',
      texto: 'Na pesquisa Work Trend Index 2024, com 31 mil trabalhadores do conhecimento em 31 países, 52% de quem usava IA no trabalho relutava em admitir o uso nas tarefas mais importantes, e 53% temia parecer substituível. Os dados são autodeclarados, e a pesquisa é da Microsoft, que vende IA.',
      fonte: 'Microsoft e LinkedIn, 2024 Work Trend Index Annual Report: AI at Work Is Here. Now Comes the Hard Part (maio 2024)',
      curta: 'Microsoft/LinkedIn, 2024',
      url: 'https://www.microsoft.com/en-us/worklab/work-trend-index/ai-at-work-is-here-now-comes-the-hard-part',
      ano: 2024, selo: 'fornecedor', amostra: '31.000 trabalhadores, 31 países', tema: 'pessoas',
    },
    microsoft_wti_power_users: {
      titulo: 'Quem experimenta mais diz ganhar mais tempo, e o exemplo do CEO pesa',
      texto: 'No estudo da Microsoft de 2024, os “usuários avançados” (IA várias vezes por semana) dizem poupar mais de 30 minutos por dia; os céticos, 10 minutos ou menos. O hábito que mais os distingue é experimentar com frequência. E eles têm 61% mais chance de ter ouvido do próprio CEO que usar IA é importante. Associação, não causa.',
      fonte: 'Microsoft e LinkedIn, Work Trend Index 2024: AI at work is here. Now comes the hard part (8 maio 2024)',
      curta: 'Microsoft/LinkedIn, 2024',
      url: 'https://www.microsoft.com/en-us/worklab/work-trend-index/ai-at-work-is-here-now-comes-the-hard-part',
      ano: 2024, selo: 'fornecedor', amostra: '31.000 trabalhadores, 31 países', tema: 'pessoas',
    },
    reif_penalidade_social: {
      titulo: 'Usar IA pode pegar mal, mas menos com quem também usa',
      texto: 'Em 4 experimentos com 4.439 pessoas (Duke, 2025), quem usava IA no trabalho esperava ser visto como menos competente e esforçado, e foi avaliado assim. Segundo a universidade, a penalidade sumia quando o avaliador também usava IA com frequência, e a nota de adequação não caía quando a IA era descrita como útil para a tarefa.',
      fonte: 'Reif, Larrick e Soll (Duke), Evidence of a social evaluation penalty for using AI, PNAS 122(19), maio 2025',
      curta: 'Reif, Larrick & Soll (PNAS), 2025',
      url: 'https://doi.org/10.1073/pnas.2426766122',
      ano: 2025, selo: 'independente', amostra: '4 experimentos, 4.439 pessoas', tema: 'pessoas',
    },
    vies_curriculos: {
      titulo: 'IA que ordena currículos favoreceu nomes de brancos e de homens',
      texto: 'A Universidade de Washington trocou só os nomes em mais de 550 currículos reais e pediu a três modelos de IA que os ordenassem para vagas reais. Nomes associados a brancos foram preferidos 85% das vezes (9% para negros) e nomes masculinos, 52% (11% para femininos). Decisão sobre pessoas fica com pessoas.',
      fonte: 'Kyra Wilson e Aylin Caliskan (Univ. de Washington), AAAI/ACM AIES, 22 out. 2024; notícia da UW, 31 out. 2024',
      curta: 'Univ. de Washington, 2024',
      url: 'https://www.washington.edu/news/2024/10/31/ai-bias-resume-screening-race-gender/',
      ano: 2024, selo: 'independente', amostra: '550+ currículos, 3 modelos de IA', tema: 'pessoas',
    },
    vies_feedback_textio: {
      titulo: 'Feedback escrito pela IA repetiu estereótipos de gênero',
      texto: 'A Textio, empresa de software de RH, pediu ao ChatGPT milhares de feedbacks com pedidos neutros. A IA presumiu que enfermeiros eram mulheres 9 em cada 10 vezes; com o gênero no pedido, o feedback para mulheres saiu cerca de 15% mais longo e mais crítico. Teste informal com o ChatGPT de jan. 2023: alerta, não medida atual.',
      fonte: 'Kieran Snyder (Textio), “I wrote thousands of pieces of performance feedback with ChatGPT...”, 25 jan. 2023',
      curta: 'Textio, 2023',
      url: 'https://textio.com/blog/chatgpt-writes-performance-feedback',
      ano: 2023, selo: 'fornecedor', amostra: 'teste informal', tema: 'pessoas',
    },
    // ================================================================ Aprender e criar hábito (aprender)
    tutor_ia: {
      titulo: 'Um tutor de IA bem planejado dobrou o aprendizado numa aula de física',
      texto: 'Em Harvard, 194 alunos de física tiveram aula com metodologia ativa e também um tutor de IA montado pelos professores. Com o tutor, o ganho de aprendizado (mediana) foi mais que o dobro, e 70% estudaram menos de 60 minutos. Os autores avisam: o tutor foi preparado com cuidado por especialistas e não deve substituir o professor.',
      fonte: 'Kestin, Miller, Klales, Milbourne e Ponti (Harvard), AI tutoring outperforms in-class active learning, Scientific Reports 15, 17458 (jun. 2025)',
      curta: 'Harvard (Sci. Reports), 2025',
      url: 'https://www.nature.com/articles/s41598-025-97652-6',
      ano: 2025, selo: 'independente', amostra: '194 alunos, 1 curso', tema: 'aprender',
    },
    mollick_10_horas: {
      titulo: 'Leva umas 10 horas de uso real para “pegar o jeito”',
      texto: 'Ethan Mollick, professor da Wharton e autor de “Co-Intelligence”, estima que são necessárias de 5 a 10 horas usando IA em tarefas reais do trabalho para entender o que ela faz bem e mal no seu caso. Ele sugere tratá-la como um estagiário: dar contexto, revisar e corrigir. É estimativa de especialista, não resultado de pesquisa.',
      fonte: 'Ethan Mollick, On-boarding your AI Intern, One Useful Thing, 20 maio 2023',
      curta: 'Mollick, 2023',
      url: 'https://www.oneusefulthing.org/p/on-boarding-your-ai-intern',
      ano: 2023, selo: 'independente', amostra: 'opinião de especialista', tema: 'aprender',
    },
    mollick_guia_2026: {
      titulo: 'Guia de especialista: delegue uma tarefa real, com a aprovação ligada',
      texto: 'No guia de julho de 2026, Ethan Mollick recomenda escolher uma das IAs principais, pagar o plano de cerca de US$ 20 por mês e entregar a ela uma tarefa real, deixando ligada a aprovação para tudo que envia, gasta ou apaga: textos maliciosos que tentam enganar a IA ainda são problema sem solução. É opinião de especialista.',
      fonte: 'Ethan Mollick, An opinionated guide to which AI to use to do stuff: The Summer 2026 Edition, One Useful Thing, 23 jul. 2026',
      curta: 'Mollick, 2026',
      url: 'https://www.oneusefulthing.org/p/an-opinionated-guide-to-which-ai-b22',
      ano: 2026, selo: 'independente', amostra: 'opinião de especialista', tema: 'aprender',
    },
    cetic_idosos: {
      titulo: 'Nunca é tarde: a turma 60+ está chegando na internet',
      texto: 'Na TIC Domicílios 2025, 90% dos brasileiros de 45 a 59 anos e 59% dos que têm 60 anos ou mais usavam internet. Contando quem acessou nos três meses anteriores, o grupo 60+ passou de 16% em 2015 para 54% em 2025. Ainda assim, cerca de 16 milhões de brasileiros com 60 anos ou mais não usam internet.',
      fonte: 'Cetic.br/NIC.br (CGI.br), TIC Domicílios 2025 (tabelas C2 e C2A e resumo executivo) e TIC Domicílios 2015',
      curta: 'Cetic.br, TIC Domicílios 2025',
      url: 'https://cetic.br/pt/tics/domicilios/2025/individuos/C2A/',
      ano: 2025, selo: 'independente', amostra: 'pesquisa nacional em domicílios', tema: 'aprender',
    },
    lally_habito_66_dias: {
      titulo: 'Hábito leva semanas, e falhar um dia não estraga',
      texto: 'Num estudo da University College London, 96 voluntários repetiram todo dia, no mesmo contexto (como depois do café da manhã), um hábito simples. Entre os 39 com dados bons o bastante, o hábito levou de 18 a 254 dias para ficar quase automático, com mediana de 66 dias. Perder um dia isolado não atrapalhou. A amostra era jovem.',
      fonte: 'Lally, van Jaarsveld, Potts e Wardle (UCL), How are habits formed, European Journal of Social Psychology 40(6): 998-1009 (2010)',
      curta: 'Lally et al. (UCL), 2010',
      url: 'https://doi.org/10.1002/ejsp.674',
      ano: 2010, selo: 'independente', amostra: '96 voluntários, idade média de 27 anos', tema: 'aprender',
    },
    singh_habito_manha: {
      titulo: 'Hábitos da manhã e escolhidos pela própria pessoa pegam mais',
      texto: 'Uma revisão de 2024 com 20 estudos e 2.601 participantes (médias de idade de 21,5 a 73,5 anos) achou medianas de 59 a 66 dias para formar um hábito, com enorme variação entre pessoas (de 4 a 335 dias). Práticas feitas de manhã e hábitos escolhidos pela própria pessoa tenderam a ficar mais fortes. Eram hábitos de saúde.',
      fonte: 'Singh, Murphy, Maher e Smith, Time to Form a Habit: A Systematic Review and Meta-Analysis, Healthcare 12(23): 2488 (2024)',
      curta: 'Singh et al., 2024',
      url: 'https://doi.org/10.3390/healthcare12232488',
      ano: 2024, selo: 'independente', amostra: '20 estudos, 2.601 pessoas', tema: 'aprender',
    },
    gollwitzer_se_entao: {
      titulo: 'Planejar “se acontecer X, faço Y” ajuda a cumprir metas',
      texto: 'Uma meta-análise de 94 testes mostrou que planos do tipo “se a situação X acontecer, então farei Y” tiveram efeito médio a grande no alcance de metas. Ajudaram a começar, a resistir a distrações e a largar o que não funcionava. As metas eram do dia a dia, como saúde e estudo; aplicar ao uso de IA é uma extrapolação razoável.',
      fonte: 'Gollwitzer e Sheeran, Implementation Intentions and Goal Achievement: A Meta-Analysis, Advances in Experimental Social Psychology 38 (2006)',
      curta: 'Gollwitzer & Sheeran, 2006',
      url: 'https://www.socmot.uni-konstanz.de/sites/default/files/06_Gollwitzer_Sheeran_Implementation_Intentions_And_Goal.pdf',
      ano: 2006, selo: 'independente', amostra: 'meta-análise de 94 testes', tema: 'aprender',
    },
    // ================================================================ Golpes e segurança (seguranca)
    arup_videochamada: {
      titulo: 'Uma videochamada inteira de mentira custou US$ 25 milhões',
      texto: 'No início de 2024, um funcionário financeiro da Arup em Hong Kong entrou numa videochamada com quem parecia ser o diretor financeiro e outros colegas. Todos eram falsos, recriados por IA. Ele tinha desconfiado do e-mail pedindo uma “transação secreta”, mas a chamada o convenceu: fez 15 transferências, uns US$ 25,6 milhões.',
      fonte: 'CNN Business (Kathleen Magramo), “British engineering giant Arup revealed as $25 million deepfake scam victim”, 16 maio 2024',
      curta: 'CNN, 2024',
      url: 'https://edition.cnn.com/2024/05/16/tech/arup-deepfake-scam-loss-hong-kong-intl-hnk',
      ano: 2024, selo: 'imprensa', amostra: '1 caso real', tema: 'seguranca',
    },
    arup_45_minutos: {
      titulo: 'O diretor de TI da Arup fez um deepfake de si mesmo em 45 minutos',
      texto: 'Depois do golpe, Rob Greig, diretor de TI da Arup, tentou fazer um vídeo falso de si mesmo, em tempo real, com programas gratuitos. Levou uns 45 minutos. Não ficou muito convincente, mas o surpreendeu. Nenhum sistema foi invadido: as pessoas é que foram enganadas. “Temos que começar a questionar o que vemos.”',
      fonte: 'Fórum Econômico Mundial (David Elliott), entrevista com Rob Greig, CIO da Arup, 4 fev. 2025',
      curta: 'WEF/Arup, 2025',
      url: 'https://www.weforum.org/stories/2025/02/deepfake-ai-cybercrime-arup/',
      ano: 2025, selo: 'empresa', amostra: '1 relato pessoal', tema: 'seguranca',
    },
    wpp_teams: {
      titulo: 'Golpistas tentaram se passar pelo CEO do maior grupo de publicidade do mundo',
      texto: 'Em 2024, golpistas criaram um WhatsApp com a foto pública de Mark Read, CEO da WPP, e marcaram uma reunião no Teams com voz clonada e vídeos tirados do YouTube, para arrancar dinheiro e dados de um líder do grupo. Não deu certo. Read avisou a equipe: “Só porque a conta tem a minha foto não quer dizer que sou eu.”',
      fonte: 'The Guardian (Nick Robins-Early), “CEO of world’s biggest ad firm targeted by deepfake scam”, 10 maio 2024',
      curta: 'The Guardian, 2024',
      url: 'https://www.theguardian.com/technology/article/2024/may/10/ceo-wpp-deepfake-scam',
      ano: 2024, selo: 'imprensa', amostra: '1 caso real', tema: 'seguranca',
    },
    ferrari_livro: {
      titulo: 'Na Ferrari, uma pergunta pessoal derrubou o falso CEO',
      texto: 'Em julho de 2024, um executivo da Ferrari recebeu mensagens no WhatsApp, de número desconhecido, como se fossem do CEO, sobre uma grande aquisição, pedindo sigilo. Na ligação, a voz imitava o sotaque do chefe, mas o tom destoava um pouco. Ele perguntou o título do livro que o CEO recomendara dias antes. O golpista desligou.',
      fonte: 'MIT Sloan Management Review (Galletti e Pani), “How Ferrari Hit the Brakes on a Deepfake CEO”, 27 jan. 2025; caso revelado pela Bloomberg em jul. 2024',
      curta: 'MIT Sloan/Bloomberg, 2024',
      url: 'https://sloanreview.mit.edu/article/how-ferrari-hit-the-brakes-on-a-deepfake-ceo/',
      ano: 2024, selo: 'imprensa', amostra: '1 caso real', tema: 'seguranca',
    },
    crosetto_moratti: {
      titulo: 'Empresário experiente caiu na voz clonada de um ministro',
      texto: 'Em 2025, na Itália, golpistas imitaram com IA a voz do ministro da Defesa e pediram a empresários famosos dinheiro urgente para libertar jornalistas sequestrados. Pelo que se sabe, só Massimo Moratti, ex-dono da Inter de Milão, pagou: quase € 1 milhão, que a polícia congelou. “Parecia tudo real. Pode acontecer com qualquer um.”',
      fonte: 'Reuters (Angelo Amante), “Italian police freeze cash from AI-voice scam that targeted business leaders”, 12 fev. 2025',
      curta: 'Reuters, 2025',
      url: 'https://www.yahoo.com/news/italian-police-freeze-cash-ai-191616980.html',
      ano: 2025, selo: 'imprensa', amostra: '1 caso real', tema: 'seguranca',
    },
    singapura_rapidez: {
      titulo: 'Em Singapura, avisar rápido salvou meio milhão de dólares',
      texto: 'Em março de 2025, um diretor de finanças transferiu mais de US$ 499 mil após uma videochamada com um falso CEO feito por deepfake. Quando pediram mais US$ 1,4 milhão, ele desconfiou e avisou o banco, que acionou a polícia: no dia seguinte, o valor foi bloqueado. A polícia recomenda protocolo para confirmar ordens de executivos.',
      fonte: 'Polícia de Singapura (SPF), comunicado de 7 abr. 2025, e alerta conjunto SPF, MAS e CSA de 12 mar. 2025',
      curta: 'Polícia de Singapura, 2025',
      url: 'https://www.police.gov.sg/media-hub/news/2025/04/20250407_singapore_and_hong_kong_police_force_recover_over_$670000_in_a_scam',
      ano: 2025, selo: 'governo', amostra: '1 caso real', tema: 'seguranca',
    },
    wiz_voz_de_palco: {
      titulo: 'Na Wiz, o clone usou a “voz de palco” do CEO, e a equipe notou',
      texto: 'Em 2024, dezenas de funcionários da empresa de cibersegurança Wiz receberam uma mensagem de voz do “CEO” pedindo senhas. Os golpistas clonaram a voz de uma palestra. Como ele tem ansiedade de falar em público, a voz do palco era diferente da do dia a dia, e o pessoal desconfiou. Foi sorte, não método.',
      fonte: 'TechCrunch, “Wiz CEO says company was targeted with deepfake attack that used his voice”, 28 out. 2024',
      curta: 'TechCrunch, 2024',
      url: 'https://techcrunch.com/2024/10/28/wiz-ceo-says-company-was-targeted-with-deepfake-attack-that-used-his-voice/',
      ano: 2024, selo: 'empresa', amostra: '1 caso real', tema: 'seguranca',
    },
    lastpass_canal: {
      titulo: 'Na LastPass, o canal estranho e a pressa entregaram o golpe',
      texto: 'Em abril de 2024, um funcionário da LastPass recebeu pelo WhatsApp ligações, mensagens e um recado de voz com a voz falsa do CEO. Ele ignorou e avisou a segurança por dois motivos: o contato vinha fora dos canais normais da empresa e tinha pressa forçada, sinal clássico de golpe. A empresa não teve prejuízo.',
      fonte: 'LastPass (blog oficial), “Attempted Audio Deepfake Call Targets LastPass Employee”, 10 abr. 2024',
      curta: 'LastPass, 2024',
      url: 'https://blog.lastpass.com/posts/attempted-audio-deepfake-call-targets-lastpass-employee',
      ano: 2024, selo: 'empresa', amostra: '1 caso real', tema: 'seguranca',
    },
    mcafee_voz: {
      titulo: 'Poucos segundos de voz bastam para um clone convincente',
      texto: 'Pesquisadores da McAfee usaram uma ferramenta gratuita e, com 3 a 4 segundos de gravação, criaram um clone de voz com cerca de 85% de semelhança. Numa pesquisa com 7.054 adultos de 7 países (sem o Brasil), 1 em cada 10 disse já ter sido alvo de golpe de voz com IA; entre as vítimas, 77% perderam dinheiro.',
      fonte: 'McAfee, Beware the Artificial Impostor (relatório, 2023); pesquisa online da MSI-ACI, abr. 2023',
      curta: 'McAfee, 2023',
      url: 'https://www.mcafee.com/content/dam/consumer/en-us/resources/cybersecurity/artificial-intelligence/rp-beware-the-artificial-impostor-report.pdf',
      ano: 2023, selo: 'fornecedor', amostra: '7.054 adultos, 7 países', tema: 'seguranca',
    },
    ucl_ouvido_falha: {
      titulo: 'Mesmo avisado, o ouvido erra a voz falsa',
      texto: 'Na University College London, 529 pessoas ouviram vozes reais e falsas em inglês e mandarim. Mesmo sabendo que algumas eram falsas, só acertaram 73% das vezes, e ouvir exemplos antes ajudou pouco. Na vida real ninguém avisa. Para os autores, treinar o ouvido “não é realista”. Confirme por outro canal.',
      fonte: 'Mai, Bray, Davies e Griffin (UCL), Warning: Humans cannot reliably detect speech deepfakes, PLOS ONE 18(8), ago. 2023',
      curta: 'UCL (PLOS ONE), 2023',
      url: 'https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0285333',
      ano: 2023, selo: 'independente', amostra: '529 pessoas', tema: 'seguranca',
    },
    golpe_voz_tecmundo: {
      titulo: 'Uns poucos segundos de áudio já bastam para imitar uma voz',
      texto: 'Especialistas ouvidos pelo TecMundo dizem que já há ferramentas que criam uma voz falsa a partir de cerca de 15 segundos de áudio, e que nem sempre dá para perceber só de ouvir. A principal dica é parar e validar por outro canal, ligando para o número que você já conhece. Quanto mais pressa do outro lado, mais desconfiança.',
      fonte: 'TecMundo (portal Estadão), Alice Labate, “Golpe com voz clonada por IA avança no Brasil; veja como se proteger”, 28 abr. 2026',
      curta: 'TecMundo, 2026',
      url: 'https://www.estadao.com.br/tecmundo/inteligencia-artificial/412687-golpe-com-voz-clonada-por-ia-avanca-no-brasil-veja-como-se-proteger/',
      ano: 2026, selo: 'imprensa', amostra: 'opinião de especialistas', tema: 'seguranca',
    },
    golpe_voz_canaltech: {
      titulo: 'Pai perdeu R$ 600 ao ouvir a “voz do filho”',
      texto: 'Em 2023, o Canaltech contou o caso de um pai que perdeu R$ 600: recebeu, de um número desconhecido, uma ligação com a voz do filho, imitada por IA, pedindo uma transferência rápida. Os dois nunca tinham combinado uma palavra-chave. A dica: combinar uma com a família e, na dúvida, desligar e procurar a pessoa por outro meio.',
      fonte: 'Canaltech (Felipe Demartini), “Brasileiros já são alvo de golpe com clonagem de voz por IA; proteja-se”, 16 maio 2023',
      curta: 'Canaltech, 2023',
      url: 'https://canaltech.com.br/seguranca/brasileiros-ja-sao-alvo-de-golpe-com-clonagem-de-voz-por-ia-proteja-se-249694/',
      ano: 2023, selo: 'imprensa', amostra: '1 caso real', tema: 'seguranca',
    },
    fbi_palavra_secreta: {
      titulo: 'FBI recomenda: combine uma palavra secreta com a família',
      texto: 'Em dezembro de 2024, o FBI alertou que criminosos usam IA para imitar a voz de parentes “em apuros” e pedir dinheiro ou resgate. A primeira dica do órgão: combinar com a família uma palavra ou frase secreta para confirmar quem está falando. Na dúvida, desligue e ligue de volta para o número que você já conhece.',
      fonte: 'FBI / Internet Crime Complaint Center (IC3), alerta I-120324-PSA, 3 dez. 2024',
      curta: 'FBI, 2024',
      url: 'https://www.ic3.gov/PSA/2024/PSA241203',
      ano: 2024, selo: 'governo', amostra: '', tema: 'seguranca',
    },
    fbi_ic3_2025: {
      titulo: 'FBI: o golpe do “e-mail do chefe” tira bilhões das empresas',
      texto: 'Em 2025, o FBI registrou US$ 3,05 bilhões em perdas com golpes em que o criminoso se passa por executivo ou fornecedor para desviar pagamentos, em 24.768 queixas. As queixas que citavam IA somaram mais de US$ 893 milhões em perdas. São só casos denunciados nos EUA, e muita vítima nem percebe que houve IA.',
      fonte: 'FBI, Internet Crime Complaint Center (IC3), 2025 IC3 Annual Report (abr. 2026)',
      curta: 'FBI, 2026',
      url: 'https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf',
      ano: 2026, selo: 'governo', amostra: 'queixas registradas nos EUA', tema: 'seguranca',
    },
    golpes_brasil: {
      titulo: '1 em cada 4 brasileiros perdeu dinheiro com golpe digital',
      texto: 'Uma pesquisa do DataSenado de 2024, com 21.808 pessoas, mostrou que 24% dos brasileiros com mais de 16 anos perderam dinheiro com golpes digitais em 12 meses: mais de 40,85 milhões de pessoas. Não há “perfil de vítima”: acontece em todas as idades, rendas e escolaridades. São golpes digitais em geral, não só com IA.',
      fonte: 'Instituto DataSenado (Senado Federal), Panorama Político 2024, divulgado pela Agência Senado em 1º out. 2024',
      curta: 'DataSenado, 2024',
      url: 'https://www12.senado.leg.br/noticias/materias/2024/10/01/golpes-digitais-atingem-24-da-populacao-brasileira-revela-datasenado',
      ano: 2024, selo: 'governo', amostra: '21.808 pessoas', tema: 'seguranca',
    },
    banco_nunca_pede: {
      titulo: 'Banco não pede senha, código nem Pix por telefone',
      texto: 'A Febraban, federação dos bancos, avisa: banco nenhum pede senha, código, token, nem que você faça Pix ou transferência para “resolver um problema na conta”. Se receber esse tipo de ligação, desligue na hora e fale com o banco pelos canais oficiais, como o aplicativo do banco. Códigos e senhas são pessoais e intransferíveis.',
      fonte: 'Febraban (Federação Brasileira de Bancos), “Febraban faz alerta sobre o golpe do falso gerente”, 6 mar. 2026',
      curta: 'Febraban, 2026',
      url: 'https://portal.febraban.org.br/noticia/4431/pt-br/',
      ano: 2026, selo: 'empresa', amostra: '', tema: 'seguranca',
    },
    pix_contestacao: {
      titulo: 'Caiu num golpe no Pix? Existe botão de contestação',
      texto: 'Desde 1º de outubro de 2025, o Banco Central liberou o “botão de contestação” do Pix: quem foi vítima de golpe, fraude ou coerção pode pedir a devolução no aplicativo do próprio banco. Não há garantia, e não vale para Pix enviado por engano, mas agir rápido aumenta a chance de ainda haver dinheiro na conta do golpista.',
      fonte: 'Agência Brasil (EBC), “Botão de contestação do Pix está disponível aos usuários”, 1º out. 2025, com informações do Banco Central',
      curta: 'Agência Brasil/BC, 2025',
      url: 'https://agenciabrasil.ebc.com.br/economia/noticia/2025-10/botao-de-contestacao-do-pix-esta-disponivel-aos-usuarios',
      ano: 2025, selo: 'governo', amostra: '', tema: 'seguranca',
    },
    gisele_modo_selva: {
      titulo: 'No Brasil, quadrilha usava vídeos falsos de Gisele Bündchen',
      texto: 'Em outubro de 2025, a Polícia Civil do RS fez a Operação Modo Selva contra um grupo que usava deepfakes de Gisele Bündchen e outras famosas em anúncios no Facebook e no Instagram, oferecendo produtos que não existiam. As vítimas pagavam um “frete” por Pix, muitas vezes de R$ 20 a R$ 100. O grupo movimentou mais de R$ 20 milhões.',
      fonte: 'SBT News, “Polícia do RS mira quadrilha que usava deepfake de Gisele Bündchen para aplicar golpes”, 1º out. 2025',
      curta: 'SBT News, 2025',
      url: 'https://sbtnews.sbt.com.br/noticia/policia/policia-do-rs-mira-quadrilha-que-usava-deepfake-de-gisele-buendchen-para-aplicar-golpes',
      ano: 2025, selo: 'imprensa', amostra: '1 operação policial', tema: 'seguranca',
    },
    owasp_injecao: {
      titulo: 'Um documento pode trazer ordens escondidas para a IA',
      texto: 'A OWASP, entidade sem fins lucrativos que cria padrões de segurança, pôs a “injeção de instruções” em 1º lugar na sua lista de riscos de 2025 para aplicações com IA. Um site, arquivo ou e-mail pode trazer ordens que a IA obedece, mesmo invisíveis para quem lê. Não há proteção infalível: ação de alto risco exige aprovação humana.',
      fonte: 'OWASP Gen AI Security Project, LLM01:2025 Prompt Injection (OWASP Top 10 for LLM Applications 2025)',
      curta: 'OWASP, 2025',
      url: 'https://genai.owasp.org/llmrisk/llm01-prompt-injection/',
      ano: 2025, selo: 'independente', amostra: '', tema: 'seguranca',
    },
    echoleak_copilot: {
      titulo: 'Um e-mail com ordens escondidas fez a IA do Office vazar dados (em teste)',
      texto: 'Em 2025, pesquisadores mostraram uma falha no Microsoft 365 Copilot: bastava mandar um e-mail com instruções escondidas para a IA buscar dados internos e mandá-los para fora, sem ninguém clicar em nada. A Microsoft classificou a falha como crítica, corrigiu antes de ela vir a público e disse que nenhum cliente foi afetado.',
      fonte: 'Fortune, “Exclusive: New Microsoft Copilot flaw signals broader risk of AI agents being hacked”, 11 jun. 2025; registro CVE-2025-32711 no NIST',
      curta: 'Fortune/NIST, 2025',
      url: 'https://fortune.com/2025/06/11/microsoft-copilot-vulnerability-ai-agents-echoleak-hacking/',
      ano: 2025, selo: 'imprensa', amostra: 'demonstração de pesquisadores', tema: 'seguranca',
    },
    // ================================================================ Dados, privacidade e leis (privacidade)
    samsung: {
      titulo: 'Funcionários da Samsung colaram segredos da empresa no ChatGPT',
      texto: 'Em 2023, engenheiros da Samsung colaram código-fonte interno no ChatGPT para pedir ajuda, e houve relato de anotações de reunião enviadas ao chatbot. Em maio, a empresa proibiu temporariamente a IA generativa nos aparelhos e redes da empresa e avisou que desrespeitar a regra poderia levar à demissão.',
      fonte: 'Bloomberg (Mark Gurman), publicado pela Bloomberg Línea Brasil em 2 maio 2023; também TecMundo e TechRadar',
      curta: 'Bloomberg/TecMundo, 2023',
      url: 'https://www.bloomberglinea.com.br/2023/05/02/samsung-proibe-funcionarios-de-usar-o-chatgpt-apos-vazamento-de-codigo-fonte/',
      ano: 2023, selo: 'imprensa', amostra: '1 caso real', tema: 'privacidade',
    },
    cisco_dados_colados: {
      titulo: 'Quase metade já colou informação interna da empresa em IA',
      texto: 'No estudo da Cisco de 2024, com 2.600 profissionais de privacidade e segurança em 12 países e regiões, 48% admitiram ter colocado informação não pública da empresa em IA generativa, e 45%, informações de funcionários. Justamente quem deveria saber. E 27% das organizações tinham proibido a IA, ao menos por um tempo.',
      fonte: 'Cisco, 2024 Data Privacy Benchmark Study, comunicado de 25 jan. 2024',
      curta: 'Cisco, 2024',
      url: 'https://newsroom.cisco.com/c/r/newsroom/en/us/a/y2024/m01/organizations-ban-use-of-generative-ai-over-data-privacy-security-cisco-study.html',
      ano: 2024, selo: 'fornecedor', amostra: '2.600 profissionais de privacidade e segurança', tema: 'privacidade',
    },
    ohbehave_2025: {
      titulo: 'Muita gente cola dado sigiloso do trabalho na IA sem avisar ninguém',
      texto: 'Numa pesquisa com mais de 6.500 pessoas em 7 países, Brasil incluído, 43% admitiram ter compartilhado informação sensível do trabalho com IA sem o empregador saber, como documentos internos, dados financeiros e de clientes. E 58% dos usuários nunca tiveram treino sobre os riscos. O comunicado não detalha a base de cada número.',
      fonte: 'National Cybersecurity Alliance e CybSafe, Oh Behave! 2025-2026, comunicado de 30 set. 2025',
      curta: 'NCA/CybSafe, 2025',
      url: 'https://www.staysafeonline.org/press/study-65-now-use-ai-but-majority-remain-untrained-on-risks',
      ano: 2025, selo: 'fornecedor', amostra: '6.500+ pessoas, 7 países', tema: 'privacidade',
    },
    ms_byoai: {
      titulo: '78% de quem usa IA no trabalho leva a própria ferramenta',
      texto: 'Na pesquisa da Microsoft e do LinkedIn com 31 mil trabalhadores do conhecimento em 31 países, 75% já usavam IA no trabalho. Entre eles, 78% usavam ferramentas próprias, não da empresa (80% nas pequenas e médias), e só 39% tinham sido treinados pela empresa. Muita IA entra sem a direção saber. A Microsoft vende IA.',
      fonte: 'Microsoft e LinkedIn, 2024 Work Trend Index Annual Report: AI at Work Is Here. Now Comes the Hard Part, 8 maio 2024',
      curta: 'Microsoft/LinkedIn, 2024',
      url: 'https://www.microsoft.com/en-us/worklab/work-trend-index/ai-at-work-is-here-now-comes-the-hard-part',
      ano: 2024, selo: 'fornecedor', amostra: '31.000 trabalhadores, 31 países', tema: 'privacidade',
    },
    ibm_ia_na_sombra: {
      titulo: '“IA na sombra” deixa vazamentos de dados mais caros',
      texto: 'Um estudo de 600 organizações que sofreram vazamento de dados (mar. 2024 a fev. 2025) achou que 1 em cada 5 teve vazamento causado por “IA na sombra”, usada sem aprovação da empresa. Só 37% tinham regras para lidar com isso, e quem tinha muita IA na sombra pagou em média US$ 670 mil a mais por vazamento. Associação, não causa.',
      fonte: 'IBM e Ponemon Institute, Cost of a Data Breach Report 2025, comunicado de 30 jul. 2025',
      curta: 'IBM, 2025',
      url: 'https://newsroom.ibm.com/2025-07-30-ibm-report-13-of-organizations-reported-breaches-of-ai-models-or-applications,-97-of-which-reported-lacking-proper-ai-access-controls',
      ano: 2025, selo: 'fornecedor', amostra: '600 organizações que sofreram vazamento', tema: 'privacidade',
    },
    planos_empresariais: {
      titulo: 'Nos planos para empresas, a IA não aprende com os dados da companhia (por padrão)',
      texto: 'A OpenAI diz que, por padrão, não treina modelos com dados do ChatGPT Enterprise, Business, Edu e da API; o Google diz o mesmo do Workspace corporativo, salvo permissão do cliente; e os planos comerciais da Anthropic ficam fora do treino. Na conta pessoal, quem confere as configurações é você. Regras mudam: reveja às vezes.',
      fonte: 'OpenAI, Business data privacy, security, and compliance; Anthropic, Updates to Consumer Terms (28 ago. 2025); Google, Workspace Privacy Hub — consultados em out. 2026',
      curta: 'OpenAI/Anthropic/Google, 2025-2026',
      url: 'https://openai.com/business-data/',
      ano: 2025, selo: 'fornecedor', amostra: '', tema: 'privacidade',
    },
    claude_treino_escolha: {
      titulo: 'No Claude pessoal, treinar com suas conversas virou escolha sua',
      texto: 'Desde agosto de 2025, quem usa os planos pessoais do Claude (Free, Pro e Max) escolhe se as conversas podem treinar novos modelos. Quem aceita tem os dados guardados por até 5 anos; quem recusa, por 30 dias. Os planos para empresas não mudaram. Dois meses antes, um especialista escrevia que o Claude não treinava com conversas.',
      fonte: 'Anthropic, Updates to Consumer Terms and Privacy Policy, 28 ago. 2025',
      curta: 'Anthropic, 2025',
      url: 'https://www.anthropic.com/news/updates-to-our-consumer-terms',
      ano: 2025, selo: 'fornecedor', amostra: '', tema: 'privacidade',
    },
    gemini_revisores_humanos: {
      titulo: 'No Gemini pessoal, pessoas podem ler parte das conversas',
      texto: 'A central de privacidade do Gemini avisa que revisores humanos leem uma parte das conversas para melhorar o serviço, que essas conversas ficam guardadas por até 3 anos, e pede: não digite informação confidencial. Dá para desligar a “Atividade” ou usar chats temporários, que não treinam modelos e ficam guardados por 72 horas.',
      fonte: 'Google, Gemini Apps Privacy Hub, consultado em out. 2026',
      curta: 'Google, 2026',
      url: 'https://support.google.com/gemini/answer/13594961?hl=en',
      ano: 2026, selo: 'fornecedor', amostra: '', tema: 'privacidade',
    },
    privacidade_config: {
      titulo: 'Dá para impedir que o ChatGPT aprenda com suas conversas',
      texto: 'O ChatGPT pessoal pode usar suas conversas para melhorar a IA, mas dá para desligar em Configurações, Controles de dados, “Melhorar o modelo para todos”. Para assuntos sensíveis há o “chat temporário”, guardado por até 30 dias. Mesmo assim, nunca ponha senha, dados do banco, CPF ou informação médica. Os menus podem mudar.',
      fonte: 'Canaltech (Viviane França), “Como impedir que o ChatGPT treine IA com seus dados”, 27 jun. 2026',
      curta: 'Canaltech, 2026',
      url: 'https://canaltech.com.br/inteligencia-artificial/como-impedir-que-o-chatgpt-treine-ia-com-seus-dados/',
      ano: 2026, selo: 'imprensa', amostra: '', tema: 'privacidade',
    },
    copilot_empresa_privacidade: {
      titulo: 'No Copilot da empresa, dados não treinam o modelo e respeitam permissões',
      texto: 'A Microsoft documenta que, no Microsoft 365 Copilot corporativo, pedidos, respostas e dados da empresa não treinam os modelos de base, e que o Copilot só mostra conteúdos que a pessoa já tem permissão para ver. Por isso, permissão frouxa vira risco: uma planilha sensível esquecida numa pasta aberta fica fácil de achar.',
      fonte: 'Microsoft Learn, Data, Privacy, and Security for Microsoft 365 Copilot, consultado em out. 2026',
      curta: 'Microsoft, 2026',
      url: 'https://learn.microsoft.com/en-us/copilot/microsoft-365/microsoft-365-copilot-privacy',
      ano: 2026, selo: 'fornecedor', amostra: '', tema: 'privacidade',
    },
    retencao_judicial: {
      titulo: 'Conversa apagada nem sempre some na hora',
      texto: 'Em 2025, no processo do New York Times contra a OpenAI, um tribunal dos EUA mandou guardar as conversas do ChatGPT, inclusive as apagadas, nos planos Free, Plus, Pro e Team e em parte da API; Enterprise e Edu ficaram de fora. A ordem acabou em setembro de 2025. Lição: não cole o que você não gostaria de ver lido num tribunal.',
      fonte: 'OpenAI, “How we’re responding to The New York Times’ data demands”, com atualização de 22 out. 2025',
      curta: 'OpenAI, 2025',
      url: 'https://openai.com/index/response-to-nyt-data-demands/',
      ano: 2025, selo: 'fornecedor', amostra: '1 caso real', tema: 'privacidade',
    },
    lgpd_dados_e_multa: {
      titulo: 'LGPD: o que é dado pessoal e quanto pode custar',
      texto: 'Pela LGPD, dado pessoal é qualquer informação ligada a uma pessoa identificada ou identificável. Dados de saúde, origem racial, religião, opinião política, vida sexual, genética ou biometria são “sensíveis”. A multa vai até 2% do faturamento no Brasil, limitada a R$ 50 milhões por infração. Trocar só o nome nem sempre anonimiza.',
      fonte: 'Lei nº 13.709/2018 (Lei Geral de Proteção de Dados), art. 5º, I a III, e art. 52, II',
      curta: 'LGPD, 2018',
      url: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm',
      ano: 2018, selo: 'governo', amostra: '', tema: 'privacidade',
    },
    anpd_prompt_lgpd: {
      titulo: 'A ANPD avisa: o que você cola na IA conta como tratamento de dados',
      texto: 'Num estudo técnico sobre IA generativa (nov. 2024), a ANPD cita que usuários anexam à IA “documentos empresariais confidenciais” e “atas de reuniões”, e diz que quem compartilha com a IA dados pessoais de outras pessoas pode, conforme o contexto, responder por eles pela LGPD. É estudo técnico, não norma: valide com o jurídico.',
      fonte: 'ANPD, Radar Tecnológico nº 3: Inteligência Artificial Generativa, nov. 2024; Lei 13.709/2018 (LGPD)',
      curta: 'ANPD, 2024; LGPD',
      url: 'https://www.gov.br/anpd/pt-br/centrais-de-conteudo/documentos-tecnicos-orientativos/radar_tecnologico_ia_generativa_anpd.pdf',
      ano: 2024, selo: 'governo', amostra: '', tema: 'privacidade',
    },
    anpd_meta_suspensao: {
      titulo: 'A ANPD já enfrentou a Meta por causa de IA',
      texto: 'Em julho de 2024, a ANPD mandou a Meta suspender o uso de dados de brasileiros do Facebook, Messenger e Instagram para treinar IA, sob multa diária de R$ 50 mil. Em agosto, liberou após aprovar um plano: nada de dados de menores de 18 anos e um jeito mais fácil de recusar. O Idec, de defesa do consumidor, criticou a liberação.',
      fonte: 'Teletime, 2 jul. 2024; Mobile Time, 30 ago. 2024 (duas reportagens)',
      curta: 'Teletime/Mobile Time, 2024',
      url: 'https://teletime.com.br/02/07/2024/anpd-determina-suspensao-da-nova-politica-de-privacidade-da-meta/',
      ano: 2024, selo: 'governo', amostra: '1 caso real', tema: 'privacidade',
    },
    pl2338_status: {
      titulo: 'A lei de IA ainda não saiu, mas a LGPD já vale',
      texto: 'O PL 2.338/2023, o “marco legal da IA”, passou no Senado em dezembro de 2024, mas em outubro de 2026 ainda não tinha sido votado na Câmara: o relator adiou a votação para depois das eleições, e o texto pode mudar. Na versão do Senado, usar IA para contratar, promover, demitir ou avaliar pessoas seria “alto risco”.',
      fonte: 'Texto do PL 2.338/2023 na Câmara (17 mar. 2025); ficha de tramitação da Câmara; Mobile Time e Convergência Digital, 24 ago. 2026',
      curta: 'Câmara/Mobile Time, 2026',
      url: 'https://www.camara.leg.br/proposicoesWeb/prop_mostrarintegra?codteor=2868197&filename=PL+2338%2F2023',
      ano: 2026, selo: 'governo', amostra: '', tema: 'privacidade',
    },
    oab_recomendacao_ia: {
      titulo: 'Até a OAB já escreveu regras para usar IA com sigilo',
      texto: 'Em novembro de 2024, a OAB aprovou recomendações para advogados usarem IA generativa: proteger o sigilo e evitar o que identifique o cliente; escolher fornecedor que permita não usar os dados para treinar a IA; revisar tudo antes de usar; e, para gestores, criar regras, treinar e acompanhar. Bom modelo para qualquer empresa.',
      fonte: 'Conselho Federal da OAB, Recomendação sobre o uso de IA generativa na prática jurídica, aprovada em 11 nov. 2024',
      curta: 'OAB, 2024',
      url: 'https://s.oab.org.br/arquivos/2024/11/80a03f8d-e4cb-4bac-a3ea-357009f77d3f.pdf',
      ano: 2024, selo: 'governo', amostra: '', tema: 'privacidade',
    },
    // ================================================================ A ciência por trás deste jogo (persuasao)
    dietvorst_erro_maquina: {
      titulo: 'O erro da máquina pesa mais que o erro humano',
      texto: 'Em 5 experimentos da Wharton, quem viu um modelo estatístico errar perdeu a confiança nele mais depressa do que perderia numa pessoa com o mesmo erro, e passou a preferir a pessoa, mesmo depois de ver o modelo acertar mais. Os modelos faziam previsões numéricas, não eram chatbots, e os participantes não eram executivos.',
      fonte: 'Dietvorst, Simmons e Massey, Algorithm Aversion, Journal of Experimental Psychology: General 144(1): 114-126 (2015)',
      curta: 'Dietvorst et al., 2015',
      url: 'https://faculty.wharton.upenn.edu/wp-content/uploads/2016/11/20-Dietvorst-Simmons-Massey-2015.pdf',
      ano: 2015, selo: 'independente', amostra: '5 experimentos', tema: 'persuasao',
    },
    dietvorst_poder_editar: {
      titulo: 'Quando pode mexer no resultado, a pessoa aceita a máquina',
      texto: 'Num experimento da Wharton com 288 pessoas, só 32% de quem não podia alterar as previsões de um modelo estatístico escolheu usá-lo. Entre quem podia fazer pequenos ajustes, de 73% a 76% escolheram o modelo. Num estudo com 816 pessoas, mesmo ajustes mínimos bastaram (de 68% a 71%, contra 47%). Não envolvia IA generativa.',
      fonte: 'Dietvorst, Simmons e Massey, Overcoming Algorithm Aversion, Management Science 64(3): 1155-1170 (2018)',
      curta: 'Dietvorst et al., 2018',
      url: 'https://marketing.wharton.upenn.edu/wp-content/uploads/2020/07/Dietvorst-Overcoming-Algorithm-Aversion.pdf',
      ano: 2018, selo: 'independente', amostra: '288 e 816 participantes', tema: 'persuasao',
    },
    logg_especialistas_descontam: {
      titulo: 'Especialistas desprezam o conselho do “algoritmo” e às vezes erram mais',
      texto: 'Num experimento de 2019, 301 leigos e 70 especialistas em segurança nacional dos EUA fizeram previsões e receberam o mesmo conselho, rotulado como de uma pessoa ou de um algoritmo. Os especialistas descontaram qualquer conselho e, com o rótulo “algoritmo”, ficaram menos precisos que os leigos. A meta é calibrar a confiança.',
      fonte: 'Logg, Minson e Moore, Algorithm appreciation, Organizational Behavior and Human Decision Processes 151: 90-103 (2019)',
      curta: 'Logg, Minson & Moore, 2019',
      url: 'https://doi.org/10.1016/j.obhdp.2018.12.005',
      ano: 2019, selo: 'independente', amostra: '301 leigos e 70 especialistas', tema: 'persuasao',
    },
    davis_tam_utilidade: {
      titulo: 'Ser útil pesa mais que ser fácil',
      texto: 'Nos dois estudos que criaram o Modelo de Aceitação de Tecnologia (152 usuários), a utilidade percebida teve ligação mais forte com o uso atual e o previsto (correlações de 0,63 e 0,85) que a facilidade de uso (0,45 e 0,59). A facilidade talvez aja mais fazendo a ferramenta parecer útil. É de 1989, com softwares de escritório.',
      fonte: 'Fred D. Davis, Perceived Usefulness, Perceived Ease of Use, and User Acceptance of Information Technology, MIS Quarterly 13(3) (1989)',
      curta: 'Davis, 1989',
      url: 'https://doi.org/10.2307/249008',
      ano: 1989, selo: 'independente', amostra: '152 usuários', tema: 'persuasao',
    },
    utaut_idade_esforco: {
      titulo: 'Com mais idade, esforço e apoio contam mais',
      texto: 'O modelo UTAUT, testado em 4 organizações e confirmado em outras 2, explicou cerca de 70% da intenção de usar uma tecnologia. O esforço percebido pesou mais para os mais velhos, e o apoio disponível (ajuda, estrutura) só influenciou o uso de fato entre os mais velhos com mais experiência. Dados do início dos anos 2000.',
      fonte: 'Venkatesh, Morris, Davis e Davis, User Acceptance of Information Technology: Toward a Unified View, MIS Quarterly 27(3) (2003)',
      curta: 'Venkatesh et al. (UTAUT), 2003',
      url: 'https://doi.org/10.2307/30036540',
      ano: 2003, selo: 'independente', amostra: '6 organizações', tema: 'persuasao',
    },
    utaut2_habito: {
      titulo: 'Depois que vira hábito, o hábito manda',
      texto: 'Na versão do modelo para consumidores (UTAUT2), com 1.512 usuários de internet no celular em Hong Kong, incluir hábito, prazer e custo elevou a parte explicada da intenção de uso de 56% para 74%. O efeito do hábito foi mais forte entre homens mais velhos com mais experiência. Dados de por volta de 2010.',
      fonte: 'Venkatesh, Thong e Xu, Consumer Acceptance and Use of Information Technology, MIS Quarterly 36(1) (2012)',
      curta: 'Venkatesh, Thong & Xu, 2012',
      url: 'https://doi.org/10.2307/41410412',
      ano: 2012, selo: 'independente', amostra: '1.512 usuários', tema: 'persuasao',
    },
    morris_venkatesh_idade: {
      titulo: 'O trabalhador mais velho olha para quem respeita e para o controle que tem',
      texto: 'Pesquisadores acompanharam 118 trabalhadores por 5 meses na chegada de um novo software. Os mais jovens decidiam usar pela própria opinião sobre a ferramenta. Os mais velhos se guiavam mais pelo que pessoas importantes pensavam e pela sensação de ter controle sobre o uso. O peso da opinião dos outros caiu com o tempo.',
      fonte: 'Morris e Venkatesh, Age Differences in Technology Adoption Decisions, Personnel Psychology 53(2) (2000)',
      curta: 'Morris & Venkatesh, 2000',
      url: 'https://doi.org/10.1111/j.1744-6570.2000.tb00206.x',
      ano: 2000, selo: 'independente', amostra: '118 trabalhadores, 1 organização', tema: 'persuasao',
    },
    czaja_create_ansiedade: {
      titulo: 'Ansiedade e autoconfiança explicam parte da distância entre gerações',
      texto: 'Num estudo com 1.204 adultos de 18 a 91 anos nos EUA, os mais velhos usavam menos tecnologia, e a ligação entre idade e uso passava pelas habilidades, pela autoconfiança e pela ansiedade com o computador. Os autores recomendam treinos que reduzam a ansiedade, num ambiente acolhedor e sem pressa. Dados de antes dos smartphones.',
      fonte: 'Czaja et al. (CREATE), Factors Predicting the Use of Technology, Psychology and Aging 21(2): 333-352 (2006)',
      curta: 'Czaja et al. (CREATE), 2006',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC1524856',
      ano: 2006, selo: 'independente', amostra: '1.204 adultos de 18 a 91 anos', tema: 'persuasao',
    },
    rogers_cinco_atributos: {
      titulo: 'Cinco características explicam boa parte da adoção de uma novidade',
      texto: 'Segundo Everett Rogers, de 49% a 87% da diferença na velocidade de adoção de inovações vem de cinco características: vantagem sobre o que existe, compatibilidade com o jeito de trabalhar, complexidade, chance de experimentar antes e resultado visível. A faixa só foi conferida em fonte secundária; vale para inovações em geral.',
      fonte: 'Everett M. Rogers, Diffusion of Innovations, 5ª ed. (2003), p. 221, citado pela Legal Evolution; Tornatzky e Klein (1982)',
      curta: 'Rogers, 2003; Tornatzky & Klein, 1982',
      url: 'https://www.legalevolution.org/2017/05/variables-determining-the-rate-of-adoption-of-innovations-008/',
      ano: 2003, selo: 'independente', amostra: 'revisão de estudos de adoção', tema: 'persuasao',
    },
    okeefe_dois_lados: {
      titulo: 'Admitir o lado contrário só convence se você responder a ele',
      texto: 'Uma meta-análise de 107 comparações, com 20.111 pessoas, mostrou que mensagens que apresentam e rebatem os argumentos contrários convencem um pouco mais que as de um lado só, e que citar o contra sem rebater convence menos. Fora da publicidade, só a versão que rebate aumentou a credibilidade de quem fala. Efeitos pequenos.',
      fonte: 'Daniel J. O’Keefe, How to Handle Opposing Arguments in Persuasive Messages, Communication Yearbook 22: 209-249 (1999)',
      curta: 'O\'Keefe, 1999',
      url: 'https://www.dokeefe.net/pub/OKeefe99AICA.pdf',
      ano: 1999, selo: 'independente', amostra: '107 comparações, 20.111 pessoas', tema: 'persuasao',
    },
    van_laer_transporte: {
      titulo: 'Histórias mudam atitudes, e a idade não atrapalha',
      texto: 'Uma meta-análise de 76 artigos mostrou que ficar absorvido por uma história está ligado a atitudes e intenções alinhadas a ela, e a menos pensamentos críticos. Personagens identificáveis e enredo fácil de imaginar ajudam. A idade de quem lê não fez diferença. Por isso, os números deste jogo ficam fora da história, com fonte.',
      fonte: 'van Laer, de Ruyter, Visconti e Wetzels, The Extended Transportation-Imagery Model, Journal of Consumer Research 40(5) (2014)',
      curta: 'van Laer et al., 2014',
      url: 'https://openaccess.city.ac.uk/id/eprint/6755/',
      ano: 2014, selo: 'independente', amostra: 'meta-análise de 76 artigos', tema: 'persuasao',
    },
    braddock_dillard_narrativa: {
      titulo: 'Narrativas mudam crenças, atitudes e até comportamento',
      texto: 'Uma meta-análise de estudos experimentais mostrou que ser exposto a uma narrativa está ligado a crenças, atitudes, intenções e comportamentos coerentes com a história (correlações de 0,17 a 0,23). O dado sobre comportamento vem de só 5 estudos. O meio, texto ou vídeo, não mudou o efeito.',
      fonte: 'Braddock e Dillard, Meta-analytic evidence for the persuasive effect of narratives, Communication Monographs 83(4) (2016)',
      curta: 'Braddock & Dillard, 2016',
      url: 'https://doi.org/10.1080/03637751.2015.1128555',
      ano: 2016, selo: 'independente', amostra: 'meta-análise de estudos experimentais', tema: 'persuasao',
    },
    wouters_jogos_serios: {
      titulo: 'Jogos sérios ensinam mais, mas o visual realista não é o que ensina',
      texto: 'Uma meta-análise com 77 comparações e 5.547 pessoas mostrou que jogos sérios ensinam um pouco mais que aulas comuns e o conteúdo dura mais na memória, mas não motivam mais. Visual esquemático funcionou melhor que realista. Ressalva: nos estudos com sorteio dos grupos, a vantagem sumiu, e só 2 comparações eram com adultos.',
      fonte: 'Wouters, van Nimwegen, van Oostendorp e van der Spek, A Meta-Analysis of the Cognitive and Motivational Effects of Serious Games, Journal of Educational Psychology 105(2) (2013)',
      curta: 'Wouters et al., 2013',
      url: 'https://doi.org/10.1037/a0031311',
      ano: 2013, selo: 'independente', amostra: '77 comparações, 5.547 pessoas', tema: 'persuasao',
    },
    sitzmann_simulacao: {
      titulo: 'Simulações aumentam a autoconfiança de quem treina',
      texto: 'Numa meta-análise de 65 amostras com 6.476 pessoas em treinamento profissional, jogos de simulação deixaram a autoconfiança 20% maior, o saber fazer 14% maior e a retenção 9% maior. Funcionaram melhor ensinando de forma ativa, com repetição livre e junto de outras aulas. A autora alerta para forte viés de publicação.',
      fonte: 'Traci Sitzmann, A Meta-Analytic Examination of the Instructional Effectiveness of Computer-Based Simulation Games, Personnel Psychology 64(2) (2011)',
      curta: 'Sitzmann, 2011',
      url: 'https://doi.org/10.1111/j.1744-6570.2011.01190.x',
      ano: 2011, selo: 'independente', amostra: '65 amostras, 6.476 pessoas', tema: 'persuasao',
    },
    bad_news_inoculacao: {
      titulo: 'Um jogo curto deixou as pessoas mais resistentes a notícias falsas',
      texto: 'No jogo “Bad News”, da Universidade de Cambridge, o jogador faz o papel de quem fabrica notícias falsas. Depois de jogar, cerca de 14 mil participantes deram notas de confiabilidade menores a manchetes falsas (de 2,61 para 2,06, numa escala de 1 a 7), sem desconfiar mais das verdadeiras. Não houve grupo de controle sorteado.',
      fonte: 'Roozenbeek e van der Linden (Cambridge), Fake news game confers psychological resistance against online misinformation, Palgrave Communications 5: 65 (2019)',
      curta: 'Roozenbeek & van der Linden, 2019',
      url: 'https://doi.org/10.1057/s41599-019-0279-9',
      ano: 2019, selo: 'independente', amostra: 'cerca de 14 mil jogadores', tema: 'persuasao',
    },
    goldstein_norma_local: {
      titulo: 'O exemplo de gente parecida convence mais',
      texto: 'Num hotel dos EUA, cartões dizendo que a maioria dos hóspedes reutilizava as toalhas superaram o apelo ambiental: 44,1% contra 35,1% de reutilização. Num segundo experimento, dizer que a maioria dos hóspedes daquele mesmo quarto reutilizava chegou a 49,3%, contra 42,8% de outras mensagens sobre o que os outros fazem.',
      fonte: 'Goldstein, Cialdini e Griskevicius, A Room with a Viewpoint, Journal of Consumer Research 35(3) (2008)',
      curta: 'Goldstein, Cialdini & Griskevicius, 2008',
      url: 'https://doi.org/10.1086/586910',
      ano: 2008, selo: 'independente', amostra: '2 experimentos num hotel', tema: 'persuasao',
    },
    li_shi_reatancia: {
      titulo: 'Tom de ordem gera resistência',
      texto: 'Uma meta-análise de 2025 (33 estudos, 146 efeitos) mostrou que frases que ameaçam a liberdade de escolha, como “você tem que”, aumentaram a raiva e a resistência de quem lê. Falar em ganhos ou em perdas não mudou a resistência. E a raiva e os pensamentos negativos estiveram ligados a menos persuasão. Convide, não mande.',
      fonte: 'Zixi Li e Jingyuan Shi, Message effects on psychological reactance: meta-analyses, Human Communication Research 52(1) (on-line em jun. 2025)',
      curta: 'Li & Shi, 2025',
      url: 'https://doi.org/10.1093/hcr/hqaf016',
      ano: 2025, selo: 'independente', amostra: '33 estudos, 146 efeitos', tema: 'persuasao',
    },
  };

  /** Rótulos dos temas, na ordem de leitura dos créditos. */
  const TEMAS = {
    ceo: 'CEOs e empresas pelo mundo',
    brasil: 'IA no Brasil',
    comunicacao: 'Pedir e escrever bem',
    produtividade: 'Tempo e produtividade',
    documentos: 'Documentos e contratos',
    limites: 'Onde a IA erra (e como conferir)',
    reunioes: 'Reuniões, voz e atas',
    numeros: 'Números e contas',
    decisoes: 'Decisões e estratégia',
    pessoas: 'Pessoas e equipe',
    aprender: 'Aprender e criar hábito',
    seguranca: 'Golpes e segurança',
    privacidade: 'Dados, privacidade e leis',
    persuasao: 'A ciência por trás deste jogo',
  };

  /** Ordem dos créditos: agrupada por tema, na ordem do dia do jogo. */
  const ORDEM = [
    // ceo
    'pwc_ceo_2026_retorno', 'pwc_ceo_2025_expectativa', 'kpmg_ceo_2025', 'ibm_ceo_2025',
    'mckinsey_estado_ia_2025', 'microsoft_wti_2025', 'nadella_cinco_prompts', 'lutke_memo_shopify',
    'huang_tutor_varias_ias', 'jpmorgan_llm_suite_dimon', 'klarna_recuo_atendimento', 'wharton_74',
    'mit_nanda_95',
    // brasil
    'pwc_ceo_2026_brasil', 'pwc_ceo_2026_agenda', 'pwc_ceo_2026_pessoas', 'pwc_aptidao_2026',
    'ibge_pintec_industria', 'cetic_tic_empresas_2025', 'microsoft_wti_byoai', 'ey_ceo_outlook_2026',
    'ibgc_conselhos_ia', 'itau_juridico_ia', 'bradesco_bia', 'magalu_lu_whatsapp', 'google_ipsos',
    'google_ipsos_confianca', 'sebrae_2025', 'cetic_ia_45_59',
    // comunicacao
    'google_21_palavras', 'sem_palavras_magicas', 'noy_zhang_escrita', 'chefe_ia_menos_sincero',
    // produtividade
    'harvard_bcg', 'harvard_bcg_fora', 'stanford_mit', 'dinamarques', 'metr_dev', 'metr_2026',
    'copilot_campo_email', 'governo_uk_26_minutos', 'governo_uk_sem_ganho', 'caixa_de_entrada_117',
    'pwc_2025',
    // documentos
    'perdido_no_meio', 'nolima_textos_longos', 'context_rot', 'anthropic_documento_no_topo',
    'vectara_resumo_2026', 'stanford_juridico_rag', 'advogados_ia_experimento', 'asic_resumos_humanos',
    'gemini_notebook', 'bbc_citacoes_alteradas',
    // limites
    'newsguard', 'ebu_45_por_cento', 'buscadores_erram_fonte', 'openai_chute', 'steyvers_resposta_longa',
    'lee_pensamento_critico', 'vies_automacao', 'kim_incerteza', 'cove_verificacao', 'anthropic_tecnicas',
    'bajulacao_ia', 'bajulacao_openai', 'avianca', 'juiz_chatgpt', 'tjsc_chatgpt_multa', 'deloitte_reembolso',
    'base_casos_alucinacao', 'ia_saude',
    // reunioes
    'microsoft_reuniao_perdida', 'transcricao_inventa', 'stanford_voz', 'teams_aviso_transcricao',
    // numeros
    'contas_frageis', 'estudo_balancos_retirado', 'reino_unido_copilot_tarefas',
    // decisoes
    'vaccaro_humano_ia', 'cybernetic_teammate_pg', 'executivos_previsao_otimista', 'ia_ceo_simulador',
    'varias_opinioes_ia', 'advogado_do_diabo_ia', 'pre_mortem_klein', 'mentor_ia_quenia',
    // pessoas
    'bcg_lideres_vs_linha_de_frente', 'bcg_treino_5_horas', 'microsoft_uso_escondido',
    'microsoft_wti_power_users', 'reif_penalidade_social', 'vies_curriculos', 'vies_feedback_textio',
    // aprender
    'tutor_ia', 'mollick_10_horas', 'mollick_guia_2026', 'cetic_idosos', 'lally_habito_66_dias',
    'singh_habito_manha', 'gollwitzer_se_entao',
    // seguranca
    'arup_videochamada', 'arup_45_minutos', 'wpp_teams', 'ferrari_livro', 'crosetto_moratti',
    'singapura_rapidez', 'wiz_voz_de_palco', 'lastpass_canal', 'mcafee_voz', 'ucl_ouvido_falha',
    'golpe_voz_tecmundo', 'golpe_voz_canaltech', 'fbi_palavra_secreta', 'fbi_ic3_2025', 'golpes_brasil',
    'banco_nunca_pede', 'pix_contestacao', 'gisele_modo_selva', 'owasp_injecao', 'echoleak_copilot',
    // privacidade
    'samsung', 'cisco_dados_colados', 'ohbehave_2025', 'ms_byoai', 'ibm_ia_na_sombra', 'planos_empresariais',
    'claude_treino_escolha', 'gemini_revisores_humanos', 'privacidade_config', 'copilot_empresa_privacidade',
    'retencao_judicial', 'lgpd_dados_e_multa', 'anpd_prompt_lgpd', 'anpd_meta_suspensao', 'pl2338_status',
    'oab_recomendacao_ia',
    // persuasao
    'dietvorst_erro_maquina', 'dietvorst_poder_editar', 'logg_especialistas_descontam', 'davis_tam_utilidade',
    'utaut_idade_esforco', 'utaut2_habito', 'morris_venkatesh_idade', 'czaja_create_ansiedade',
    'rogers_cinco_atributos', 'okeefe_dois_lados', 'van_laer_transporte', 'braddock_dillard_narrativa',
    'wouters_jogos_serios', 'sitzmann_simulacao', 'bad_news_inoculacao', 'goldstein_norma_local',
    'li_shi_reatancia',
  ];

  /** Apelidos: chaves de fatos repetidos na pesquisa que apontam para a versão mantida. */
  const ALIAS = {
    bbc_ebu_noticias: 'ebu_45_por_cento',
    whisper_transcricao_inventa: 'transcricao_inventa',
    resumo_reuniao_microsoft: 'microsoft_reuniao_perdida',
    bajulacao_estudo: 'bajulacao_ia',
    pwc_ceos_retorno_2026: 'pwc_ceo_2026_retorno',
    ibm_ceos_medo_de_ficar_para_tras: 'ibm_ceo_2025',
    traga_sua_propria_ia: 'ms_byoai',
    ia_sombra_ibm: 'ibm_ia_na_sombra',
    chatgpt_empresarial_sem_treino: 'planos_empresariais',
    ia_le_balanco: 'estudo_balancos_retirado',
    bcg_lideranca_treino: 'bcg_lideres_vs_linha_de_frente',
  };
  // Os apelidos funcionam em P2.FONTES[chave], mas não aparecem em Object.keys (sem repetição nos créditos).
  Object.keys(ALIAS).forEach(function (old) {
    if (Object.prototype.hasOwnProperty.call(FONTES, old)) return;
    Object.defineProperty(FONTES, old, { enumerable: false, configurable: true, get: function () { return FONTES[ALIAS[old]]; } });
  });

  P2.FONTES = FONTES;
  P2.FONTES_TEMAS = TEMAS;
  P2.FONTES_ORDEM = ORDEM;
  P2.FONTES_ALIAS = ALIAS;
})();
