/** Disclosure for catalog-based decision support, never a live market quote. */
export function buildDecisionMethodology({ scope = 'catalog_candidates', ranking, usageType = null, performanceUsed = true, fallbackScore = 50 } = {}) {
  return {
    version: 'catalog-estimate-v1',
    scope,
    usageType,
    cost: {
      basis: 'catalog_reference_estimate',
      currency: 'BRL',
      liveQuote: false,
      includesShipping: false,
      includesPaymentConditions: false,
      description: 'Precos de referencia estimados do catalogo; confirme preco, estoque, frete e condicoes na loja.'
    },
    performance: {
      basis: 'simulated_catalog_parameters',
      usedForRanking: performanceUsed,
      measuredBenchmark: false,
      fallbackScore,
      description: !performanceUsed
        ? 'Desempenho nao utilizado para classificar estas correcoes.'
        : `Indices simulados do catalogo, nao benchmarks medidos nem garantia de FPS. ${fallbackScore === null ? 'Entradas sem indice de desempenho sao excluidas.' : 'CPU, GPU, RAM e armazenamento sem modelo ficam sem estimativa e fora da classificação; apenas componentes auxiliares podem usar peso neutro 50.'}`
    },
    specifications: {
      basis: 'catalog_specs',
      description: 'Especificacoes cadastradas; confirme modelo, revisao e detalhes com o fabricante.'
    },
    compatibility: {
      basis: 'catalog_rules',
      physicalValidation: false,
      description: 'Regras sobre os dados disponiveis; verificacoes pendentes e particularidades de montagem exigem confirmacao.'
    },
    value: {
      basis: 'simulated_performance_and_reference_cost',
      ranking: ranking || 'Comparacao relativa das opcoes avaliadas no catalogo.',
      marketWideComparison: false,
      description: 'Custo-beneficio relativo ao conjunto avaliado; nao comprova o menor preco ou a melhor oferta do mercado.'
    }
  };
}
