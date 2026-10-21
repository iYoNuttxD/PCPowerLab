# V3 P2: hierarquia visual e acessibilidade

**Atualização:** [inspeção no Mac concluída](V3-MAC-BROWSER-VALIDATION.md) com Chrome, teclado e zoom nativo de 200%. O bloqueio de navegador descrito abaixo pertence à etapa anterior na nuvem.

## Escopo implementado

A revisão atua no assistente, catálogo, resumo e recomendações. A estrutura da página inicial, o console ilustrativo, as quatro áreas de apresentação e as imagens/créditos existentes não foram substituídos. O cabeçalho compartilhado pode quebrar em duas linhas quando o texto aumenta, sem alterar seus destinos.

- Hierarquia: título da tarefa, contexto de orçamento e conteúdo principal têm níveis distintos. Busca, filtros aplicados e resultados têm superfícies e espaçamento próprios. Resumo e recomendações usam a mesma escala de títulos, métricas e detalhes.
- Densidade: cartões crescem com nomes completos; não dependem de truncamento em duas linhas. Marca, especificações e botões podem quebrar linha. Fotografias mantêm sua moldura e créditos originais. Os nomes completos continuam disponíveis nos detalhes.
- Cores: ciano para ação/navegação; verde para seleção/conclusão; amarelo para pendência/atenção; vermelho para erro/conflito. Preços e categorias comuns deixam de competir com os estados. Títulos, ícones, texto e semântica acessível distinguem estados, não apenas a cor.
- Estados: erro, sucesso, informação e atenção usam borda sólida e uma superfície levemente tonalizada. Carregamento e vazio têm texto explícito, sem anunciar sucesso. Botões desabilitados continuam legíveis. Revisão pendente não vira conclusão pela apresentação.
- Explicações: custos, efeito em relação à montagem atual, motivos por peça e alternativas descartadas são agrupados por detalhes nativos. Os nomes longos quebram linha e os controles de expansão mantêm alvo de 44 px.
- Responsividade: a navegação fixa do assistente passa a estática em altura de até 600 px. Há regras para 320 px, notebook e telas largas; a geometria final ainda requer execução real dos testes abaixo.
- Ordem das folhas: `main.jsx` carrega o estilo global antes de `App`, que importa os estilos de página. A saída de produção foi inspecionada para confirmar que as regras V3 vêm depois da base.

## Contraste mensurável

Comando: `node frontend/scripts/check-visual-contrast.mjs --write`.

Resultado atual: **64 de 64 verificações aprovadas**. As entradas vêm dos tokens e declarações reais em `theme.css`, `global.css` e `journey.css`; o relatório completo fica em `V3_VISUAL_CONTRAST.json`.

| Grupo | Limiar aplicado | Menor resultado |
| --- | --- | --- |
| Texto normal nas combinações auditadas | 4,5:1 | 7,08:1 |
| Métrica grande em negrito | 3:1 | 15,47:1 |
| Limite visual de controle | 3:1 | 4,00:1 |
| Indicador de foco contra superfície adjacente | 3:1 | 9,73:1 |

Método: canais sRGB linearizados, luminância relativa com pesos 0,2126/0,7152/0,0722 e razão `(Lmais clara + 0,05) / (Lmais escura + 0,05)`. As superfícies de estado usam composição alfa sobre o painel opaco, em vez de comparar a cor transparente como se fosse sólida. A opacidade do botão desabilitado também é composta sobre a superfície; isso é uma meta adicional de legibilidade, pois controles desabilitados são exceção aos limiares normativos.

O contorno de foco tem 3 px e afastamento de 3 px. A medição usa o fundo escuro adjacente, não a cor ciano dentro do botão. Controles mantêm borda forte; separadores decorativos usam borda discreta e não são apresentados como aprovação de contraste de controle. Controles negativos no teste demonstram que branco sobre o botão ciano e a borda decorativa usada como limite de controle falhariam.

Este é um teste de combinações especificadas, não uma certificação WCAG do site inteiro. Não mede renderização de fontes, imagens, todos os gráficos, a cascata computada de cada elemento, modo de cores forçadas do sistema ou tecnologias assistivas reais.

## Semântica, teclado e foco

Correções nos componentes compartilhados:

