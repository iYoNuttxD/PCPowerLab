# PCPowerLab

PCPowerLab é uma API em Node.js/Express para apoiar a montagem de computadores personalizados. O MVP ajuda o usuário a consultar peças, montar builds, validar compatibilidade, analisar gargalos, simular desempenho, controlar orçamento, receber recomendações, salvar configurações, comparar builds, sugerir upgrades, compartilhar configurações e consultar links mockados de compra.

O repositório também possui um frontend React em `frontend/`, com tema retro-arcade/tech gamer e integração com a API local.

## Objetivo

Reduzir o risco de escolha de peças incompatíveis e dar uma visão técnica simples sobre custo, desempenho e equilíbrio da configuração antes da compra.

## Tecnologias

- Node.js com ES Modules
- Express
- dotenv
- helmet
- cors
- morgan
- Node Test Runner
- ESLint

## Pré-requisitos

- Node.js 18 ou superior
- npm

## Instalação

```bash
npm install
cp .env.example .env
```

## Ambiente

Variáveis disponíveis:

```env
PORT=3000
NODE_ENV=development
API_PREFIX=/api/v1
```

`PORT` define a porta local, `NODE_ENV` define o ambiente e `API_PREFIX` define o prefixo das rotas. O arquivo `.env` não deve ser versionado.

## Execução

```bash
npm run dev
```

A API ficará disponível em:

```http
http://localhost:3000/api/v1
```

Para produção/local sem watch:

```bash
npm start
```

## Rodar backend e frontend

Em um terminal, inicie o backend:

```bash
npm install
npm run dev
```

Em outro terminal, inicie o frontend:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Portas padrão:

- Backend: `http://localhost:3000/api/v1`
- Frontend: `http://localhost:5173`

Build do frontend:

```bash
cd frontend
npm run build
```

Telas principais do frontend:

- `/components`, `/build`, `/summary`, `/compare`, `/saved-builds`, `/upgrades`.
- `/ready-builds` para builds prontas e recomendação por faixa de orçamento.
- `/performance-lab` para softwares profissionais e comparação entre jogos.
- `/insights` para ranking de custo-benefício e perfis personalizados.
- `/admin`, `/shared/:shareId` e `/about`.

## Testes e lint

```bash
npm test
npm run lint
```

## Estrutura

```text
src/
  app.js
  server.js
  config/
  controllers/
  data/
  middlewares/
  models/
  routes/
  services/
  utils/
tests/
docs/
```

Fluxo padrão:

```text
routes -> controllers -> services -> data/repositories/utils
```

Rotas apenas definem endpoints, controllers recebem a requisição e retornam resposta, services concentram regra de negócio, `data` mantém mocks em memória, `models` concentram estruturas/validações simples e `utils` guardam funções auxiliares reutilizáveis.

## Padrão de resposta

Sucesso:

```json
{
  "success": true,
  "message": "Mensagem clara em português.",
  "data": {}
}
```

Erro:

```json
{
  "success": false,
  "message": "Mensagem clara do erro.",
  "errors": []
}
```

## Principais endpoints

### Saúde

```http
GET /api/v1/health
```

### Componentes

```http
GET /api/v1/components
GET /api/v1/components?type=cpu
GET /api/v1/components/:id
GET /api/v1/components/cost-benefit
```

Rotas administrativas mockadas:

```http
GET    /api/v1/admin/components
GET    /api/v1/admin/components/:id
POST   /api/v1/admin/components
PUT    /api/v1/admin/components/:id
DELETE /api/v1/admin/components/:id
```

### Builds e compatibilidade

```http
POST /api/v1/builds/selection
POST /api/v1/builds/check-compatibility
POST /api/v1/compatibility/check
POST /api/v1/compatibility/alerts
POST /api/v1/compatibility/fix-suggestions
```

`/api/v1/builds/check-compatibility` foi mantida por compatibilidade. Para novos consumidores, prefira `/api/v1/compatibility/check`.

Exemplo:

```json
{
  "components": {
    "cpu": "cpu-ryzen-5-5600",
    "motherboard": "mb-b550m-aorus-elite",
    "gpu": "gpu-rtx-4060",
    "ram": "ram-kingston-fury-16gb-ddr4",
    "storage": "ssd-kingston-nv2-1tb",
    "psu": "psu-corsair-650w",
    "case": "case-mid-tower-airflow"
  }
}
```

Também são aceitos campos planos como `cpuId`, `motherboardId`, `gpuId`, `ramId`, `storageId`, `psuId` e `caseId`.

### Regras de compatibilidade

```http
GET    /api/v1/compatibility-rules
POST   /api/v1/compatibility-rules
PUT    /api/v1/compatibility-rules/:id
DELETE /api/v1/compatibility-rules/:id
```

