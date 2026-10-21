# V3: validação de navegador no Mac

Data local: 20/10/2026, America/Sao_Paulo. Os logs usam UTC e a execução E2E final terminou em 21/10 UTC. Base recebida: `d5298c426a38c24a10e234f4545469ec210f5319`, branch `max/pcpowerlab-v3-cycle2`, PR #47 em rascunho. Clone isolado; nenhuma alteração do checkout pessoal foi modificada. Sem merge ou deploy.

## Fonte e natureza da observação

`Ciclo2.xlsx` foi materializado pela Library neste Mac, verificado como XLSX legível e consultado em modo somente leitura: dez respostas na aba `Respostas ao formulário 1`. Nomes e respostas brutas não são publicados. Os números P03/P06/P07/P09 abaixo identificam a ordem anônima das respostas, não sessões novas.

Esta é inspeção técnica do agente com o navegador autorizado. Não é um ciclo 3 com participantes, não mede conclusão sem ajuda e não certifica a meta de 90%. A combinação exata do relato original continua desconhecida.

| Relato do ciclo 2 | Comportamento observado e correção | Evidência e limite |
| --- | --- | --- |
| P03, linha 4: orçamento cedo e informação em excesso | Orçamento/uso abrem a jornada. O campo ainda ficava abaixo da dobra no notebook: removidos título e descrição duplicados, reduzido espaço inicial e mantida folga ao voltar. Cards mostram duas especificações e detalhes expansíveis. | Novo caso E2E exige orçamento e uso inteiros em 1366 × 768 sem rolar; percurso real em 1366 e janela normal. Não demonstra preferência de novos participantes. |
| P06, linha 7: listas/filtros e diferenças entre placas-mãe | Busca, limites, Mais filtros, chips e limpeza utilizáveis. Socket, DDR, M.2 e Wi-Fi diferenciam modelos; detalhes preservam campos completos. A borda de erro aumentava a altura dos campos: reforço interno mantém a geometria. | E2E em 320/390/768/1024/1440; filtro AM4, detalhes, Escape e foco observados no Chrome. Recursos cadastrados não confirmam BIOS instalada. |
| P07, linha 8: mais gabinetes | Quatro modelos ativos visíveis; DeepCool CC310 selecionado na montagem real e mantido em resumo/troca/desfazer. | Expansão factual existente preservada; sem novo preço, foto ou especificação nesta rodada. |
| P09, linha 10: todas as peças mas “Dados insuficientes”, análises e lojas bloqueadas | Montagem manual com 3050 LP sem calibração exibiu sete peças, R$ 5.759,75, saldo de R$ 240,25 para R$ 6.000, compatibilidade principal e refrigeração pendente. Gargalos/FPS indisponíveis receberam motivo específico; lojas continuaram acessíveis. | Testes de falha 503, atraso de lojas e tentativa independente passaram. É uma configuração de teste do agente; o original do participante não foi reproduzido. |
| P03/P06/P09: recomendação, alternativas e resultados pouco claros | Recomendação real para programação/R$ 6.000 apresentou total de R$ 5.589,75, perfil, regra de seleção e motivos por peça. Explicação de RAM mostrou 8 GB, preço, peso do perfil, posição e alternativa de 16 GB, com limites explícitos. A mensagem vazia que pedia orçamento já informado passou a orientar Gerar recomendação. | A classificação declara busca em subconjunto e ausência de ótimo global. Alternativas factuais não equivalem a benchmark ou recomendação de compra garantida. |
| Navegação e organização parcialmente atendidas | Busca e detalhes não apagaram escolhas; voltar/avançar/recarregar preservaram sete peças e R$ 6.000. Troca apenas da RAM: R$ 5.759,75 → R$ 4.979,75, diferença −R$ 780,00, outras seis peças preservadas. Desfazer restaurou peças e total, com nova análise. | Percurso no navegador e integrações reais; análises obsoletas não voltam após recarga. |

## Execução automatizada

