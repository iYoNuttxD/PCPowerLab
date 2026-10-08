import { componentLabels, componentTypes } from './componentLabels.js';

export const wizardSteps = [...componentTypes, 'cooling', 'budget', 'review'];
export const optionalWizardSteps = ['cooling'];
export const requiredWizardSteps = wizardSteps.filter(step => !optionalWizardSteps.includes(step));

export const wizardLabels = {
  ...componentLabels,
  cooling: 'Refrigeração',
  budget: 'Orçamento',
  review: 'Revisão'
};

export const wizardHelpDescriptions = {
  cpu: 'O processador executa as tarefas do computador. Pense nos programas e jogos que você pretende usar.',
  gpu: 'A placa de vídeo cria as imagens dos jogos e ajuda em edição e projetos gráficos. Considere a resolução do seu monitor.',
  motherboard: 'A placa-mãe conecta todas as peças. O encaixe do processador (socket) e o tipo de memória precisam ser compatíveis.',
  ram: 'A memória RAM mantém os programas em uso. Mais capacidade ajuda a trabalhar com várias tarefas ao mesmo tempo.',
  storage: 'O armazenamento guarda o sistema, os jogos e seus arquivos. Um SSD ajuda a abrir programas mais rapidamente.',
  psu: 'A fonte fornece energia às peças. Ela precisa ter potência e conectores adequados para a montagem.',
  case: 'O gabinete acomoda e protege as peças. Confira o espaço interno e a ventilação para os componentes escolhidos.',
  cooling: 'Escolha um cooler ou continue sem adicionar refrigeração agora.',
  budget: 'Defina quanto pretende gastar e como vai usar o PC. O total das peças continua visível para ajudar na decisão.',
  review: 'Confira as peças e execute as análises. A compatibilidade técnica será verificada antes da análise de desempenho.'
};

export const wizardDescriptions = {
  cpu: 'Escolha o processador para seus programas e jogos.',
  gpu: 'Escolha a placa de vídeo para a resolução do seu monitor.',
  motherboard: 'Confira o socket do processador e o tipo de memória.',
  ram: 'Escolha capacidade e tipo de memória compatíveis.',
  storage: 'Escolha o espaço para seu sistema, jogos e arquivos.',
  psu: 'Confira potência e conectores para as peças escolhidas.',
  case: 'Confira o espaço para as peças e a refrigeração.',
  cooling: 'Escolha um cooler ou continue sem adicionar agora.',
  budget: 'Defina seu limite de gasto e o uso principal.',
  review: 'Confira as escolhas e analise a montagem.'
};

export function normalizeWizardStep(step) {
  return wizardSteps.includes(step) ? step : wizardSteps[0];
}

// A success flag must never override a known blocker or an explicitly pending
// technical check. Both compatibility endpoints may carry those details.
export function hasWizardCompatibilityBlockers(compatibility, alerts) {
  const results = [compatibility, alerts];
  const issues = results.flatMap(result => ['alerts', 'violations', 'issues']
    .flatMap(key => Array.isArray(result?.[key]) ? result[key] : []));
  return compatibility?.compatible !== true || alerts?.compatible === false
    || results.some(result => ['incompatible', 'unverified'].includes(result?.status))
    || issues.some(issue => issue?.blocking === true || ['high', 'critical'].includes(issue?.severity));
}
