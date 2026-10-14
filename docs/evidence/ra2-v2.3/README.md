# Evidências técnicas V2.3 — 08/10/2026 UTC

Base publicada antes da etapa: `145c79d48e5b16ce0f09b5f20d446079215755f4`. Arquivos alterados pertencem ao commit que contém este relatório.

| Verificação | Comando | Resultado |
| --- | --- | --- |
| Regressões Node (backend e helpers frontend) | `node --test tests/*.test.js frontend/tests/*.test.js` | 371 testes, 371 passaram, zero falhas/cancelados/skips; 17 testes a mais que a base de 354 |
| Lint backend | `npm run lint` | Passou |
| Lint frontend, scripts e testes | `npm --prefix frontend run lint` | Passou |
| Bundle de produção | `npm --prefix frontend run build` | Passou; aviso preexistente de chunk >500 kB permanece |
| E2E: somente coleta | `npm --prefix frontend run test -- --list` | 134 casos coletados; nenhum executado (`browser-collected.log`) |
| Integração browser: somente coleta | `cd frontend && npx playwright test --config=playwright.integration.config.js --list` | 15 casos coletados; nenhum executado (`integration-collected.log`) |
| Renderização estática React | `node frontend/scripts/check-catalog-render.mjs` | Passou: 9 conjuntos de filtros, diferenças/dados ausentes, região focável e rejeição entre categorias; sem executar efeitos ou navegador |
| Whitespace/conflitos | `git diff --check` | Passou |

Total browser: 149 casos coletados e zero executados. Logs completos estão nesta pasta. A nova suíte `catalog-v23.spec.js` contém 13 cenários, coletados em 26 combinações de projeto (desktop/mobile). O teste exclusivamente geométrico mobile declara skip no projeto desktop; isto ainda não foi executado.

## Cobertura e distinção de evidência

Os testes de backend percorrem todos os candidatos do catálogo e comparam a prévia com o motor de compatibilidade já usado no resumo. Helpers verificam filtros, arrays, SKU, preços/índices ausentes, ordenação, payload, seleção e pacotes. Os casos browser preparados verificam ações de UI, estado persistido, reset, categorias, comparação, atraso, falha e nova tentativa. **Preparados/coletados não significa aprovados.**

Navegação, screenshots e inspeção visual estão bloqueadas pelo ambiente: negativa de socket do Chromium e de localhost no navegador cloud documentadas em etapas anteriores. Não se repetiram esses caminhos negados. Não foi acessado computador do usuário, túnel ou rota alternativa para contornar a restrição. Não há evidência visual ou aprovação por usuários nesta etapa.
