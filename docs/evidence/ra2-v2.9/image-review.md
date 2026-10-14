# Revalidação independente de mídia e UI — 08/10/2026

Fonte inicial: `5de7d88`. Auditor dinâmico reexecutado: 98 ativos, 9 verificados, 89 fallback, zero inativos/órfãos/grupos de hashes duplicados. Os 98 IDs coincidem com inventário v2.1, pesquisa integral e projeção runtime. Os bloqueios registrados dividem-se em 33 direitos-ou-identidade, 31 direitos, 20 identidade-e-direitos e cinco downloads antes negados; os downloads negados não foram repetidos. Pesquisa negativa completa dos 89 não foi refeita na web nesta auditoria; seus registros foram conferidos quanto a completude e correspondência com catálogo.

Os nove WebP decodificam, correspondem aos hashes revisados, totalizam 738.012 bytes e maior dimensão 960 px. Todos foram abertos como pixels nesta revisão:

- Ryzen 5700X, Ryzen 7600 e Intel 12400F: marcações visíveis correspondentes; Ryzen 7600 intacto
- Samsung 970 EVO Plus 250GB/MZ-V7S250 e 980 PRO 1TB/MZ-V8P1T0: modelos/capacidades nas etiquetas
- Noctua NF-P12 redux-1700 PWM e NF-A14 PWM: etiquetas exatas
- Noctua NH-U12S redux e NH-L9a-AM4: aparência correspondente às fontes oficiais documentadas

Reabertos os nove URLs oficiais de produto registrados no manifesto e estes seis documentos de origem/permissão:

- [5700X, Qurren, CC BY-SA](https://commons.wikimedia.org/wiki/File:AMD_Ryzen_7_5700X_1.jpg)
- [7600, Rainer Knäpper, Free Art License](https://commons.wikimedia.org/wiki/File:AMD_Ryzen_5_7600_top_IMGP6773_smial_wp.jpg)
- [12400F, Fritzchens Fritz, CC0](https://commons.wikimedia.org/wiki/File:Intel@intel7(10nmESF)@AlderLake@ADL-S(6P%2B0E)@i5-12400F@SRL5Z_DSCx01@VIS_(52402436460).jpg)
- [970 EVO Plus 250GB, Jacek Halicki, CC BY-SA](https://commons.wikimedia.org/wiki/File:2023_Nap%C4%99d_Samsung_970_EVO_Plus_250GB_(1).jpg)
- [980 PRO 1TB, D-Kuru, CC BY-SA](https://commons.wikimedia.org/wiki/File:Samsung_980_PRO_PCIe_4.0_NVMe_SSD_1TB-top_PNr%C2%B00915.jpg)
- [Noctua, permissão pública revogável](https://www.noctua.at/en/press)

Atribuição, licença, mudanças e URLs registradas concordam com essas fontes. Trata-se de fundamento documentado de reutilização, não garantia jurídica irrestrita; permissão Noctua pode ser cancelada.

## Caminhos de imagem por tela

Há um único `<img>` na fonte da aplicação: `ComponentImage.jsx`. Ele resolve identidade atual do catálogo, verifica ID exato/caminho local/metadados de direitos e apresenta fallback explícito em falta/erro. `media-callsites.log` permite conferir os consumidores:

| Contexto | Caminho |
| --- | --- |
| Catálogo/detalhes/assistente | ComponentCard → ComponentImage |
| Comparação de peças | ComponentComparison → ComponentImage |
| Cooler/fans | CoolingPanel → ComponentIdentity |
| Resumo/sidebar/revisão | BuildSummaryCard → ComponentIdentity |
| Troca/correções | ComponentReplacement → ComponentIdentity |
| Recomendações/prontas | RecommendationCard/ReadyBuilds → ComponentIdentity/BuildComponentsPreview |
| Salvas/compartilhadas | SavedBuilds/SharedBuild → ComponentIdentity |
| Comparação de builds | CompareBuilds → BuildComponentsPreview |
| Upgrades/roadmap | UpgradeSuggestions → ComponentIdentity |
| Ranking/feedback/compra/admin | Mesmos componentes guardados de identidade/mídia |

## Responsividade e acessibilidade: somente código/SSR

Breakpoints de navegação 1040 px, layout 880 px, telefone 560 px e mídia compacta 600 px; regiões de tabela contidas, min-width/wrapping e modais móveis. Há skip link/main, títulos, rótulos, dialog nativo, handlers de foco/fechamento e reduced-motion. Imagens usam contain/alt/lazy/async e créditos. Gráficos mantêm unidades e equivalentes textuais/tabulares.

Esses achados não provam CSS computado, geometria, toque, foco, hidratação ou leitores de tela. Nenhum screenshot foi produzido. Desktop/tablet/mobile permanecem BLOQUEADOS para aprovação visual.
