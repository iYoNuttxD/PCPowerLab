# Documentacao da API - PCPowerLab

> Contratos incrementais históricos estão identificados por etapa. Para o estado atual e os limites de validação, consulte a [consolidação técnica](RA2-CONSOLIDACAO-FINAL.md).

Base padrao da API:

```http
http://localhost:3000/api/v1
```

O prefixo pode ser alterado pela variavel de ambiente `API_PREFIX`.

## Padrao de resposta

### Sucesso

```json
{
  "success": true,
  "message": "Operacao realizada com sucesso.",
  "data": {}
}
```

### Erro

```json
{
  "success": false,
  "message": "Nao foi possivel concluir a operacao.",
  "errors": []
}
```

## Entidades principais

### Component

Representa uma peca de hardware da base da plataforma.

Campos principais:

- `id`: identificador unico;
- `name`: nome comercial;
- `category`: categoria da peca;
- `brand`: fabricante;
- `price`: preco estimado;
- `active`: indica se o componente esta ativo;
- `specs`: especificacoes tecnicas usadas por compatibilidade e administracao.

Categorias aceitas:

- `cpu`
- `gpu`
- `motherboard`
- `ram`
- `storage`
- `psu`
- `case`

### Build

Representa a configuracao escolhida pelo usuario.

Slots obrigatorios:

- `cpu`
- `motherboard`
- `gpu`
- `ram`
- `storage`
- `psu`
- `case`

As rotas de build aceitam payload plano com campos `cpuId`, `gpuId`, etc., ou payload aninhado em `components`.

### PerformanceParameter

Representa os parametros de desempenho cadastrados pela US-17.

Campos principais:

- `componentId`: ID do componente;
- `type`: categoria do componente;
- `performanceScore`: score numerico de 0 a 100;
- campos opcionais por tipo, como `gamingScore`, `productivityScore`, `tdp`, `capacity`, `speed`, `readSpeed`, `writeSpeed`, `wattage` e `recommendedUse`.

### CompatibilityRule

Representa uma regra tecnica de compatibilidade preparada para validacoes.

Campos principais:

- `id`: identificador unico da regra;
- `name`: nome tecnico;
- `sourceType`: tipo do componente de origem;
- `targetType`: tipo do componente de destino ou `build`;
- `field`: campo tecnico analisado na origem;
- `targetField`: campo tecnico analisado no destino;
- `operator`: operador de comparacao;
- `severity`: `low`, `medium` ou `high`;
- `active`: indica se a regra esta ativa;
- `priority`: prioridade de execucao futura;
- `message`: mensagem para o usuario.

Operadores aceitos:

- `equals`
- `includes`
- `lessThanOrEqual`
- `greaterThanOrEqual`

## Health

### Status da API

```http
GET /api/v1/health
```

Resposta:

```json
{
  "success": true,
  "data": {
    "status": "online",
    "service": "PCPowerLab API"
  },
  "message": "Operacao realizada com sucesso."
}
```

## Componentes publicos

### Listar componentes

```http
GET /api/v1/components
```

Filtros opcionais:

- `type`: categoria do componente;
- `category`: alias mantido por compatibilidade.

Exemplo:

```http
GET /api/v1/components?type=cpu
```

### Buscar componente por ID

```http
GET /api/v1/components/:id
```

Retorna `404` quando o componente nao existir.

### Ranking de custo-beneficio

```http
GET /api/v1/components/cost-benefit
GET /api/v1/components/cost-benefit?category=gpu&limit=5
```

Retorna componentes com parametros de desempenho e preco valido ordenados por score de custo-beneficio.

## Componentes administrativos

As rotas administrativas manipulam a base mockada em memoria e podem listar componentes ativos ou inativos.

### Listar componentes administrativos

```http
GET /api/v1/admin/components
```

Filtros opcionais:

- `type` ou `category`: categoria do componente;
- `active`: `true` ou `false`.

### Buscar componente administrativo por ID

```http
GET /api/v1/admin/components/:id
```

### Cadastrar componente

```http
POST /api/v1/admin/components
Content-Type: application/json

{
  "id": "cpu-exemplo",
  "name": "CPU Exemplo",
  "type": "cpu",
  "brand": "PCPowerLab",
  "estimatedPrice": 899.9,
  "socket": "AM4",
  "cores": 6,
  "threads": 12,
  "baseClock": 3.5,
  "boostClock": 4.4,
  "tdp": 65
}
```

O campo `id` e opcional. Quando omitido, a API gera um ID simples por categoria.

### Editar componente

```http
PUT /api/v1/admin/components/:id
```

Aceita atualizacao parcial de componentes existentes.

### Desativar componente

```http
DELETE /api/v1/admin/components/:id
```

Realiza desativacao logica com `active: false`.

### Campos tecnicos obrigatorios por tipo

- `cpu`: `socket`, `cores`, `threads`, `baseClock`/`baseClockGhz`, `boostClock`/`boostClockGhz`, `tdp`/`tdpWatts`
- `gpu`: `vram`/`vramGb`, `tdp`/`tdpWatts`, `length`/`lengthMm`, `recommendedPsu`/`recommendedPsuWatts`
- `motherboard`: `socket`, `memoryType`, `formFactor`, `chipset`
- `ram`: `memoryType`, `capacity`/`capacityGb`, `speed`/`speedMhz`
- `storage`: `interface`, `capacity`/`capacityGb`, `storageType`
- `psu`: `wattage`/`watts`, `efficiency`
- `case`: `supportedFormFactors`, `maxGpuLength`/`maxGpuLengthMm`

## Builds

### Selecionar componentes

```http
POST /api/v1/builds/selection
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

Formato aninhado tambem aceito:

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

### Verificar compatibilidade

```http
POST /api/v1/builds/check-compatibility
POST /api/v1/compatibility/check
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

A resposta inclui:

- `compatible`: indica se a configuracao e compativel;
- `issues`: alertas tecnicos originais;
- `alerts`: mensagens estruturadas para exibicao no front-end;
- `selectedComponents`: componentes encontrados;
- `estimatedPrice`: preco estimado total.

`POST /api/v1/builds/check-compatibility` foi mantida por compatibilidade com as primeiras US. Para novos consumidores, prefira `POST /api/v1/compatibility/check`.

## Alertas de compatibilidade

### Gerar alertas amigaveis

```http
POST /api/v1/compatibility/alerts
```

Recebe a mesma selecao usada nas builds e retorna alertas prontos para interface.

Exemplo de resposta com alerta:

```json
{
  "success": true,
  "data": {
    "compatible": false,
    "alerts": [
      {
        "code": "CPU_MOTHERBOARD_SOCKET_INCOMPATIBLE",
        "title": "Processador incompativel com a placa-mae",
        "message": "O processador selecionado usa um socket diferente da placa-mae escolhida.",
        "severity": "high",
        "blocking": true,
        "components": ["cpu", "motherboard"],
        "suggestion": "Verifique se o processador e a placa-mae usam o mesmo socket."
      }
    ],
    "issues": []
  },
  "message": "Alertas de compatibilidade gerados com sucesso."
}
```

### Sugerir correcoes de compatibilidade

```http
POST /api/v1/compatibility/fix-suggestions
```

Recebe a mesma build usada na verificacao de compatibilidade e retorna alternativas de componentes existentes que resolvem o problema sem criar uma nova incompatibilidade conhecida.

