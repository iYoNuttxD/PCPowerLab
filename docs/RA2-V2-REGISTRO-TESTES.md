# RA2 V2.9 — registro final de testes e evidências

08/10/2026 UTC. Fonte de entrada: `5de7d88c906b2b66c63a4bc69e115045e012bf0d`; execução final na árvore com as correções F01–F05 do [relatório](RA2-V2-RELATORIO-FINAL.md). Não somar reexecuções nem confundir coleta com execução.

## Contagem final

| Grupo | Passaram | Falharam na árvore final | Skips do runner | Bloqueados/não executados | Evidência |
| --- | ---: | ---: | ---: | ---: | --- |
| Node raiz, testes únicos (inclui frontend) | 473 | 0 | 0 | 0 | [node-test.log](evidence/ra2-v2.9/node-test.log) |
| Dos 473, utilitários/SSR frontend | 50 | 0 | 0 | 0 | `frontend/tests/*.test.js`, já incluídos; NÃO adicionar |
| Dez scripts SSR/handlers | 10 | 0 | 0 | 0 | [ssr-handlers.log](evidence/ra2-v2.9/ssr-handlers.log) |
| Três jornadas integradas HTTP | 3 (17 passos) | 0 | 0 | 0 | [journeys.json](evidence/ra2-v2.9/journeys.json) e [log](evidence/ra2-v2.9/journeys.log) |
| Check HTTP de produção | 1 | 0 | 0 | 0 | [production-http.log](evidence/ra2-v2.9/production-http.log) |
| Lint backend/frontend | 2 | 0 | 0 | 0 | [backend](evidence/ra2-v2.9/backend-lint.log), [frontend](evidence/ra2-v2.9/frontend-lint.log) |
| Build frontend | 1 | 0 | 0 | 0 | [build.log](evidence/ra2-v2.9/build.log), aviso >500 kB |
| Integridade/inventário atual | 1 | 0 | 0 | 0 | [integrity.log](evidence/ra2-v2.9/integrity.log) |
| Auditor integral de fotografias | 0 | 1 (critério 100% não atendido; exit 1) | 0 | 89 ativos sem foto | [image-audit.log](evidence/ra2-v2.9/image-audit.log); 9/98 verificados |
| Playwright controlado | 0 | 0 observadas | 0 | 170 | [coleta](evidence/ra2-v2.9/browser-collection.log) |
| Playwright integração real | 0 | 0 observadas | 0 | 18 | Mesmo log; total browser 188, zero executados |
| Visual cinco larguras / screenshots / axe | 0 | 0 observadas | n/a | Todas as telas/estados | Negativas de ambiente documentadas; nenhum browser iniciado |
| Participantes / benchmark / oferta comercial real | 0 | n/a | n/a | Não realizados | Não transformar ausência de dados em sucesso |

Não há um “total geral” somando testes, scripts, passos, arquivos, fotos e participantes. Os **473 testes Node** são o denominador único da suíte raiz: 423 demais testes + 50 frontend. A primeira execução v2.9 da fonte anterior teve 454/454 e está preservada em [initial-454-node-test.log](evidence/ra2-v2.9/initial-454-node-test.log). Os 19 novos testes são seis de orientação, dois monetários/frontend, seis de listas técnicas e cinco de aliases/remoção nos upgrades. Os 188 casos Playwright incluem dois casos adicionais (desktop/mobile) após separar a fixture de snapshot sem ID; não houve aprovação de navegador.

## Execução por contrato

