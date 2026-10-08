# RA2 V2.11 — Fotos de produtos e interface compacta

## Resultado

- Fotografias locais: **98/98** produtos ativos
- Identidade visual: 35 modelo exato; 59 família visual; 4 exemplos ilustrativos
- Sem fotografia: 0
- Duplicações suspeitas: 0; arquivos órfãos: 0

As imagens mostram produtos reais ou suas embalagens. Imagens de família são identificadas nos detalhes e não comprovam SKU, capacidade, revisão, cor ou dimensões que a fotografia não permita verificar. Nenhum produto foi removido, nenhuma especificação foi alterada para combinar com uma foto e nenhum placeholder é contado como fotografia.

A composição antiga de Ryzen 5500/5600 foi substituída por imagens de embalagem das páginas de cada modelo. O original licenciado permanece apenas como fixture dos testes de enquadramento. As demais fotos existentes foram revisadas; imagens adequadas com licenças conhecidas foram preservadas.

## Interface

Créditos e notas de identidade ficam em detalhes opcionais. Preços exibem uma referência curta com fonte/data; condições, incerteza de estoque e ausência de cotação em tempo real permanecem nos detalhes. O mesmo componente de imagem atende catálogo, montagem, recomendações, resumo, comparação, configurações salvas e upgrades.

## Origem e direitos

[Atribuições por produto](../frontend/public/images/components/ATTRIBUTION.md) registram fonte, autor informado, mudanças técnicas e SHA-256. Licenças conhecidas foram preservadas. Para outras imagens públicas, a permissão de reutilização não está estabelecida; referência acadêmica não comercial não é apresentada como licença. As imagens não herdam a licença MIT do código.

## Verificação

A auditoria dinâmica enumera todos os produtos ativos, verifica arquivos locais, hashes, decodificação completa, dimensões, metadados, compartilhamentos revisados e itens sem foto. Modelos exatos, famílias visuais e exemplos ilustrativos têm contagens separadas. Novos produtos sem foto impedem declarar cobertura completa.

- `npm test` na raiz: 517 testes aprovados (inclui 75 testes unitários frontend; não são somados novamente)
- 14 scripts SSR/handlers: aprovados
- Lint backend e frontend, build de produção: aprovados
- HTTP de produção: 98 fotos atribuídas servidas e quatro rotas SPA verificadas
- Playwright: 186 casos coletados; execução em navegador não realizada
- Auditoria de cobertura: 98/98; 0 pendências

[Inventário e validação de arquivos](RA2-COBERTURA-IMAGENS.md).

O teste visual no navegador sobre este código permanece pendente. Inspeção dos pixels dos ativos, testes Node/SSR, lint, build e checagens HTTP não substituem esse teste visual. Não há alegação de homologação humana.
