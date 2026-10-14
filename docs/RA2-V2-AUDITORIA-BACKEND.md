# Auditoria de baseline: catálogo/backend PCPowerLab V2

Commit auditado: `d433bf930d7373eec073921427e146bc8c173f26` · branch observada: `codex/pcpowerlab-ra2-ciclo2` · 2026-10-08 UTC.

## Resultado

- 69 componentes ativos: 12 CPUs, 9 placas-mãe, 11 GPUs, 11 RAMs, 11 armazenamentos, 8 fontes e 7 gabinetes. 69 registros de desempenho, 20 jogos, 12 softwares, 9 builds prontas e 345 links de busca.
- 2 imagens referenciadas e fisicamente presentes; 67 componentes sem imagem. Não há caminho de imagem quebrado entre as referências atuais. São JPEGs locais de 960×370 e 960×343; metadados de licença/atribuição constam dos registros e de frontend/public/images/components/ATTRIBUTION.md.
- 6 componentes têm partNumber e URL técnica cadastrados; URLs/especificações não foram verificadas externamente nesta auditoria. O campo fabricante abaixo reproduz brand; não certifica fabricante de placa/SKU.
- Evidência histórica de 2026-10-08, commit d433bf9 (o gerador não reexecuta testes): 92 testes focados executados: 92 passaram, zero falhas/skips, 1.55 s. Log: docs/evidence/ra2-v2-baseline/backend-focused-tests.log.
- IDs únicos, 100% de cobertura de performanceParameters, sem campos obrigatórios de runtime ausentes e sem divergência nos campos duplicados efetivamente comparáveis.
- 68/69 componentes participam de ao menos uma build completa aceita pelo serviço atual. Exceção: psu-generic-400w. A fonte de 400 W não alcança sequer o mínimo CPU+350 do catálogo (menor TDP cadastrado: 58 W, mínimo de 408 W).

## Limites verificados que a V2 precisa explicitar

1. **Regras editáveis não executam no motor.** Há 5 registros CRUD, mas 6 verificações fixas no serviço. Em um processo isolado, desativar todas as regras manteve o alerta de socket. A regra de armazenamento só existe em código. Fonte: src/services/compatibility.service.js; src/services/compatibility-rule.service.js.
2. **Contrato administrativo incompleto.** Uma placa-mãe sem storageInterfaces é aceita no cadastro e causa TypeError ao verificar armazenamento. Reproduzido só em memória, sem alterar mocks. Fonte: src/services/admin-component.service.js:requiredSpecFieldsByCategory versus validateStorageAndMotherboard.
3. **Cobertura de compatibilidade limitada.** Socket; tipo DDR; interface de armazenamento; potência da fonte por max(GPU recomendada, CPU TDP+350); formato da placa-mãe; comprimento da GPU. Não há validação de BIOS/geração, DIMM/slots/QVL, cooler, radiador, conectores de energia, largura/altura da GPU, portas/pistas disponíveis ou qualidade elétrica. Sete slots obrigatórios, exatamente uma peça por categoria; nenhuma categoria de cooler e GPU sempre exigida.
4. **Simulação não é benchmark.** Scores internos 0–100 alimentam gargalo por diferença (médio >15; alto >30), FPS ponderado (GPU 50%, CPU 30%, RAM 15%, armazenamento 5%) e fatores fixos de resolução/qualidade. Consumo de gargalo = CPU TDP+GPU TDP+100, fórmula diferente da compatibilidade. Simulação parcial de quatro slots não aplica penalidade de gargalo. Nenhuma calibração/medição real foi produzida.
5. **Recomendação é heurística.** Só candidatos com preço positivo e score ≥40 entram. Pool por slot combina top 5, 3 mais baratos e top desempenho (4 ou 2), removendo duplicatas. Busca aplica as seis regras fixas e limites de orçamento, retorna uma build ou até três por faixa; não garante ótimo global. Score ausente pode virar fallback 50 no custo-benefício.
6. **Dados e vínculos vivem em memória.** Catálogo, parâmetros e regras são registros separados; criar componente não cria performance. Os 345 links são buscas em cinco lojas, todos unknown, com preço do mock e rótulo lastUpdated=2026-05-22. Geração acontece na importação, sem sincronização automática com CRUD posterior. Não representam cotação/estoque vivo. Há sessão administrativa em memória; README está desatualizado ao afirmar ausência de autenticação.
7. **Documentação antiga não serve de contagem.** README ainda informa 63 componentes, 63 parâmetros e 315 links; os imports atuais resultam em 69/69/345. Inventário JSON usa os dados reais do commit.

