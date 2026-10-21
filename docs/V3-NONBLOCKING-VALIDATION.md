# PCPowerLab V3 — estimativas utilizáveis e interface enxuta

Atualização de 21/10/2026, PR #47, branch `max/pcpowerlab-v3-cycle2`. Sem merge ou deploy. Este é o contrato técnico atual e substitui as restrições de versões anteriores. A regressão congelada terminou sem falhas; publicação ainda depende de commit/push e conferência remota. O registro exato será preenchido após essa conferência.

## Pedido que orienta esta revisão

O proprietário rejeitou filtros poluídos e o bloqueio do core por dados que o sistema não possui. Determinou estimar FPS, temperatura e ruído, usar dados existentes, tratar desconhecidos como avisos e permitir seleção manual mesmo com conflito. Pediu ainda simplicidade, visibilidade e hierarquia em toda a jornada. Estas instruções prevalecem sobre a exigência anterior de calibração empírica/SKU exato ou BIOS instalada para gerar resultados.

A ausência de medições limita a precisão; não impede usar o produto. Estimativa não é benchmark e dado desconhecido não vira compatibilidade comprovada. A experiência dos participantes continua sendo a referência; os testes abaixo demonstram comportamento técnico, não satisfação ou autonomia humana.

## Antes → depois

| Problema observado / relato | Mudança concreta | Evidência |
|---|---|---|
| Duas capturas do proprietário: múltiplas categorias/atalhos, mínimo/máximo, score, compatibilidade, ordenação e exibição concorrentes | Busca, categoria e preço máximo em Todas as peças; no máximo um campo essencial extra por categoria. Removidos mínimo, atalhos de preço/categoria redundantes, intervalo de score e filtro de compatibilidade. Marca/específicos/ordenação/exibição em Mais filtros recolhido. Chips/contador/limpar fora dos detalhes. | `ComponentFilters.jsx`; `catalog-v23.spec.js`; `check-catalog-render.mjs`; integração exige exatamente três campos visíveis em Todas as peças. |
| Captura com mural de BIOS, encaixe e campos desconhecidos | Conferência curta; desconhecidos opcionais; BIOS instalada removida do comparativo principal e dos gates. Alerta factual continua quando socket/RAM/formato/energia publicados conflitam. | `compatibility.service.js`, `CompatibilityStatus.jsx`; testes de montagem desconhecida e conflito Intel/AM4. |
| Manual não avançava ou não produzia desempenho quando incompatível | Pode avançar/analisar/aplicar troca manual; resultado é cenário teórico, não promessa de funcionamento físico. Recomendações automáticas evitam conflitos conhecidos. | `wizardSteps.js`; `replacementComparison.js`; `build-wizard.spec.js`; `nonblocking.spec.js`. |
| CPU/GPU sem perfil/calibração inutilizavam funcionalidades | Resolvedor único usa modelo registrado válido, aproximação de família ou classe genérica; FPS/software têm faixas e gargalos permanecem disponíveis. Identidade de perfil é conferida, sem copiar um registro de outro produto. | `estimatedPerformance.js`; `estimatedParametersService.js`; `nonblocking-core.test.js`. |
| Vídeo integrado chegava ao resumo sem FPS | Cenário integrado com RAM compartilhada e potência incluída no cenário da CPU; seis peças reais, nenhum produto GPU/preço fictício. | `integrated-graphics.test.js`; integração iniciante real; `scenarios.json`. |
| Refrigeração sem perfil retornava apenas indisponível | Faixas térmicas de classe e soma acústica com cooler padrão estimado, sem inventar produto/custo. Perfis registrados válidos são preservados e medição publicada é diferenciada. | `coolingFallback.js`; `cooling-simulation.test.js`; `summary-cooling.spec.js`. |
| Orçamento primeiro, mas iniciante precisava atravessar peças antes de pedir sugestão | Botão Sugerir peças para este orçamento na etapa 01; proposta aparece sem mural de peças faltantes. Aplicar é explícito; Ir para resumo só requer seleção de peças, não fichas completas. | `BuildWizard.jsx`; `WizardNavigation.jsx`; integração R$ 3.000 → proposta → resumo. |
| Resumo/justificativas exibiam excesso e ações dispersas | Preço/faixa FPS/classificação e ação principal primeiro. Peças, critérios, justificativas, equilíbrio/energia, requisitos e premissas são progressivos. Temperatura/ruído tem acesso direto; controles no diálogo são secundários. | `BuildSummary.jsx`; `BottleneckPanel.jsx`; `GameSimulationResult.jsx`; capturas N01–N03 e E2E de teclado. |
| Compartilhamento legado com status incompatível sem lista de alertas perdia o aviso | Status conhecido preservado com aviso curto e cenário manual permitido. | `CompatibilityStatus.jsx`; `check-saved-comparison-ux.mjs`. |

