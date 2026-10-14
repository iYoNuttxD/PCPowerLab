# Evidências v2.5

08/10/2026 UTC. Base `4f7690d531e0bcecf0748961f2eda0145c694db7`. Execução no checkout cloud autorizado; nenhum navegador lançado.

| Comando | Resultado e log |
| --- | --- |
| `npm test` | **398 testes passaram**, zero falhas/skips; `node-tests.log` |
| `npm run lint` | Passou; `backend-lint.log` |
| `cd frontend && npm run lint` | Passou; `frontend-lint.log` |
| `cd frontend && npm run build` | Passou; `frontend-build.log`; aviso de chunk >500 kB continua |
| `node frontend/scripts/check-catalog-render.mjs` | 3 grupos SSR passaram; `check-catalog-render.log` |
| `node frontend/scripts/check-recommendation-entrypoints.mjs` | 7 grupos SSR/handlers passaram; `check-recommendation-entrypoints.log` |
| `node frontend/scripts/check-chart-render.mjs` | 6 grupos SSR/dados passaram; `check-chart-render.log` |
| `node frontend/scripts/check-navigation-wizard.mjs` | 5 grupos SSR/handlers passaram; `check-navigation-wizard.log` |
| `node frontend/scripts/check-simulation-states.mjs` | **19 grupos / 490 asserções passaram**; `check-simulation-states.log` |
| `node frontend/scripts/check-page-audit.mjs` | 16 rotas iniciais + 32 pares opacos de tokens; `check-page-audit.log` |
| `cd frontend && npx playwright test --list` | 168 casos coletados, **zero executados**; `playwright-list.log` |
| `cd frontend && npx playwright test --config=playwright.integration.config.js --list` | 15 casos coletados, **zero executados**; `playwright-integration-list.log` |
| `git diff --check` | Passou |
| `frontend/scripts/qa-visual.mjs` | Ampliado para cinco larguras/todas as telas, **não executado** |
| Screenshots, DOM real, layout, teclado, leitor de tela, participantes | **Não realizados** |

Os testes Node incluem sete novos casos de parsing numérico e bloqueios do assistente. Os 40 grupos adicionais de SSR/handlers (3 + 7 + 6 + 5 + 19) exercitam fonte real com serviços/DOM substituídos por fixtures onde indicado. O roteiro de 16 rotas renderiza estado inicial, não efetua as requisições de carregamento. Os 32 contrastes são calculados em tokens opacos, sem composição de CSS. Nenhum desses resultados prova geometria, foco ou uso real.

Novos casos de browser cobrem navegação na mesma rota, histórico, Escape/clique externo, mudança de breakpoint, admin, compartilhamento/retry, etapa/refrigeração, títulos/unidades/cores, potência parcial e ausência versus zero. A coleta verifica descoberta/sintaxe, não comportamento.

## Pendências e limites

- Chromium teve socket negado e localhost foi negado no browser cloud anteriormente. Não houve retry dessas rotas, túnel ou bypass
- Validar **1440, 1024, 768, 390 e 320 px** e produzir screenshots antes/depois em ambiente autorizado; nenhuma largura foi observada visualmente nesta etapa
- Verificar todos os estados, carregamento, erro, vazio, menus, scroll/foco, modais, texto longo, zoom e tecnologia assistiva
- Validar com participantes o significado de “simulação final” e compreensão de FPS/índices/gargalos/compatibilidade/potência/preço de referência
- API atual mantém flags de compatibilidade coerentes. Apresentação defensiva para um payload contraditório (`compatible:true` junto de status incompatível/não verificado) não foi ampliada; guardas do assistente recusam esses payloads
- Settings locais do laboratório sobrevivem a retry/mudança da montagem, mas uma nova montagem da página recomeça pelos parâmetros de `build.game`; não foi adicionada persistência dos jogos comparados
- Sem benchmark físico, consulta de preço ao vivo, merge, deploy ou etapa 6

Auditoria e antes/depois: [RA2-V2.5-AUDITORIA-UX.md](../../RA2-V2.5-AUDITORIA-UX.md). Logs são resultados técnicos reais, não evidência de validação humana.