## Regras de compatibilidade

### Listar regras

```http
GET /api/v1/compatibility-rules
```

Filtros opcionais:

- `sourceType`;
- `targetType`;
- `active`: `true` ou `false`.

### Cadastrar regra

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
  "message": "O socket do processador deve ser compativel com o socket da placa-mae."
}
```

Campos obrigatorios: `name`, `sourceType`, `targetType`, `field`, `operator`, `severity` e `message`.

### Editar regra

```http
PUT /api/v1/compatibility-rules/:id
Content-Type: application/json

{
  "name": "CPU socket must match motherboard socket",
  "severity": "high",
  "active": true,
  "message": "O socket do processador deve ser compativel com o socket da placa-mae."
}
```

### Remover regra

```http
DELETE /api/v1/compatibility-rules/:id
```

## Parametros de desempenho

### Listar parametros

```http
GET /api/v1/performance-parameters
```

Filtro opcional:

- `type`: categoria do componente.

Exemplo:

```http
GET /api/v1/performance-parameters?type=gpu
```

### Buscar parametros por componente

```http
GET /api/v1/performance-parameters/:componentId
```

### Cadastrar parametros

```http
POST /api/v1/performance-parameters
Content-Type: application/json

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

### Atualizar parametros

```http
PUT /api/v1/performance-parameters/:componentId
```

### Remover parametros

```http
DELETE /api/v1/performance-parameters/:componentId
```

Regras principais:

- `componentId` e obrigatorio;
- `type` e obrigatorio e deve corresponder ao tipo real do componente;
- `performanceScore` e obrigatorio e deve estar entre 0 e 100;
- o componente precisa existir;
- parametros duplicados para o mesmo componente retornam erro `409`; use `PUT` para atualizar.

## Gargalos

### Analisar gargalos

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

Usa os parametros de desempenho da US-17 para comparar CPU, GPU, RAM, storage e folga da fonte.

Exemplo de resposta:

```json
{
  "success": true,
  "data": {
    "hasBottleneck": false,
    "overallBalance": "balanced",
    "bottlenecks": [],
    "performanceSummary": {
      "cpuScore": 78,
      "gpuScore": 85,
      "ramScore": 72,
      "storageScore": 80,
      "estimatedConsumptionWatts": 280,
      "psuWatts": 650
    }
  },
  "message": "Analise de gargalos concluida."
}
```

Limiar inicial de CPU/GPU:

- diferenca ate 15 pontos: equilibrio aceitavel;
- diferenca entre 16 e 30 pontos: gargalo moderado;
- diferenca acima de 30 pontos: gargalo relevante.

## Simulacao de desempenho em jogos

### Listar jogos disponiveis

```http
GET /api/v1/performance/games
```

Filtro opcional:

- `category`: categoria do jogo.

Os jogos cadastrados na base mockada usam nomes reais apenas como referencia textual para a simulacao. Os requisitos e scores sao estimativas simplificadas para fins academicos; eles nao representam requisitos oficiais e nao garantem FPS real.

### Buscar jogo por ID

```http
GET /api/v1/performance/games/:id
```

### Simular desempenho esperado

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

Campos principais:

- `gameId`: ID do jogo cadastrado na base mockada;
- `targetResolution`: `1080p`, `1440p` ou `4k`;
- `qualityPreset`: `low`, `medium`, `high` ou `ultra`;
- `build`: componentes usados na simulacao.

A build precisa informar `cpuId`, `gpuId`, `ramId` e `storageId`. Quando tambem informar `motherboardId`, `psuId` e `caseId`, a simulacao reaproveita a analise de gargalos da US-04 para aplicar penalidade de desempenho.

Exemplo de resposta:

```json
{
  "success": true,
  "data": {
    "game": "Cyberpunk 2077",
    "gameId": "game-cyberpunk-2077",
    "targetResolution": "1080p",
    "qualityPreset": "high",
    "estimatedFps": 54,
    "performanceLevel": "good",
    "meetsMinimumRequirements": true,
    "meetsRecommendedRequirements": false,
    "summary": "A configuracao deve rodar Cyberpunk 2077 em qualidade high com bom desempenho, mas abaixo do ideal recomendado.",
    "details": {
      "cpuStatus": "belowRecommended",
      "gpuStatus": "recommended",
      "ramStatus": "recommended",
      "storageStatus": "recommended"
    },
    "technicalDetails": {
      "weightedPerformanceIndex": 100.26,
      "qualityMultiplier": 0.9,
      "resolutionMultiplier": 1,
      "bottleneckPenalty": 1,
      "bottlenecks": []
    }
  },
  "message": "Simulacao de desempenho concluida."
}
```

### Comparar desempenho entre jogos

```http
POST /api/v1/performance/compare-games
Content-Type: application/json

{
  "gameIds": ["game-cyberpunk-2077", "game-forza-horizon-5"],
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

`gameIds` deve conter pelo menos dois jogos e no maximo dez. A ordem enviada e preservada na resposta.

## Simulacao de desempenho em softwares profissionais

### Listar softwares profissionais

```http
GET /api/v1/professional-software
```

Filtro opcional:

- `category`: categoria do software.

Os softwares cadastrados na base mockada usam requisitos estimados por scores internos do PCPowerLab. Esses dados sao simplificados para fins academicos e nao representam requisitos oficiais dos fabricantes.

### Buscar software profissional por ID

```http
GET /api/v1/professional-software/:id
```

### Simular desempenho esperado em software profissional

```http
POST /api/v1/performance/simulate-software
Content-Type: application/json

{
  "softwareId": "software-adobe-premiere-pro",
  "build": {
    "cpuId": "cpu-ryzen-7-5700x",
    "gpuId": "gpu-rtx-4060",
    "motherboardId": "mb-b550m-aorus-elite",
    "ramId": "ram-kingston-fury-32gb-ddr4",
    "storageId": "ssd-samsung-980-pro-2tb",
    "psuId": "psu-corsair-650w",
    "caseId": "case-mid-tower-airflow"
  }
}
```

Campos principais:

- `softwareId`: ID do software profissional cadastrado na base mockada;
- `build`: componentes usados na simulacao.

A simulacao exige `cpuId`, `gpuId`, `ramId` e `storageId`. Os demais componentes podem ser enviados para manter o mesmo formato das builds usadas nas outras analises.

Exemplo de resposta:

```json
{
  "success": true,
  "data": {
    "software": "Adobe Premiere Pro",
    "softwareId": "software-adobe-premiere-pro",
    "category": "Edicao de video",
    "performanceScore": 84,
    "performanceLevel": "Muito bom",
    "meetsMinimumRequirements": true,
    "meetsRecommendedRequirements": true,
    "details": {
      "cpuStatus": "recommended",
      "gpuStatus": "recommended",
      "ramStatus": "recommended",
      "storageStatus": "recommended"
    },
    "summary": "A configuracao deve apresentar bom desempenho para Adobe Premiere Pro."
  },
  "message": "Simulação de desempenho em software profissional concluída com sucesso."
}
```

## Orcamento

### Informar orcamento disponivel

```http
POST /api/v1/budget
Content-Type: application/json

