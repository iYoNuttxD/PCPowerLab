# Pontuação provisória explícita — 08/10/2026

A pedido do usuário, a ausência de desempenho real permite uma pontuação inventada. Isso altera a política de pontuação do commit 1548ab6, sem alterar preços, estoque, identidades, imagens ou especificações físicas.

## Regra e escala

`src/data/synthetic-performance-profiles.js` guarda oito coeficientes versionados `synthetic-catalog-v1`, separados das especificações do fabricante. São índices convencionais de 0–100, comparáveis dentro da mesma categoria. Não são benchmarks, medições de FPS, prova de superioridade ou previsão de ganho real. Não há benchmark real verificado nos parâmetros atuais; a calibração interna já existente continua identificada como simulada.

| ID exato | Geral / jogos / produtividade |
|---|---:|
| gpu-msi-rtx-3050-lp-6g-oc | 45 |
| gpu-gigabyte-rtx-5060-ti-eagle-oc-ice-8g | 86 |
| gpu-gigabyte-rtx-5070-windforce-oc-sff-12g | 94 |
| gpu-asrock-rx-9060-xt-challenger-16g-oc | 86 |
| gpu-xfx-rx-9070-xt-swift-white-16g | 97 |
| cpu-intel-i5-14600k-box | 90 |
| ram-ax5u6000c4816g-slabrbk | 68 |
| hdd-st2000dm008 | 25 |

GPU: tabela explícita por família/VRAM, posicionada na escala interna anterior; não se compara arquitetura por contagem de shaders e não se concede bônus por OC. CPU: classe 6P+8E/20 threads recebe a âncora geral 90 do i5-13600K, sem ganho presumido de geração. HDD SATA mecânico 7200 rpm recebe a âncora interna 25. RAM: `min(92, 50 + capacidade/2 + (MT/s-3200)/200) - max(0, CASnominalNs-12)`, resultando em 72−4=68; a penalidade também é inventada e não estima FPS ou latência do sistema. Topologia, controlador, carga real e desempenho sustentado não são modelados.

O mesmo coeficiente vale inicialmente para os três usos; diferenças por aplicação não foram inventadas. A identidade e os insumos precisam coincidir com o perfil aprovado. Um produto desconhecido, parâmetro inválido ou mudança de SKU/especificação continua sem nota; não existe fallback arbitrário 50 nos quatro componentes principais. Pesos neutros auxiliares anteriores não representam desempenho de cooler/fan.

## Prioridade e limites

Parâmetros existentes têm prioridade sobre a criação do fallback. Uma nota normalizada de benchmark pode substituir o perfil após revisão explícita de fonte HTTPS, métrica, valor, data e metodologia; dados sem essa evidência nunca recebem rótulo de medição. A evidência do score, por si só, não calibra FPS.

Perfis provisórios têm `scoreBasis: simulated`, `scoreKind: synthetic-provisional`, `modelVersion`, `confidence: low`, insumos, fórmula/classe, fontes das especificações e `simulationSupported: false`. Entram no catálogo, custo-benefício e critérios de desempenho de builds/recomendações. O piso anterior de score 40 nas recomendações automáticas permanece: HDD 25 é selecionável manualmente e aparece no ranking, mas não é escolhido como disco principal pelo recomendador.

FPS, requisitos de software, análise de gargalos e consumo não são desbloqueados pelos oito scores. Esses resultados continuam ausentes, com `synthetic_model_not_simulation_calibrated`. A nota de desempenho da build pode ser numérica enquanto a nota geral permanece ausente por equilíbrio/gargalo desconhecido. Nenhuma ausência vira zero, ausência de gargalo, wattagem ou temperatura inventada.

`performanceMethodology` do componente informa base, tipo, versão, rótulo e suporte a simulação. Agregados incluem `performanceBasis: simulated` e os IDs provisórios contribuintes. Recomendações, comparação, exportação e relatórios preservam a proveniência. A interface usa o rótulo curto “Pontuação simulada”; resultados indisponíveis não reutilizam valores anteriores.

## Validação

835 testes Node passaram, incluindo os oito perfis, limites de identidade, prioridade de evidência revisada, ranking, orçamento, serialização e bloqueio de FPS/gargalos. Lints e build frontend foram executados; a validação real de navegador deve acompanhar o commit final após revisão e publicação.

A evidência de benchmark revisada precisa incluir `componentIdentity`, hash da identidade e especificações exatas correntes. Editar SKU, marca, nome, categoria ou especificações invalida a nota revisada até nova revisão. A base dos contribuintes é resolvida dos parâmetros registrados, sem confiar em metadados enviados pelo cliente.
