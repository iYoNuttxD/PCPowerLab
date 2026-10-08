# PCPowerLab Frontend

> Estado final RA2 V2.9: **NÃO HOMOLOGADA**. [Relatório](../docs/RA2-V2-RELATORIO-FINAL.md) e [registro de testes](../docs/RA2-V2-REGISTRO-TESTES.md). SSR/handlers não substituem navegador.

Interface web do PCPowerLab, criada com Vite + React para consumir a API REST local do projeto.

## Tecnologias

- Vite
- React
- React Router
- Fetch centralizado
- Lucide React
- Recharts
- CSS global modularizado por tema

## Pré-requisitos

- Node.js 22.12 ou superior
- Backend do PCPowerLab rodando em `http://localhost:3000/api/v1`

## Instalação

```bash
cd frontend
npm install
cp .env.example .env
```

## Configuração

```env
VITE_API_BASE_URL=/api/v1
```

## Rodar em desenvolvimento

```bash
npm run dev
```

A interface ficará disponível, por padrão, em:

```http
http://localhost:5173
```

## Build de produção

```bash
npm run build
npm run preview
```

## Testes de interface

Os testes E2E usam Playwright em desktop e celular. As respostas da API são controladas pelos testes, sem depender do backend nem gravar dados nele. O servidor Vite de teste inicia automaticamente na porta 4173, que deve estar livre.

```bash
cd frontend # a partir da raiz do repositório
npm ci
npx playwright install chromium
npm test
npm run lint
```

Para usar uma instalação local do Google Chrome: `PLAYWRIGHT_CHANNEL=chrome npm test` (PowerShell: `$env:PLAYWRIGHT_CHANNEL='chrome'; npm test`). Falhas geram screenshot e trace em `test-results/`, ignorado pelo Git. Não há retries automáticos.

A suíte cobre avanço e retorno, bloqueios e validação, substituição sem perda de peças, persistência da etapa, navegação entre páginas, foco e rolagem com movimento reduzido, falhas de API, respostas tardias e aplicação/salvamento de recomendações. Os testes de regras técnicas do backend continuam na raiz: `npm test`.

Também inclui `tests/e2e/performance-lab.spec.js`: simulação de um jogo, comparação de 2 a 10 jogos, contratos das APIs, classificações e requisitos, carregamento, parâmetros ausentes, recuperação de erros, respostas tardias, navegação por teclado e explicações dos painéis técnicos. Veja as decisões e evidências em [RA2 — Análises e simulação de jogos](../docs/RA2-CICLO2-ANALISES.md).

`tests/e2e/catalog.spec.js` cobre filtros combinados, comparação de peças, imagens e fallbacks, preços estimados e substituição no resumo com prévia da API, incompatibilidade, orçamento excedido, falhas, respostas tardias e preservação da montagem. O mesmo comando executa todas as suítes em desktop e celular. Diagnóstico, fontes dos dados, implementação e limites estão em [RA2 — Catálogo e substituição de peças](../docs/RA2-CICLO2-CATALOGO.md).

## Validação integrada do Ciclo 2

`tests/e2e/qa-regressions.spec.js` acrescenta cenários de respostas atrasadas, invalidação de estimativas, recuperação de builds após carregar o catálogo, falhas sem rejeições não tratadas, comparação coerente e nova tentativa de recomendação sem alterar o orçamento.

A suíte abaixo usa o **frontend compilado e a API Express real**, sem interceptar os endpoints, nas resoluções 1440×900, 768×1024 e 390×844:

```bash
# A partir da raiz; dependências da raiz e do frontend devem estar instaladas.
PLAYWRIGHT_CHANNEL=chrome npm run test:integration --prefix frontend
```

Sem Chrome local, remova `PLAYWRIGHT_CHANNEL=chrome` e instale o Chromium do Playwright. A porta 3187 deve estar livre: o teste recusa reutilizar um servidor existente. O backend de teste mantém seus próprios dados em memória, usa senha administrativa aleatória temporária e encerra ao terminar. Não utiliza a senha administrativa do desenvolvedor. Traces ficam desativados nesta suíte para não registrar credenciais; capturas e anexos ficam em `frontend/integration-test-results/`, ignorado pelo Git. Não há retries.