{
  "amount": 5000,
  "currency": "BRL",
  "priority": "cost-benefit"
}
```

Campos:

- `amount`: obrigatorio, numerico, maior que zero e menor ou igual a `100000`;
- `currency`: opcional, padrao `BRL`, deve seguir ISO 4217 com 3 letras;
- `priority`: opcional, padrao `balanced`.

Prioridades aceitas:

- `lowest-price`
- `cost-benefit`
- `performance`
- `balanced`
- `upgrade-ready`

Resposta:

```json
{
  "success": true,
  "data": {
    "amount": 5000,
    "currency": "BRL",
    "priority": "cost-benefit",
    "warnings": []
  },
  "message": "Orcamento informado com sucesso."
}
```

## Recomendacoes

### Recomendar configuracao por orcamento

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

Prioridades aceitas pela recomendacao:

- `cost-benefit`
- `performance`
- `lowest-price`

Tipos de uso aceitos:

- `gaming`
- `general`
- `productivity`

Resposta resumida:

```json
{
  "success": true,
  "data": {
    "totalEstimatedPrice": 4820,
    "remainingBudget": 180,
    "usageType": "gaming",
    "priority": "cost-benefit",
    "components": {
      "cpu": {},
      "gpu": {},
      "motherboard": {},
      "ram": {},
      "storage": {},
      "psu": {},
      "case": {}
    },
    "summary": "Configuracao recomendada com foco em custo-beneficio para jogos em 1080p.",
    "warnings": [],
    "performanceScore": 78
  },
  "message": "Recomendacao gerada com sucesso."
}
```

Pode retornar `422` quando nao houver configuracao completa dentro do orcamento.

### Recomendar configuracao por faixa de orcamento

```http
POST /api/v1/recommendations/builds-by-budget-range
Content-Type: application/json

{
  "budgetRange": {
    "min": 4000,
    "max": 6000,
    "currency": "BRL"
  },
  "usageType": "gaming",
  "priority": "cost-benefit"
}
```

Retorna uma build completa compativel dentro da faixa informada, quando existir combinacao possivel.

## Perfis personalizados de uso

### Listar perfis

```http
GET /api/v1/usage-profiles
```

### Consultar perfil por ID

```http
GET /api/v1/usage-profiles/:id
```

### Criar perfil

```http
POST /api/v1/usage-profiles
Content-Type: application/json

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

Campos principais:

- `name`: obrigatorio;
- `description`: opcional, padrao string vazia;
- `weights`: obrigatorio, com pesos numericos para `cpu`, `gpu`, `ram`, `storage`, `costBenefit` e opcionalmente `budget`;
- `recommendedMinimums`: opcional, com limites como `ramGb`, `storageType` e `gpuVramGb`.

Se a soma dos pesos for diferente de 100, a API normaliza os valores automaticamente para facilitar uso futuro em recomendacoes.

Resposta resumida:

```json
{
  "success": true,
  "data": {
    "id": "usage-profile-jogos-streaming",
    "name": "Jogos + Streaming",
    "description": "Perfil voltado para jogar e transmitir ao vivo com boa estabilidade.",
    "weights": {
      "cpu": 30,
      "gpu": 35,
      "ram": 20,
      "storage": 10,
      "costBenefit": 5,
      "budget": 0
    },
    "recommendedMinimums": {
      "ramGb": 16,
      "storageType": "SSD",
      "gpuVramGb": 8
    },
    "createdAt": "2026-05-22T12:00:00.000Z",
    "updatedAt": "2026-05-22T12:00:00.000Z"
  },
  "message": "Perfil de uso criado com sucesso."
}
```

### Atualizar perfil

```http
PUT /api/v1/usage-profiles/:id
```

### Remover perfil

```http
DELETE /api/v1/usage-profiles/:id
```

## Comparacao de builds

## Configuracoes prontas

### Listar configuracoes prontas

```http
GET /api/v1/ready-builds
GET /api/v1/ready-builds?profile=gaming
```

### Buscar configuracao pronta por ID

```http
GET /api/v1/ready-builds/:id
```

As configuracoes prontas usam apenas componentes existentes na base mockada e sao revalidadas pelos testes de integridade.

## Nota geral da configuracao

### Calcular nota geral

```http
POST /api/v1/build-score
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
  "usageType": "gaming"
}
```

Resposta resumida:

```json
{
  "success": true,
  "data": {
    "overallScore": 86,
    "classification": "Muito boa",
    "criteria": {
      "compatibilityScore": 100,
      "performanceScore": 82,
      "balanceScore": 100,
      "budgetScore": 95.6,
      "costBenefitScore": 80
    },
    "summary": "A configuracao apresenta boa compatibilidade, o conjunto esta equilibrado entre os principais componentes, esta dentro do orcamento informado."
  },
  "message": "Nota geral da configuracao calculada com sucesso."
}
```

A nota varia de 0 a 100 e consolida compatibilidade, desempenho, equilibrio/gargalos, orcamento e custo-beneficio. Quando faltarem parametros de desempenho, a API retorna nota parcial com `warnings`.

### Comparar duas ou mais configuracoes

```http
POST /api/v1/build-comparison
Content-Type: application/json

{
  "builds": [
    {
      "name": "Build custo-beneficio",
      "components": {
        "cpuId": "cpu-ryzen-5-5600",
        "motherboardId": "mb-b550m-aorus-elite",
        "gpuId": "gpu-rtx-4060",
        "ramId": "ram-kingston-fury-16gb-ddr4",
        "storageId": "ssd-kingston-nv2-1tb",
        "psuId": "psu-corsair-650w",
        "caseId": "case-mid-tower-airflow"
      }
    },
    {
      "name": "Build alternativa",
      "components": {
        "cpuId": "cpu-ryzen-5-5600",
        "motherboardId": "mb-b550m-aorus-elite",
        "gpuId": "gpu-rtx-4060",
        "ramId": "ram-kingston-fury-16gb-ddr4",
        "storageId": "ssd-kingston-nv2-1tb",
        "psuId": "psu-corsair-650w",
        "caseId": "case-mid-tower-airflow"
      }
    }
  ],
  "budget": {
    "amount": 5000,
    "currency": "BRL"
  },
  "usageType": "gaming",
  "gameId": "game-cyberpunk-2077",
  "targetResolution": "1080p",
  "qualityPreset": "high",
  "comparisonCriteria": "cost-benefit"
}
```

Regras principais:

- `builds` deve conter pelo menos duas configuracoes;
- cada build precisa informar os componentes principais;
- `budget`, `usageType`, `gameId`, `targetResolution` e `qualityPreset` sao opcionais;
- `comparisonCriteria` aceita `cost-benefit`, `performance`, `budget` e `balanced`.

Resposta resumida:

```json
{
  "success": true,
  "data": {
    "comparisonCriteria": "cost-benefit",
    "usageType": "gaming",
    "budget": {
      "amount": 5000,
      "currency": "BRL",
      "priority": "balanced"
    },
    "builds": [
      {
        "name": "Build custo-beneficio",
        "totalEstimatedPrice": 4699.3,
        "compatible": true,
        "performanceScore": 100.26,
        "costBenefitScore": 100,
        "hasBottleneck": false,
        "budgetStatus": "within_budget",
        "summary": "Configuracao compativel para gaming. Esta dentro do orcamento informado. Estimativa de 54 FPS no jogo informado."
      }
    ],
    "recommendedBuild": {
      "name": "Build custo-beneficio",
      "reason": "Melhor relacao entre desempenho, preco e orcamento informado.",
      "comparisonScore": 150.05
    }
  },
  "message": "Comparacao de configuracoes gerada com sucesso."
}
```

