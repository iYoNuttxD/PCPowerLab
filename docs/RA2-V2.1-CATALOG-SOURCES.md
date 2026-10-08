# PCPowerLab v2.1 — catálogo e fontes técnicas

Verificação: 08/10/2026 (UTC). Fontes primárias dos fabricantes consultadas via web. Este registro documenta somente as adições e o enriquecimento de refrigeração desta etapa; não revalida os 69 itens legados.

## Inventário

- RAM: 11 → 21 (+10); DDR4/DDR5, 16/32/64 GB por kit, 3200–6000 MT/s, Kingston e Corsair
- Armazenamento: 11 → 21 (+10); SATA/NVMe, 240–4096 GB, Samsung e Kingston
- Cooler: 5 novos (3 air cooler, 2 AIO)
- Fan: 4 novos SKUs (3 unidades avulsas, 1 kit de 5)
- Total: 98 componentes; 89 parâmetros de desempenho (nenhum parâmetro artificial para cooler/fan)

## Contrato e limites

- IDs legados preservados. Os kits RAM novos têm SKU e número de módulos explícitos; não presumir que nomes genéricos legados representam estes mesmos kits
- RAM: capacityGb é o total do kit; modulesPerKit é 2. speedMhz é mantido por compatibilidade de API, mas representa a taxa anunciada em MT/s, também registrada corretamente em dataRateMTs. Perfis XMP dependem da placa/CPU/BIOS; o valor não é promessa de operação nem velocidade JEDEC padrão
- SSD: readSpeedMbS/writeSpeedMbS são máximos sequenciais anunciados, não desempenho sustentado, benchmark do aplicativo ou ganho de FPS. KC3000 preserva capacidades anunciadas 512/1024/2048/4096 GB, sem arredondar para outros SKUs
- Todos os preços novos são estimativas demonstrativas de referência em BRL (priceKind, priceCurrency, priceLabel). Não foram pesquisados preços de mercado, estoque, frete ou ofertas. Preço de fan em kit é por pacote
- Coolers: coolingType='air'/'aio'; supportedSockets; heightMm para air; radiatorSizeMm é a classe nominal do radiador, distinta de seu comprimento real em radiatorDimensionsMm {length,width,height}; radiatorThicknessMm não inclui fans
- Fans: diameterMm é classe nominal; thicknessMm é espessura física (NF-A14: 27 mm com pads, 25 mm sem pads); connector; powerWatts é por fan físico; unitsPerPack distingue quantidade do pacote da quantidade de pacotes selecionada
- powerWatts do NH-U12S redux: máximo elétrico 1,08 W do único fan fornecido, comprovado na ficha adicional. Fans Noctua usam máximo publicado; ARCTIC P12 usa 1,2 W por fan, cálculo explícito de 12 V × 0,1 A nominais. Isso não é TDP/capacidade térmica
- AK620, NH-L9a-AM4 e AIOs: consumo total máximo não comprovado, portanto powerWatts=null. Não converter consumo típico/subcomponente em máximo total. AIOs incluem seus fans, que não devem ser cobrados ou contados novamente como acessórios avulsos
- Nenhuma capacidade térmica, temperatura, eficiência ou ganho de FPS inventado. Socket/altura nominal não comprovam adequação térmica ou ausência de interferência com RAM/VRM/M.2. NH-L9a-AM4 tem alerta oficial contra alta carga térmica. Compatibilidade depende de revisão e kit efetivamente fornecido
- fanMounts contém alternativas por diâmetro: não somar, por exemplo, 6×120 e 4×140. Ocupação de radiadores/fans e combinações de posições exigem verificação física; a tabela agregada não a substitui
- Limites de espessura de fan/radiador nos gabinetes não foram comprovados e permanecem null; suporte nominal não aprova espessura ou montagem completa. H5 Flow não tem revisão/ano identificado no legado: todos os novos campos permanecem null. Gabinetes genéricos PCPowerLab também ficam desconhecidos, nunca false/zero/compatível
- Não foram adicionadas fotos sem licença. O fallback ilustrativo existente continua aplicável

## Fontes por item