Os cinco cenários percorrem montagem manual, orçamento, compatibilidade, salvamento/recuperação, comparação, lojas, recomendações, substituição, simulações de jogos/software, upgrades, catálogo, navegação e autenticação/administração. As asserções verificam resultados e invariantes, incluindo a preservação das outras seis peças e a diferença de FPS estimado ao aumentar a resolução.

Auditoria visual e axe opcional, após compilar o frontend, com uma cópia local de `axe-core` (validada com 4.14.0):

```bash
PCPOWERLAB_AXE_PATH=/caminho/axe-core/axe.min.js PLAYWRIGHT_CHANNEL=chrome node frontend/scripts/qa-visual.mjs
```

O script inicia outro backend isolado em porta temporária, verifica 48 estados/resoluções e grava capturas e `visual-a11y.json` em `frontend/audit-test-results/`. `PCPOWERLAB_QA_OUTPUT` permite escolher outra pasta, relativa à raiz. Itens de contraste `incomplete` precisam de inspeção complementar; ausência de violações automáticas não certifica acessibilidade.

Parecer, achados corrigidos, evidências e roteiro com participantes: [Revisão e validação do Ciclo 2](../docs/RA2-CICLO2-REVISAO-E-VALIDACAO.md).

## Estrutura

```text
src/
  App.jsx
  main.jsx
  components/
    build/
    charts/
    compatibility/
    componentsCatalog/
    layout/
    recommendations/
    ui/
  hooks/
  pages/
  services/
  styles/
  utils/
```

## Camada de API

Todas as chamadas HTTP passam por `src/services/api.js`, que usa:

```env
VITE_API_BASE_URL=/api/v1
```

Se a variável não estiver configurada, o fallback é `/api/v1`. O proxy do Vite
encaminha essas chamadas ao backend local durante o desenvolvimento.

Services disponíveis para os endpoints atuais e novos:

- `componentsService`, incluindo ranking de custo-benefício.
- `compatibilityService` e `compatibilityFixService`.
- `performanceService`, `professionalSoftwareService` e `gameComparisonService`.
- `budgetService`, `recommendationService` e `buildRecommendationService`.
- `buildSummaryService`, `buildComparisonService`, `buildScoreService`, `buildReportService` e `buildExportService`.
- `savedBuildsService`, `savedBuildVersionsService`, `readyBuildsService` e `analysisHistoryService`.
- `usageProfilesService`, `notificationsService`, `recommendationFeedbackService`.
- `upgradeService`, `upgradeRoadmapService`.
- `purchaseLinksService`, `sharingService`/`shareService`, `explanationService` e `adminService`.

As telas atuais já consomem visualmente os endpoints das Sprints 4, 5 e 6 para builds prontas, análises avançadas, softwares profissionais, comparação entre jogos, ranking de custo-benefício, perfis personalizados, versões, histórico, notificações, feedback e roadmap de upgrades.

## Telas implementadas

- `/` Home retro-arcade com CTAs.
- `/components` catálogo com busca, filtros por categoria/marca/preço estimado, imagens opcionais, comparação de peças e links de busca em lojas.
- `/build` wizard completo de montagem.
- `/summary` resumo final com substituição de peças verificada pela API, compatibilidade, gargalos, simulação, orçamento, nota geral, relatório técnico, exportação JSON, sugestões de correção, salvamento e compartilhamento.
- `/performance-lab` simulação de um jogo, comparação entre jogos e simulação em softwares profissionais.
- `/compare` comparação de builds.
- `/insights` ranking de custo-benefício e CRUD de perfis personalizados de uso.
- `/ready-builds` consulta de builds prontas e recomendação de builds completas por faixa de orçamento.
- `/saved-builds` listagem, edição, remoção, compartilhamento, versões, histórico, revalidação, notificações e feedback de recomendação.
- `/upgrades` sugestões de upgrade e roadmap de upgrades em etapas por build atual ou salva.
- `/shared/:shareId` visualização somente leitura.
- `/admin` administração simples de regras e parâmetros.
- `/about` contexto do projeto.