## Sugestoes de upgrade

### Sugerir upgrades para uma build

```http
POST /api/v1/upgrades/suggest
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
    "amount": 1500,
    "currency": "BRL"
  },
  "usageType": "gaming",
  "priority": "cost-benefit"
}
```

Tambem aceita uma build salva:

```json
{
  "buildId": "build-001",
  "budget": {
    "amount": 1500,
    "currency": "BRL"
  },
  "usageType": "gaming",
  "priority": "cost-benefit"
}
```

Regras principais:

- deve ser informada uma `build` direta ou um `buildId` salvo;
- `budget` e opcional, mas quando informado limita as sugestoes pelo custo estimado do componente sugerido;
- `usageType` ajusta a prioridade dos componentes analisados;
- gargalos identificados pela analise existente recebem prioridade;
- cada sugestao passa pela validacao de compatibilidade antes de ser retornada.

Resposta resumida:

```json
{
  "success": true,
  "data": {
    "currentBuildSummary": {
      "totalEstimatedPrice": 4699.3,
      "mainBottleneck": "gpu",
      "hasBottleneck": true
    },
    "suggestions": [
      {
        "componentType": "gpu",
        "currentComponent": {
          "id": "gpu-rtx-4060"
        },
        "suggestedComponent": {
          "id": "gpu-rx-7600"
        },
        "estimatedUpgradeCost": 1699.9,
        "expectedImpact": "medium",
        "scoreGain": 12,
        "reason": "A troca de gpu deve trazer ganho perceptivel para gaming.",
        "compatibilityStatus": "compatible"
      }
    ],
    "summary": "O upgrade mais recomendado e trocar gpu, pois esse ponto limita o desempenho da configuracao."
  },
  "message": "Sugestoes de upgrade geradas com sucesso."
}
```

## Builds salvas e notificacoes

### Listar e manter builds salvas

```http
GET    /api/v1/saved-builds
GET    /api/v1/saved-builds/:id
POST   /api/v1/saved-builds
PUT    /api/v1/saved-builds/:id
PATCH  /api/v1/saved-builds/:id
DELETE /api/v1/saved-builds/:id
```

### Versoes de builds salvas

```http
GET    /api/v1/saved-builds/:id/versions
GET    /api/v1/saved-builds/:id/versions/:versionId
POST   /api/v1/saved-builds/:id/versions
DELETE /api/v1/saved-builds/:id/versions/:versionId
```

Cada versao guarda um snapshot independente da configuracao no momento do registro.

### Revalidar todas as builds salvas

```http
POST /api/v1/saved-builds/revalidate
```

### Revalidar uma build salva

```http
POST /api/v1/saved-builds/:id/revalidate
```

Resposta resumida:

```json
{
  "success": true,
  "data": {
    "checkedBuilds": 2,
    "notificationsCreated": 1,
    "results": [
      {
        "buildId": "build-001",
        "status": "compatible",
        "notifications": []
      },
      {
        "buildId": "build-002",
        "status": "incompatible",
        "notifications": [
          {
            "id": "notification-001",
            "buildId": "build-002",
            "type": "compatibility_changed",
            "severity": "high",
            "message": "A configuracao salva passou a apresentar incompatibilidade entre processador e placa-mae.",
            "read": false,
            "createdAt": "2026-05-22T12:00:00.000Z"
          }
        ]
      }
    ]
  },
  "message": "Revalidacao de configuracoes salvas concluida."
}
```

A revalidacao reaproveita a verificacao de compatibilidade e os alertas existentes. Notificacoes duplicadas para o mesmo problema da mesma build sao reaproveitadas em vez de recriadas.

### Listar notificacoes

```http
GET /api/v1/notifications
GET /api/v1/notifications?buildId=build-001
```

### Marcar notificacao como lida

```http
PATCH /api/v1/notifications/:id/read
```

### Remover notificacao

```http
DELETE /api/v1/notifications/:id
```

## Historico de analises

```http
GET    /api/v1/analysis-history
GET    /api/v1/analysis-history/:id
GET    /api/v1/analysis-history?buildId=build-001
POST   /api/v1/analysis-history
DELETE /api/v1/analysis-history/:id
```

O historico registra analises executadas para consulta posterior. `buildId` e opcional em alguns cenarios de analise avulsa.

## Relatorio tecnico e exportacao

### Gerar relatorio tecnico

```http
POST /api/v1/build-report
```

O relatorio orquestra resumo, compatibilidade, gargalos, nota, simulacoes e links de compra quando solicitados. Secoes opcionais com erro controlado sao retornadas como indisponiveis em vez de quebrar a resposta.

### Exportar configuracao em JSON

```http
POST /api/v1/build-export/json
GET  /api/v1/saved-builds/:id/export/json
```

A exportacao aceita build direta ou build salva por ID e nao inclui dados sensiveis.

## Avaliacoes de recomendacoes

```http
GET    /api/v1/recommendation-feedback
GET    /api/v1/recommendation-feedback/:id
GET    /api/v1/recommendation-feedback?recommendationType=upgrade-suggestion
POST   /api/v1/recommendation-feedback
DELETE /api/v1/recommendation-feedback/:id
```

`rating` deve ficar entre 1 e 5. Comentarios sao opcionais e limitados em tamanho.

## Roadmap de upgrades

```http
POST /api/v1/upgrades/roadmap
```

Gera proximas etapas de upgrade a partir de uma build, respeitando orcamento total, compatibilidade e limite de passos.

## Explicacoes

### Gerar explicacao simples

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

Tipos aceitos:

- `incompatibility`
- `compatibility`
- `bottleneck`
- `recommendation`
- `performance`
- `budget`
- `warning`
- `general`

Severidades aceitas quando informadas:

- `low`
- `medium`
- `high`

Resposta:

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

## Compartilhamento de builds

### Gerar link simbolico de compartilhamento

```http
POST /api/v1/share/build
Content-Type: application/json

{
  "buildId": "build-001"
}
```

Tambem aceita uma build direta:

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

Resposta:

```json
{
  "success": true,
  "data": {
    "shareId": "share-001",
    "shareUrl": "/shared-builds/share-001",
    "createdAt": "2026-05-18T14:00:00.000Z",
    "status": "active",
    "source": "direct_build",
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

### Consultar build compartilhada

```http
GET /api/v1/share/build/:shareId
```

Retorna `404` quando o identificador de compartilhamento nao existir. O `shareUrl` e simbolico e fica preparado para uma futura rota publica do frontend.

## Links de compra

### Buscar links por componente

```http
GET /api/v1/purchase-links/:componentId
```

Exemplo:

```http
GET /api/v1/purchase-links/gpu-rtx-4060
```

Resposta:

```json
{
  "success": true,
  "data": [
    {
      "componentId": "gpu-rtx-4060",
      "storeName": "Kabum",
      "url": "https://www.kabum.com.br/busca/rtx-4060-8gb",
      "price": 1799.9,
      "currency": "BRL",
      "lastUpdated": "2026-05-22",
      "isAffiliate": false,
      "availabilityStatus": "unknown"
    }
  ],
  "message": "Links de compra encontrados com sucesso."
}
```

Links de busca são gerados a partir do cadastro ativo atual, inclusive componentes recém-criados; são buscas, não ofertas. Componentes inexistentes retornam `404`.

### Buscar links por build

```http
POST /api/v1/purchase-links/by-build
Content-Type: application/json

