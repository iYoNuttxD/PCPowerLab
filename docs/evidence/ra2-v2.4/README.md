# Evidências v2.4

08/10/2026 UTC. Serviços e estado executados no checkout cloud autorizado; navegador não executado.

| Verificação | Resultado |
| --- | --- |
| `npm test` | 391 testes Node passaram, 0 falhas/skips |
| `npm run lint` | Passou |
| `cd frontend && npm run lint` | Passou |
| `cd frontend && npm run build` | Passou; aviso de bundle >500 kB permanece |
| `node frontend/scripts/check-catalog-render.mjs` | Renderização React estática passou |
| `node frontend/scripts/check-recommendation-entrypoints.mjs` | Resultado em `recommendation-ssr.log`; não é teste em navegador |
| `node scripts/demo-component-replacement.js` | Saída `before-after.json`; custos, consumo, FPS demonstrativos e preservação/restauração de IDs |
| `cd frontend && npx playwright test --list` | 138 casos coletados, **0 executados** |
| `cd frontend && npx playwright test --config=playwright.integration.config.js --list` | 15 casos coletados, **0 executados** |
| Screenshots e inspeção visual | **Não realizados**, sem evidência fabricada |

Logs do comando completo estão nesta pasta. Node inclui nove casos novos de transição/integração de domínio e onze de comparação numérica/eligibilidade. A suíte Playwright inclui cenários de substituição, orçamento, incompatibilidade, resposta atrasada, cancelamento, erro/nova tentativa, reload, desfazer e dados não verificados; a coleta apenas confirma descoberta/sintaxe.

Limite: Chromium teve socket negado e a URL localhost foi negada no browser cloud em etapas anteriores. Nenhuma rota negada foi repetida. É necessário ambiente autorizado com navegador funcional para validar interações reais, foco, rolagem, desktop/mobile e screenshots. SSR/handlers isolados não substituem essa validação. Não há homologação humana, benchmark físico ou preço de mercado.
