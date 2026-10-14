# RA2 V2.12 — Interface simples e preços consultados

## Entrega técnica

- 98 componentes preservados, com as mesmas identidades e especificações
- 78 referências comerciais datadas: 49 de modelo/capacidade, 25 de variantes da família e 4 exemplos para produtos genéricos
- 20 componentes sem preço verificável: `price: null`, sem reaproveitar o valor demonstrativo como preço real
- Zero ofertas de API ao vivo; data da pesquisa não garante estoque ou preço atual
- Fotografias preservadas: 98/98, sendo 35 exatas, 59 de família e 4 ilustrativas

Cada referência registra página direta, loja, vendedor, modelo, data e condição de pagamento. A origem permanece vinculada à identidade do catálogo; editar preço ou identidade invalida a associação. Variantes não alteram dimensões, conectores, capacidade ou regras de compatibilidade do produto cadastrado.

Os valores vêm de observações das páginas comerciais, não de preços mínimos garantidos. Preços de cartão não entram na soma PIX. Itens sem fonte confiável ou com indisponibilidade explícita não receberam um valor inventado. Uma proposta de sucessor não substitui automaticamente o modelo original.

## Interface

- Preço: fonte/data e link direto, sem blocos longos nem explicações escondidas
- Família e exemplo de preço identificam brevemente o produto da fonte
- Pesquisa em lojas não repete o preço do catálogo como se cada loja tivesse uma oferta
- Créditos das fotografias centralizados em `/image-credits`, com autor, fonte, licença conhecida e alterações; registro completo preservado
- Foto de família/ilustrativa identificada em uma legenda curta
- Cards usam áreas compartilhadas, quatro especificações principais e detalhes completos acessíveis; índices ficam nos detalhes/comparação
- Botões não quebram palavras; rótulos essenciais são curtos e podem ocupar mais de uma linha
- Explicações repetidas no resumo/recomendações foram removidas; níveis de desempenho estão em português

## Preço ausente não impede analisar o computador

Compatibilidade, estimativas de desempenho, salvamento, versões, exportação e compartilhamento preservam peças sem preço. O total completo permanece `null`, com subtotal conhecido separado e orçamento pendente. Nenhuma peça ausente é tratada como grátis.

Critérios técnicos continuam disponíveis, mas nota geral/custo-benefício dependentes do custo ficam indisponíveis. Comparações por custo excluem totais desconhecidos; comparações de desempenho continuam possíveis. Recomendações usam alternativas precificadas. Upgrades precificados podem ser analisados mesmo quando o custo total do computador atual está pendente.

## Rastreabilidade e limites

Esta continuação atende aos critérios técnicos de consistência visual, navegação, linguagem, identificação, preço e estabilidade do escopo R01–R22. Não cria planos comerciais nem afirma retenção ou compreensão humana validadas. O material público registra critérios e evidências técnicas, sem publicar pesquisa privada.

A inspeção anterior do commit `9cdb78d` confirmou o carregamento das 98 fotos e identificou ajustes de alinhamento, botões e linguagem tratados nesta versão. Essa inspeção não valida automaticamente o código posterior. O reteste visual deve registrar o SHA desta publicação e suas larguras reais.

## Verificações da árvore integrada

- `npm test`: 530 testes aprovados, zero falhas; inclui os unitários frontend, sem somá-los novamente
- 14 scripts de SSR/handlers aprovados
- ESLint backend/frontend e build de produção aprovados
- Três jornadas técnicas completas com frontend adapters e API HTTP real aprovadas
- HTTP de produção: cinco rotas SPA, bundles, registro de atribuição e as 98 fotografias servidos
- Auditoria de imagens: 98/98; nenhum arquivo órfão ou duplicação suspeita
- 188 casos E2E coletados, sem execução de navegador nesta máquina
- Fontes de preço congeladas em fixture independente, total em centavos e borda de um centavo; ausência não vira zero

O build mantém o aviso de bundle maior que 500 kB. Não há alegação de benchmark físico ou precisão comercial ao vivo.

 Testes de serviços, SSR e HTTP não substituem o reteste visual nem a validação com pessoas. Sem merge ou deploy nesta etapa.
