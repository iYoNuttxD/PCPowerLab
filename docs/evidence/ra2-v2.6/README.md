# Evidências v2.6

08/10/2026 UTC. Testes de domínio, utilitários, SSR e handlers isolados. Nenhum navegador foi executado.

- `npm test`: backend-tests.log, 425 aprovados
- `node --test frontend/tests/*.test.js`: frontend-tests.log, 40 aprovados
- `for script in frontend/scripts/check-*.mjs; do node "$script"; done`: ssr.log, sete scripts aprovados
- `npm run lint` na raiz e frontend; `npm run build` no frontend: aprovados (aviso de bundle grande)
- `npx playwright test --list` e integração `--list`: 183 casos coletados, não executados

Cotações dos testes são fixtures sintéticas, não ofertas verificadas. Nenhuma integração comercial foi conectada. Sem screenshots, geometria, efeitos de navegador, teste humano ou execução visual. Os logs não devem ser interpretados como prova de preço/estoque real.

Esclarecimento v2.7: os 425 testes de `npm test` já incluem os 40 utilitários frontend. A execução separada dos 40 é um reteste sobreposto; não somar como 465 testes distintos. Logs históricos preservados.
