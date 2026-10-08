# PCPowerLab — v2.2: fotografias e auditoria

Data: 08/10/2026 UTC. Branch: `codex/pcpowerlab-ra2-ciclo2`. Base: `f29ac4b05d2633e924c2b75571dd5077b8332667`. Somente v2.2, sem merge, deploy ou implementação da v2.3.

## Resultado: parcial, requisito integral não atendido

O inventário foi executado antes da pesquisa sobre todos os **98 ativos**, incluindo modelo, fabricante, categoria, SKU e especificações/variantes. O resultado atual é **9/98 fotografias exatas verificadas (9,18%)**: 3 CPUs, 2 SSDs, 2 air coolers e 2 fans. **89 produtos continuam com fotografia indisponível**. Nenhuma foto foi trocada por modelo parecido, capacidade diferente, imagem genérica ou geração por IA.

A [auditoria dinâmica](RA2-COBERTURA-IMAGENS.md) contém todos os IDs, contagens reais, caminho, dimensões, integridade e bloqueio individual. O [JSON](RA2-COBERTURA-IMAGENS.json) conserva o inventário completo e hashes. A [pesquisa de direitos](RA2-V2.2-PHOTO-SOURCES.md) e seu [registro por ID](RA2-V2.2-PHOTO-SOURCES.json) cobrem todos os fabricantes e produtos, incluindo candidatos rejeitados.

**Esta etapa não está concluída nos critérios de aceite de 100%.** A implementação viável é entregue e as pendências são registradas para permitir a sequência autorizada. São necessários ativos exatos/licenciados para cada um dos 89 IDs bloqueados. Produtos com identidade incompleta também precisam de SKU/revisão/cor/fabricante da placa; não basta autorizar uma fotografia genérica. Cinco candidatos licenciados ficaram sem arquivo por HTTP403, sem contorno de acesso. A foto decapada inicialmente localizada para o Ryzen 7600 foi rejeitada; uma fonte independente intacta foi obtida e validada.

## Dados, direitos e arquivos

- `src/data/component-verified-images.json`: fonte única da mídia aprovada, com caminho local, origem, produto oficial, fundamento de direitos, licença, autoria, data, transformações, SHA-256 dos bytes revisados e assinatura da identidade do produto
- `src/data/component-photo-research.json`: projeção compacta dos bloqueios da pesquisa. O catálogo continua a ser a fonte de nomes, marcas e specs; nenhum componente novo é excluído por não existir no registro fotográfico
- `component-images.js` atribui um estado a cada produto. Novos IDs recebem bloqueio explícito. Alterações de nome, marca, categoria, SKU ou specs invalidam a fotografia anterior; preço/ativação não mudam identidade
- Cadastro administrativo não aceita autoatestação de licença/identidade por payload. A atualização do manifesto requer revisão de origem, direitos e pixels
- Somente arquivos locais em `frontend/public/images/components/`; não há hotlinks, URL temporária nem fetch a fabricantes no navegador do usuário
- WebP, maior dimensão até 960px, proporção preservada, sem recorte ou remoção de fundo. Nenhum original possuía transparência. Intel 12400F foi rotacionado 90° para leitura. Duas fotos JPEG preexistentes foram substituídas por WebP após revalidar fontes, etiquetas e licenças
- Créditos, links e mudanças aparecem junto à foto. [ATTRIBUTION.md](../frontend/public/images/components/ATTRIBUTION.md) documenta licenças separadas do MIT do código: CC BY-SA 4.0, CC0 1.0, Free Art License 1.3 e permissão pública Noctua, revogável. A versão convertida sob FAL/CC BY-SA mantém a licença; cada arquivo fica acessível separadamente

## Integração de interface

Um catálogo compartilhado busca `/components` uma vez por carregamento, com guarda de respostas antigas, desmontagem e retry. `ComponentImage` resolve o ID exato no catálogo atual; snapshots antigos não podem sobrepor imagens ou liberar um item bloqueado. `ComponentIdentity` e `BuildComponentsPreview` reutilizam o mesmo sistema.