Exemplo de cadastro:

```json
{
  "name": "CPU socket must match motherboard socket",
  "sourceType": "cpu",
  "targetType": "motherboard",
  "field": "socket",
  "targetField": "socket",
  "operator": "equals",
  "severity": "high",
  "message": "O socket do processador deve ser compatível com o socket da placa-mãe."
}
```

### Parâmetros de desempenho

```http
GET    /api/v1/performance-parameters
GET    /api/v1/performance-parameters/:componentId
POST   /api/v1/performance-parameters
PUT    /api/v1/performance-parameters/:componentId
DELETE /api/v1/performance-parameters/:componentId
```

### Gargalos, jogos e softwares profissionais

```http
POST /api/v1/bottlenecks/analyze
GET  /api/v1/performance/games
GET  /api/v1/performance/games/:id
POST /api/v1/performance/simulate-game
POST /api/v1/performance/compare-games
GET  /api/v1/professional-software
GET  /api/v1/professional-software/:id
POST /api/v1/performance/simulate-software
```

Exemplo de simulação:

```json
{
  "gameId": "game-cyberpunk-2077",
  "targetResolution": "1080p",
  "qualityPreset": "high",
  "build": {
    "cpuId": "cpu-ryzen-5-5600",
    "gpuId": "gpu-rtx-4060",
    "ramId": "ram-kingston-fury-16gb-ddr4",
    "storageId": "ssd-kingston-nv2-1tb"
  }
}
```

Exemplo de simulacao em software profissional:

```json
{
  "softwareId": "software-adobe-premiere-pro",
  "build": {
    "cpuId": "cpu-ryzen-7-5700x",
    "gpuId": "gpu-rtx-4060",
    "ramId": "ram-kingston-fury-32gb-ddr4",
    "storageId": "ssd-samsung-980-pro-2tb"
  }
}
```

Os softwares profissionais usam uma base mockada com requisitos estimados por scores internos. Os resultados sao simplificados para fins academicos e nao substituem benchmarks reais.

### Orçamento, recomendações e explicações

```http
POST /api/v1/budget
POST /api/v1/recommendations/budget
POST /api/v1/recommendations/by-usage
POST /api/v1/recommendations/builds-by-budget-range
POST /api/v1/explanations
GET    /api/v1/usage-profiles
GET    /api/v1/usage-profiles/:id
POST   /api/v1/usage-profiles
PUT    /api/v1/usage-profiles/:id
DELETE /api/v1/usage-profiles/:id
```

Exemplo de recomendação por orçamento:

```json
{
  "budget": {
    "amount": 5000,
    "currency": "BRL",
    "priority": "cost-benefit"
  },
  "usageType": "gaming"
}
```

Exemplo de perfil personalizado de uso:

```json
{
  "name": "Jogos + Streaming",
  "description": "Perfil voltado para jogar e transmitir ao vivo com boa estabilidade.",
  "weights": {
    "cpu": 30,
    "gpu": 35,
    "ram": 20,
    "storage": 10,
    "costBenefit": 5
  },
  "recommendedMinimums": {
    "ramGb": 16,
    "storageType": "SSD",
    "gpuVramGb": 8
  }
}
```

Os pesos dos perfis personalizados sao normalizados automaticamente quando a soma informada for diferente de 100.

### Resumo, comparação e upgrades

```http
POST /api/v1/build-summary
POST /api/v1/build-comparison
POST /api/v1/build-score
POST /api/v1/build-report
POST /api/v1/build-export/json
POST /api/v1/upgrades/suggest
POST /api/v1/upgrades/roadmap
```

Exemplo de nota geral da configuração:

```json
{
  "build": {
    "cpuId": "cpu-ryzen-5-5600",
    "motherboardId": "mb-b550m-aorus-elite",
    "gpuId": "gpu-rtx-4060",
    "ramId": "ram-kingston-fury-16gb-ddr4",
    "storageId": "ssd-kingston-nv2-1tb",
    "psuId": "psu-corsair-650w",
    "caseId": "case-mid-tower-airflow"
  },
  "budget": {
    "amount": 5000,
    "currency": "BRL"
  },
  "usageType": "gaming"
}
```

Exemplo de sugestão de upgrade:

```json
{
  "build": {
    "cpuId": "cpu-ryzen-5-5600",
    "motherboardId": "mb-b550m-aorus-elite",
    "gpuId": "gpu-rtx-4060",
    "ramId": "ram-kingston-fury-16gb-ddr4",
    "storageId": "ssd-kingston-nv2-1tb",
    "psuId": "psu-corsair-650w",
    "caseId": "case-mid-tower-airflow"
  },
  "budget": {
    "amount": 1500,
    "currency": "BRL"
  },
  "usageType": "gaming",
  "priority": "cost-benefit"
}
```

