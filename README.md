# PCPowerLab

PCPowerLab é uma plataforma web para apoiar a montagem de computadores personalizados. O objetivo do MVP é permitir que o usuário selecione componentes, consulte uma base inicial de hardware, verifique compatibilidade entre peças e receba alertas claros antes da compra.

## Objetivo do commit inicial

Este repositório já vem com uma base em JavaScript/Node.js para que a equipe continue o desenvolvimento seguindo o mesmo padrão de organização.

O projeto foi estruturado para separar responsabilidades:

- `routes`: definição das rotas da API;
- `controllers`: recebem a requisição e retornam a resposta;
- `services`: regras de negócio;
- `models`: estruturas e validações simples dos dados;
- `data`: base mockada inicial para desenvolvimento;
- `middlewares`: tratamento de erro e rotas não encontradas;
- `utils`: funções auxiliares.

## Funcionalidades base incluídas

- Health check da API;
- Consulta de componentes disponíveis;
- Filtro de componentes por categoria;
- Seleção de componentes principais de um computador;
- Verificação inicial de compatibilidade entre componentes;
- Exibição de alertas de incompatibilidade;
- Base mockada de componentes;
- Base mockada de regras de compatibilidade;
- Testes iniciais da regra de compatibilidade.

## Como rodar o projeto

```bash
npm install
cp .env.example .env
npm run dev
```

A API ficará disponível em:

```bash
http://localhost:3000/api/v1
```

## Rotas iniciais

### Status da API

```http
GET /api/v1/health
```

### Listar componentes

```http
GET /api/v1/components
```

### Listar componentes por categoria

```http
GET /api/v1/components?category=cpu
GET /api/v1/components?category=gpu
GET /api/v1/components?category=motherboard
GET /api/v1/components?category=ram
GET /api/v1/components?category=storage
GET /api/v1/components?category=psu
GET /api/v1/components?category=case
```

### Buscar componente por ID

```http
GET /api/v1/components/cpu-ryzen-5-5600
```

### Verificar compatibilidade de uma build

```http
POST /api/v1/builds/check-compatibility
Content-Type: application/json

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

### Listar regras de compatibilidade

```http
GET /api/v1/compatibility-rules
```

### Cadastrar regra de compatibilidade

```http
POST /api/v1/compatibility-rules
Content-Type: application/json

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

### Analisar gargalos da build

```http
POST /api/v1/bottlenecks/analyze
Content-Type: application/json

{
  "cpuId": "cpu-ryzen-5-5600",
  "motherboardId": "mb-b550m-aorus-elite",
  "gpuId": "gpu-rtx-4060",
  "ramId": "ram-kingston-fury-16gb-ddr4",
  "storageId": "ssd-kingston-nv2-1tb",
  "psuId": "psu-corsair-650w",
  "caseId": "case-mid-tower-airflow"
}
```

### Simular desempenho em jogos

```http
POST /api/v1/performance/simulate-game
Content-Type: application/json

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

### Informar orçamento disponível

```http
POST /api/v1/budget
Content-Type: application/json

{
  "amount": 5000,
  "currency": "BRL",
  "priority": "cost-benefit"
}
```

Resposta esperada:

```json
{
  "success": true,
  "data": {
    "amount": 5000,
    "currency": "BRL",
    "priority": "cost-benefit",
    "warnings": []
  },
  "message": "Orçamento informado com sucesso."
}
```

Prioridades aceitas: `lowest-price`, `cost-benefit`, `performance`, `balanced` e `upgrade-ready`.
Quando `currency` não for informada, a API assume `BRL`. Quando `priority` não for informada, assume `balanced`.

### Gerar explicação simples

```http
POST /api/v1/explanations
Content-Type: application/json

{
  "type": "bottleneck",
  "data": {
    "type": "cpu_bottleneck",
    "severity": "medium",
    "component": "cpu",
    "relatedComponent": "gpu",
    "cpuScore": 60,
    "gpuScore": 85
  }
}
```

Resposta esperada:

```json
{
  "success": true,
  "data": {
    "title": "Possivel gargalo no processador",
    "simpleExplanation": "A placa de video escolhida e mais forte que o processador. Em alguns jogos, o processador pode limitar o desempenho total do computador.",
    "suggestion": "Considere escolher um processador mais forte ou uma placa de video mais equilibrada com essa CPU.",
    "severity": "medium"
  },
  "message": "Explicacao gerada com sucesso."
}
```

Tipos aceitos: `incompatibility`, `compatibility`, `bottleneck`, `recommendation`, `performance`, `budget`, `warning` e `general`.
As explicações são geradas localmente a partir dos dados técnicos já produzidos por compatibilidade, gargalos, recomendações, desempenho e orçamento.

### Recomendar configuração por orçamento

```http
POST /api/v1/recommendations/budget
Content-Type: application/json

