# Evidência da v2.2 — 08/10/2026 UTC

## Checks finais

- `npm test`: **354/354 passaram** (343 backend/auditoria/registro + 11 helpers frontend), zero falhas/skips/cancelados
- `npm run lint` raiz: passou
- ESLint explícito de script de auditoria e seus testes: passou
- `npm run lint` frontend: passou
- `npm run build` frontend: passou; JS 813,27 kB, gzip 244,38 kB; warning preexistente >500 kB
- `npm test -- --list` frontend: 108 casos coletados em 6 arquivos; **não executados**
- `npx playwright test --config=playwright.integration.config.js --list`: 15 casos coletados em 1 arquivo; **não executados**
- `npm run audit:images:report`: exit **1** esperado; 9/98, 89 fallback/bloqueio, 0 órfãos, 0 grupos SHA-256 duplicados
- `git diff --check`: passou após remover linha vazia extra de atribuição

Não somar testes focados novamente: os 40 casos de auditoria estão incluídos nos 354. Os 123 casos browser não são passes.

## Navegação bloqueada

`NODE_ENV=production PORT=3000 node src/server.js` iniciou e reportou a API na porta 3000. Uma primeira tentativa de navegação antes da inicialização falhou por conexão recusada. Após iniciar o servidor, a rota de navegador disponível também não permitiu abrir a aplicação. Nenhuma página ou asserção de aplicação foi executada; não existem screenshots novos. O bloqueio de navegador não foi reclassificado como falha funcional nem como aprovação.

## Inspeção de pixels dos arquivos finais

Todos os originais adotados e todos os arquivos abaixo foram abertos e inspecionados em 08/10/2026. As fotos abaixo são os próprios ativos, **não capturas de tela da aplicação**. Fontes, licença e transformações: [atribuição completa](../../../frontend/public/images/components/ATTRIBUTION.md). Nenhuma distorção ou corte foi adicionado; maior dimensão 960px; transparência não existia nos originais. A etiqueta identifica CPUs, SSDs e fans; coolers foram associados à galeria oficial exata.

| Componente | Arquivo revisado | Dimensões | Bytes | SHA-256 |
| --- | --- | --- | ---: | --- |
| cpu-ryzen-7-5700x | [WebP](../../../frontend/public/images/components/cpu-ryzen-7-5700x.webp) | 960×960 | 159118 | 6f9ebef9f7bc0cb7e7a5eb422a627ec2c0e3e7b6fe731c8da8593378019b80eb |
| cpu-ryzen-5-7600 | [WebP](../../../frontend/public/images/components/cpu-ryzen-5-7600.webp) | 960×960 | 165876 | 528d81545c0a756ca398c632dd6975603b5bbc77e59f99432032a5904a5ff26e |
| cpu-intel-i5-12400f | [WebP](../../../frontend/public/images/components/cpu-intel-i5-12400f.webp) | 816×960 | 126024 | 5a0c6b600c9570a00d58a5bdca2f718b189e09510f3356f31962d87f91e6fd50 |
| ssd-samsung-970-evo-plus-250gb | [WebP](../../../frontend/public/images/components/samsung-970-evo-plus-250gb.webp) | 960×370 | 54634 | f2c80ee4044fb70d13745a3d055c9160a2c6e956e4cf44033ae90d1d8d39cdc2 |
| ssd-samsung-980-pro-1tb | [WebP](../../../frontend/public/images/components/samsung-980-pro-1tb.webp) | 960×343 | 45046 | 8d99885c6060c841069d4cb3313eb6e70da81ce5f6d51bceb35f914a90a6f2d1 |
| cooler-noctua-nh-u12s-redux | [WebP](../../../frontend/public/images/components/cooler-noctua-nh-u12s-redux.webp) | 733×960 | 54586 | e31e631ceab00fbbe3eb43803538be7c87e09e662e43d27afe3f04924dec6921 |
| cooler-noctua-nh-l9a-am4 | [WebP](../../../frontend/public/images/components/cooler-noctua-nh-l9a-am4.webp) | 960×640 | 43608 | 1008648144e65ff965949fc849fa0234bd2101a18327ca5e754b60a9a9d604b3 |
| fan-noctua-nf-p12-redux-1700-pwm | [WebP](../../../frontend/public/images/components/fan-noctua-nf-p12-redux-1700-pwm.webp) | 897×960 | 44718 | 53530568532c998b43c8611f64e508f65df1e9b46c4caedd1f5cd7bc67817bd3 |
| fan-noctua-nf-a14-pwm | [WebP](../../../frontend/public/images/components/fan-noctua-nf-a14-pwm.webp) | 858×960 | 44402 | be156fd8b7f7eea64b5088c1b39bd54d7bf537c1d9088eab0b59521562f22c25 |

## Logs

Excertos e hashes dos logs estão em [checks.json](checks.json). Logs completos da execução permaneceram no workspace temporário; nenhum segredo de autenticação foi incluído.