## Endpoints consumidos nas telas novas

- Builds prontas: `GET /ready-builds`, `GET /ready-builds/:id`.
- Recomendação por faixa: `POST /recommendations/builds-by-budget-range`.
- Nota geral: `POST /build-score`.
- Correções de compatibilidade: `POST /compatibility/fix-suggestions`.
- Relatório técnico: `POST /build-report`.
- Exportação JSON: `POST /build-export/json`.
- Softwares profissionais: `GET /professional-software`, `POST /performance/simulate-software`.
- Comparação entre jogos: `GET /performance/games`, `POST /performance/compare-games`.
- Ranking de custo-benefício: `GET /components/cost-benefit`.
- Perfis personalizados: `GET/POST/PUT/DELETE /usage-profiles`.
- Versões de builds: `GET/POST/DELETE /saved-builds/:id/versions`.
- Histórico: `GET/DELETE /analysis-history`.
- Revalidação e notificações: `POST /saved-builds/revalidate`, `POST /saved-builds/:id/revalidate`, `GET/PATCH/DELETE /notifications`.
- Feedback: `POST /recommendation-feedback`.
- Roadmap: `POST /upgrades/roadmap`.

## Segurança e robustez

- Não usa `dangerouslySetInnerHTML`.
- Trata erros padronizados da API.
- Exibe estados de loading, vazio e erro.
- Usa `target="_blank"` com `rel="noopener noreferrer"` em links externos.
- Valida campos básicos antes de chamar a API.
- Guarda apenas progresso temporário da build no `localStorage`.

## Observações

O frontend não recria regras do backend. Compatibilidade, gargalos, recomendações, simulações, orçamento, resumo final e upgrades são consumidos da API. Se a API estiver offline, a interface mostra mensagem amigável e permite tentar novamente.

Payloads importantes usados pela interface:

- Orçamento: `POST /budget` recebe `{ "amount": 5000, "currency": "BRL", "priority": "cost-benefit" }`, sem wrapper `budget`.
- Compatibilidade e gargalos usam payload plano com IDs: `{ "cpuId": "...", "gpuId": "...", "motherboardId": "...", "ramId": "...", "storageId": "...", "psuId": "...", "caseId": "..." }`.
- Links por build usam `{ "components": { "cpuId": "...", "gpuId": "...", "...": "..." } }`.
- Simulação de jogo usa `POST /performance/simulate-game` com `gameId`, `targetResolution`, `qualityPreset` e `build`.
- Simulação profissional usa `POST /performance/simulate-software` com `softwareId` e `build`.
- Comparação entre jogos usa `POST /performance/compare-games` com `gameIds`, resolução, qualidade e `build`.
- Roadmap de upgrades usa `POST /upgrades/roadmap` com `build`, `totalBudget`, `maxSteps`, `usageType` e `priority`.
- Perfis personalizados aceitam pesos de `cpu`, `gpu`, `ram`, `storage` e `costBenefit`; a UI alerta quando a soma visual não fecha 100%.

`GET /performance/games` pode responder `304 Not Modified` dependendo do cache. A camada `api.js` envia cabeçalhos de no-cache para GETs e a tela de resumo mantém fallback visual controlado caso a lista de jogos venha vazia.

As principais chaves internas retornadas pela API, como `cpu_bottleneck`, `within_budget`, `high`, `gaming`, `motherboard`, `psu` e `storage`, são traduzidas no frontend antes de aparecerem para o usuário.

## Fluxo de compatibilidade e gargalos

A análise principal segue esta ordem:

1. `POST /compatibility/check`
2. `POST /compatibility/alerts`
3. `POST /budget`
4. `POST /bottlenecks/analyze`, somente quando a build estiver compatível e sem alertas críticos.

