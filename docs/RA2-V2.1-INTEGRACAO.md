# PCPowerLab — v2.1: catálogo e refrigeração complementar

Data: 08/10/2026 UTC. Branch: `codex/pcpowerlab-ra2-ciclo2`. Base publicada: `341691e5c7d3b7d1e59c7783df67c340c51b7f1e`. Escopo somente v2.1; sem merge/deploy e sem antecipar v2.2–v2.9.

## Resultado e inventário

| Categoria | v2.0 | v2.1 | Adições |
| --- | ---: | ---: | ---: |
| CPU | 12 | 12 | 0 |
| Placa-mãe | 9 | 9 | 0 |
| GPU | 11 | 11 | 0 |
| RAM | 11 | 21 | 10 |
| Armazenamento | 11 | 21 | 10 |
| Fonte | 8 | 8 | 0 |
| Gabinete | 7 | 7 | 0 |
| Cooler | 0 | 5 | 3 air / 2 AIO |
| Fan | 0 | 4 | 3 unitários / 1 pack de 5 |
| **Total** | **69** | **98** | **29** |

89 parâmetros de desempenho, todos das sete categorias principais; 490 links de busca. Fotos continuam 2: nenhuma imagem sem licença adicionada. Os 69 IDs antigos permanecem. [Modelos/SKUs, dados, estimativas e fontes oficiais](RA2-V2.1-CATALOG-SOURCES.md). [Snapshot completo](RA2-V2.1-INVENTARIO.json), gerado por `node scripts/catalog-inventory.js`; `npm run inventory` recalcula a partir dos imports, enquanto `/api/v1/components` retorna o estado administrativo atual do processo. Contagens da interface usam resultados da API. Links de compra passam a refletir também cadastros/nomes/preços alterados em runtime, como buscas sem cotação ou estoque.

## Decisões e contrato

- Sete etapas de peças mantidas; assistente continua nove etapas contando orçamento e revisão
- Um cooler opcional, com `coolingType: air/aio`; lista de fans opcionais com quantidade inteira de **pacotes**, 1–20 por SKU, sem IDs duplicados
- Cooler/fans podem ser selecionados, alterados e removidos no gabinete/revisão e no resumo. Mudança invalida análises antigas. Não cria etapa obrigatória
- Preço de fan é por pacote; custo é preço × pacotes. Ocupação e consumo são por unidade física × unidades/pacote × pacotes. AIO inclui seus próprios fans; não cobra outro produto nem duplica seu consumo como acessório avulso
- `coolerId`/`components.cooler` e `fans:[{fanId,quantity}]`; seleções antigas sem acessórios continuam válidas. Remoção explícita no PATCH: `cooler:null`, `fans:[]`. Quantidades e IDs preservados em salvos, versões, JSON, carregamento e compartilhamento
- Preços novos são estimativas em BRL. Preço ausente não é grátis: totais/avaliação orçamentária dependentes de preço inválido retornam erro controlado 422; interface sinaliza indisponibilidade
- Compatibilidade distingue conflito (`incompatible`), insuficiência de dados (`unverified`) e aprovação das verificações conhecidas (`compatible`). `compatible` é false para os dois primeiros. Alertas mantêm verificações pendentes explícitas, sem TypeError para `storageInterfaces` ausente
- Nenhum cooler/fan recebe score de desempenho ou ganho de FPS. Capacidade térmica não comprovada não foi inventada. Consumo elétrico não é TDP de refrigeração

## Matriz de integração efetiva

| Dependência | Implementação / evidência |
| --- | --- |
| Catálogo/consulta/filtros/comparação de peças | Novas categorias no enum, API, hooks, labels, especificações e comparação genérica; metadados de fonte por SKU |
| Seleção/montagem | `build.service`, `CoolingPanel`, `useBuildState`, helpers e wizard; opcionais fora dos sete obrigatórios |
| Compatibilidade | `cooling.service`, `compatibility.service`, wrapper de alertas e status frontend; faltas de dados explícitas |
| Orçamento/consumo | `calculateBuildPrice` com pacotes; `getCoolingPower` com unidades físicas e consumo desconhecido; resumo, gargalos e fonte incorporam potência conhecida |
| Recomendações | Orçamento/faixa aceitam opcionais, reservam custo e verificam conjunto inteiro; não removem acessórios silenciosamente; sem aprovação quando dados pendentes |
| Comparação/resumo | Peças, quantidades, custo e status completo; índice de desempenho das peças principais e custo-benefício penalizado pelo custo extra, sem ganho térmico fictício |
| Salvar/carregar/versões | Modelo normaliza opcionais, valida categoria/quantidade e calcula total do catálogo; snapshots de versão clonados; formato legado preservado |
| Exportar/importar/compartilhar/relatório | IDs e quantidades no JSON 1.0 aditivo; export.build pode ser reimportado; seleção nos links de compartilhamento e relatório mantém acessórios |
| Upgrades/roadmap/correções | Serialização central preserva opcionais; valida compatibilidade/custo antes de sugerir; sem reduzir capacidade RAM/armazenamento/VRAM para fabricar upgrade |
| Feedback/histórico | Snapshots e detalhes retêm opcionais; histórico genérico conserva payload/resultado |
| Administração | Categorias e validação dos campos conhecidos; consumo ausente permitido mas não aprovado; parâmetros de desempenho não admitem categoria de refrigeração |
| Regras editáveis | CRUD documental preservado e explicado na UI. Motor de análise/recomendação continua codificado; editar registro não desliga verificações |