## Dependências e evidência

- Fonte de catálogo: src/data/components.mock.js → component.repository.js → component.service.js/admin-component.service.js. Desempenho: performanceParameters.js → performance-parameter.repository.js → performanceParametersService.js.
- Compatibilidade alimenta alertas, correções, resumos, scores, revalidação e recomendações. Gargalos/simulações dependem também de performanceParameters. Identidade de peças é vinculada por id/componentId.
- Backend direto: cors 2.8.6 (declara ^2.8.5); dotenv 16.6.1 (declara ^16.4.7); express 4.22.1 (declara ^4.21.2); helmet 8.1.0 (declara ^8.0.0); morgan 1.10.1 (declara ^1.10.0). ESLint 9.39.4. Sem banco, API de preços ou API de benchmarks.
- Inventário completo: docs/RA2-V2-INVENTARIO.json. Inclui especificações, preço de referência, imagem com caminho/hash/existência, checks por categoria, regras declarativas relacionadas, testemunha de build, performance completa, links e hashes das fontes. Gerador desta auditoria: docs/evidence/ra2-v2-baseline/generate-backend-inventory.mjs.
- Limite de evidência: leitura e execução local de serviços/testes. Nenhuma conclusão sobre experiência de usuários, desempenho físico, autenticidade visual das fotos ou preço atual.

## Inventário completo resumido

*“Build válida” significa somente aprovação das seis verificações implementadas no baseline; a testemunha exata está no JSON. Todos os registros declarativos estão ativos, mas não governam o motor. Preços em BRL são referências do mock.*

