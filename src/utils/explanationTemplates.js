const componentNames = {
  cpu: 'processador',
  gpu: 'placa de video',
  motherboard: 'placa-mae',
  ram: 'memoria RAM',
  storage: 'armazenamento',
  psu: 'fonte',
  case: 'gabinete',
  build: 'configuracao'
};

const priorityNames = {
  'lowest-price': 'menor preco',
  'cost-benefit': 'custo-beneficio',
  performance: 'desempenho',
  balanced: 'equilibrio',
  'upgrade-ready': 'facilidade para upgrades'
};

const usageNames = {
  gaming: 'jogos',
  general: 'uso geral',
  productivity: 'produtividade'
};

export function buildIncompatibilityExplanation(data) {
  const templates = {
    CPU_MOTHERBOARD_SOCKET_INCOMPATIBLE: {
      title: 'Processador incompativel com a placa-mae',
      simpleExplanation: 'O processador e a placa-mae precisam usar o mesmo encaixe, chamado socket. Quando o socket e diferente, o processador nao encaixa ou nao funciona nessa placa-mae.',
      suggestion: 'Escolha uma placa-mae com o mesmo socket do processador ou troque o processador por um modelo compativel.'
    },
    RAM_MOTHERBOARD_TYPE_INCOMPATIBLE: {
      title: 'Memoria RAM incompativel com a placa-mae',
      simpleExplanation: 'A memoria RAM precisa ser do tipo aceito pela placa-mae, como DDR4 ou DDR5. Tipos diferentes nao encaixam corretamente e nao funcionam juntos.',
      suggestion: 'Troque a memoria por um tipo aceito pela placa-mae ou escolha uma placa-mae compativel com essa memoria.'
    },
    STORAGE_INTERFACE_INCOMPATIBLE: {
      title: 'Armazenamento sem suporte na placa-mae',
      simpleExplanation: 'O armazenamento usa uma conexao que a placa-mae escolhida nao informa como suportada. Sem essa conexao, a peca pode nao funcionar na configuracao.',
      suggestion: 'Escolha um armazenamento com interface aceita pela placa-mae ou uma placa-mae com suporte para essa interface.'
    },
    PSU_POWER_BELOW_RECOMMENDED: {
      title: 'Fonte abaixo do recomendado',
      simpleExplanation: 'A fonte pode nao entregar energia suficiente para o conjunto. Isso pode causar desligamentos, instabilidade ou limitar upgrades futuros.',
      suggestion: 'Escolha uma fonte com potencia igual ou maior que a recomendada para a placa de video e o restante do computador.'
    },
    CASE_MOTHERBOARD_FORM_FACTOR_INCOMPATIBLE: {
      title: 'Gabinete incompativel com a placa-mae',
      simpleExplanation: 'A placa-mae tem um tamanho fisico que o gabinete escolhido nao suporta. Nesse caso, ela pode nao caber corretamente.',
      suggestion: 'Escolha um gabinete que aceite o formato da placa-mae ou selecione uma placa-mae menor.'
    },
    CASE_GPU_LENGTH_INCOMPATIBLE: {
      title: 'Placa de video grande demais para o gabinete',
      simpleExplanation: 'A placa de video pode ser maior que o espaco interno disponivel no gabinete. Isso pode impedir a instalacao da peca.',
      suggestion: 'Escolha uma placa de video menor ou um gabinete com mais espaco interno.'
    }
  };

  return templates[data.code] ?? {
    title: 'Possivel incompatibilidade entre pecas',
    simpleExplanation: data.message || 'Uma ou mais pecas escolhidas podem nao funcionar corretamente juntas.',
    suggestion: 'Revise os componentes indicados e confira se eles sao compativeis antes de finalizar a configuracao.'
  };
}