{
  "budget": {
    "amount": 5000,
    "currency": "BRL",
    "priority": "cost-benefit"
  },
  "usageType": "gaming"
}
```

Prioridades aceitas: `cost-benefit`, `performance` e `lowest-price`.
Tipos de uso aceitos: `gaming`, `general`, `productivity`, `work`, `video-editing`, `programming`, `design`, `study`, `streaming` e `upgrade`.

### Recomendar configuração por tipo de uso

```http
POST /api/v1/recommendations/by-usage
Content-Type: application/json

{
  "budget": {
    "amount": 6000,
    "currency": "BRL"
  },
  "usageType": "gaming",
  "preferences": {
    "targetResolution": "1080p",
    "priority": "cost-benefit"
  }
}
```

O retorno inclui `usageType`, `strategy`, `summary`, `components`, `totalEstimatedPrice` e `remainingBudget`.

### Gerar resumo final da configuração

```http
POST /api/v1/build-summary
Content-Type: application/json

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
  "gameId": "game-cyberpunk-2077",
  "usageType": "gaming",
  "targetResolution": "1080p",
  "qualityPreset": "high"
}
```

Resposta resumida:

```json
{
  "success": true,
  "data": {
    "components": {
      "cpu": { "id": "cpu-ryzen-5-5600" },
      "gpu": { "id": "gpu-rtx-4060" }
    },
    "totalEstimatedPrice": 4699.3,
    "budgetStatus": {
      "amount": 5000,
      "currency": "BRL",
      "remaining": 300.7,
      "status": "within_budget"
    },
    "compatibility": {
      "compatible": true,
      "alerts": []
    },
    "bottlenecks": {
      "hasBottleneck": false,
      "overallBalance": "balanced"
    },
    "gamePerformance": {
      "gameId": "game-cyberpunk-2077",
      "estimatedFps": 72,
      "performanceLevel": "good"
    },
    "summary": "A configuracao esta compativel, esta dentro do orcamento informado, o conjunto apresenta bom equilibrio entre os principais componentes.",
    "finalRecommendation": "Configuracao recomendada para o perfil informado."
  },
  "message": "Resumo final da configuracao gerado com sucesso."
}
```

O endpoint consolida os services de compatibilidade, alertas, gargalos, orçamento, desempenho em jogos, recomendação e explicações simples. `budget` e `gameId` são opcionais; quando alguma análise opcional não tiver dados suficientes, a seção correspondente retorna `available: false` sem impedir o resumo principal.

### Compartilhar configuração

```http
POST /api/v1/share/build
Content-Type: application/json

