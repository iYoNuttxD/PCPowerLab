# V3: matriz de aceite do plano integral

Esta matriz separa implementação, validação automatizada e evidência que depende de pessoas ou de navegador. Código implementado não equivale a validação observada. Não há merge ou deploy nesta entrega.

## P0 — Resumo resiliente

| Critério original | Situação e evidência |
|---|---|
| Reproduzir a montagem relatada no ciclo 2 e determinar a causa | **Dependência externa:** o relato não traz a combinação exata, estado salvo e sequência do participante. Não se afirma ter reproduzido a falha original. Solicitar esses dados e executar o caso quando disponíveis. |
| Revisar dados obrigatórios e passagem seleção → resumo | Implementado: validação da seleção separada das análises opcionais; cenários reais em `tests/v3-acceptance-flow.test.js` e testes de resiliência do resumo. |
| Distinguir montagem incompleta, estimativa indisponível e erro técnico | Implementado: `selectionStatus`, `analysisStatus` e estados por seção; interface mantém nomes, preços conhecidos, avisos e ação específica. |
| Uma análise sem dados não deve bloquear o resumo e as lojas | Implementado: isolamento por seção no serviço e requisições independentes no cliente; falha não produz números substitutos. |
| Sem perder escolhas; regressão confirmada | Regressões de falhas conhecidas e fluxo de estado executáveis; caso original permanece não reproduzido. Teste real de seleção completa, voltar/avançar, recarregar, resumo e lojas em `tests/v3-acceptance-flow.test.js`. |

## P1 — Jornada guiada

| Critério original | Situação e evidência |
|---|---|
| Orçamento e objetivo no início | Implementado: primeiro passo de orçamento, tipo de uso e descrição explícita do objetivo; `frontend/tests/build-objectives.test.js`. |
| Custo acumulado, saldo e próximo passo claros | Implementado: faixa de contexto persistente e navegação do assistente; valores incompletos rotulados, não tratados como total confirmado. |
| Cards essenciais com detalhes progressivos | Implementado: informação principal resumida, descrição técnica expansível e nome completo preservado. |
| Preservar escolhas ao voltar/avançar e recarregar | Implementado e testado no modelo real de persistência/transições; análises antigas são invalidadas ao recarregar. |
| Filtros visíveis, identificáveis e removíveis | Implementado: contagem, filtros ativos e limpeza individual/geral; filtros retidos entre passos da sessão. Não se promete persistência dos filtros após sair da rota. |
| Celular, notebook e tela grande | **Executado no Mac autorizado:** inspeção no Chrome em 390, 1366 e 1920 px, além de janela normal e zoom nativo de 200%. E2E verificam também 320, 768, 1024 e 1440 px. Primeiro orçamento visível no notebook e retorno com folga para o foco corrigidos. [Registro e capturas](V3-MAC-BROWSER-VALIDATION.md). |

## P1 — Catálogo e compatibilidade

| Critério original | Situação e evidência |
|---|---|
| Mapear lacunas por orçamento/uso antes de acrescentar itens | Inventário e matriz de faixas documentados em `catalog-v3-evidence.md`; processadores de entrada existentes não são duplicados apenas para aumentar a contagem. |
| CPUs, GPUs e gabinetes adequados às lacunas | Expansão com identidade, ficha oficial, foto e referência comercial datada. Cobertura de entrada inclui recuperação da evidência da MSI 3050 LP existente e alternativa Intel Arc, com requisitos explícitos. |
| Diferenciar placas-mãe por modelo, formato, memória, slots e conectividade | Implementado com atributos verificados e lacunas declaradas, sem inventar versão de BIOS instalada. |
| Dados de cálculo e compatibilidade completos | **Parcial por evidência:** especificações verificadas são utilizáveis; BIOS instalada, Resizable BAR e calibração de alguns modelos permanecem desconhecidos. Esses itens não recebem compatibilidade ou desempenho garantidos. |
| Fontes, datas e desconhecido ≠ compatível | Implementado: dados comerciais datados, fontes do fabricante e verificações conservadoras. `tests/v3-slot-power-rebar.test.js` protege evidência de SKU, alimentação sem cabo e suporte/ativação de ReBAR. |
| Novos itens funcionam no resumo/comparação/recomendação | Seleção, preço, resumo e comparação factual funcionam. Ranking de desempenho e simulações exigem modelo suportado. Não se geram coeficientes por interpolação arbitrária para incluir novos modelos. |

## P1 — Recomendações confiáveis

