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

## Telas implementadas

- `/` Home retro-arcade com CTAs.
- `/components` catálogo de componentes com busca, filtros e links de compra.
- `/build` wizard completo de montagem.
- `/summary` resumo final com compatibilidade, gargalos, simulação, orçamento, salvamento e compartilhamento.
- `/compare` comparação de builds.
- `/saved-builds` listagem, edição, remoção, compartilhamento e abertura no wizard.
- `/upgrades` sugestões de upgrade por build atual ou salva.
- `/shared/:shareId` visualização somente leitura.
- `/admin` administração simples de regras e parâmetros.
- `/about` contexto do projeto.

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

## Próximos passos

- Adicionar autenticação real na área administrativa.
- Melhorar code splitting conforme o app crescer.
- Evoluir gráficos e comparação visual.
- Adicionar testes automatizados de interface.
