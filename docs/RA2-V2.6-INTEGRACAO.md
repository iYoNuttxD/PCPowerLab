# RA2 V2.6 — Verdade comercial, preços e alternativas

Data: 08/10/2026 UTC. Base: `e939718fe9fbe78d199e2cdc60511b5c07e33300`. Escopo: apenas v2.6; sem merge, deploy, compra, assinatura, criação de conta ou credenciais.

## Resultado real

**Não há provedor de preço conectado. Nenhum dos 98 componentes tem cotação de mercado verificada por esta entrega.** Todos os preços existentes continuam referências demonstrativas. A pesquisa oficial está em [fontes de mercado](RA2-V2.6-MARKET-SOURCES.md). Autorização/elegibilidade, condições de uso e teste real ainda são necessários para ativar um provedor.

A aplicação agora distingue pesquisa externa, referência de catálogo e oferta de produto. Corrigiu-se a data fixa `2026-05-22` anteriormente anexada a buscas, que não comprovava nenhuma consulta. `lastUpdated`, `queriedAt` e `validUntil` das buscas são nulos. URLs de busca nunca se tornam ofertas. Os campos legados permanecem, com `kind: research` e `priceType: estimate`; seu `price` é apenas a referência do catálogo, não preço da loja.

## Implementado

- `marketPriceService`: contrato com produto local/externo, identidade verificada pelo futuro adapter do servidor, loja, URL HTTPS de produto em host autorizado, preço positivo, BRL, disponibilidade, data da consulta, fonte/autorização, estado da atualização e validade
- Rejeição de valores ausentes/inválidos, moeda incompatível, origem não autorizada, identidade divergente, host não permitido, URL de busca, consulta futura e validade ausente/incoerente. Diferencia mock, vencida, indisponível e erro de fonte
- Deduplicação por loja conserva observação mais recente; atualização indisponível impede reutilizar oferta antiga. Ofertas elegíveis ordenadas por preço; pelo menos duas lojas necessárias para comparação. Uma oferta isolada é explicitamente insuficiente para comparação entre lojas
- Disponibilidade desconhecida pode ser exibida como desconhecida, nunca confirmada. Só cotações com disponibilidade `available` entram no subtotal de mercado
- Totais separados: `estimatedTotal`, `availableMarketQuotesTotal`, `marketTotalComplete`, componentes sem cotação atual e sem referência. Fans multiplicam preço por quantidade de packs. Não há soma híbrida de referência com oferta
- Catálogo expõe `pricing` de referência; resumo expõe `pricing` agregado. Orçamento mostra subtotal de mercado e lacunas quando resumo existe; comparação de orçamento/ranking/recomendação continua baseada nas referências, sem alegar decisão por preço atual
- UI identifica estimativas em recomendações, montagens prontas/salvas, comparação, refrigeração, roteiro de upgrade e feedback. Método declara custo, desempenho simulado, especificações, compatibilidade, conjunto avaliado e limites do custo-benefício
- Retirado fallback que inventava desempenho “bom” quando não informado. Upgrades com preço desconhecido deixam de ser tratados como gratuitos

## Implementação versus simulação

| Item | Estado |
| --- | --- |
| Referências, pesquisa externa, total estimado e explicações | Implementados e verificados por testes de domínio/SSR |
| Validação, ordenação multiloja, cotação única, erro, vencimento, mistura e fan packs | Implementados; exercitados com fixtures sintéticas em testes |
| Adapter HTTP de fornecedor, OAuth, cron de atualização e cache comercial | Não implementados/ativados; requerem seleção e acesso autorizado |
| Cotação real recebida, SKU/estoque/preço confirmado na loja | Nenhuma nesta entrega |
| UI de ofertas e datas | Renderização SSR com fixtures; não equivale a browser ou integração real |
| Navegador, screenshots, responsividade e aceitação humana | Não executados; bloqueio de navegador herdado, sem contorno/túnel/repetição |

A coleção `marketQuotes` permanece vazia e imutável. Não há endpoint público para promover dados do cliente a cotação autorizada. Campos de autorização/identidade são responsabilidade do futuro adapter confiável do servidor; preencher booleanos manualmente não valida uma loja. A infraestrutura não significa integração conectada. Nenhum TTL ou preço de fornecedor foi inventado. Validade recebida será política da fonte/cache revisada, não garantia de checkout. Frete, pagamento, montagem e condições comerciais devem ser confirmados.

## Verificação

- 425 testes Node aprovados (inclui 27 novos testes desta etapa), 0 falhas
- 40 testes frontend utilitários aprovados
- Sete scripts `frontend/scripts/check-*.mjs` aprovados: catálogo, gráficos, transparência comercial, navegação/assistente, 16 rotas/32 pares de tokens, recomendações e estados de simulação
- ESLint backend/frontend e build de produção aprovados; aviso existente de bundle >500 kB permanece
- 183 casos Playwright coletados, **0 executados**; coleta não é validação visual
- [Logs](evidence/ra2-v2.6/README.md); sem captura de tela ou alegação de homologação

## Pendências e critérios futuros

Selecionar provedor permitido e obter acesso com autorização explícita; revisar licença/cache/atribuição; reconciliar SKU, vendedor, variante/estado novo-usado e condições; receber resposta real; ligar adapter com tratamento de erro/cache sem renovar datas ficticiamente; validar UI com cotação real e navegador autorizado. Só então avaliar cobertura real por lojas/produtos. R18/R19 continuam **PARCIALMENTE IMPLEMENTADOS**; preço de mercado e melhor compra não foram validados.

### Esclarecimento de contagem confirmado na v2.7

`npm test` executa `node --test` na raiz e já inclui `frontend/tests/*.test.js`. Portanto os 425 testes Node históricos **incluem** os 40 utilitários frontend reexecutados separadamente: são 425 testes distintos, não 465. Os logs históricos acima permanecem intactos. Isso corrige a interpretação da contagem, não os resultados das execuções.
