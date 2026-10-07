# Versão 2 — etapa 1 de interface (RA2 / Ciclo 2)

Implementação e validação local em 07/10/2026, na branch `codex/pcpowerlab-ra2-ciclo2`, a partir de `407d771`. O checkout estava limpo antes do trabalho. O escopo corresponde aos problemas de interface do Ciclo 1 descritos na solicitação.

## Inspeção e decisões

O frontend utiliza React, Vite e React Router. `App.jsx` define as rotas; `AppLayout` compartilha a navegação; `components/ui` concentra controles e estados; `ComponentCard` atende catálogo e assistente. As cores e os espaçamentos ficam em `theme.css`, os layouts em `global.css` e os detalhes arcade em `arcade.css`. A seleção da build continua no `BuildProvider`/localStorage e as chamadas à API continuam nos services existentes.

Foram identificados menu público com 11 opções, Admin exposto na navegação, brilho excessivo, cards dimensionados pelo conteúdo, limites mínimos de grid que causavam overflow em 320 px e modais sem gestão de teclado/foco. A correção usa a base compartilhada para alcançar todas as páginas.

- Identidade preservada: fundo escuro, grade tech discreta, ciano, verde, ícones de hardware e console arcade. Painéis opacos, menor brilho, títulos com entrelinha legível e hierarquia de botões mais clara.
- Cards: mesma área de título (duas linhas), marca, cinco linhas de especificações, preço e ações. Nomes e especificações extensos ficam limitados na grade; o botão **Detalhes** abre o conteúdo completo, também em toque e teclado. Ícones distinguem as categorias. Seleção usa texto, ícone e `aria-pressed`.
- Navegação com cinco entradas principais, descrições nos grupos, indicação da rota atual e menu compacto até 1040 px. Suporta Tab, Enter, Escape, fechamento externo e ao sair do cabeçalho. O link de salto e o foco após navegação ajudam a chegar ao conteúdo.
- Controles com altura mínima de 44 px, foco amarelo, campos associados a rótulos e mensagens, seleção anunciada e respeito a movimento reduzido nas animações/transições CSS.
- Modais nativos com página de fundo inerte, ciclo de Tab/Shift+Tab, Escape, fechamento externo, retorno ao acionador e suporte a modais sobrepostos de versões/snapshots.
- Catálogo distingue carregamento, falha, vazio e sucesso. Falha ao consultar lojas agora permite repetir a consulta, sem ser apresentada como ausência de links. Fechar o modal invalida respostas atrasadas. Busca e filtros têm contagem e limpeza.
- Comparação distingue carregamento/falha/vazio e usa tabela semântica com cabeçalhos. No celular, a rolagem horizontal fica restrita à tabela. Builds salvas limpam o erro ao repetir a consulta e oferecem um caminho de montagem no estado vazio.

## Descoberta das rotas

| Entrada | Destinos |
| --- | --- |
| Marca PCPowerLab | `/` |
| Montar PC | `/build` |
| Explorar | `/components`, `/ready-builds`, `/insights` (Custo-benefício) |
| Minhas builds | `/summary`, `/saved-builds` |
| Analisar | `/performance-lab`, `/compare`, `/upgrades` |
| Feedback | `/feedback`; formulário `/feedback/new` acessível pelo fluxo existente |
| Rodapé | `/about` |
| Compartilhamento | `/shared/:shareId`, pelos links gerados no fluxo existente |
| Administração | `/admin`, por acesso direto com autenticação existente |

Nenhuma rota foi removida ou renomeada. `App.jsx`, serviços, backend, autenticação, dependências e launcher não foram modificados. As três famílias administrativas continuam protegidas por `requireAdmin`; ocultar o link público não substitui essa proteção.

## Arquivos alterados

Todos os caminhos abaixo são relativos a `frontend/src/`.

| Arquivos | Finalidade |
| --- | --- |
| `styles/theme.css`, `styles/global.css`, `styles/arcade.css` | Paleta, contraste, hierarquia, grids, cards, navegação, responsividade e foco |
| `components/layout/AppLayout.jsx` | Agrupamento de navegação, remoção do link Admin, teclado e foco de rota |
| `components/componentsCatalog/ComponentCard.jsx` | Estrutura uniforme, ícones, seleção e detalhes completos |
| `components/ui/Input.jsx`, `Select.jsx` | IDs únicos e associação acessível de rótulos/descrições |
| `components/ui/Modal.jsx` | Dialog nativo e gestão de foco/teclado |
| `components/ui/Card.jsx`, `EmptyState.jsx` | Atributos semânticos e ação no estado vazio |
| `pages/ComponentsCatalog.jsx` | Filtros, contagem, limpeza e estados de consulta de lojas |
| `pages/BuildWizard.jsx` | Grade compartilhada, etapa anunciada e texto de orientação |
| `pages/CompareBuilds.jsx` | Estados de consulta, seleção anunciada e tabela responsiva |
| `pages/SavedBuilds.jsx` | Recuperação de falha e orientação do estado vazio |
| `pages/PerformanceLab.jsx` | Semântica do grupo de seleção de jogos |

Este relatório e `docs/evidence/ra2-ciclo2/` registram decisões e evidências.

## Validação

