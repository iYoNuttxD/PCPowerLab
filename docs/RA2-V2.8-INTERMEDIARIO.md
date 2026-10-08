# V2.8 — Jornada técnica: intermediário

08/10/2026 UTC · cenário `intermediate` em `scripts/check-profile-journeys.mjs`.

## Objetivo e cenário

Pessoa hipotética que conhece hardware e procura valor: filtrar peças, comparar alternativas de R$4.000–6.000, examinar gargalo/simulação, trocar RAM, conferir diferença orçamentária e salvar. Sem participante ou declaração de aceitação.

## Passos, esperado e observado

| Passo executado | Esperado | Observado |
| --- | --- | --- |
| Acessar catálogo e builds prontas | Destinos servidos | `/components` e `/ready-builds` HTTP 200; não é navegação hidratada |
| Combinar RAM/Kingston/DDR4/R$100–1.000/valor | Somente peças correspondentes e specs reais; busca inexistente vazia | Utilitário real recebeu catálogo HTTP, verificou marca/tipo/preço e resultado vazio. Specs e índices constam no JSON; valor é índice demonstrativo por preço de referência |
| Pedir alternativas por faixa; comparar duas; analisar gargalo/jogo | Respostas reais consumíveis pelo frontend; mesma seleção nas análises | Alternativas e comparação retornadas; primeira a R$4.289,30; bottleneck com CPU score positivo; simulação individual igual ao resumo sob Counter-Strike 2/1080p/high |
| Consultar compatibilidade e filtrar candidato; trocar RAM | Um slot alterado; custo e desempenho comparáveis; desfazer invalida análise | Kingston Fury 16GB → 32GB DDR4; candidato aparece no filtro `compatible` alimentado pela API. Seis slots/budget preservados; delta R$250; estimativa 133→136 FPS; undo restaura seleção e limpa resumo |
| Salvar escolha final e reler | Configuração aplicada coincide com resumo e total independente | `build-003`; R$4.539,30; normalização, HTTP, hidratação e novo resumo aprovados |

## Configuração final

Ryzen 5 5600; RX 7600; B550M Aorus Elite; Kingston Fury 32GB DDR4; Kingston A400 240GB; Corsair 650W; Mid Tower Airflow. IDs em `journeys[1].finalBuild`. Delta de FPS é uma diferença entre saídas do mesmo modelo, não ganho medido em equipamento.

## Problemas, correções e pendências

Nenhum novo defeito reproduzido nesse percurso. Comparação comprova consistência contratual, não que a primeira alternativa ou RAM de 32GB seja a melhor compra para essa pessoa. Catálogo, estimativas e fotos têm os limites comuns da etapa. Aplicação/undo foram exercitados por funções reais de estado, sem eventos DOM; handlers correlatos têm testes separados.

Cinco passos integrados aprovados. Aparência dos filtros/cards, visualização dos gráficos, foco, controles em telefone, satisfação e escolha humana continuam pendentes. Nenhuma screenshot criada.

## Evidência

[Registro intermediate com alternativas, valores e deltas](evidence/ra2-v2.8/journeys.json) · [log real](evidence/ra2-v2.8/journeys.log) · [cobertura e limites](RA2-V2.8-JORNADAS.md). Passos não são testes Node adicionais.
