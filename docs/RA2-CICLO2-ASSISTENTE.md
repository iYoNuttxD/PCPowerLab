# RA2 · Ciclo 2 — Assistente de montagem

Implementação de 07/10/2026 na branch `codex/pcpowerlab-ra2-ciclo2`, em commit separado da melhoria visual inicial (`1c77969`). Escopo: orientação de iniciantes no assistente, preservação da montagem e validação do fluxo existente.

## Inspeção e decisões

O assistente tinha nove etapas, avanço ao final de toda a lista, índice da etapa apenas no estado local da página e peças persistidas pelo `BuildProvider`. As escolhas já sobreviviam à navegação, mas a etapa voltava ao processador. Não havia reposicionamento de foco/rolagem entre etapas; mensagens de bloqueio compartilhavam o estilo de sucesso; análises anteriores continuavam presentes depois de trocar peças.

- **Uma barra de ações no início do fluxo**, que permanece visível durante a rolagem da lista. Os botões Voltar e Avançar mantêm as condições existentes. Na revisão, há apenas um acesso ao resumo nessa barra. O menu de etapas continua permitindo saltos diretos, sem contornar a validação das análises e do salvamento.
- **Progresso explícito**: etapa atual/total, barra de progresso, contagem e lista expansível das etapas concluídas ou pendentes. Sete peças selecionadas e orçamento válido concluem as oito etapas de configuração. A revisão se completa após análise de gargalos bem-sucedida e ausência dos bloqueios de compatibilidade existentes.
- **Orientação contextual**: descrição curta de cada categoria, próxima ação esperada, motivo textual para o avanço indisponível, peça atual e instrução de substituição. O resumo permite escolher/alterar uma categoria diretamente.
- **Foco e rolagem**: título da etapa recebe foco sem salto automático; a rolagem considera as alturas reais do cabeçalho e da barra. Usa movimento suave normalmente e instantâneo com `prefers-reduced-motion: reduce`. Também funciona ao escolher novamente a categoria atual pelo resumo. A medição ocorre antes da rolagem para acomodar textos que ocupam mais linhas no celular.
- **Contexto persistido**: `wizardStep` usa a mesma persistência local das peças. Dados anteriores sem esse campo e etapas desconhecidas retornam ao processador sem descartar escolhas. Carregar outra build salva começa no processador; apenas navegar entre páginas mantém a etapa atual. Com armazenamento bloqueado, a montagem continua utilizável na sessão React, sem prometer persistência após recarregar.
- **Resultados coerentes**: trocar/remover peças, alterar orçamento ou perfil de uso invalida os resultados derivados. As outras escolhas continuam intactas. Respostas tardias do assistente são ignoradas após mudança de configuração ou saída da página; um carregamento interrompido não fica salvo indefinidamente. O orçamento normalizado pela API e os resultados correspondentes são aplicados juntos.
- **Mensagens acessíveis**: validação e falhas usam região de alerta; incompatibilidades/dados insuficientes usam aviso; sucesso aparece somente para operações concluídas. Rejeições das requisições são tratadas. O nome acessível de `Input` contém apenas seu rótulo; dica/erro permanecem em `aria-describedby`.
- **Layout**: identidade e paleta da etapa anterior preservadas, controles com foco visível, ações lado a lado no celular, campos do orçamento alinhados pelo topo e largura suficiente para os textos dos botões de seleção.

Rotas, serviços HTTP, regras de compatibilidade/orçamento, autenticação administrativa e backend não foram alterados. A seleção não avança automaticamente. Nenhuma peça é substituída ao mudar o orçamento. Aplicar uma recomendação continua sendo uma ação explícita que troca a configuração inteira. O salvamento mantém o contrato existente de orçamento opcional; a análise continua exigindo orçamento válido.

## Arquivos

