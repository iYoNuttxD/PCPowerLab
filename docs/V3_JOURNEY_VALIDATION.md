# V3: jornada de montagem e catálogo

**Atualização:** a [rodada no Mac](V3-MAC-BROWSER-VALIDATION.md) executou os testes de navegador e integração e a inspeção real. Os trechos de coleta e bloqueio abaixo preservam o histórico da nuvem.

## Alterações

- Montagens novas começam em Orçamento, com tipo de uso e prioridade existentes. Etapas válidas de montagens salvas continuam preservadas.
- A navegação acompanha limite, acumulado e restante. Preço ausente mantém o restante pendente e identifica o subtotal conhecido. Orçamento em outra moeda permanece na moeda original: não há subtração contra preços BRL nem conversão automática.
- Editar orçamento preserva peças e retoma a etapa anterior. Para trocar um orçamento importado para reais, há uma ação explícita que pede um novo valor, sem reaproveitar silenciosamente o número da outra moeda.
- Busca e filtros por etapa afetam somente a lista de candidatos. A peça selecionada e análises existentes não são apagadas ao buscar, abrir detalhes ou navegar. Alterações reais de peças, uso ou orçamento continuam invalidando análises obsoletas.
- Todos os filtros ativos, inclusive busca, categoria e limites de preço, aparecem fora da seção avançada e podem ser removidos individualmente. A comparação permanece selecionada ao filtrar.
- Modelos explicitamente sem calibração avisam “Desempenho não estimado” antes da seleção; os limites completos aparecem nos detalhes. Dados legados desconhecidos não recebem conclusões inventadas.
- Os cards das categorias principais priorizam duas especificações de escolha. Índices ficam em uma seção expansível; especificações completas continuam no diálogo de detalhes. Cards de refrigeração conservam seus dados essenciais e controles de pacotes.
- Placas-mãe mostram diferenças verificadas de M.2/Wi-Fi e, em detalhes/comparação, conectividade e expansão com fontes. Campo não confirmado não significa ausência. A capacidade publicada pelo fabricante é identificada separadamente e não altera os critérios existentes de compatibilidade.
- Resposta de gargalos com `available: false` não conclui a revisão nem exibe sucesso. O resumo continua acessível. Recomendações recebem também o cooler e as quantidades de ventoinhas preservadas.

## Verificação executada

- `node --test frontend/tests/journey-v3.test.js`: 9 verificações SSR/puras, incluindo orçamento indefinido, subtotal parcial, excesso, moedas diferentes, filtros, detalhes progressivos e comparação de recursos.
- `node --test frontend/tests/wizard-steps.test.js frontend/tests/build-persistence.test.js frontend/tests/cooling-card-contract.test.js`: 18 verificações passaram.
- `node --test frontend/tests/simulated-performance-labels.test.js`: 6 verificações passaram; origem simulada/estimada e zero versus ausente continuam diferenciados.
- `node frontend/scripts/check-catalog-render.mjs`: renderização real e handlers de remoção de chips passaram para as nove categorias.
- `node frontend/scripts/check-navigation-wizard.mjs`: navegação, Escape, primeira etapa Orçamento e retomar etapa anterior passaram no harness isolado.
- `node frontend/scripts/check-recommendation-entrypoints.mjs`: inclui handlers reais de editar/retomar orçamento, payload de recomendação com refrigeração e busca sem mutação de seleção/resultados.
- Lint e build de produção executados. O aviso de tamanho do bundle já existe e não foi tratado nesta alteração.

## Histórico: cobertura preparada na nuvem

`frontend/tests/e2e/journey-v3.spec.js` contém sete cenários, nas configurações desktop e mobile: início pelo orçamento, editar/retomar, filtros/detalhes pelo teclado sem apagar análises, chips e comparação, resposta de desempenho indisponível, payload com refrigeração, larguras de 320 a 1920 px e moeda importada. O cenário de interação reúne busca/detalhes/preservação em um único caso.

Os cenários antigos de montagem e integração com API real foram atualizados para a nova ordem, mantendo as verificações de chamadas, persistência, seleção e resultados. A coleta Playwright funciona, mas não equivale à execução.

A tentativa de execução não chegou às asserções da aplicação: o Chromium foi bloqueado pelo ambiente ao criar o socket do processo. Não houve tentativa de contornar a restrição. Permanecem pendentes validação visual real, geometria responsiva, foco/rolagem no navegador e execução da integração HTTP ponta a ponta. SSR e handlers isolados não substituem essa etapa.

## Validação posterior no Mac

305 E2E aprovados, 1 skip esperado e 18 integrações aprovadas. A primeira entrada de orçamento agora aparece inteira em 1366 × 768 sem rolar; texto duplicado foi removido e o retorno ao orçamento mantém folga sob a navegação. Recomendações vazias orientam usar a ação de gerar, sem pedir novamente dados já preenchidos. Campos inválidos mantêm a mesma altura dos demais.

Inspeção técnica no Chrome confirmou filtros, modelos, orçamento, retorno sem perda, recarga, resumo parcial, lojas, troca, recálculo, desfazer e motivos por peça em celular, notebook e monitor grande. Zoom nativo de 200% foi verificado separadamente do aumento de fonte dos E2E. [Evidências e limites](V3-MAC-BROWSER-VALIDATION.md).