- `Input` e `Select` vinculam rótulo, ajuda, erro e descrições externas. A ajuda continua disponível durante um erro, em vez de desaparecer. Validação recebida externamente não é sobrescrita por um falso negativo.
- Erro de campo é textual, associado por `aria-describedby`, identificado por `aria-invalid` e usa anúncio educado. A severidade não depende da borda vermelha.
- Diálogo nativo tem título acessível, retorno ao acionador conectado e restauração da rolagem. O tratamento de Tab inclui `summary`, que antes podia ficar fora do ciclo. Há proteção para ausência de controles disponíveis.
- Escape segue o evento nativo `cancel` e fecha pelo callback. Clique no conteúdo não fecha o diálogo; somente o fundo externo é tratado como descarte.
- Painéis de abas são alcançáveis por Tab, mesmo quando começam por texto. A aba selecionada continua o único ponto de entrada no grupo; setas, Home e End mantêm o comportamento existente.
- Foco visível inclui links, botões, campos, expansões e regiões focalizáveis. Modo de cores forçadas usa `Highlight` do sistema; a redução de movimento existente foi preservada.

Inspeção/execução isolada também confirmou: link para pular ao conteúdo, rótulos de campos, ausência de `tabindex` positivo nos componentes revisados, Escape/retorno ao resumo de filtros e etapas, seleção por botões nativos, estado `aria-pressed`, mensagens de carregamento com `status` e erro com `alert`. Esses resultados não substituem navegação real com leitor de tela.

## Evidências executadas

- `node --test frontend/tests/visual-accessibility.test.js frontend/tests/journey-v3.test.js frontend/tests/task-tabs.test.js`: 21 testes aprovados, incluindo nove testes novos de contraste, CSS, SSR e handlers reais.
- `node --test frontend/tests/*.test.js`: 205 testes aprovados nesta rodada, zero falhas. O total pode crescer com outras frentes da V3.
- `check-navigation-wizard.mjs`, `check-saved-build-interactions.mjs`, `check-catalog-render.mjs`, `check-public-admin-ux.mjs` e `check-insights-ranking.mjs`: aprovados. A asserção de erro do ranking foi atualizada para aceitar o novo atributo acessível, sem retirar a validação da mensagem.
- `check-page-audit.mjs`: SSR de 17 rotas e 32 pares opacos de texto aprovados; esse auditor antigo não mede geometria.
- Lint frontend e build de produção aprovados. O alerta existente de bundle maior que 500 kB permanece.
- `npx playwright test tests/e2e/visual-accessibility-v3.spec.js --list`: dez casos coletados, cinco cenários em desktop e mobile. Coleta não significa execução.

## Histórico: navegador bloqueado na nuvem

O coordenador registrou que o Chromium local foi impedido pelo ambiente ao criar o socket do processo e que a tentativa de escalonamento foi negada. Esta frente não repetiu nem contornou a operação negada e não usou o computador do usuário.

Os testes Playwright adicionados cobrem, quando executados em ambiente permitido:

1. Link para pular ao conteúdo, ordem Orçamento → Prioridade → Tipo de uso e ausência de índices de Tab positivos.
2. Foco realmente computado, largura/afastamento do contorno e contraste contra a superfície adjacente.
3. Ciclo de foco do diálogo e Escape de volta ao botão exato de detalhes.
4. Catálogo em 320, 768, 1440 e 1920 px, nomes não cortados, alvos de 44 px e tamanho de texto de 200%, com capturas anexadas pelo teste. Aumento de fonte não é alegado como zoom real do navegador.
5. Altura de 500 px, navegação não fixa e campo de busca visível sem overflow global.

Ainda não verificados: aparência/ritmo visual no navegador, responsividade real, zoom de navegador, leitor de tela, comportamento de foco nativo, contraste computado completo, capturas finais e testes humanos. Antes de marcar P2 como validado visualmente, executar esses cenários no SHA final e registrar as evidências. Sem commit, push, merge ou deploy nesta frente.

## Execução posterior no Mac

Os dez casos de `visual-accessibility-v3.spec.js` passaram dentro da suíte final de 305 E2E aprovados e 1 skip esperado. Inspeção no Chrome do usuário confirmou foco do diálogo, Escape ao acionador, filtros pelo teclado, legibilidade em 390/1366/1920 px e zoom nativo de 200% (855 × 448 CSS na janela normal). A navegação passa a estática na altura reduzida, sem cobrir o formulário. O zoom foi restaurado para 100% após a inspeção.

A borda de erro de 2 px alterava a geometria dos campos. Foi substituída por borda com espessura constante e reforço interno da mesma cor, mantendo mensagem e `aria-invalid`. Os testes de alinhamento passaram em 320/390/768/1024/1440 px. O primeiro orçamento ficou mais compacto, com folga preservada para o foco ao voltar.

Continuam fora do que foi verificado: leitor de tela, cores forçadas reais, todos os pixels/estados possíveis e avaliação humana do ciclo 3. Os 64 contrastes continuam sendo auditoria de tokens/composições. [Capturas e relato de execução](V3-MAC-BROWSER-VALIDATION.md).
