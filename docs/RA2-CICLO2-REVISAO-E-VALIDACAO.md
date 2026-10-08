# PCPowerLab V2 — revisão técnica e preparação do Ciclo 2

Revisão local em **07/10/2026**, na branch `codex/pcpowerlab-ra2-ciclo2`. Base da V1: `407d771`. Foram revisadas as quatro etapas da V2 até `8aef579`, além das correções e testes do commit que acompanha este documento. O checkout estava limpo ao iniciar a revisão. Não houve publicação, push, execução de CI ou alteração de um ambiente hospedado.

## Parecer

**Apta tecnicamente para uma rodada controlada de validação com usuários, no escopo exercitado.** Os problemas relevantes encontrados foram corrigidos e os fluxos representativos passaram com frontend compilado e backend real. Não há problema crítico conhecido pendente nos cenários avaliados.

Isso não encerra a validação da V2: compreensão, facilidade, valor percebido e intenção de retorno ainda precisam ser medidos com participantes. Também não constitui homologação de produção, de hardware físico ou certificação integral de acessibilidade. O ambiente que receberá os participantes deve passar pela preparação operacional descrita ao final.

## Origem das melhorias e rastreabilidade

A evidência do Ciclo 1 disponível nesta revisão é o **relato qualitativo fornecido nas solicitações do projeto**. Não foram disponibilizadas respostas individuais, gravações, contagens, taxas de sucesso ou tempos dos participantes. Os temas abaixo são paráfrases desse relato; não são novas respostas nem resultados quantitativos. As capturas anteriores registram o estado da interface, não a percepção dos usuários.

| Problema relatado no Ciclo 1 | Melhoria implementada na V2 | Principais arquivos e comprovação |
| --- | --- | --- |
| Cores/contraste inadequados, organização confusa e cards desiguais | Paleta escura com menor brilho, hierarquia, espaçamento e áreas uniformes de informação/preço/ações; detalhes completos em modal | `theme.css`, `global.css`, `arcade.css`, `ComponentCard.jsx`, controles em `components/ui`; [etapa de UI e capturas antes/depois](RA2-CICLO2-UI.md) |
| Menu com opções demais e Admin exposto | Grupos Explorar, Minhas builds e Analisar; foco, teclado e menu compacto; Admin apenas por acesso direto autenticado | `AppLayout.jsx`, `Modal.jsx`; teste integrado de navegação/administração |
| Dificuldade para encontrar o avanço, rolagem inadequada e pouca orientação | Barra de ações visível, nove etapas, conclusão/progresso, motivos dos bloqueios, descrições das categorias, foco/rolagem e preservação das escolhas | `BuildWizard.jsx`, `WizardNavigation.jsx`, `useBuildState.jsx`, `wizardSteps.js`; [etapa do assistente](RA2-CICLO2-ASSISTENTE.md) |
| Compreensão parcial de termos e resultados técnicos | Explicações progressivas de FPS, gargalo, pontuação, energia, compatibilidade e custo-benefício; legendas, tabelas e identificação de estimativas | `AnalysisHelp.jsx`, painéis de gargalo/jogos, `Insights.jsx`, `BuildSummary.jsx`; [etapa de análises](RA2-CICLO2-ANALISES.md) |
| Interesse em simular um jogo isolado | Modos individual e comparação de 2–10 jogos, compartilhando serviços e resultados; estados de erro/carregamento e descarte de respostas antigas | `PerformanceLab.jsx`, `useSimulationRequest.js`, `GameSimulationResult.jsx`, `GameComparisonResult.jsx` |
| Fotografias, filtros por fabricante, mais RAM/armazenamento e comparações | Imagens opcionais licenciadas, fallback uniforme, filtros combinados e comparação padronizada; catálogo de 63 para 69 peças, incluindo 11 RAMs e 11 armazenamentos | `ComponentImage.jsx`, `ComponentFilters.jsx`, `ComponentComparison.jsx`, `componentPresentation.js`, `components.mock.js`, `performanceParameters.js`; [diagnóstico, fontes e licenças](RA2-CICLO2-CATALOGO.md) |
| Trocar peças recomendadas ao terminar a montagem | Prévia de substituição no resumo, validação pelo backend antes de aplicar e preservação das outras peças | `ComponentReplacement.jsx`, `BuildSummary.jsx`, estado compartilhado; testes com respostas controladas e API real |
| Preços mais próximos do mercado e itens de refrigeração | Valores identificados como estimados; links identificados como buscas; arquitetura e limites documentados para evolução | `BudgetPanel.jsx`, `PurchaseLinksList.jsx`, apresentação de preços; integrações reais e refrigeração adiadas conforme justificativas abaixo |

