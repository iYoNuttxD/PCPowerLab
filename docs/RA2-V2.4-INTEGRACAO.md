# V2.4 — Recomendações e substituição individual

08/10/2026 UTC · base `e954768481db27e7354242718400e0043f6eb66f` · branch `codex/pcpowerlab-ra2-ciclo2`.

Escopo: etapa 4. Não inclui auditoria visual ampla da etapa 5, merge ou deploy.

## Implementado

- Troca atômica de um slot no estado compartilhado: CPU, placa-mãe, GPU, RAM, armazenamento, fonte, gabinete ou cooler. A operação mantém todas as demais peças, packs/quantidades de ventoinhas, orçamento, perfil e parâmetros do jogo. Categoria incorreta, resumo de outra seleção e revisão antiga são recusados.
- Prévia calcula os resumos da configuração anterior e candidata usando os mesmos parâmetros. Mostra custo antes/depois/diferença, consumo antes/depois/diferença e FPS antes/depois/diferença percentual somente com valores numéricos e jogo/resolução/qualidade comprovadamente iguais. Falha da análise anterior não fabrica comparação. Consumo parcial não produz diferença como se fosse completo.
- Compatibilidade exibe motivo, severidade, peças afetadas e sugestões existentes nos dados. Incompatibilidade conhecida impede aplicar. Dados técnicos insuficientes permitem a ação explícita de aplicar com aviso destacado, mantendo o status não verificado. Nenhuma outra peça é corrigida silenciosamente.
- Recomendação no assistente, recomendações por orçamento e builds prontas oferecem escolher uma peça sugerida, comparar/verificar e aplicar apenas essa peça à montagem atual. Usar uma configuração inteira tem rótulo explícito. Upgrades e etapas do plano de upgrades também abrem a mesma prévia individual. Sugestões baseadas em uma build salva são reavaliadas com a montagem atual, sem editar silenciosamente o registro salvo.
- Resumo oferece troca, revisão de correção, comparação e desfazer. Builds salvas têm entrada direta para abrir o resumo e trocar uma peça. Salvar no resumo permanece criação de uma nova configuração, agora explicitamente rotulada; original salvo e seus snapshots continuam intactos. Edição de metadados e versões existentes permanecem disponíveis em Builds salvas.
- Histórico local de até 20 alterações de seleção permite desfazer trocas sucessivas, inclusive após reload. Desfazer recupera somente entradas, preserva o orçamento atual, invalida análises antigas e solicita nova análise do resumo; falha fica pendente para nova tentativa. Cooler/packs ajustados no painel existente também entram no histórico e invalidam análises.
- Toda mudança de seleção, orçamento, perfil ou jogo incrementa uma revisão. Requisições da prévia, assistente, resumo, laboratório de desempenho, recomendações e upgrades passam a distinguir revisões, inclusive no percurso A→B→A. Aplicação da peça e do resumo verificado ocorre numa transição única, não em várias escritas independentes.
- Corrigido resumo da API que podia apresentar FPS para CPU de socket incompatível com a placa-mãe, porque o simulador de jogos usava apenas CPU/GPU/RAM/armazenamento. O resumo agora marca desempenho indisponível quando compatibilidade é incompatível ou não verificada. Custo, avisos e análise heurística de consumo/gargalo continuam identificados separadamente.

## Caminhos que substituem toda a montagem

Auditoria: `BuildProvider.applyRecommendation`, chamados de `BuildWizard`, `ReadyBuilds` e `Feedback`, além de `loadSavedBuild` em `SavedBuilds`. Permanecem apenas para ações explícitas de usar/abrir uma configuração inteira. Recomendações omissas sobre refrigeração mantêm os opcionais atuais; usar uma build pronta/feedback completo pode restaurar os opcionais daquela configuração, conforme o rótulo e contexto. A operação individual não utiliza esses caminhos.

`selectComponent`, `setFans` e `removeComponent` continuam disponíveis no catálogo/assistente/painel de refrigeração, preservando a seleção manual da v2.3. Essas edições invalidam resultados e ficam no histórico; a prévia analisada é oferecida pelo resumo e pelas sugestões. Fans são coleções de packs e quantidades, não um slot único: ajuste no painel próprio, sem tratar uma sugestão de fan como troca de toda a coleção.

## Exemplo reproduzível

`node scripts/demo-component-replacement.js` produz [before-after.json](evidence/ra2-v2.4/before-after.json), com IDs de todas as peças, análises e restauração por desfazer.

- Ryzen 5 5600 + B550M Aorus Elite + RTX 4060 + 16 GB DDR4 + NV2 1 TB + Corsair 650 W + gabinete airflow
- Troca escolhida: RTX 4060 → RX 7600; seis outros slots e orçamento de R$ 4.600 preservados
- Total demonstrativo: R$ 4.699,30 → R$ 4.499,30, diferença −R$ 200
- Consumo heurístico: 280 W → 330 W, diferença +50 W
- Cyberpunk 2077, 1080p/high: 49 → 48 FPS estimados, diferença −1 FPS (−2,04%)
- Orçamento: próximo/acima do limite → dentro do limite; compatibilidade registrada compatível nas regras disponíveis
- Desfazer recupera os IDs originais e invalida a análise anterior

Esses números são saídas do modelo demonstrativo, não benchmarks, cotações atuais ou garantia de desempenho. Teste separado preserva também cooler e dois packs de ventoinhas; quando faltam dados físicos, a compatibilidade continua não verificada e FPS não é apresentado como validado.

## Validação e pendências

Resultados e comandos em [evidências](evidence/ra2-v2.4/README.md). Testes Node verificam troca individual, outras peças/acessórios intactos, orçamento excedido, análise nova, incompatibilidade, desfazer sucessivo, persistência/recarga, versões salvas, revisão antiga e resumo incorreto. Comparação tem testes para dados ausentes, zeros, consumo parcial, FPS de jogo/resolução/qualidade diferentes, incompatibilidade e dados não verificados.

Casos Playwright foram coletados, **não executados**. As negativas anteriores de socket do Chromium e localhost no navegador cloud continuam respeitadas; nenhuma rota negada/túnel foi tentada. Não há screenshots desta etapa. Renderização React estática e handlers isolados não provam interação real, foco/rolagem, mobile, acessibilidade assistiva ou usabilidade.

Feito: implementação, testes executáveis sem navegador, demonstração real de serviços/estado, relatório e matriz. Não feito: execução E2E/integrada em browser, screenshots antes/depois e homologação visual/humana. Pendências: executar cenários de troca/desfazer/respostas atrasadas/persistência em ambiente autorizado; verificar desktop/mobile/teclado; revisar compreensão com participantes. Catálogo permanece com 98 produtos e 9/98 fotos, sem modificação das 89 pendências de mídia. Nenhum requisito recebe VALIDADO apenas por código/testes.
