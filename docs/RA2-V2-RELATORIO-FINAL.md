# PCPowerLab — auditoria final independente RA2 V2.9

> [Consolidação técnica atual](RA2-CONSOLIDACAO-FINAL.md). Os resultados abaixo pertencem às etapas e fontes identificadas; não representam automaticamente a união posterior. Validação final pendente; **NÃO HOMOLOGADA**.

> Continuidade posterior: [V2.10 — feedback, referências e UI](RA2-V2.10-CONTINUIDADE.md). O registro v2.9 abaixo permanece histórico, sem alteração retroativa de seus resultados.

**Veredito: NÃO HOMOLOGADA.** Há requisitos obrigatórios incompletos. Os critérios de aceite não foram relaxados para aprovar a entrega.

08/10/2026 UTC · repositório [iYoNuttxD/PCPowerLab](https://github.com/iYoNuttxD/PCPowerLab) · branch `codex/pcpowerlab-ra2-ciclo2`.

## Resumo executivo

A sequência v2.0–v2.8 estava publicada antes desta auditoria. O HEAD remoto e local conferidos ao começar eram `5de7d88c906b2b66c63a4bc69e115045e012bf0d`, árvore `ca96e14c082f70ca96e7be170c43430494faf0f3`, checkout limpo. A revisão final voltou à fonte, executou testes e percursos HTTP e encontrou defeitos que os relatórios anteriores não identificaram. O diagnóstico precedeu cada correção; não se iniciou funcionalidade nova para encobrir pendências.

O produto dispõe de catálogo ampliado, refrigeração opcional, pesquisa/comparação, troca individual/desfazer, recomendações, orçamento, análises, salvamento e compartilhamento. Essas implementações foram preservadas, com testes técnicos reexecutados. Não equivalem a validação de UX, hardware físico ou preço atual.

Bloqueios decisivos: apenas **9/98 fotos exatas (9,18%)**, **89 faltantes**; **188 casos de navegador coletados, zero executados** nesta auditoria; zero screenshots atuais; nenhum provedor de preços conectado; dados físicos de refrigeração incompletos; nenhuma pesquisa real de compreensão, retenção ou monetização. Entrega do trabalho viável e encerramento deste relatório não significam homologação.

## Método e rastreabilidade

- Lidos README raiz/frontend, API, baseline, matriz, inventários e relatórios RA2 anteriores, incluindo qualidade e as três jornadas. Não há instrução de projeto em `AGENTS.md` ou `.agents/skills` no checkout; documento de dependência em node_modules não governa o projeto
- Duas lentes adicionais independentes revisaram domínio/contratos e fotos/UI; resultados cruzados com execução. Relatórios anteriores foram tratados como histórico, não prova de aprovação atual
- Camadas executadas: Node, Express HTTP real, adaptadores/utilitários frontend reais, React SSR, handlers com hooks/transporte controlados, lints, build e auditor de bytes/metadados de fotos
- Não executado: DOM/hidratação, clique nativo, geometria, foco/rolagem reais, screenshots, axe em browser, Safari/Firefox, dispositivos físicos, benchmark e participantes
- As negativas já obtidas para socket do Chromium (inclusive após revisão) e localhost no browser cloud foram respeitadas. Nenhum retry da rota negada, túnel ou computador não autorizado foi utilizado
- Cada requisito R01–R22 mantém origem e critério histórico e recebe estado final explícito na [matriz](RA2-V2-REQUISITOS.md#auditoria-final-v29--08102026-utc). Não se confunde PARCIAL com VALIDADO

## Resultado por função

| Área | Implementação e execução técnica | Limite que impede aprovação integral |
| --- | --- | --- |
| Catálogo CPU/placa-mãe/GPU/RAM/armazenamento/fonte/gabinete | 98 IDs ativos únicos; 69 legados preservados; RAM e storage 21 cada; integridade/consulta/parâmetros testados | Parte do catálogo legado não tem SKU completo nem certificação externa de todas as especificações |
| Air cooler / AIO / fans | 3 air, 2 AIO, 4 produtos fan; seleção, packs, custo, consumo conhecido, remoção, serialização e regras compartilhadas exercitados | RAM/VRM, espessura/posição, headers/corrente/hubs e adequação térmica incompletos; acessórios atuais podem ficar `unverified` |
| Compatibilidade | Mesmo motor alimenta catálogo, resumo, sugestões e simulação; conflito/compatível/desconhecido distintos | Não certifica BIOS/QVL/slots/conectores/folgas/temperatura; CRUD de regras não governa motor |
| Busca, filtros, comparação | Marca/categoria/preço/SKU/acentos/specs/ordenação; 2–4 peças da mesma categoria; ausentes não viram zero | Controles, tabela e geometria no navegador não executados |
| Recomendações / troca individual | Orçamento/faixa/uso, uma peça, prévia, preservação das demais/acessórios/orçamento, revisão, undo e original salvo preservado | Heurística de catálogo reduzido, não ótimo global; interação DOM e preço real pendentes |
| Orçamento / preços / compra | Centavos, packs, total de referência e mercado separados; 490 links de pesquisa; ofertas rejeitam origem/SKU inválidos em fixtures | Zero cotações reais; adapter HTTP de fornecedor não implementado; pesquisa não comprova estoque |
| Gargalo / desempenho | Pontos/W/FPS identificados; jogo individual e comparação 2–10; software; inválido/atraso/retry e falta de dados exercitados | Modelo demonstrativo sem benchmark; compreensão humana não medida |
| Resumo final | Compatibilidade, orçamento, alertas e estimativas coerentes; orientação contraditória corrigida nesta etapa | Expectativa de “simulação final” precisa ser validada com participantes |
| Salvar / versões / exportar / compartilhar | HTTP e helpers conferem round-trip, snapshots, exclusão sem órfãos e rota real compartilhada | Dados globais em memória, sem conta/isolamento, somem no reinício; reload DOM não executado |
| Upgrades / roadmap | Origem por buildId, parâmetros, teto/custo cumulativo, reanálise, capacidade preservada e original intacto | Não é melhor compra de todo mercado; acessórios desconhecidos limitam sugestões |
| Administração | Sessão, cookie, logout, 401 e limite de tentativas via HTTP; entrada pública removida em SSR | Sem auditoria completa de produção; regras são registros documentais |

Fontes/testes específicos e resultados estão no [registro de testes](RA2-V2-REGISTRO-TESTES.md). Cada aprovação técnica significa somente o contrato efetivamente exercitado.

## Defeitos encontrados nesta auditoria

### F01 — orientação final contraditória (alta, corrigida)

Ryzen 5 5600 / B550M / RTX 4060 / RAM 16GB / NV2 1TB / CV650 / gabinete airflow, Cyberpunk 2077, 4K/ultra: o serviço retorna **23 FPS, `performanceLevel: insufficient`, sem gargalo**, mas o resumo antigo dizia “Configuracao recomendada para o perfil informado.” A condição verificava `poor`, valor que o serviço de jogo não retorna. Jogo indisponível/omitido e parâmetros ausentes também podiam terminar na orientação positiva.

Correção limitada à orientação: compatibilidade/orçamento mantêm precedência; insuficiência e indisponibilidade não são recomendação positiva; ausência de jogo informa escopo; gargalo é possibilidade estimada. Fórmula de FPS intacta. `tests/final-recommendation.test.js` registra seis casos e a precedência. Controle negativo com a fonte anterior e reteste em [evidências](evidence/ra2-v2.9/README.md).

### F02 — orçamento exato marcado como ultrapassado (média, corrigida)

Ryzen 5500 / RTX 3050 e os demais componentes do cenário: frontend somava **3889.3000000000006**, backend **3889.30**. Com teto R$3.889,30, BudgetPanel mostrava “Acima” e excesso arredondado R$0,00. Corrigido o limite monetário do helper para duas casas, alinhado ao backend. Teste usa catálogo real, cooler/packs e SSR do painel: teto exato “Dentro”; um centavo abaixo “Acima” com R$0,01. Fonte em `frontend/tests/build-budget-total.test.js`.

### F03 — fixture fotográfica não satisfazia contrato (teste, corrigida)

O caso browser de metadados incompletos incluía um quarto item sem `id`. `validateCatalogResponse` rejeita corretamente toda a resposta; a expectativa de quatro fallbacks jamais seria alcançada. Os três registros de foto inválida agora têm identidades válidas; o caso sem ID foi movido para um snapshot salvo em teste separado, mantendo catálogo válido. O setup passa a validar o contrato; validade exercitada fora do navegador. **Isso não transforma o caso Playwright em executado**. Defeito de teste separado dos defeitos do aplicativo.

### F04 — tipo inválido em listas técnicas administrativas (alta, corrigida)

O cadastro aceitava `storageInterfaces: 42`; a compatibilidade distinguia dados insuficientes, mas a poda da recomendação chamava `.includes` no número e lançava TypeError. A revisão também cobriu `supportedFormFactors` em recomendações/correções. Correção e regressões específicas estão nas evidências finais; dados desconhecidos continuam sem aprovação automática.

### F05 — aliases e remoção de cooler divergentes nos upgrades (média, corrigida)

Com CPU AMD no nível superior e alias Intel aninhado em `components`, o seletor central escolhia AMD, mas sugestões/roadmap usavam Intel, alterando o total de R$4.699,30 para R$4.449,30 e produzindo conflito de socket. `cooler:null` explícito no nível superior também podia preservar cooler aninhado e cobrar R$499,90 indevidamente.

Os dois serviços agora normalizam pelo seletor/serializador central, em vez de achatar aliases por conta própria. Cinco regressões verificam conflito, roadmap, formato legado/flat/nested/build salva, acessórios e remoção explícita. Fonte anterior: três falhas de cinco; reteste final aprovado. `tests/upgrade-selection-normalization.test.js`.

Esses defeitos eram residuais na base auditada. Não se atribui sua introdução à V2 sem bissetar a história. Controles vermelhos representam a fonte anterior, não falhas abertas da árvore final. Não se promete ausência de outros defeitos.

## Testes finais e deduplicação

Resultado final: **473 testes Node distintos aprovados**, zero falhas/skips/cancelados (50 frontend já incluídos), dez scripts SSR/handlers, três jornadas/17 passos e HTTP de produção aprovados; ambos os lints e build aprovados. Resultados exatos após as correções: consultar [registro final](RA2-V2-REGISTRO-TESTES.md) e logs em `docs/evidence/ra2-v2.9/`. A primeira execução independente da fonte v2.8 teve **454/454 Node aprovados**; esse número histórico não será somado aos testes finais.

- Suíte Node raiz inclui os testes utilitários/frontend; reexecutá-los isoladamente não cria testes distintos adicionais
- Scripts SSR/handlers, três jornadas/17 passos e check HTTP de produção são grupos distintos, não somados a um número fictício de “todos os testes”
- 170 E2E controlados + 18 integração browser = **188 únicos somente coletados**, **0 passados, 0 falhas de aplicação observadas, 188 bloqueados/não executados**. Não são skips fornecidos pelo runner nem regressões comprovadas
- Auditor de imagens retorna **exit 1**, corretamente, porque cobertura obrigatória é parcial. Não reclassificar como exit 0 nem confundir com pane operacional
- Bundle de produção mantém aviso >500 kB. Lint/build aprovados não medem performance percebida

## Fotos: inventário e evidência

[Inventário atual por componente](RA2-V2.9-INVENTARIO.json) · [inventário fotográfico integral](RA2-COBERTURA-IMAGENS.md) · [JSON com hashes/dimensões/bloqueios](RA2-COBERTURA-IMAGENS.json) · [origem e direitos](RA2-V2.2-PHOTO-SOURCES.md).

| Categoria | Ativos | Foto exata verificada | Faltantes |
| --- | ---: | ---: | ---: |
| CPU | 12 | 3 | 9 |
| Placa-mãe | 9 | 0 | 9 |
| GPU | 11 | 0 | 11 |
| RAM | 21 | 0 | 21 |
| Armazenamento | 21 | 2 | 19 |
| Fonte | 8 | 0 | 8 |
| Gabinete | 7 | 0 | 7 |
| Air cooler | 3 | 2 | 1 |
| AIO | 2 | 0 | 2 |
| Fans | 4 | 2 | 2 |
| Total | 98 | 9 | 89 |

Contagem vem dos ativos reais, não de uma constante de aceite. Os nove arquivos decodificam e seus hashes coincidem com os bytes revisados; zero órfãos/grupos suspeitos duplicados. Os pixels foram revistos independentemente, assim como as fontes/licenças dos nove itens ([registro](evidence/ra2-v2.9/image-review.md)). Isso prova integridade e sustenta correspondência documentada, sem substituir foto por fallback ou representar outro SKU. Cada um dos 89 bloqueios permanece individualizado; direitos e identidade incompletos exigem ativos/autorização válidos. Permissão Noctua é revogável e deve ser reavaliada antes de novas redistribuições.

## UX, acessibilidade e evidência visual

Fonte/SSR revisados: hierarquia semântica inicial, títulos, landmarks, cinco entradas de navegação e grupos, cards compartilhados, imagens `contain`/fallback/créditos, unidades/tabelas dos gráficos, loading/vazio/erro e controles nativos. Os 32 pares opacos de tokens passam o cálculo de contraste; não cobre composição real, transparência/gradiente, hover/disabled, fotos ou foco.

Catálogo/detalhes/assistente/comparação, cooler/fans, resumo/sidebar/revisão, troca/correções, recomendação/prontas, salvas/compartilhadas, comparação de builds, upgrades/roadmap, feedback/ranking/compra/admin usam o caminho compartilhado de mídia. Integração de fonte não prova que cada estado está visualmente correto.

**1440, 1024, 768, 390 e 320 px: execução visual BLOQUEADA, zero capturas atuais.** O responsável informou ter encontrado problemas de UI/UX, sem casos detalhados disponíveis nesta auditoria; o relato permanece uma pendência de reprodução, não foi descartado pela suíte verde. Nenhuma aprovação de overflow, alinhamento, legibilidade composta, foco DOM, rolagem, teclado assistivo, toque, back/forward ou leitor de tela. O roteiro `frontend/scripts/qa-visual.mjs` e casos Playwright ficam disponíveis para execução autorizada. Capturas históricas de 07/10 continuam históricas; não foram reapresentadas como evidência da árvore final.

As três jornadas foram reexecutadas como contratos técnicos com adaptadores frontend → HTTP Express real → repositórios em memória. **Não houve três usuários**, teste de usabilidade ou aceitação de persona. [Relatório histórico das jornadas](RA2-V2.8-JORNADAS.md), [registro reexecutado](evidence/ra2-v2.9/journeys.json).

## Riscos residuais e dependências externas

1. Obter os 89 ativos fotográficos exatos/licenciados e identidades SKU/revisão faltantes; conferir pixels/direitos/hashes e executar auditor até cobertura obrigatória integral
2. Executar os 188 casos e inspeção de todas as telas/estados nas cinco larguras em ambiente autorizado funcional; corrigir falhas descobertas e registrar screenshots reais
3. Completar dados de encaixe/posição/RAM/VRM/headers/corrente/hubs/térmica; não promover `unverified` a sucesso por conveniência
4. Selecionar e autorizar provedor comercial, revisar termos/acesso/SKU/cache e receber resposta real; nenhum credential, contrato ou loja foi inventado/ativado
5. Realizar pesquisa consentida de clareza/valor/“simulação final”, com denominadores e acompanhamento. Retenção, intenção e receita são medidas distintas; nenhuma foi fabricada
6. Persistência em memória é global; sem durabilidade/isolamento/multiusuário. Não publicar dados pessoais em instância pública sem arquitetura apropriada
7. Catálogo legado, BIOS/QVL e desempenho não certificados; regras CRUD documentais; bundle grande; sem avaliação completa de carga/segurança/produção
8. Snapshots antigos podem preservar metadados de apresentação desatualizados; backend reanalisa catálogo atual. Persistência local não é cotação nem sincronização entre dispositivos

## Cadeia de commits e publicação

| Etapa | Commit publicado antes desta auditoria |
| --- | --- |
| Origem | `d433bf930d7373eec073921427e146bc8c173f26` |
| v2.0 diagnóstico | `341691e5c7d3b7d1e59c7783df67c340c51b7f1e` |
| v2.1 catálogo/refrigeração | `f29ac4b05d2633e924c2b75571dd5077b8332667` |
| v2.2 fotos (parcial) | `145c79d48e5b16ce0f09b5f20d446079215755f4` |
| v2.3 filtros/comparação | `e954768481db27e7354242718400e0043f6eb66f` |
| v2.4 troca individual | `4f7690d531e0bcecf0748961f2eda0145c694db7` |
| v2.5 UI/simulações | `e939718fe9fbe78d199e2cdc60511b5c07e33300` |
| v2.6 transparência comercial | `0dd5473470ce218b4f6499d7f909fa3e459c86ca` |
| v2.7 qualidade | `b463f1768b1f72647bd06c1bc4ba82a90a3799f0` |
| v2.8 jornadas | `5de7d88c906b2b66c63a4bc69e115045e012bf0d` |
| v2.9 auditoria final | Commit que contém este relatório; SHA final fornecido na resposta de publicação após conferência remota |

O SHA de um commit não pode ser gravado como seu próprio conteúdo. `checkedSourceCommit` identifica corretamente a fonte de entrada; logs/testes desta etapa incluem as correções presentes no commit do relatório. Publicação autorizada somente nesta branch, com lease do HEAD esperado e conferência de SHA/árvore remotos. Não há `.github/workflows` versionado; ausência de checks/runs não significa CI verde. A resposta de publicação deve registrar a consulta ao SHA final.

## Feito / não feito / pendências

**Feito:** sequência documentada, diagnóstico independente, correções residuais com regressão, reexecução viável, inventários atuais, matriz final, registro de testes, README/API/changelog alinhados e publicação na branch autorizada após verificações.

**Não feito:** fotos 100%, browser/E2E/capturas atuais, aprovação humana/visual, cotações reais, certificação física, persistência durável/produção, retenção/receita, merge e deploy.

**Pendente:** dependências acima e revisão do responsável. **NÃO HOMOLOGADA**, sem aprovação automática e sem merge. Os testes aprovados sustentam continuidade de desenvolvimento; não substituem os requisitos obrigatórios incompletos.