| Critério original | Situação e evidência |
|---|---|
| Validar orçamento, objetivo e compatibilidade | Implementado: validação do serviço, restrições explícitas e configurações verificadas; orçamento inclui refrigeração preservada. |
| Explicar por que cada peça foi recomendada | Implementação específica por componente: fatos, parcela do orçamento, prioridade/posição no conjunto elegível, alternativa e limites. Seleção manual é identificada como escolha do usuário. |
| Recalcular ao trocar uma peça | Implementado: prévia antes/depois, aplicação condicionada à revisão atual, preservação das outras peças e desfazer. Regressão real em `tests/v3-acceptance-flow.test.js`. |
| Não ultrapassar orçamento silenciosamente | Implementado: total e diferença explícitos, custos parciais/indisponíveis não tratados como orçamento confirmado; refrigeração computada. |
| Aproximações vs medições; limites e dados ausentes | Implementado: estimativas sintéticas existentes rotuladas; modelos novos sem calibração não recebem FPS nem pontuação fabricada. Ausência de dados/restrições é explicada. **Calibração externa de novos modelos pendente**, não resolvida por troca de rótulo. |

## P2 — Coerência visual e acessibilidade

| Critério original | Situação e evidência |
|---|---|
| Hierarquia, espaço, tipografia e cor de destaque | Implementado transversalmente na jornada, catálogo, resumo e recomendações; imagens e estrutura preservadas. |
| Estados de erro/sucesso sem depender só de cor | Implementado com texto, ícones/bordas e tratamentos semânticos. |
| Contraste | Auditoria determinística dos tokens e composições alfa reais em `frontend/scripts/check-visual-contrast.mjs`; resultados em `V3_VISUAL_CONTRAST.json`. Isto não substitui medição de todos os pixels em renderização real. |
| Navegação por teclado e foco | **Executado no Chrome:** Tab, Shift+Tab, Enter, Escape, link de salto, campos e diálogo com retorno ao acionador. Zoom nativo de 200% confirmado pela interface do Chrome, com formulário, catálogo, diálogo e resumo utilizáveis. E2E protegem a folga do título ao voltar e o alinhamento dos campos inválidos. Leitor de tela e cores forçadas reais não foram testados. |

## Ciclo 3 e validação final

- Protocolo pronto: `V3-CICLO3-PROTOCOLO.md`; planilha de observação vazia em `evidence/v3-cycle3-observations.csv`.
- Nenhum participante foi recrutado e nenhuma sessão humana foi executada. Meta de 90% não foi medida nem atingida por inferência dos testes automatizados.
- A rodada no Mac executou 306 casos E2E: **305 aprovados, 1 skip esperado** (geometria exclusiva de celular não se aplica ao projeto desktop), zero falhas e retries. **18/18 integrações** com frontend de produção e API real passaram. O inventário anterior de 304 cresceu com dois casos de orçamento visível no notebook.
- Pendências para aceite observacional completo: montagem original do relato, participantes do ciclo 3 e fontes de calibração para modelos de desempenho ainda sem suporte. A inspeção técnica do agente não mede a meta humana de 90%.
- A publicação permanece em PR de rascunho; sem merge nem deploy. Ausência de workflows/checks no repositório não significa CI aprovado.

## Registro automatizado da nuvem — 20/10/2026

1.030/1.030 testes Node passaram, zero falhas/skips; lint backend/frontend e build aprovados; 17 scripts de SSR/handlers/contraste aprovados, com 64/64 combinações de contraste; 88/88 imagens verificadas. Playwright reconheceu 304 E2E e 18 integrações, sem executá-los. `git diff --check` aprovado. A nova explicação por peça foi incluída no isolamento de falhas opcionais do resumo e possui regressão própria.

## Registro de execução no Mac — 20/10/2026 (America/Sao_Paulo)

305 E2E aprovados, 1 skip esperado, 18 integrações aprovadas e 1.030 testes Node aprovados. Lints, build, 17 verificadores, 64 contrastes e 88 imagens aprovados. A execução E2E final terminou em 21/10/2026 UTC, ainda 20/10 no fuso do usuário. Logs, resultados, rastreabilidade dos relatos e limites estão em [V3-MAC-BROWSER-VALIDATION.md](V3-MAC-BROWSER-VALIDATION.md).

O resumo com GPU sem calibração conservou sete peças, orçamento, compatibilidade parcial e lojas. Troca de RAM R$ 5.759,75 → R$ 4.979,75, preservação das outras seis peças, recálculo, desfazer e retorno ao total original foram observados na API e no navegador. Configuração de teste do agente; não é a configuração original do participante.


