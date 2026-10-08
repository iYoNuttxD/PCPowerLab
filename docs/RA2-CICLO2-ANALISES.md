# RA2 · Ciclo 2 — Clareza das análises e simulação de jogos

Implementação de 07/10/2026 na branch `codex/pcpowerlab-ra2-ciclo2`, após o commit do assistente `41486c8`. Escopo: explicar resultados técnicos e oferecer simulação individual no Performance Lab, preservando a comparação e os serviços existentes.

## Inspeção e decisões

O Performance Lab apresentava primeiro a simulação profissional e depois a comparação de dois ou mais jogos. O serviço `performanceService.simulateGame` e a rota individual já existiam e eram utilizados pelo fluxo de resumo. A comparação interpretava a classificação por limites locais de FPS e considerava 60 FPS como atendimento aos requisitos recomendados, embora a API devolva esses dois dados explicitamente. O resumo também apresentava compatibilidade positiva quando ainda não havia resultado de análise.

- **Dois modos explícitos**: “Simular um jogo” e “Comparar jogos”, com botões de opção nativos, operação por teclado e foco visível. O modo individual é a entrada padrão; resolução e qualidade se aplicam ao modo ativo. As seleções de cada modo são mantidas durante a alternância.
- **Contratos reaproveitados**: o modo individual envia `gameId`, `targetResolution`, `qualityPreset` e `build` para `/performance/simulate-game`. A comparação usa `gameComparisonService.compare` com `gameIds` e os mesmos parâmetros; o limite de 2 a 10 jogos acompanha a validação existente do backend. A simulação profissional continua disponível.
- **Resultados do backend preservados**: FPS, classificação, requisitos mínimos/recomendados, avisos e detalhes técnicos vêm da resposta. Foram removidas as classificações locais que divergiam da API. A linha de 60 FPS permanece apenas como referência visual, com legenda explícita.
- **Estimativas identificadas**: os resultados de jogos exibem o aviso “Estimativa, não medição real” e explicam que o FPS real pode variar. A avaliação de software, o desempenho cadastrado e a nota geral também são apresentados como resultados de modelo, sem prometer medição ou desempenho garantido.
- **Explicações progressivas**: um componente compartilhado usa `details`/`summary` para FPS, gargalo, pontuação, potência/energia, compatibilidade, custo-benefício e nota da build. As explicações ficam fora dos gráficos. Os valores principais e avisos permanecem visíveis; requisitos, multiplicadores e detalhes dos gargalos podem ser expandidos.
- **Gráficos legíveis**: comparação em barras horizontais; nomes completos, classificações e requisitos também disponíveis em tabela acessível. A tabela pode rolar dentro de sua própria região no celular. Animações dos gráficos alterados foram desativadas. Desempenho e energia têm legendas textuais com valores, independentes de cor e hover, e menos espaço vazio entre gráfico e legenda.
- **Unidades e escalas**: os componentes usam pontuação de 0 a 100, distinta de FPS. O gráfico energético diferencia potência estimada das peças, capacidade nominal da fonte e energia em kWh. A referência de fonte com 35% de folga e arredondamento para 50 W já existia e foi mantida, agora com explicação. O ranking informa que o custo-benefício é normalizado por categoria e usa preços de referência.
- **Estados coerentes**: build incompleta informa as peças faltantes e oferece acesso ao assistente; seleção insuficiente explica o bloqueio. Catálogos distinguem carregamento, vazio e falha, com recuperação. Erros de jogos e de software são independentes. Ausência de parâmetros oferece explicação simples e preserva os detalhes da API. Valores ausentes não viram zero FPS nem entram na média.
- **Respostas vinculadas às escolhas**: mudar modo, jogo, resolução, qualidade ou build invalida o resultado anterior. Respostas atrasadas são ignoradas e não passam a representar outras escolhas; o mesmo cuidado vale para software e saída da página. As peças e o orçamento da montagem não são alterados pela simulação.
- **Resumo mais fiel**: compatibilidade sem análise aparece como pendente. A seção de análises apresenta os alertas completos de compatibilidade. Avisos retornados pela nota geral ficam visíveis. O resumo reutiliza o mesmo resultado individual do Performance Lab.

Nenhum algoritmo de simulação foi duplicado ou alterado. Backend, rotas, contratos HTTP, regras de compatibilidade/orçamento, autenticação e dependências permanecem intactos. O requisito já existente de montagem completa com sete categorias foi preservado no Performance Lab.

## Arquivos

