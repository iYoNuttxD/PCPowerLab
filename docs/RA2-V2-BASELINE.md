# PCPowerLab — linha de base v2.0

> [Consolidação técnica atual](RA2-CONSOLIDACAO-FINAL.md). Os resultados abaixo pertencem às etapas e fontes identificadas; não representam automaticamente a união posterior. Validação final pendente; **NÃO HOMOLOGADA**.

## Identificação e escopo

- Data: **08/10/2026 (UTC)**
- Repositório: `iYoNuttxD/PCPowerLab`
- Branch: `codex/pcpowerlab-ra2-ciclo2`
- Commit inspecionado e testado antes de alterações de aplicação: **`d433bf930d7373eec073921427e146bc8c173f26`**
- Checkout novo, inicialmente limpo: checkout isolado da fonte identificada
- Escopo desta etapa: diagnóstico, inventário, requisitos e registro de verificações. **Nenhuma funcionalidade, fórmula, dependência, configuração de aplicação ou correção de bug foi alterada. Nenhum merge ou deploy.**
- `AGENTS.md` e `.agents/skills` não estavam presentes neste checkout. Lidos os README da raiz e frontend, `docs/API.md` e os cinco relatórios `RA2-CICLO2-*`; inspecionadas as camadas de frontend, serviços, modelos, mocks e testes relevantes.

Esta é a linha de base da nova sequência v2.0–v2.9, sobre uma branch que **já contém melhorias anteriores do Ciclo 2**. Não tratar recursos existentes como inexistentes e não confundir a nomenclatura desta sequência com a V2 descrita nos relatórios de 07/10.

## Arquitetura existente

| Camada | Implementação e responsabilidade | Dependências e limites |
| --- | --- | --- |
| Backend HTTP | Node ESM, Express 4; `src/app.js`, rotas → controllers → services → data/repositories/utils | Respostas `{success,message,data/errors}`; `/api/v1` configurável; produção serve `frontend/dist` na mesma origem |
| Catálogo e domínio | `src/models/component.model.js`, `components.mock.js`, `component.repository.js`; sete categorias | IDs compartilhados por seleção, parâmetros, recomendações, upgrades e builds salvas; administração em memória |
| Builds | `src/services/build.service.js` normaliza IDs planos/aninhados; sete slots obrigatórios, nenhum opcional | Uma peça por categoria; novos acessórios afetam contratos e todas as saídas derivadas |
| Compatibilidade | `compatibility.service.js` e alertas/fix-suggestions | Seis verificações codificadas; cadastro de regras tem CRUD separado, não motor dinâmico |
| Desempenho | `performanceParameters.js`, gargalos, jogos/software, score e custo-benefício | Scores internos e requisitos simplificados; não mede hardware nem executa jogo |
| Recomendações | orçamento, perfis/uso, faixa, correções, upgrades/roadmap | Candidatos do catálogo local; filtragem por compatibilidade/orçamento; pontuação depende dos mocks |
| Agregação | resumo, comparação, relatório, exportação, histórico, compartilhamento | Reutiliza serviços; falhas controladas tornam análises parciais/indisponíveis |
| Estado de servidor | arrays/Maps em `src/data` | Reinício perde alterações, sessões, salvos e compartilhamentos; não há isolamento de contas individuais |
| Autenticação | `admin-auth.middleware.js`; sessão temporária e `requireAdmin` em componentes/regras/parâmetros | Ocultar Admin no menu não é segurança; não homologado para produção |
| Frontend | React 19, Router 7, Vite 7; `App.jsx`, páginas, componentes e services | HTTP centralizado em `services/api.js`; sem duplicar cálculos backend |
| Estado de montagem | `hooks/useBuildState.jsx`, contexto React/localStorage | Preserva etapa/peças/orçamento; alterações invalidam análises; storage bloqueado degrada para sessão |
| Concorrência UI | `useSimulationRequest`, guards de sequência/configuração nos fluxos | Ignora respostas antigas; não equivale a cancelamento de trabalho do servidor |
| Apresentação | tokens/CSS compartilhados, Lucide, Recharts, dialog nativo | Cards reutilizados, tabelas/legendas, foco/teclado, estados loading/erro/vazio |

### Fluxos que já existem e devem ser preservados

