# RA2 V2.7 — Auditoria de qualidade, regressões e limites

> [Consolidação técnica atual](RA2-CONSOLIDACAO-FINAL.md). Os resultados abaixo pertencem às etapas e fontes identificadas; não representam automaticamente a união posterior. Resultados reais posteriores estão na consolidação: ef7f com 267 E2E aprovados/1 skip e 18 integrações aprovadas; delta ac27 conferido em cinco larguras. Revisão visual/cores/zoom ainda pendente; **NÃO HOMOLOGADA integralmente**.

08/10/2026 UTC · branch `codex/pcpowerlab-ra2-ciclo2` · base `0dd5473470ce218b4f6499d7f909fa3e459c86ca`.

## Parecer

A auditoria encontrou defeitos reais mesmo com a suíte anterior aprovada. Foram reproduzidos, corrigidos e retestados problemas de contratos de simulação, aliases, erros de entrada, pontuações, compartilhamento, integridade após exclusão, persistência e concorrência. **Não é uma declaração de ausência de bugs, homologação visual, adequação física, precisão de FPS ou prontidão de produção.**

Escopo executado: fontes, testes de domínio, percursos HTTP Express reais, frontend compilado servido por HTTP, utilitários de estado, renderização React estática e handlers assíncronos isolados. Nenhum teste em navegador foi executado. As negativas anteriores do Chromium e do localhost no navegador cloud foram respeitadas: sem nova tentativa, túnel ou uso de computador não autorizado. Casos Playwright foram somente escritos/coletados.

## Registro de defeitos

Severidade **alta**: decisão técnica incorreta ou quebra do estado principal. **Média**: funcionalidade/contrato quebrado com recuperação alternativa. “Reteste aprovado” refere-se ao nível de teste indicado, não a todos os ambientes possíveis.

| ID / severidade | Reprodução e causa | Correção | Regressão / resultado |
| --- | --- | --- | --- |
| Q01 Alta | Enviar montagem completa AM4 com CPU Intel, ou cooler com dados físicos pendentes, diretamente às simulações. Resumo recusava FPS, mas endpoints de jogo/jogos/software calculavam resultados ignorando a compatibilidade completa | Guarda compartilhada antes das simulações; 422 para montagem completa incompatível/não verificada. Quatro peças legadas continuam estimativa parcial com escopo não verificado explícito | `quality-domain.test.js`, `quality-http.test.js`: três endpoints, estados válido/incompatível/pendente, remoção de cooler e parcial; aprovado |
| Q02 Alta | `build={components:{...legacy,cpuId:'cpu-intel-i3-12100f'},cpu:legacy.cpuId}`: seleção validava AMD, mas normalização de simulação preferia Intel aninhado | Mesma normalização e precedência do seletor central para jogo e software | Três regressões de aliases conflitantes; resultado igual à seleção realmente resolvida; aprovado |
| Q03 Média | Comparar `[null, {...}]`: leitura de propriedade antes da validação gerava TypeError/500 | Validar entrada antes de desreferenciar | Entradas nulas, primitivas e arrays retornam 400; teste de domínio e HTTP aprovados |
| Q04 Média | Atualizar `gamingScore` para 1.000.000 ou score especializado negativo era aceito | Limite 0–100 para gaming/productivity/airflow, com atualização atômica | Valores -1/101/1.000.000 recusados; registro anterior preservado; aprovado |
| Q05 Média | API de compartilhamento gerava `/shared-builds/:id`, sem rota React correspondente. Parte da UI corrigia o link manualmente, outra exibia a URL quebrada | `shareUrl` canônica `/shared/:id` | Teste antigo que afirmava URL errada corrigido; contrato de serviço e leitura HTTP do snapshot aprovados; SPA servida na rota real |
| Q06 Média | Salvar, criar versão/notificação, excluir build: versões/notificações órfãs continuavam nas coleções | Exclusão somente dos dependentes daquela build; snapshots compartilhados e outras builds preservados | `build-lifecycle-integrity.test.js` e percurso HTTP com revalidação/notificação/exclusão; aprovado |
| Q07 Média | Produção com `API_PREFIX=/quality-api/v2`: GET de endpoint inexistente retornava HTML da SPA com 200 | Excluir prefixo configurado, além de `/api`, do fallback estático/SPA, respeitando fronteira de caminho | `check-quality-production.mjs` falhou antes e passou depois: JSON 404, health 200 e rotas/bundles estáticos preservados |
| Q08 Alta | localStorage antigo com `budget:null`, `game:null`, fans inválidos ou campos derivados antigos podia derrubar a renderização ou restaurar resultados sem comprovar seleção atual | Migração de entradas com defaults aninhados e descarte de análises persistidas; seleção válida/histórico preservados | Utilitários + `check-storage-regressions.mjs`; fonte antiga falha com TypeError, nova passa; Playwright legado preparado, não executado |
| Q09 Média | Dois eventos antes do próximo render iniciavam mutações duplicadas; carregamento podia terminar com outra operação ainda pendente | Exclusão mútua síncrona por instância; segunda chamada não recebe resultado de outra ação. Tokens/limpeza somente após admissão; controles de mutação indicam indisponibilidade enquanto ocupados | `check-async-regressions.mjs`: chamada distinta não herda resultado, estado/loading, falha, retry e desmontagem; teste de handler, não DOM |
| Q10 Média | Abrir versões/histórico A→B, resolver B antes de A; ou fechar durante carregamento: resposta antiga sobrescrevia B/reabria modal | Sequências independentes e invalidação ao fechar/desmontar, inclusive refresh após exclusão | Handlers reais com promises controladas: ordem inversa, falha após fechar e resposta após desmontar; aprovado sem browser |
| Q11 Média | Resposta de catálogo malformada era tratada como lista vazia ou causava falhas posteriores | Validar estrutura, identidade/categoria, tipos de campos de apresentação e IDs únicos; erro recuperável distinto de `[]` válido | `catalog-response.test.js` + checks frontend; não confundir validação estrutural com verificação técnica dos produtos |

