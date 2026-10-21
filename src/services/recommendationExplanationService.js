import { requiredBuildSlots } from './build.service.js';
import { evaluateResolvedBuildCompatibility } from './compatibility.service.js';
import { getCoolingPower } from './cooling.service.js';
import { summarizeBuildPricing } from './marketPriceService.js';
import { calculateBuildPerformanceScore, getPerformanceScore } from '../utils/costBenefitUtils.js';
import { usageSlotWeights } from '../utils/usageTypeWeights.js';

const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const round = value => Number(value.toFixed(2));
const known = value => Number.isFinite(value);
const labels = { gaming: 'jogos', work: 'trabalho', 'video-editing': 'edição de vídeo', programming: 'programação',
  design: 'design', general: 'uso geral', study: 'estudo', streaming: 'streaming', upgrade: 'upgrade', productivity: 'produtividade' };
const roles = {
  cpu: 'Processador: executa as tarefas e cálculos dos programas.',
  gpu: 'Placa de vídeo: processa gráficos; a pontuação não confirma FPS nem requisitos de um programa.',
  motherboard: 'Placa-mãe: conecta as peças e define os encaixes e recursos disponíveis.',
  ram: 'Memória: armazena os dados em uso; a capacidade necessária depende dos programas abertos.',
  storage: 'Armazenamento: define o espaço disponível para sistema, programas e arquivos.',
  psu: 'Fonte: deve atender à potência, aos conectores e ao encaixe do conjunto.',
  case: 'Gabinete: deve acomodar as peças; dimensões não comprovam temperatura nem ruído.',
  cooler: 'Cooler mantido da sua seleção, não escolhido por ganho de desempenho.',
  fans: 'Packs de ventoinhas mantidos com as quantidades selecionadas; não recebem bônus de desempenho.'
};
const orderingLabels = { 'cost-benefit': 'índice de custo-benefício ponderado pelo perfil', balanced: 'índice de custo-benefício ponderado pelo perfil',
  performance: 'índice de desempenho do perfil (menor preço no desempate)', 'lowest-price': 'menor preço de referência (índice do perfil no desempate)' };
const factFields = {
  cpu: [['socket', 'Socket'], ['cores', 'Núcleos'], ['threads', 'Threads'], ['tdpWatts', 'TDP (W)']],
  gpu: [['vramGb', 'VRAM (GB)'], ['lengthMm', 'Comprimento (mm)'], ['recommendedPsuWatts', 'Fonte recomendada pela GPU (W)']],
  motherboard: [['socket', 'Socket'], ['chipset', 'Chipset'], ['memoryType', 'Memória'], ['formFactor', 'Formato']],
  ram: [['capacityGb', 'Capacidade (GB)'], ['memoryType', 'Tipo'], ['speedMhz', 'Velocidade nominal (MHz)']],
  storage: [['capacityGb', 'Capacidade (GB)'], ['interface', 'Interface'], ['storageType', 'Tipo']],
  psu: [['watts', 'Potência (W)'], ['efficiency', 'Certificação declarada'], ['formFactor', 'Formato']],
  case: [['supportedFormFactors', 'Formatos de placa-mãe'], ['maxGpuLengthMm', 'Limite de GPU (mm)']],
  cooler: [['coolingType', 'Tipo'], ['supportedSockets', 'Sockets'], ['heightMm', 'Altura (mm)']],
  fans: [['diameterMm', 'Diâmetro (mm)'], ['unitsPerPack', 'Ventoinhas por pack'], ['powerWatts', 'Consumo por ventoinha (W)']]
};

