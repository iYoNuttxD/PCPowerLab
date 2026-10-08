# Reprodução da auditoria de backend

Referência de código: `d433bf930d7373eec073921427e146bc8c173f26`.
Os scripts abaixo são ferramentas documentais de auditoria, não fazem parte do runtime da aplicação.
Execute-os na raiz do repositório, com Node.js. A coleta original usou Node v24.19.0.

## Artefatos

- `../../RA2-V2-INVENTARIO.json`: inventário completo dos registros do catálogo
- `../../RA2-V2-AUDITORIA-BACKEND.md`: relatório e tabela de todos os componentes
- `backend-focused-tests.log`: saída sanitizada dos 92 testes focados, executados em 2026-10-08 UTC
- `backend-probes.mjs` e `backend-probes.json`: reprodução e resultado dos dois limites do backend
- `generate-backend-inventory.mjs`: extração dinâmica do catálogo, imagens, junções e testemunhas de compatibilidade
- `verify-backend-inventory.mjs` e `backend-inventory-verification.log`: comparação com as fontes, execução das testemunhas e validação dos hashes

## Comandos

```sh
node --test tests/component.service.test.js tests/admin-component.service.test.js tests/compatibility.service.test.js tests/compatibility-rule.service.test.js tests/bottleneck.service.test.js tests/performanceParameters.test.js tests/gamePerformance.test.js tests/professionalSoftware.test.js tests/catalog-expansion.test.js tests/dataIntegrity.test.js tests/recommendation.test.js tests/recommendationByUsage.test.js tests/recommendationBuildsByBudgetRange.test.js tests/purchaseLinks.test.js
node docs/evidence/ra2-v2-baseline/backend-probes.mjs
node docs/evidence/ra2-v2-baseline/generate-backend-inventory.mjs
node docs/evidence/ra2-v2-baseline/verify-backend-inventory.mjs
```

O gerador grava os dois documentos. O probe grava seu JSON e faz mutações temporárias em arrays importados, restauradas no mesmo processo. Nenhum script edita código, mocks ou arquivos de configuração da aplicação.

O gerador reproduz esta auditoria do baseline: contagens, registros, hashes, imagens e testemunhas são calculados; textos de achados, fórmulas e o resumo da execução original de testes são evidência desta revisão. Para auditar uma versão futura com lógica alterada, revise os achados e execute novamente os testes/probes antes de usar o relatório como evidência nova. Os hashes das fontes no inventário permitem detectar alterações posteriores.

## Evidência e limites

O log de testes preserva nomes, resultados e duração, com sequências ANSI e caminhos absolutos do executor removidos. Não inclui credenciais nem dados pessoais. Os probes foram executados em processo separado dos testes e do gerador.

Somente os dois resultados esperados no baseline fazem o probe passar: desligar as regras CRUD não altera o alerta de socket; uma placa-mãe sem `storageInterfaces` passa pelo cadastro e falha em compatibilidade com `TypeError`. Se uma etapa posterior corrigir esses limites, as asserções deixam de passar por projeto; atualize a auditoria após verificar a correção.

Nada nestes artefatos comprova preço ao vivo, disponibilidade em loja, benchmark medido, compatibilidade física além das seis verificações ou experiência real de usuários.
