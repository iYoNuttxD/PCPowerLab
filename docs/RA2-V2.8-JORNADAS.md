# V2.8 — Execução técnica de três jornadas integradas

08/10/2026 UTC · branch `codex/pcpowerlab-ra2-ciclo2` · base `b463f1768b1f72647bd06c1bc4ba82a90a3799f0`.

## Objetivo e interpretação

Validar tecnicamente os percursos solicitados para iniciante, intermediário e experiente, preservando os fluxos existentes. São **cenários técnicos**, não participantes recrutados nem pesquisa de usabilidade. Não há taxas de satisfação, compreensão, retenção, aceitação ou intenção de compra. R22 (retenção/monetização) continua pendente de validação com usuários reais.

A aplicação foi percorrida por adaptadores frontend reais compilados com esbuild, utilitários usados pela interface, requisições HTTP reais, parser/controllers/serviços Express e repositórios reais em memória. Nenhum endpoint foi interceptado ou substituído; nenhum produto ou cotação foi adicionado para fazer o cenário passar. Os parâmetros de persona são entradas de teste explícitas. A execução ocorre em processo isolado e as configurações salvas desaparecem quando ele termina.

O script `scripts/check-profile-journeys.mjs` conecta o contrato frontend ao backend, em vez de testar apenas serviços isolados. Os testes adicionais de handlers controlam hooks/tempo e são identificados separadamente. **Nenhum deles executa DOM, hidratação, CSS, clique nativo, foco ou histórico do navegador.**

## Relatórios individuais e registros

- [Iniciante: orçamento limitado e montagem orientada](RA2-V2.8-INICIANTE.md)
- [Intermediário: filtros, alternativas e troca](RA2-V2.8-INTERMEDIARIO.md)
- [Experiente: PC existente e plano de upgrades](RA2-V2.8-EXPERIENTE.md)
- [Comandos e logs](evidence/ra2-v2.8/README.md)
- [Registro estruturado das entradas, resultados e configurações finais](evidence/ra2-v2.8/journeys.json)

## Cobertura transversal e limites

| Dimensão | Evidência realmente executada | Pendente |
| --- | --- | --- |
| Navegação | GET das rotas públicas por HTTP; inspeção/SSR dos links e regressão do destino de Upgrade | Cliques, voltar/avançar, rolagem, foco e lifecycle no navegador |
| Clareza | Leitura técnica da proposta, rótulos, instruções e retornos explicativos; SSR existente reexecutado | Compreensão por iniciantes/intermediários/experientes reais |
| Consistência visual | Fonte/componentes compartilhados; contratos estáticos preservados | Inspeção da aplicação renderizada, screenshots, alinhamento e estados |
| Fotos | Catálogo real 98 itens, helper de foto verificada e download HTTP dos nove arquivos | 89 fotos faltantes; aparência/enquadramento no navegador |
| Busca/filtros | Dados reais em utilitários frontend: busca, marca, categoria, specs, preço, índice/valor e compatibilidade da API | Eventos reais dos controles, mobile e teclado |
| Orçamento | Tetos reais, insuficiência 422, alerta over_budget, total independente em centavos, custo da troca e plano acumulado | Preço/estoque de mercado, ótimo global e frete |
| Compatibilidade | Montagem recomendada, candidato filtrado, mudança de um slot, incompatibilidade e refrigeração não verificada | BIOS/QVL, folgas, headers, temperatura e certificação física |
| Desempenho | Resumo/jogo com mesmos parâmetros, supressão de FPS em conflito, comparação da troca e gargalo | Benchmark físico, precisão e interpretação humana |
| Salvamento | Normalização frontend → criação HTTP → leitura → hidratação → payload → novo resumo; original preservado após upgrade | Reload real da página, reinício do backend, conta/multiusuário |
| Estabilidade | Suíte completa, erros/retry, scripts de concorrência/armazenamento/handlers e percursos reais | Carga, rede externa, React DOM/StrictMode e segurança de produção |
| Responsividade | Preparação histórica das cinco larguras preservada | 320/390/768/1024/1440 px não executadas |

## Defeitos concretos encontrados na jornada

| ID | Reprodução | Correção e evidência |
| --- | --- | --- |
| J01 — origem errada no upgrade | Build global A; abrir Upgrade no card salvo B. Link antigo não transporta ID e a tela usa A | URL com `buildId` codificado; erro/loading/missing bloqueiam submissão até origem resolvida ou escolha explícita. Controle negativo com fonte base falha; fonte corrigida passa nos handlers/SSR |
| J02 — etapas fracionárias | `maxSteps=0.5` aceito como positivo e arredondado para 0; API devolve plano vazio apesar de existirem candidatos | Validação exige inteiro positivo; frontend informa erro antes de enviar e backend recusa com 400. Contraste real: `1` produz etapa de armazenamento a R$699,90. Regressão e HTTP no roteiro |

Nenhuma correção foi inferida apenas de um teste ausente: J01 foi reproduzido no roteiro de fonte/handlers contra a base; J02 no serviço real com catálogo original. Os testes e limites são detalhados no índice de evidências.

## Bloqueios respeitados

Chromium já teve socket negado, inclusive em tentativa revisada; navegador cloud suportado recusou URL local. Essas rotas não foram repetidas, nem foi criado túnel ou usado computador não autorizado. Não foram produzidas screenshots. Não se classifica essa restrição do ambiente como defeito do aplicativo.

API comercial continua sem provedor conectado: valores são referências demonstrativas. Os nove arquivos de foto existentes não resolvem os 89 bloqueios documentados. Os riscos de estado global em memória e dados físicos incompletos da [auditoria v2.7](RA2-V2-QUALIDADE.md) continuam aplicáveis.

## Verificação final

454 testes Node distintos aprovados (incluem 48 utilitários frontend), dez scripts SSR/handlers aprovados, três jornadas/17 passos integrados, lints e build aprovados. Check HTTP de produção aprovado. 186 casos de browser coletados, zero executados. Reruns e scripts não são adicionados aos 454. Auditor de imagens parcial: 9/98, 89 bloqueios.

## Resultado da etapa

Execução técnica viável das três jornadas, registros separados, correções de encaminhamento e validação de etapas fracionárias, com regressões. Aprovação refere-se às camadas efetivamente executadas; não é homologação integral das personas. Navegador, capturas, responsividade e aceitação humana ficam bloqueados/pendentes. Etapa 9 (auditoria final independente), merge e deploy fora deste escopo.
