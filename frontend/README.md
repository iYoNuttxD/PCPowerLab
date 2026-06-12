# PCPowerLab Frontend

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

- Node.js 18 ou superior
- Backend do PCPowerLab rodando em `http://localhost:3000/api/v1`

## Instalação

```bash
cd frontend
npm install
cp .env.example .env
```

## Configuração

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
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
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

Se a variável não estiver configurada, o fallback é `http://localhost:3000/api/v1`.

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
- `/components` catálogo de componentes com busca, filtros e links de compra.
- `/build` wizard completo de montagem.
- `/summary` resumo final com compatibilidade, gargalos, simulação, orçamento, nota geral, relatório técnico, exportação JSON, sugestões de correção, salvamento e compartilhamento.
- `/performance-lab` simulação em softwares profissionais e comparação de desempenho entre jogos.
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

Quando a build é incompatível, o painel de gargalos fica indisponível e orienta o usuário a corrigir a compatibilidade antes de analisar desempenho. Quando `/bottlenecks/analyze` retorna `400` por parâmetros insuficientes, a UI trata como estado controlado, mostra a mensagem do backend e direciona para `/admin` para cadastro dos parâmetros de desempenho.

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

- Ainda não há autenticação; `/admin` e CRUDs auxiliares são apenas para MVP acadêmico.
- Os dados são mockados em memória e reiniciam com o backend.
- O build do Vite pode emitir aviso de chunk grande; isso não impede execução, mas code splitting é recomendado para evolução.

## Próximos passos

- Adicionar autenticação real na área administrativa.
- Melhorar code splitting conforme o app crescer.
- Evoluir gráficos e comparação visual.
- Adicionar testes automatizados de interface.
