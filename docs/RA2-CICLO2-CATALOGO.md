# RA2 · Ciclo 2 — Pesquisa e comparação de hardware

## Diagnóstico anterior à implementação — 07/10/2026

Base: `1f750f0`, branch `codex/pcpowerlab-ra2-ciclo2`, árvore limpa.

O repositório utiliza catálogo em memória (`components.mock.js`/`component.repository.js`), sete categorias e sete posições obrigatórias em `build.service.js`; `optionalBuildSlots` está vazio. O frontend mantém uma peça por categoria e persiste a montagem em `useBuildState.jsx`. Há oito opções de RAM e oito de armazenamento na base inicial. O catálogo já pesquisa nome/marca e filtra categoria, mas não compara peças lado a lado.

As verificações existentes cobrem socket CPU/placa-mãe, geração DDR, interface de armazenamento, potência de fonte e espaço/formato de GPU/placa-mãe no gabinete. RAM depende de `memoryType`; armazenamento, de `interface` e `storageInterfaces`. Não há inventário de slots DIMM/M.2, limite de capacidade de RAM, QVL/XMP/EXPO, altura de cooler, encaixes de radiador, ocupação simultânea de fans, conectores de bomba/fan ou orçamento térmico validado.

Recomendações percorrem candidatos por essas sete categorias, podam combinações por compatibilidade e orçamento e usam `performanceParameters.js` para pontuação. Gargalos, simulações, custo-benefício, correções, upgrades, roadmap, resumo, exportação e builds salvas também dependem desses IDs e posições. Links de compra são buscas em lojas, geradas a partir do nome; `price` e `lastUpdated` são dados mockados, sem coleta de preço de mercado.

| Melhoria | Risco e decisão |
| --- | --- |
| Imagem opcional com origem/licença, fallback e falha de carregamento | Baixo; metadados aditivos, sem mudar identidade/compatibilidade. Somente fotografia do modelo e capacidade corretos. |
| Marca, categoria, faixa de preço e pesquisa combinadas | Baixo; filtragem do catálogo público já carregado, preservando a API. |
| Comparação de peças da mesma categoria | Baixo; tabela de especificações padronizadas, sem inventar ranking ou regras técnicas. |
| Mais RAM e armazenamento | Moderado; exige IDs novos, dados técnicos rastreáveis, parâmetros de desempenho mockados coerentes e testes de recomendações, orçamento, compatibilidade e upgrades. |
| Substituição no resumo | Moderado; exige manter outras escolhas, invalidar análises derivadas e evitar respostas antigas. Reutilizar verificação/resumo do backend, com prévia e aplicação explícita. |
| Air/water coolers e fans | Alto; adiar a inclusão no domínio. Acrescentar categorias agora aprovaria montagens sem evidências de encaixe, ocupação, conectores e requisitos térmicos. |
| Preço real de mercado | Exige outra fonte/contrato; nesta etapa identificar estimativas e documentar integração futura, sem scraping. |

## Refrigeração: arquitetura para uma etapa posterior

Preservar o payload legado das sete peças e introduzir um conjunto opcional versionado de acessórios, com quantidades e posição de instalação. Distinguir um cooler de CPU (air ou AIO), fans do gabinete e fans já incluídos no gabinete/AIO; não contar o mesmo item duas vezes no custo ou consumo.

Dados necessários, com origem e revisão de modelo:

- CPU: socket, necessidade de cooler separado, solução incluída e requisitos térmicos documentados pelo fabricante. TDP isolado não comprova capacidade de refrigeração.
- Air cooler: kit de montagem/socket, altura, interferência com módulos de RAM/VRM e requisitos da placa-mãe.
- AIO: sockets e kit, tamanho/espessura do radiador e conjunto com fans, posições de montagem permitidas, interferência com RAM/GPU e conectores/alimentação da bomba.
- Gabinete: altura máxima de cooler; posições e dimensões suportadas de radiador/fan; conflitos entre posições, GPU e baias; fans incluídos.
- Fans: dimensões/espessura, quantidade, conectores, tensão/corrente, controladores/hubs e capacidade de alimentação/controle da placa-mãe.