{
  "buildId": "build-001"
}
```

Tambem e possivel compartilhar uma build direta:

```json
{
  "name": "Build para comunidade",
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

Resposta resumida:

```json
{
  "success": true,
  "data": {
    "shareId": "share-001",
    "shareUrl": "/shared-builds/share-001",
    "createdAt": "2026-05-18T14:00:00.000Z",
    "status": "active",
    "buildSummary": {
      "name": "Build para comunidade",
      "totalEstimatedPrice": 4699.3,
      "summary": "A configuracao esta compativel, esta dentro do orcamento informado.",
      "finalRecommendation": "Configuracao recomendada para o perfil informado."
    }
  },
  "message": "Link de compartilhamento gerado com sucesso."
}
```

Para consultar uma build compartilhada:

```http
GET /api/v1/share/build/share-001
```

## Padrão de desenvolvimento da equipe

1. Criar novas rotas em `src/routes`.
2. Criar controllers em `src/controllers`.
3. Colocar regras de negócio em `src/services`.
4. Evitar regra de negócio diretamente na rota.
5. Usar respostas padronizadas com `success`, `data`, `message` e `errors`.
6. Criar testes quando alterar regras de compatibilidade ou cálculo.
7. Usar nomes em inglês no código e mensagens em português quando forem retornadas ao usuário.

## Próximos passos sugeridos

- Implementar autenticação para administrador;
- Criar CRUD real de componentes;
- Criar CRUD real de regras de compatibilidade;
- Persistir dados em banco de dados;
- Implementar recomendação por orçamento;
- Implementar cálculo de gargalo;
- Implementar estimativa de desempenho em jogos;
- Criar frontend integrado à API.

## US-17 - Parâmetros de desempenho dos componentes

A US-17 adiciona uma base mockada de parâmetros de desempenho para componentes. A funcionalidade segue o fluxo `routes → controllers → services → data/repository` e permite cadastrar, consultar, atualizar e remover parâmetros técnicos que serão usados por funcionalidades futuras, como identificação de gargalos, simulação de desempenho em jogos e recomendação de peças por orçamento.

### Endpoints

```http
GET /api/v1/performance-parameters
GET /api/v1/performance-parameters/:componentId
POST /api/v1/performance-parameters
PUT /api/v1/performance-parameters/:componentId
DELETE /api/v1/performance-parameters/:componentId
```

Também é possível filtrar a listagem por tipo:

```http
GET /api/v1/performance-parameters?type=gpu
```

### Exemplo de cadastro

```json
{
  "componentId": "gpu-rx-7600",
  "type": "gpu",
  "performanceScore": 83,
  "gamingScore": 86,
  "vram": 8,
  "memoryType": "GDDR6",
  "recommendedResolution": "1080p",
  "tdp": 165,
  "recommendedUse": ["gaming", "general"]
}
```

### Regras principais

- `componentId` é obrigatório.
- `type` é obrigatório e deve ser compatível com o tipo real do componente cadastrado.
- `performanceScore` é obrigatório, numérico e deve estar na escala de 0 a 100.
- O componente precisa existir na base de componentes.
- Não é permitido cadastrar parâmetros duplicados para o mesmo componente; para isso, use `PUT`.


### Salvar configuração montada

```http
POST /api/v1/saved-builds
Content-Type: application/json

{
  "name": "Meu PC gamer custo-benefício",
  "description": "Configuração pensada para jogos em 1080p.",
  "components": {
    "cpuId": "cpu-ryzen-5-5600",
    "gpuId": "gpu-rtx-4060",
    "motherboardId": "mb-b550m-aorus-elite",
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

Resposta esperada:

```json
{
  "success": true,
  "data": {
    "id": "build-001",
    "name": "Meu PC gamer custo-benefício",
    "description": "Configuração pensada para jogos em 1080p.",
    "components": {
      "cpu": "cpu-ryzen-5-5600",
      "gpu": "gpu-rtx-4060",
      "motherboard": "mb-b550m-aorus-elite",
      "ram": "ram-kingston-fury-16gb-ddr4",
      "storage": "ssd-kingston-nv2-1tb",
      "psu": "psu-corsair-650w",
      "case": "case-mid-tower-airflow"
    },
    "budget": {
      "amount": 5000,
      "currency": "BRL"
    },
    "usageType": "gaming",
    "totalEstimatedPrice": 4699.3,
    "userId": null,
    "createdAt": "2026-05-18T12:00:00.000Z",
    "updatedAt": "2026-05-18T12:00:00.000Z"
  },
  "message": "Configuração salva com sucesso."
}
```

### Listar configurações salvas

```http
GET /api/v1/saved-builds
```

### Buscar configuração salva por ID

```http
GET /api/v1/saved-builds/build-001
```


### Editar configuração salva

```http
PATCH /api/v1/saved-builds/build-001
Content-Type: application/json

{
  "name": "Meu PC gamer atualizado",
  "components": {
    "cpuId": "cpu-intel-i5-12400f",
    "gpuId": "gpu-rx-7600",
    "motherboardId": "mb-h610m-ddr4",
    "ramId": "ram-corsair-vengeance-16gb-ddr5",
    "storageId": "ssd-kingston-nv2-1tb",
    "psuId": "psu-generic-400w",
    "caseId": "case-mid-tower-airflow"
  },
  "budget": {
    "amount": 5500,
    "currency": "BRL"
  },
  "usageType": "gaming",
  "observations": "Configuração ajustada para testar uma alternativa de CPU e GPU."
}
```

Também é possível usar `PUT /api/v1/saved-builds/build-001`. A atualização mantém os campos não enviados e altera apenas os campos informados. Quando os componentes são alterados, os IDs são validados na base mockada e o `totalEstimatedPrice` é recalculado.

Resposta esperada:

```json
{
  "success": true,
  "data": {
    "id": "build-001",
    "name": "Meu PC gamer atualizado",
    "components": {
      "cpu": "cpu-intel-i5-12400f",
      "gpu": "gpu-rx-7600",
      "motherboard": "mb-h610m-ddr4",
      "ram": "ram-corsair-vengeance-16gb-ddr5",
      "storage": "ssd-kingston-nv2-1tb",
      "psu": "psu-generic-400w",
      "case": "case-mid-tower-airflow"
    },
    "budget": {
      "amount": 5500,
      "currency": "BRL"
    },
    "usageType": "gaming",
    "observations": "Configuração ajustada para testar uma alternativa de CPU e GPU.",
    "updatedAt": "2026-05-18T13:00:00.000Z"
  },
  "message": "Configuração atualizada com sucesso."
}
```

### Remover configuração salva

```http
DELETE /api/v1/saved-builds/build-001
```