- Menu público com cinco entradas principais; Admin somente por rota direta autenticada. Todas as rotas de `App.jsx` preservadas
- Assistente com nove etapas (sete peças + orçamento + revisão), progresso, avanço/retorno explícitos, seleção sem autoavanço, foco/rolagem e etapa persistida
- Catálogo com pesquisa/marca/categoria/preço, comparação de 2–4 peças da mesma categoria, fotografia opcional licenciada e fallback
- Resumo com prévia de troca individual, validação via `/build-summary`, preservação das outras seis peças e orçamento, invalidação de resultados antigos
- Simulação de um jogo, comparação de 2–10 jogos e software profissional; resultado da API, ausência de dados e avisos preservados
- Builds prontas/salvas, versões, comparação, histórico/notificações, exportação, links de compartilhamento, feedback, ranking/perfis, upgrades e roadmap

Ordem principal da análise: compatibilidade → alertas → orçamento → gargalos quando não bloqueados. Simulação isolada não constitui aprovação física completa. Resumo e troca dependem do mesmo backend, não de uma fórmula paralela no React.

## Inventário dinâmico

O [JSON completo](RA2-V2-INVENTARIO.json) registra **cada componente** com ID, nome completo, fabricante, categoria, especificações, preço de referência, mídia/caminho e situação das regras. É um snapshot do commit acima, não uma contagem fixa para versões futuras.

| Categoria | Quantidade atual |
| --- | ---: |
| CPU | 12 |
| Placa-mãe | 9 |
| GPU | 11 |
| RAM | 11 |
| Armazenamento | 11 |
| Fonte | 8 |
| Gabinete | 7 |
| **Total** | **69** |
| Air cooler / AIO / fan independente | **0 / 0 / 0** |

- **69 parâmetros de desempenho**, **20 jogos**, **12 softwares**, **9 builds prontas** e **345 links de busca**; cobertura por ID conferida
- **68/69 componentes** têm uma testemunha de build completa aceita pelas seis verificações atuais. `psu-generic-400w` não atende sequer ao mínimo CPU TDP + 350 W do catálogo (408 W); não confundir isso com medição elétrica real
- **2 imagens referenciadas, ambas com arquivo local presente**; os outros **67 itens** exibem ícone explicitamente ilustrativo
- Fotografias existentes: Samsung 970 EVO Plus 250GB e Samsung 980 PRO 1TB. Origem/licença em `frontend/public/images/components/ATTRIBUTION.md`; nenhuma foto representa outras capacidades
- Preços são referências demonstrativas em BRL, não cotações. Links externos são buscas e disponibilidade é desconhecida
- O README da raiz ainda informa 63 componentes/63 parâmetros/315 links: **documentação desatualizada**, não fonte de verdade do inventário. Não foi corrigido silenciosamente nesta etapa

### Regras e especificações: o que “compatível” realmente cobre

As seis verificações atuais cobrem socket CPU/placa-mãe, tipo de memória RAM/placa-mãe, interface de armazenamento/placa-mãe, potência estimada/fonte, comprimento GPU/gabinete e formato placa-mãe/gabinete. A compatibilidade depende da combinação de peças; nenhuma linha de inventário prova que um item sozinho está aprovado para qualquer montagem.

**Os cinco registros editáveis de regras não são executados pelo motor de compatibilidade.** Desativá-los não desativa as verificações codificadas; foi reproduzido em processo isolado, sem alterar o repositório. A interface administrativa pode transmitir uma expectativa incorreta de que o CRUD altera o motor. Recomendações e correções também dependem do motor codificado.

Não são verificados slots DIMM/M.2 ocupados, capacidade máxima/QVL/XMP/EXPO, BIOS, conectores de GPU/fonte, cooler/kit/socket/altura, interferência RAM/VRM, radiadores/posição/espessura, fans incluídos/quantidade/conectores, orçamento térmico real ou todas as restrições físicas. Dados desconhecidos não podem ser reinterpretados como evidência positiva na evolução.

Consumo é calculado de formas diferentes por finalidade: compatibilidade usa `max(recomendação da GPU, TDP CPU + 350)`; gargalos usam TDP CPU + TDP GPU + 100. Recomendações usam pools reduzidos por categoria e scores/preços positivos, sem garantia de ótimo global. Links de compra são gerados na importação e não sincronizados automaticamente com CRUD posterior. [Auditoria detalhada e inventário tabular](RA2-V2-AUDITORIA-BACKEND.md).

