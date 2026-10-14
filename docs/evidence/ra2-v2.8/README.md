# Evidências V2.8 — 08/10/2026 UTC

Base: `b463f1768b1f72647bd06c1bc4ba82a90a3799f0`. [Relatório principal](../../RA2-V2.8-JORNADAS.md).

## Método reproduzível

Na raiz, após instalar dependências já declaradas e gerar o frontend:

```sh
npm run build --prefix frontend
JOURNEY_EVIDENCE_PATH=docs/evidence/ra2-v2.8/journeys.json node scripts/check-profile-journeys.mjs
npm test
for script in frontend/scripts/check-*.mjs; do node "$script"; done
npm run lint
npm run lint --prefix frontend
node scripts/check-quality-production.mjs
npm run audit:images
```

O script de jornadas cria servidor HTTP efêmero e compila **os adaptadores reais do frontend** com a origem desse servidor. Fetch, parser, controllers, serviços e repositórios não são substituídos. Serve o frontend compilado e as nove fotos. Utilitários frontend recebem o catálogo/respostas reais. O processo é isolado; registros de teste não persistem em servidor remoto.

## Resultados

- `journeys.log` / `journeys.json`: **três jornadas, 17 passos agrupados aprovados** (7 iniciante, 5 intermediário, 5 experiente). Esses passos não são contabilizados como testes Node. Reexecuções do mesmo roteiro também não são novas jornadas distintas
- `node-tests.log`: **454 testes distintos aprovados**, zero falhas/skips (453 anteriores + 1 regressão de entrada fracionária). Inclui 48 utilitários frontend e 406 demais testes/subtestes. Os utilitários `frontend/tests/*.test.js` já pertencem a essa suíte, não somar novamente
- `ssr-handlers.log`: **dez scripts** `frontend/scripts/check-*.mjs` aprovados, SSR e handlers isolados; doubles de hooks/serviços somente nos checks de controle de estado/tempo, não no roteiro HTTP
- `backend-lint.log`: lint backend aprovado; logs frontend e build registram os checks finais e o aviso de bundle >500 kB
- `production-http.log`: check de frontend compilado, rotas SPA, prefixo API e nove arquivos de imagem em HTTP; não executa hidratação
- `image-audit.log`: parcial, exit 1 esperado; 9/98 fotos, 89 bloqueios, zero órfãos
- `browser-collection.log`: 168 casos controlados + 18 integração real **somente coletados**, 186 total, **zero executados**
- `git diff --check`: verificado no fechamento

## Regressão J01: build salva encaminhada para Upgrade

`frontend/scripts/check-saved-upgrade-source.mjs` renderiza links reais dos cards e executa handlers da tela com hooks/promises controlados, router SSR real e serviço controlado para observar payloads. Testa:

1. ID codificado do card B no destino, mesmo com build global A
2. B continua sendo origem durante carregamento; sugestões recebem `buildId`, roadmap recebe peças de B
3. Mudança de query invalida resposta antiga; A só é usada após seleção explícita
4. ID inexistente/vazio bloqueia ambas as ações, sem fallback silencioso
5. Falha de carregamento/retry mantém ID
6. Resposta de lista malformada gera erro

`saved-upgrade-source-baseline-red.log`: controle negativo com a fonte da base, falhando porque links antigos não identificam a build. `saved-upgrade-source.log`: fonte corrigida aprovada. Para repetir o negativo após publicação:

```sh
node frontend/scripts/check-saved-upgrade-source.mjs --baseline=b463f1768b1f72647bd06c1bc4ba82a90a3799f0
```

O negativo deve falhar. Ele não deve ser confundido com falha da árvore final. A regressão não simula um clique DOM nem comprova histórico real do navegador.

## Regressão J02: maxSteps fracionário

Reprodução com serviço/catálogo real mostrou `0.5` convertido a zero e plano vazio; `1` encontra etapa real. A correção exige inteiro positivo em frontend/backend. A rejeição 400 também atravessa o adaptador frontend real no roteiro HTTP. `roadmap-fractional-backend-red.log` e `roadmap-fractional-frontend-red.log` documentam os controles negativos; `roadmap-validation-green.log` registra seis testes focados aprovados (incluídos nos 454, não somar) e `saved-upgrade-source.log` inclui a guarda do handler. `tests/upgrade-roadmap-validation.test.js` contém a nova regressão; limite superior existente continua preservado.

## Bloqueios

Zero screenshots, zero execução Playwright/browser, zero participantes. Negativas anteriores do Chromium e de URL localhost no browser cloud respeitadas sem retry/bypass. Os três perfis são critérios técnicos; não comprovam compreensão, satisfação, retenção ou receita. Nenhum provedor de preços conectado. Resultados em memória não comprovam persistência após reinício, isolamento multiusuário ou produção.