## Complementação funcional após nova leitura — 21/10/2026

O [relatório com 67 sinais e células exatas](V3-FEEDBACK-FOLLOWUP.md) substitui a impressão de cobertura total da revisão anterior. Avaliações subjetivas continuam parciais ou não comprovadas; testes não medem satisfação. Os registros anteriores são históricos.

| Fala / lacuna | Mudança funcional atual | Evidência / limite |
|---|---|---|
| H7, R2/R3/R7/R9: listas e pesquisa | Tokens, recursos Wi-Fi/M.2, categorias contadas, faixas e lista compacta com fotos | Wi-Fi 0 → 3 no navegador; nomes e controles em 320/390 px. Eficiência humana ainda não medida. |
| H4, AD4: pop-up temperatura/ruído | Diálogo acessível real no resumo e laboratório; cenário persistido; link de seleção do cooler | Escape/retorno, Tab/Shift+Tab, recarga, celular e zoom nativo 200%. Corrigidos controles escondidos de details na armadilha de foco. |
| H4, V7: recomendação | RAM mínima 8 GB estudo/geral e 16 GB demais, editável; limites antes de aplicar; cooler pendente mantido mediante opção explícita | Programação R$6.000 → 16 GB + cooler por R$5.839,83. Compatibilidade completa continua pendente; conflitos confirmados não são aceitos. |
| AB7: mesmo chipset | Guia leigo de rede, M.2, RAM, USB-C e atualização de BIOS; comparação essencial/progressiva | B650 D3HP versus Gaming X AX V2 observado. Não se deduz qualidade de VRM ou BIOS instalada. |
| H10, AD7, AD8: escolhas úteis | Ryzen4500, RX550 PCYES, RX7600 Pro, gabinetes X2 Plus/XR com ofertas exatas datadas | 88 → 93 ativos; CPU entrada, GPU básica/intermediária, mesh/panorâmico. Não cobre todas as faixas; sem FPS/score inventado. |
| AB10: identidade visual | Home com composição ciano/magenta/verde e hierarquia 01–03, acentos no catálogo/resumo | Inspecionado em notebook e monitor grande. Aceitação estética humana não medida. |
| F10: cinco saídas bloqueadas | Resumo mantém custo/peças, pendências, texto final e lojas independentemente dos modelos ausentes | Troca RTX3060 → RX550: R$5.839,83 → R$4.059,74; recarga e desfazer preservam as demais peças. Configuração do agente, não a original. |

**Estado final validado:** 1.040 Node, 309 E2E + 1 skip esperado e 18 integrações aprovados; zero falhas na rodada final E2E. Lints/build aprovados, 17 verificadores aprovados após atualização de três contratos, 64 contrastes de tokens e 93 imagens. Há histórico de timeout de comparação: 3/3 retestes isolados e rodada integral final passaram; o histórico não foi apagado. Build conserva aviso de chunk >500 kB. [Resultados e logs](evidence/v3-feedback-followup/results.json).

Sem ciclo 3 humano, meta de 90%, leitor de tela/cores forçadas ou reprodução da configuração original. Calibração, BIOS/cooler/ReBAR e arquitetura sem GPU dedicada permanecem limitações explícitas. Publicação só na branch/PR em rascunho, sem merge/deploy.


## Fechamento econômico — 21/10/2026

[Diagnóstico, mudanças, cenários e evidências](V3-ECONOMY-VALIDATION.md). Novo critério factual percorre o catálogo ativo por preço/requisitos/encaixes, sem score/FPS. Programação com 16 GB de RAM / 8 GB de VRAM: R$5.009,84 com RX7600 Pro, BIOS/cooler pendentes explícitos. R$3.000 fica abaixo até da soma inferior isolada de R$3.235,05. R$4.000 tem caminho de R$3.289,75 não aprovado por dados ausentes; piso pelas regras atuais é R$4.339,84, sem certificar firmware da unidade. `minimumVerifiedTotal` permanece nulo; desconhecido não vira compatível na proposta factual.

**Entregue:** seleção factual, requisitos de VRAM, erro explicativo progressivo, dados oficiais de 50 W / 400 W da RX550, mínimo de BIOS 2423 da ASUS e correção da checagem da CPU 4500. **Limitado por dados:** comprimento/caboRX550, BIOS instalada, calibração de desempenho. Testes: 1.048 Node, 24 integrações + 6 econômicas na apresentação final, 28 E2E afetados, 51 direcionados, 93 imagens, lints/build. A suíte integral anterior não foi novamente rotulada como executada neste head. Sem merge/deploy/ciclo 3.