| ID | Nome completo cadastrado | Fabricante/brand | Categoria | Especificações cadastradas | Preço ref. BRL | Imagem física/caminho | Estado de regras/compatibilidade |
|---|---|---|---|---|---:|---|---|
| cpu-ryzen-5-5500 | AMD Ryzen 5 5500 | AMD | cpu | {"socket":"AM4","cores":6,"threads":12,"baseClockGhz":3.6,"boostClockGhz":4.2,"tdpWatts":65} | 589.90 | Sem imagem | Campos completos; há build válida* |
| cpu-ryzen-5-5600 | AMD Ryzen 5 5600 | AMD | cpu | {"socket":"AM4","cores":6,"threads":12,"baseClockGhz":3.5,"boostClockGhz":4.4,"tdpWatts":65} | 799.90 | Sem imagem | Campos completos; há build válida* |
| cpu-ryzen-7-5700x | AMD Ryzen 7 5700X | AMD | cpu | {"socket":"AM4","cores":8,"threads":16,"baseClockGhz":3.4,"boostClockGhz":4.6,"tdpWatts":65} | 1199.90 | Sem imagem | Campos completos; há build válida* |
| cpu-ryzen-7-5800x3d | AMD Ryzen 7 5800X3D | AMD | cpu | {"socket":"AM4","cores":8,"threads":16,"baseClockGhz":3.4,"boostClockGhz":4.5,"tdpWatts":105} | 1899.90 | Sem imagem | Campos completos; há build válida* |
| cpu-ryzen-5-7600 | AMD Ryzen 5 7600 | AMD | cpu | {"socket":"AM5","cores":6,"threads":12,"baseClockGhz":3.8,"boostClockGhz":5.1,"tdpWatts":65} | 1399.90 | Sem imagem | Campos completos; há build válida* |
| cpu-ryzen-7-7700 | AMD Ryzen 7 7700 | AMD | cpu | {"socket":"AM5","cores":8,"threads":16,"baseClockGhz":3.8,"boostClockGhz":5.3,"tdpWatts":65} | 1999.90 | Sem imagem | Campos completos; há build válida* |
| cpu-intel-i3-12100f | Intel Core i3-12100F | Intel | cpu | {"socket":"LGA1700","cores":4,"threads":8,"baseClockGhz":3.3,"boostClockGhz":4.3,"tdpWatts":58} | 549.90 | Sem imagem | Campos completos; há build válida* |
| cpu-intel-i5-12400f | Intel Core i5-12400F | Intel | cpu | {"socket":"LGA1700","cores":6,"threads":12,"baseClockGhz":2.5,"boostClockGhz":4.4,"tdpWatts":65} | 849.90 | Sem imagem | Campos completos; há build válida* |
| cpu-intel-i5-13400f | Intel Core i5-13400F | Intel | cpu | {"socket":"LGA1700","cores":10,"threads":16,"baseClockGhz":2.5,"boostClockGhz":4.6,"tdpWatts":65} | 1199.90 | Sem imagem | Campos completos; há build válida* |
| cpu-intel-i5-13600k | Intel Core i5-13600K | Intel | cpu | {"socket":"LGA1700","cores":14,"threads":20,"baseClockGhz":3.5,"boostClockGhz":5.1,"tdpWatts":125} | 1899.90 | Sem imagem | Campos completos; há build válida* |
| cpu-intel-i7-13700k | Intel Core i7-13700K | Intel | cpu | {"socket":"LGA1700","cores":16,"threads":24,"baseClockGhz":3.4,"boostClockGhz":5.4,"tdpWatts":125} | 2699.90 | Sem imagem | Campos completos; há build válida* |
| cpu-intel-i5-14400f | Intel Core i5-14400F | Intel | cpu | {"socket":"LGA1700","cores":10,"threads":16,"baseClockGhz":2.5,"boostClockGhz":4.7,"tdpWatts":65} | 1299.90 | Sem imagem | Campos completos; há build válida* |
| mb-b550m-aorus-elite | Gigabyte B550M Aorus Elite | Gigabyte | motherboard | {"socket":"AM4","memoryType":"DDR4","formFactor":"mATX","chipset":"B550","storageInterfaces":["M.2 NVMe","SATA"]} | 699.90 | Sem imagem | Campos completos; há build válida* |
| mb-asus-tuf-b550m-plus | ASUS TUF Gaming B550M-Plus | ASUS | motherboard | {"socket":"AM4","memoryType":"DDR4","formFactor":"mATX","chipset":"B550","storageInterfaces":["M.2 NVMe","SATA"]} | 899.90 | Sem imagem | Campos completos; há build válida* |
| mb-msi-b550-tomahawk | MSI B550 Tomahawk | MSI | motherboard | {"socket":"AM4","memoryType":"DDR4","formFactor":"ATX","chipset":"B550","storageInterfaces":["M.2 NVMe","SATA"]} | 1099.90 | Sem imagem | Campos completos; há build válida* |
| mb-asus-prime-b650m-a | ASUS Prime B650M-A | ASUS | motherboard | {"socket":"AM5","memoryType":"DDR5","formFactor":"mATX","chipset":"B650","storageInterfaces":["M.2 NVMe","SATA"]} | 1199.90 | Sem imagem | Campos completos; há build válida* |
| mb-gigabyte-b650-gaming-x-ax | Gigabyte B650 Gaming X AX | Gigabyte | motherboard | {"socket":"AM5","memoryType":"DDR5","formFactor":"ATX","chipset":"B650","storageInterfaces":["M.2 NVMe","SATA"]} | 1499.90 | Sem imagem | Campos completos; há build válida* |
| mb-h610m-ddr4 | ASUS Prime H610M DDR4 | ASUS | motherboard | {"socket":"LGA1700","memoryType":"DDR4","formFactor":"mATX","chipset":"H610","storageInterfaces":["M.2 NVMe","SATA"]} | 589.90 | Sem imagem | Campos completos; há build válida* |
| mb-msi-pro-b660m-a-ddr4 | MSI PRO B660M-A DDR4 | MSI | motherboard | {"socket":"LGA1700","memoryType":"DDR4","formFactor":"mATX","chipset":"B660","storageInterfaces":["M.2 NVMe","SATA"]} | 799.90 | Sem imagem | Campos completos; há build válida* |
| mb-gigabyte-b760m-ds3h-ddr4 | Gigabyte B760M DS3H DDR4 | Gigabyte | motherboard | {"socket":"LGA1700","memoryType":"DDR4","formFactor":"mATX","chipset":"B760","storageInterfaces":["M.2 NVMe","SATA"]} | 949.90 | Sem imagem | Campos completos; há build válida* |
| mb-asus-tuf-z790-plus-ddr5 | ASUS TUF Gaming Z790-Plus DDR5 | ASUS | motherboard | {"socket":"LGA1700","memoryType":"DDR5","formFactor":"ATX","chipset":"Z790","storageInterfaces":["M.2 NVMe","SATA"]} | 2199.90 | Sem imagem | Campos completos; há build válida* |
| gpu-gtx-1650 | NVIDIA GeForce GTX 1650 4GB | NVIDIA | gpu | {"vramGb":4,"tdpWatts":75,"recommendedPsuWatts":350,"lengthMm":170} | 799.90 | Sem imagem | Campos completos; há build válida* |
| gpu-rtx-3050 | NVIDIA GeForce RTX 3050 8GB | NVIDIA | gpu | {"vramGb":8,"tdpWatts":130,"recommendedPsuWatts":450,"lengthMm":230} | 1299.90 | Sem imagem | Campos completos; há build válida* |
| gpu-rtx-3060 | NVIDIA GeForce RTX 3060 12GB | NVIDIA | gpu | {"vramGb":12,"tdpWatts":170,"recommendedPsuWatts":550,"lengthMm":242} | 1599.90 | Sem imagem | Campos completos; há build válida* |
| gpu-rtx-4060 | NVIDIA GeForce RTX 4060 8GB | NVIDIA | gpu | {"vramGb":8,"tdpWatts":115,"recommendedPsuWatts":550,"lengthMm":240} | 1899.90 | Sem imagem | Campos completos; há build válida* |
| gpu-rtx-4060-ti | NVIDIA GeForce RTX 4060 Ti 8GB | NVIDIA | gpu | {"vramGb":8,"tdpWatts":160,"recommendedPsuWatts":550,"lengthMm":245} | 2499.90 | Sem imagem | Campos completos; há build válida* |
| gpu-rtx-4070 | NVIDIA GeForce RTX 4070 12GB | NVIDIA | gpu | {"vramGb":12,"tdpWatts":200,"recommendedPsuWatts":650,"lengthMm":270} | 3899.90 | Sem imagem | Campos completos; há build válida* |
| gpu-rtx-4070-super | NVIDIA GeForce RTX 4070 Super 12GB | NVIDIA | gpu | {"vramGb":12,"tdpWatts":220,"recommendedPsuWatts":700,"lengthMm":300} | 4499.90 | Sem imagem | Campos completos; há build válida* |
| gpu-rx-6600 | AMD Radeon RX 6600 8GB | AMD | gpu | {"vramGb":8,"tdpWatts":132,"recommendedPsuWatts":450,"lengthMm":200} | 1199.90 | Sem imagem | Campos completos; há build válida* |
| gpu-rx-7600 | AMD Radeon RX 7600 8GB | AMD | gpu | {"vramGb":8,"tdpWatts":165,"recommendedPsuWatts":550,"lengthMm":235} | 1699.90 | Sem imagem | Campos completos; há build válida* |
| gpu-rx-7700-xt | AMD Radeon RX 7700 XT 12GB | AMD | gpu | {"vramGb":12,"tdpWatts":245,"recommendedPsuWatts":700,"lengthMm":280} | 3299.90 | Sem imagem | Campos completos; há build válida* |
| gpu-rx-7800-xt | AMD Radeon RX 7800 XT 16GB | AMD | gpu | {"vramGb":16,"tdpWatts":263,"recommendedPsuWatts":750,"lengthMm":305} | 3999.90 | Sem imagem | Campos completos; há build válida* |
| ram-kingston-fury-8gb-ddr4 | Kingston Fury Beast 8GB DDR4 | Kingston | ram | {"memoryType":"DDR4","capacityGb":8,"speedMhz":3200} | 149.90 | Sem imagem | Campos completos; há build válida* |
| ram-kingston-fury-16gb-ddr4 | Kingston Fury Beast 16GB DDR4 | Kingston | ram | {"memoryType":"DDR4","capacityGb":16,"speedMhz":3200} | 249.90 | Sem imagem | Campos completos; há build válida* |
| ram-kingston-fury-32gb-ddr4 | Kingston Fury Beast 32GB DDR4 | Kingston | ram | {"memoryType":"DDR4","capacityGb":32,"speedMhz":3200} | 499.90 | Sem imagem | Campos completos; há build válida* |
| ram-corsair-vengeance-16gb-ddr4-3600 | Corsair Vengeance 16GB DDR4 | Corsair | ram | {"memoryType":"DDR4","capacityGb":16,"speedMhz":3600} | 289.90 | Sem imagem | Campos completos; há build válida* |
| ram-corsair-vengeance-16gb-ddr5 | Corsair Vengeance 16GB DDR5 | Corsair | ram | {"memoryType":"DDR5","capacityGb":16,"speedMhz":5200} | 399.90 | Sem imagem | Campos completos; há build válida* |
| ram-corsair-vengeance-32gb-ddr5-5600 | Corsair Vengeance 32GB DDR5 | Corsair | ram | {"memoryType":"DDR5","capacityGb":32,"speedMhz":5600} | 749.90 | Sem imagem | Campos completos; há build válida* |
| ram-kingston-fury-16gb-ddr5-6000 | Kingston Fury Beast 16GB DDR5 | Kingston | ram | {"memoryType":"DDR5","capacityGb":16,"speedMhz":6000} | 449.90 | Sem imagem | Campos completos; há build válida* |
| ram-gskill-trident-z5-32gb-ddr5-6000 | G.Skill Trident Z5 32GB DDR5 | G.Skill | ram | {"memoryType":"DDR5","capacityGb":32,"speedMhz":6000} | 899.90 | Sem imagem | Campos completos; há build válida* |
| ssd-kingston-a400-480gb | Kingston A400 480GB SATA SSD | Kingston | storage | {"interface":"SATA","storageType":"SSD","capacityGb":480,"readSpeedMbS":500,"writeSpeedMbS":450} | 189.90 | Sem imagem | Campos completos; há build válida* |
| ssd-kingston-nv2-500gb | Kingston NV2 500GB NVMe | Kingston | storage | {"interface":"M.2 NVMe","storageType":"SSD","capacityGb":500,"readSpeedMbS":3500,"writeSpeedMbS":2100} | 239.90 | Sem imagem | Campos completos; há build válida* |
| ssd-kingston-nv2-1tb | Kingston NV2 1TB NVMe | Kingston | storage | {"interface":"M.2 NVMe","storageType":"SSD","capacityGb":1000,"readSpeedMbS":3500,"writeSpeedMbS":2100} | 349.90 | Sem imagem | Campos completos; há build válida* |
| ssd-wd-blue-sn570-1tb | WD Blue SN570 1TB NVMe | Western Digital | storage | {"interface":"M.2 NVMe","storageType":"SSD","capacityGb":1000,"readSpeedMbS":3500,"writeSpeedMbS":3000} | 399.90 | Sem imagem | Campos completos; há build válida* |
| ssd-wd-black-sn770-1tb | WD Black SN770 1TB NVMe | Western Digital | storage | {"interface":"M.2 NVMe","storageType":"SSD","capacityGb":1000,"readSpeedMbS":5150,"writeSpeedMbS":4900} | 549.90 | Sem imagem | Campos completos; há build válida* |
| ssd-samsung-970-evo-plus-1tb | Samsung 970 EVO Plus 1TB NVMe | Samsung | storage | {"interface":"M.2 NVMe","storageType":"SSD","capacityGb":1000,"readSpeedMbS":3500,"writeSpeedMbS":3300} | 599.90 | Sem imagem | Campos completos; há build válida* |
| ssd-samsung-980-pro-2tb | Samsung 980 Pro 2TB NVMe | Samsung | storage | {"interface":"M.2 NVMe","storageType":"SSD","capacityGb":2000,"readSpeedMbS":7000,"writeSpeedMbS":5100} | 1199.90 | Sem imagem | Campos completos; há build válida* |
| hdd-seagate-barracuda-2tb | Seagate Barracuda 2TB HDD | Seagate | storage | {"interface":"SATA","storageType":"HDD","capacityGb":2000,"readSpeedMbS":190,"writeSpeedMbS":180} | 299.90 | Sem imagem | Campos completos; há build válida* |
| psu-generic-400w | Fonte Genérica 400W | Generic | psu | {"watts":400,"efficiency":"Não informado"} | 129.90 | Sem imagem | Campos completos; nenhuma build válida* |
| psu-corsair-cv550 | Corsair CV550 550W | Corsair | psu | {"watts":550,"efficiency":"80 Plus Bronze"} | 329.90 | Sem imagem | Campos completos; há build válida* |
| psu-corsair-650w | Corsair CV650 650W | Corsair | psu | {"watts":650,"efficiency":"80 Plus Bronze"} | 399.90 | Sem imagem | Campos completos; há build válida* |
| psu-cooler-master-mwe-650w | Cooler Master MWE 650W Bronze | Cooler Master | psu | {"watts":650,"efficiency":"80 Plus Bronze"} | 449.90 | Sem imagem | Campos completos; há build válida* |
| psu-xpg-pylon-650w | XPG Pylon 650W | XPG | psu | {"watts":650,"efficiency":"80 Plus Bronze"} | 429.90 | Sem imagem | Campos completos; há build válida* |
| psu-corsair-rm750e | Corsair RM750e 750W Gold | Corsair | psu | {"watts":750,"efficiency":"80 Plus Gold"} | 699.90 | Sem imagem | Campos completos; há build válida* |
| psu-xpg-core-reactor-850w | XPG Core Reactor 850W Gold | XPG | psu | {"watts":850,"efficiency":"80 Plus Gold"} | 799.90 | Sem imagem | Campos completos; há build válida* |
| psu-corsair-rm850x | Corsair RM850x 850W Gold | Corsair | psu | {"watts":850,"efficiency":"80 Plus Gold"} | 899.90 | Sem imagem | Campos completos; há build válida* |
| case-mid-tower-airflow | Gabinete Mid Tower Airflow | PCPowerLab | case | {"supportedFormFactors":["ATX","mATX","ITX"],"maxGpuLengthMm":320} | 299.90 | Sem imagem | Campos completos; há build válida* |
| case-cooler-master-q300l | Cooler Master MasterBox Q300L | Cooler Master | case | {"supportedFormFactors":["mATX","ITX"],"maxGpuLengthMm":360} | 349.90 | Sem imagem | Campos completos; há build válida* |
| case-nzxt-h5-flow | NZXT H5 Flow | NZXT | case | {"supportedFormFactors":["ATX","mATX","ITX"],"maxGpuLengthMm":365} | 649.90 | Sem imagem | Campos completos; há build válida* |
| case-corsair-4000d-airflow | Corsair 4000D Airflow | Corsair | case | {"supportedFormFactors":["ATX","mATX","ITX"],"maxGpuLengthMm":360} | 699.90 | Sem imagem | Campos completos; há build válida* |
| case-montech-air-903-base | Montech Air 903 Base | Montech | case | {"supportedFormFactors":["ATX","mATX","ITX"],"maxGpuLengthMm":400} | 399.90 | Sem imagem | Campos completos; há build válida* |
| case-compact-matx | Gabinete Compact mATX | PCPowerLab | case | {"supportedFormFactors":["mATX","ITX"],"maxGpuLengthMm":220} | 219.90 | Sem imagem | Campos completos; há build válida* |
| case-gamer-atx-rgb | Gabinete Gamer ATX RGB | PCPowerLab | case | {"supportedFormFactors":["ATX","mATX","ITX"],"maxGpuLengthMm":330} | 459.90 | Sem imagem | Campos completos; há build válida* |
| ram-kingston-fury-16gb-ddr4-3600 | Kingston Fury Beast 16GB DDR4-3600 | Kingston | ram | {"memoryType":"DDR4","capacityGb":16,"speedMhz":3600} | 299.90 | Sem imagem | Campos completos; há build válida* |
| ram-crucial-32gb-ddr4-3200 | Crucial 32GB DDR4-3200 UDIMM | Crucial | ram | {"memoryType":"DDR4","capacityGb":32,"speedMhz":3200} | 529.90 | Sem imagem | Campos completos; há build válida* |
| ram-kingston-fury-16gb-ddr5-5200 | Kingston Fury Beast 16GB DDR5-5200 | Kingston | ram | {"memoryType":"DDR5","capacityGb":16,"speedMhz":5200} | 419.90 | Sem imagem | Campos completos; há build válida* |
| ssd-kingston-a400-960gb | Kingston A400 960GB SATA SSD | Kingston | storage | {"interface":"SATA","storageType":"SSD","capacityGb":960,"readSpeedMbS":500,"writeSpeedMbS":450} | 329.90 | Sem imagem | Campos completos; há build válida* |
| ssd-samsung-970-evo-plus-250gb | Samsung 970 EVO Plus 250GB NVMe | Samsung | storage | {"interface":"M.2 NVMe","storageType":"SSD","capacityGb":250,"readSpeedMbS":3500,"writeSpeedMbS":2300} | 249.90 | frontend/public/images/components/samsung-970-evo-plus-250gb.jpg | Campos completos; há build válida* |
| ssd-samsung-980-pro-1tb | Samsung 980 PRO 1TB NVMe | Samsung | storage | {"interface":"M.2 NVMe","storageType":"SSD","capacityGb":1000,"readSpeedMbS":7000,"writeSpeedMbS":5000} | 699.90 | frontend/public/images/components/samsung-980-pro-1tb.jpg | Campos completos; há build válida* |