Commits anteriores revisados: `1c77969` (UI), `41486c8` (assistente), `1f750f0` (análises/jogos), `8aef579` (catálogo). [Inventário de arquivos dessas etapas](evidence/ra2-ciclo2-qa/files-v2.txt).

## Achados corrigidos nesta revisão

São defeitos encontrados no estado revisado, incluindo comportamentos preexistentes. A tabela não atribui todos à introdução da V2.

| ID / prioridade | Problema e impacto | Correção / verificação |
| --- | --- | --- |
| QA-01 / alta | Uma resposta atrasada do resumo podia restaurar análises de peças antigas após navegar e editar a montagem | Respostas de resumo, nota, correções, relatório e exportação vinculadas à configuração submetida e à permanência na página. Teste troca peça durante a consulta e verifica estado persistido e interface |
| QA-02 / alta | Alterar jogo/resolução/qualidade mantinha FPS e resumo da seleção anterior | Invalidação no estado compartilhado e descarte de resposta antiga. Testes verificam ausência do FPS anterior, preservação das peças e persistência após recarregar |
| QA-03 / média | Abrir build salva antes de carregar o catálogo recuperava apenas IDs, sem nomes e preços completos | Abertura aguarda catálogo, apresenta carregamento/falha e permite repetir a consulta. Testes de atraso e falha verificam os objetos recuperados e orçamento |
| QA-04 / média | O hook de requisições relançava falhas já exibidas, causando rejeições de promessa não tratadas em ações da interface | `useApiRequest` devolve erro pelo estado; consumidores revisados. Falha 503 seguida de recuperação preserva a build e não gera `pageerror` |
| QA-05 / média | “Tentar novamente” em recomendações aumentava silenciosamente o orçamento máximo em R$ 500, sem repetir a consulta | Nova tentativa envia os mesmos parâmetros. Teste exige orçamento intacto, segunda requisição equivalente e resultado utilizável |
| QA-06 / média | Cadastro administrativo concluía na API, mas a interface mostrava erro ao acessar `event.currentTarget` depois de `await` | Referência ao formulário capturada antes da operação em cadastro de regra e parâmetro. Teste real cadastra regra, verifica feedback/listagem/reset e remove apenas seu dado temporário |
| QA-07 / média | Total de build salva podia retornar `4699.299999999999`, divergindo dos demais contratos monetários | Arredondamento do total estimado para centavos. Asserção fraca de tipo substituída por valor exato; fluxo integrado compara total salvo, recuperado, comparado e resumido |
| QA-08 / média | Comparação de builds mantinha resultado de critérios/orçamento anteriores, inclusive após resposta atrasada | Reutilização de `useSimulationRequest`, com chave das seleções e critérios. Teste verifica remoção do resultado, descarte da resposta antiga e nova comparação |
| QA-09 / média | Voltar ao assistente após substituir/analisar no resumo podia mostrar revisão incompleta, apesar da análise válida | Progresso reconhece tanto o envelope do assistente quanto o resultado direto de `/build-summary`; bloqueios de compatibilidade/orçamento permanecem. Teste retorna à revisão e exige 9/9 etapas |
| QA-10 / baixa | A nota 100 do critério Compatibilidade quebrava em “10” e “0” no desktop | CSS permite acomodar rótulo/valor sem quebrar o número. Teste mede os fragmentos de linha de todas as notas nas três resoluções; [antes](evidence/ra2-ciclo2-qa/before-score-wrap-1440.png) e [depois](evidence/ra2-ciclo2-qa/desktop-summary-score.png) |