Também é possível enviar `buildId` quando a configuração estiver salva.

### Builds salvas

```http
GET    /api/v1/saved-builds
GET    /api/v1/saved-builds/:id
GET    /api/v1/saved-builds/:id/export/json
POST   /api/v1/saved-builds
PUT    /api/v1/saved-builds/:id
PATCH  /api/v1/saved-builds/:id
GET    /api/v1/saved-builds/:id/versions
GET    /api/v1/saved-builds/:id/versions/:versionId
POST   /api/v1/saved-builds/:id/versions
DELETE /api/v1/saved-builds/:id/versions/:versionId
POST   /api/v1/saved-builds/revalidate
POST   /api/v1/saved-builds/:id/revalidate
DELETE /api/v1/saved-builds/:id
GET    /api/v1/notifications
GET    /api/v1/notifications?buildId=build-001
PATCH  /api/v1/notifications/:id/read
DELETE /api/v1/notifications/:id
```

As rotas de revalidação verificam novamente a compatibilidade das configurações salvas e registram notificações quando uma build passar a apresentar incompatibilidades após mudanças na base técnica.

### Configurações prontas, histórico e feedback

```http
GET    /api/v1/ready-builds
GET    /api/v1/ready-builds/:id
GET    /api/v1/ready-builds?profile=gaming
GET    /api/v1/analysis-history
GET    /api/v1/analysis-history/:id
GET    /api/v1/analysis-history?buildId=build-001
POST   /api/v1/analysis-history
DELETE /api/v1/analysis-history/:id
GET    /api/v1/recommendation-feedback
GET    /api/v1/recommendation-feedback/:id
GET    /api/v1/recommendation-feedback?recommendationType=upgrade-suggestion
POST   /api/v1/recommendation-feedback
DELETE /api/v1/recommendation-feedback/:id
```

### Compartilhamento e links de compra

```http
POST /api/v1/share/build
GET  /api/v1/share/build/:shareId
GET  /api/v1/purchase-links/:componentId
POST /api/v1/purchase-links/by-build
```

## Dados mockados

A aplicação atual é uma API backend com dados em memória. Os mocks ficam em `src/data` e cobrem componentes, regras de compatibilidade, parâmetros de desempenho, jogos, builds salvas, compartilhamentos e links de compra.

Base mockada atual:

- 63 componentes: 12 CPUs, 9 placas-mãe, 11 GPUs, 8 memórias RAM, 8 armazenamentos, 8 fontes e 7 gabinetes.
- 63 registros de parâmetros de desempenho, cobrindo os componentes principais usados em gargalos, simulações, recomendações e comparação.
- 20 jogos reais para simulação estimada, incluindo competitivos, battle royale, RPGs, mundo aberto, corrida, simuladores e jogos AAA pesados.
- 315 links de busca em lojas externas: Kabum, Pichau, Terabyte, Amazon Brasil e Mercado Livre.

Os jogos da simulação usam requisitos simplificados e scores estimados para fins acadêmicos. Eles não representam requisitos oficiais nem garantem FPS real; o desempenho pode variar conforme drivers, sistema operacional, configurações gráficas, resolução, temperatura e otimização de cada jogo.

Os links de compra são URLs reais de busca em lojas brasileiras, geradas a partir do nome dos componentes. Eles não apontam para produto específico, não são afiliados e não usam scraping/API externa. Os preços retornados continuam sendo estimativas baseadas no mock de componentes, e a disponibilidade fica como `unknown`; o usuário deve confirmar valor e estoque diretamente na loja.

Os dados são reiniciados a cada execução do processo. Não há banco de dados real, autenticação ou integração com lojas reais nesta versão. O frontend em `frontend/` consome esses dados mockados pela API local.

## Contribuição

1. Crie uma branch a partir da branch principal.
2. Siga o fluxo `routes -> controllers -> services -> data/repositories/utils`.
3. Mantenha mensagens de usuário em português claro.
4. Rode `npm test` e `npm run lint` antes do Pull Request.
5. Atualize `README.md` e `docs/API.md` quando alterar rotas ou contratos.

## Branches e commits

Padrão sugerido de branch:

```text
feature/US-XX-nome-da-tarefa
fix/descricao-curta
docs/descricao-curta
refactor/descricao-curta
```

Padrão básico de commits:

```text
feat: adiciona nova funcionalidade
fix: corrige comportamento incorreto
docs: atualiza documentação
test: adiciona ou ajusta testes
refactor: melhora estrutura sem alterar comportamento
chore: manutenção de configuração
```

Mais detalhes em [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md).