| Arquivo | Alteração |
| --- | --- |
| `frontend/src/pages/BuildWizard.jsx` | Orientação, barra de navegação, foco/rolagem, mensagens e proteção contra respostas tardias. |
| `frontend/src/components/build/WizardNavigation.jsx` | Progresso, etapas acessíveis e único conjunto de ações de navegação. |
| `frontend/src/utils/wizardSteps.js` | Ordem, rótulos, descrições e normalização da etapa persistida. |
| `frontend/src/hooks/useBuildState.jsx` | Persistência da etapa e invalidação de resultados derivados. |
| `frontend/src/components/build/BuildSummaryCard.jsx` | Atalhos opcionais de edição por categoria. |
| `frontend/src/components/ui/Input.jsx` | Separação entre rótulo acessível e dica/erro. |
| `frontend/src/styles/global.css` | Barra fixa no fluxo, indicador de progresso, offsets, responsividade e foco. |
| `frontend/tests/e2e/build-wizard.spec.js` | 13 cenários executados em desktop e celular. |
| `frontend/playwright.config.js`, `frontend/package.json`, `frontend/package-lock.json` | Playwright como dependência de desenvolvimento; servidor de testes isolado e scripts. |
| `frontend/eslint.config.js`, `.gitignore`, `frontend/README.md` | Lint dos testes, exclusão dos artefatos temporários e reprodução da suíte. |
| Este documento e `docs/evidence/ra2-ciclo2-assistente/` | Decisões, resultados e evidência visual. |

## Validação

Ambiente: Node 26.9.0, Playwright 1.64.0 e Google Chrome 154.0.8037.98 local em modo headless.

| Verificação | Resultado |
| --- | --- |
| `npm test` na raiz | **247/247** testes existentes aprovados. |
| `PLAYWRIGHT_CHANNEL=chrome npm test` em `frontend` | **26/26** testes E2E aprovados, sem retries. |
| `npm run lint` na raiz | Aprovado. |
| `npm run lint` em `frontend` | Aprovado, incluindo testes e configuração. |
| `npm run build` em `frontend` | Aprovado. Permanece o aviso existente de chunk acima de 500 kB. |
| Nove etapas em 1440, 1024, 768, 390 e 320 px | **45 verificações**, sem overflow horizontal; ações presentes na visualização inicial. |
| Rolagem após escolher peça no fim da lista | Título visível abaixo da barra, foco correto e avanço único; verificado com e sem movimento reduzido. |
| axe-core 4.14.0, etapas de peça/orçamento/revisão em desktop/celular | **6 verificações**, zero violações automáticas. Contraste sobre fundos compostos permanece `incomplete` na ferramenta; não representa certificação de acessibilidade. |
| API local real | Build pronta aplicada ao estado, compatibilidade e gargalos concluídos com sucesso pelo assistente; progresso 9/9. Busca no catálogo também conferida após a alteração de `Input`. |
| Screenshots antes/depois | Capturados e inspecionados visualmente; orçamento, progresso expandido, revisão e reposicionamento móvel incluídos. |

Os E2E controlam respostas da API para cobrir sucesso, carregamento, catálogo vazio, erro com recuperação, campos vazios/zero/negativos, rejeição de orçamento pelo servidor, peças faltantes, incompatibilidade crítica, dados de desempenho insuficientes, falha de rede, substituição/remoção, persistência, navegação, storage indisponível, normalização de centavos e respostas tardias. O ensaio separado com API real complementa essas fixtures; não as transforma em teste de integração de todos os serviços.

A verificação visual foi realizada no Chrome em viewports simulados. Safari, Firefox, dispositivos físicos e uso com leitor de tela não foram homologados nesta etapa.

## Evidências

- [Desktop antes](evidence/ra2-ciclo2-assistente/before-1440.png) · [Celular antes](evidence/ra2-ciclo2-assistente/before-390.png)
- [Desktop depois](evidence/ra2-ciclo2-assistente/after-1440.png) · [Celular depois](evidence/ra2-ciclo2-assistente/after-390.png)
- [Avanço visível após selecionar no fim da lista](evidence/ra2-ciclo2-assistente/1440-selected.png)
- [Etapa seguinte com título reposicionado](evidence/ra2-ciclo2-assistente/390-next.png)
- [Progresso expandido](evidence/ra2-ciclo2-assistente/390-progress.png)
- [Orçamento no desktop](evidence/ra2-ciclo2-assistente/1440-budget.png) · [Revisão no celular](evidence/ra2-ciclo2-assistente/390-review.png)
- [Análise com API real](evidence/ra2-ciclo2-assistente/1440-real-analysis.png)
- [Medições das resoluções e auditoria automática](evidence/ra2-ciclo2-assistente/validation.json)

Para reproduzir os E2E e instalar o navegador de teste, consulte [frontend/README.md](../frontend/README.md#testes-de-interface).
