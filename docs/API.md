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

## Regras iniciais de compatibilidade

A primeira versão da API valida:

- socket do processador com socket da placa-mãe;
- tipo de memória RAM com tipo aceito pela placa-mãe;
- potência estimada da fonte;
- tamanho da placa-mãe com gabinete;
- interface de armazenamento com suporte da placa-mãe.
