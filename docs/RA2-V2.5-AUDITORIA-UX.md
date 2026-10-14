# V2.5 — Auditoria de interface, navegação, gráficos e simulações

08/10/2026 UTC · base `4f7690d531e0bcecf0748961f2eda0145c694db7` · branch `codex/pcpowerlab-ra2-ciclo2`.

## Escopo e método

Etapa 5 da sequência solicitada. Preservados os fluxos corretos; nenhuma reconstrução do assistente, fórmula de desempenho ou novo conceito de “simulação final”. Sem merge, deploy ou início da etapa 6.

Inspeção de código de todas as páginas, componentes compartilhados, estados e estilos; execução de serviços/testes Node, renderização estática React e handlers isolados; preparação da inspeção visual futura. Os relatórios e testes de etapas anteriores são contexto histórico, não uma execução visual nesta etapa.

**Navegador não executado:** a negativa anterior de socket no Chromium e a negativa de URL localhost no navegador cloud foram respeitadas. Nenhuma rota negada, túnel ou alternativa de bypass foi tentada. Não há screenshots antes/depois, verificação de geometria nas cinco larguras, auditoria completa de acessibilidade ou homologação com pessoas. SSR não executa layout, CSS, foco, rolagem ou leitor de tela.

## Requisitos e inventário de telas

| Área | Telas/estados examinados | Evidência possível nesta etapa | O que continua pendente |
| --- | --- | --- | --- |
| Estrutura pública | Início `/`, catálogo `/components`, assistente `/build`, resumo `/summary` | Landmark principal, título, navegação, componentes e CSS compartilhados; SSR inicial | Hierarquia percebida, alinhamento, tipografia, ícones e espaçamento renderizados |
| Análises | `/performance-lab`, `/compare`, `/insights`, `/upgrades` | Contratos, unidades, legendas/textos, ausentes/erros e guardas de respostas | Geometria de gráficos/tabelas, compreensão de estimativas, interação assistiva |
| Configurações | `/ready-builds`, `/saved-builds`, `/shared/:shareId` | Identidade das peças, estados de carregamento e rota, preço de referência | Fotos/cards e estados preenchidos em cada largura |
| Apoio | `/feedback`, `/feedback/new`, `/about`, rota inexistente | Títulos, controles nativos, retorno e estados de página | Formulários reais, zoom, teclado e percepção humana |
| Administração | `/admin` | Rota direta preservada, sem link público, login e proteção da API existentes/testados | Sessão interativa e teclado em navegador autorizado; segurança de produção não certificada |

São 16 destinos representativos, incluindo os dois modos de feedback, compartilhamento e 404. A renderização estática executa o estado inicial real, que pode ser carregamento; não equivale a exercitar todos os estados preenchidos de cada página.

### Larguras exigidas

| Largura | Cobertura preparada | Execução visual nesta etapa | Screenshot |
| --- | --- | --- | --- |
| 1440 px | Todas as telas acima + menu + jogos individual/comparação | NÃO EXECUTADA | Nenhum |
| 1024 px | Todas as telas acima + menu + jogos individual/comparação | NÃO EXECUTADA | Nenhum |
| 768 px | Todas as telas acima + menu + jogos individual/comparação | NÃO EXECUTADA | Nenhum |
| 390 px | Todas as telas acima + menu + jogos individual/comparação | NÃO EXECUTADA | Nenhum |
| 320 px | Todas as telas acima + menu + jogos individual/comparação | NÃO EXECUTADA | Nenhum |

`frontend/scripts/qa-visual.mjs` foi ampliado de três para cinco larguras e para captura de página inteira em cada destino, além dos painéis e menu. É um roteiro executável futuro, não evidência de imagens produzidas. Exige navegador autorizado, build e arquivo local de axe informado pelo ambiente. Resultados devem ser revisados, inclusive checks incompletos do axe; nem zero violações automatizadas certifica usabilidade.

## Antes/depois: falhas demonstradas e correções

| Evidência anterior na base | Alteração | Limite da prova |
| --- | --- | --- |
| Painel público de gargalos expunha atalho administrativo quando faltavam parâmetros | Atalho removido; explicação para atualização do catálogo, rota administrativa direta preservada | SSR e ausência de links públicos; autorização continua na API |
| Menu agrupado fechava o link focado ao selecionar a rota atual; foco só era restaurado se pathname mudasse | Restauração explícita e tratamento de mudança de breakpoint | Handler/fonte e casos de browser; foco real ainda pendente |
| Compartilhamento sem h1 no loading/erro, sem reiniciar estado nem invalidar resposta de outro shareId | Título estável e ciclo de requisição por rota; identificação do preço de referência | SSR/handlers; carregamento real de rota ainda pendente |
| Assistente não considerava todas as formas de bloqueio do contrato e mensagem de análise podia sobreviver à edição de refrigeração | Guardas alinhadas e limpeza da mensagem após edição de cooler/fans | Testes e handlers; descoberta/rolagem ainda pendentes |
| Consumo parcial de refrigeração era usado como completo para derivar referência da fonte e “margem de segurança” | Parcial explicitado, derivados não apresentados como completos, comparação em W com rótulos textuais | Contrato e SSR; não mede eletricidade nem certifica fonte |
| Pontuação ausente podia virar zero, inclusive nota geral, ranking e pesos | Ausência explícita e nenhuma barra classificatória fabricada | Dados de teste e SSR; fórmula original preservada |
| Gráfico de pontuação sem título específico e categorias ausentes omitidas silenciosamente | Título/escala e informação explícita de dados faltantes | SSR; geometria móvel pendente |
| Simulação profissional mostrava número sem unidade visível na métrica | “Pontuação estimada (0–100 pontos)” e explicação de índice normalizado, distinto de FPS e porcentagem | Escala conferida em `professionalSoftwareService.js`; sem benchmark |
| Resumo engolia erro do catálogo de jogos e inventava opção Cyberpunk como fallback | Loading/erro/retry/vazio explícitos, seleção de jogo disponível e bloqueio explicado da simulação | Testes de estados; gerar resumo de outras análises continua disponível |