// Explanations describe the actual inputs and bounded comparisons. They do not
// retrofit benchmark evidence or claim that the heuristic found a global optimum.
export function explainBuildSelection({ components, usageType = 'general', priority = 'cost-benefit', budgetAmount = null,
  budgetMin = null, compatibility, performanceByComponentId = new Map(), candidatesBySlot = {}, selectionSource = 'recommendation', selectionMode = 'performance-ranked' }) {
  const factual = selectionMode === 'price-and-compatibility';
  const pricing = summarizeBuildPricing(components);
  const total = pricing.estimatedTotal;
  const validBudget = known(budgetAmount) && budgetAmount > 0;
  const references = new Map(pricing.referenceComponents.map(reference => [reference.productId, reference]));
  const entries = [...requiredBuildSlots, 'cooler'].flatMap(slot => components[slot] ? [{ slot, component: components[slot], quantity: 1 }] : [])
    .concat((components.fans || []).map(component => ({ slot: 'fans', component, quantity: component.quantity })));
  const cooling = entries.filter(entry => ['cooler', 'fans'].includes(entry.slot));
  const coolingTotal = cooling.some(entry => !known(references.get(entry.component.id)?.price)) ? null
    : round(cooling.reduce((sum, entry) => sum + references.get(entry.component.id).price * entry.quantity, 0));
  const compatibilityStatus = compatibility?.available === false ? 'unavailable' : compatibility?.status || 'unverified';
  const componentReasons = entries.map(({ slot, component, quantity }) => {
    const reference = references.get(component.id);
    const lineTotal = known(reference?.price) ? round(reference.price * quantity) : null;
    const parameter = performanceByComponentId.get(component.id);
    const auxiliary = ['cooler', 'fans'].includes(slot);
    const score = auxiliary || factual ? null : getPerformanceScore(component, parameter, usageType);
    const weight = factual ? null : usageSlotWeights[usageType]?.[slot] ?? null;
    const facts = catalogFacts(slot, component);
    const alternatives = factual || auxiliary || selectionSource !== 'recommendation' ? null : compareSinglePartAlternatives({
      slot, component, components, candidates: candidatesBySlot[slot] || [], performanceByComponentId, usageType,
      total, budgetAmount: validBudget ? budgetAmount : null, budgetMin
    });
    return {
      slot, componentId: component.id, name: component.name, quantity, facts,
      role: roles[slot],
      selectionReason: auxiliary ? roles[slot] : factual ? 'Integra o conjunto de menor total pelas regras de encaixe e energia do catálogo, com os requisitos de capacidade informados. Nenhum índice de desempenho participou da escolha.' : selectionSource === 'recommendation'
        ? `${component.recommendationMeta?.categoryRank ? `Esta peça ficou em ${component.recommendationMeta.categoryRank}º entre ${component.recommendationMeta.rankedCandidatesCount} opções elegíveis da categoria (preço e índice válidos, antes de verificar o encaixe do conjunto), ordenadas por ${orderingLabels[priority] || orderingLabels['cost-benefit']}; ${component.recommendationMeta.shortlistedCandidatesCount} entraram na busca de conjuntos.`
          : `Integra o conjunto classificado para ${labels[usageType] || usageType}.`}
          ${priority === 'lowest-price' ? 'A pontuação do conjunto favorece economia no orçamento, índice simulado e equilíbrio CPU/GPU.' : priority === 'performance'
            ? 'A pontuação do conjunto dá mais peso ao índice simulado, considerando também custo-benefício, uso do orçamento e equilíbrio CPU/GPU.'
            : 'A pontuação do conjunto combina custo-benefício, índice simulado, uso do orçamento e equilíbrio CPU/GPU.'} A seleção é do conjunto, não uma prova de que esta peça isolada é a melhor compra.`
        : 'Peça da sua montagem atual. Esta explicação descreve os dados disponíveis, não aprova a compra nem afirma que a peça foi escolhida automaticamente.',
      profile: { usageType, label: labels[usageType] || usageType, weight,
        message: factual ? 'O perfil orienta a memória mínima; requisitos específicos do programa e periféricos devem ser conferidos separadamente.' : auxiliary ? 'Refrigeração entra no custo e nas verificações, não na pontuação de desempenho.'
          : `Perfil ${labels[usageType] || usageType}${priority === 'lowest-price' ? ': usa o índice deste perfil; a prioridade menor preço não usa a parcela de custo-benefício ponderada' : known(weight) ? `: peso ${weight} na parcela de custo-benefício do algoritmo` : ''}. Isso não comprova desempenho em uma aplicação específica.` },
      performance: { score, basis: auxiliary || factual ? 'not_scored' : !known(score) ? 'unavailable' : parameter ? 'simulated' : ['cpu','gpu','ram','storage'].includes(component.category) ? 'class_scenario' : 'neutral_heuristic',
        provisional: parameter?.scoreKind === 'synthetic-provisional',
        message: factual ? 'Desempenho não utilizado nesta seleção: não há promessa de FPS, ganho ou ausência de gargalos.' : auxiliary ? 'Sem estimativa de ganho de FPS ou temperatura.' : !known(score) ? 'Sem índice de desempenho utilizável; não é possível estimar o impacto no desempenho.'
          : parameter || ['cpu','gpu','ram','storage'].includes(component.category) ? `Índice simulado ${score}/100${parameter?.scoreKind === 'synthetic-provisional' ? ', provisório' : ''}; não é benchmark medido nem garantia de FPS.`
            : `Peso neutro ${score}/100 usado no algoritmo; não mede qualidade ou desempenho desta peça.` },
      budget: { unitPrice: reference?.price ?? null, quantity, lineTotal,
        shareOfTotalPercent: known(total) && total > 0 && known(lineTotal) ? round(lineTotal / total * 100) : null,
        source: reference?.basis || 'unavailable', observedAt: reference?.observedAt || reference?.queriedAt || null,
        message: !known(lineTotal) ? 'Preço de referência ausente. Não trate o subtotal conhecido como custo total.'
          : `${money(lineTotal)}${quantity > 1 ? ` por ${quantity} packs (${money(reference.price)} por pack)` : ' de referência'}${known(total) && total > 0 ? `, ${round(lineTotal / total * 100)}% do total estimado` : ''}.` },
      compatibility: { status: compatibilityStatus,
        facts: fitFacts(slot, components),
        message: compatibilityStatus === 'compatible' ? 'Passou nas regras verificadas para este conjunto; montagem física e refrigeração podem ter pendências fora desse escopo.'
          : compatibilityStatus === 'unavailable' ? 'Verificação temporariamente indisponível; não é confirmação de compatibilidade.'
            : compatibilityStatus === 'incompatible' ? 'O conjunto tem incompatibilidades. Não aplicar como uma alternativa aprovada.'
              : 'O conjunto tem dados técnicos pendentes. Não tratar como compatibilidade confirmada.' },
      tradeoff: auxiliary ? 'O custo foi preservado sem inventar benefício térmico; confirme encaixes, posição, conectores e folgas.'
        : alternatives?.alternative ? alternatives.alternative.message
          : alternatives ? 'Nenhuma troca individual verificada foi encontrada entre as opções comparadas. Isso não prova que outras combinações completas sejam inviáveis.'
            : 'Trocas devem ser recalculadas com as demais peças, o orçamento e o perfil atuais.',
      ...(alternatives || {})
    };
  });
  return { version: 'selection-explanation-v1', selectionSource, selectionMode, usageType, priority,
    scope: factual ? 'all_active_catalog_price_and_compatibility' : selectionSource === 'recommendation' ? 'shortlisted_catalog_builds_and_single_part_catalog_comparisons' : 'current_selection',
    selectionRule: factual ? 'Escolha pelo menor total de referência entre conjuntos que passam pelas regras de encaixe e energia do catálogo, com mínimos de RAM e VRAM. Índices e FPS não participam da seleção; capacidade não garante desempenho em um programa.' : `A classificação combina índices simulados, preços de referência${priority === 'lowest-price' ? ' e economia no orçamento' : ', pesos do perfil e uso do orçamento'} e equilíbrio CPU/GPU em um subconjunto do catálogo. Não garante ótimo global nem a melhor oferta de mercado.`,
    budget: { currency: 'BRL', limit: validBudget ? budgetAmount : null, min: budgetMin, total, coolingSubtotal: coolingTotal,
      knownReferenceSubtotal: pricing.knownReferenceSubtotal, remaining: validBudget && known(total) ? round(budgetAmount - total) : null,
      status: !validBudget || !known(total) ? 'unavailable' : total > budgetAmount ? 'over_budget' : known(budgetMin) && total < budgetMin ? 'below_range' : 'within_budget' },
    compatibility: { status: compatibilityStatus, checks: [...(compatibility?.alerts || []), ...(compatibility?.unverifiedChecks || [])],
      coolingStatus: compatibility?.coolingAssessment?.status || 'unverified', coolingWarnings: compatibility?.coolingAssessment?.unverifiedChecks || [] },
    componentReasons,
    limits: ['Preços são referências, não cotações ao vivo; frete e montagem não incluídos. Confirme preço, estoque e condições na loja.',
      'Pontuações são índices simulados ou pesos neutros, não benchmarks medidos, percentuais de ganho ou garantia de FPS.',
      'Alternativas trocam uma única peça e preservam todas as demais, inclusive refrigeração. Peças incompatíveis ou não verificadas não são alternativas aprovadas.']
  };
}

