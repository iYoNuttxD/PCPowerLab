# PCPowerLab V3 — fechamento de recomendações econômicas

> **Atualização de fechamento integral:** o estado atual é descrito em [V3-INTEGRAL-COMPLETION.md](V3-INTEGRAL-COMPLETION.md). Os valores e limites abaixo conservam a cronologia da etapa anterior. A arquitetura integrada foi implementada; há proposta factual de seis peças por R$ 2.489,94, além de opção dedicada por R$ 3.799,84. Isso não certifica BIOS instalada, desempenho nem satisfação humana.

21/10/2026. Continuação de `9487ff14e559f4b15dc4ed7b05684772c502f329`, mesma branch/PR #47, sem merge/deploy. Escopo: escolhas econômicas úteis, diagnóstico de viabilidade e dados técnicos verificáveis. Não houve nova calibração nem teste humano.

## O que era corrigível e foi alterado

1. O serviço exigia índice em todas as peças, mesmo sob prioridade de menor preço. A busca também usava um subconjunto do catálogo e misturava economia com índice e equilíbrio CPU/GPU. Agora existe o critério explícito `price-and-compatibility`: percorre o catálogo ativo com referência válida, requisitos de RAM/VRAM e as mesmas verificações de encaixe/energia. Não aplica score, pesos de desempenho, penalidade de equilíbrio ou bônus de FPS. O modo anterior continua separado e é o padrão.
2. `requirements.minVramGb` aceita 0/4/6/8/12/16 GB; o mínimo de RAM mantém 8 GB em estudo/geral e 16 GB nos demais, editável. Isso expressa capacidade exigida, não adequação comprovada a qualquer programa. O critério e os requisitos ficam na etapa Orçamento. A prioridade por índices fica oculta quando não governa a seleção.
3. O erro genérico virou diagnóstico com teto, diferença para a referência mínima, limites dos dados e caminho econômico ainda não aprovado. A tela mostra primeiro a conclusão; motivos e soma inferior ficam em “Entender o limite e as peças pendentes”, sem despejar tudo no primeiro parágrafo. Falhar não muda peças ou orçamento.
4. A RX7600 Pro sem calibração pode integrar uma proposta factual. A existência de especificações suficientes não cria benchmark. A resposta retorna `performanceScore: null`, `performanceBasis: not_used` e a indisponibilidade de simulação.
5. Corrigida regressão na CPU Ryzen 4500: a revisão de catálogo de 21/10 não acionava a checagem de BIOS aplicada aos novos modelos de 20/10. Agora aciona. A versão mínima publicada é usada; a instalada continua desconhecida. BIOS inferior vira conflito, versão desconhecida permanece pendente.

Código: `recommendationService.js`, `recommendationExplanationService.js`, `compatibility.service.js`, `cpuBiosSupport.js`, `BuildWizard.jsx` e `RecommendationCard.jsx`. Reutilizou-se a enumeração e as verificações existentes; não houve arquitetura APU, integração comercial ou reescrita geral.

## Escopo do “menor total”: não certificar a BIOS desconhecida

A busca usa as regras atuais do catálogo para encaixe/energia. Essas regras históricas não inspecionam a BIOS instalada nas unidades físicas antigas. **A nova proposta factual retorna `compatibilityStatus: unverified`**, separando `coreCatalogRulesStatus` e a pendência de BIOS; não transforma o veredito histórico em compra confirmada. `biosSupport.minimumVersion` é o suporte publicado, `installedVersion` é nulo. Refrigeração sem identidade/medidas também continua não verificada.

No diagnóstico interno, `minimumCatalogRulesTotal` é o piso pelas regras atuais. `minimumVerifiedTotal` fica **nulo**: não existe uma unidade com firmware instalado inspecionado que permita prometer montagem integralmente verificada. Não apresentar R$ 4.339,84 ou R$ 5.009,84 como garantia de compra/funcionamento. A resposta HTTP 422 expõe a conclusão e os motivos em `message`/`errors`; os metadados detalhados do diagnóstico interno estão nos cenários registrados.

## Faixas e cenários reais do serviço

