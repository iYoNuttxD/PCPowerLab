# Ciclo 3: protocolo observado de validação

**Estado: preparado, não executado. Nenhuma pessoa foi recrutada e nenhum resultado humano foi coletado.**

## Objetivo e regra de decisão

Verificar se a V3 melhora a conclusão autônoma da tarefa de montagem, sem esconder limitações técnicas. Referência descritiva do ciclo 2: 7/10 concluíram sem ajuda. Meta do ciclo 3: pelo menos 90% de conclusão sem ajuda, com zero falha bloqueante que perca escolhas. Com 10 participantes, isso significa ao menos 9/10; apresentar sempre numerador/denominador, não inferir significância estatística a partir dessa amostra pequena.

Recrutar pelo menos 10 participantes, preferencialmente 6 ou mais iniciantes que não tenham usado esta versão. Registrar experiência antes da sessão (nunca montou / montou com ajuda / monta sozinho), sem coletar nome, email ou dados de compra. Usar IDs P01…P10. Convite e sessão dependem de organização/autorização do responsável; este documento não realiza recrutamento.

## Pré-condições e controle de versão

1. Executar os testes automatizados e o roteiro de navegador autorizado. Não iniciar homologação humana sobre compilação com falha conhecida bloqueante.
2. Fixar commit completo, versão do catálogo e data das referências, URL do ambiente de teste, navegador/versão, sistema, viewport e zoom. Não usar produção nem efetuar compras.
3. Separar resultados por celular, notebook e tela grande. Incluir pelo menos duas sessões por faixa; distribuir as demais por uso real. Teste de teclado dedicado não substitui sessões de pessoas que usam tecnologias assistivas.
4. Congelar a versão durante cada rodada. Correção no meio da rodada exige nova identificação de versão e resultados separados.
5. Conferir previamente que os orçamentos dos cenários comportam pelo menos uma montagem do catálogo atual. Não escolher um orçamento inviável para medir sucesso no caminho feliz. Cenário de orçamento impossível é separado e mede clareza do bloqueio.

## Tarefas apresentadas sem ensinar os controles

**T1, início e objetivo:** “Você quer um PC para estudos e trabalho diário. Defina o seu limite de gasto indicado na ficha e escolha o objetivo.” Observar se a pessoa encontra orçamento e tipo de uso antes das peças.

**T2, escolha e compreensão:** “Escolha as peças até formar uma montagem. Use a busca ou um filtro para reduzir uma lista e explique por que escolheu a placa-mãe.” Observar diferenças de memória/slots/conectividade, detalhes progressivos, filtros ativos e preços de referência.

**T3, continuidade:** “Volte a uma etapa anterior, ajuste o orçamento e retome de onde estava. Abra e feche os detalhes de uma peça. Depois recarregue a página.” Conferir que escolhas e orçamento permanecem; análises antigas não podem ser apresentadas como recalculadas. Não exigir persistência de filtros além da capacidade explicitamente documentada.

**T4, troca e decisão:** “Compare uma alternativa para uma única peça sem trocar o resto. Verifique o custo e os efeitos conhecidos; aplique apenas se quiser.” Observar pré-visualização, recalculação da seleção completa, aviso de excesso, confirmação de dados pendentes, cancelar e desfazer. O restante das peças não pode mudar silenciosamente.

**T5, resumo e links:** “Abra o resumo e diga o que já está confirmado, o que é estimativa e o que precisa ser confirmado. Encontre um link de pesquisa de loja, sem comprar.” Sucesso não depende de inventar FPS para um modelo sem cobertura.

**T6, recuperabilidade separada:** Em cenário controlado de teste, apresentar uma falha de uma análise ou do serviço de links. Pedir “O que você faria agora?” Conferir erro específico, tentativa independente e preservação das escolhas. Não alterar serviços de produção para simular erro.

**T7, restrição honesta separada:** Usar orçamento insuficiente ou montagem com BIOS/formato ainda não verificado. A pessoa deve compreender o motivo e um próximo passo. Não contar a ausência legítima de resultado como falha do sistema, mas contar mensagem enganosa/genérica ou ausência de caminho claro como problema de usabilidade.

## Cronometragem, assistência e erros

- Início: primeira apresentação da T1. Fim: conclusão da T5. Registrar também tempo por tarefa e tempo parado por problema técnico.
- Moderador pode repetir o enunciado sem indicar controles. Qualquer orientação sobre onde clicar ou qual peça escolher conta como ajuda. Não excluir do denominador quem precisou de ajuda ou desistiu.
- Categorias: conclusão sem ajuda / conclusão com ajuda / não concluiu. Registrar motivo e ponto exato de abandono.
- Erro bloqueante: não é possível continuar, escolhas se perdem ou estado incorreto induz conclusão falsa. Erro recuperável: usuário consegue corrigir sem reiniciar. Separar erro de serviço, incompatibilidade real, dado técnico pendente e confusão de interface.
- Registrar contagem de voltas desnecessárias, tentativas, erros, pedidos de ajuda, filtros limpos e troca cancelada/desfeita; não gravar tela/áudio sem consentimento específico.

## Ficha vazia de coleta

Arquivo-modelo: `docs/evidence/v3-cycle3-observations.csv`. Está vazio de resultados. Campos: ID, experiência, commit, catálogo, dispositivo, navegador, viewport, zoom, orçamento/uso do cenário, tempos, conclusão, ajuda, erros, etapa, perda de escolhas, compreensão de estimativas/pendências, observação anonimizada. Uma linha por participante/versão; eventos adicionais podem ser registrados em ficha separada por ID.

## Critérios de aceite e relatório

- ≥90% concluem T1–T5 sem ajuda; publicar denominador e distribuição por experiência/dispositivo.
- Zero perda de seleção/orçamento no caminho voltar/retomar/recarregar/trocar/cancelar.
- Zero compatibilidade/FPS/preço anunciado como confirmado sem evidência correspondente.
- Todas as falhas T6 mantêm resultados independentes e permitem tentar novamente.
- Relatar mediana e intervalo dos tempos, erros por tarefa, ajuda e comentários recorrentes. Comparar com ciclo 2 somente métricas realmente disponíveis e condições comparáveis; tempo não registrado no ciclo 2 não permite alegar melhora percentual de tempo.
- Se qualquer critério falhar, abrir defeito com versão, cenário anonimizado, resultado esperado/observado e repetição. Corrigir, repetir a tarefa afetada e depois executar nova rodada de aceite; não misturar resultados de versões diferentes para atingir a meta.

## Checklist manual antes da rodada

Em ambiente autorizado: teclado Tab/Shift+Tab, Enter/Espaço, Escape em detalhes/modal, foco inicial/retorno, ausência de armadilha de foco fora de diálogo; contraste real de texto/controle/foco/estado; zoom 200%; larguras 320/375/768/1366/1920; leitura de erro/sucesso sem depender só de cor; botão principal visível; sem sobreposição da navegação fixa; tabela de comparação rolável com foco. Registrar captura e resultado real por caso. Testes estáticos de contraste e SSR não concluem este checklist.