function compareSinglePartAlternatives({ slot, component, components, candidates, performanceByComponentId, usageType, total, budgetAmount, budgetMin }) {
  const originalScore = getPerformanceScore(component, performanceByComponentId.get(component.id), usageType);
  const checked = candidates.filter(candidate => candidate.id !== component.id).map(candidate => {
    const replacement = { ...components, [slot]: candidate };
    const compatibility = evaluateResolvedBuildCompatibility(replacement);
    const pricing = summarizeBuildPricing(replacement);
    const price = pricing.estimatedTotal;
    const score = getPerformanceScore(candidate, performanceByComponentId.get(candidate.id), usageType);
    const reasons = compatibility.alerts.map(check => ({ code: check.code, message: check.message }));
    if (!known(price)) reasons.push({ code: 'MISSING_REFERENCE_PRICE', message: 'Preço de referência incompleto.' });
    if (!known(score)) reasons.push({ code: 'PERFORMANCE_MODEL_UNAVAILABLE', message: 'Índice de desempenho indisponível; não entra na comparação por desempenho.' });
    return { componentId: candidate.id, name: candidate.name, compatibilityStatus: compatibility.status,
      referencePrice: pricing.referenceComponents.find(reference => reference.productId === candidate.id)?.price ?? null,
      facts: catalogFacts(slot, candidate),
      status: reasons.length ? 'excluded' : 'verified', reasons, advisoryChecks: compatibility.unverifiedChecks, total: price, score,
      priceDelta: known(price) && known(total) ? round(price - total) : null,
      scoreDelta: known(score) && known(originalScore) ? round(score - originalScore) : null,
      remainingBudget: known(budgetAmount) && known(price) ? round(budgetAmount - price) : null,
      withinBudget: known(budgetAmount) && known(price) ? price <= budgetAmount : null,
      withinRange: known(budgetMin) && known(budgetAmount) && known(price) ? price >= budgetMin && price <= budgetAmount : null };
  });
  // Prefer an actual saving; otherwise the closest priced verified change.
  // This ordering is explicitly a comparison, not a second recommendation rank.
  const available = checked.filter(candidate => candidate.status === 'verified').sort((a, b) =>
    Number(b.priceDelta < 0) - Number(a.priceDelta < 0) || Math.abs(a.priceDelta) - Math.abs(b.priceDelta) || a.componentId.localeCompare(b.componentId));
  const alternative = available[0];
  if (alternative) {
    const cost = alternative.priceDelta < 0 ? `economiza ${money(-alternative.priceDelta)}` : alternative.priceDelta > 0
      ? `acrescenta ${money(alternative.priceDelta)}` : 'mantém o custo de referência';
    const score = known(alternative.scoreDelta) ? ` O índice de seleção desta peça muda ${alternative.scoreDelta >= 0 ? '+' : ''}${alternative.scoreDelta} ponto(s), não um percentual de desempenho real.` : '';
    alternative.message = `${alternative.name}: ${cost}; total ${money(alternative.total)}.${score}${alternative.withinBudget === false ? ' Ultrapassa o limite informado.' : alternative.withinRange === false ? ' Fica abaixo do mínimo da faixa informada.' : ''} Sem conflito conhecido nas regras desta troca; detalhes ausentes continuam opcionais.`;
  }
  return { alternative: alternative || null, alternativeScope: 'single_part_replacement_preserving_other_parts_and_cooling',
    comparedCandidates: checked.length, excludedAlternatives: checked.filter(candidate => candidate.status === 'excluded') };
}

