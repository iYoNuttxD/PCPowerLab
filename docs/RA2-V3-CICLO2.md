# V3: correções orientadas pelo ciclo 2

Data: 20/10/2026. Base: `442fa2e` (PR #46). Proposta para revisão, sem publicação em produção.

**Atualização do Mac autorizado:** [305 E2E aprovados, 1 skip esperado e 18 integrações aprovadas](V3-MAC-BROWSER-VALIDATION.md), com inspeção real, teclado e zoom nativo de 200%. Os registros de bloqueio da nuvem abaixo são históricos. O ciclo 3 humano, a configuração original do relato e a calibração dos cinco novos CPU/GPU continuam pendentes.

**Complementação atual (21/10/2026):** [67 sinais rastreados, mudanças e limites](V3-FEEDBACK-FOLLOWUP.md); 1.040 Node, 309 E2E + 1 skip e 18 integrações aprovados. Catálogo com 93 ativos, busca por recursos, lista compacta, pop-up térmico/acústico, guia de placa-mãe e memória mínima nas sugestões.

## Evidência e limites

O ciclo 2 reuniu 10 respostas. A principal falha relatada foi uma montagem com todas as peças selecionadas que terminou em “Dados insuficientes”, sem resultados e links. A configuração exata desse respondente não foi fornecida: **não é possível afirmar que o caso original foi reproduzido**.

A inspeção identificou duas falhas concretas independentes: exceções inesperadas em análises opcionais interrompiam o resumo inteiro; no cliente, falhar o resumo impedia aproveitar os links solicitados no mesmo fluxo. Os testes novos reproduzem essas condições de forma determinística. Especificações não verificadas continuam sendo tratadas como pendência, nunca como compatibilidade garantida.

## Rastreabilidade

| Achado do ciclo 2 | Alteração V3 | Evidência de validação |
| --- | --- | --- |
| Resumo indisponível apesar de peças completas | Seleção validada separadamente; análises isoladas, estados parciais e mensagens recuperáveis | Regressões de falhas opcionais e seleção inválida |
| Links de lojas bloqueados junto com análises | Consulta independente, estado de erro e tentativa separados | Testes de isolamento do resumo e links |
| Fluxo de montagem pouco claro | Orçamento e uso primeiro, próxima etapa explícita, limite/acumulado/restante persistentes | Testes de ordem, persistência e jornada |
| Avaliações parciais de navegação (causa não informada) | Edição de orçamento retorna à etapa anterior, escolhas e filtros por etapa mantidos | Regressões de navegação e restauração |
| F4: muita informação; H7: organizar listas e pesquisar eficazmente | Detalhes progressivos, filtros ativos removíveis, contagem e estados vazios claros | Testes de renderização e casos de navegador preparados |
| Placas-mãe parecidas e catálogo limitado | Recursos verificados distinguem modelos; expansão dirigida e datada | Fontes e testes do catálogo V3 |
| Recomendações e estimativas pouco claras | Orçamento em BRL explícito, refrigeração retida incluída, alternativa comparável e limites de estimativa | Regressões de orçamento, moeda e acessórios |
| AB10: design simples e pedido de cores vivas; organização Regular | Composição e hierarquia mais expressivas, preservando foco e controles | Inspeção real atual registrada; apreciação humana ainda não medida |

## Preservação

Na primeira rodada, a página inicial não foi redesenhada. Na complementação de 21/10, recebeu composição visual e caminho 01–03, registrados no relatório atual. Identidades antigas, seleções salvas, imagens e referências históricas permanecem preservadas. Nenhum serviço pago, coletor de preço ao vivo, compra ou implantação foi adicionado. Valores de lojas são observações datadas, não promessa de estoque ou preço final; frete e montagem não entram no total.

## Catálogo e transparência de desempenho (primeira rodada)

Foram acrescentados seis modelos com identidade exata, foto e preço observado em 20/10/2026: Ryzen 7 7800X3D, Ryzen 9 9900X, MSI RTX 5060 Ti VENTUS 2X OC PLUS 16 GB, MSI RTX 5060 VENTUS 2X OC 8 GB, DeepCool CC310 e Cougar MX230 RGB. O catálogo passa de 81 para 87 produtos ativos. Modelos inicialmente considerados, mas esgotados ou sem identidade verificável, não foram adicionados como ofertas disponíveis.

Os quatro novos CPU/GPU ainda não têm modelo de desempenho calibrado: não recebem FPS/pontuação inventados nem entram em recomendações automáticas classificadas por desempenho. Podem ser consultados e selecionados com especificações, preço e verificações suportadas. Essa expansão não equivale à ampliação completa da simulação; a calibração permanece pendente.

## Validação da primeira rodada

A versão-base passou 935 testes Node e compilação de produção antes das alterações. Validação da primeira rodada da V3 em 20/10/2026 (os resultados da complementação integral estão abaixo):

- `npm test`: **977 passaram, 0 falhas, 0 skips** (42 testes a mais que a base).
- `npm run lint` na raiz e no frontend: aprovados.
- `npm run build` no frontend: aprovado. Aviso preexistente de chunk maior que 500 kB permanece; bundle JavaScript de aproximadamente 1.005 kB antes de gzip.
- Todos os **16 scripts `frontend/scripts/check-*.mjs`** passaram. O harness assíncrono inclui **35 grupos e 853 assertivas** sobre estados e handlers reais, com respostas de serviço controladas.
- `node scripts/audit-component-images.js`: **87/87 ativos verificados**, zero fallback/bloqueados, zero arquivos órfãos e zero grupos duplicados suspeitos.
- `git diff --check`: aprovado.
- Coleta Playwright: **290 casos E2E e 18 de integração** reconhecidos. **Somente coleta, não execução**.

Regressões específicas: `tests/v3-summary-resilience.test.js`, `tests/v3-catalog-evidence.test.js`, `frontend/tests/summary-resilience.test.js`, `frontend/tests/journey-v3.test.js`; casos de navegador em `journey-v3.spec.js` e `summary-resilience-v3.spec.js`. Incluem exceções 5xx em cada análise, orçamento inválido/moeda diferente, BIOS não verificada com seleção completa, refrigeração mantida na recomendação, tentativa independente de links, respostas atrasadas, seleção nova sem modelo de desempenho e preservação de configurações existentes.

Detalhes: [jornada e testes](V3_JOURNEY_VALIDATION.md), [catálogo e fontes](catalog-v3-evidence.md), [contrato da API](API.md).

### Limitação de navegador

O Chromium local foi impedido de iniciar pelo sandbox (`socket(): Operation not permitted`); a execução com revisão de permissão também não conseguiu inicializar o ambiente. Nenhuma asserção visual/local foi executada com sucesso. Não foram usadas rotas alternativas para contornar essa restrição. Os testes Playwright preparados devem ser executados em ambiente autorizado antes da homologação visual, incluindo desktop/mobile, teclado, voltar/avançar, orçamento, filtros, resumo parcial e recuperação dos links.

As páginas públicas de fabricantes/lojas foram consultadas no navegador cloud apenas para verificar fontes e ofertas, não para validar a aplicação local.

## Complementação do plano integral

A revisão não confunde implementação com aceite humano. A [matriz integral de aceite](V3-ACCEPTANCE-MATRIX.md) cobre cada item do plano e as dependências restantes.

- Objetivo descrito no primeiro passo, além de orçamento e tipo de uso.
- Explicações por componente com fatos, custo, posição real na ordenação do algoritmo, alternativas de uma peça e motivos concretos de exclusão. A montagem manual não é apresentada como recomendação automática.
- Lacuna de entrada revisada por orçamento/uso: a evidência específica da MSI permite verificar a alimentação sem cabo da 3050 LP existente; isso torna viável uma montagem de referência de R$ 4.339,84 para limite de R$ 4.500. Limites de R$ 3.000/4.000 continuam sem promessa de configuração completa verificada.
- Arc A380 acrescentada como opção factual de menor preço e recursos de mídia, com UEFI, CSM, GPT e Resizable BAR explicitamente pendentes quando desconhecidos. O total passa a 88 produtos ativos; cinco novos CPU/GPU não recebem pontuações ou FPS inventados.
- Coerência de tipografia, hierarquia, espaçamento, estados e foco aplicada às telas relevantes; auditoria de contraste dos tokens e composições reais separada da verificação visual em navegador.
- Regressões de seleção completa, voltar/avançar, recarregar, resumo e lojas, troca individual, recálculo, desfazer e rejeição de análise antiga; preservação das 81 identidades anteriores.
- [Protocolo do ciclo 3](V3-CICLO3-PROTOCOLO.md) e ficha vazia de observação preparados. Não houve testes com participantes.

Continuam dependentes de evidência/ambiente: reprodução da combinação exata do relato original, calibração de desempenho dos novos modelos, navegação real por teclado e validação responsiva no navegador autorizado, e sessões humanas do ciclo 3. Não há alegação de cumprimento observado da meta de 90%.

Atualização: a dependência de navegador desta lista foi resolvida no Mac. Os demais limites permanecem. A [matriz de aceite](V3-ACCEPTANCE-MATRIX.md) registra a situação atual.

### Validação final da complementação (20/10/2026)

- `npm test`: **1.030 testes aprovados, zero falhas e skips**.
- Lint raiz/frontend e build de produção: aprovados; aviso existente de bundle >500 kB permanece (JavaScript 1.012,19 kB antes de gzip).
- **17 scripts `check-*.mjs` aprovados**, incluindo o harness de 35 grupos/853 assertivas e **64/64 verificações de contraste**.
- Auditoria de imagens: **88/88 ativos verificados**, zero fallback, órfãos e duplicatas suspeitas.
- Playwright: **304 casos E2E e 18 de integração coletados; nenhum executado**.
- `git diff --check`: aprovado.
- A nova explicação por peça também tem isolamento de falha e regressão: indisponibilidade não derruba o resumo inteiro.