Também foi removida a simulação duplicada durante a geração do resumo: `/build-summary` já devolve o resultado individual. Uma função compartilhada aplica o resumo analisado e mantém os detalhes de indisponibilidade retornados pelo backend. Foi eliminada uma declaração CSS duplicada de opções de substituição; o console decorativo da Home passou a identificar seu número como exemplo ilustrativo. O aviso das estimativas esclarece que simulação não substitui a verificação de compatibilidade no assistente.

### Arquivos desta revisão

| Grupo | Arquivos |
| --- | --- |
| Estado, requisições e fluxos | `frontend/src/hooks/useBuildState.jsx`, `useApiRequest.js`; páginas `BuildSummary.jsx`, `BuildWizard.jsx`, `CompareBuilds.jsx`, `ReadyBuilds.jsx`, `SavedBuilds.jsx`, `Admin.jsx` |
| Clareza e layout | `frontend/src/components/build/AnalysisHelp.jsx`, `frontend/src/pages/Home.jsx`, `frontend/src/styles/global.css` |
| Total monetário | `src/services/savedBuildsService.js`, `tests/savedBuilds.test.js` |
| Testes e execução | `frontend/tests/e2e/qa-regressions.spec.js`, `catalog.spec.js`, `frontend/tests/integration/cycle2.spec.js`, `frontend/playwright.integration.config.js`, `frontend/scripts/qa-visual.mjs`, `frontend/package.json`, `frontend/eslint.config.js`, `.gitignore` |
| Documentação | Este relatório, evidências, `frontend/README.md` e correção dos links de testes nos relatórios de assistente/análises |

## Arquitetura, contratos e preservação funcional

- Rotas públicas e administrativas preservadas; agrupamento do menu não remove destinos. `App.jsx` continua definindo as mesmas rotas.
- As sete categorias obrigatórias e IDs antigos permanecem válidos. Nenhuma fórmula de compatibilidade, orçamento, recomendação, pontuação ou upgrade foi substituída no frontend.
- Montagem continua no `BuildProvider` e `localStorage`; trocar peça/orçamento invalida análises pertinentes. Mudar parâmetros de jogo não apaga peças nem a compatibilidade já verificada.
- `/performance/simulate-game` recebe `gameId`, `targetResolution`, `qualityPreset`, `build`; `/performance/compare-games` recebe `gameIds` e os mesmos parâmetros. Resultados, classificações e avisos vêm da API. A nova implementação não duplica algoritmos.
- Resumo e prévia de substituição reutilizam `/build-summary`. A candidata incompatível não é aplicada; orçamento excedido é mostrado explicitamente sem aumentar o valor informado. Estimativa de jogo pode existir sem aprovação física da montagem; o aviso agora orienta a verificar compatibilidade.
- Os IDs `cpuId` etc. enviados às APIs são normalizados conforme cada serviço; a resposta de build salva usa chaves `cpu`, `gpu` etc. Os testes integrados verificam esse contrato e os objetos reidratados no frontend.
- A única alteração de serviço nesta revisão é normalizar o total salvo em centavos. Nenhum endpoint, autenticação ou contrato de payload foi removido.
- As APIs de componentes administrativos, regras e parâmetros continuam protegidas por `requireAdmin`. Testes verificam 401 sem sessão, senha inválida, login, sessão persistida no recarregamento, cookie HttpOnly/Secure/SameSite e logout. Ocultar Admin no menu não é o mecanismo de proteção.