function catalogFacts(slot, component) {
  return (factFields[slot] || []).flatMap(([field, label]) => {
    const value = component.specs?.[field];
    return (typeof value === 'string' && value.trim()) || known(value) || (Array.isArray(value) && value.length)
      ? [{ label, value: Array.isArray(value) ? value.join(', ') : value }] : [];
  });
}

function fitFacts(slot, components) {
  const specs = name => components[name]?.specs || {};
  const cpu = specs('cpu'), board = specs('motherboard'), gpu = specs('gpu'), chassis = specs('case');
  const facts = [];
  if (['cpu', 'motherboard'].includes(slot) && cpu.socket && board.socket) facts.push(`Socket da CPU: ${cpu.socket}; da placa-mãe: ${board.socket}. Chipset e memória também precisam corresponder ao uso.`);
  if (['ram', 'motherboard'].includes(slot) && specs('ram').memoryType && board.memoryType) facts.push(`Memória ${specs('ram').memoryType}; placa-mãe declara ${board.memoryType}.`);
  if (slot === 'storage' && specs('storage').interface && board.storageInterfaces?.length) facts.push(`Interface ${specs('storage').interface}; placa-mãe declara ${board.storageInterfaces.join(', ')}.`);
  if (['gpu', 'case'].includes(slot) && known(gpu.lengthMm) && known(chassis.maxGpuLengthMm)) facts.push(`GPU de ${gpu.lengthMm} mm; limite do gabinete ${chassis.maxGpuLengthMm} mm.`);
  if (['case', 'motherboard'].includes(slot) && board.formFactor && chassis.supportedFormFactors?.length) facts.push(`Placa-mãe ${board.formFactor}; gabinete declara ${chassis.supportedFormFactors.join(', ')}.`);
  if (slot === 'psu' && [cpu.tdpWatts, gpu.recommendedPsuWatts, specs('psu').watts].every(known)) {
    const cooling = getCoolingPower(components);
    const minimum = Math.max(gpu.recommendedPsuWatts, cpu.tdpWatts + 350) + cooling.knownWatts;
    facts.push(`Fonte de ${specs('psu').watts} W; mínimo da regra ${round(minimum)} W, incluindo ${cooling.knownWatts} W conhecidos da refrigeração. Esta margem é heurística, não consumo medido.`);
    if (!cooling.complete) facts.push('Consumo de parte da refrigeração não informado; a margem total não está confirmada.');
  }
  return facts;
}

export function compareRecommendedSelection(current, recommended, performanceByComponentId, usageType) {
  const currentTotal = summarizeBuildPricing(current).estimatedTotal;
  const recommendedTotal = summarizeBuildPricing(recommended).estimatedTotal;
  const completeScore = selection => requiredBuildSlots.every(slot => selection[slot])
    ? calculateBuildPerformanceScore(selection, performanceByComponentId, usageType) : null;
  const currentScore = completeScore(current);
  const recommendedScore = completeScore(recommended);
  return { scope: 'whole_build_same_usage_and_retained_cooling', currentTotal, recommendedTotal,
    priceDelta: known(currentTotal) && known(recommendedTotal) ? round(recommendedTotal - currentTotal) : null,
    simulatedScoreDelta: known(currentScore) && known(recommendedScore) ? round(recommendedScore - currentScore) : null,
    changedSlots: requiredBuildSlots.filter(slot => current[slot]?.id !== recommended[slot]?.id),
    message: 'Diferenças de preço usam referências e incluem a refrigeração selecionada. Diferenças de pontuação são pontos de um modelo simulado, não percentuais de desempenho nem FPS.' };
}
