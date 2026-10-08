# Evidência v2.1 — 08/10/2026 UTC

Checks finais após integração e correções; resultados de arquivo completo, não execuções parciais somadas.

| Comando / diretório | Resultado |
| --- | --- |
| `npm test` / raiz | 307/307 passaram, zero falhas/skips/cancelados/todo; Node descobriu 300 testes backend e 7 helpers frontend |
| `npm run lint` / raiz | Passou |
| `npm run lint` / frontend | Passou |
| `npm run build` / frontend | Passou; JS 809,47 kB / gzip 243,22 kB; aviso >500 kB permanece |
| `node --test tests/cooling-helpers.test.js` / frontend | 7/7 passaram; são os mesmos sete já contados nos 307, não adicionais |
| `npm test -- --list` / frontend | 94 casos descobertos em 5 arquivos; inclui 4 instâncias novas de cooling, não executados |
| `npx playwright test --config=playwright.integration.config.js --list` / frontend | 15 casos descobertos, não executados |
| `git diff --check` | Passou |
| `node scripts/catalog-inventory.js` | Snapshot 98 componentes / 89 parâmetros / 490 buscas |

Arquivos `.log` ao lado registram a saída literal. Logs finais não contêm credenciais nem artefatos de navegação. Testes unitários/serviços com hardware sintético validam regras, não autenticidade de benchmark ou medição física.

A suíte browser não foi lançada: a v2.0 já comprovou bloqueio de socket do Chromium antes de qualquer asserção de aplicação, incluindo tentativa revisada. Nenhuma nova tentativa de bypass. Portanto **109 casos browser permanecem não validados** (94 E2E + 15 integração). Lista de casos não equivale a aprovação. Sem screenshots nesta etapa.

Falhas intermediárias encontradas/corrigidas: enum de severidade de pendências, upgrade com perda de capacidade, custo zero para preço desconhecido e apresentação de compatibilidade pendente. Dois fixtures antigos sem score ganharam preço de teste para isolar a falta de desempenho da nova proteção de preço. O teste de links sem cadastro foi atualizado para o contrato dinâmico (5 buscas sem oferta). O teste de expansão de score foi restrito a RAM/SSD; acessórios não têm score.

Não existem workflows versionados em `.github`. Estado remoto/CI do commit publicado é verificado separadamente na entrega; ausência de checks não significa CI aprovada. Sem merge/deploy.