| Contrato verificado | Fontes de teste reexecutadas | Alcance/limite |
| --- | --- | --- |
| Dados, IDs antigos, parâmetros, vínculos | dataIntegrity.test.js, catalog-expansion.test.js, build-lifecycle-integrity.test.js, generate-inventory.mjs | 69 IDs antigos presentes; 98 ativos/89 parâmetros/490 pesquisas; no banco externo |
| RAM/SSD/cooler/AIO/fan | cooling-v21.test.js, cooling-persistence.test.js, cooling-recommendation-regression.test.js | Quantidade/custo/consumo e desconhecidos; não certifica hardware |
| Compatibilidade, regras antigas, domínio | compatibility.service.test.js, compatibility-rule.service.test.js, compatibilityFix.service.test.js, core-spec-array-contract.test.js | CRUD continua documental; array inválido não causa TypeError nem aprovação |
| Catálogo/filtros/comparação/seleção | catalog-discovery.test.js, testes frontend de apresentação/seleção, check-catalog-render.mjs | Utilitários e SSR; gestos e geometria não executados |
| Troca individual, cancelar/undo/revisão | component-replacement-v24.test.js, buildTransitions/replacementComparison tests, check-recommendation-entrypoints.mjs | Lógica/handlers com doubles e fonte real; não browser lifecycle |
| Orçamento e precisão | budget.test.js, build-budget-total.test.js, savedBuilds.test.js, quality-http.test.js | Centavos/SSR/HTTP; preços são demonstrativos |
| Recomendação/uso/faixa/alternativas | recommendation*.test.js, decisionMethodology.test.js, core-spec-array-contract.test.js | Heurística, sem garantia de ótimo global |
| Gargalo/jogo único/múltiplo/software | bottleneck.service.test.js, gamePerformance.test.js, professionalSoftware.test.js, quality-domain.test.js, check-simulation-states.mjs | Respostas/limites/atrasos/unidades; sem benchmark |
| Resumo/orientação final | buildSummary.test.js, final-recommendation.test.js, check-chart-render.mjs | Insuficiente/ausente/indisponível não recomenda positivamente |
| Salvar/recarregar/versões/export/share | savedBuilds.test.js, savedBuildVersions.test.js, buildExport.test.js, shareBuild.test.js, build-lifecycle-integrity.test.js | Persistência no mesmo processo; não reinício/multiusuário |
| Upgrades/roadmap/origem | upgradeSuggestion.test.js, upgradeRoadmap.test.js, upgrade-roadmap-validation.test.js, upgrade-selection-normalization.test.js, check-saved-upgrade-source.mjs | Limites, capacidade e origem; catálogo local |
| Compras/preço/referências | market-prices.test.js, purchaseLinks.test.js, check-commercial-disclosures.mjs | Ofertas sintéticas só em testes; zero fonte conectada |
| Admin protegido | admin-auth.test.js, admin-component.service.test.js, performanceParameters.test.js | HTTP sessão/401/logout/429 e CRUD; não pentest de produção |
| Mídia exata/fail closed/integridade | component-image-audit.test.js, component-image-metadata.test.js, helpers de mídia; auditor dinâmico | Bytes/fontes/identidade e fallback; não telas renderizadas |
| Fluxos e fronteiras HTTP reais | quality-http.test.js, check-quality-production.mjs, check-profile-journeys.mjs | Parser/controllers/adaptadores/serviços sem interceptar endpoint; não DOM |
| Concorrência/storage/navegação | check-async-regressions.mjs, check-storage-regressions.mjs, check-navigation-wizard.mjs | Hooks/tempo controlados; não múltiplas abas nem navegador real |

## Controles negativos e retestes

- F01/F02: [baseline red](evidence/ra2-v2.9/feature-baseline-red.log) **7 falhas/8 casos** esperadas contra fonte anterior; [focado green](evidence/ra2-v2.9/feature-focused-green.log) **64/64** incluindo regressões existentes. São subconjuntos/reexecuções, não somar aos 473
- F04: [baseline red](evidence/ra2-v2.9/array-contract-baseline-red.log) **5 falhas/6 casos**; [focado green](evidence/ra2-v2.9/array-contract-focused-green.log) **38/38**. Inclui preservação atômica, desconhecidos, recomendação de catálogo saudável e correções
- F03: [baseline fixture red](evidence/ra2-v2.9/photo-fixture-baseline-red.log) e [contrato green](evidence/ra2-v2.9/photo-fixture-contract-green.log). Sem browser. A configuração `setup` da spec passa a validar o contrato e o cenário name-only foi separado
- F05: [baseline red](evidence/ra2-v2.9/upgrade-alias-baseline-red.log), **3 falhas/5 casos**; [focado green](evidence/ra2-v2.9/upgrade-alias-focused-green.log), **22/22 aprovados**, regressões de seleção/remoção e testes de upgrades/roadmap. Subconjunto da suíte final
- Para repetir os negativos: em checkout temporário de `5de7d88`, copiar os novos testes de regressão da v2.9, manter fontes antigas e executar os arquivos focados. Não reverter a branch publicada para produzir evidência

## O que os testes não comprovam

Contagem não é cobertura instrumental: não há relatório percentual de statements/branches configurado. Testes de rota estrutural não substituem HTTP real; paridade de dois serviços prova consistência, não exatidão física; SSR não executa CSS/hidratação. As 32 combinações opacas de contraste são apenas tokens. Fonte antiga vermelha sustenta correção causal, mas não garante ausência de falhas desconhecidas. Veredito geral permanece **NÃO HOMOLOGADA**.