As capturas originais estão na Library: `libfile_676c768e1ea88191b45ecd9a5134a625` e `libfile_90b5c3ad97a081918a754d53f8a5dcfd`. Foram materializadas e inspecionadas antes dos ajustes. As imagens do projeto após a mudança estão em [evidence/v3-nonblocking](evidence/v3-nonblocking); não são imagens de participantes.

## Cobertura das avaliações

A [matriz completa dos 67 sinais](V3-FEEDBACK-FOLLOWUP.md#matriz-completa--comportamento-técnico-atualizado) preserva trecho/célula, interpretação, comportamento, evidência e classificação. Foram atualizadas 32 linhas de comportamento diretamente afetadas por esta revisão; as demais continuam rastreáveis, inclusive respostas positivas, parciais, não testadas e ambíguas.

- H7/R2/R3/R7/R9: busca por recursos e listas com fotos, agora com filtros efetivamente reduzidos. Contar filtros existentes não prova eficácia; testes exercitam consultas, limpeza e navegação.
- F4/H4/AD4/K4/L5: informação progressiva, orçamento inicial e pop-up térmico/acústico real; proposta diretamente utilizável. Não se resume H4 a diminuir texto.
- P3/P5/P7/P10/H10/AD7/AD8: opções de CPU/GPU baratas e superiores já ampliadas tornam-se utilizáveis no motor; seis gabinetes mantidos. Não se confunde contagem com adequação para todas as faixas.
- AB7/T4/T7/T9: comparação por modelo e recursos além do chipset, guia leigo, diferenças de rede/M.2/RAM/portas e campos desconhecidos explícitos. Unify/Tomahawk são exemplos da fala, não obrigação de incluir aqueles SKUs. BIOS não é critério principal de seleção.
- F10: cinco saídas tratadas separadamente: gargalos, simulação, conferência, recomendação final e lojas. Desconhecidos não derrubam o conjunto; falha temporária tem retentativa própria. Não se afirma reproduzir a combinação original desconhecida do participante.
- U4/U5/U7/U9 e V2/V4/V7/V9: faixas aproximadas e sugestões funcionais, sem gate por calibração; objetivo/orçamento mantidos e limites de capacidade claros.
- Q3/Q7/Q9: seleção de refrigeração integrada à montagem e resultados de classe mesmo sem perfil exato. Refrigeração não se reduz a compatibilidade física nem a acrescentar gabinetes.
- AB10/M2/M10: composição com ciano/coral/lima, hierarquia e fotos preservadas; agora menos controles simultâneos. Identidade visual continua uma avaliação subjetiva sem nova homologação humana.
- AD2 é elogio à melhoria já observada; imagens/preços elogiados foram preservados. G3/G5/G6/G7, AA5/AA9, X3/Y10, N6, AD11 e itens não testados não recebem causa inventada ou escopo infinito.

O anexo novo `Ciclo2(2).xlsx` foi materializado, aberto como XLSX e conferido: 11.873 bytes, 11 linhas incluindo cabeçalho, última célula AD11, SHA-256 `e683eac5d6a8f38186ff1b7016bcf6285f5971c513e71aba1df4080624bccd81`. É idêntico ao anterior; são 10 respondentes e 30 colunas. Os dados pessoais do arquivo não são publicados.

## Como as estimativas funcionam

### FPS, software e gargalos

`component-scenario-v2` mantém parâmetros válidos do catálogo; dados ausentes usam hipóteses apenas no cálculo. A ficha factual do produto não é alterada. Os coeficientes são parâmetros internos de cenário, não resultados atribuídos a um laboratório.

| Família | Índice geral / jogos / produtividade assumido |
|---|---|
| Ryzen 9 9900X | 95 / 90 / 98 |
| Ryzen 7 7800X3D | 94 / 98 / 83 |
| Ryzen 3 3200G | 34 / 32 / 30 |
| Ryzen 5 4500 | 52 / 49 / 50 |
| RTX 5060 Ti | 86 / 86 / 86 |
| RTX 5060 | 77 / 77 / 77 |
| RX 7600 | 69 / 69 / 66 |
| Arc A380 | 29 / 27 / 38 |
| RX 550 | 16 / 16 / 14 |

Sem família conhecida, a classe de CPU usa threads/clock disponíveis com limites; GPU usa hipótese genérica de 50 pontos. RAM e armazenamento usam capacidade/velocidade/classe quando disponíveis. Scores não equivalem a FPS nem demonstram que uma peça é superior em toda aplicação. Jogos ainda aplicam requisitos, qualidade, resolução e limitação do conjunto; o fallback de GPU limita projeções desproporcionais em relação à referência.

Faixa de FPS: ±25% para modelo cadastrado utilizável, ±45% com aproximações e ±55% para integrado, arredondada para inteiros. Essas amplitudes são escolhas conservadoras de cenário, **não intervalos estatísticos de confiança calibrados**. Software permanece em 0–100. Resultado baixo continua baixo; não se promete desempenho de jogo atual numa configuração de entrada.

Vídeo integrado: Vega 8 usa índice de cenário 13; gráficos básicos de algumas famílias Ryzen usam 7; demais casos usam 10. Um único módulo conhecido aplica redução gráfica aproximada de 20%; não é ganho medido de dual-channel. Reserva de 2 GB é deduzida uma única vez da RAM disponível ao cenário; a alocação real é dinâmica. Ausência de GPU só ativa esse caminho quando o usuário escolhe vídeo integrado. CPU explicitamente sem vídeo é evitada pela recomendação integrada; desconhecidos não são excluídos automaticamente. Seleção manual com conflito continua sendo cenário teórico.

### Temperatura e ruído

`cooling-class-v1` usa potência de referência escolhida, TDP publicado ou hipótese de 65 W. Cargas leve/mista/sustentada usam 25%/60%/100% dessa potência. A elevação térmica segue potência × resistência de cenário, com parcela de encapsulamento 0,10 °C/W e classe assumida: padrão/compacto 0,55, torre 0,30, AIO 0,18 (360 mm: 0,12), ajustada por rotação. Faixa de elevação −40%/+45%, mostrada com arredondamento de 5 °C; limite térmico só é usado quando publicado.

Classes acústicas assumidas a 75%: padrão 28 dBA, torre 25, AIO 29, fan extra 24 e fan do gabinete 23. Ajuste aproximado por rotação e soma energética/logarítmica; faixa ±8 dBA. Quantidade desconhecida do gabinete usa hipótese de duas ventoinhas. Duplicados, dados inválidos, quantidade zero e fans parados não são contados. Perfis válidos já registrados não são duplicados nem substituídos sem necessidade.

O resultado é **ruído das fontes de refrigeração a 1 m**, não ruído total do PC: GPU, fonte e ambiente não estão incluídos. As constantes acima são hipóteses de engenharia para comparação de cenários; fontes conceituais não as transformam em medições do SKU. O cooler padrão não adiciona identidade comercial ou preço inexistente. Se o catálogo registra um cooler incluso, seu nome é mostrado e seu custo já pertence à CPU.

Referências técnicas já pesquisadas: [resistência térmica — TI](https://www.ti.com/lit/pdf/slva462), [controle PWM — ARCTIC](https://support.arctic.de/pwm-settings). Referências de chip/família, anteriormente rejeitadas como calibração exata, podem orientar aproximação: [RTX 5060 — GamersNexus](https://gamersnexus.net/gpus/forbidden-review-nvidia-rtx-5060-gpu-benchmarks), [Arc A380 — Tom’s Hardware](https://www.tomshardware.com/reviews/intel-arc-a380-review). Os ensaios e variantes desses autores não são apresentados como teste das peças exatas do catálogo. As fichas oficiais e respectivas URLs permanecem em cada componente.

### Compatibilidade, orçamento e saídas independentes

Regras publicadas de socket/chipset/RAM/encaixe/energia continuam gerando alertas; o caso B550 + 3200G/3400G incompatível continua evitado automaticamente. BIOS instalada desconhecida não é gate. Nenhuma consulta exige uma unidade física inexistente antes de recomendar.

Dados de preço permanecem referências datadas, sem frete, montagem ou cotação em tempo real. Acessório de preço desconhecido não elimina a montagem: subtotal conhecido é mostrado, total/saldo ficam não confirmados. Não se inventa preço zero nem aprovação do orçamento. Recomendações automáticas com produtos precificados continuam respeitando o limite solicitado; abaixo do mínimo disponível há explicação com valor mínimo verificado.

## Cenários reais de serviço e navegador

[Entradas e saídas completas](evidence/v3-nonblocking/scenarios.json), geradas pelo serviço local em 21/10/2026. Não são medições de hardware nem pesquisa comercial nova.

| Entrada | Proposta / resultado |
|---|---|
| Estudos, R$ 3.000, integrado | Ryzen 3 3200G Box, ASRock B450M-HDV R4.0, Mancer Vant S 16 GB, A400 240 GB, MWE Gold 650 V3 e CC310: **R$ 2.489,94**; Valorant 1080p alto **18–62 FPS estimados**. |
| Estudos, R$ 4.000, dedicada | Mesmo par CPU/placa-mãe, RX550 4 GB, Apacer 8 GB, A400/MWE/CC310: **R$ 3.019,75**; Valorant **34–90 FPS estimados**. Comprimento/conector ausentes não impedem propor; permanecem desconhecidos. |
| Programação, R$ 5.500, menor preço, mínimo explícito RAM 16 GB / VRAM 8 GB | RX7600 Pro, RAM 16 GB e X2 Plus com CPU/placa/SSD/fonte básicos: **R$ 4.469,84**; Valorant **61–161 FPS estimados**. Cumprir capacidade não prova adequação para uma carga de programação; CPU/SSD são básicos. |
| Inspeção real no Chrome, integrado R$ 2.489,94 | Aplicação da proposta, resumo, seis grupos de peças/lojas; Cyberpunk 1080p alto **4–14 FPS estimados**, classificado insuficiente. Cooler padrão: **30–45 / 40–65 / 50–90 °C** nas três cargas e **21–38 dBA** aproximados. |
| CPU Intel com placa AM4, fluxo manual | Alerta de socket preservado; resumo e estimativas disponíveis como cenário teórico. Não afirma que o PC físico funcionaria. |
| GPU RTX5060 sem calibração exata e medidas ausentes | Resumo com faixa estimada, recomendações e links; confiança/premissas em detalhes. |

## Evidências, regressão e limites

Os logs de diagnóstico não são somados aos resultados finais. O [registro final](evidence/v3-nonblocking/results.json) contém o hash e as contagens; [congelamento](evidence/v3-nonblocking/code-freeze.json) conferido antes/depois: `fb3df73b5ec7467da022479a68a5ecef625b0040ca1efb6d8463878804e39df4`. Passaram **1.084 Node**, **309 E2E + 1 skip esperado**, **39 integrações reais** (desktop/tablet/celular), **17 verificadores**, ambos os lints, build e auditoria **95/95 imagens**. Seis casos adicionais registraram capturas e novas verificações de proposta/foco; sobrepõem-se às integrações, não aumentam o número de casos únicos. O skip é exclusivo de geometria móvel no projeto desktop. Build mantém aviso de bundle acima de 500 kB. As capturas N01–N03 são observações reais no Mac anteriores aos últimos ajustes de cabeçalho/compactação, identificadas com data e escopo; não certificam os pixels alterados depois.

A inspeção do agente já observou notebook 1366×900 e celular 390×844, faixa de estimativa, proposta econômica, popup e ciclo de foco, sem overflow. O último ajuste torna o cabeçalho Fechar fixo ao rolar o diálogo. Na retomada, a ferramenta informou Mac bloqueado; **não se tentou desbloquear ou contornar o bloqueio**. A inspeção visual adicional desse cabeçalho, monitor 1920 e zoom nativo 200% permanece pendente se a tela não for disponibilizada. Testes de navegador de layout/teclado continuam possíveis e são descritos separadamente da inspeção manual.

Limites externos reais: precisão empírica das faixas ainda não calibrada; nenhum ensaio físico do computador montado; não se conhece a configuração original de R09; nenhum ciclo 3 humano executado nem satisfação homologada. Esses limites não impedem seleção, estimativas, recomendação, salvar ou resumo.

## Capturas finais conferidas

[N04 desktop](evidence/v3-nonblocking/N04-final-cooling-focus-desktop-automated.png) e [N05 celular](evidence/v3-nonblocking/N05-final-cooling-focus-mobile-automated.png): pop-up após Shift+Tab até o último controle, botão Fechar visível e foco destacado. [N06 desktop](evidence/v3-nonblocking/N06-final-catalog-desktop-automated.png) / [celular](evidence/v3-nonblocking/N06-final-catalog-mobile-automated.png): três controles essenciais e extras recolhidos. [N07 desktop](evidence/v3-nonblocking/N07-final-proposal-desktop-automated.png) / [celular](evidence/v3-nonblocking/N07-final-proposal-mobile-automated.png): proposta acessível diretamente pelo orçamento. São capturas de integração com API real revisadas pelo agente; não são inspeção manual interativa nem homologação humana.
