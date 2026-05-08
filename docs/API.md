# Documentação inicial da API - PCPowerLab

## Padrão de resposta

### Sucesso

```json
{
  "success": true,
  "data": {},
  "message": "Operação realizada com sucesso."
}
```

### Erro

```json
{
  "success": false,
  "data": null,
  "message": "Não foi possível concluir a operação.",
  "errors": []
}
```

## Entidades principais

### Component

Representa uma peça de hardware da base da plataforma.

Campos principais:

- `id`: identificador único;
- `name`: nome comercial;
- `category`: categoria da peça;
- `brand`: fabricante;
- `price`: preço estimado;
- `specs`: especificações técnicas usadas nas regras.

### Build

Representa a configuração escolhida pelo usuário.

Campos principais:

- `cpu`;
- `motherboard`;
- `gpu`;
- `ram`;
- `storage`;
- `psu`;
- `case`.

### CompatibilityRule

Representa uma regra técnica de compatibilidade preparada para validações futuras.

Campos principais:

- `id`: identificador único da regra;
- `name`: nome técnico da regra;
- `sourceType`: tipo do componente de origem;
- `targetType`: tipo do componente de destino ou `build`;
- `field`: campo técnico analisado no componente de origem;
- `targetField`: campo técnico analisado no destino;
- `operator`: operador usado na comparação;
- `severity`: severidade do alerta, podendo ser `low`, `medium` ou `high`;
- `active`: indica se a regra está ativa;
- `priority`: prioridade de execução futura;
- `message`: mensagem em português para o usuário.

## Categorias aceitas

- `cpu`
- `gpu`
- `motherboard`
- `ram`
- `storage`
- `psu`
- `case`

## Operadores de regras aceitos

- `equals`
- `includes`
- `lessThanOrEqual`
- `greaterThanOrEqual`

## Endpoints de componentes

### Listar todos os componentes

`GET /api/components`

Retorna todos os componentes disponíveis na base mockada.

### Filtrar componentes por tipo

`GET /api/components?type=cpu`

O parâmetro `type` aceita as categorias cadastradas na API: `cpu`, `gpu`, `motherboard`, `ram`, `storage`, `psu` e `case`.

Para manter compatibilidade com versões anteriores, o parâmetro `category` também continua funcionando.

### Buscar componente por ID

`GET /api/components/:id`

Retorna um único componente quando o identificador informado existir. Caso o ID não exista, a API retorna erro controlado com status `404`.

### Exemplo de resposta

```json
{
  "success": true,
  "data": [
    {
      "id": "cpu-ryzen-5-5600",
      "name": "AMD Ryzen 5 5600",
      "category": "cpu",
      "brand": "AMD",
      "price": 799.9,
      "specs": {
        "socket": "AM4",
        "cores": 6,
        "threads": 12,
        "baseClockGhz": 3.5,
        "tdpWatts": 65
      }
    }
  ],
  "message": "Componentes encontrados com sucesso."
}
```

## Endpoints administrativos de componentes

As rotas administrativas manipulam a base mockada em memoria e preservam a consulta publica de componentes ativos.

### Listar componentes administrativos

`GET /api/v1/admin/components`

Aceita os filtros opcionais `type`/`category` e `active=true|false`.

### Buscar componente administrativo por ID

`GET /api/v1/admin/components/:id`

Retorna componentes ativos ou inativos.

### Cadastrar componente

`POST /api/v1/admin/components`

Campos comuns: `id`, `name`, `type`, `brand`, `estimatedPrice`, `active` e campos tecnicos do tipo. O campo `id` e opcional; quando omitido, a API gera um ID simples por categoria.

### Editar componente

`PUT /api/v1/admin/components/:id`

Atualiza apenas componentes existentes e aceita atualizacao parcial.

### Desativar componente

`DELETE /api/v1/admin/components/:id`

Realiza desativacao logica (`active: false`) para preservar historico futuro.

### Campos tecnicos obrigatorios por tipo

- `cpu`: `socket`, `cores`, `threads`, `baseClock`, `boostClock`, `tdp`
- `gpu`: `vram`, `tdp`, `length`, `recommendedPsu`
- `motherboard`: `socket`, `memoryType`, `formFactor`, `chipset`
- `ram`: `memoryType`, `capacity`, `speed`
- `storage`: `interface`, `capacity`, `specs.type` ou `storageType`
- `psu`: `wattage` ou `watts`, `efficiency`
- `case`: `supportedFormFactors`, `maxGpuLength`

## Endpoints de builds

### Selecionar componentes

`POST /api/v1/builds/selection`

Recebe os IDs dos componentes selecionados pelo usuario, valida se existem na base e retorna a configuracao organizada, sem executar regras de compatibilidade.

```json
{
  "cpuId": "cpu-ryzen-5-5600",
  "gpuId": "gpu-rtx-4060",
  "motherboardId": "mb-b550m-aorus-elite",
  "ramId": "ram-kingston-fury-16gb-ddr4",
  "storageId": "ssd-kingston-nv2-1tb",
  "psuId": "psu-corsair-650w",
  "caseId": "case-mid-tower-airflow"
}
```

Tambem aceita o formato aninhado em `components`, usando os slots `cpu`, `motherboard`, `gpu`, `ram`, `storage`, `psu` e `case`.

### Verificar compatibilidade

`POST /api/v1/builds/check-compatibility`

Recebe uma configuracao selecionada e executa as regras tecnicas iniciais de compatibilidade.

## Endpoints de regras de compatibilidade

### Listar regras existentes

`GET /api/v1/compatibility-rules`

Retorna as regras cadastradas na base mockada. A rota aceita filtros opcionais:

- `sourceType`: filtra pelo componente de origem;
- `targetType`: filtra pelo componente de destino;
- `active`: filtra por regras ativas ou inativas usando `true` ou `false`.

### Cadastrar nova regra

`POST /api/v1/compatibility-rules`

Campos obrigatórios: `name`, `sourceType`, `targetType`, `field`, `operator`, `severity` e `message`.

O campo `id` é opcional. Quando não informado, a API gera um identificador no padrão `rule-000`.

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

## Regras iniciais de compatibilidade

A primeira versão da API valida e agora também cadastra/lista regras para:

- socket do processador com socket da placa-mãe;
- tipo de memória RAM com tipo aceito pela placa-mãe;
- potência estimada da fonte;
- tamanho da placa-mãe com gabinete;
- tamanho da placa de vídeo com gabinete, quando a informação existir;
- interface de armazenamento com suporte da placa-mãe.