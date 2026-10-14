# V2.8 — Jornada técnica: experiente

08/10/2026 UTC · cenário `experienced` em `scripts/check-profile-journeys.mjs`.

## Objetivo e cenário

Pessoa hipotética com PC existente: carregar a configuração, identificar limitações, analisar candidatos, compatibilidade, desempenho/valor e plano incremental, substituir uma peça e salvar sem destruir o original. PC do cenário: primeira build pronta real; orçamento de upgrade R$1.500 e plano R$2.500, até três etapas.

## Passos, esperado e observado

| Passo executado | Esperado | Observado |
| --- | --- | --- |
| Acessar salvos/upgrades | Destinos servidos | HTTP 200 em `/saved-builds` e `/upgrades`; cliques não executados |
| Salvar/carregar PC existente pelo frontend | Lista e seleção hidratada correspondem ao salvo | `build-004`; Ryzen 5 5600, RTX 4060, B550M Aorus Elite, RAM 16GB, NV2 1TB, Corsair 650W, Mid Tower Airflow; total R$4.699,30 |
| Pedir sugestões por `buildId`; analisar limites e candidatos | Fonte correta; cada candidato respeita teto e compatibilidade | Candidatos reais retornados; cada custo ≤R$1.500; cada montagem resultante reanalisada como compatível. Gargalo e pontuações registrados, sem inferência de defeito físico |
| Gerar roadmap com payload hidratado | Sequência cumulativa válida e custo dentro do teto | Duas etapas, custo de referência R$1.699,80, saldo R$800,20. Soma em centavos conferida e cada `buildAfterStep` revalidado pela API |
| Comparar/substituir/salvar primeira sugestão | Apenas slot escolhido muda; comparação usa mesmos parâmetros; original permanece | NV2 1TB → Samsung 980 PRO 1TB; compra de referência R$699,90, diferença no valor da montagem R$350; R$5.049,30 final. `build-005` salvo; `build-004` intacto |

Custo da nova peça é diferente da diferença entre valores das duas montagens. Não foi presumida venda/recuperação financeira da peça antiga. O plano não representa todo o mercado e não certifica adequação física além das regras disponíveis.

## Problema encontrado e correção

A revisão do percurso detectou que “Upgrade” no card de uma build salva apontava simplesmente para `/upgrades`, sem identidade da build. A tela inicializava a seleção vazia e poderia usar a montagem global atual. Assim, um teste que enviasse `buildId` diretamente passaria e ainda deixaria esse erro de encaminhamento.

A etapa corrige a passagem explícita da origem e inclui regressão de fonte/handlers para seleção existente, carregamento e referência indisponível, sem fallback silencioso para outra montagem. Arquivos, controle negativo e resultado final do check estão no [índice de evidências](evidence/ra2-v2.8/README.md). Isso valida a lógica do encaminhamento; interação de navegador continua pendente.

Também foi reproduzido `maxSteps=0.5`: a validação anterior aceitava e arredondava para zero, produzindo plano vazio embora `maxSteps=1` encontrasse uma etapa. Corrigido para inteiro positivo no frontend/backend, com regressão e rejeição HTTP 400 no roteiro. Inteiros acima do limite continuam respeitando o teto existente.

## Resultado e pendências

Cinco passos HTTP/adaptadores aprovados, além da regressão de encaminhamento. IDs/configurações/etapas/custos/deltas completos em `journeys[2]`. Nenhum participante, benchmark, screenshot, inspeção responsiva ou teste de reinício do servidor. Save/read é no mesmo processo em memória. A seleção e decisão do cenário não significam satisfação ou aprovação de um usuário experiente.

## Evidência

[Registro experienced](evidence/ra2-v2.8/journeys.json) · [log HTTP](evidence/ra2-v2.8/journeys.log) · [método e matriz](RA2-V2.8-JORNADAS.md).
