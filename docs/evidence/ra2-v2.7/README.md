# Evidências v2.7 — 08/10/2026 UTC

Base: `0dd5473470ce218b4f6499d7f909fa3e459c86ca`. Resultado final desta árvore, sem navegador.

| Comando | Resultado | Log |
| --- | --- | --- |
| `npm test` (`node --test`) | **453 aprovados**, 0 falhas/skips. Inclui **48 utilitários frontend**; 405 restantes backend/HTTP, contando subtestes | backend-tests.log |
| `node --test frontend/tests/*.test.js` | 48 aprovados, reexecução focada dos mesmos utilitários, **não somar** ao total 453 | frontend-tests.log |
| `for script in frontend/scripts/check-*.mjs; do node "$script"; done` | Nove scripts aprovados, SSR e hooks/handlers isolados | ssr-handlers.log |
| `npm run lint`; `npm run lint --prefix frontend` | Ambos aprovados | lint-build.log |
| `npm run build --prefix frontend` | Aprovado; aviso existente de chunk >500 kB | lint-build.log |
| `node scripts/check-quality-production.mjs` após build | Prefixo API personalizado, erros JSON, quatro rotas SPA/bundles e nove imagens via HTTP real aprovados; sem hidratação React/browser | production-after.log |
| `npm run audit:images` | **Parcial**, saída 1 esperada: 9/98 fotos, 89 bloqueios, 0 órfãos e 0 grupos duplicados suspeitos | image-audit.log |
| `npx playwright test --list` no frontend | 168 casos controlados coletados, **0 executados** | browser-collection.log |
| `npx playwright test --config=playwright.integration.config.js --list` | 18 casos de frontend+backend reais coletados, **0 executados** | browser-collection.log |
| `git diff --check` | Aprovado | Executado no fechamento |

**Correção de leitura das contagens históricas:** o comando raiz já descobre `frontend/tests/*.test.js`. Os números “425 Node + 40 frontend” da v2.6 são execuções sobrepostas, não 465 testes distintos. Esta etapa explicita total e subconjunto para não inflar cobertura. 186 casos browser coletados também não contam como testes aprovados.

## Controles negativos e regressões

- `backend-domain-red.log`: cópia temporária da base HEAD com testes novos e asserção da rota de compartilhamento atual. 19 testes, 13 falhas; comprova rejeições/aliases/contratos que a fonte antiga não satisfazia
- `backend-lifecycle-red.log`: reprodução de versões/notificações órfãs após excluir build
- `backend-domain-green.log` e `backend-domain-lifecycle-green.log`: retestes focados do domínio, ciclo de vida e contratos; o reteste final completo está em backend-tests.log
- `frontend-red-duplicate-mutation.log`: `node frontend/scripts/check-async-regressions.mjs --baseline=hook` falha com fonte da base, pois segunda chamada executa callback
- `frontend-red-modal-race.log`: mesmo script `--baseline=modals`, resposta antiga substitui build mais recente
- `frontend-red-storage-null.log`: `node frontend/scripts/check-storage-regressions.mjs --baseline`, fonte antiga lê `budget.amount` de null e lança TypeError
- Os scripts `--baseline` usam `git show HEAD` no momento do teste antes do commit. Para repetir após publicar, substitua HEAD pelo SHA de base acima no carregador. Sem flag, executam a fonte atual; aprovação registrada em ssr-handlers.log
- `production-before.log`: fonte antiga retorna HTML 200 para API inexistente sob prefixo customizado; o mesmo check passa após correção
- `http-after.log`: percurso HTTP isolado, sete testes/subtestes aprovados; também integrado ao total final de 453

Os controles negativos de domínio usaram cópia temporária isolada, sem alterar o checkout final. Não existe manifesto de mutação generalizada nem percentual de cobertura. O script de lifecycle observa coleções reais; o HTTP atravessa parser/controller/serviço/repositório, sem mocks de endpoints. Os handlers frontend usam doubles de hooks/serviços para controlar timing, sem alegação de React DOM ou eventos reais.

## Limites

Nenhuma screenshot ou execução browser nesta etapa. Nenhum provedor comercial, preço atual, benchmark físico ou participante. HTTP de arquivos estáticos não prova que o frontend hidratado usa o prefixo customizado: deployment real exige VITE_API_BASE_URL correspondente. Relatório completo: [RA2-V2-QUALIDADE](../../RA2-V2-QUALIDADE.md).
