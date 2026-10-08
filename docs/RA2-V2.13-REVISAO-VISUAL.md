# RA2 V2.13 — Comparação e configurações salvas

Continuação de interface sobre `75cd983`. Sem alteração de catálogo, preços ou especificações.

## Correções

- Comparação de configurações: largura mínima legível, cabeçalhos sem quebra no meio das palavras e moeda em uma linha. Rolagem horizontal fica na região focalizável; orientação curta para toque e teclado
- Texto anterior à tabela reduzido; significado dos critérios preservado em detalhes opcionais
- Configurações salvas: galeria de peças recolhida por padrão, ações fora dela e fotografias compactas ao abrir
- Botões “Abrir montagem”, “Trocar peça” e “Criar versão” mantêm as ações existentes
- Estado de compatibilidade pendente e mensagens legadas de refrigeração apresentados em português; identificadores/API não são alterados

## Evidência técnica

- 531 testes Node aprovados, zero falhas; unitários frontend já incluídos nessa contagem
- 14 verificadores SSR/handlers aprovados, incluindo galeria recolhida, ações independentes e tradução do estado pendente
- Lint backend/frontend e build aprovados
- Regressões Playwright adicionadas para tabela em 320/1440 px, moeda/cabeçalhos/rolagem por teclado e cards salvos em 768 px; coletadas, não executadas nesta máquina
- Fotografias e seus créditos preservados

O defeito foi observado no navegador em `9cdb78d`. As verificações técnicas desta continuação não provam a geometria real corrigida: reteste no SHA publicado ainda necessário. Sem merge ou deploy.