## Qualidade e resultados dos testes

A linha de base passou em **255 testes de backend e 74 E2E de interface**, mas ainda continha os defeitos acima. Cinco novos cenários falharam contra o código original: [reproduções](evidence/ra2-ciclo2-qa/reproductions.log). Também há evidência de falha real para [orçamento alterado no retry](evidence/ra2-ciclo2-qa/budget-reproduction.log), [cadastro administrativo](evidence/ra2-ciclo2-qa/admin-reproduction.log) e [nota quebrada](evidence/ra2-ciclo2-qa/score-reproduction.log). Depois das correções, as suítes passaram.

As respostas controladas são usadas para tornar atrasos, indisponibilidade, dados ausentes e limites reproduzíveis. As asserções novas verificam comportamento visível e estado preservado, não apenas que um mock foi chamado. O hook de erro é observado por mensagens, possibilidade de recuperação e ausência de exceções. A asserção monetária exige centavos corretos.

Para cobrir a lacuna dos mocks, foram acrescentados cinco percursos longos com **frontend de produção e API Express real**, repetidos em três resoluções. Não há interceptação de endpoints nessa suíte. Eles exigem sete escolhas preservadas, compatibilidade calculada, orçamento respeitado, troca sem perder outras seis peças, simulação com FPS menor em 4K que em 1080p, tabela equivalente aos dados recebidos, upgrades compatíveis dentro do orçamento e autenticação efetiva. Os valores são saídas reais do modelo do MVP, não medições de jogos reais.

Ambiente: Node **26.9.0**, Playwright **1.64.0**, Chrome **154.0.8037.98**, axe-core **4.14.0**. Dados de teste em memória; servidor integrado separado, senha administrativa aleatória temporária, sem uso de credenciais pessoais. Sem retries e sem testes ignorados para obter aprovação.

| Verificação final | Resultado e evidência |
| --- | --- |
| `npm test` | **255/255 aprovados** — [log](evidence/ra2-ciclo2-qa/backend-tests.log) |
| `PLAYWRIGHT_CHANNEL=chrome npm test --prefix frontend` | **90/90 aprovados**, 45 cenários em desktop/celular — [log](evidence/ra2-ciclo2-qa/frontend-tests.log) |
| `PLAYWRIGHT_CHANNEL=chrome npm run test:integration --prefix frontend` | **15/15 aprovados**, 5 percursos em desktop/tablet/celular, com build de produção — [log](evidence/ra2-ciclo2-qa/integration-tests.log) |
| `npm run lint` e `npm run lint --prefix frontend` | Aprovados — [log](evidence/ra2-ciclo2-qa/lint.log) |
| Build Vite | Aprovado pelo comando integrado; aviso conhecido de chunk JavaScript acima de 500 kB, aproximadamente 796 kB antes de gzip |
| Auditoria visual/axe | **48 estados/resoluções**, zero violações automáticas detectadas, zero overflow horizontal da página e zero exceções JavaScript — [JSON](evidence/ra2-ciclo2-qa/visual-a11y.json) |
| Contraste dos tokens | Razões de texto/painel verificadas; [cálculo e limites](evidence/ra2-ciclo2-qa/contrast.json) |
| `git diff --check` | Sem erros de whitespace |

As 48 auditorias cobrem 16 estados em **1440×900, 768×1024 e 390×844**: Home, catálogo, assistente, resumo com nota, builds prontas, salvas, comparação com resultado, ranking, upgrades com resultado, feedback, sobre, compartilhamento válido, login administrativo, simulação individual, comparação de jogos e menu aberto. Cards do catálogo têm altura e posições relativas de preço/ações verificadas; os testes específicos também usam textos longos e fotos ausentes/com falha.

### Cobertura dos cenários solicitados

