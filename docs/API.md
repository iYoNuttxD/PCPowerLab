# Documentacao da API - PCPowerLab

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
  "data": {},
  "message": "Operacao realizada com sucesso."
}
```

### Erro

```json
{
  "success": false,
  "data": null,
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
- explicacoes simples para resultados tecnicos.