## Requisitos implementados e pendentes

A [matriz R01–R22](RA2-V2-REQUISITOS.md) é o registro de problema, origem, estado, arquivos, evidência, testes e aceitação.

- Base implementada a preservar, ainda sem aceitação integral da nova rodada: R01–R06, R08–R09, R15–R17
- Parcial: linguagem R07; fotos R10; ampliação RAM/armazenamento R11; preços R18; alternativas R19; bugs R20; clareza final R21; pesquisa/retorno/monetização R22
- Não iniciado no produto: air cooler R12, AIO R13 e fans R14
- Não há resultados novos de participantes, retenção real, receita, disposição a pagar comprovada, cotação atual ou benchmark físico. Nenhuma linha foi marcada VALIDADO só por existir código

## Problemas e riscos conhecidos antes das próximas etapas

1. **Defeito reproduzido:** administração aceita uma placa-mãe sem `storageInterfaces`; ao selecionar armazenamento, compatibilidade chama `.includes` sobre `undefined` e lança `TypeError`. As nove placas do catálogo têm o campo, portanto a suíte verde do catálogo não cobre esse caso de entrada administrativa. Correção fica para etapa autorizada posterior; não aplicada em v2.0
2. **Regra administrativa desconectada do motor:** CRUD persistido em memória não controla as verificações efetivas. Deve ser explicado ou integrado com testes antes de prometer regras configuráveis
3. **Modelo de sete slots espalhado:** normalização, enum/model, estado React, helpers, persistência, versões/exportação, seleção, recomendações e upgrades precisam evoluir juntos para refrigeração. Preservar builds antigas e distinguir dado insuficiente de compatível
4. **Mocks:** preço/score/requisitos não têm validade mercadológica/benchmark. Aumentar catálogo não deve fabricar cotações, links de produto, disponibilidade ou ganho de FPS
5. **Persistência e privacidade:** salvos/histórico/feedback são globais em memória; pesquisa deve usar instância controlada e identificadores sem dados pessoais. Nenhuma garantia de retenção do estado de servidor após reinício
6. **Dados técnicos incompletos:** parte dos itens tem nome genérico, sem SKU/fonte técnica. Não extrapolar revisão de seis adições documentadas para validação de todos os 69 itens
7. **Entrega e documentação:** bundle grande (~796 kB JS); README raiz desatualizado, requisito Node do frontend mais alto que raiz, API.md omite descrição atual de sessão administrativa e descreve compartilhamento como futuro embora exista frontend
8. **Acessibilidade:** evidência histórica em Chrome emulado, contraste parcialmente inconclusivo; sem homologação Safari/Firefox, leitor de tela ou aparelho físico
9. **API pública e operação:** sem banco/contas por usuário, sem avaliação de carga/produção/túnel/Windows nesta etapa. Aplicação local aprovada não significa serviço publicável para público irrestrito

## Verificações iniciais executadas

A execução ocorreu antes de qualquer alteração de código da aplicação. Os únicos arquivos novos desta etapa são documentação/evidência. Ambiente: Debian 13.6, Node 24.19.0, npm 11.9.0, Vite 7.3.3 e Playwright 1.64.0.

| Comando | Resultado inicial real |
| --- | --- |
| `npm ci` (raiz e frontend) | Falhou com ENOENT no cache padrão; recuperação com cache temporário separado por pacote, lockfiles intactos |
| `npm test` (raiz) | **255/255 passaram**, zero falhas/skips/cancelados/todo |
| `npm run lint` (raiz) | Passou, exit 0 |
| `npm run lint` (frontend) | Passou, exit 0 |
| `npm run build` (frontend) | Passou; aviso preexistente de chunk >500 kB, JS 796,14 kB, gzip 239,17 kB |
| `npm test -- --list` (frontend) | Descobriu 90 casos / quatro arquivos |
| `npx playwright test --config=playwright.integration.config.js --list` | Descobriu 15 casos / um arquivo |
| `npm test` (frontend, config original, path de browser temporário) | **BLOQUEADO**: 90 falhas de inicialização, zero asserções de aplicação exercitadas; browser correspondente ausente |
| `npm run test:integration` (frontend, config original, mesmo path temporário) | Build passou; **BLOQUEADO**: 15 falhas de inicialização, zero asserções de aplicação exercitadas |
| Reexecução dos mesmos casos com Chromium instalado e wrappers temporários | **BLOQUEADO**: 90 + 15 falhas em `socket() failed: Operation not permitted (1)`, antes de criar página |
| 14 arquivos backend focados na auditoria | **92/92 passaram**; subconjunto da cobertura, não somar como testes únicos adicionais |
| `git diff --check` e diff de fontes/testes/lockfiles | Sem erros de whitespace; nenhuma alteração de aplicação |