| Fluxo | Evidência funcional |
| --- | --- |
| Montagem completa, avanço, retorno e troca | Montagem manual de sete peças, nove etapas, foco e ações visíveis; retorno após análise e substituição preservando demais escolhas |
| Compatibilidade e incompatibilidade | Build compatível; CPU Intel em placa AMD produz bloqueio real; restauração e nova análise liberam o fluxo |
| Informar/alterar orçamento | Campos inválidos e rejeição da API nos testes controlados; 6000 → 5500 no fluxo real invalida análises e mantém orçamento ao salvar/recuperar |
| Gargalos, desempenho, nota e ranking | Saídas e detalhes técnicos renderizados; ajuda acessível; nota numérica íntegra; ranking com preço de referência e explicação |
| Um jogo, múltiplos jogos e software | Individual, mudança de resolução, comparação e tabela usando API real; testes controlados cobrem seleção insuficiente, dados ausentes, loading, erros e respostas tardias |
| Recomendações | Build por orçamento gerada, aplicada e revalidada; retry mantém valores |
| Salvar/recuperar e comparar builds | IDs, objetos completos, orçamento e total em centavos verificados na API e no estado recuperado |
| Upgrades | Sugestões reais com troca efetiva, compatibilidade e custo dentro do teto informado |
| Catálogo e imagens | Busca, marca/categoria/preço, contagem coerente com catálogo, comparação, foto exata e fallback |
| Lojas | Links HTTPS gerados, abertura em nova aba com `noopener`; formato de busca preservado. Disponibilidade das lojas e preço de mercado não foram homologados |
| Administração | Navegação pública sem Admin; acesso direto, rejeição, login, recarregamento, cadastro e logout com API real |

A suíte de backend também cobre os serviços preexistentes de relatórios, exportação, versões, histórico, compartilhamento, notificações e roadmap. A revisão de código e os testes existentes complementam os percursos representativos; não foi feito E2E exaustivo de toda combinação de CRUD nessas áreas.

### Interface e acessibilidade: alcance da evidência

Capturas foram abertas e inspecionadas, incluindo menu móvel, catálogo com fotos/fallback, assistente, incompatibilidade, resumo/nota, ranking e gráficos individuais/comparativos. Os testes verificam teclado, retorno de foco dos modais, foco após navegação, ações do assistente e rolagem com movimento reduzido. Tabelas extensas mantêm rolagem interna no celular.

O axe deixou **contraste parcialmente inconclusivo nos 48 estados**, em elementos com gradientes, SVGs ou sobreposição. Esses itens não foram contados como aprovação automática integral. O cálculo complementar dos tokens contra o painel mais claro resulta em texto principal **13,12:1**, secundário **8,36:1**, erro **7,21:1**, placeholder **6,09:1**, contorno de controles **4,00:1** e texto do botão primário **12,38:1**. A composição conservadora dos máximos dos gradientes/grade com texto secundário resulta em **7,66:1**. Essas medições e a inspeção visual não substituem avaliar todos os pixels/estados com tecnologia assistiva.

| Evidência selecionada | Desktop | Tablet | Celular |
| --- | --- | --- | --- |
| Assistente/revisão | [Captura](evidence/ra2-ciclo2-qa/desktop-wizard-review.png) | [Captura](evidence/ra2-ciclo2-qa/tablet-wizard-review.png) | [Captura](evidence/ra2-ciclo2-qa/mobile-wizard-review.png) |
| Incompatibilidade | [Captura](evidence/ra2-ciclo2-qa/desktop-incompatible.png) | [Captura](evidence/ra2-ciclo2-qa/tablet-incompatible.png) | [Captura](evidence/ra2-ciclo2-qa/mobile-incompatible.png) |
| Fotos e catálogo | [Captura](evidence/ra2-ciclo2-qa/desktop-catalog-photo.png) | [Captura](evidence/ra2-ciclo2-qa/tablet-catalog-photo.png) | [Captura](evidence/ra2-ciclo2-qa/mobile-catalog-photo.png) |
| Nota explicada | [Captura](evidence/ra2-ciclo2-qa/desktop-summary-score.png) | [Captura](evidence/ra2-ciclo2-qa/tablet-summary-score.png) | [Captura](evidence/ra2-ciclo2-qa/mobile-summary-score.png) |
| Comparação de jogos | [Captura](evidence/ra2-ciclo2-qa/audit-1440-performance-comparison.png) | [Captura](evidence/ra2-ciclo2-qa/audit-768-performance-comparison.png) | [Captura](evidence/ra2-ciclo2-qa/audit-390-performance-comparison.png) |
| Menu agrupado | [Captura](evidence/ra2-ciclo2-qa/audit-1440-menu.png) | [Captura](evidence/ra2-ciclo2-qa/audit-768-menu.png) | [Captura](evidence/ra2-ciclo2-qa/audit-390-menu.png) |

