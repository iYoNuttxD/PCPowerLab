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

## Categorias aceitas

- `cpu`
- `gpu`
- `motherboard`
- `ram`
- `storage`
- `psu`
- `case`


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

## Regras iniciais de compatibilidade

A primeira versão da API valida:

- socket do processador com socket da placa-mãe;
- tipo de memória RAM com tipo aceito pela placa-mãe;
- potência estimada da fonte;
- tamanho da placa-mãe com gabinete;
- interface de armazenamento com suporte da placa-mãe.
