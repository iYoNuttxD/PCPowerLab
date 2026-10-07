import { componentLabels, componentTypes } from './componentLabels.js';

export const wizardSteps = [...componentTypes, 'budget', 'review'];

export const wizardLabels = {
  ...componentLabels,
  budget: 'Orçamento',
  review: 'Revisão'
};

export const wizardDescriptions = {
  cpu: 'O processador executa as tarefas do computador. Pense nos programas e jogos que você pretende usar.',
  gpu: 'A placa de vídeo cria as imagens dos jogos e ajuda em edição e projetos gráficos. Considere a resolução do seu monitor.',
  motherboard: 'A placa-mãe conecta todas as peças. O encaixe do processador (socket) e o tipo de memória precisam ser compatíveis.',
  ram: 'A memória RAM mantém os programas em uso. Mais capacidade ajuda a trabalhar com várias tarefas ao mesmo tempo.',
  storage: 'O armazenamento guarda o sistema, os jogos e seus arquivos. Um SSD ajuda a abrir programas mais rapidamente.',
  psu: 'A fonte fornece energia às peças. Ela precisa ter potência e conectores adequados para a montagem.',
  case: 'O gabinete acomoda e protege as peças. Confira o espaço interno e a ventilação para os componentes escolhidos.',
  budget: 'Defina quanto pretende gastar e como vai usar o PC. O total das peças continua visível para ajudar na decisão.',
  review: 'Confira as peças e execute as análises. A compatibilidade técnica será verificada antes da análise de desempenho.'
};

export function normalizeWizardStep(step) {
  return wizardSteps.includes(step) ? step : wizardSteps[0];
}
