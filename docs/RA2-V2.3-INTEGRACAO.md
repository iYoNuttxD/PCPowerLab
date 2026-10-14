# V2.3 — Catálogo para pesquisa e comparação

Data: 08/10/2026 UTC. Base: `145c79d48e5b16ce0f09b5f20d446079215755f4`, branch `codex/pcpowerlab-ra2-ciclo2`. Escopo desta entrega: etapa 3. Sem merge, deploy ou execução da etapa 4.

## Implementado

- Pesquisa por nome, marca e part number, sem diferenciar maiúsculas/acentos; categoria, fabricante cadastrado e preço mínimo/máximo inclusivos. Filtros simultâneos usam AND.
- CPU: socket, núcleos e faixa de desempenho estimado. GPU: VRAM e faixa estimada. RAM: DDR4/DDR5, capacidade e taxa de transferência (MT/s). Armazenamento: SATA/NVMe, capacidade e taxas de leitura/gravação cadastradas. Cooler: ar/AIO, sockets suportados, altura e radiador. Fans: diâmetro, espessura e conector. Marca e preço funcionam em todas as categorias. Placa-mãe, fonte e gabinete também têm campos pertinentes.
- Valores técnicos vêm dos registros existentes, incluindo variantes distintas por ID/SKU. Não foram inventadas especificações. Dado ausente não atende a filtro técnico; arrays usam pertinência exata, sem substring enganosa.
- Trocar categoria limpa marca, especificações e faixa/ordenação de desempenho, preservando pesquisa e preço. Limpar filtros restaura o catálogo; em contextos com categoria fixa, preserva essa categoria. Comparação continua selecionada ao filtrar e exige limpeza explícita para trocar sua categoria.
- Ordenação crescente/decrescente por nome e preço; desempenho e índice por real apenas quando uma categoria comparável está selecionada. Empates têm desempate estável por nome/ID; números ausentes ficam no final nas duas direções. Catálogo misto não recebe ranking de desempenho.
- Comparação de 2–4 peças da mesma categoria, com fotografia/fallback reutilizável, nome, fabricante cadastrado, modelo/part number, preço de referência, união das especificações e unidades. Diferenças recebem fundo e texto, incluindo diferenças entre conhecido/ausente, sem alegar que maior é sempre melhor. Seleção e remoção funcionam também na tabela. Ao ficar com uma peça, o modal fecha.
- Desempenho, valor e metodologia explícitos; sem tratar simulação como benchmark real ou preço demonstrativo como oferta.
- Selecionar no catálogo/tabela chama as mesmas ações do BuildProvider do assistente. Não há um segundo modelo de montagem. Substitui somente o slot da categoria, preserva as demais escolhas e invalida resultados derivados. Cooler usa o slot existente. Fan adiciona 1 pacote somente se ainda não estiver escolhido, preserva quantidades existentes e não duplica ao clicar novamente. Ajuste de quantidades permanece no assistente existente.
- Comparação em região própria rolável horizontalmente, focável por teclado, com identificação das linhas, nomes completos e rolagem lateral contida por CSS. Isto é implementação, não comprovação visual.

## Desempenho e custo-benefício: definição e limites

`GET /api/v1/components` acrescenta `performanceScore` e `performanceMethodology`, derivados dos parâmetros já cadastrados. Somente CPU/GPU/RAM/armazenamento recebem índice interno válido entre 0 e 100. Ausência permanece `null`. Fonte, gabinete, placa-mãe, cooler e fan não recebem score fictício.

Índice por real = score / preço de referência × 1.000, expresso como pontos por R$ 1.000. Exige preço numérico positivo e score conhecido. Não representa benchmark medido, FPS, preço atual, garantia de desempenho ou recomendação universal. Não inclui consumo, qualidade, adequação ao uso, compatibilidade ou valor futuro. Comparações são somente dentro da mesma categoria.

## Compatibilidade com montagem ativa

`POST /api/v1/components/compatibility`, corpo `{ "components": <payload de seleção existente>, "category": <opcional> }`, devolve lista de `{ componentId, compatible, status, alerts, unverifiedChecks }`.

Para cada candidato, substitui o slot no build atual; fan já selecionado mantém a quantidade, candidato novo representa 1 pacote. A avaliação é extraída do serviço existente de compatibilidade e compartilhada por ambos os fluxos, não uma cópia divergente. Teste compara todos os 98 candidatos com o serviço de build completo. Na montagem parcial, entradas ausentes geram verificação incompleta; conflito conhecido continua incompatível. Conflitos preexistentes em outras peças também afetam o resultado.

A interface só solicita a prévia quando há montagem ativa e um filtro de compatibilidade é escolhido. Exibe carregamento, falha com nova tentativa e motivos por produto. Resposta de seleção antiga é ignorada. Sem resposta não há aprovação presumida. Estado compatível significa somente as regras efetivamente verificadas: não certifica BIOS/QVL/folgas, adequação térmica ou toda a montagem física.

## Verificação técnica e limites

Resultados reproduzíveis: [evidências](evidence/ra2-v2.3/README.md). Testes Node cobrem filtros isolados/combinados, limites, campos incompletos, arrays, SKU, ordenação não mutante, scores/valores desconhecidos, compatibilidade parcial e paridade integral do serviço, seleção de peças/fans/cooler e preservação de quantidades/payload/preço. Casos Playwright adicionais incluem fluxo de filtros/reset/categoria, comparação e dados ausentes, persistência/invalidação, falha/nova tentativa/resposta atrasada, seleção de fan via tabela e rolagem desktop/mobile.

**Navegador e screenshots não executados.** A negativa anterior do Chromium (socket, inclusive após revisão) e da URL localhost no navegador cloud foi respeitada. Nenhuma rota negada foi repetida, nenhum túnel ou computador do usuário foi utilizado. Coletar testes não equivale a executar testes. CSS, lint, build e testes Node não comprovam responsividade visual, foco, leitura assistiva, interpretação por participantes ou aprovação de telas. Esses itens aguardam ambiente autorizado funcional.

## Feito / não feito / pendências

Feito: filtros e ordenação funcionais, prévia de compatibilidade pelo motor compartilhado, comparação técnica, integração com montagem existente, testes e documentação. Catálogo preservado em 98 produtos, 9 fotografias verificadas e 89 bloqueios herdados da v2.2. Não foram alterados os registros de imagens nem inventadas fotos.

Não feito: validação visual desktop/mobile, screenshots, execução E2E, benchmark físico, preços de mercado, cobertura fotográfica integral, validação de entendimento por iniciantes/intermediários/experientes, merge/deploy e etapa 4.

Pendências: executar os casos de navegador e roteiro visual em ambiente autorizado; confirmar interação, contenção da tabela, teclado e persistência; realizar pesquisa com participantes; tratar os 89 bloqueios de foto conforme v2.2. Nenhum requisito recebe o estado VALIDADO apenas por testes de código.