| Verificação | Resultado |
| --- | --- |
| E2E completo | **305 passaram, 1 skip esperado, 0 falhas, 0 retries**. 306 casos registrados. O skip é a geometria exclusiva de celular no projeto desktop. |
| Integração de produção/API real | **18 passaram**, desktop 1440 × 900, tablet 768 × 1024 e celular 390 × 844; sem interceptar endpoints. |
| Node | **1.030 passaram**, zero falhas/skips, usando Node 24 LTS e Python com Pillow. |
| Lint backend/frontend e build | Aprovados. Bundle continua maior que 500 kB. |
| Scripts, contraste, imagens | 17 verificadores passaram; 64/64 contrastes e 88/88 imagens. |
| Verificação focada após ajuste final de espaço | 19 testes Node de acessibilidade/jornada/objetivo e quatro casos E2E de foco/orçamento passaram; depois, a suíte E2E inteira foi repetida. |

Ambiente observado: macOS 27.0.1, Chrome 155.0.8059.85, Playwright 1.64.0, React 19.2.6 e Vite 7.3.3 do lockfile. Node do shell: 26.11.1; Node LTS instalado: 24.19.0; Python instalado com dependências: 3.12.14. A primeira execução Node falhou por ausência de Pillow no Python padrão; um harness SSR também falhou no Node 26. Ambos passaram com os runtimes já instalados adequados ao projeto. Não foi alterado o runtime global do usuário.

A primeira rodada E2E teve 282 aprovações, 21 falhas e 1 skip. Foram corrigidos contratos antigos dos testes: orçamento agora vem antes de refrigeração, pontuação exige abrir os detalhes progressivos, edição exige escolher a etapa e o endpoint correto é `/purchase-links/by-build`. A mensagem de BIOS foi delimitada à verificação correspondente. As asserções de preservação, falha, atraso, dados ausentes e independência de lojas foram mantidas. O erro de geometria dos campos foi corrigido no produto. Uma falha inicial de clique durante rolagem no diálogo não se repetiu na rodada focada nem nas duas rodadas completas seguintes; não foi escondida por retries. A primeira rodada completa após compactar o orçamento encontrou dois casos de folga do foco, corrigidos antes da rodada final.

## Inspeção real e capturas

- Chrome do usuário, cópia local com frontend de produção e Express real em loopback; nenhuma implantação pública ou compra.
- Celular 390 × 844, notebook 1366 × 768, monitor 1920 × 1080 e janela normal 1710 × 896. Os testes cobrem ainda 320, 768, 1024 e 1440 px.
- Tab, Shift+Tab, Enter, Escape, link de salto, busca/filtros, ciclo de foco do diálogo e retorno ao botão de detalhes.
- Zoom **nativo de 200%**, confirmado por “Zoom: 200%” na interface do Chrome: janela passou de 1710 × 896 para 855 × 448 CSS; DPR de 2 para 4. Orçamento, catálogo, diálogo e resumo permaneceram utilizáveis, sem overflow horizontal. Navegação estática na altura reduzida. Zoom restaurado para 100%.
- O aumento de fonte de 200% dos E2E é evidência separada, não foi usado como substituto do zoom nativo.

| Captura | Conteúdo |
| --- | --- |
| [Orçamento na janela normal](evidence/v3-mac-browser/budget-notebook.jpg) | Retorno à etapa de orçamento, 1710 × 896; o caso sem rolagem em 1366 × 768 está protegido no E2E. |
| [Resumo no celular](evidence/v3-mac-browser/summary-mobile.jpg) | Sete peças e análises parciais, sem concluir que faltam componentes. |
| [Troca no monitor grande](evidence/v3-mac-browser/replacement-large.jpg) | Antes/depois, custo e FPS indisponível explicitamente. |
| [Explicação da RAM](evidence/v3-mac-browser/recommendation-ram-large.jpg) | Motivos, custo, alternativa e limites da classificação. |
| [Orçamento a 200%](evidence/v3-mac-browser/budget-zoom-200.jpg) | Campos alcançáveis, foco visível e navegação estática. |
| [Detalhes a 200%](evidence/v3-mac-browser/details-zoom-200.jpg) | Diálogo sem corte horizontal; Escape devolve o foco. |
| [Resumo a 200%](evidence/v3-mac-browser/summary-zoom-200.jpg) | Orçamento, saldo e compatibilidade parcial legíveis. |

As capturas de resumo, troca e recomendações antecedem somente o último ajuste de espaço do primeiro orçamento; essas telas não mudaram depois. A captura da janela de orçamento foi atualizada com o build final.

## Evidência reproduzível e limites

