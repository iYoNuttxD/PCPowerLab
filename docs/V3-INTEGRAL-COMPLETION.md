# Fechamento técnico integral da V3 — 21/10/2026

> **Contrato atual — 21/10/2026:** [V3-NONBLOCKING-VALIDATION.md](V3-NONBLOCKING-VALIDATION.md) substitui os antigos bloqueios por BIOS desconhecida, medidas ausentes e falta de calibração. Dados desconhecidos são avisos opcionais; há estimativas aproximadas, não medições. Conflitos conhecidos não impedem o fluxo manual. Registros anteriores abaixo são históricos e não descrevem esses bloqueios como requisitos atuais.


Esta revisão sucede `22e082d4e9833867c5c46577bfec26009d453cf3`. Mantém a PR #47 em rascunho, sem merge ou deploy. A [matriz completa de 67 sinais](V3-FEEDBACK-FOLLOWUP.md#matriz-completa) continua sendo o registro célula a célula. Este documento atualiza o comportamento técnico atual e substitui os limites econômicos descritos como atuais no relatório anterior. Não afirma homologação dos participantes, execução do ciclo 3 nem reprodução da montagem desconhecida de R09.

## Registro histórico — anterior ao contrato não bloqueante


## Resultado econômico utilizável

A etapa 01 oferece explicitamente vídeo integrado ou GPU dedicada. A ausência de GPU sozinha não ativa esse modo. No caminho integrado, a seleção exige CPU com vídeo comprovado e saída de vídeo comprovada na placa-mãe; mantém orçamento, resumo, seis grupos de links de lojas, salvamento, exportação, compartilhamento privado local e histórico de desfazer. A memória padrão sobe para 16 GB porque é compartilhada com o vídeo. Não é uma garantia de desempenho do aplicativo.

| Cenário factual demonstrado | Seleção e preço de referência | Resultado e limite |
|---|---|---|
| Estudos, limite R$ 3.000, vídeo integrado | Ryzen 3 3200G Box + ASRock B450M-HDV R4.0 + Mancer Vant S 16 GB + Kingston A400 240 GB + MWE Gold 650 V3 + DeepCool CC310: **R$ 2.489,94** | Seis produtos, sem GPU fictícia nem preço de GPU zero. Wraith Stealth incluso no preço da CPU. BIOS mínima P2.30 publicada, instalada desconhecida. Sem FPS, índice ou veredito numérico de gargalo. |
| Estudos, limite R$ 4.000, GPU dedicada | Mesmo par CPU/placa-mãe, RTX 3050 LP 6G OC e RAM de 8 GB: **R$ 3.799,84** | Opção factual, não ranking de desempenho. A capacidade mínima é editável. CPU 4 núcleos/4 threads e SSD de 240 GB são escolhas básicas, não promessa de atender jogos atuais ou projetos exigentes. |
| Programação, limite R$ 5.500, exigência explícita de 16 GB de RAM / 8 GB VRAM | CPU/placa-mãe acima, RX 7600 Challenger Pro 8 GB OC, RAM 16 GB, Montech X2 Plus e demais peças: **R$ 4.469,84** | Cumpre capacidade e regras de encaixe/energia registradas. Não comprova adequação do processador para uma carga de programação. Para desempenho, o modo de índices continua separado e os requisitos do programa precisam ser conferidos. |
| Estudos, R$ 3.000, exigindo GPU dedicada | Menor proposta factual encontrada: **R$ 3.799,84**, diferença R$ 799,84 | Resposta explica valor mínimo e pendências. A soma isolada R$ 3.019,75 com RX 550 não é aprovada: faltam comprimento/conectores dessa GPU. A alternativa integrada é funcional e não depende dela. |

Valores datados, com fontes por peça na interface, sem frete, montagem, sistema operacional ou periféricos. Não são cotações em tempo real. A nova placa-mãe não acrescenta benchmark e não faz a proposta ganhar um score artificial. As sugestões por faixa continuam usando o modo de índices; a interface por faixa não expõe o critério factual nem vídeo integrado, evitando a combinação rejeitada pela API.

