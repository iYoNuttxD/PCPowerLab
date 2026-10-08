# Evidências técnicas V2.10

Base Git: `64bf1c248fab4c42e833709917834b1703f967a4`; árvore-base `0007acbef14f9c8c9813cae334c88e86bb36e662`. Data 08/10/2026 UTC.

Os arquivos `.log` publicados são resumos fiéis das execuções na cópia isolada. Saídas detalhadas e rastros internos são preservados apenas na recuperação local, fora do repositório. `source-manifest.json` registra os hashes da fonte executada; `SHA256SUMS` protege os artefatos deste diretório. O SHA do commit que contém estes arquivos identifica a revisão publicada; nenhum screenshot de outra revisão é tratado como prova desta.

## Comandos

- `node --test`: Node/backend/domínio/helpers/frontend sem navegador
- `npm run lint`; `npm run lint --prefix frontend`; `npm run build --prefix frontend`
- `node frontend/scripts/check-*.mjs`: cada arquivo executado individualmente; SSR e handlers/hooks isolados, com limites explícitos em cada log
- `node scripts/check-quality-production.mjs`: servidor HTTP de produção local, bundles/rotas/imagens; sem hidratação DOM
- `JOURNEY_EVIDENCE_PATH=... node scripts/check-profile-journeys.mjs`: três cenários sintéticos, 17 passos integrados de adaptadores/frontend/API; não são participantes reais
- `npm run audit:images:report`: saída **1 esperada pela cobertura parcial**, 11/98; não ocultada como aprovação de R10
- `node scripts/catalog-inventory.js`: 98 itens ativos, catálogo preservado
- `npx playwright test --list`; `npx playwright test --config=playwright.integration.config.js --list`: somente coleta de 184 + 18 = 202 casos, zero execuções de browser

## Controles negativos

- `language-baseline-red.log`: labels RAM/refrigeração ingleses na base
- `comparison-identity-baseline-red.log`: nomes iguais sem índice estável
- `node frontend/scripts/check-analysis-navigation.mjs --drop-session`: deve falhar por perda de persistência
- `node frontend/scripts/check-saved-build-interactions.mjs --baseline=64bf1c248fab4c42e833709917834b1703f967a4`: deve falhar porque o editor era removido após salvar
- O mesmo comando com `--scenario=versions`: deve falhar por ausência da apresentação humana do snapshot
- `node frontend/scripts/check-insights-ranking.mjs --baseline`: deve falhar por opções de ranking fora do contrato

Preço: pesquisa por loja/ID em `price-research.json`; interpretação de identidade de cada um dos 42 itens em `price-identity-audit.json`. O inventário de fotos mantém as 87 lacunas. Consulte o [relatório V2.10](../../RA2-V2.10-CONTINUIDADE.md) para o que permanece pendente.

- Entradas novas: `check-insights-ranking.log` cobre contrato e validação do ranking; `check-recommendation-feedback-access.log` cobre acesso ao formulário e contexto correto do feedback
- Controles `recommendation-entry-baseline-red.log` e `general-feedback-baseline-red.log` substituem cada página pela base e falham na regressão correspondente

Os resumos preservam comandos, resultados, limites e a razão dos controles negativos, sem expor diagnósticos detalhados de segurança, dados incidentais ou caminhos privados.
