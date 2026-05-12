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
GET /api/performance-parameters
GET /api/performance-parameters/:componentId
POST /api/performance-parameters
PUT /api/performance-parameters/:componentId
DELETE /api/performance-parameters/:componentId
```

Também é possível filtrar a listagem por tipo:

```http
GET /api/performance-parameters?type=gpu
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