## Feedback → mudança concreta → verificação

| Falas / células | Implementação atual | Evidência verificável / alcance |
|---|---|---|
| H7, AB7; R2/R3/R7/R9 | Busca por recursos verificados e sinônimos, filtros visíveis, categorias/contagem, faixas de preço e lista compacta; guia de placas-mãe além do chipset | Preservado do fechamento anterior. Integração real cobre catálogo, filtros e comparação. A sétima placa informa 2 DIMMs, 64 GB, 1 M.2, 4 SATA, Ethernet 1 Gb/s, ausência de Wi-Fi/USB-C frontal e saídas HDMI/DVI-D/VGA. Não presume equivalência entre Unify/Tomahawk nem classificação de VRM. |
| H10, AD7, AD10; P3/P5/P7/P10 | Catálogo de 95 produtos ativos com referências e fotografias; nova CPU Box de R$ 439,99 e placa-mãe de R$ 379,99 tornam utilizável uma montagem de entrada | `catalog.completion.json`, referências datadas, fontes oficiais abaixo, teste `integrated-graphics.test.js`, integração real em três telas. A contagem não é prova de variedade satisfatória; diferença prática é a proposta abaixo de R$ 3.000. |
| AD8 | Seis gabinetes com propostas e dimensões distintas, incluindo compacto econômico e torre ampla | Preservado: CC310, Elite 301/502, MX230, X2 Plus, XR. Comparações e informações de encaixe continuam sem trocar o produto por uma variante semelhante. |
| H4 | Orçamento na etapa 01, objetivo, acumulado e saldo | Preservado. O novo tipo de vídeo fica na mesma etapa; alterar orçamento preserva escolhas. Testes automatizados e inspeção no Mac. |
| H4, AD4, AD10; Q3/Q7/Q9 | Pop-up real de temperatura/ruído com informações progressivas e retorno de foco; integração de refrigeração opcional e identificação do cooler incluso | Novo caminho identifica **AMD Wraith Stealth**, fonte e custo adicional zero. Mantém medidas/curva/consumo desconhecidos. Tab e Shift+Tab ficam no diálogo; Escape fecha e retorna ao botão. Cenários existentes são hipóteses ilustrativas, não calibração nem ruído do PC completo. |
| H4; V2/V4/V7/V9 e F10 | Configuração recomendada por orçamento único factual ou por índices; novo modo integrado, RAM compartilhada, avisos antes de aplicar | Geração/aplicação, seis peças, salvar/recarregar, resumo e pop-up executados com backend real. BIOS publicada não é tratada como firmware instalado. A recomendação factual não promete FPS nem adequação profissional da CPU básica. |
| F10: gargalos | Indisponibilidade localizada com causa explícita em português | Novo motivo “Vídeo integrado sem calibração”. Não cria gargalo zero ou resultado favorável fictício. |
| F10: simulações | A simulação não usa o perfil de uma GPU dedicada para o vídeo integrado | Ausência de modelo ou compatibilidade pendente apresentada somente nessa saída. Não bloqueia custos/lojas. |
| F10: compatibilidade | Regras de CPU/socket, RAM, armazenamento, PSU, gabinete e vídeo integrado; BIOS separada | P2.10 falha; P2.30 satisfaz regra de versão; beta P2.30B não é ordenada como estável. CPU sem vídeo ou placa sem saída verificada permanece pendente. Não se afirma compatibilidade física integral do cooler por conhecer seu nome. |
| F10: recomendação final | Resumo com recomendação factual útil e pendências próprias, mesmo sem desempenho | `generateBuildSummary`, exportação e compartilhamento preservam seis peças/total; integração real exige seção de recomendação disponível. |
| F10: links | Seis grupos reais de pesquisa e referências dos seis produtos | Sem compra/link fictício de GPU integrada; sem oferta em tempo real inferida de página de pesquisa. |
| T4/T7/T9; U4/U5/U7/U9; G3/G5 | Comparações e desempenho mantêm desconhecido separado de zero; fontes externas opcionais nos detalhes de quatro modelos | Ver pesquisa abaixo. Testes verdes não demonstram utilidade subjetiva, nem ratings parciais identificam por si a causa. |
| AB10; M2/M10; K4/L5/D4/D9/D10/J7/S2/S3/S4/S7/S9/S10 | Hierarquia, composição ciano/magenta/verde, listas e detalhes progressivos preservados | Home, fontes, contraste, geometria e foco são verificáveis; identidade “parece IA”, compreensão, navegação autônoma e ausência de excesso exigem nova observação humana. Classificação continua parcial, sem adiar falha técnica conhecida. |
| Demais sinais da matriz: G6, N6, X3, AA5/AA9, I8/I9/I10, AD2, AD11 | Funcionalidades úteis preservadas; não se inventa causa nem requisito para resposta ambígua | Ver as 67 linhas originais. AD2 é elogio da melhoria já observada. AD11 “Tudo” não autoriza escopo ilimitado. Imagens e preços elogiados continuam com identidade e limitações explícitas. |