Revisão independente também encontrou regressões **durante** a correção: token antecipado em ReadyBuilds descartava a única resposta admitida; whitelist de perfis eliminava `cost-benefit`/`high-performance` legados; mutex com promessa compartilhada entregaria resultado de outra ação. Essas hipóteses foram tratadas antes da entrega e incluídas no reteste. O achado de aliases Q02 também foi obtido nessa revisão, não deduzido da ausência de teste.

## Matriz de cenários e nível de evidência

| Área solicitada | Executado / evidência | Limite remanescente |
| --- | --- | --- |
| Montagem completa/incompleta/incompatível | Percurso HTTP `/build-summary`, seleção, compatibilidade e suíte de domínio; 400 para incompleta, alertas reais para conflito, ausência de FPS indevido | Navegação/posicionamento visual não executados |
| Orçamento insuficiente e alteração do teto | HTTP 422 da recomendação a R$100; R$4.000/R$6.000 respeitados; resumo mantém peças/custo e altera status orçamentário | Valores demonstrativos, não preço de mercado; busca heurística não garante ótimo global |
| Troca individual, recomendação e desfazer | HTTP troca RAM mantém seis slots e custo independente em centavos; `component-replacement-v24` e testes de transição preservam acessórios/orçamento/revisão/histórico | Gestos reais, foco/modal e A→B→A no browser não executados |
| Adicionar/remover cooler/fans | HTTP usa quantidade 2 packs, soma custo, conserva IDs no save/export/share e remove opcionais; suíte de refrigeração cobre socket/altura/radiador/ocupação/consumo conhecido e desconhecido | Geometria, adequação térmica e headers completos continuam pendentes |
| Salvar/recarregar/compartilhar | HTTP usa controller que cria versão inicial, GET, PATCH, exportação JSON, seleção reimportada e snapshot compartilhado; exclusão remove dependentes | “Recarregar” HTTP é leitura posterior no mesmo processo; persistência após reinício do backend não existe. Reload de página real não executado |
| Compatibilidade válida/inválida/desconhecida | Mesmo motor em catálogo/seleção/simulação; domínio e HTTP verificam estados distintos; nenhum `unknown` promovido a sucesso | Regras só cobrem fatos disponíveis; CRUD de regras é documentação, não motor configurável |
| Gargalo, jogo individual, múltiplos jogos, software | HTTP real, domínio, modos/limites 1 e 2–10 nos checks de handlers; 4K reduz FPS estimado frente a 1080p; resposta corresponde ao jogo; erros/recuperação | Fórmulas demonstrativas sem benchmark. Igualdade entre endpoints prova consistência, não precisão externa |
| Upgrades e comparar builds | HTTP recomputa compatibilidade de cada candidato, limita custo e rejeita comparar entradas inválidas; suíte cobre preservação de capacidade/acessórios e pendência | Catálogo limitado; não representa melhor compra de todo o mercado |
| Busca, filtros, ordenação e novas categorias | Utilitários reais combinam preço/marca/categoria/specs, valores ausentes, acentos, ordenação estável/não mutante; HTTP confirma RAM/SSD/cooler/fan e consulta por ID | Aplicação dos controles, rolagem e comparação visual em aparelho não executadas |
| Fotos/sem foto/preço/specs | Auditor de arquivo/metadados/hash; HTTP baixa os nove arquivos reais; SSR de fallback e transparência; IDs/performance/preços coerentes no domínio | 9/98 fotos; 89 bloqueios. Inspeção visual da aplicação nesta etapa não executada. Nenhuma cotação conectada |
| API indisponível/inválida/vazia | Scripts de handlers exercitam erro e retry; catálogo distingue estrutura inválida de `[]`; HTTP real cobre JSON malformado, 400/404/422 e sucesso após erro | Falhas de rede usadas em handlers são controladas, não teste de infraestrutura externa |
| Lenta/fora de ordem/perda temporária/navegar durante load | Promises controladas na fonte dos handlers; respostas antigas, close/unmount, falha e nova tentativa; scripts de simulação/recomendação preservados | Não prova lifecycle React DOM, StrictMode real, abort de transporte, back/forward ou rede de navegador |
| Clique duplo | Exclusão mútua e efeitos dos handlers verificados, incluindo callback distinto | Eventos nativos e render batching do browser não executados |
| localStorage antigo/falha de persistência | Defaults/migração e utilitários; script invoca leitura/escrita do provider com storage ausente/bloqueado, sem derrubar uso em memória | Quota real, múltiplas abas e sincronização entre dispositivos não testadas |
| Integridade/órfãos/referências/serialização | IDs de componentes/regras/parâmetros únicos, referências/categorias, preços válidos, imagens existentes, round-trip sete slots e opcionais; ciclo save→version/notification→delete | Coleções do servidor globais em memória; sem transação/banco/multiusuário isolado |

