# RA2 V2.10 — feedback, continuidade e referências rastreáveis

08/10/2026 UTC. Base: `64bf1c248fab4c42e833709917834b1703f967a4`, árvore `0007acbef14f9c8c9813cae334c88e86bb36e662`. Branch `codex/pcpowerlab-ra2-ciclo2`. Alterações preparadas em cópia isolada dessa árvore, sem alterar o checkpoint v2.9.

**Estado: NÃO HOMOLOGADA.** A implementação e os contratos técnicos avançaram; fotografias integrais, inspeção visual da revisão publicada, fontes comerciais em tempo real e validação com participantes continuam incompletos. Nenhum requisito completo é promovido a VALIDADO por estes testes.

## Escopo e origem

O [mapa técnico R01–R22](RA2-V2-FEEDBACK-PROVENIENCIA.md) registra requisitos de software, decisões de implementação e limites. R06 inclui navegação entre páginas; R16 inclui configurações completas; a meta fotográfica é cobertura integral. Este documento não publica dados privados de pesquisa nem transforma testes de software em resultados de uso ou comerciais.

Os relatos de Chrome recebidos durante esta execução não traziam SHA confirmado do servidor local. Foram usados como pistas, seguidas de inspeção/reprodução nos contratos do código atual. Não são apresentados como reteste visual desta árvore.

## Correções integradas

| Área | Problema e mudança | Alcance da evidência |
| --- | --- | --- |
| Montagem | Conflitos conhecidos de socket, memória, gabinete/placa-mãe e comprimento da GPU aparecem na escolha, com motivo e caminho para trocar a outra peça. Avançar fica bloqueado na etapa afetada; demais escolhas permanecem. Dados desconhecidos não fabricam conflito nem aprovação | Helpers e handlers reais; interação visual pendente |
| Resumo | Dica distingue cálculo, sucesso, indisponibilidade, erro e resultado invalidado; não manda executar novamente após uma estimativa válida. Termos internos e mensagens públicas ganharam linguagem/acentuação coerentes | Estados/SSR e domínio |
| Gráficos | Energia usa barras horizontais e categorias separadas; tooltip de jogos fica ancorado dentro do gráfico com largura limitada, texto quebrável e valores equivalentes em tabela | Código/SSR; geometria de 320–768 px ainda precisa de navegador |
| Substituição | Peça atual e alternativa escolhida aparecem antes dos filtros. Quando a alternativa já foi recomendada, filtros começam recolhidos. Verificar/aplicar/voltar mantém os contratos existentes | Regressões de seleção/handlers; viewport real pendente |
| Comparação completa | Inclusão da montagem atual é explícita e pode ser desmarcada. Mostra custo-benefício, alertas/gargalos e pontuação final. Índice da posição enviada distingue nomes repetidos. Sem análise de gargalos válida não exibe ausência como conclusão | Domínio, SSR e handlers |
| Critério Desempenho | A recomendação antes dizia “maior pontuação de desempenho” embora o orçamento alterasse o ranking. Agora explica a pontuação final e suas penalidades. O orçamento não é uma exclusão automática; o status de cada alternativa permanece visível | Controle independente: 71,29 dentro do orçamento supera 71,86 acima; com ambas dentro, a maior volta a liderar |
| Navegação de análises | Inputs e resultados concluídos sobrevivem ao retorno na mesma aba somente com identidade/revisão/origem/parâmetros correspondentes. Fonte salva e catálogo são revalidados. Erros, pedidos interrompidos, resposta atrasada e dados inválidos não ressuscitam resultados | 15 grupos de hooks/SSR e testes de sessão; Back/Forward real pendente |
| Custo-benefício | Menu usa as sete categorias aceitas pelo ranking existente; refrigeração sem modelo de desempenho não recebe ranking inventado. Limite inteiro de 1 a 50 é validado junto ao campo; erro não se confunde com catálogo vazio | Cinco grupos de handlers/SSR/contrato real e controle negativo |
| Plano de upgrade | Valores textuais em moeda brasileira; badges dizem “Impacto esperado” e “Prioridade” | Renderização SSR |
| Salvar configuração | O editor antes sumia após salvar e podia expor um link de upgrade sob o segundo clique. Agora é modal nativo que permanece aberto após sucesso, com repetição idempotente, fechamento explícito, nova edição/retry e proteção contra resposta antiga | Handlers reais e controle negativo da base; hit-testing/foco real pendente |
| Versões e cards salvos | Snapshot exibe nomes, refrigeração, quantidades, orçamento e preferências; JSON original fica intacto em detalhes técnicos fechados. Linhas de peças usam largura inteira do card | SSR e contrato do snapshot; geometria de tablet pendente |

Sessão de análises: seis chaves fixas, somente nesta aba, versão de schema, limite de tamanho e expiração em duas horas. Não armazena autenticação, pedidos em andamento ou erros. Bloqueio de sessionStorage não impede o aplicativo de funcionar.

## Preços e estado da montagem

**42/98 referências datadas; 56 estimativas sem fonte datada validada; zero cotações de API ao vivo.** [Pesquisa, identidade e condições](RA2-V2-PRECOS-DATADOS.md). Somente as cinco lojas solicitadas entram na pesquisa publicada. As referências aplicadas vieram de Pichau, Terabyte e KaBuM/vendedor identificado; não foi inventado preço/vendedor para Amazon ou Mercado Livre.