Quando a build é incompatível, o painel de gargalos fica indisponível e orienta o usuário a corrigir a compatibilidade antes de analisar desempenho. Quando `/bottlenecks/analyze` retorna `400` por parâmetros insuficientes, a UI trata como estado controlado e mostra a mensagem do backend. O cadastro de parâmetros continua disponível ao administrador pelo acesso direto a `/admin`, protegido no backend.

Para testar rapidamente:

- Socket incompatível: Ryzen 5 5600 + H610M DDR4 deve exibir alerta de socket e gargalos indisponíveis.
- RAM incompatível: i5-12400F + H610M DDR4 + Corsair DDR5 deve exibir alerta de memória e gargalos indisponíveis.
- Build compatível: Ryzen 5 5600 + B550M + RTX 4060 + Kingston DDR4 + NV2 + Corsair 650W + gabinete airflow deve liberar gargalos ou exibir dados de desempenho insuficientes.
- Backend desligado: a UI deve exibir falha de conexão, não erro técnico cru.

## Revisão pós-Sprints 4, 5 e 6

Pontos verificados:

- Chamadas HTTP permanecem centralizadas em `src/services`.
- `api.js` diferencia erro de rede de erros controlados do backend.
- Telas novas validam arrays e objetos antes de renderizar listas.
- Modais de relatório, exportação, versões e histórico usam JSON formatado apenas em contexto técnico.
- Termos internos como `storage`, `gaming`, `cost-benefit`, `unknown`, `high` e `low` são traduzidos antes de aparecerem em áreas de usuário.

Limitações atuais:

- `/admin` exige a senha definida em `ADMIN_PASSWORD` no `.env` do backend. A sessão
  é temporária e as APIs administrativas são verificadas pelo backend.
- Os dados são mockados em memória e reiniciam com o backend.
- O build do Vite pode emitir aviso de chunk grande; isso não impede execução, mas code splitting é recomendado para evolução.

## Próximos passos

- Melhorar code splitting conforme o app crescer.
- Evoluir gráficos e comparação visual.
- Ampliar a cobertura automatizada conforme novos fluxos forem implementados.

## Auditoria v2.5 sem navegador

A auditoria e as limitações estão em [RA2 V2.5](../docs/RA2-V2.5-AUDITORIA-UX.md). Além de `npm test` na raiz, estes checks executam React SSR e handlers isolados, sem provar layout, foco ou interação de browser:

```bash
node frontend/scripts/check-page-audit.mjs
node frontend/scripts/check-chart-render.mjs
node frontend/scripts/check-navigation-wizard.mjs
node frontend/scripts/check-simulation-states.mjs
```

Os caminhos acima são relativos à raiz. `scripts/qa-visual.mjs` prepara captura de todas as telas em 1440, 1024, 768, 390 e 320 px; exige build, Chromium autorizado e `PCPOWERLAB_AXE_PATH`. Não foi executado nesta etapa por bloqueios do ambiente. Casos Playwright coletados não contam como casos executados.

## Estado final v2.9 e limites de validação

`npm test` na raiz inclui os testes Node frontend, inclusive o total em centavos e renderização SSR do orçamento exato. `npm test` dentro de frontend usa Playwright: na auditoria final houve somente coleta, não execução. O caso de foto inválida agora usa registros com IDs válidos; snapshot sem ID tem cenário separado.

As telas compartilham catálogo/identidade/mídia, troca individual e estado da montagem. Mudanças invalidam análises, e respostas antigas são descartadas. Upgrade aberto de uma build salva transporta `buildId`; erro/ausência não muda silenciosamente para a montagem global.

Os dez scripts `scripts/check-*.mjs` exercitam SSR/handlers e condições assíncronas controladas. A API real é coberta na raiz por `scripts/check-profile-journeys.mjs` e `scripts/check-quality-production.mjs`; nenhum desses executa React DOM. Larguras 1440/1024/768/390/320, teclado/foco/rolagem reais, axe e screenshots ficam pendentes em ambiente autorizado.

Fotos: 9/98, com crédito/licença e fallback explícito para 89 produtos. Referências de preço não são cotações; simulações não são benchmarks. Leituras/regravações de estado feitas por helpers não provam reload real, múltiplas abas ou persistência após reinício do backend.