[Entradas, saídas, peças, pendências e preços exatos](evidence/v3-economy/scenarios.json). Referências datadas, sem frete/montagem/periféricos; estoque futuro e preço atual não garantidos.

| Cenário | Resultado | Causa / limite |
|---|---|---|
| Estudo R$ 3.000, RAM 8 GB | Não há proposta confirmada. Soma inferior de R$ 3.235,05 mesmo misturando as peças mais baratas sem validar encaixe | Preço sozinho já inviabiliza R$ 3.000 nesta base de sete peças. Essa soma não é uma montagem válida. |
| Estudo R$ 4.000, RAM 8 GB | Piso pelas regras do catálogo R$ 4.339,84; diferença R$ 339,84 | Há caminho de R$ 3.289,75 dentro do teto, mas **não aprovado**: BIOS MSI, comprimento e alimentação auxiliar da RX 550 pendentes. Não é correto dizer que só aumentar orçamento resolveria esses dados. |
| Estudo R$ 4.500, RAM 8 GB | Proposta factual R$ 4.339,84, sobra R$ 160,16 | Ryzen 5500 + B550M-Plus + MSI 3050 LP 6 GB + Apacer 8 GB + A400 240 GB + MWE 650 + CC310. Sem FPS; BIOS instalada/cooler pendentes. |
| Programação R$ 5.000, RAM 16 GB / VRAM 8 GB | Piso pelas regras R$ 5.009,84, diferença R$ 9,84 | Caminho Intel de R$ 4.739,84 depende da BIOS ainda não confirmada. Não aprovar por caber no teto. |
| Programação R$ 5.500, RAM 16 GB / VRAM 8 GB | Proposta factual R$ 5.009,84, sobra R$ 490,16 | Ryzen 5500 + B550M-Plus + ASRock RX 7600 Pro 8 GB + Mancer 16 GB + A400 240 GB + MWE 650 + X2 Plus. GPU de 303 mm exige gabinete que aceite; CC310 de 300 mm é excluído, X2 Plus de 305 mm passa pelo limite publicado. BIOS/cooler ainda pendentes. |
| Trabalho R$ 6.000, RAM 16 GB / VRAM 8 GB | Proposta factual R$ 5.009,84, sobra R$ 990,16 | Mesma capacidade mínima não prova desempenho equivalente em diferentes programas. SSD de 240 GB é a escolha de menor preço, não promessa de espaço suficiente para qualquer carga de trabalho. |

A menor soma isolada é CPU 4500 + GPU RX 550 + MSI H610 DDR4 + RAM8GB + SSD de 240 GB + MWE 650 + CC310. CPU AM4 e placa LGA1700 são incompatíveis: por isso o valor é apenas limite inferior matemático. A proposta pendente de R$ 3.289,75 usa i3-12100F e H610, não essa combinação incompatível.

## Dados completados e dados realmente ausentes

