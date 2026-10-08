# Referências de preço datadas · 08/10/2026

## Cobertura
42 dos 98 produtos têm referência datada aplicada ao preço efetivo. Os outros 56 conservam a estimativa demonstrativa, sem alegar atualização. O manifesto de pesquisa registra 79 observações originais em 70 IDs; a cópia publicada contém somente as cinco fontes selecionadas, com observações indisponíveis e não utilizáveis separadas. Nenhum produto foi renomeado para caber em uma oferta.

Fontes solicitadas: KaBuM, Pichau, Terabyte, Amazon Brasil e Mercado Livre. Referências aplicadas provêm de Pichau, Terabyte e KaBuM (vendedor DAXFY para Samsung 870 EVO 500GB, MZ-77E500B/EU). Amazon não forneceu um par preço-vendedor validável; Mercado Livre teve falhas de leitura/403. Nada foi contornado. WAZ e Kingston Store foram excluídas da integração.

A pesquisa usa páginas diretas e valores factuais atribuídos, sem fotos ou descrições comerciais copiadas. Não configura autorização de API, feed ou scraping recorrente. Não houve criação de conta, CAPTCHA, transação ou uso de computador pessoal.

## Sem cotação ao vivo
O registro mostra a data da consulta e a idade do conteúdo retornado pelo mecanismo de pesquisa, que pode ser indexado/cacheado. Uma consulta em 08/10/2026 não prova que o servidor da loja foi atualizado naquele instante. Alguns registros retornados são de dias/semanas anteriores. Não há validade futura inventada.

Somente o snapshot Terabyte KF432C16BBK2/16 informou Pronta entrega e uma unidade restante. Isso permanece disponibilidade histórica da observação, nunca estoque atual ou cotação de API. Sua referência escolhida é R$1.699,90 no PIX/boleto, com cartão separado em R$1.999,88. O snapshot da mesma peça na Pichau abriu com R$3.199,99, divergindo do antigo snippet R$389,99; o snippet foi rejeitado.

## Propagação e orçamento
A camada server-controlled aplica os 42 valores durante a criação do catálogo, preservando `demonstrativePrice`. Assim, `component.price` alimenta coerentemente filtros, índices por real, rankings, recomendações e totais. O total é uma estimativa baseada em referências, podendo combinar preços datados PIX e valores demonstrativos. A cobertura informa quantos packs pertencem a cada base; preço de cartão fica separado, sem entrar no total. Frete, montagem e eventuais tributos adicionais não verificados ficam excluídos.

`referencePrice` retorna `dated_public_reference` / `dated_snapshot`, `isMarketQuote:false`, validade nula e disponibilidade atual desconhecida. `observedAvailability` preserva o status histórico. `assessMarketQuote` continua exigindo `authorized_api`, identidade, fornecedor, URL, validade e autorização. Referências manuais não entram em ofertas, comparação automática ou subtotal de cotações. Os cinco links de pesquisa continuam `kind:research`; metadados de referência são adicionais, sem inventar preço de cada loja.

## Identidade e edição administrativa
Cada registro é ligado ao ID, nome, marca, categoria, part number e especificações exatos do catálogo revisado. Alteração de preço, nome, variante ou especificações invalida a origem. Mudança de identidade sem novo valor diferente limpa o preço anterior, evitando atribuir o valor do produto antigo ao novo. Uma edição administrativa de preço permanece estimativa sem selo datado. Alterar somente ativo/inativo não rompe a identidade.

GPUs sem fabricante/placa definida, genéricos, RAM legada sem kit/latência/part number, determinadas revisões de placas-mãe, fontes, gabinetes e HDD permanecem sem referência aplicada. Sufixos de embalagem/região observados são exibidos; não se troca DDR4/DDR5, capacidade, kit, RGB, EXPO, geração ou cor por aproximação.

## Evidências e verificações
- `src/data/dated-price-references.json`: 42 referências selecionadas, condições, loja/vendedor, SKU, identidade e valor demonstrativo anterior
- `docs/evidence/ra2-v2.10/price-research.json`: pesquisa e lacunas por ID, com fontes selecionadas
- `tests/dated-price-references.test.js`: cobertura, propagação, totais por pack, pagamento separado, gates de API e invalidação administrativa
- `frontend/tests/reference-pricing.test.js`: cobertura e recusa de badge datado sobre valor antigo de snapshot salvo
- Testes direcionados de preço: 30/30 aprovados; ESLint dos arquivos alterados e build Vite aprovados (aviso de chunk grande já conhecido)

A validação final agregada, hidratação da montagem salva e publicação são responsabilidade da integração da versão. Este documento não afirma que o restante da versão esteja aprovado.

## Fechamento da implementação isolada
- Auditoria comercial explícita dos 42 registros em `docs/evidence/ra2-v2.10/price-identity-audit.json`: o hash protege alterações, enquanto esta revisão explica SKU completo, capacidade/kit e sufixos regionais/embalagem. Descrição de loja não substitui dado técnico de fabricante.
- 31 testes focados de preços aprovados, incluindo fatos de fonte congelados para todos 42 e preços literais da build-base (total 499328 centavos), além de controles negativos de identidade, fonte, quantidade e preço salvo divergente.
- 60 testes de fixtures/exportação/resumo/troca/salvamento/compartilhamento/upgrade aprovados. Os 16 erros iniciais eram valores/ordem/status anteriores: build-base 4699,30→4993,28; fixture econômica 3889,30→4493,28; troca GPU 6699,30→6993,28; refrigeração 5699,00→5992,98. Expectativas agora somam centavos independentemente a partir das peças da fixture; teste separado fixa os fatos da pesquisa. Limites de orçamento foram ajustados mantendo a mesma folga/excesso intencional e o controle de um centavo.
- Gate SSR comercial ampliado: separação de pesquisa/oferta, vendedor/SKU/data/pagamento/cache/estoque/condição, total misto e packs, sem remoção de controles. Correção adicional: o cabeçalho de fans indica total dos packs e a proveniência usa o preço unitário por pack, sem perder o selo ao selecionar mais de um.
- Linhas compactas não repetem o mesmo rótulo de preço; fonte/data continuam acessíveis no resumo expansível.
- Nenhuma publicação realizada nesta tarefa. A integração executa novamente os gates agregados sobre sua árvore final.
