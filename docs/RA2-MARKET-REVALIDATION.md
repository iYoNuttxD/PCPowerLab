# Revisão comercial e identidades — 08/10/2026

## Resultado e limite da observação

Os 97 IDs anteriormente ativos foram examinados. 38 permanecem com oferta de SKU exato e disponibilidade observada; 59 têm substituto explícito. A deduplicação resulta em 81 produtos ativos, cada um com preço observado e fotografia revisada. IDs, especificações e imagens antigos permanecem para configurações salvas. Nenhuma seleção salva é trocada automaticamente.

Preço e estoque foram lidos na página renderizada depois da atualização dinâmica. Snippets e HTML anterior à hidratação não comprovaram disponibilidade. KaBuM, Pichau, Terabyte, Amazon Brasil e Mercado Livre foram pesquisados; bloqueios, anúncios pausados, ausência de vendedor e conflitos de identidade estão registrados. Não se afirma comparação completa dos cinco vendedores para cada SKU, menor preço do mercado ou estoque futuro. Frete, CEP, total de checkout e tributos adicionais não foram calculados.

Os registros manuais não viram cotações de API. O horário da observação, pagamento, vendedor e evidência de compra habilitada acompanham cada preço. Disponibilidade desconhecida, esgotada, referência de família e exemplo genérico não entram em preços efetivos. Totais completos ficam ausentes quando uma peça não tem preço válido; subtotais são identificados separadamente.

## Diversidade e orçamento

A expansão original exigia RAM11→21 e armazenamento11→21. O resultado ativo contém22RAM e21armazenamentos, com DDR4/DDR5, módulos e kits, 8–64GB, 3200–6400MT/s, SATA/NVMe/HDD e diferentes fabricantes. Dezesseis opções adicionais preservam diversidade sem duplicar SKU. Mancer16GBCL19R$619,99, Apacer8GBCL16R$529,90, Apacer16GBCL16R$919,90 e kitCorsair2×8R$1399,90 evitam depender apenas das referências Kingston mais caras. Latência, RGB e perfil não são presumidos equivalentes.

Nove receitas prontas foram revistas explicitamente. As faixas-alvo originais e o orçamento do usuário permanecem intactos: valores acima da faixa recebem status e diferença reais, nunca aumento silencioso do limite. Fotos novas foram revisadas individualmente. Os 81 produtos ativos têm mídia revisada, sem fallback: 71 imagens de modelo exato e 10 imagens de família previamente aprovadas; as 43 novas identidades têm foto de SKU exato.

## Correções representativas

- Ryzen 5 5500: a Pichau BOX-BR anterior está esgotada. KaBuM 320799, SKU 100-100000457BOX, foi observado disponível por R$559,99 no PIX. A listagem KaBuM 356695 conflita no SKU da ficha e foi excluída.
- O HTML de diversas páginas Pichau mostrava valor, enquanto o botão renderizado indicava ESGOTADO. A Terabyte 5500 também divergiu de seu snippet indexado.
- Amazon MSI RTX4060 Ventus2X Black8G OC mantém a família suportada no simulador; vendedor JC TECH STORE, enviado por Amazon. Condição novo/usado não explicitada, registrada como desconhecida. Anúncio Mercado Livre RX7700XT está pausado e não foi usado.
- XPG AX5U6000C4816G-DTLABWH foi retido fora da seleção por título/documento conflitante; o kit Kingston32GB DDR5-5600CL36 tem identidade inequívoca. Altura de42,23mm vem do fabricante, não dos34,9mm errados do varejista.

## Trocas e efeitos

- 5600→5700X: 6/12→8/16, AM4; 5700X não inclui cooler. A alternativa usa seu próprio modelo interno.
- 13400F→14400F: mantém LGA1700, muda geração/turbo e exige verificar BIOS.
- 13600K→14600K Box: 14ª geração, até5,3GHz, potência básica125W/turbo máximo181W. Sem calibração própria: não herda pontuação ou FPS.
- GPUs exatas ganham dimensões e conectores reais. Somente3060/4060/7600 usam o modelo interno da mesma família, explicitamente sem ganho presumido por overclock. Novas famílias ficam sem estimativa; não recebem valor neutro50 nem ranking fictício.
- MSI3050 LP6GB não é a3050 de8GB. RX9070XT325mm/800W constitui mudança de geração/faixa, registrada como tal.
- Novas fontes têm contagem de cabos e conectores. MWE Gold650V3 não tem16pinos nativo. MSI850White tem16pinos, mas revisão ATX/12V-2x6 do lote não foi confirmada.
- Elite301White possui três fans frontais; o limite365mm só vale sem fans/radiador frontal. Folga da montagem padrão permanece não verificada. BIOS instalada, adaptadores e limites ausentes nunca viram compatibilidade confirmada.
- Kits e módulos têm quantidade, latência, perfil e altura próprios. CL48 single16GB não herda estimativa de CL40. Taxas de SSD declaradas não são benchmark; KC3000512→NV3500 reduz capacidade e desempenho nominal.

## Evidências

- `docs/evidence/ra2-market-revalidation/final-dispositions.json`: todos97 IDs, identidade anterior e sucessor explícito
- `src/data/dated-price-references.json`:81 ofertas manuais elegíveis, com horários e condições
- `src/data/market-revalidation-catalog.json`:43 identidades novas e59 mapeamentos, sem duplicar SKU
- `docs/evidence/ra2-market-revalidation/superseded-price-references.json`: referências anteriores preservadas fora dos preços atuais
- `docs/evidence/ra2-market-revalidation/research-ledger.json`: observações, bloqueios e tentativas de comparação
- `docs/evidence/ra2-market-revalidation/new-photo-evidence.json`: fotos novas e proveniência; licenças não presumidas

## Validação

A união inclui a base de interface109417 e a correção adicional dos rótulos de ordenação.812/812 testes Node passaram; lints backend/frontend e build de produção passaram. Auditoria de imagens:81/81, sem fallback, órfãos ou duplicatas suspeitas. Gates SSR de catálogo e navegação passaram. A revisão independente encontrou quatro lacunas, agora cobertas: ausência de parâmetro RAM/armazenamento não vira50; gargalo desconhecido não virafalse; SKU precisa de vínculo explícito; datas impossíveis são rejeitadas. A execução real de navegador deve ser repetida no commit publicado final; SSR não a substitui. Nenhum merge/deploy nesta tarefa.