| Contexto | Integração |
| --- | --- |
| Catálogo, detalhes e seleção do assistente | ComponentCard → ComponentImage |
| Comparação de peças | Linha de fotografia na tabela compartilhada |
| Seleção de cooler/fans | Prévia exata do produto selecionado, com quantidade conservada |
| Resumo, sidebar e revisão | BuildSummaryCard → ComponentIdentity |
| Troca individual e correções | Produto atual e proposto pelo mesmo componente visual |
| Recomendações e builds prontas | Principais e opcionais, incluindo IDs-only |
| Builds salvas e compartilhadas | Resolução de snapshots por ID, fallback para registros indisponíveis |
| Comparação de builds | Detalhes expansíveis das peças de cada seleção/resultado |
| Upgrades e roadmap | Identidade atual/proposta e mesma mídia |
| Feedback, ranking, compra e parâmetros administrativos | Mídia reutilizada nos contextos de peças individuais |

Fotos usam `object-fit: contain`, frame estável, alt, lazy loading, decode async, carregamento e erro explícitos, crédito/link e indicação de alterações. Ícones são declarados ilustrativos e nunca contam como foto. Não há ranking novo, alteração de pontuação ou bônus de refrigeração.

## Auditoria reproduzível

Pré-requisitos: Node conforme o projeto; Python 3 com Pillow (execução atual: 12.3.0). Não se substitui a decodificação por teste de cabeçalho quando Pillow falta.

```sh
npm run audit:images
npm run audit:images:report
# Para mudanças administrativas em memória: exportar a resposta de GET /api/v1/components
node scripts/audit-component-images.js --catalog catalog-runtime.json --report
```

O auditor filtra ativos dinamicamente e detecta ID novo sem registro, ausência/erro de metadados, caminho inseguro, arquivo ausente, formato incorreto, corrupção, dimensões/tamanho, divergência do hash revisado, órfãos e duplicatas suspeitas. Retorno 0 = integral; 1 = parcial/bloqueado; 2 = falha operacional. **Nesta entrega retorna 1 deliberadamente**, pois 89 produtos não possuem foto. O padrão lê o catálogo versionado; não lê mudanças em memória de outro processo, por isso existe `--catalog`.

Validação estrutural não prova direitos ou identidade visual: tais declarações dependem da revisão documentada. Hash divergente invalida a declaração de bytes revisados. Nenhum teste fixa a contagem total em 98 para aprovar entradas futuras.

## Evidência visual e limites

Os nove arquivos originais e os nove WebP finais foram abertos como pixels e inspecionados: modelo/etiqueta ou galeria oficial exata, proporção, integridade, ausência de cortes adicionados e qualidade de leitura. Nas duas ventoinhas foram escolhidas vistas traseiras com etiqueta exata, em vez de heros genéricos da família. Ver [evidências por arquivo](evidence/ra2-v2.2/README.md).

A aplicação foi iniciada em `NODE_ENV=production`, porta 3000. O navegador cloud suportado recusou a navegação local por política de URL; o Chromium executor já havia sido bloqueado por socket no baseline e essa rota negada não foi repetida. **Nenhuma página foi visualmente aprovada, nenhum screenshot de aplicação foi produzido e nenhum E2E foi executado nesta etapa.** Não houve túnel, navegador no Mac ou outro contorno. Inspeção dos arquivos não equivale a validar CPU/GPU/placa-mãe/RAM/armazenamento/fonte/gabinete/air/AIO/fans nas telas, desktop/mobile, teclado ou leitor de tela. Essas verificações continuam pendentes em ambiente autorizado funcional.

## Testes

Resultados finais e comandos estão em [evidence/ra2-v2.2/README.md](evidence/ra2-v2.2/README.md). Backend, auditoria e helpers são provas distintas de navegação/visual. O warning de bundle >500kB é preexistente.

## Feito / não feito / pendências

Feito: inventário de todos os ativos, pesquisa de direitos por produto/fabricante, 9 fotos exatas locais e otimizadas, procedência/atribuição, integração reutilizável, auditoria dinâmica, regressões e documentação honesta.

Não feito: cobertura integral; 89 fotos; validação visual das telas ou E2E; aprovação humana de uso; merge/deploy; etapas posteriores.

Pendências: fornecer os arquivos/autorização e identidades faltantes listados individualmente no relatório; revisar cada nova foto e atualizar manifestos/hashes; rodar auditoria até 100%; executar os 123 casos browser e inspeção por categoria em ambiente autorizado; revalidar periodicamente concessão Noctua antes de novas redistribuições.
