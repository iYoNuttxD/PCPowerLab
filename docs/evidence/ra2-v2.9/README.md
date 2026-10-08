# Evidências finais V2.9 — 08/10/2026 UTC

Ambiente: Debian 13.6, Node 24.19.0, npm 11.9.0, Vite 7.3.3, Playwright 1.64.0. Dependências/lockfiles não alterados pela auditoria.

Fonte inicial remota/local: `5de7d88c906b2b66c63a4bc69e115045e012bf0d`, árvore `ca96e14c082f70ca96e7be170c43430494faf0f3`. Logs finais correspondem às correções presentes no commit que contém este diretório, não somente à fonte inicial.

[Relatório final](../../RA2-V2-RELATORIO-FINAL.md) · [registro deduplicado de testes](../../RA2-V2-REGISTRO-TESTES.md) · [matriz final](../../RA2-V2-REQUISITOS.md) · [inventário atual](../../RA2-V2.9-INVENTARIO.json).

## Reprodução

Da raiz, com dependências declaradas da raiz/frontend instaladas e Python/Pillow disponíveis:

```sh
npm test
npm run lint
npm run lint --prefix frontend
npm run build --prefix frontend
for script in frontend/scripts/check-*.mjs; do node "$script"; done
node scripts/check-quality-production.mjs
JOURNEY_EVIDENCE_PATH=docs/evidence/ra2-v2.9/journeys.json node scripts/check-profile-journeys.mjs
node scripts/audit-component-images.js --report
node docs/evidence/ra2-v2.9/generate-inventory.mjs
(cd frontend && npx playwright test --list)
(cd frontend && npx playwright test --config=playwright.integration.config.js --list)
git diff --check
```

Auditor de fotos retorna exit 1 por 89 fotos ausentes; não é falha operacional. `--list` somente descobre casos, não inicia navegador. Não repetir rotas negadas/túneis para executar a suíte. Browser/visual requerem ambiente autorizado funcional.

Logs versionados tiveram apenas espaços finais/linhas vazias finais normalizados para satisfazer `git diff --check`; valores, asserções e resultados foram preservados. `results.json` consolida as contagens e `source-manifest.json` identifica por SHA-256 a fonte/testes executados.

## Conteúdo

- `node-test.log`: suíte final; `initial-454-node-test.log`: primeira execução independente antes dos achados
- `ssr-handlers.log`: cada um dos dez scripts e seu exit code; nenhum browser
- `journeys.log/json`: três jornadas técnicas/17 passos, adaptadores frontend e HTTP real; nenhuma pessoa
- `production-http.log`: SPA, bundle, prefixo/API JSON e nove imagens servidas por HTTP
- `backend-lint.log`, `frontend-lint.log`, `build.log`: verificações finais e aviso do bundle
- `image-audit.log`, `integrity.log`, `catalog-inventory.json`: contagens verificadas; este último é saída bruta histórica do gerador com etiqueta v2.1, o snapshot final consolidado é `RA2-V2.9-INVENTARIO.json`
- `media-callsites.log`: integração de imagens pela fonte, não screenshots
- `feature-baseline-red.log` / `feature-focused-green.log`: F01/F02; testes em `tests/final-recommendation.test.js` e `frontend/tests/build-budget-total.test.js`
- `array-contract-baseline-red.log` / `array-contract-focused-green.log`: F04; `tests/core-spec-array-contract.test.js`
- `upgrade-alias-baseline-red.log` / `upgrade-alias-focused-green.log`: F05, precedência de seleção/remoção nos upgrades e roadmap
- `photo-fixture-baseline-red.log` / `photo-fixture-contract-green.log`: F03, contrato da fixture; E2E continua sem execução
- `browser-collection.log`: 170+18 casos coletados, zero executados
- `SHA256SUMS`: hashes de evidências ao fechar a entrega; não inclui a si mesmo

Números de execução, duração e timestamps não são cotações nem aceite. Sem screenshots atuais, resultados humanos, CI verde presumida, merge ou deploy.