## Dados exatos, cooler e BIOS

- [AMD Ryzen 3 3200G](https://www.amd.com/en/support/downloads/drivers.html/processors/ryzen/ryzen-3000-series/amd-ryzen-3-3200g.html): Box YD3200C5FHBOX, 4 núcleos/4 threads, TDP 65 W, Vega 8, memória DDR4 até 2933 MT/s e Wraith Stealth incluso. Não se converte frequência em FPS. O kit DDR4-3200 não implica operação garantida em 3200 nessa CPU.
- [ASRock B450M-HDV R4.0](https://asrock.com/mb/AMD/B450M-HDV%20R4.0/index.asp), [manual exato](https://download.asrock.com/Manual/B450M-HDV%20R4.0.pdf): mATX 230 × 201 mm, 2 DIMMs, 1 M.2, 4 SATA, HDMI/DVI-D/VGA, um conector CPU fan até 1 A e dois de gabinete. As saídas só funcionam com CPU que produza vídeo.
- [Suporte ASRock ao 3200G](https://www.asrock.com/support/cpu.asp?s=AM4&u=599): **P2.30**. Suporte publicado ao [5500](https://www.asrock.com/support/cpu.us.asp?s=AM4&u=684) e [4500](https://www.asrock.com/support/cpu.us.asp?s=AM4&u=692): **P4.90**, para essa revisão exata. Não foi realizada atualização de firmware. A confirmação da unidade pode ser obtida na compra; não se exige prova física impossível para apresentar proposta condicional.
- As duas novas ofertas foram observadas disponíveis, com “Comprar agora” habilitado na página exata, evidências S18/S19. 4600G/5600G/5600GT consultados estavam indisponíveis nas páginas verificadas; uma oferta de marketplace contradizia condição e preço do resultado de busca e foi rejeitada. Não foi usada como preço barato fictício.
- Identidade do cooler incluído comprovada, mas dimensões, potência elétrica e curvas não confirmadas. O estado `included_cooler_identity_only` mantém essa limitação e não obriga outra compra. Um cooler avulso selecionado continua sendo verificado e cobrado separadamente. A acústica não inclui automaticamente fans de gabinete sem perfil, PSU, GPU ou ambiente.
- RX 550 PCYES Edge: fabricante fornece potência típica 50 W e fonte recomendada 400 W; isso não é TDP medido, comprimento nem prova de ausência de conector. Esses dois últimos continuam desconhecidos. O caminho integrado e a RTX 3050 LP verificável evitam depender exclusivamente da RX 550.

## Pesquisa de calibração dos oito modelos

Pesquisa atual em fontes primárias de fabricante e autores dos testes. Ações bloqueadas por robots em TechPowerUp/Guru3D não foram contornadas. Não há nova calibração de FPS neste fechamento: os testes encontrados não fornecem validação de erro do modelo para combinações arbitrárias de CPU/GPU/RAM, jogos, patches e resoluções do catálogo. Um FPS de outra bancada não é coeficiente universal. As quatro referências de modelo identificado foram incorporadas de forma progressiva aos detalhes, como leitura externa, sem importar notas ou números contraditórios.

| Modelo pendente | Fonte examinada e decisão | Dependência específica |
|---|---|---|
| Ryzen 7 7800X3D | [GamersNexus](https://gamersnexus.net/cpus/rip-intel-amd-ryzen-7-9800x3d-cpu-review-benchmarks-vs-7800x3d-285k-14900k-more) inclui testes próprios comparativos desse processador. Link de leitura no produto. | Não há mapeamento validado entre cada carga/test bench e os coeficientes atuais nem erros em conjuntos de validação do PCPowerLab. |
| Ryzen 9 9900X | [Review original GN](https://gamersnexus.net/cpus/amd-ryzen-9-9900x-cpu-review-benchmarks-vs-14700k-7900x-9950x-more) separa jogos, Blender, compilação e outras cargas; sem reduzir a nota geral. Link no produto. | Mesma dependência de calibração por carga; não usar renderização para afirmar FPS. |
| Ryzen 5 4500 | [Tom’s Hardware](https://www.tomshardware.com/reviews/amd-ryzen-4-4500-ryzen-3-4100-cpu-review/3) usa RTX 3090 para isolar limite de CPU. Link no produto. | Não extrapolar o resultado para RX 550/RTX 3050 ou comparar médias de suítes diferentes como escala comum. |
| MSI RTX 5060 Ti VENTUS 2X OC PLUS 16G | [Review exato TweakTown](https://www.tweaktown.com/reviews/11444/msi-geforce-rtx-5060-ti-16g-ventus-2x-oc-plus/index.html), Ryzen 7 9800X3D, 32 GB DDR5, resultados nativos e com upscaling separados. Link no produto. | Texto e descrição alternativa do gráfico 1440p apresentam ambiguidade entre 95/111; nenhum desses valores foi importado. Nenhum teste de validação do simulador em nossas combinações. |
| MSI RTX 5060 VENTUS 2X OC 8G | Busca encontrou outros fabricantes e MSI Gaming, não evidência metodológica suficiente da VENTUS exata. [GN 5060](https://gamersnexus.net/gpus/forbidden-review-nvidia-rtx-5060-gpu-benchmarks) é referência de classe, não admitida como ensaio do SKU cadastrado. | Obter ensaio do modelo/variante exatos e metodologia comparável, sem substituir 5060 Ti, V1 ou Gaming. |
| ASRock Arc A380 Challenger ITX 6GB OC | [Review Tom’s Hardware](https://www.tomshardware.com/reviews/intel-arc-a380-review) testa **Gunnir Photon**, não Challenger. [Comunicado ASRock](https://www.asrock.com/news/index.asp?iD=5751) é promoção com XeSS; não fornece protocolo controlado suficiente. Ambos rejeitados como calibração. | Modelo exato, versão de driver, ReBAR/UEFI, presets e separação de quadros renderizados/gerados com erro validado. |
| ASRock RX 7600 Challenger Pro 8GB OC | [TweakTown](https://www.tweaktown.com/reviews/10506/asrock-radeon-rx-7600-phantom-gaming-8gb-oc/index.html) testa **Phantom Gaming**, outra variante. Rejeitada como fonte do modelo exato. | Ensaio da Challenger Pro exata e validação por cenário, não copiar medições térmicas/acústicas da Phantom. |
| PCYES RX 550 Edge 4GB | Não foi localizada fonte primária de ensaio controlado do SKU exato com protocolo suficiente. Página do fabricante é fonte de especificação, não benchmark. | Ensaio exato e medidas físicas/elétricas ausentes; permanece fora de proposta automática que dependa dessas verificações. |

O novo 3200G também não recebe modelo fictício. Vídeo integrado compartilha RAM e tem dependência de canais/velocidade; o simulador de GPU dedicada não pode ser reaproveitado como se fosse sua Vega 8.

## Verificação final

Código funcional congelado e impressão SHA-256 do diff conferida antes/depois: `5fc112fba162b1662ad07e3f15b57fc82d26760550a9f72e2e22150a6cfba175`. [Resultados](evidence/v3-integral-completion/results.json), [entradas/saídas econômicas](evidence/v3-integral-completion/scenarios.json) e [registro de congelamento](evidence/v3-integral-completion/code-freeze.json).

- **1.055 Node aprovados**, zero falhas/skips, incluindo seis casos específicos de arquitetura integrada, contratos negativos, BIOS, persistência, exportação, relatório, compartilhamento, comparação, software e upgrades.
- **27 integrações reais aprovadas**, frontend de produção e backend HTTP, desktop/tablet/celular. O novo cenário começa na etapa 01, aplica a proposta de R$ 2.489,94, passa pela etapa de GPU, recarrega, salva, abre a build salva, gera resumo e opera o pop-up com teclado.
- **309 E2E aprovados + 1 skip previsto** na regressão integral final. Skip exclusivo de geometria móvel no projeto desktop. Não se somam execuções intermediárias como casos adicionais.
- Lints e build aprovados; **17 verificadores aprovados**, **64 contrastes de tokens aprovados**, **95/95 imagens verificadas**, sem órfãos/bloqueadas. O aviso de bundle acima de 500 kB permanece; não é erro de build nem certificação WCAG.
- A primeira integral desta etapa teve dois timeouts em filtros de armazenamento/cooler no desktop; a categoria não permaneceu selecionada, sem causa de produção estabelecida. Os dois passaram em reteste, dez execuções de estabilidade e na integral final congelada. Não foram ocultados como passes daquela primeira execução. Um primeiro teste novo de foco usava seletor de atributo de role em um `dialog` nativo; corrigido o teste, sem mudar o foco da aplicação para fazê-lo passar.
- Inspeção real do Mac documentada em [V3-MAC-BROWSER-VALIDATION.md](V3-MAC-BROWSER-VALIDATION.md#fechamento-integral-vídeo-integrado-e-preservação-da-ux), capturas F01–F10. O texto fixo de sete peças foi corrigido após observação. Fontes S18/S19 sustentam as novas referências. Zoom nativo 200% permanece evidência da etapa anterior; a final executou reflow/tamanho de texto de 200% em E2E, sem rotular como nova inspeção de zoom nativo.

Logs originais locais em `validation-logs/completion-*`; cópias publicadas normalizam somente espaços finais. A cronologia anterior fica preservada, sem substituir satisfação humana por contagens.

## Dependências externas e tentativas delimitadas

| Ação / alvo | Resultado | Consequência |
|---|---|---|
| Leitura de benchmarks em TechPowerUp/Guru3D | Bloqueio de robots da fonte; operação não repetida por outra rota | Pesquisa prosseguiu nos autores acessíveis e fabricantes. Não se afirmou ter lido as páginas bloqueadas. |
| Confirmar BIOS efetivamente instalada em uma placa ainda não adquirida | Informação não disponível nesta unidade inexistente; suporte público verificado | Proposta permanece condicional. Conferir versão da unidade na compra, sem fazer atualização de firmware. |
| Completar medidas/conector da RX 550 PCYES exata | Não comprovado nas fontes utilizadas | Dados continuam nulos; existem caminhos funcionais com vídeo integrado e RTX 3050 LP que não dependem dessa GPU. |
| Medir/calibrar FPS e refrigeração dos modelos sem perfil | Ensaios comparáveis e validação de erro não disponíveis; não executado como medição real | Links externos de leitura onde o modelo foi identificado; nenhuma conversão de especificações ou outro SKU em coeficiente. |
| Homologação dos dez respondentes / ciclo 3 / configuração original de R09 | Não executados; combinação/estado original não fornecidos | Funcionalidades ao alcance foram implementadas e testadas. Satisfação, compreensão, utilidade e estética continuam conclusões humanas, não falhas técnicas presumidas nem aprovação inventada. |

Não houve pedido de permissão pendente nem negativa de execução do Mac nesta etapa de fechamento. Não houve compra, atualização de firmware, mudança de permissões, merge ou deploy.