## Auditoria do valor dos testes

1. **Registro de rota não prova endpoint.** `app.routes.test.js` ainda contém verificações estruturais (`router.stack`, quantidade mínima). São smoke tests de montagem, não evidência de integração. A entrega adiciona `quality-http.test.js` contra sockets HTTP reais com parser Express, controllers, serviços e repositórios reais, sem interceptar endpoints. Isso cobre também os efeitos que só controllers criam, como versões iniciais.
2. **Testes podem confirmar defeitos existentes.** A asserção de `/shared-builds/share-001` foi substituída pelo contrato da rota efetiva. O teste de “cooler não dá bônus de FPS” foi separado: simulação parcial mantém a propriedade matemática; montagem completa não verificada agora deve falhar com 422. Não se altera expectativa só para ocultar falha.
3. **Oráculos independentes quando possível.** Total do percurso HTTP calculado a partir dos preços do catálogo em centavos, quantidade de packs e diferença da peça; preservação dos demais slots/snapshots; estados e códigos de erro explícitos. Paridade entre dois serviços é identificada como consistência, não verdade física.
4. **Mocks são úteis para controlar tempo, não para provar integração.** O harness assíncrono carrega a fonte real, mas substitui hooks React e transporte por doubles para forçar ordem de conclusão/fechamento. Asserções verificam estado/resultados/erros visíveis nos elementos, não apenas contagem de chamadas. Contagem adicional detecta mutação duplicada. Não é browser E2E.
5. **Controle negativo.** Fonte da base foi executada contra as regressões novas; falhas vermelhas registradas. O check de produção falhou de fato com HTML 200 e passou com JSON 404. Esses controles sustentam causalidade; ausência de um teste antigo isolado não foi usada como prova de correção.
6. **Integridade de coleção vazia é insuficiente.** Teste estático antigo passava com salvos/versões/notificações vazios; novo ciclo real cria dependentes, remove pai e confere ausência de órfãos, preservando o outro pai e snapshots compartilhados.
7. **Sem inflação deliberada.** Matriz de cenários é mais importante que contagem. Parametrizações aplicam o mesmo contrato a endpoints realmente diferentes. Não há percentual instrumental de cobertura configurado nem alegação de cobertura total.