export function buildBottleneckExplanation(data) {
  const templates = {
    cpu_bottleneck: {
      title: 'Possivel gargalo no processador',
      simpleExplanation: 'A placa de video escolhida e mais forte que o processador. Em alguns jogos, o processador pode limitar o desempenho total do computador.',
      suggestion: 'Considere escolher um processador mais forte ou uma placa de video mais equilibrada com essa CPU.'
    },
    gpu_bottleneck: {
      title: 'Possivel gargalo na placa de video',
      simpleExplanation: 'O processador tem mais folga do que a placa de video consegue aproveitar em tarefas graficas. Em jogos, a placa de video pode ser o principal limite de desempenho.',
      suggestion: 'Considere uma placa de video mais forte se o foco for jogar com mais qualidade grafica ou resolucao maior.'
    },
    ram_capacity_limitation: {
      title: 'Memoria RAM pode ser pouca',
      simpleExplanation: 'A quantidade de memoria RAM pode limitar jogos recentes, multitarefa e programas mais pesados. Isso pode causar travamentos ou lentidao ao alternar entre tarefas.',
      suggestion: 'Considere aumentar a memoria RAM para ter mais folga no uso diario e em jogos.'
    },
    ram_speed_limitation: {
      title: 'Velocidade da RAM pode limitar desempenho',
      simpleExplanation: 'A memoria RAM mais lenta pode reduzir um pouco o desempenho do processador, principalmente em jogos e tarefas que dependem muito de memoria.',
      suggestion: 'Se o orcamento permitir, escolha uma memoria com velocidade maior e compativel com a placa-mae.'
    },
    storage_speed_limitation: {
      title: 'Armazenamento pode deixar o uso menos rapido',
      simpleExplanation: 'O armazenamento escolhido pode aumentar tempos de carregamento e deixar o sistema menos responsivo em algumas tarefas.',
      suggestion: 'Considere usar um SSD mais rapido para melhorar abertura de programas, jogos e arquivos.'
    },
    psu_headroom_attention: {
      title: 'Fonte com pouca folga para upgrades',
      simpleExplanation: 'A fonte deve funcionar para a configuracao atual, mas sobra pouca margem para pecas mais fortes no futuro.',
      suggestion: 'Considere uma fonte com mais potencia se pretende fazer upgrades depois.'
    }
  };

  return templates[data.type] ?? {
    title: 'Possivel gargalo na configuracao',
    simpleExplanation: data.message || 'Uma peca pode estar limitando o desempenho de outra em alguns cenarios.',
    suggestion: 'Revise as pecas com maior diferenca de desempenho e tente manter a configuracao equilibrada.'
  };
}

export function buildRecommendationExplanation(data) {
  const priority = priorityNames[data.priority] || priorityNames.balanced;
  const component = getComponentName(data.component || data.category);

  if (data.priority === 'lowest-price') {
    return {
      title: 'Escolha economica',
      simpleExplanation: `Essa ${component} foi recomendada porque ajuda a manter o preco baixo sem fugir da proposta da configuracao.`,
      suggestion: 'E uma boa opcao quando o objetivo principal e gastar menos.'
    };
  }

  if (data.priority === 'performance') {
    return {
      title: 'Escolha com foco em desempenho',
      simpleExplanation: `Essa ${component} foi recomendada porque prioriza desempenho e deve entregar mais folga em tarefas pesadas.`,
      suggestion: 'E indicada quando voce prefere desempenho maior, mesmo que o custo tambem aumente.'
    };
  }

  if (data.priority === 'upgrade-ready') {
    return {
      title: 'Boa escolha para upgrades futuros',
      simpleExplanation: `Essa ${component} foi recomendada porque deixa a configuracao mais preparada para melhorias futuras.`,
      suggestion: 'E indicada para quem pretende trocar ou adicionar pecas depois.'
    };
  }

  return {
    title: data.priority === 'cost-benefit' ? 'Boa escolha para custo-beneficio' : 'Escolha equilibrada',
    simpleExplanation: `Essa ${component} foi recomendada porque combina bem com a configuracao e segue a prioridade de ${priority}.`,
    suggestion: buildUsageSuggestion(data.usageType)
  };
}