## Regras físicas e elétricas

1. Socket CPU × lista suportada do cooler; ausência é não verificada, divergência é conflito
2. Air cooler: altura × máximo do gabinete. Verificação de interferência com RAM/VRM continua pendente por falta de geometria por combinação
3. AIO: classe nominal de radiador × tamanhos aceitos. Tamanho aceito não comprova espessura/posição/folga de GPU/RAM, que permanecem não verificados
4. Fans: diâmetro, espessura, capacidade de suportes e unidades físicas. Radiador e fans já incluídos entram na análise de ocupação. Capacidades alternativas por diâmetro não são somadas; layouts mistos sem posições ficam não verificados
5. Conectores físicos registrados; headers/corrente/controladora do conjunto não comprovados geram pendência, sem presumir que PWM garante ligação
6. Potência conhecida adicionada tanto à recomendação heurística de fonte (`max(GPU recomendada, CPU TDP + 350) + refrigeração`) quanto à estimativa de gargalos (`CPU TDP + GPU TDP + 100 + refrigeração`). Métodos legados têm finalidades distintas; não são medição. Dados desconhecidos aparecem em `coolingPower.unknownComponents`

**Limite deliberado:** os acessórios reais atuais não podem receber aprovação física integral automática: air coolers têm RAM/VRM pendentes; AIOs têm posição/espessura pendentes; fans têm headers/layout/espessura pendentes. Seleção, custo, persistência e análise funcionam, mas recomendações estritamente compatíveis com acessórios podem retornar 422 ou nenhuma sugestão. Isso não significa incompatibilidade comprovada. Não ocultar o limite nem apresentar catálogo apenas como suporte completo.

## Defeitos encontrados e corrigidos durante integração

- Administração sem `storageInterfaces` causava TypeError no baseline; agora produz verificação pendente controlada
- Lista de fans invalidava pressupostos de peça única em serialização, preço e renderização; adaptados por fluxo e protegidos por testes
- Gravidade `warning` de pendências não era aceita no serviço de explicações; normalizada para `medium` com marcador `verification:'unverified'`
- Expansão do catálogo permitia recomendar SSD 512 GB como upgrade de 1 TB por score/preço; filtro agora impede perda de capacidade em RAM/armazenamento/VRAM
- Preço de refrigeração ausente era somado como zero; erro controlado impede aprovação orçamentária enganosa
- Comparação tratava pendente como simples “Não”; apresentação distingue falta de verificação de conflito

## Testes e evidências

**Checks finais: 307/307 testes Node (300 backend + 7 helpers frontend), lints e build passaram. Descobertos 109 casos browser, nenhum executado nesta etapa.** Resultados finais e comandos: [evidência](evidence/ra2-v2.1/README.md). Cobertura adicionada: socket, altura, radiador, diâmetro/espessura/ocupação, quantidades inválidas/duplicadas, packs, consumo conhecido/desconhecido, custo, admin, campos ausentes, composição com/sem acessórios, save/export/share/version/reload/remove, comparação/relatório/feedback, desempenho sem bônus e capacidade de upgrade. Helpers frontend testados sem navegador. Testes antigos preservados, com adaptação explícita de duas hipóteses: testes de parâmetros do catálogo só se aplicam a RAM/SSD; buscas agora são geradas dinamicamente para cadastro posterior.

**Navegador:** baseline registrou bloqueio `socket() failed: Operation not permitted (1)` antes de abrir página, inclusive pela via de revisão. Não foi repetida tentativa nem usado contorno. Novos casos de refrigeração escritos e apenas descobertos/listados; não aprovados. Nenhuma captura, validação visual ou E2E executada nesta etapa. A aprovação de lint/build/helpers não substitui navegador, acessibilidade, usuários ou hardware físico.

## Pendências reais

- Executar E2E/integração em ambiente autorizado com Chromium funcional e revisar visual/teclado/mobile
- Obter dados físicos por combinação (RAM/VRM, posições/espessura, fans incluídos por posição, headers/corrente/hubs) para reduzir os estados não verificados
- Consumo completo de quatro dos cinco coolers desconhecido; nenhuma capacidade térmica certificada adicionada
- Catálogo legado não revalidado integralmente; H5 Flow sem ano/revisão permanece desconhecido nos novos campos
- Preços/ofertas, medição de FPS/temperatura e pesquisa humana não realizados
- Persistência do servidor continua em memória; bundle grande preexistente permanece. Sem promessa de produção, merge ou deploy