Resultados e histórico de falhas: [results.json](evidence/v3-mac-browser/results.json). Logs: [E2E](evidence/v3-mac-browser/e2e.log), [integração](evidence/v3-mac-browser/integration.log), [Node](evidence/v3-mac-browser/node.log), [verificadores](evidence/v3-mac-browser/scripts.log), [build](evidence/v3-mac-browser/build.log), [lint backend](evidence/v3-mac-browser/backend-lint.log), [lint frontend](evidence/v3-mac-browser/frontend-lint.log) e [imagens](evidence/v3-mac-browser/images.log).

Com dependências instaladas e Chrome disponível, execute `PLAYWRIGHT_CHANNEL=chrome npm test` no frontend e `PLAYWRIGHT_CHANNEL=chrome npm run test:integration`. Para Node/imagens, use um Python com Pillow (`PYTHON` ou `PATH`) e Node LTS para os harnesses SSR. A suíte E2E usa respostas controladas; a integração usa API real. A inspeção do Chrome foi adicional às duas.

Continuam pendentes: configuração exata do respondente; calibração dos cinco novos CPUs/GPUs; BIOS/ReBAR/UEFI/CSM/GPT e refrigeração quando desconhecidos; leitor de tela e cores forçadas reais; sessões humanas do ciclo 3. Nenhuma pontuação ou FPS novo foi fabricado. Não há certificação WCAG integral, garantia de preço/estoque ou aprovação de CI por ausência de workflow. O aviso de bundle grande permanece.

## Fechamento integral: vídeo integrado e preservação da UX

Inspeção adicional no Chrome conectado ao Mac, em 21/10/2026. O orçamento R$ 3.000 foi preenchido pela interface; selecionados Estudos e vídeo integrado, gerada e aplicada a proposta de R$ 2.489,94. O resumo foi gerado, recarregado e mantido com seis peças; foi observado e corrigido o texto fixo “7 de 7”, que passou a “6 de 6”. O pop-up identificou o Wraith Stealth incluído, manteve dados térmicos desconhecidos e não simulou um cooler genérico. Shift+Tab circulou dentro do diálogo e Escape retornou ao acionador.

Foram inspecionados 390 × 844 (resumo/pop-up), 1366 × 768 (orçamento/ações) e 1920 × 1080 (home), além do tamanho normal da janela. Sem transbordamento horizontal nos pontos medidos. As substituições de viewport foram removidas. Voltar/avançar e retorno ao assistente conservaram R$ 3.000 e a escolha de vídeo. A busca `wifi` encontrou três placas e a lista compacta foi exercitada. A comparação entre B650M D3HP e B650 GAMING X AX V2 mostrou diferenças de M.2, Wi-Fi, USB-C frontal e formato dentro do mesmo chipset, com explicação para leigos expandida. Essa observação comprova comportamento, não satisfação dos respondentes.

| Evidência | Conteúdo observado |
|---|---|
| [F01](evidence/v3-integral-completion/F01-integrated-cooling.jpg), [F03 celular](evidence/v3-integral-completion/F03-integrated-popup-mobile.jpg) | Pop-up real, cooler incluso identificado e ausência de curva explicitada. |
| [F02](evidence/v3-integral-completion/F02-integrated-summary-mobile.jpg) | Resumo no celular, seis peças preservadas. |
| [F06](evidence/v3-integral-completion/F06-home-large-final.jpg) | Composição da home em monitor grande; sequência 01–03. |
| [F07](evidence/v3-integral-completion/F07-budget-integrated-notebook.jpg) | Etapa 01, R$ 3.000 / total R$ 2.489,94 / saldo R$ 510,06, sem compra de GPU separada. |
| [F08](evidence/v3-integral-completion/F08-wifi-list-final.jpg) | Busca por recurso e exibição compacta. |
| [F09](evidence/v3-integral-completion/F09-b650-comparison-final.jpg), [F10](evidence/v3-integral-completion/F10-b650-guide-final.jpg) | Comparação e guia de placas do mesmo chipset. |
| [S18](evidence/v3-integral-completion/S18-3200g-available.txt), [S19](evidence/v3-integral-completion/S19-b450m-hdv-r4-available.txt) | Páginas exatas e disponíveis que fundamentaram as duas novas referências. |

O zoom nativo de 200% foi executado na etapa anterior e permanece identificado na cronologia. Nesta etapa final não foi repetido como zoom nativo: o E2E cobre 200% de tamanho de texto e reflow. Não se confunde esse teste com ampliação nativa do navegador. As capturas F04/F05 locais eram de uma região intermediária do resumo e não foram publicadas como prova de sua visão geral.