export function buildPerformanceExplanation(data) {
  const score = Number(data.performanceScore ?? data.score);
  const usage = usageNames[data.usageType] || 'o uso informado';

  if (Number.isFinite(score) && score >= 80) {
    return {
      title: 'Desempenho esperado alto',
      simpleExplanation: `A configuracao deve entregar desempenho forte para ${usage}, com boa folga para qualidade visual ou tarefas mais pesadas.`,
      suggestion: 'Mantenha essa configuracao se o objetivo e ter mais estabilidade e vida util.'
    };
  }

  if (Number.isFinite(score) && score >= 60) {
    return {
      title: 'Desempenho esperado equilibrado',
      simpleExplanation: `A configuracao deve atender bem ${usage}, mas talvez seja necessario ajustar qualidade grafica ou expectativas em tarefas mais pesadas.`,
      suggestion: 'Priorize melhorias na placa de video, processador ou memoria se quiser mais desempenho.'
    };
  }

  return {
    title: 'Desempenho esperado limitado',
    simpleExplanation: `A configuracao pode funcionar para ${usage}, mas deve ter limitacoes em jogos recentes ou programas mais pesados.`,
    suggestion: 'Considere melhorar os componentes principais antes de buscar qualidade alta ou resolucao maior.'
  };
}

export function buildBudgetExplanation(data) {
  const budgetAmount = Number(data.budgetAmount ?? data.amount);
  const totalPrice = Number(data.totalPrice ?? data.totalEstimatedPrice);
  const remainingBudget = Number(data.remainingBudget);

  if (Number.isFinite(budgetAmount) && Number.isFinite(totalPrice)) {
    if (totalPrice > budgetAmount) {
      return {
        title: 'Configuracao acima do orcamento',
        simpleExplanation: 'O valor estimado da configuracao passa do limite informado. Isso pode exigir ajustes para evitar gastar mais do que o planejado.',
        suggestion: 'Troque alguma peca por uma opcao mais barata ou aumente o orcamento antes de fechar a build.'
      };
    }

    if (budgetAmount - totalPrice <= budgetAmount * 0.1) {
      return {
        title: 'Configuracao proxima do limite',
        simpleExplanation: 'A configuracao esta dentro do orcamento, mas usa quase todo o valor disponivel.',
        suggestion: 'Reserve uma pequena margem para frete, variacao de preco ou perifericos.'
      };
    }

    return {
      title: 'Configuracao dentro do orcamento',
      simpleExplanation: 'A configuracao recomendada fica abaixo do valor maximo informado, mantendo uma boa relacao entre preco e desempenho.',
      suggestion: 'O valor restante pode ser usado para melhorar armazenamento, memoria RAM ou perifericos.'
    };
  }

  if (Number.isFinite(remainingBudget) && remainingBudget < 0) {
    return {
      title: 'Configuracao acima do orcamento',
      simpleExplanation: 'O valor restante ficou negativo, o que indica que a configuracao ultrapassou o limite informado.',
      suggestion: 'Reduza o custo de alguma peca ou revise o orcamento disponivel.'
    };
  }

  return {
    title: 'Orcamento informado',
    simpleExplanation: 'O orcamento foi estruturado e pode ser usado para comparar precos, recomendar pecas e gerar alertas financeiros.',
    suggestion: 'Use esse valor como limite para as proximas recomendacoes de componentes.'
  };
}

export function buildGeneralExplanation(data) {
  return {
    title: data.title || 'Ponto de atencao na configuracao',
    simpleExplanation: data.message || 'Foi encontrado um aviso que merece revisao antes de finalizar a configuracao.',
    suggestion: data.suggestion || 'Revise o aviso e ajuste a configuracao se ele afetar seu uso principal.'
  };
}

function buildUsageSuggestion(usageType) {
  if (usageType === 'gaming') {
    return 'E indicada para quem quer jogar em 1080p com boa qualidade grafica.';
  }

  if (usageType === 'productivity') {
    return 'E indicada para manter bom desempenho em tarefas de trabalho e criacao.';
  }

  return 'E indicada para uma configuracao equilibrada no uso diario.';
}

function getComponentName(component) {
  return componentNames[component] || 'peca';
}