| Arquivo | Alteração |
| --- | --- |
| `frontend/src/pages/PerformanceLab.jsx` | Dois modos, serviços existentes, seleção, estados independentes e recuperação de falhas. |
| `frontend/src/components/build/GameSimulationResult.jsx` | Resultado individual compartilhado, estimativa, requisitos, avisos e detalhes técnicos. |
| `frontend/src/components/build/GameComparisonResult.jsx` | Gráfico comparativo extraído, dados da API e tabela acessível. |
| `frontend/src/components/build/AnalysisHelp.jsx` | Explicações contextuais e aviso de estimativa compartilhados. |
| `frontend/src/hooks/useSimulationRequest.js` | Estado da requisição vinculado aos parâmetros e descarte de respostas antigas. |
| `frontend/src/utils/performancePresentation.js` | Formatação de valores/requisitos e mensagens de falha. |
| `frontend/src/components/build/BottleneckPanel.jsx` | Legendas, unidades, escalas e detalhes progressivos. |
| `frontend/src/components/compatibility/CompatibilityStatus.jsx` | Contexto sobre o alcance da verificação. |
| `frontend/src/pages/BuildSummary.jsx` | Compatibilidade pendente, alertas da nota e resultado individual reutilizado. |
| `frontend/src/pages/Insights.jsx` | Explicação do ranking, preço e normalização por categoria. |
| `frontend/src/pages/CompareBuilds.jsx` | Contexto sobre preço de referência e pontuação de desempenho. |
| `frontend/src/styles/global.css` | Modos, explicações, tabela, gráficos e adaptação móvel. |
| `frontend/tests/e2e/performance-lab.spec.js` | 12 cenários novos, executados em desktop e celular. |
| `frontend/README.md` | Cobertura e referência à documentação desta etapa. |
| Este documento e `docs/evidence/ra2-ciclo2-analises/` | Decisões, resultados e evidência visual. |

## Validação

Ambiente: Node 26.9.0, Playwright 1.64.0, Chrome 154.0.8037.98 local em modo headless e axe-core 4.14.0.

| Verificação | Resultado |
| --- | --- |
| `npm test` na raiz | **247/247** testes aprovados. |
| `PLAYWRIGHT_CHANNEL=chrome npm test --prefix frontend` | **50/50** E2E aprovados, sem retries: 26 do assistente e 24 desta etapa. |
| `npm run lint` e `npm run lint --prefix frontend` | Aprovados. |
| `npm run build --prefix frontend` | Aprovado. Permanece o aviso existente de chunk maior que 500 kB. |
| API local real | Simulação individual, comparação, software, compatibilidade, gargalos, geração de resumo, nota e ranking exercitados com build pronta. |
| Larguras 1440, 1024, 768, 390 e 320 px | **40 verificações**, sem overflow horizontal da página e sem erros JavaScript de página. |
| axe, resultado individual/comparação/resumo/ranking em desktop e celular | **8 verificações**, zero violações automáticas; contraste sobre gradientes/SVGs permanece parcialmente `incomplete`. |
| Screenshots antes/depois | Capturados no Chrome e inspecionados visualmente. O antes foi renderizado a partir de uma cópia temporária de `41486c8`, sem alterar a branch de trabalho. |

Os E2E controlam a API para verificar contrato individual, comparação múltipla e limites de seleção; classificações/requisitos que não podem ser inferidos apenas pelo FPS; carregamento nos dois modos; parâmetros ausentes nos dois endpoints; falha de rede e de servidor com nova tentativa; catálogo vazio/indisponível; software independente; build incompleta sem requisição de simulação; valores ausentes; invalidação de resultados e respostas atrasadas; teclado; avisos da nota; detalhes de gargalos e interpretação do ranking. O ensaio com a API real complementa essas fixtures, sem equivaler a uma medição de desempenho de jogos.

As verificações de layout cobrem entrada, resultado individual, detalhes individuais, comparação, tabela comparativa, software, resumo e ranking em cada largura. As capturas de painéis usam recortes da página renderizada, preservando CSS e conteúdo, sem ocultar elementos da aplicação.

O resultado do axe não é certificação de acessibilidade. A validação visual usa viewports simulados no Chrome; Safari, Firefox, dispositivos físicos e leitores de tela não foram homologados nesta etapa. Não houve execução de jogos reais ou benchmarking de hardware.

## Evidências

- Entrada antes: [desktop](evidence/ra2-ciclo2-analises/before-1440-modes.png) · [celular](evidence/ra2-ciclo2-analises/before-390-modes.png)
- Entrada depois: [desktop](evidence/ra2-ciclo2-analises/1440-modes.png) · [celular](evidence/ra2-ciclo2-analises/390-modes.png)
- Simulação individual: [desktop](evidence/ra2-ciclo2-analises/1440-single.png) · [celular](evidence/ra2-ciclo2-analises/390-single.png) · [detalhes técnicos](evidence/ra2-ciclo2-analises/1440-single-details.png)
- Comparação antes: [desktop](evidence/ra2-ciclo2-analises/before-1440-comparison.png) · [celular](evidence/ra2-ciclo2-analises/before-390-comparison.png)
- Comparação depois: [desktop](evidence/ra2-ciclo2-analises/1440-comparison.png) · [celular](evidence/ra2-ciclo2-analises/390-comparison.png)
- [Nota geral no celular](evidence/ra2-ciclo2-analises/390-score.png) · [Energia no celular](evidence/ra2-ciclo2-analises/390-energy.png) · [Ranking explicado](evidence/ra2-ciclo2-analises/390-ranking.png)
- [Medições de layout e auditoria automática](evidence/ra2-ciclo2-analises/validation.json)

Para reproduzir a suíte automatizada, consulte [frontend/README.md](../frontend/README.md#testes-do-assistente).
