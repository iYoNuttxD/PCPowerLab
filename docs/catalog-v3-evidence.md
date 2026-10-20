# V3: expansão verificada e diferenciação de placas-mãe

Verificação: 20/10/2026. Fontes técnicas de fabricantes; preços de páginas públicas renderizadas, não APIs nem cotações ao vivo. Sem publicação remota nesta etapa.

## Inventário e lacunas

Antes: 81 ativos (10 CPUs, 8 GPUs, 6 placas-mãe, somente 2 gabinetes, 22 RAMs, 21 armazenamentos, 5 coolers, 4 fans e 3 fontes), mais 79 históricos inativos. A expansão anterior estava concentrada em memória/armazenamento. Não foram reativados produtos antigos só para aumentar a contagem.

Depois: 87 ativos, com 12 CPUs, 10 GPUs e 4 gabinetes. Os demais totais e os 79 inativos não mudam. Todas as 81 identidades anteriores, fotos e observações de preço foram preservadas. As seis novas opções têm foto de produto/família identificada e referência de preço com loja, SKU, pagamento, data e evidência de compra habilitada.

| Lacuna concreta | Adição | Evidência técnica principal |
|---|---|---|
| AM5 com cache 3D, distinto dos AM5 comuns | Ryzen 7 7800X3D, 100-100000910WOF | [AMD](https://www.amd.com/en/products/processors/desktops/ryzen/7000-series/amd-ryzen-7-7800x3d.html): 8C/16T, 96 MB L3, 120 W TDP, DDR5, sem cooler |
| AM5 com 12 núcleos para multitarefa | Ryzen 9 9900X, 100-100000662WOF | [AMD](https://www.amd.com/en/products/processors/desktops/ryzen/9000-series/amd-ryzen-9-9900x.html): 12C/24T, 4,4/5,6 GHz, 120 W TDP, DDR5, sem cooler |
| GPU NVIDIA compacta 8 GB | MSI RTX 5060 VENTUS 2X OC, G5060-8V2C | [MSI](https://www.msi.com/Graphics-Card/GeForce-RTX-5060-8G-VENTUS-2X-OC/Specification): 197 mm, 145 W declarados, 1×8 pinos, fonte recomendada 550 W |
| NVIDIA 16 GB sem mudar uma variante de 8 GB existente | MSI RTX 5060 Ti VENTUS 2X OC PLUS, G506T-16V2CP | [MSI](https://us.msi.com/Graphics-Card/GeForce-RTX-5060-Ti-16G-VENTUS-2X-OC-PLUS/Specification): 16 GB GDDR7, 227 mm, 180 W declarados, 1×8 pinos, fonte recomendada 600 W |
| Gabinete preto mATX/ITX econômico | DeepCool CC310, R-CC310-BKNNM0-G | [DeepCool](https://deepcool.com/products/Cases/CC310-Mid-Tower-Micro-ATX-Case/2026/23284.shtml): GPU 280 mm, torre 160 mm, fonte ATX PS2 até 160 mm, um fan de 120 mm, sem radiador |
| ATX preto amplo com fans e USB-C | COUGAR MX230 RGB, 382PC80.0001 | [COUGAR](https://cougargaming.com/products/cases/mx230-rgb/): E-ATX/ATX/mATX/ITX, GPU 400 mm, torre 170 mm, quatro fans ARGB, radiador superior 120/240/360 mm, traseiro 120 mm |

Não há inferência de FPS a partir de cache, VRAM, clocks ou quantidade de núcleos. Os quatro novos CPUs/GPUs não têm modelo de desempenho calibrado no projeto: score geral, FPS, gargalos e avaliação de software ficam indisponíveis quando dependem desses modelos. Também não entram nas recomendações automáticas ordenadas por desempenho. Continuam selecionáveis manualmente, com preço, ficha técnica, links e verificações de encaixe/energia onde há evidência. As recomendações anteriores continuam disponíveis. Isto é expansão de escolhas e evidência técnica, não uma expansão validada da cobertura de simulação.

## Preços observados, não disponibilidade atual garantida

Todos em BRL, à vista no PIX. Frete, CEP, prazo e total final do checkout não verificados. A API continua informando disponibilidade atual desconhecida, mantendo apenas `observedAvailability: available` como fato histórico. Horários com `:00` abaixo têm precisão de minuto, não de segundo.

| Produto | Loja/vendedor | PIX | Observado UTC | Página exata |
|---|---|---:|---|---|
| 7800X3D | KaBuM / KaBuM! | 1.999,99 | 2026-10-20 21:58 | [Produto 426262](https://www.kabum.com.br/produto/426262/processador-amd-ryzen-7-7800x3d-4-2ghz-5-0ghz-max-turbo-cache-104mb-8-nucleos-16-threads-am5-com-video-integrado-100-100000910wof) |
| 9900X | KaBuM / KaBuM! | 2.199,99 | 2026-10-20 22:04 | [Produto 609952](https://www.kabum.com.br/produto/609952/processador-amd-ryzen-9-9900x-4-4-ghz-5-6-ghz-max-turbo-cache-76mb-12-nucleos-24-threads-am5-com-video-integrado-100-100000662wof) |
| MSI 5060 8 GB | KaBuM / KaBuM! | 2.999,99 | 2026-10-20 22:07 | [Produto 877565](https://www.kabum.com.br/produto/877565/placa-de-video-msi-rtx-5060-8g-ventus-2x-oc-geforce-nvidia-8gb-gddr7-128-bits-2535-mhz-dlss-4-ray-tracing-g5060-8v2c) |
| MSI 5060 Ti 16 GB | KaBuM / KaBuM! | 4.999,99 | 2026-10-20 21:59:48 | [Produto 777167](https://www.kabum.com.br/produto/777167/placa-de-video-msi-rtx-5060-ti-16g-ventus-2x-oc-plus-nvidia-geforce-16gb-gddr7-2617-mhz-fp4-and-dlss-4-ray-tracing-g506t-16v2cp) |
| CC310 preto | Pichau / Pichau | 219,99 | 2026-10-20 22:04 | [R-CC310-BKNNM0-G](https://www.pichau.com.br/gabinete-office-deepcool-cc310-mid-tower-preto-r-cc310-bknnm0-g) |
| MX230 RGB preto | Pichau / Pichau | 539,99 | 2026-10-20 22:06:58 | [382PC80.0001](https://www.pichau.com.br/gabinete-gamer-cougar-mx230-argb-mid-tower-lateral-de-vidro-com-4-fans-preto-382pc80-0001) |

Os snapshots de busca não bastaram: a 5060 Ti apareceu a R$4.699,99 na busca, mas a página renderizada mostrava R$4.999,99. A 5060 marketplace 882789 foi descartada em favor do SKU explícito vendido pela KaBuM. Ryzen 7900 BOX, Q300L original, Corsair 4000D preto, RX6600 ASRock e AIR903MAX foram descartados porque as páginas renderizadas estavam esgotadas ou redirecionavam. Q300L V2 S01 não herdou ficha S00 sem prova de identidade. Não foram inventadas ofertas para esses candidatos.

## Placas-mãe: diferenças verificadas, não nota de chipset/VRM

Os seis registros recebem `verifiedFeatures` vinculado ao hash da identidade completa, com fontes, data e notas. Alterar modelo/SKU/specs invalida os metadados; não muda os hashes usados pelas fotos ou pelos preços. Os limites de memória, slots e M.2 coincidem com os limites de compatibilidade existentes. Não se atribuiu qualidade de VRM ou desempenho por chipset.

| Modelo | DIMM / capacidade | M.2 / SATA | Rede | USB-C frontal | Flashback |
|---|---|---|---|---|---|
| ASUS TUF B550M-PLUS | 4 / 128 GB | 2 / 4 | 2,5 GbE; sem Wi-Fi | Não | Sim |
| GIGABYTE B650M D3HP | 4 / 256 GB | 2 / 4 | 2,5 GbE; sem Wi-Fi | 5 Gbps | Sim, Q-Flash Plus |
| GIGABYTE B650 GAMING X AX V2 | 4 / 256 GB | 3 / 4 | 2,5 GbE; Wi-Fi 6E | 20 Gbps | Sim, Q-Flash Plus |
| GIGABYTE B760M DS3H WIFI6E DDR4 GEN5 | 4 / 128 GB | 2 / 4 | 2,5 GbE; Wi-Fi 6E | Não | Sim, Q-Flash Plus |
| MSI PRO H610M-S DDR4 | 2 / 64 GB | 1 / 2 | 1 GbE; sem Wi-Fi | Não | Não confirmado |
| ASUS TUF Z790-PLUS WIFI DDR5 | 4 / 128 GB conservadores | 4 / 4 | 2,5 GbE; Wi-Fi 6E | 10 Gbps | Não confirmado |

Fontes por modelo:
- [Manual ASUS B550M-PLUS](https://dlcdnets.asus.com/pub/ASUS/mb/SocketAM4/TUF_GAMING_B550M-PLUS/E17265_TUF_GAMING_B550M-PLUS_UM_v2_WEB.pdf).
- [GIGABYTE B650M D3HP rev.1.x](https://www.gigabyte.com/Motherboard/B650M-D3HP-rev-1x/sp).
- [GIGABYTE B650 GAMING X AX V2 rev.1.0/1.1/1.2](https://www.gigabyte.com/us/Motherboard/B650-GAMING-X-AX-V2-rev-10-11-12/sp). Bluetooth 5.2 ou 5.3 conforme revisão, não uma versão universal.
- [GIGABYTE B760M DS3H WIFI6E DDR4 GEN5](https://www.gigabyte.com/fr/Motherboard/B760M-DS3H-WIFI6E-DDR4-GEN5/sp). USB-C traseiro não é header frontal.
- [Manual MSI PRO H610M-S/WIFI DDR4](https://download-2.msi.com/archive/mnu_exe/mb/PROH610M-SWIFIDDR4_PROH610M-SDDR4_EN.pdf). Prioridade sobre tabela inconsistente de H610M-B aparecendo na página do produto; M-Flash não prova Flashback sem CPU.
- [ASUS TUF Z790-PLUS WIFI](https://www.asus.com/motherboards-components/motherboards/tuf-gaming/tuf-gaming-z790-plus-wifi/techspec/). Página contém tabelas conflitantes de 128/192 GB; limite conservador preservado e divergência declarada. Bluetooth depende do módulo.

## Limitações técnicas preservadas

- BIOS instalada e mínimo por nova CPU não confirmados. AM5 igual não prova suporte de inicialização. Conferir lista de CPUs e revisão da placa; em especial Ryzen 9000 em placas anteriores. Nenhuma versão foi fabricada.
- TDP de CPU e consumo declarado da GPU não são medições nem garantias do consumo total. Quantidade de fans não prova temperatura ou ruído.
- MSI 5060 Ti: página atual informa largura 127 mm; [datasheet anterior](https://storage-asset.msi.com/datasheet/vga/global/GeForce-RTX-5060-Ti-16G-VENTUS-2X-OC-PLUS.pdf) informa 126 mm. Usado 127 mm conservadoramente.
- MX230: fabricante informa comprimento máximo de fonte 200 mm, mas formato não confirmado nesta verificação. O formato permanece nulo e gera verificação pendente, não compatibilidade. PWM dos fans somente a partir da série BF05; série da oferta não confirmada. Suporte de fan 140 mm não é suporte de radiador 280 mm.
- Espessuras máximas e interações com RAM/VRM/radiadores não confirmadas permanecem nulas. CC310 declara ausência de radiadores, representada por lista vazia, diferente de informação desconhecida.

## Fotografias e direitos

As seis imagens foram inspecionadas visualmente e mantêm os bytes originais. Metadados em `component-verified-images.json` registram URL original, página do modelo, autor/titular, dimensão, tamanho, SHA-256 e escopo de identidade. Cinco vieram de páginas oficiais AMD/MSI/DeepCool; MX230 da página exata Pichau. Nenhuma foi gerada, retocada ou recortada.

A própria página do Ryzen 9900X usa embalagem genérica Ryzen 9 série 9000 em arquivo chamado `9950x`; ela está explicitamente marcada `model-family`, não prova etiqueta/SKU. Os demais arquivos vieram das páginas dos modelos exatos. Fotografia pública não implica licença aberta: a permissão específica de reprodução não foi estabelecida, os direitos permanecem com os titulares, e o uso é de referência no projeto acadêmico não comercial. Auditoria técnica de imagem não concede direitos de publicação.

## Regressões

`tests/v3-catalog-evidence.test.js` cobre contagens, preços/fotos vinculados, dados técnicos, incertezas, placas-mãe diferenciadas e invalidação após edição, seleção com novos CPU/GPU sem perder preço/links, ausência de performance inventada, BIOS pendente, exclusão do ranking automático e rejeição de radiador no CC310. O teste de preços passou a usar a data exata por produto da fixture independente, sem assumir que todo catálogo foi observado em 08/10.