A análise deve distinguir **compatível, incompatível e dados insuficientes**, por relação verificada. Builds antigas sem acessórios continuam carregáveis, mas não ganham aprovação térmica. A ampliação deverá atualizar normalização, validação administrativa, persistência/versões, resumo, exportação, preço/consumo, recomendações e upgrades. Pontuação térmica ou ganho de FPS só poderá existir com um modelo justificado e testado; não atribuir bônus fictícios pela presença de um cooler.

Testes futuros: migração de builds antigas, ausência de dados, socket/kit incompatível, altura/interferência, radiador versus GPU/RAM, posições ocupadas, fans incluídos, alimentação/conectores, quantidades, custo total e não aprovação automática quando faltar evidência.

## Preços: integração futura

Manter `price` como referência estimada para preservar orçamento e recomendações. Uma integração futura deve guardar ofertas separadas por SKU/variante, loja e fonte autorizada, com moeda, valor, frete/condições, estoque, instante da coleta e validade. Usar APIs/feeds oficiais ou parcerias permitidas, cache com expiração, limites e recuperação de falhas. Comparações/orçamentos devem registrar o snapshot usado, distinguindo oferta atual, oferta vencida e referência mockada. Links de busca não comprovam preço nem disponibilidade; nenhum `lastUpdated` da base mockada deve aparecer como atualização de mercado.

## Implementação entregue

### Catálogo, fotografias e comparação

- Filtros combináveis por marca, categoria e limites inclusivos de preço estimado; pesquisa por nome/fabricante ignora acentos e caixa. Faixa inválida recebe explicação junto ao campo; ausência de resultados permite limpar os filtros. Preço ausente não vira zero.
- Seleção de duas a quatro peças da mesma categoria, mantida ao mudar filtros. A tabela mostra marca, código do modelo, preço estimado e união das especificações; valores ausentes aparecem como “Não informado”. A seleção pode ser removida individualmente ou limpa para comparar outra categoria.
- Unidades padronizadas: GB, W, mm, GHz, MB/s e MT/s. O campo legado `speedMhz` continua no contrato, apresentado como taxa de transferência em MT/s. As taxas máximas dependem do sistema; a tabela não promete validar compatibilidade por si só.
- Tabela com cabeçalhos semânticos, primeira coluna fixa, rolagem horizontal restrita à tabela e instruções de teclado/toque. Detalhes completos continuam disponíveis nos cards.
- `ComponentImage` recebe metadados opcionais `image: { url, alt, author, sourceUrl, license, licenseUrl }`. Sem autoria/licença/origem, ou se o arquivo falhar, apresenta o mesmo fallback ilustrativo. O espaço da foto e dos créditos é reservado para manter alinhamento.
- Duas fotografias locais foram incorporadas: Samsung 970 EVO Plus **250GB** e 980 PRO **1TB**, conferidas visualmente pelas etiquetas. As demais peças mantêm o fallback; nenhuma foto foi reaproveitada em capacidade/modelo diferente. Créditos e licença ficam visíveis no card. Fontes, autores e licença dos arquivos e das fotos presentes nas capturas estão em [ATTRIBUTION.md](../frontend/public/images/components/ATTRIBUTION.md).
- Os metadados são mantidos no catálogo do repositório. Não foi criado upload de imagens nem uma nova interface administrativa.

### Ampliação controlada dos dados

O catálogo passa de **63 para 69 peças**, com RAM e armazenamento passando de oito para onze opções cada. IDs antigos e as sete posições da montagem foram preservados.