| Verificação | Resultado |
| --- | --- |
| `npm test` | **247/247 passaram**, incluindo sessão, logout, rate limit e proteção administrativa |
| `npm run lint` | Passou |
| `npm --prefix frontend run lint` | Passou |
| `npm --prefix frontend run build` | Passou; permanece o aviso conhecido de chunk maior que 500 kB |
| `git diff --check` | Passou |
| Navegador: 16 rotas × 5 larguras | **80 verificações** sem erro JavaScript e sem overflow horizontal da página |
| Build preenchida: resumo, Performance Lab, upgrades e assistente × 5 larguras | **20 verificações adicionais** sem overflow horizontal da página após o redimensionamento dos gráficos |
| Interação no Chrome | **11 grupos de verificações passaram**, detalhados abaixo |
| axe-core 4.14.0 | **32 verificações** (16 rotas em 1440 e 390 px), sem violações automáticas nas regras WCAG 2 A/AA, 2.1 AA e 2.2 AA executadas |
| Modal e movimento reduzido | Modal sem violações automáticas; transições CSS reduzidas a 0,01 ms com a preferência ativa |

Resoluções usadas: **1440 × 1000, 1024 × 1000, 768 × 1000, 390 × 1000 e 320 × 1000**, além do menu em 390 × 667. Foram visitadas todas as páginas públicas principais, `/admin`, `/feedback/new`, compartilhamento inexistente e a página 404. Compartilhamento válido também foi verificado após gerar um link pela interface.

Os grupos de interação cobrem navegação e foco; busca/filtros/vazio; modais e retorno de foco; lojas com carregamento/falha/repetição/resposta tardia; catálogo com falha/repetição; cards com nomes e especificações extremos; menu móvel; seleção/remoção/persistência/avanço no assistente; aplicação de build pronta, resumo, salvamento, exportação e compartilhamento; comparação; e acesso administrativo direto. Também foram verificados os modais sobrepostos de versões/snapshot.

O teste de cards incluiu categorias diferentes, especificações ausentes e textos de centenas de caracteres, interceptados apenas no navegador. Alturas e posições relativas de preço/botões permaneceram iguais nas cinco larguras. Os textos completos continuaram disponíveis no modal. Dados criados nos fluxos de teste ficaram somente na API local em memória.

### Contraste

Razões calculadas a partir dos tokens finais contra o painel mais claro (`#192941`):

| Elemento | Razão |
| --- | --- |
| Texto principal | 13,12:1 |
| Texto secundário | 8,36:1 |
| Ciano | 9,40:1 |
| Verde | 9,51:1 |
| Erro | 7,21:1 |
| Placeholder | 6,09:1 |
| Contorno de controles | 4,00:1 |
| Texto escuro no botão ciano | 12,38:1 |

O axe deixa alguns contrastes sobre gradientes como inconclusivos. Eles não foram contados como aprovação automática. Para o texto secundário no fundo geral, a composição conservadora dos dois acentos radiais e das duas linhas da grade sobre a cor-base mais clara resulta em **7,66:1**. A inspeção visual complementou a medição dos tokens.

Referências de implementação: [navegação por disclosures do WAI](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/) e [dialog nativo — MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog).

### Evidências visuais

| Tela | Antes | Depois |
| --- | --- | --- |
| Catálogo desktop, 1440 px | [Screenshot](evidence/ra2-ciclo2/antes-catalogo-desktop.png) | [Screenshot](evidence/ra2-ciclo2/depois-catalogo-desktop.png) |
| Montagem mobile, 390 px | [Screenshot](evidence/ra2-ciclo2/antes-montagem-mobile.png) | [Screenshot](evidence/ra2-ciclo2/depois-montagem-mobile.png) |

Outras capturas: [início em tablet](evidence/ra2-ciclo2/depois-inicio-tablet.png), [menu móvel aberto](evidence/ra2-ciclo2/depois-menu-mobile.png), [cards e ações alinhados](evidence/ra2-ciclo2/depois-cards-alinhados.png) e [detalhes no celular](evidence/ra2-ciclo2/depois-detalhes-mobile.png). Os resultados estruturados estão em [validation.json](evidence/ra2-ciclo2/validation.json).

### Reprodução e limites

Com as dependências instaladas, execute `npm run dev` na raiz e `npm --prefix frontend run dev` em outro terminal. Abra `http://127.0.0.1:5173`, aplique as resoluções acima e percorra a matriz de rotas e os grupos de interação. Para estados de rede, bloqueie ou intercepte as requisições do catálogo e de lojas; confirme mensagem, repetição e fechamento do modal durante a consulta. Para fluxos completos, aplique uma build pronta e gere o resumo.

As verificações de navegador utilizaram Playwright com Chrome local e axe-core instalado em diretório temporário, sem adicionar dependências ao projeto. O teste HTTP da suíte exigiu execução fora do sandbox, que inicialmente bloqueou `listen` em loopback com `EPERM`; a suíte completa passou após liberar essa execução.

A evidência é local, em Chrome com resoluções emuladas. Não representa teste em aparelhos físicos, outros motores, leitores de tela ou certificação integral de acessibilidade. Nenhuma regressão foi detectada na suíte existente e nos fluxos exercitados. Não houve publicação nem alteração do backend.