Instalações oficiais do Chromium completo e headless shell falharam com arquivo ZIP truncado (`End of central directory record signature not found`) nas tentativas internas do instalador. O Chromium 154.0.8037.57 já instalado também falhou por restrição de socket, inclusive no smoke test pela via de revisão de permissão. As tentativas foram encerradas; não houve contorno de restrição. Os 105 casos descobertos são os mesmos nas duas tentativas, **não 210 testes únicos**. São falhas de infraestrutura, não 105 regressões de produto comprovadas. Nenhuma captura foi possível porque nenhuma página abriu. Não há workflows versionados em `.github` neste checkout; não se presume CI verde.

[Evidência e comandos exatos](evidence/ra2-v2-baseline/README.md), [resultados estruturados](evidence/ra2-v2-baseline/results.json), [excertos literais e hashes dos logs](evidence/ra2-v2-baseline/command-output-excerpts.log) e [estado por caso](evidence/ra2-v2-baseline/browser-case-results.json). Os arquivos públicos de evidência estão no diretório relativo indicado acima. A validação comportamental de navegador permanece pendente em uma rota autorizada capaz de executar esses testes; este bloqueio não prova que todas as ferramentas de navegador estejam indisponíveis.

## Cobertura existente e lacunas

- Backend: testes de serviços/modelos/API, integridade do catálogo, auth administrativa, compatibilidade, orçamento, recomendações, desempenho/jogos/software, persistência em memória, versões, comparação, relatórios/exportação, feedback/notificações e upgrades
- Interface: quatro suítes E2E com respostas controladas, 45 cenários em desktop/celular. Cobre fluxos, validação, estados de rede, respostas atrasadas, foco/rolagem, armazenamento bloqueado, troca sem perda e erros sem rejeição não tratada
- Integração: cinco percursos longos em três resoluções com frontend compilado e backend real, sem interceptar endpoints. Estado de teste isolado, senha administrativa aleatória e traces desativados
- Não há percentual de cobertura instrumental configurado; contagem de testes não comprova cobertura total de linhas, combinações ou domínio
- Lacunas: motherboard administrativa incompleta reproduzida; refrigeração inexistente; compatibilidade física abrangente; schemas/migração de acessórios; preço/oferta real; persistência multiusuário; precisão de FPS; pesquisa humana; operação hospedada. Não substituir essas lacunas por testes de mocks

## Evidência anterior versus atual

Os relatórios `RA2-CICLO2-UI`, `ASSISTENTE`, `ANALISES`, `CATALOGO` e `REVISAO-E-VALIDACAO` contêm evidências datadas de 07/10: capturas, testes e limites. São preservados sem alterações. Seus números não foram apresentados como nova execução. O plano de pesquisa de 8–12 participantes é proposta; não recrutamento realizado nem resposta coletada.

## Encerramento da v2.0

Feito: arquitetura/dependências, leitura da documentação, inspeção das melhorias existentes, inventário completo do commit, rastreabilidade R01–R22, execução dos checks possíveis e registro de problemas pré-existentes.

Não feito por escopo: features, correções de produto, expansão de catálogo, busca/licenciamento de novas fotos, preços ao vivo, coleta com participantes, deploy e merge.

Pendências: executar as etapas seguintes sequencialmente, preservando a base e os contratos; resolver os bloqueios registrados; atualizar evidências e matriz somente após testes efetivos. A publicação desta documentação deve usar o SHA base esperado, sem sobrescrever movimento concorrente da branch.