Reprodução dos comandos e do script de auditoria: [README do frontend](../frontend/README.md#validação-integrada-do-ciclo-2).

## Melhorias adiadas e riscos remanescentes

| Tema | Situação e justificativa |
| --- | --- |
| Air coolers, water coolers e fans | Adiados. Modelo de sete slots não descreve kits de socket, altura do cooler, espaços/espessura de radiadores, posições/quantidade de fans, conectores ou capacidade térmica. Precisam de acessórios opcionais, esquema versionado, validações de dados desconhecidos e migração compatível com builds antigas. Não foram criadas aprovações fictícias |
| Preços atuais | Adiados. Mock e links de busca não são cotação. Integração futura exige fonte legítima, identificação exata de SKU, origem/data/moeda, disponibilidade, cache e validade. Não houve scraping |
| Fotografias de todo o catálogo | Apenas duas fotos com modelo/capacidade exatos e atribuição/licença foram incorporadas. As outras peças usam fallback até existir mídia adequada |
| Compatibilidade física e estimativas | Verificação limitada aos campos disponíveis. Simulação de FPS/software não valida independentemente toda compatibilidade física nem executa jogos reais. Verificar o assistente e especificações do fabricante antes de decisão de compra |
| Dados em memória | Builds salvas, alterações administrativas e compartilhamentos reiniciam com o backend. O MVP não oferece contas individuais/isolamento por usuário nesses dados. Usar instância controlada de teste, nomes de sessão sem dados pessoais e guardar a ficha de pesquisa fora do servidor |
| Catálogo alterado depois de salvar | IDs removidos por administração não são inventados/repostos ao recuperar uma build; a análise do backend pode rejeitá-los. Congelar catálogo durante a rodada. O novo bloqueio de carregamento resolve o atraso/falha de consulta, não uma política de migração de SKUs excluídos |
| Acessibilidade e navegadores | Chrome com viewports e toque emulados; Safari, Firefox, aparelhos físicos, zoom ampliado e leitores de tela não foram homologados nesta revisão. Contraste inconclusivo exige continuidade da inspeção manual |
| Desempenho de entrega | Aviso de chunk grande permanece. Não houve medição em rede móvel lenta/dispositivo de entrada; avaliar code splitting em evolução própria se o ensaio operacional indicar demora relevante |
| Hospedagem | Nenhum deploy, Cloudflare/túnel, launcher Windows, suspensão de máquina ou carga concorrente foi validado nesta etapa. Evidência local não comprova disponibilidade do link a ser enviado |

## Roteiro de validação com iniciantes e intermediários

### Preparação

Sugestão exploratória: **8–12 participantes**, distribuídos entre iniciantes e intermediários, com sessões de aproximadamente **30–40 minutos**. É uma proposta de recrutamento, não amostra já coletada nem garantia estatística. Classificar pelo relato de experiência: iniciante nunca montou/escolheu um PC completo sozinho; intermediário já selecionou peças ou realizou montagem/upgrade e conhece parte dos termos. Registrar quem participou do Ciclo 1 para separar possível efeito de familiaridade.

Antes de convidar: fixar commit e catálogo; compilar; testar o endereço que será enviado no computador e celular reais; montar/salvar/recuperar uma build; simular um jogo; confirmar proteção administrativa. Garantir continuidade do backend durante a sessão. Fazer um piloto técnico fora da amostra para verificar instruções e tempo, registrando eventuais ajustes antes da coleta principal. Se esses testes falharem, corrigir o ambiente antes da rodada.

Pedir consentimento para observação e gravação, se utilizada. Identificar participantes por código. Não solicitar senha pessoal nem permitir acesso administrativo aos participantes. O moderador apresenta apenas: “Estamos avaliando a ferramenta, não seu conhecimento. Pense em voz alta. Você pode interromper quando quiser.” Não explicar antecipadamente os menus, o botão de avanço nem os conceitos cuja compreensão será medida.

### Tarefas e observação

| Ordem | Instrução ao participante | O que registrar |
| --- | --- | --- |
| 1 — primeiro contato, 2 min | “Explore a página inicial e diga para que acredita que a plataforma serve e em que situação a usaria.” | Compreensão espontânea, confusões e primeira ação, antes de ajuda |
| 2 — montagem principal, até 15 min | “Usando o assistente, monte um PC para jogar em 1080p com orçamento de R$ 6.000. Confira o resultado e salve a configuração para continuar depois.” | Tempo, avanço/retorno encontrados, sete peças, orçamento informado, análise de compatibilidade, chegada ao resumo, salvamento, conclusão sem ajuda. Não fornecer lista de peças nem caminho do menu |
| 3 — revisão da escolha, 4 min | “Troque a memória por outra opção e confira o que mudou. Depois recupere a configuração salva anteriormente.” | Descoberta da troca, preservação das outras peças, nova verificação, recuperação e entendimento de qual build está ativa |
| 4 — interpretação, 4 min | “Veja como sua configuração se comportaria em um jogo. Depois compare com outro. Explique os resultados e diga o que pode concluir sobre compatibilidade, FPS e preço.” | Descoberta dos dois modos, resolução/qualidade, uso de legendas/ajuda, diferença entre estimativa, medição e garantia |
| 5 — pesquisa, 3 min | “Encontre uma peça de uma marca de sua escolha dentro de uma faixa de preço, compare duas alternativas e encontre onde buscaria comprar uma.” | Busca/filtros, comparação, interpretação de preço estimado e link de busca; não realizar compra |
| 6 — diagnóstico complementar, 3 min | Em uma cópia descartável da montagem: “Esta configuração apresenta um problema. Descubra qual é e tente corrigi-lo.” Preparar previamente CPU/placa-mãe com sockets incompatíveis usando os dados atuais | Clareza do alerta e do bloqueio, compreensão do gargalo indisponível, capacidade de corrigir. Não alterar a build principal sem avisar |
| 7 — intermediários, opcional, 3 min | “Veja uma sugestão de upgrade com até R$ 1.500 e explique se ela ajudaria no seu objetivo.” | Interpretação de custo/ganho, compatibilidade e utilidade dos detalhes técnicos |

Após cada tarefa principal perguntar: **“No geral, quão fácil ou difícil foi realizar esta tarefa?”**, escala de 1 (muito difícil) a 7 (muito fácil). Usar a mesma escala para todos. Registrar falha ou desistência antes de qualquer demonstração do moderador. As tarefas complementares podem ser reduzidas para manter o tempo; a tarefa principal e as cinco medidas abaixo devem ser iguais nos dois perfis.

Escala de ajuda: **H0** sem ajuda; **H1** pergunta neutra do moderador, sem indicar solução; **H2** indicação de navegação ou conceito; **H3** intervenção direta. Registrar cada ocorrência e seu momento. Para a métrica estrita de conclusão sem ajuda, contar somente H0. Ao chegar a 15 minutos na tarefa principal ou se o participante desistir, registrar não conclusão sem ajuda; oferecer apoio para prosseguir nas demais tarefas, sem reclassificar o resultado inicial.

### Instrumentos para as cinco medidas

| Medida | Pergunta/critério | Como apurar |
| --- | --- | --- |
| 1. Compreensão | Antes: “Para que serve a plataforma?” Depois: “O que o FPS mostrado significa?” e “O que a compatibilidade aprovada e o preço exibido permitem concluir?” | Rubrica 0/1/2 por pergunta: incorreto/ausente, parcial, correto. Resposta completa reconhece apoio à montagem; FPS estimado e variável; compatibilidade limitada aos dados e preço de referência. Total 0–6, preservando respostas livres |
| 2. Valor percebido | “Quanto a plataforma ajudaria você a escolher uma configuração?” 1 (nada) a 5 (muito). “O que mais ajudou? O que faltou?” | Distribuição, mediana e temas, por perfil; não inferir disposição de compra apenas desta resposta |
| 3. Facilidade | Escala de facilidade 1–7 após cada tarefa, acompanhada de “O que dificultou?” | Mediana por tarefa/perfil; tempo, erros e ajuda como evidência observada complementar |
| 4. Montagem sem ajuda | Sete peças selecionadas, orçamento de R$ 6.000 informado, total dentro do teto, compatibilidade sem bloqueio, resumo visualizado e build salva, até 15 min, H0 | Sucessos / participantes que iniciaram a tarefa, por perfil e total. Informar também conclusão com ajuda, desistências e falhas. Incidente de ambiente identificado separadamente, nunca convertido em sucesso |
| 5. Intenção de retorno | “De 0 a 10, qual a chance de você voltar a usar o PCPowerLab quando precisar escolher peças?” e “Em qual situação voltaria ou não voltaria?” | Distribuição/mediana e razões. Intenção declarada não equivale a retenção real |

Metas exploratórias **propostas para pactuar antes da coleta**, sem resultados ainda: pelo menos 80% de conclusão H0; mediana de compreensão ≥5/6; valor ≥4/5; facilidade da montagem ≥5/7; intenção de retorno ≥7/10. Reportar os denominadores e resultados por perfil mesmo que o total atinja a meta. Em amostra pequena, descrever também cada bloqueio recorrente; não declarar eficácia estatística. Comparar numericamente com o Ciclo 1 somente se os instrumentos e critérios forem equivalentes e os dados originais estiverem disponíveis.

### Ficha de registro e decisão posterior

Preencher uma ficha por sessão, sem valores presumidos:

| Campo | Registro a preencher |
| --- | --- |
| Código, perfil, participação anterior | — |
| Data, commit, navegador, aparelho/resolução | — |
| Resposta inicial sobre a finalidade | — |
| Tarefa: início/fim, conclusão, erros e ajuda H0–H3 | — |
| Montagem principal: peças, orçamento, compatibilidade, resumo e salvamento | — |
| Compreensão 0–6 e respostas originais | — |
| Valor 1–5, facilidade 1–7 por tarefa, intenção 0–10 | — |
| Motivos, comentários e sugestões do participante | — |
| Incidentes de ambiente, retomadas e desvios do roteiro | — |

Após a coleta, consolidar por perfil: número de participantes, conclusões sem/com ajuda, falhas/desistências, tempos e distribuição das respostas. Manter relatos separados de interpretações do pesquisador. Priorizar impedimentos à montagem, perda de estado, entendimento incorreto de estimativas e bloqueios não compreendidos. Um novo defeito crítico interrompe a rodada até correção e reteste; resultados de pessoas não devem ser substituídos pelo sucesso da suíte automatizada.

**Nenhuma sessão ou resposta de participante foi inventada ou coletada como parte desta revisão técnica.**
