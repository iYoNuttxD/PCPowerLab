# RA2 V2 — rastreabilidade técnica das melhorias

08/10/2026 UTC. Documento público de implementação, vinculado à [matriz R01–R22](RA2-V2-REQUISITOS.md) e ao [relatório V2.10](RA2-V2.10-CONTINUIDADE.md).

Este arquivo registra somente requisitos de software, decisões técnicas, critérios e limites. Não publica material de pesquisa, respostas individuais, atribuições, amostras, citações ou arquivos de origem privados. A existência de código e testes não comprova aceitação ou comportamento de pessoas.

| ID | Requisito técnico | Critério e limite |
| --- | --- | --- |
| R01 | Contraste e identidade visual | Tokens coerentes, foco perceptível e validação visual dos estados |
| R02 | Cards consistentes | Mídia, nomes, especificações, valores e ações sem compressão indevida |
| R03 | Navegação | Destinos agrupados e acessíveis; teclado, fechamento e retorno de foco |
| R04 | Área administrativa | Separação da navegação comum e proteção de operações |
| R05 | Avanço no assistente | Ações visíveis, razões de bloqueio e preservação das escolhas |
| R06 | Rolagem global e entre etapas | Título visível, foco adequado e respeito a movimento reduzido |
| R07 | Linguagem acessível | Termos e unidades em português; detalhes técnicos progressivos |
| R08 | Gráficos explicativos | Unidades, equivalentes textuais e dados ausentes distintos de zero |
| R09 | Simulação individual e comparação de jogos | Modos independentes, validação de limites e resultados ligados às escolhas |
| R10 | Fotografias exatas | Modelo/variante e direitos verificáveis; meta de cobertura integral ainda não atendida |
| R11 | Variedade de RAM e armazenamento | Especificações rastreáveis, identidade preservada e regressões de domínio |
| R12 | Refrigeração a ar | Seleção opcional, custos e restrições técnicas; desconhecido não aprovado |
| R13 | Refrigeração líquida | Radiador e restrições de montagem; limites físicos explícitos |
| R14 | Ventoinhas | Pacotes, unidades, consumo e ocupação coerentes; sem bônus de desempenho inventado |
| R15 | Filtros e ordenação | Filtros combináveis com dados reais do catálogo; limite válido e recuperação de vazio/erro |
| R16 | Comparação de peças e configurações | Mesma categoria nas peças; configurações completas com custo, desempenho, alertas e critérios explícitos |
| R17 | Substituição individual | Prévia atual/proposta, revalidação, aplicação/undo e demais escolhas preservadas |
| R18 | Origem de preço | Referências datadas, estimativas e cotações separadas; condições e cobertura declaradas |
| R19 | Alternativas de compra | Escopo local do catálogo, identidade exata e ausência de garantia de melhor preço |
| R20 | Estabilidade | Regressões de estados, dados incompletos, cálculos, persistência e navegação |
| R21 | Resumo e resultado final | Compatibilidade, desempenho, orçamento, pendências e orientação sem conclusão enganosa |
| R22 | Avaliação de valor continuado/comercial | Hipóteses de produto não equivalem a resultados observados; validação externa permanece pendente |

## Decisões de integração

- Preservar IDs e configurações existentes; não remover produtos para melhorar artificialmente a cobertura
- Manter os fluxos já corretos, acrescentando orientação contextual e validação no ponto da ação
- Tratar rolagem entre páginas e comparação de configurações completas como contratos próprios, além do assistente e da comparação de peças
- Preservar históricos como registros originais e usar o catálogo atual somente na montagem ativa/reanalisada
- Separar preços à vista datados, estimativas e ofertas atuais; não inferir estoque ou autorização de fornecedor
- Não gerar fotografias artificiais como prova de identidade de produto

## Evidência técnica e pendências

A [evidência V2.10](evidence/ra2-v2.10/README.md) identifica comandos, resumos de execução e limites. Os [16 achados de interface](RA2-V2.10-CONTINUIDADE.md) são tratados como diagnóstico de software; o reteste visual exige uma revisão publicada identificada.

Cobertura de imagens: 11/98, com 87 pendências. Referências datadas: 42/98; 56 estimativas sem fonte datada validada e nenhuma cotação ao vivo. Os limites de identidade de quatro produtos genéricos e 11 famílias de GPU precisam de part number/fabricante inequívocos; qualquer futura migração deve preservar a rastreabilidade dos IDs legados.

Nenhum requisito completo é promovido a VALIDADO apenas por testes técnicos. Permanecem necessárias validações visuais, físicas, comerciais e de uso apropriadas, conforme o critério de cada requisito.
