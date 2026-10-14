# RA2 V2.6 — Fontes oficiais de preço de mercado

Data da pesquisa documental: **2026-10-08 (UTC)**. Escopo: hardware no Brasil, requisitos R18/R19. Somente documentação primária pública; nenhuma conta criada, credencial obtida/configurada, consulta autenticada executada ou página de loja raspada. Este documento comprova pesquisa de integração, **não conexão, cotação atual ou disponibilidade de produto**.

## Decisão para esta entrega

Não há uma fonte de ofertas reais conectada e validada nesta etapa. É viável implementar o contrato de ofertas, a separação entre referência demonstrativa e mercado, validação de procedência/SKU, estados de validade e adaptadores desativados. Não é correto preencher ofertas com preços dos mocks, datas de execução ou URLs de busca.

Mercado Livre e Amazon são candidatos documentados, mas dependem de acesso autorizado. KaBuM documenta integração operacional de vendedores, que não equivale a um feed público para comparação. VTEX possui APIs públicas de storefront, porém isso não identifica uma loja parceira nem comprova autorização para republicação. A configuração de um provedor não comprova conexão bem-sucedida.

## Matriz de acesso e viabilidade

| Fonte | Acesso oficial documentado | Sem credenciais nesta etapa | Situação honesta |
| --- | --- | --- | --- |
| Mercado Livre Brasil | Aplicação e OAuth 2.0; Bearer token em recursos públicos e privados | Documentação e contrato de adapter | Bloqueado por acesso autorizado; não conectado |
| Amazon Brasil, Creators API | Programa Associados do marketplace, elegibilidade, registro de API e credenciais OAuth | Documentação e contrato de adapter | Bloqueado por acesso/elegibilidade; não conectado |
| KaBuM / Mirakl | Cadastro/homologação e API key por shop | Documentação pública de integração seller | Escopo de vendedor; feed para comparação não comprovado |
| Loja VTEX autorizada | Search Legacy é pública; outras APIs podem exigir appKey/appToken ou token | Adapter genérico seria tecnicamente possível após identificar loja, endpoint e condições | Nenhuma loja/configuração/direito de uso validado |
| Pichau | Programa oficial de afiliados com candidatura/aprovação | Pesquisa documental | Programa não comprova existência de API de preços |
| TerabyteShop | Não foi localizado nesta pesquisa um contrato público autorizado de feed de preços adequado | Somente link de busca/navegação | API/feed autorizado não confirmado |

Ausência de documentação encontrada não prova inexistência de uma API privada. Não descobrir endpoints internos, contornar bloqueios ou usar serviços de scraping como substituto.

## Mercado Livre: campos e limitações

