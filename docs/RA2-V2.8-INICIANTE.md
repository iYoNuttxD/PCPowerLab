# V2.8 — Jornada técnica: iniciante

08/10/2026 UTC · cenário do script `scripts/check-profile-journeys.mjs` (`beginner`).

## Objetivo e cenário

Pessoa hipotética com pouco conhecimento, uso gaming e limite de R$4.000 de referência. Encontrar orientação, selecionar peças, conferir compatibilidade/desempenho estimado/alertas e salvar a configuração. Não houve participante nem observação de compreensão.

## Passos, esperado e observado

| Passo executado | Esperado | Observado |
| --- | --- | --- |
| Acessar `/` e `/build` | Aplicação servida, destinos existentes | HTTP 200 e documento com root React; hidratação/cliques não executados. Proposta e CTA lidos na fonte `Home.jsx`; compreensão não medida |
| Escolher gaming e teto 4.000 | Uso nativo disponível sem depender de perfis personalizados | Requisição usa `usageType=gaming`; `/usage-profiles` retorna coleção vazia. Nenhum perfil personalizado foi inventado |
| Buscar Ryzen 5 e consultar mídia | Busca encontra modelos reais; somente fotos verificadas são elegíveis | Três CPUs encontradas; nove fotos baixadas por HTTP com tipo imagem e bytes; 89 itens sem foto verificada. Aparência dos cards não inspecionada |
| Pedir orientação/recomendação; testar R$100 e recuperar | Insuficiência explícita e nova tentativa válida | 422 a R$100; recomendação a R$4.000 aplicada pelos helpers frontend; explicação textual retornada. Total R$3.929,30 |
| Gerar resumo e reduzir teto para 100 | Compatibilidade, estimativa e alerta coerentes, sem trocar peças | `compatible`, 125 FPS estimados em Counter-Strike 2/1080p/high; `over_budget` a R$100 com mesmo total. FPS é saída demonstrativa, não benchmark |
| Manter cooler/fans omitidos pela recomendação e reanalisar | Acessórios preservados, custo completo, pendência não convertida em aprovação | Cooler e dois packs persistidos no round-trip; compatibilidade não aprovada e FPS suprimido. CPU de socket conflitante produz `incompatible` sem FPS |
| Salvar a montagem final sem opcionais pendentes e reler | Sete slots, orçamento, payload e total consistentes | `build-002` nesta execução; normalização → HTTP → hidratação → resumo passou, total R$3.929,30 |

## Configuração final registrada

Intel Core i3-12100F; Radeon RX 7600; H610M DDR4; Kingston Fury 16GB DDR4; Kingston A400 240GB; Corsair 650W; gabinete Mid Tower Airflow. IDs exatos em `journeys.json`, `journeys[0].finalBuild`. É escolha determinística do cenário técnico, não endosso de compra ou satisfação do iniciante.

## Problemas, correções e pendências

Nenhum defeito novo do domínio foi encontrado neste percurso. Os limites reais permaneceram visíveis: armazenamento de 240GB no catálogo de baixo orçamento, 89 fotos faltantes, dados físicos de opcionais pendentes, ausência de cotações e persistência apenas em memória. Não se alterou recomendação só para produzir um resultado preferido. Ler a explicação técnica não prova que um iniciante a compreende.

Sete passos integrados aprovados; navegador/teclado/rolagem, clareza percebida, visual, responsividade e screenshots não executados. Correção transversal de navegação da etapa está no relatório experiente.

## Evidência

[Log HTTP e conclusão](evidence/ra2-v2.8/journeys.log) · [registro completo, perfil beginner](evidence/ra2-v2.8/journeys.json) · [método e limites](RA2-V2.8-JORNADAS.md). Os sete passos não são somados ao número de testes Node.