| ID | Modelo / SKU | Dados registrados | Fonte oficial |
| --- | --- | --- | --- |
| ram-kf432c16bbk2-16 | Kingston FURY Beast 16GB (2×8GB) DDR4-3200; KF432C16BBK2/16 | 16 GB (2 módulos), DDR4, 3200 MT/s | [Fabricante](https://www.kingston.com/dataSheets/KF432C16BBK2_16.pdf) |
| ram-kf432c16bbk2-32 | Kingston FURY Beast 32GB (2×16GB) DDR4-3200; KF432C16BBK2/32 | 32 GB (2 módulos), DDR4, 3200 MT/s | [Fabricante](https://www.kingston.com/dataSheets/KF432C16BBK2_32.pdf) |
| ram-kf432c16bbk2-64 | Kingston FURY Beast 64GB (2×32GB) DDR4-3200; KF432C16BBK2/64 | 64 GB (2 módulos), DDR4, 3200 MT/s | [Fabricante](https://www.kingston.com/unitedkingdom/en/memory/search?partid=KF432C16BBK2%2F64) |
| ram-kf436c18bbk2-32 | Kingston FURY Beast 32GB (2×16GB) DDR4-3600; KF436C18BBK2/32 | 32 GB (2 módulos), DDR4, 3600 MT/s | [Fabricante](https://www.kingston.com/dataSheets/KF436C18BBK2_32.pdf) |
| ram-kf552c40bbk2-32 | Kingston FURY Beast 32GB (2×16GB) DDR5-5200; KF552C40BBK2-32 | 32 GB (2 módulos), DDR5, 5200 MT/s | [Fabricante](https://www.kingston.com/dataSheets/KF552C40BBK2-32.pdf) |
| ram-kf556c40bbk2-32 | Kingston FURY Beast 32GB (2×16GB) DDR5-5600; KF556C40BBK2-32 | 32 GB (2 módulos), DDR5, 5600 MT/s | [Fabricante](https://www.kingston.com/dataSheets/KF556C40BBK2-32.pdf) |
| ram-kf560c40bbk2-32 | Kingston FURY Beast 32GB (2×16GB) DDR5-6000; KF560C40BBK2-32 | 32 GB (2 módulos), DDR5, 6000 MT/s | [Fabricante](https://www.kingston.com/dataSheets/KF560C40BBK2-32.pdf) |
| ram-cmk32gx4m2e3200c16 | Corsair Vengeance LPX 32GB (2×16GB) DDR4-3200; CMK32GX4M2E3200C16 | 32 GB (2 módulos), DDR4, 3200 MT/s | [Fabricante](https://www.corsair.com/ww/en/p/memory/cmk32gx4m2e3200c16/vengeance-lpx-32gb-2-x-16gb-ddr4-dram-3200mhz-c16-memory-kit-black-cmk32gx4m2e3200c16) |
| ram-cmk32gx5m2b6000c36 | Corsair Vengeance 32GB (2×16GB) DDR5-6000; CMK32GX5M2B6000C36 | 32 GB (2 módulos), DDR5, 6000 MT/s | [Fabricante](https://www.corsair.com/ww/en/p/memory/cmk32gx5m2b6000c36/vengeance-32gb-2x16gb-ddr5-dram-6000mhz-c36-memory-kit-black-cmk32gx5m2b6000c36) |
| ram-cmk64gx5m2b6000c40 | Corsair Vengeance 64GB (2×32GB) DDR5-6000; CMK64GX5M2B6000C40 | 64 GB (2 módulos), DDR5, 6000 MT/s | [Fabricante](https://www.corsair.com/ww/en/p/memory/cmk64gx5m2b6000c40/vengeance-64gb-2x32gb-ddr5-dram-6000mhz-c40-memory-kit-black-cmk64gx5m2b6000c40) |
| ssd-samsung-870-evo-250gb | Samsung 870 EVO 250GB SATA; MZ-77E250 | 250 GB, SATA, até 560/530 MB/s | [Fabricante](https://download.semiconductor.samsung.com/resources/data-sheet/Samsung_SSD_870_EVO_Data_Sheet_Rev1.1_230509_10129500053000.pdf) |
| ssd-samsung-870-evo-500gb | Samsung 870 EVO 500GB SATA; MZ-77E500 | 500 GB, SATA, até 560/530 MB/s | [Fabricante](https://download.semiconductor.samsung.com/resources/data-sheet/Samsung_SSD_870_EVO_Data_Sheet_Rev1.1_230509_10129500053000.pdf) |
| ssd-samsung-870-evo-1000gb | Samsung 870 EVO 1000GB SATA; MZ-77E1T0 | 1000 GB, SATA, até 560/530 MB/s | [Fabricante](https://download.semiconductor.samsung.com/resources/data-sheet/Samsung_SSD_870_EVO_Data_Sheet_Rev1.1_230509_10129500053000.pdf) |
| ssd-samsung-870-evo-2000gb | Samsung 870 EVO 2000GB SATA; MZ-77E2T0 | 2000 GB, SATA, até 560/530 MB/s | [Fabricante](https://download.semiconductor.samsung.com/resources/data-sheet/Samsung_SSD_870_EVO_Data_Sheet_Rev1.1_230509_10129500053000.pdf) |
| ssd-samsung-870-evo-4000gb | Samsung 870 EVO 4000GB SATA; MZ-77E4T0 | 4000 GB, SATA, até 560/530 MB/s | [Fabricante](https://download.semiconductor.samsung.com/resources/data-sheet/Samsung_SSD_870_EVO_Data_Sheet_Rev1.1_230509_10129500053000.pdf) |
| ssd-kingston-kc3000-512gb | Kingston KC3000 512GB NVMe; SKC3000S/512G | 512 GB, M.2 NVMe, até 7000/3900 MB/s | [Fabricante](https://www.kingston.com/datasheets/KC3000_es.pdf) |
| ssd-kingston-kc3000-1024gb | Kingston KC3000 1024GB NVMe; SKC3000S/1024G | 1024 GB, M.2 NVMe, até 7000/6000 MB/s | [Fabricante](https://www.kingston.com/datasheets/KC3000_es.pdf) |
| ssd-kingston-kc3000-2048gb | Kingston KC3000 2048GB NVMe; SKC3000D/2048G | 2048 GB, M.2 NVMe, até 7000/7000 MB/s | [Fabricante](https://www.kingston.com/datasheets/KC3000_es.pdf) |
| ssd-kingston-kc3000-4096gb | Kingston KC3000 4096GB NVMe; SKC3000D/4096G | 4096 GB, M.2 NVMe, até 7000/7000 MB/s | [Fabricante](https://www.kingston.com/datasheets/KC3000_es.pdf) |
| ssd-kingston-a400-240gb | Kingston A400 240GB SATA SSD; SA400S37/240G | 240 GB, SATA, até 500/350 MB/s | [Fabricante](https://www.kingston.com/unitedkingdom/en/memory/search?partid=SA400S37%2F240G) |
| cooler-noctua-nh-u12s-redux | Noctua NH-U12S redux; NH-U12S redux | Air, 158 mm; sockets em catálogo; consumo 1.08 | [Fabricante](https://www.noctua.at/en/products/nh-u12s-redux/specifications) · [Ficha complementar](https://cdn.noctua.at/media/noctua_nh_u12s_redux_infosheet_en_web.pdf?download=true) |
| cooler-noctua-nh-l9a-am4 | Noctua NH-L9a-AM4; NH-L9a-AM4 | Air, 37 mm; sockets em catálogo; consumo desconhecido | [Fabricante](https://www.noctua.at/en/products/nh-l9a-am4/specifications) |
| cooler-deepcool-ak620 | DeepCool AK620 (R-AK620-BKNNMT-G); R-AK620-BKNNMT-G | Air, 160 mm; sockets em catálogo; consumo desconhecido | [Fabricante](https://www.deepcool.com/products/Cooling/cpuaircoolers/AK620-High-Performance-CPU-Cooler-1851-1700-AM5/2024/13067.shtml) |
| cooler-arctic-liquid-freezer-iii-240 | ARCTIC Liquid Freezer III 240 Black; ACFRE00134A | AIO 240, 277×120×38 mm, 2 fans; AM4/AM5/LGA1700/LGA1851; consumo desconhecido | [Fabricante](https://www.arctic.de/en/Liquid-Freezer-III-240/ACFRE00134A) |
| cooler-arctic-liquid-freezer-iii-360 | ARCTIC Liquid Freezer III 360 Black; ACFRE00136A | AIO 360, 398×120×38 mm, 3 fans; AM4/AM5/LGA1700/LGA1851; consumo desconhecido | [Fabricante](https://www.arctic.de/en/Liquid-Freezer-III-360/ACFRE00136A) |
| fan-noctua-nf-p12-redux-1700-pwm | Noctua NF-P12 redux-1700 PWM; NF-P12 redux-1700 PWM | 120 mm, espessura 25 mm, 4-pin PWM, 1.08 W/fan, 1 fan(s)/pacote | [Fabricante](https://www.noctua.at/en/products/nf-p12-redux-1700-pwm/specifications) |
| fan-noctua-nf-a14-pwm | Noctua NF-A14 PWM; NF-A14 PWM | 140 mm, espessura 27 mm, 4-pin PWM, 1.56 W/fan, 1 fan(s)/pacote | [Fabricante](https://www.noctua.at/en/products/nf-a14-pwm/specifications) |
| fan-arctic-p12-pwm-pst | ARCTIC P12 PWM PST (1 fan); ACFAN00120A | 120 mm, espessura 25 mm, 4-pin PWM PST, 1.2 W/fan, 1 fan(s)/pacote | [Fabricante](https://www.arctic.de/en/P12-PWM-PST/ACFAN00120A) |
| fan-arctic-p12-pwm-pst-5-pack | ARCTIC P12 PWM PST (kit 5 fans); ACFAN00137A | 120 mm, espessura 25 mm, 4-pin PWM PST, 1.2 W/fan, 5 fan(s)/pacote | [Fabricante](https://www.arctic.de/P12-PWM-PST/ACFAN00137A) |

## Gabinetes enriquecidos

- case-cooler-master-q300l: altura 159 mm; radiadores 120/240 mm; 1 fans incluídos. 120/240 mm na frente, 120 mm atrás. Fans: frente 2×120/140; topo 2×120; traseira 1×120; base 1×120. Layouts alternativos; conferir interferências no manual. [Fonte oficial](https://www.coolermaster.com/en-global/products/masterbox-q300l.html)
- case-corsair-4000d-airflow: altura 170 mm; radiadores 120/140/240/280/360 mm; 2 fans incluídos. 360 mm na frente; 280 mm no topo depende da altura da RAM. AIO frontal reduz folga de GPU. Capacidades de fans por diâmetro são layouts alternativos. [Fonte oficial](https://www.corsair.com/ww/en/p/pc-cases/cc-9011200-ww/4000d-airflow-temper)
- case-montech-air-903-base: altura 180 mm; radiadores 120/140/240/280/360 mm; 3 fans incluídos. Radiadores no topo/frente. Fans: topo 3×120/2×140; frente 3×120/3×140; PSU shroud 2×120; traseira 1×120/1×140. Não somar layouts alternativos. [Fonte oficial](https://www.montechpc.com/air-903-base)

## Parâmetros demonstrativos

Os 20 novos registros RAM/SSD em performanceParameters.js usam scoreKind='internal-demonstrative' e aviso explícito. Fórmulas internas: RAM min(92, 50 + capacidade/2 + (taxa−3200)/200); SSD min(92, 50 + leitura/200). gamingScore/productivityScore reproduzem o mesmo índice apenas para integração do modelo legado. Não são fornecidos pelo fabricante nem medidos, não constituem comparação científica e não adicionam bônus por refrigeração. Parâmetros legados não foram recalibrados.

## Verificação da etapa de dados

- Importação ESM e integridade: 98 IDs únicos, 21 RAM, 21 storage; 20 novos parâmetros cobrem exatamente RAM/storage; coolers/fans sem scores
- ESLint nos quatro arquivos de dados: passou
- `git diff --check` limitado aos arquivos desta entrega: passou
- Suíte completa executada durante integração concorrente: 273/284 passaram. Nove falhas eram pressuposto antigo de parâmetro de desempenho obrigatório para cada item; duas eram expectativa de SKU fixo de upgrade após expansão de candidatos. Reportadas ao responsável pela integração/testes; não corrigidas fora do escopo de dados. Esse resultado intermediário não é aprovação final do produto