| Novo componente | Especificações cadastradas | Fonte técnica do fabricante |
| --- | --- | --- |
| Kingston Fury Beast KF436C18BB/16 | 16 GB, DDR4, 3600 MT/s | [Datasheet Kingston](https://www.kingston.com/dataSheets/KF436C18BB_16.pdf) |
| Crucial CT32G4DFD832A | 32 GB, DDR4, 3200 MT/s | [Página Crucial](https://eu.crucial.com/memory/ddr4/ct32g4dfd832a/ct26139276) |
| Kingston Fury Beast KF552C40BB-16 | 16 GB, DDR5, 5200 MT/s | [Datasheet Kingston](https://www.kingston.com/dataSheets/KF552C40BB-16.pdf) |
| Kingston A400 SA400S37/960G | SSD SATA, 960 GB, leitura/gravação até 500/450 MB/s | [Página Kingston](https://www.kingston.com/en/ssd/a400-solid-state-drive) |
| Samsung 970 EVO Plus MZ-V7S250 | SSD M.2 NVMe, 250 GB, até 3500/2300 MB/s | [Datasheet Samsung](https://download.semiconductor.samsung.com/resources/data-sheet/Samsung_NVMe_SSD_970_EVO_Plus_Data_Sheet_Rev.3.0_10129514071343.pdf) |
| Samsung 980 PRO MZ-V8P1T0 | SSD M.2 NVMe, 1000 GB, até 7000/5000 MB/s | [Datasheet Samsung](https://download.semiconductor.samsung.com/resources/data-sheet/Samsung-NVMe-SSD-980-PRO-Data-Sheet_Rev.2.1_230509_10129500052824.pdf) |

Fontes consultadas em 07/10/2026. Capacidade, geração, interface e taxas foram espelhadas em `performanceParameters.js`. **Preços e pontuações continuam demonstrativos**, coerentes com os perfis existentes, sem representar cotações ou benchmarks medidos. Não foram alteradas fórmulas, regras de compatibilidade nem serviços de recomendação/upgrades. A validação permanece limitada aos dados que o MVP já verifica, não incluindo os requisitos físicos adicionais identificados no diagnóstico.

O novo SSD altera legitimamente a ordem de uma fixture de upgrades: o 980 PRO 1TB passa a preceder a GPU injetada pelo teste pelo critério existente de ganho/custo. O teste mantém as verificações de ordem, ganho, orçamento e compatibilidade, confirma a GPU seguinte e compara o resultado de build salva com o resultado direto. Nenhuma regra foi relaxada para conservar a ordem antiga.

### Substituição no resumo

“Alterar peça” abre uma prévia da categoria, com busca, filtros, seleção explícita e comparação opcional com a peça atual. O mesmo fluxo atende às sugestões de correção técnica por “Revisar substituição”.

1. A montagem atual permanece intacta durante a escolha.
2. “Verificar substituição” envia a configuração candidata ao serviço existente `POST /build-summary`, com orçamento, perfil e parâmetros de jogo atuais. O backend reexecuta compatibilidade/alertas, orçamento, gargalos e simulação quando aplicável.
3. Incompatibilidade, build incompleta ou falha da API impedem aplicar. Orçamento excedido tem aviso e diferença explícitos junto às ações; aplicar não aumenta o orçamento informado. Análise de desempenho indisponível é sinalizada, sem transformar compatibilidade em garantia de FPS.
4. “Aplicar substituição” usa `selectComponent` do estado compartilhado, preservando outras peças, orçamento, perfil, jogo e etapa. O novo resumo verificado substitui as análises relacionadas; nota, links, relatórios, exportação, compartilhamento e sugestões anteriores são invalidados para não apresentar dados da peça antiga.

O hook existente `useSimulationRequest` vincula a resposta ao payload completo e ignora retornos antigos. Cancelar mantém a configuração original. Cabeçalho e ações ficam visíveis dentro da janela; resultado/erro recebe foco e rolagem, respeitando movimento reduzido. Filtros não descartam silenciosamente a alternativa selecionada.

### Preços

Cards, filtros, tabela, resumo, orçamento e links de loja identificam valores estimados. Links são apresentados como **buscas**, com orientação para conferir modelo, disponibilidade e preço na loja. Não houve coleta de preços, promessa de atualização em tempo real ou scraping. A arquitetura futura proposta acima fica documentada, sem nova integração nesta etapa.

## Arquivos modificados

| Área | Arquivos |
| --- | --- |
| Catálogo e apresentação | `ComponentsCatalog.jsx`, `ComponentCard.jsx`; novos `ComponentImage.jsx`, `ComponentFilters.jsx`, `ComponentComparison.jsx`, `componentPresentation.js`; `formatCurrency.js` |
| Troca de peça e orçamento | `BuildSummary.jsx`, novo `ComponentReplacement.jsx`, `BuildSummaryCard.jsx`, `BudgetPanel.jsx`, `PurchaseLinksList.jsx` |
| Interface compartilhada | `Modal.jsx`, `global.css` |
| Dados e mídia | `components.mock.js`, `performanceParameters.js`, duas fotos e `public/images/components/ATTRIBUTION.md` |
| Testes | Novos `tests/catalog-expansion.test.js` e `frontend/tests/e2e/catalog.spec.js`; `tests/upgradeSuggestion.test.js` |
| Registro | Este relatório, `frontend/README.md` e `docs/evidence/ra2-ciclo2-catalogo/` |

## Validação executada

Ambiente local: Node 26.9.0, Chrome 154.0.8037.98, Playwright 1.64.0. Nenhum banco externo foi necessário; backend em memória. Os resultados abaixo correspondem a esta etapa, não a CI ou validação física do hardware.

| Verificação | Resultado |
| --- | --- |
| `npm test` | **255/255**, incluindo oito testes novos de integração dos dados e a suíte preexistente de compatibilidade, orçamento, recomendação, pontuação, upgrades e persistência |
| `PLAYWRIGHT_CHANNEL=chrome npm test --prefix frontend` | **74/74**, desktop 1440×900 e celular 390×844, sem retries; inclui as 50 verificações das etapas anteriores |
| `npm run lint` | Aprovado |
| `npm run lint --prefix frontend` | Aprovado |
| `npm run build --prefix frontend` | Aprovado; mantém o aviso preexistente de chunk maior que 500 kB (JS final ~795 kB, gzip ~238 kB) |
| `git diff --check` | Aprovado |
| Navegador com API local real | 25 verificações: catálogo, filtros, comparação, prévia e aplicação da troca em larguras 1440, 1024, 768, 390 e 320 px, altura 1000 px; sem overflow horizontal da página ou exceções JavaScript |
| axe-core WCAG 2 A/AA e 2.1 AA | Oito execuções, quatro estados em desktop/celular, sem violações detectadas; contraste de alguns elementos em catálogo/resumo retornou **inconclusivo**, não aprovação automática integral |

Os 24 novos casos de interface (12 cenários nas duas resoluções) cobrem limites dos filtros, faixa inválida, busca/fabricante, comparação de 2–4 peças da mesma categoria, manutenção da seleção, campos ausentes, foto licenciada/falha/fallback, alinhamento com nome longo, preços ausentes, links de busca, carregamento, erro e vazio. A troca cobre prévia sem mutação, payload enviado, revalidação, foco, persistência após reload, preservação das outras escolhas, incompatibilidade, orçamento excedido, análises indisponíveis, erro da API, resposta tardia e sugestão de correção técnica.

Na API real, a troca para Crucial 32GB foi aplicada nas cinco larguras, confirmando compatibilidade e preservação das outras seis peças. Isso complementa os testes E2E com respostas controladas. As capturas foram inspecionadas visualmente; fotos, créditos, alinhamento, tabela, resultado e ações foram conferidos. O teste automatizado de acessibilidade não substitui avaliação completa com leitor de tela; Safari, Firefox e aparelhos físicos não foram verificados nesta etapa.

### Evidências

Capturas de viewport em desktop e celular, com a mesma altura de 1000 px. As capturas de fotos mostram a região dos cards; as de substituição mostram a verificação antes de aplicar.

| Estado | Desktop | Celular |
| --- | --- | --- |
| Catálogo antes | [1440 px](evidence/ra2-ciclo2-catalogo/before-1440.png) | [390 px](evidence/ra2-ciclo2-catalogo/before-390.png) |
| Catálogo depois | [1440 px](evidence/ra2-ciclo2-catalogo/1440-catalog.png) | [390 px](evidence/ra2-ciclo2-catalogo/390-catalog.png) |
| Fotos e fallback | [1440 px](evidence/ra2-ciclo2-catalogo/1440-photos.png) | [390 px](evidence/ra2-ciclo2-catalogo/390-photos.png) |
| Comparação | [1440 px](evidence/ra2-ciclo2-catalogo/1440-comparison.png) | [390 px](evidence/ra2-ciclo2-catalogo/390-comparison.png) |
| Substituição verificada | [1440 px](evidence/ra2-ciclo2-catalogo/1440-replacement.png) | [390 px](evidence/ra2-ciclo2-catalogo/390-replacement.png) |
| Resumo após aplicar | [1440 px](evidence/ra2-ciclo2-catalogo/1440-summary.png) | [390 px](evidence/ra2-ciclo2-catalogo/390-summary.png) |

[Resultados por resolução e axe-core](evidence/ra2-ciclo2-catalogo/validation.json). Logs das suítes estão no mesmo diretório. Refrigeração e integração de preços reais permanecem adiadas pelas razões técnicas descritas neste relatório; todas as rotas e mecanismos de autenticação existentes foram preservados.