## Pendências e riscos conhecidos

- Browser E2E/integração, capturas, responsividade 320/390/768/1024/1440 px, foco/teclado, acessibilidade assistiva e aceitação humana continuam não executados. Há infraestrutura/casos prontos, falta execução em ambiente autorizado funcional
- Estado persistido é uma conveniência local, não conta de usuário. Sem banco, salvos/versões/histórico/links somem ao reiniciar o servidor e são globais entre clientes; não publicar para público irrestrito com dados pessoais sem arquitetura adequada
- Snapshots antigos ainda podem carregar preço/especificações de apresentação desatualizados; API recalcula pelo catálogo atual. Reconciliar todos os metadados de seleção/histórico com catálogo novo é trabalho residual; não chamar preço local de cotação. Entradas de fan duplicadas/fora do limite herdadas podem exigir remoção/reseleção e são recusadas pelo servidor
- Regras administrativas são registros documentais; motor usa regras codificadas. Não prometer alteração dinâmica por CRUD. BIOS/QVL/folgas/headers/temperatura e precisão de FPS não foram certificados
- API comercial não conectada, preços de referência, 89 fotos faltantes. Esses bloqueios não foram escondidos por fixtures
- Bundle de produção continua acima do limiar de 500 kB. Sem teste de carga, profiling de concorrência multiusuário, auditoria de segurança completa ou qualificação de produção
- Check com API_PREFIX personalizado verifica roteamento backend e arquivos estáticos; uma implantação real exige compilar com `VITE_API_BASE_URL` correspondente. Não é demonstração de frontend customizado hidratado

## Execução e publicação

Verificação final: **453 testes distintos em `npm test`**, incluindo 48 utilitários frontend; esses 48 foram reexecutados separadamente, sem somar novamente. Nove scripts SSR/handlers, ambos os lints, build e HTTP de produção aprovados. 186 casos Playwright somente coletados, zero executados. Auditor de fotos parcial (exit 1): 9/98, 89 bloqueios, zero arquivos órfãos.

Comandos, resultados exatos e logs em [evidências v2.7](evidence/ra2-v2.7/README.md). Feito: investigação, correções, regressões, revisão independente e verificações viáveis. Não feito: navegador, fotos adicionais, preços reais, benchmark, pesquisa humana, merge, deploy ou etapa 8. Publicação somente na branch autorizada com conferência de SHA/árvore e estado de CI; ausência de checks não significa CI aprovado.

## Continuidade v2.8 — jornadas técnicas

A etapa seguinte adiciona três percursos distintos com adaptadores frontend reais → HTTP Express → serviços/repositórios, incluindo roadmap e aplicação/hidratação de resultados. Encontrou também perda da identidade da build ao entrar em Upgrade a partir dos salvos, corrigida e retestada na v2.8. [Relatórios individuais, método e evidências](RA2-V2.8-JORNADAS.md). Esta adição não altera retroativamente as contagens/execuções da v2.7. Browser, captura, responsividade e pesquisa humana continuam pendentes; etapa 9 é independente.


## Fechamento técnico posterior — ef7f / ac27, 08/10/2026

A [consolidação atual](RA2-CONSOLIDACAO-FINAL.md) separa a execução completa ef7f (267 E2E aprovados, 1 skip, zero falhas; 18 integrações aprovadas) da revisão focal ac27 (rótulo de perfil, nome longo e cinco larguras). São também 15 casos preparados e três jornadas técnicas, não participantes reais. A revisão visual final, estados de cor/contraste e zoom 200% permanecem pendentes.

Os três grupos de UI/UX solicitados estão mapeados a evidência e limites na consolidação. Critérios históricos não foram reescritos. Dez fotografias são de família, preços são observações manuais datadas, e pesquisa real/retenção/monetização não foram realizadas. Fans extras não alteram temperatura no modelo atual. Nenhum resultado implica atendimento integral de 100% dos pedidos originais.