- [PCYES, modelo exato PVEX5504GBDF](https://www.pcyes.com.br/placa-de-video-gpu-amd-radeon-rx-550-4gb-gddr5-128bit-edge-dual-fan-pvex5504gbdf-202279): fabricante publica alimentação típica de **50 W** e fonte recomendada de **400 W**. Registrados como `typicalBoardPowerWatts` e `recommendedPsuWatts`. Não se renomeou consumo típico para TDP. A pendência de potência mínima da fonte foi resolvida; comprimento e cabo auxiliar continuam nulos. Não se deduz alimentação exclusiva pelo slot dos 50 W nem se usa dimensão de embalagem de uma loja como medida da placa.
- [ASUS, TUF GAMING B550M-PLUS sem Wi-Fi](https://www.asus.com/br/motherboards-components/motherboards/all-series/tuf-gaming-b550m-plus/helpdesk_cpu?model2Name=TUF-GAMING-B550M-PLUS): tabela exata lista Ryzen 4500 e Ryzen 5500 com BIOS mínima **2423**, PCB ALL. Registrada em `cpuBiosSupport.js`. A versão instalada não pode ser obtida de uma página pública do fabricante; depende da unidade/vendedor/inspeção autorizada. Nenhuma atualização de firmware foi executada.
- [MSI PRO H610M-S DDR4](https://www.msi.com/Motherboard/PRO-H610M-S-DDR4/support): a página oficial consultada não forneceu tabela CPU/BIOS legível na rota de pesquisa. O [manual exato](https://download.msi.com/archive/mnu_exe/mb/PROH610M-SWIFIDDR4_PROH610M-SDDR4_EN.pdf) não comprova a versão instalada. Não se substituiu pelo modelo II, Wi-Fi ou outra H610, nem se presumiu suporte a qualquer versão a partir da geração Intel anunciada. Pendência preservada.
- [ASRock RX7600 Challenger Pro 8GB OC](https://www.asrock.com/Graphics-Card/AMD/Radeon%20RX%207600%20Challenger%20Pro%208GB%20OC/index.asp): 303mm, fonte de 550 W e 1×8 pinos já estavam verificados. Esses dados permitem comparar encaixe/alimentação com fonte/gabinete exatos; TDP desconhecido não é usado como zero de consumo validado.

Atualizar especificações da RX 550 exigiu revalidar somente a identidade de especificações na referência datada e na fotografia já revisada. SKU, valor, data original da observação comercial e bytes da foto não mudaram. Isso não é uma nova consulta de preço nem concessão de direitos de reprodução.

## Calibração: dependência específica, não impedimento para escolher por fatos

Os novos CPU/GPU não têm `performanceParameters` utilizáveis que comprovem simulação ou pontuação medida ligada à identidade exata. A admissão de medição no projeto exige identidade, fonte HTTPS, métrica, valor, metodologia e data estrita; a simulação exige ainda perfil/versão explícitos e `simulationSupported`. Não foram encontrados ou produzidos esses dados nesta etapa. Especificações publicadas, TFLOPS, VRAM ou uma nota de geração vizinha não bastam. A seleção factual resolve a exclusão automática causada pela ausência de score, preservando FPS/gargalos indisponíveis. Isso não diz que a calibração foi concluída.

## Validação e limites

- **1.048 Node aprovados**, zero falhas/skips; **51 testes direcionados aprovados** para economia, recomendação, catálogo, BIOS e alimentação.
- **24 integrações aprovadas** com API real e frontend de produção em desktop/tablet/celular. Depois da redução de texto repetido no cartão, os **6 casos econômicos passaram novamente** na apresentação final.
- **28 E2E afetados aprovados**, cobrindo jornada, explicações, catálogo e refrigeração. A suíte integral anterior de 309 + 1 skip pertence à revisão anterior e não foi repetida integralmente nesta etapa focada.
- Lints/build aprovados; **93/93 imagens verificadas**. Aviso de bundle >500kB permanece. Não houve alteração de CSS/tokens ou nova alegação de certificação WCAG.
- Chrome real do Mac: N17 conclusão curta a R$ 4.000; N17b motivos expandidos; N18 proposta de 16 GB / 8 GB de VRAM com BIOS 2423 / instalada desconhecida/FPS indisponível; N19 aplicação e recarga conservam sete peças e limite de R$ 5.500. Sem mutação de dados pessoais ou compra.

[Resultados](evidence/v3-economy/results.json), [cenários](evidence/v3-economy/scenarios.json), logs e capturas em `evidence/v3-economy/`. Logs publicados normalizam apenas espaços finais; originais locais preservados. A primeira tentativa de Node sob sandbox falhou em testes HTTP por `listen EPERM` e em imagem por Python sem Pillow; com runtime correto e portas locais autorizadas, passou. O teste inicial de integração teve três timeouts por tentar capturar o cartão removido após aplicar a sugestão; a captura foi antecipada, sem alterar o comportamento da aplicação para fazer o teste passar.

Permanecem reais: dados físicos/elétricos da RX 550 e BIOS da unidade, calibração de desempenho, arquitetura sem GPU dedicada e preço/estoque futuro. Nenhuma peça/preço/score foi inventado para fazer caber R$ 3.000/R$ 4.000. Nenhum ciclo 3 humano, meta de 90%, leitor de tela ou reprodução da montagem original foi alegado.