- A [documentação de segurança](https://developers.mercadolivre.com.br/pt_br/desenvolvimento-seguro) exige token em todos os recursos. O [fluxo de autenticação](https://developers.mercadolivre.com.br/autenticacao-e-autorizacao) depende de aplicação e autorização OAuth.
- O [recurso de itens](https://developers.mercadolivre.com.br/pt_br/autenticacao-e-autorizacao/publicacao-de-produtos) documenta `id`, `permalink`, `status` e `currency_id`. `available_quantity` é identificado como informação disponível com token proprietário. Não deduzir estoque de terceiro pela existência do anúncio.
- A [documentação de variações](https://developers.mercadolivre.com.br/pt_br/descricao-de-produtos/variacoes) distingue `SELLER_SKU` de `seller_custom_field`. O item/variação precisa ser reconciliado com o MPN/GTIN e a capacidade/modelo do componente local; ID de anúncio sozinho não é prova de equivalência técnica.
- A [API de preços](https://developers.mercadolivre.com.br/devcenter/api-de-precos) avisa que `price`, `base_price` e `original_price` de `/items` serão descontinuados. O adapter deve consultar `/items/{id}/sale_price` para contexto de venda e `/items/{id}/prices` quando necessário. Este último documenta `amount`, `currency_id`, `last_updated` e condições de vigência.
- A [descrição de sale_price](https://developers.mercadolivre.com.br/pt_br/servicos-gerenciamento-de-contatos/api-de-precos) documenta `amount`, `currency_id`, `reference_date` e restrição de `metadata` ao proprietário. `reference_date` representa o contexto temporal do cálculo, não a hora em que PCPowerLab consultou a API. Registrar `fetchedAt` separadamente e preservar condições de canal/comprador.

**Liberação futura:** autorização do responsável, aplicação e token com escopo adequado, revisão de condições de uso, mapeamento exato de itens e um teste real bem-sucedido. Um 401/403 não autoriza tentar acesso anônimo, credenciais alternativas ou scraping.

## Amazon Brasil: sucessor correto e campos

A [página oficial de descontinuação](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/paapiv5-deprecation) informa que PA-API 5 foi substituída e que chamadas legadas recebem 403. Não iniciar um novo adapter PA-API 5.

A [introdução de Creators API](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/introduction) exige participação em Associados do marketplace, registro, credenciais e informa o requisito de dez vendas qualificadas nos últimos trinta dias para acesso ao catálogo descrito. A [migração oficial](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/migrating-to-creatorsapi-from-paapi) especifica OAuth 2.0 com Credential ID/Secret, Bearer token e endpoint `https://creatorsapi.amazon/catalog/v1/*`.

A [referência brasileira](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/locale-reference/brazil) confirma marketplace `www.amazon.com.br`, idioma `pt_BR` e moeda `BRL`.

Mapeamento documentado em [SearchItems](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/api-reference/operations/search-items) e [OffersV2](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/api-reference/resources/offersV2):

| Campo PCPowerLab | Origem / cuidado |
| --- | --- |
| Identificador externo | `asin`; não substitui SKU/MPN exato do fabricante |
| URL de produto | `detailPageURL` retornada pelo provedor |
| Preço/moeda | `offersV2.listings[].price.money.amount` / `.currency` |
| Disponibilidade | `offersV2.listings[].availability.type`; manter desconhecido quando ausente |
| Vendedor/condição | `merchantInfo`, `condition`; distinguir usado, recondicionado e novo |
| Timestamp | Registrar `fetchedAt` no recebimento; não há timestamp geral de atualização de preço comprovado nas referências consultadas |
| Vigência | `dealDetails.startTime/endTime` quando presentes; não são validade universal de qualquer preço |

OffersV2 oferece listagens em destaque, não todas as ofertas do mercado. O preço pode diferir por contexto de entrega/cliente. Não converter ausência de destaque em prova de ausência absoluta de produto. Antes da ativação, revisar licença, exibição, caching e atribuição conforme o programa; esta pesquisa não aceita termos nem concede direitos de republicação.

## KaBuM: API oficial não é feed anônimo

O [portal oficial de integração](https://www.kabum.com.br/hotsite/documentacao-hubscore/) descreve conta previamente cadastrada pelo responsável pela integração, homologação, ambientes Mirakl e API key exclusiva por shop. Distingue produto de oferta e trata de catálogo, preço/estoque e pedidos de sellers.

Não foi comprovado ali um contrato de leitura de todas as ofertas de varejo para um comparador externo. SKU, preço e estoque fazem parte do domínio, mas os campos exatos de URL pública, moeda e timestamp para o uso proposto precisam de documentação/autorização específica. Não reaproveitar endpoints de pedidos ou dados de compradores para montar um comparador.

## VTEX: possibilidade pública, condições ainda pendentes

A [referência Search Legacy](https://developers.vtex.com/docs/api-reference/search-api) documenta rotas públicas de busca e ofertas por produto/SKU. A [nota oficial de estoque](https://developers.vtex.com/updates/release-notes/2024-09-10-change-available-quantity-field-search-api) confirma que a API é pública e que quantidades são aproximadas: 0, 1, 10, 100 e 99999 representam faixas; não apresentar número exato de unidades.

O [schema Search GraphQL](https://developers.vtex.com/docs/apps/vtex.search-graphql) documenta `itemId`, `productId`, `link`, `sellers[].commertialOffer.Price`, `AvailableQuantity` e `PriceValidUntil`. Esse schema é evidência do modelo, não prova de que qualquer endpoint REST/loja retorna os mesmos campos. Confirmar payload do endpoint escolhido antes de programar o mapeamento. A moeda deve vir de contexto comercial verificado; não assumir BRL apenas pelo domínio. `PriceValidUntil` é validade, não data de coleta; gerar `fetchedAt` somente ao receber dados reais.

**Decisão:** possibilidade técnica sem credenciais em storefront público, mas nenhum domínio de loja, SKU, endpoint funcional ou permissão de reutilização foi validado. Não afirmar que todas as lojas pesquisadas usam VTEX. APIs privadas seguem a [autenticação VTEX](https://developers.vtex.com/docs/guides/authentication), não a exceção pública de Search.

## Pichau e TerabyteShop

O [programa oficial Pichau](https://afiliados.pichau.com.br/) descreve aprovação de parceiros e canais de divulgação. Não documenta nessa página um feed/API autorizado com SKU, URL, preço, moeda, disponibilidade e timestamp. Cadastro em programa de afiliados não foi feito e não deve ser simulado.

Para TerabyteShop, a pesquisa não comprovou API pública licenciada para esta finalidade. Um resultado que se descreve como scraper foi excluído como opção. Ambos podem continuar como **links de busca**, sem cotação ou garantia de estoque. Uma parceria/feed fornecido pelo varejista poderá ser avaliado posteriormente.

## Contrato mínimo recomendado (decisão de engenharia)

Uma oferta elegível deve conter: identificador local; identificador exato externo e evidência de correspondência; provedor; vendedor quando aplicável; URL HTTPS de produto; preço finito positivo; moeda explícita; disponibilidade explícita ou `unknown`; `fetchedAt`; timestamp de origem quando existir; condições de pagamento/frete; fonte e autorização da coleta; validade da oferta/cache conforme política real.

- Distinguir `providerUpdatedAt`, `fetchedAt` e `expiresAt`; não fabricar nenhum timestamp de origem.
- Rejeitar URL de busca como URL de oferta, hosts não autorizados, divergência de SKU/capacidade/kit, moeda desconhecida e payload incompleto.
- Não renovar `fetchedAt` ao servir cache ou em erro. Indicar expirado/indisponível e a última coleta realmente bem-sucedida, se houver.
- Não inventar um TTL universal por provedor: respeitar termos e registrar política configurada. Validade de cache local não garante preço até aquele instante no checkout.
- Separar estados `not_configured`, `unavailable`, `no_offers`, `stale` e `available`; configuração, teste simulado e resposta vazia não equivalem a conexão real validada.
- Fixtures só em testes, com rótulo explícito; nunca promover fixture ou preço local a oferta atual.
- Fallback público: “Preço de referência demonstrativo. Nenhuma oferta atual verificada. Consulte preço, condições e estoque na loja.”
- Totais baseados no catálogo continuam estimativas. Não misturar silenciosamente referências com ofertas, nem alegar menor preço do mercado ou cobertura integral.

## Critério de conclusão e pendências

Esta pesquisa termina com os contratos documentados e bloqueios identificados. A etapa pode entregar transparência e infraestrutura testável; R18/R19 não recebem validação de preço real por isso. A ativação requer escolha/autorização de provedor, acesso concedido, licença/condições verificadas, resposta real com SKU exato, tratamento de falhas e evidência de UI. Não há evidência de preço vigente de nenhum componente neste documento.