Valores PIX e cartão ficam separados; o total usa referência à vista quando disponível e informa a composição datada/demonstrativa. Disponibilidade histórica não vira estoque atual. Conteúdo indexado pode ser anterior à data de consulta. Frete e custos não verificados não são inventados.

Uma montagem ativa recuperada usa os preços e especificações do catálogo atual, sem colar selo novo em preço antigo. Mudança de catálogo invalida análises e reconcilia o histórico de desfazer; peça ausente preserva a identidade mas deixa o total indisponível. O recibo/snapshot histórico salvo não é reescrito. Edição administrativa invalida a origem datada quando muda identidade ou valor.

A base de teste de sete peças mudou de R$4.699,30 para **R$4.993,28**, por referências documentadas. Testes de orçamento foram atualizados com centavos independentes, sete valores literais, fonte congelada para os 42 registros e limites de um centavo; não se ampliaram tolerâncias para esconder falhas.

## Fotografias e identidade

**11/98 produtos têm fotografia aprovada no auditor de arquivos; 87 continuam sem fotografia verificável.** São dez arquivos de imagem: a nova foto original de Ryzen 5500/5600 é preservada byte a byte e exibida em duas janelas distintas, com atribuição e CC BY 3.0. Não houve geração/substituição por IA. A exceção de compartilhamento/tamanho está presa a IDs, geometria, dimensões e digest específicos; não libera fotos duplicadas arbitrárias. A revisão de pixels da apresentação real no navegador permanece pendente.

Nenhum item foi retirado do catálogo para melhorar a porcentagem. Quatro identidades genéricas e 11 famílias de GPU ainda precisam de fabricante/part number inequívocos antes de receber mídia/preço de variante. O caminho de migração preserva IDs e configurações legadas, sem fingir que uma variante já estava especificada. Aquisições negadas não foram repetidas.

## Verificação e limites

- Node: **511 testes aprovados**, zero falhas, no resumo publicado [node-test.log](evidence/ra2-v2.10/node-test.log)
- Backend/frontend ESLint, build e todos os scripts `check-*` têm registros separados em [evidências](evidence/ra2-v2.10/README.md)
- Controles negativos preservam o defeito de linguagem, identidade duplicada, perda de sessão, sumiço do editor e jargão de versões
- Build mantém o aviso conhecido de bundle maior que 500 kB; não é tratado como erro nem ocultado
- HTTP de produção verifica rotas, bundles, erros JSON e entrega das 11 identidades/10 arquivos; não testa hidratação React
- Jornadas HTTP são cenários técnicos sintéticos, não participantes do Ciclo 1/2
- Playwright foi apenas coletado neste ambiente; nenhum caso coletado equivale a uma execução. Não há screenshots desta árvore neste registro

Reteste visual recomendado no SHA publicado: 320/390/768/desktop; foco, navegação, cards e contraste em estados reais; incompatibilidade AM4/AM5 e recuperação; tooltip/energia sem overflow; atual/proposta no modal; Voltar/Avançar em jogos/upgrades; double-click em salvar; versões legíveis; fotos exatas individuais; fonte de preço e migração de montagem salva. O responsável pela inspeção deve registrar SHA, viewport, passos e resultado observado.

Continuam externos/incompletos: 87 fotos, identidade física das variantes, fornecedor de preços ao vivo, precisão física/benchmarks, validação com pessoas, retenção/receita e limites arquiteturais já registrados na v2.9. Este passe não transforma testes técnicos em prova desses resultados.


## Correspondência com os 16 achados da inspeção anterior

Todas as linhas abaixo exigem confirmação visual no SHA publicado. A evidência técnica não converte o navegador de revisão indeterminada em teste desta versão.

| Achado | Tratamento nesta árvore |
| --- | --- |
| V01 | Editor de build em modal estável, salvamento idempotente e resposta atrasada isolada |
| V02 | Tooltip ancorado/limitado e texto quebrável; largura real ainda pendente |
| V03 | Somente categorias do contrato de ranking; sem pontuação inventada de refrigeração |
| V04 | Formulário de recomendação antes dos cards; atalhos com foco/rolagem acessíveis |
| V05 | Sessão de laboratório/upgrades; resumo principal preservado em remount e explicação para recarga/auxiliares |
| V06 | Explica pontuação ponderada e orçamento; não afirma exclusão automática inexistente no motor |
| V07 | Aviso imediato de incompatibilidade e avanço bloqueado na etapa afetada |
| V08 | Atual e proposta no topo da prévia; filtros opcionais recolhidos quando há candidata |
| V09 | Limite de 1–50 junto ao campo; erro, carregamento e resultado vazio distintos |
| V10 | Gráfico energético horizontal; geometria de 320 px pendente |
| V11 | Dica de sucesso/indisponibilidade/erro coerente com o resultado atual |
| V12 | Títulos e orientações de refrigeração em português |
| V13 | Rótulos RAM, alias equivalente deduplicado, classificações/qualidade e texto de upgrade legíveis |
| V14 | Linhas de peças em largura completa nos cards salvos; tablet pendente |
| V15 | Snapshot humano com JSON opcional intacto; BRL e badges explicados |
| V16 | Feedback geral avalia a experiência no projeto; contexto de recomendação só quando realmente associado |


Os arquivos de execução publicados são resumos seguros. Os registros detalhados completos permanecem na recuperação local, sem publicação de diagnósticos internos ou dados incidentais. Fonte, assets e resultados dos testes não foram alterados por essa preparação documental.