“Antes/depois” nesta tabela significa comparação de fonte/contrato e saídas de testes com a base identificada. Não são screenshots nem relato de participante.

## Gráficos e linguagem

Inventário inclui os três gráficos Recharts (pontuações de componentes, potência, FPS por jogo) e também as barras de nota geral, custo-benefício e pesos de perfis. Simulação individual usa métricas textuais, sem gráfico adicional. Nenhuma visualização foi criada só para preencher uma lista.

- FPS é sempre estimativa do modelo; requisitos mínimos/recomendados não são inferidos da linha visual de 60 FPS. Valores ausentes não entram na média nem viram zero
- Pontuação normalizada usa pontos e escala, não FPS/porcentagem de velocidade. Ranking é relativo à categoria; preço é referência do catálogo, sem cotação/estoque ao vivo
- Gargalos são hipóteses estimadas, não defeito físico confirmado. Compatibilidade incompatível, não verificada e compatível pelas regras disponíveis permanecem distintos
- Consumo estimado em W não é a potência nominal da fonte e não é energia em kWh. Dados parciais de refrigeração permanecem parciais
- Títulos, legendas/captions, unidades, valores equivalentes em texto/tabela e nomes das métricas evitam dependência exclusiva de cor ou tooltip
- Glossário contextual existente mantido. Não simplificar termos eliminando suas limitações técnicas

Os 32 pares opacos de tokens de texto (oito cores × quatro fundos de `theme.css`) passam 4,5:1 por cálculo sRGB; mínimo observado 7,21:1. Isso **não** valida gradientes, transparências, hover, disabled, fotos, contornos/foco ou composição real dos estilos. Tokens, fontes, espaçamento, cards e botões existentes foram preservados onde não houve falha demonstrada.

## Simulações e preservação

O laboratório mantém modo individual e comparação de 2–10 jogos. Um título funciona no modo individual; no modo comparação zero/um/mais de dez bloqueiam com motivo. Dois e dez são limites válidos. Montagem incompleta indica peças faltantes e link de retorno. Catálogo carregando/vazio/com falha, jogo ausente, parâmetros insuficientes e falha de API são estados diferentes. Retry mantém escolhas.

`useSimulationRequest` associa cada resposta à chave de montagem/revisão/modo/jogos/resolução/qualidade e à sequência da chamada. Alterações e percurso A→B→A não restauram resultados antigos. O estado da montagem e o histórico de troca/desfazer da v2.4 permanecem. As opções locais do laboratório são preservadas durante retry e mudanças da montagem; ao sair e reabrir o laboratório, inicializam pelos parâmetros compartilhados da configuração, comportamento existente, sem alegação de persistência específica dos jogos comparados.

## “Simulação final”: ambiguidade mantida

O resumo consolidado **já existe** em `/summary`: peças e acessórios, custo estimado/orçamento, compatibilidade e verificações pendentes, gargalos/consumo estimados, desempenho do jogo escolhido, alertas e ações de editar, trocar, desfazer, salvar nova configuração, comparar e gerar relatório. Esse conjunto atende tecnicamente à interpretação “visão consolidada da montagem e suas estimativas”. A etapa conserva esse fluxo em vez de inventar outro recurso.

O relato “simulação final” não define, por si só, se participantes esperam esse resumo, um benchmark físico ou outro fluxo. **Continua pendente a validação com participantes reais**, sem fabricar respostas, métricas de sucesso ou consenso. Pergunta sugerida para futura validação: “Ao chegar ao resumo, você encontra o que esperava de uma simulação final? O que ainda falta para decidir?”

## Execução e resultado

Comandos, contagens e logs finais em [evidências v2.5](evidence/ra2-v2.5/README.md). Coleta Playwright não significa execução.

- Feito: auditoria de fonte e contratos, correções demonstradas, testes possíveis sem navegador, roteiro das cinco larguras, matriz rastreável e relatório
- Não feito: screenshots/inspeção visual, execução E2E/integrada em browser, teste com leitor de tela/aparelhos e participantes, benchmark real ou preço de mercado
- Pendente: executar e inspecionar todos os destinos e estados nas cinco larguras em ambiente autorizado; verificar teclado/foco/rolagem/back/forward/zoom e responsividade; validar compreensão de estimativas e significado de “simulação final”

R01–R06/R08/R09/R17 continuam **IMPLEMENTADO NÃO VALIDADO**; R07/R20/R21 permanecem parciais no que depende de abrangência e compreensão humana. Nenhum requisito recebe **VALIDADO** somente por testes automáticos. Cobertura de mídia continua 9/98 fotos, 89 pendências individuais.