{
  "components": {
    "cpuId": "cpu-ryzen-5-5600",
    "motherboardId": "mb-b550m-aorus-elite",
    "gpuId": "gpu-rtx-4060",
    "ramId": "ram-kingston-fury-16gb-ddr4",
    "storageId": "ssd-kingston-nv2-1tb",
    "psuId": "psu-corsair-650w",
    "caseId": "case-mid-tower-airflow"
  }
}
```

Resposta resumida:

```json
{
  "success": true,
  "data": {
    "gpu": [
      {
        "componentId": "gpu-rtx-4060",
        "storeName": "Pichau",
        "url": "https://www.pichau.com.br/search?q=rtx%204060%208gb",
        "price": 1799.9,
        "currency": "BRL",
        "lastUpdated": "2026-05-22",
        "isAffiliate": false,
        "availabilityStatus": "unknown"
      }
    ],
    "case": []
  },
  "message": "Links de compra encontrados com sucesso."
}
```

Os links sao URLs reais de busca em lojas externas, geradas a partir do nome dos componentes. Os precos sao estimativas mockadas do catalogo interno, a disponibilidade nao e atualizada em tempo real e `isAffiliate` permanece `false`. A API nao faz scraping, nao usa APIs de lojas e o usuario deve confirmar preco e estoque diretamente na loja.

## Resumo das regras iniciais

A API atualmente cobre:

- consulta publica e administracao mockada de componentes;
- selecao de componentes para uma build;
- verificacao e alertas de compatibilidade;
- cadastro e listagem de regras de compatibilidade;
- cadastro e consulta de parametros de desempenho;
- analise inicial de gargalos;
- simulacao inicial de desempenho em jogos;
- registro de orcamento;
- recomendacao por orcamento;
- comparacao de duas ou mais builds;
- sugestoes de upgrade para builds salvas ou enviadas diretamente;
- explicacoes simples para resultados tecnicos;
- compartilhamento simbolico de builds;
- links mockados de compra por componente e por build.


## Contrato v2.1: refrigeração opcional

As sete peças principais continuam obrigatórias. No mesmo objeto da seleção, podem ser enviados:

```json
{
  "coolerId": "cooler-noctua-nh-u12s-redux",
  "fans": [{ "fanId": "fan-arctic-p12-pwm-pst-5-pack", "quantity": 1 }]
}
```

Também são aceitos `components.cooler`/`components.coolerId` e `components.fans`. IDs principais aceitam chaves com ou sem sufixo `Id`. `coolerId:null` e `fans:[]` removem acessórios; omissão mantém o formato legado. Em PATCH de build salva, omissão preserva seleção anterior, enquanto remoção exige os campos explícitos.

- `quantity` é um inteiro entre 1 e 20 **pacotes**, IDs de fan únicos. `unitsPerPack` define quantas ventoinhas físicas há em cada pacote. Preço de pacote × quantidade; consumo por fan × unidades por pacote × quantidade
- `selectedComponents.cooler` é um componente; `selectedComponents.fans` é um array de componentes com `quantity`. Campos opcionais vazios podem ser omitidos
- Salvos, versões, JSON exportado (versão compatível 1.0), compartilhamento, relatório e comparação preservam os opcionais. Importação pode enviar `export.build` à seleção; interface reidrata IDs de JSON importado
- Compatibilidade: `status` é `compatible`, `incompatible` ou `unverified`; `compatible` só é true no primeiro caso. Conflitos ficam em `alerts`; verificações incompletas em `unverifiedChecks` com `verification:'unverified'`. O endpoint de alertas agrega as duas listas para apresentação, mantendo estado separado
- `coolingPower` retorna `knownWatts`, `complete`, `unknownComponents`. Valores desconhecidos não viram zero verificado. Valores conhecidos são somados ao mínimo de fonte e à estimativa de consumo; as fórmulas preexistentes de finalidades distintas continuam heurísticas
- Recomendações por orçamento/faixa aceitam os opcionais no nível raiz ou em `components`; reservam custo e testam compatibilidade. Não descartam os acessórios para caber no orçamento. Se os dados forem insuficientes, retornam 422 sem afirmar compatibilidade, salvo a opção explícita e limitada de proposta com refrigeração pendente descrita na complementação V3 abaixo
- As novas categorias são `cooler` (air/AIO) e `fan`. Parâmetros de desempenho continuam restritos às sete categorias principais; não cadastrar bônus de FPS por refrigeração
- CRUD de regras é um registro documental separado do motor codificado. Alterá-lo não muda a execução das verificações

Limites físicos e fontes: [v2.1](RA2-V2.1-INTEGRACAO.md) e [catálogo](RA2-V2.1-CATALOG-SOURCES.md).

## V2.6 — Proveniência de preço (campos aditivos)

`GET /components` e consulta por ID preservam `price` (referência estimada) e expõem `pricing`: `productId`, `price`, `currency`, `source`, `updateStatus`, `queriedAt`, `validUntil`, `availability`, `isMarketQuote`. Catálogo atual: `catalog_reference`, `estimate`, datas nulas e `isMarketQuote: false`.

Links de compra preservam arrays/slots e campos legados. Buscas acrescentam `kind: research`, `priceType: estimate`, `productUrl: null`, datas nulas, `updateStatus: not_queried`, `marketStatus`, `marketMessage`, `comparisonAvailable: false`. `price` não é cotação da loja. Futuras ofertas autorizadas usam `kind: offer`, `priceType: market_quote`, URL exata, fonte, consulta e validade; hoje nenhuma existe.

Resumo acrescenta `pricing`: total estimado, subtotal exclusivamente de cotações disponíveis (nulo sem cotação), completude, IDs sem cotação/referência e metodologia. Nunca somar subtotal de mercado ao total de referência. Recomendações, upgrades, correções, custo-benefício e comparação expõem `methodology` explicando dados simulados, catálogo limitado e critérios. Não há endpoint de ingestão de ofertas, OAuth ou provedor conectado. [Detalhes e limites](RA2-V2.6-INTEGRACAO.md).

## V2.7 — Contratos reforçados pela auditoria de qualidade

- Simulações diretas `/performance/simulate-game`, `/performance/compare-games` e `/performance/simulate-software` recusam com **422** uma montagem completa incompatível ou não verificada. O resultado do resumo já tinha essa restrição. Simulações legadas de quatro peças continuam possíveis, mas retornam `compatibility: { scope: 'partial_build', status: 'unverified', compatible: false }` em `technicalDetails` (ou no objeto superior de comparação); não comprovam compatibilidade da montagem. Montagens completas aprovadas recebem `scope: 'full_build'`.
- `/build-comparison` rejeita entradas nulas, arrays ou primitivas com **400**, em vez de erro interno.
- `shareUrl` de `/share/build` usa a rota real `/shared/:shareId`. Compartilhamentos são snapshots, mantidos mesmo após excluir a build de origem.
- Índices `gamingScore`, `productivityScore` e `airflowScore`, assim como `performanceScore`, aceitam somente números de 0 a 100. Atualização inválida não modifica o registro.
- Em produção, endpoints inexistentes sob o `API_PREFIX` configurado retornam JSON **404**, sem cair no HTML da SPA.

Evidências, cenários, limitações e mudanças de persistência: [auditoria v2.7](RA2-V2-QUALIDADE.md). Nenhum contrato implica preço real, benchmark ou compatibilidade física integral.

## V2.9 — Resultado histórico da auditoria e contratos introduzidos

[Relatório final](RA2-V2-RELATORIO-FINAL.md): **NÃO HOMOLOGADA**. [Testes deduplicados](RA2-V2-REGISTRO-TESTES.md). A execução HTTP real desta rodada não certifica implantação pública, segurança completa, hardware físico ou oferta de mercado.

- Catálogo versionado naquela etapa: 98 ativos, 89 parâmetros das categorias principais e 490 links de pesquisa. Admin em memória pode alterar o estado de um processo; inventário de imports não é snapshot de outro servidor
- `POST /components/compatibility` usa `{components: <seleção>, category?: <categoria>}`; resposta por candidato inclui `componentId`, `status`, `compatible`, `alerts`, `unverifiedChecks`. Montagem parcial/ausente não é automaticamente compatível
- `POST /upgrades/roadmap` exige `maxSteps` inteiro positivo; fração é 400. Sugestões aceitam `buildId` explícito; a interface mantém essa origem durante carregamento e falhas
- `POST /build-summary`: `finalRecommendation` não aprova desempenho insuficiente, jogo solicitado indisponível ou falta de parâmetros. Sem jogo, a orientação explicita que desempenho específico não foi simulado. Compatibilidade/orçamento mantêm precedência; fórmulas de FPS não foram alteradas
- Listas técnicas presentes `storageInterfaces` (placa-mãe) e `supportedFormFactors` (gabinete) exigem arrays não vazios de textos. Entradas malformadas no admin recebem 400 sem mutação. Interfaces ausentes podem continuar desconhecidas em placa-mãe; dado legado inválido é não verificado e não deve causar TypeError na recomendação
- Sugestões de upgrade e roadmap usam a mesma precedência de aliases do seletor central: seleção do nível superior e remoção explícita `cooler:null`/`fans:[]` não são substituídas por aliases/acessórios aninhados
- Valores monetários da apresentação são normalizados em centavos antes de comparar o teto; não cria desconto, atualização de mercado ou previsão de compra
- Recursos salvos, versões, histórico, notificações e compartilhamentos são globais e em memória. Reinício perde alterações; sem autenticação de usuário/isolamento durável. Compartilhamento é snapshot e pode permanecer após apagar a origem
- CRUD de regras é documental, não altera as regras codificadas do motor. Não há endpoint de ingestão de cotação nem provedor comercial conectado

Documentação de schemas anteriores descreve o contrato aditivo histórico. Preço `price`, `totalEstimatedPrice` e FPS continuam referências/modelo, não evidências comerciais ou físicas.


## V2.10 — referências manuais datadas e identidade de comparação

As contagens desta seção pertencem à V2.10: 42 registros manuais datados e 56 estimativas demonstrativas. `price` continua referência para cálculos. `pricing.source=dated_public_reference`, `updateStatus=dated_snapshot`, `isMarketQuote=false` identifica pesquisa pontual. Expõe loja, vendedor, SKU, pagamento, cartão, data da consulta, idade do conteúdo, condição e `observedAvailability`; `availability` atual continua unknown e `validUntil` nulo. Nunca passa pelo gate de oferta `authorized_api`. Nenhum provedor ao vivo foi configurado.

`pricing` do resumo acrescenta `datedReferenceUnits`/`estimatedReferenceUnits`; quantidades de fans contam pacotes. Totais à vista podem combinar as duas bases com metodologia explícita; cartão e subtotal de ofertas ao vivo ficam separados. Links permanecem `kind=research` com `referencePricing` adicional, sem atribuir o preço consultado às outras lojas.

Comparação de builds acrescenta `comparisonIndex` por posição enviada e na recomendação, evitando ambiguidade por nome repetido; `bottleneckStatus` distingue análise de ausência de conclusão. A pontuação final pondera o critério com orçamento/compatibilidade/alertas e pode diferir da ordem de desempenho bruto. [Contrato, fontes e limites](RA2-V2.10-CONTINUIDADE.md).

### Fotografias de produto — v2.11

O campo `image` mantém caminhos locais e vínculo ao ID/identidade do catálogo. `identityLevel` distingue `exact-model` (associação ao modelo pela foto e fonte específica) e `model-family` (família visual, sem afirmar revisão/capacidade não comprovada). `representative-product` identifica um exemplo ilustrativo de categoria, sem alterar o produto genérico; `depictedProduct` nomeia o produto fotografado. `identityNotes` explica os limites. `rightsBasis` registra a procedência e situação conhecida; `license`/`licenseUrl` podem ser nulos quando não há permissão de reutilização estabelecida. `status: verified` não é uma certificação jurídica. Fotos de família compartilhadas têm grupo, IDs revisados e digest correspondentes. Fallback e imagem indisponível nunca contam como fotografia.


### Preços ausentes e escopo comercial — v2.12

`pricing.referenceScope` distingue `exact`, `family` e `benchmark`; `sourceVariantName` e `model` identificam o produto observado. Na etapa V2.12 havia 78 referências datadas e 20 componentes com `price: null`/`priceKind: unavailable`. Nenhum deles vira oferta ao vivo. Especificações não são copiadas da variante da fonte.

Compatibilidade e análises técnicas não falham apenas pela falta de preço. Resumos/salvos/exportações preservam `totalEstimatedPrice: null`; `pricing.knownReferenceSubtotal` soma somente preços conhecidos, `componentsWithoutReference` identifica pendências e `unavailableReferenceUnits` conta suas unidades/pacotes. Orçamento usa `status: unavailable` e `remaining: null`, nunca um saldo calculado tratando ausentes como zero. A função interna estrita de custo mantém seu erro 422 quando um total completo é obrigatório.

Nota geral/custo-benefício dependentes do custo usam `null` e `available: false`. Comparação por custo pode retornar `recommendedBuild: { available: false, reason }` se nenhuma alternativa tiver total completo. Critérios técnicos e comparação de desempenho continuam disponíveis.

## Pontuação simulada provisória (08/10/2026)

Componentes expõem `performanceScore` e `performanceMethodology` como objeto (`basis`, `kind`, `modelVersion`, `shortLabel`, `simulationSupported`, `measuredBenchmark`, `description`). `performanceModelStatus` legado permanece como dado histórico da calibração; use `performanceMethodology.simulationSupported` e a resposta da análise para disponibilidade de simulação. Agregados expõem `performanceBasis` e proveniência dos contribuintes. Perfis score-only retornam `available:false`, `scoreOnly:true` e `reason:synthetic_model_not_simulation_calibrated` em FPS/software/gargalos; isso não torna o score do componente nulo. [Metodologia](RA2-SYNTHETIC-PERFORMANCE.md).

Scores novos, mesmo baseados em benchmark revisado, não habilitam simulação por ausência de campo. A elegibilidade exige `simulationSupported:true` e `simulationProfileVersion` explícito, além de parâmetro válido; os modelos internos anteriores são identificados como `catalog-simulator-v1`.

A evidência de benchmark revisada precisa incluir `componentIdentity`, hash da identidade e especificações exatas correntes. Editar SKU, marca, nome, categoria ou especificações invalida a nota revisada até nova revisão. A base dos contribuintes é resolvida dos parâmetros registrados, sem confiar em metadados enviados pelo cliente.


## Estado comercial consolidado — 08/10/2026

O catálogo ativo contém 81 produtos e 81 observações manuais datadas elegíveis: 33 KaBuM, 33 Terabyte, 14 Pichau e 1 Amazon. A disponibilidade foi observada no momento registrado; não há API de preço/estoque ao vivo. SKU, vendedor, pagamento, horário e fonte acompanham a referência. Total de checkout, frete e menor preço de mercado não foram estabelecidos. As 117 identidades legadas permanecem preservadas; referências antigas não se tornam preços atuais e seleções salvas não são substituídas automaticamente.

As contagens anteriores neste documento são históricas. Fotografias dos 81 ativos dividem-se em 71 de modelo exato e 10 de família visual; metadados estruturais não certificam SKU ou direito de reutilização. Os novos contratos de cenário térmico/acústico e compatibilidade posicional serão consolidados após conferência da fonte final; até lá, não interpretar pontuação sintética nem socket compatível como comprovação térmica ou de encaixe.


## Limites térmicos e de refrigeração — fechamento ef7f / ac27

`coolingAssessment` é distinto da compatibilidade principal e mantém `status`, `scope`, `alerts` e `unverifiedChecks`; desconhecido não significa aprovado. [Contrato completo](COOLING-COMPATIBILITY-SCOPE.md). Socket compatível não certifica posição/espessura/folga de gabinete nem adequação térmica.

O cenário térmico/acústico é aproximado e baseado em hipóteses; não é benchmark ou medição de hardware. Fans extras participam de ruído estimado, consumo conhecido, custo e encaixe, mas **não alteram a temperatura** neste modelo. O acoplamento térmico adicional foi adiado. Scores sintéticos não habilitam automaticamente FPS/software/gargalos.

## V3 — Resumo parcial, disponibilidade por seção e recomendações

`POST /build-summary` continua exigindo uma seleção completa com IDs válidos. A seleção é validada antes das análises: peças obrigatórias ausentes ou categoria incorreta retornam **400**, IDs inexistentes retornam **404**. Uma falha de análise não é tratada como ausência de peças e não muda a seleção recebida.

Campos aditivos na resposta:

- `selectionStatus: "complete"`: os sete slots obrigatórios foram resolvidos. Não significa compatibilidade confirmada.
- `analysisStatus: "complete" | "partial"`: disponibilidade das seções solicitadas, não aprovação da montagem. Uma incompatibilidade conhecida pode estar completamente analisada.
- `sections`: estados de `compatibility`, `bottlenecks`, `budgetStatus`, `gamePerformance`, `selectionExplanation` e `recommendation`, quando solicitados. Cada entrada traz `status: "available" | "unverified" | "unavailable"`, e `reason`/`retryable` quando aplicáveis. Seções omitidas não foram solicitadas.
- Uma falha inesperada em uma análise retorna naquela seção `available: false`, `status: "unavailable"`, `reason: "analysis_failed"`, `retryable: true`, mensagem pública e `errors: []`. Não expõe detalhes internos da exceção. Entradas opcionais inválidas usam `reason: "invalid_analysis_input"`, `retryable: false` e erros controlados que permitem corrigir a entrada. Campos de erro existentes por falta de modelo continuam preservados.
- Falha no verificador de compatibilidade retorna `compatible: null`, nunca `false` como diagnóstico de incompatibilidade. Nesse caso, o FPS fica indisponível com `reason: "compatibility_analysis_unavailable"`; preços, peças, gargalos independentes e pesquisa de alternativa permanecem disponíveis.
- Compatibilidade realmente não verificada, incluindo BIOS ou refrigeração pendente, mantém `status: "unverified"` e a lista `unverifiedChecks`; simulação de jogo continua bloqueada com `reason: "unverified_build"`. Nenhuma regra foi relaxada para produzir um número.

`recommendationObservation`, quando há orçamento válido, pode conter uma alternativa com os mesmos critérios e o detalhamento de `recommendations/budget`, incluindo `components`, `usageType`, `priority`, `requestedBudget` e `compatibilityStatus`. Ela pode existir mesmo quando a montagem atual tem verificações pendentes: a alternativa é verificada independentemente. Cooler e quantidades de ventoinhas informados são preservados na consulta e entram no custo e na compatibilidade; não são omitidos para caber no orçamento. Se nenhuma alternativa verificada couber, somente essa seção fica indisponível. A resposta não aplica nenhuma substituição.

`POST /recommendations/budget` e `/recommendations/by-usage` acrescentam `requestedBudget: { amount, currency: "BRL" }`, `compatibilityStatus` e `unverifiedChecks`. Recomendações por faixa acrescentam `requestedBudgetRange: { min, max, currency: "BRL" }`. A lista de prioridades inclui `balanced`. Os tipos de uso incluem `gaming`, `work`, `video-editing`, `programming`, `design`, `general`, `study`, `streaming`, `upgrade` e `productivity`.

As recomendações comparam referências em reais, não fazem câmbio. Moeda diferente de BRL em `budget.currency` ou `budgetRange.currency` retorna **400**. No resumo, orçamento em outra moeda não derruba análises técnicas: `budgetStatus` retorna `available: false`, `status: "unavailable"`, `reason: "currency_mismatch"` e `remaining: null`. O cadastro genérico de orçamento continua aceitando códigos de moeda; isso não autoriza compará-los com preços em BRL.

A interface consulta `/purchase-links/build` independentemente de `/build-summary`. Uma falha de resumo não elimina links já recebidos, e uma falha de lojas não elimina o resumo. Há estados distintos de carregamento, erro com nova tentativa e resultado vazio. Links continuam pesquisa de loja, não prova de preço, estoque, compatibilidade ou recomendação de compra.

Exportação JSON com `includeSummary: true` também preserva o resumo técnico quando somente o orçamento/análise opcional é inválido. `summary` inclui `selectionStatus`, `analysisStatus`, `sections` e `budgetStatus`, quando informado. Uma resposta parcial acrescenta `warnings` com os nomes das seções afetadas e erros controlados, sem tratar o orçamento inválido como aprovado. O relatório técnico preserva `pricing.available: false`, o motivo e `remaining: null` para orçamento indisponível; a nota consolidada que depende desse orçamento também fica indisponível. `pricing.currency` continua BRL e `budgetCurrency` identifica separadamente a moeda do orçamento.

CPUs admitidas na expansão V3 exigem evidência de BIOS também ao selecionar uma placa-mãe de catálogo anterior. Socket AM5 igual não prova suporte para 7800X3D/9900X: sem versão mínima e instalada verificáveis, retorna `CPU_BIOS_UNVERIFIED`, sem inventar incompatibilidade definitiva ou liberar simulação.

### V3 — Justificativas por peça e impacto de alternativas

As duas recomendações de orçamento e a recomendação por faixa acrescentam `selectionExplanation`. O resumo também expõe esse campo para a montagem atual, sem transformar uma seleção do usuário em recomendação automática.

- `version: "selection-explanation-v1"`, `selectionSource: "recommendation" | "current_selection"`, `usageType`, `priority`, `scope` e `selectionRule`: identificam a origem e os limites da explicação. A busca de conjuntos usa um subconjunto do catálogo e não garante ótimo global nem melhor compra no mercado.
- `budget`: `currency: "BRL"`, `limit`, `min` (quando há faixa), `total`, `knownReferenceSubtotal`, `coolingSubtotal`, `remaining` e `status`. Cooler e packs de ventoinhas entram com suas quantidades completas. Preço ausente mantém total/saldo `null` e `status: "unavailable"`, não zero. `status` também pode ser `within_budget`, `over_budget` ou `below_range`.
- `compatibility`: `status`, `checks`, `coolingStatus` e `coolingWarnings`. O estado principal e as pendências específicas de refrigeração continuam distintos; uma falha de serviço é `unavailable`, não incompatibilidade comprovada.
- `componentReasons`: uma entrada por peça, incluindo cooler e cada pack selecionado. Cada entrada tem `slot`, `componentId`, `name`, `quantity`, `facts`, `role`, `selectionReason`, `profile`, `performance`, `budget`, `compatibility` e `tradeoff`.
  - `facts` contém apenas especificações cadastradas, como socket, núcleos, VRAM, capacidade e dimensões. Ausência não é preenchida por suposição.
  - `selectionReason` identifica a posição real da peça na ordenação da categoria, a quantidade de candidatos elegíveis e o tamanho do subconjunto comparado. Esses valores também estão em `components[slot].recommendationMeta.categoryRank`, `rankedCandidatesCount` e `shortlistedCandidatesCount`. A ordenação precede a compatibilidade do conjunto: estar nessa lista não aprova qualquer troca.
  - `profile.weight` descreve a parcela ponderada de custo-benefício. A prioridade `lowest-price` não utiliza essa parcela no score final, e o texto informa essa distinção. A ordenação por perfil não certifica requisitos de uma aplicação.
  - `performance.basis` distingue `simulated`, `neutral_heuristic`, `unavailable` e `not_scored`. `score` é `null` sem modelo válido e para refrigeração; um peso auxiliar neutro não mede qualidade. `provisional` identifica perfis provisórios já existentes. Nenhum desses campos cria benchmark, FPS ou ganho térmico.
  - `budget` da peça inclui `unitPrice`, `quantity`, `lineTotal`, `shareOfTotalPercent`, `source`, `observedAt` e mensagem. Percentual é participação no custo total, nunca percentual de desempenho.

Nas recomendações, cada peça principal pode incluir `alternative`, `comparedCandidates`, `excludedAlternatives` e `alternativeScope: "single_part_replacement_preserving_other_parts_and_cooling"`. Trata-se de uma **troca individual** no conjunto retornado, preservando todas as outras peças e a refrigeração. A alternativa é escolhida entre trocas verificadas, priorizando uma economia de custo próxima; não é uma segunda classificação de melhores builds. Retorna identidade, especificações, preço de referência, total recalculado, `priceDelta`, `remainingBudget`, `withinBudget`, `withinRange`, `scoreDelta`, estado e explicação. Uma troca verificada tecnicamente pode ultrapassar o orçamento ou ficar abaixo do mínimo da faixa; isso é explicitado. Diferenças de índice são pontos do modelo, não percentuais de ganho real.

`excludedAlternatives` preserva nome, especificações, preço e `reasons: [{ code, message }]` para trocas incompatíveis, não verificadas, sem preço ou sem modelo. Por exemplo, `CPU_BIOS_UNVERIFIED` e `PERFORMANCE_MODEL_UNAVAILABLE` explicam por que uma CPU nova não entra como alternativa direta aprovada. Isso **não prova** que o modelo seja inviável em todas as combinações. Peças sem modelo utilizável não recebem nota fabricada para entrar na classificação.

No resumo, `recommendationObservation.comparison` compara o conjunto alternativo com a montagem recebida no mesmo perfil: `currentTotal`, `recommendedTotal`, `priceDelta`, `simulatedScoreDelta`, `changedSlots`, `scope` e `message`. Ausência de preço/modelo deixa a diferença correspondente `null`. Esse bloco é informativo e não aplica trocas. A explicação de `current_selection` diz expressamente que as peças foram escolhidas pelo usuário.

A interface usa detalhes progressivos para custos, motivo de seleção e exclusões. Explicações são vinculadas à seleção analisada: mudanças reais de orçamento, perfil ou peças exigem nova análise. Se uma resposta anterior omite a refrigeração que o cliente vai manter, as justificativas antigas de custo/compatibilidade são ocultadas e a interface pede recálculo, em vez de reaproveitar uma aprovação obsoleta. Respostas antigas sem o campo mantêm uma mensagem de explicação indisponível.

Regressões: `tests/v3-recommendation-explanations.test.js` (contrato e cenários reais/controlados) e `frontend/tests/recommendation-explanation.test.js` (renderização React SSR). `frontend/tests/e2e/recommendation-explanations-v3.spec.js` prepara navegação por teclado, legibilidade e invalidação após edição para execução em navegador autorizado; coleta de casos não equivale a execução visual.

A explicação por peça também é uma análise opcional isolada: falha inesperada retorna `selectionExplanation.available: false`, `reason: "analysis_failed"` e `retryable: true`; `sections.selectionExplanation` fica indisponível sem apagar seleção, preços, links ou análises independentes.


### Complementação de recomendações V3 (21/10/2026)

`POST /recommendations/budget`, `/recommendations/by-usage` e recomendações por faixa aceitam `requirements: { minMemoryGb: 8 | 16 | 32 | 64 }`. Sem ajuste, estudo/uso geral usam mínimo de 8 GB; demais perfis, 16 GB. É requisito de seleção editável, não benchmark. Valor numérico fora da lista retorna 400. A resposta acrescenta `memoryRequirement: { minimumGb, policy }` e `simulationAvailability`, que comunica falta de modelo antes da aplicação.

Nas recomendações de orçamento/uso, `allowPendingCooling: true` permite apresentar uma proposta com acessório preservado somente quando todas as pendências pertencem à refrigeração, não há alerta de conflito e as sete peças principais são compatíveis independentemente. O padrão é `false` (estrito), e valor não booleano retorna 400. A resposta permanece `compatibilityStatus: "unverified"` com `unverifiedChecks` e custo do acessório; a opção não relaxa BIOS, alimentação ou conflito físico confirmado. Recomendações por faixa continuam estritas quanto à refrigeração.


### Seleção factual e diagnóstico econômico (21/10/2026)

`POST /recommendations/budget` e `/recommendations/by-usage` aceitam `selectionMode: "performance-ranked" | "price-and-compatibility"`; padrão mantém índices anteriores. O segundo modo busca menor total no catálogo ativo sem filtro/score de desempenho, com os mesmos encaixes/energia e mínimos de capacidade. `requirements.minVramGb` aceita 0/4/6/8/12/16 (padrão 0), além de `minMemoryGb`. VRAM também filtra recomendações por faixa; a faixa rejeita explicitamente o modo factual (400), em vez de ignorá-lo.

Proposta factual retorna `performanceScore: null`, `performanceBasis: "not_used"`, `selectionMode`, `minimumVramGb`, `coreCatalogRulesStatus`, `compatibilityStatus: "unverified"`, `biosSupport` publicado quando conhecido e `unverifiedChecks` com BIOS instalada não inspecionada. Refrigeração e ausência de modelo permanecem separadas. Não é certificado de compra ou desempenho. Falha 422 retorna conclusão com piso/diferença/motivos em `message`/`errors`; no navegador, motivos ficam sob divulgação progressiva. O serviço interno retém `budgetFeasibility` para evidência, sem acrescentá-lo ao envelope HTTP. Exemplos completos em [cenários econômicos](evidence/v3-economy/scenarios.json).
