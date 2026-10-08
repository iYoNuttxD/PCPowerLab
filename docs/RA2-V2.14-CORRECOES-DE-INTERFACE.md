# RA2 V2.14 — Controles, navegação e regressões de interface

Base: `d7bc8a876d67e815ea4ed62becfbb9b46cfb0bff`.

## Defeitos observados no navegador

- Catálogo em 1440, 1024 e 768 px: rótulos quebrados deslocavam controles vizinhos. Em 1440 px, a diferença medida era de 24 px
- Inputs com 50 px e selects com 47 px no catálogo e assistente
- Opção de compatibilidade cortada em 320 px
- Erros de orçamento no upgrade e comparação deslocavam inputs entre 31 e 51 px acima dos controles vizinhos
- Pesos de perfil em 320 e 768 px quebravam a palavra “Armazenamento” e esticavam inputs vizinhos para 62 px
- Quantidade zero de etapas produzia alerta geral, sem estado inválido nem erro associado ao campo
- Mudanças entre navegação desktop e compacta podiam deixar o foco no corpo da página

## Correções implementadas

- Altura mínima compartilhada para inputs e selects, proporcional à fonte. Textareas, rótulos, mensagens e cards continuam com altura natural
- Catálogo, critérios de comparação, formulários de upgrade e pesos de perfil compartilham linhas de rótulo, controle e mensagem. A disposição do resumo foi preservada
- Pesos de perfil usam largura mínima adequada para o rótulo; a quantidade de etapas tem erro local acessível e validação do intervalo inteiro de 1 a 5 já indicado pelo controle
- Opções curtas de compatibilidade mantêm separados conflitos e dados incompletos; os valores da API não mudaram
- Recuperação de foco após ocultação por mudança de breakpoint, sem recuperar foco antigo depois de uma saída intencional do cabeçalho
- Condições de pagamento e valores técnicos de apresentação em português; preços, códigos e especificações do catálogo preservados
- Fatos técnicos literais de fontes oficiais cobrem 19 modelos substitutos, com controles de mutação

## Testes de navegador corrigidos

A execução da base registrou 193 aprovações, 36 falhas e um teste ignorado. As falhas foram classificadas, sem adicionar ignorados ou aumentar timeouts:

- Rótulos e seletores antigos/ambíguos; seleção de uma galeria fechada em vez da galeria aberta
- Espera pelo catálogo antes de rolar fotografias; rolagem do card visível antes de resolver uma imagem com carregamento adiado
- Medição dos três rótulos visíveis de energia sem depender de classes internas do Recharts
- Contrato de componentes salvos com `fans: []`; análises persistidas invalidadas após recarregamento, seguidas de nova análise explícita
- Saída do assistente confirmada por URL, destino visível e ausência do assistente antes de liberar a resposta antiga

A verificação isolada dessa última condição passou em desktop e mobile na base, fora dos totais anteriores. Não foi necessário alterar o controle de propriedade das requisições do assistente. Verificações adicionais cobrem respostas antigas em quatro etapas, mudança de revisão e preservação de resultados já concluídos; remover os controles de saída/revisão causa falha independente.

## Validação e limites

Testes Node, lint, renderização de servidor e build são apoio técnico; não demonstram alinhamento visual. A regressão geométrica do catálogo cobre 1440, 1024, 768, 390 e 320 px, incluindo faixas de preço inválidas.

A última checagem técnica passou em 666 testes Node, ambos os lints, 14 verificadores de fonte/SSR e build. Foram coletados 220 casos E2E e 18 de integração; coleta não é execução. A auditoria de imagens mantém 97/97 componentes ativos verificados.

O reteste visual e as suítes completas no navegador precisam ser executados no novo commit publicado. Critérios: remover o desnível de 24 px, igualar a geometria dos controles, manter opções legíveis em 320 px, preservar o resumo, alinhar campos com erros de orçamento, manter os pesos legíveis, associar o erro de etapas ao campo e recuperar o foco nos dois sentidos do breakpoint. Sem merge ou deploy.

## Execução real em `67c32efd`

- E2E: 219 aprovações, zero falhas e um teste ignorado
- Integração: 14 aprovações e quatro falhas de asserções desatualizadas, agora corrigidas no teste
- Três falhas comparavam a recomendação sem o `performanceScore` de catálogo que a aplicação acrescenta por ID. A expectativa preserva todos os campos e valida o score contra a resposta independente do catálogo, incluindo valores nulos nas categorias sem score
- Uma falha esperava a URL sem a origem canônica `?source=current`. A nova asserção exige essa origem exata; não aceita consultas arbitrárias
- A reinspeção visual dos pesos de perfil confirmou controles uniformes e texto legível nas cinco larguras. A aceitação visual das demais rotas ainda estava em andamento ao registrar esta atualização

Esta continuação altera somente asserções de integração e documentação. A execução da integração no novo SHA continua necessária.
