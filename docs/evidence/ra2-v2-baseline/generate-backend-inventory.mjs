import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
if (!fs.existsSync(path.join(root, 'src/data/components.mock.js'))) {
  throw new Error('Execute o gerador a partir da raiz do repositório PCPowerLab.');
}
const load = async p => import(pathToFileURL(path.join(root, p)).href);
const { components } = await load('src/data/components.mock.js');
const { performanceParameters } = await load('src/data/performanceParameters.js');
const { compatibilityRules } = await load('src/data/compatibility-rules.mock.js');
const { componentCategories } = await load('src/models/component.model.js');
const { games } = await load('src/data/games.js');
const { professionalSoftware } = await load('src/data/professionalSoftware.js');
const { readyBuilds } = await load('src/data/readyBuilds.js');
const { purchaseLinks } = await load('src/data/purchaseLinks.js');
const { requiredBuildSlots } = await load('src/services/build.service.js');
const { checkBuildCompatibility } = await load('src/services/compatibility.service.js');
const { bottleneckThresholds } = await load('src/utils/performance-score-utils.js');
const { supportedUsageTypes, usageSlotWeights } = await load('src/utils/usageTypeWeights.js');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const byCategory = Object.fromEntries(componentCategories.map(category => [category, components.filter(c => c.category === category)]));
const runtimeChecks = [
  { id: 'CPU_MOTHERBOARD_SOCKET_INCOMPATIBLE', categories: ['cpu', 'motherboard'], fields: { cpu: ['socket'], motherboard: ['socket'] }, severity: 'high', conditionForCompatibility: 'cpu.specs.socket === motherboard.specs.socket', declarativeRuleIds: ['rule-001'], limitations: ['Não valida geração/BIOS, lista de CPUs suportadas, potência ou VRM da placa-mãe.'] },
  { id: 'RAM_MOTHERBOARD_TYPE_INCOMPATIBLE', categories: ['ram', 'motherboard'], fields: { ram: ['memoryType'], motherboard: ['memoryType'] }, severity: 'high', conditionForCompatibility: 'ram.specs.memoryType === motherboard.specs.memoryType', declarativeRuleIds: ['rule-002'], limitations: ['Não valida DIMM/SODIMM, quantidade de módulos/slots, capacidade máxima, frequência, ECC, QVL ou perfil XMP/EXPO.'] },
  { id: 'STORAGE_INTERFACE_INCOMPATIBLE', categories: ['storage', 'motherboard'], fields: { storage: ['interface'], motherboard: ['storageInterfaces'] }, severity: 'medium', conditionForCompatibility: 'motherboard.specs.storageInterfaces.includes(storage.specs.interface)', declarativeRuleIds: [], limitations: ['Não valida número de portas, compartilhamento de pistas, formato/comprimento M.2 ou geração PCIe. Não há registro equivalente nas 5 regras editáveis.'] },
  { id: 'PSU_POWER_BELOW_RECOMMENDED', categories: ['psu', 'cpu', 'gpu'], fields: { psu: ['watts'], cpu: ['tdpWatts'], gpu: ['recommendedPsuWatts'] }, severity: 'high', conditionForCompatibility: 'psu.specs.watts >= Math.max(gpu.specs.recommendedPsuWatts || 0, (cpu.specs.tdpWatts || 0) + 350)', declarativeRuleIds: ['rule-005'], limitations: ['Heurística fixa; não soma consumo de todos os componentes. Não valida conectores, picos, padrão ATX, qualidade nem dimensão da fonte. A descrição editável rule-005 usa estimatedConsumptionWatts, mas não governa esta fórmula.'] },
  { id: 'CASE_MOTHERBOARD_FORM_FACTOR_INCOMPATIBLE', categories: ['case', 'motherboard'], fields: { case: ['supportedFormFactors'], motherboard: ['formFactor'] }, severity: 'medium', conditionForCompatibility: 'case.specs.supportedFormFactors.includes(motherboard.specs.formFactor)', declarativeRuleIds: ['rule-003'], limitations: ['Não verifica folgas, montagem de radiador, cooler, unidades, conectores ou ventilação.'] },
  { id: 'CASE_GPU_LENGTH_INCOMPATIBLE', categories: ['case', 'gpu'], fields: { case: ['maxGpuLengthMm'], gpu: ['lengthMm'] }, severity: 'medium', conditionForCompatibility: 'gpu.specs.lengthMm <= case.specs.maxGpuLengthMm', declarativeRuleIds: ['rule-004'], limitations: ['Somente comprimento nominal; não verifica altura, espessura/slots, cabos ou redução por radiador.'] }
];
const aliases = {
  cpu: { cores: 'cores', threads: 'threads', baseClockGhz: 'baseClock', boostClockGhz: 'boostClock', tdpWatts: 'tdp' },
  gpu: { vramGb: 'vram', tdpWatts: 'tdp' },
  ram: { capacityGb: 'capacity', speedMhz: 'speed', memoryType: 'memoryType' },
  storage: { capacityGb: 'capacity', interface: 'interface', readSpeedMbS: 'readSpeed', writeSpeedMbS: 'writeSpeed' },
  psu: { watts: 'wattage' },
  motherboard: { socket: 'socket', memoryType: 'memoryType', formFactor: 'formFactor' },
  case: { supportedFormFactors: 'formFactorSupport', maxGpuLengthMm: 'maxGpuLength' }
};
function viable(b) {
  if (b.cpu && b.motherboard && b.cpu.specs.socket !== b.motherboard.specs.socket) return false;
  if (b.ram && b.motherboard && b.ram.specs.memoryType !== b.motherboard.specs.memoryType) return false;
  if (b.storage && b.motherboard && !b.motherboard.specs.storageInterfaces.includes(b.storage.specs.interface)) return false;
  if (b.psu && b.cpu && b.gpu && b.psu.specs.watts < Math.max(b.gpu.specs.recommendedPsuWatts || 0, (b.cpu.specs.tdpWatts || 0) + 350)) return false;
  if (b.case && b.motherboard && !b.case.specs.supportedFormFactors.includes(b.motherboard.specs.formFactor)) return false;
  if (b.case && b.gpu && b.gpu.specs.lengthMm > b.case.specs.maxGpuLengthMm) return false;
  return true;
}
function findWitness(component) {
  const selected = { [component.category]: component };
  function visit(index) {
    if (!viable(selected)) return null;
    if (index === requiredBuildSlots.length) {
      const ids = Object.fromEntries(requiredBuildSlots.map(slot => [slot, selected[slot].id]));
      return checkBuildCompatibility(ids).compatible ? ids : null;
    }
    const slot = requiredBuildSlots[index];
    if (slot === component.category) return visit(index + 1);
    for (const candidate of byCategory[slot]) {
      selected[slot] = candidate;
      const found = visit(index + 1);
      if (found) return found;
    }
    delete selected[slot];
    return null;
  }
  return visit(0);
}
const entries = components.map(component => {
  const p = performanceParameters.find(p => p.componentId === component.id);
  const checks = runtimeChecks.filter(rule => rule.categories.includes(component.category));
  const missing = [...new Set(checks.flatMap(rule => rule.fields[component.category]))].filter(key => component.specs[key] === undefined || component.specs[key] === null);
  const imagePath = component.image?.url?.startsWith('/') ? `frontend/public${component.image.url}` : null;
  const imageExists = imagePath ? fs.existsSync(path.join(root, imagePath)) : false;
  const links = purchaseLinks.filter(link => link.componentId === component.id);
  const conflicts = Object.entries(aliases[component.category]).flatMap(([specKey, parameterKey]) => component.specs[specKey] !== undefined && p?.[parameterKey] !== undefined && JSON.stringify(component.specs[specKey]) !== JSON.stringify(p[parameterKey]) ? [{ specKey, parameterKey, componentValue: component.specs[specKey], performanceValue: p[parameterKey] }] : []);
  const witness = findWitness(component);
  const sourceLine = read('src/data/components.mock.js').split('\n').findIndex(line => line.includes(`id: '${component.id}'`)) + 1;
  return {
    id: component.id,
    fullName: component.name,
    manufacturer: component.brand,
    manufacturerBasis: 'Campo brand do mock; identidade de fabricante/SKU não verificada externamente nesta auditoria.',
    category: component.category,
    active: component.active !== false,
    specs: component.specs,
    partNumber: component.partNumber ?? null,
    specificationSourceUrl: component.specSourceUrl ?? null,
    externalSpecificationVerifiedInThisAudit: false,
    referencePrice: { amount: component.price, currency: 'BRL', basis: 'Referência estática do catálogo mockado; não é cotação atual.', observedAt: null, source: `src/data/components.mock.js:${sourceLine}` },
    image: { presentInRecord: Boolean(component.image), publicPath: component.image?.url ?? null, repositoryPath: imagePath, physicallyExists: imageExists, byteSize: imageExists ? fs.statSync(path.join(root, imagePath)).size : null, sha256: imageExists ? sha(fs.readFileSync(path.join(root, imagePath))) : null, metadata: component.image ?? null },
    compatibilityRuleStatus: {
      status: missing.length ? 'missing_runtime_fields' : 'runtime_fields_present',
      runtimeCheckIds: checks.map(rule => rule.id),
      requiredSpecFields: [...new Set(checks.flatMap(rule => rule.fields[component.category]))],
      missingSpecFields: missing,
      relatedDeclarativeRuleIds: compatibilityRules.filter(rule => rule.sourceType === component.category || rule.targetType === component.category).map(rule => rule.id),
      declarativeRulesExecuteInCompatibilityService: false,
      hasCompatibleCompleteBuildInCurrentCatalog: Boolean(witness),
      compatibleBuildWitness: witness,
      witnessMethod: 'Busca local finita com filtros das seis regras atuais; cada testemunha confirmada por checkBuildCompatibility. Não implica validação física de hardware.',
      note: witness ? 'Compatibilidade depende do conjunto escolhido e está limitada às seis verificações implementadas.' : 'Nenhuma build completa atende às seis verificações no catálogo atual; não é ausência de cadastro de regra.'
    },
    performance: { recordPresent: Boolean(p), categoryMatches: p?.type === component.category, parameters: p ?? null, comparedDuplicateFields: Object.entries(aliases[component.category]).filter(([a,b]) => component.specs[a] !== undefined && p?.[b] !== undefined).map(([specKey, parameterKey]) => ({ specKey, parameterKey })), duplicateFieldConflicts: conflicts, evidence: 'Scores e parâmetros de simulação internos; sem benchmark medido ou calibração externa nesta auditoria.' },
    purchaseLinks: { count: links.length, availabilityStatuses: [...new Set(links.map(l => l.availabilityStatus))], recordedUpdateDates: [...new Set(links.map(l => l.lastUpdated))], pricesMatchCatalog: links.every(l => l.price === component.price), links },
    source: { path: 'src/data/components.mock.js', line: sourceLine }
  };
});
function walk(dir) {
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`]);
}
const jsFiles = walk('src').filter(p => p.endsWith('.js'));
const importGraph = Object.fromEntries(jsFiles.map(file => [file, [...read(file).matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m => m[1]).filter(p => p.startsWith('.')).map(p => path.posix.normalize(path.posix.join(path.posix.dirname(file), p)))]));
const criticalSources = ['src/data/components.mock.js', 'src/data/performanceParameters.js', 'src/data/compatibility-rules.mock.js', 'src/data/purchaseLinks.js', 'src/services/compatibility.service.js', 'src/services/recommendationService.js', 'src/services/bottleneck.service.js'];
const packageJson = JSON.parse(read('package.json'));
const packageLock = JSON.parse(read('package-lock.json'));
const trackedInputs = [...new Set([...criticalSources, 'src/models/component.model.js', 'src/models/performanceParameterModel.js', 'src/services/admin-component.service.js', 'src/utils/performance-score-utils.js', 'src/utils/performanceSimulationUtils.js', 'src/utils/costBenefitUtils.js', 'src/utils/usageTypeWeights.js', 'src/data/games.js', 'src/data/professionalSoftware.js', 'src/data/readyBuilds.js', 'package.json', 'package-lock.json'])];
const noWitness = entries.filter(e => !e.compatibilityRuleStatus.hasCompatibleCompleteBuildInCurrentCatalog).map(e => e.id);
const inventory = {
  schemaVersion: 1,
  title: 'PCPowerLab RA2 V2 — inventário verificável do baseline',
  auditDateUtc: '2026-10-08',
  baseline: { commit: git('rev-parse', 'HEAD'), branchObserved: git('branch', '--show-current'), sourceOfTruth: 'Imports ES Modules do checkout local no commit registrado; nenhuma contagem copiada do README.', methodology: 'Registro completo extraído dos mocks, existência e hash de imagens locais, junções por ID, dependências por imports e testemunhas executadas no serviço de compatibilidade. Sem alterar código da aplicação ou fazer commit.', runtime: process.version },
  limitations: ['Dados do próprio repositório; nomes, fabricantes, especificações e imagens não foram certificados junto aos fabricantes.', 'Preços são referências estáticas em BRL, sem data de cotação no componente. Datas dos links são rótulos do mock, não consulta ao estoque.', 'Scores/FPS são heurísticos, não benchmarks medidos; nenhuma evidência de usuários foi criada ou presumida.', 'Inventário é um snapshot gerado do estado atual; reexecutar a extração após alterações no catálogo.', 'Presença física de imagem não significa validação visual ou jurídica de seu conteúdo.'],
  counts: { components: components.length, activeComponents: entries.filter(e => e.active).length, categories: Object.fromEntries(componentCategories.map(c => [c, byCategory[c].length])), performanceRecords: performanceParameters.length, performanceCoverage: entries.filter(e => e.performance.recordPresent).length, declarativeRules: compatibilityRules.length, activeDeclarativeRules: compatibilityRules.filter(r => r.active).length, implementedRuntimeChecks: runtimeChecks.length, imageReferences: entries.filter(e => e.image.presentInRecord).length, existingReferencedImages: entries.filter(e => e.image.physicallyExists).length, missingReferencedImages: entries.filter(e => e.image.presentInRecord && !e.image.physicallyExists).length, componentsWithoutImage: entries.filter(e => !e.image.presentInRecord).length, componentsWithPartNumber: entries.filter(e => e.partNumber).length, componentsWithSpecificationSource: entries.filter(e => e.specificationSourceUrl).length, games: games.length, professionalSoftware: professionalSoftware.length, readyBuilds: readyBuilds.length, generatedPurchaseLinks: purchaseLinks.length, componentsWithCompatibleCompleteBuild: entries.length - noWitness.length },
  integrity: { duplicateComponentIds: components.filter((c, i) => components.findIndex(a => a.id === c.id) !== i).map(c => c.id), duplicatePerformanceComponentIds: performanceParameters.filter((p,i) => performanceParameters.findIndex(a => a.componentId === p.componentId) !== i).map(p => p.componentId), missingPerformanceIds: entries.filter(e => !e.performance.recordPresent).map(e => e.id), orphanPerformanceIds: performanceParameters.filter(p => !components.some(c => c.id === p.componentId)).map(p => p.componentId), categoryMismatches: entries.filter(e => !e.performance.categoryMatches).map(e => e.id), missingRuntimeSpecFields: entries.filter(e => e.compatibilityRuleStatus.missingSpecFields.length).map(e => ({ id: e.id, fields: e.compatibilityRuleStatus.missingSpecFields })), duplicateSpecPerformanceConflicts: entries.filter(e => e.performance.duplicateFieldConflicts.length).map(e => ({ id: e.id, conflicts: e.performance.duplicateFieldConflicts })), noCompatibleCompleteBuildComponentIds: noWitness },
  compatibility: { requiredSlots: requiredBuildSlots, optionalSlots: [], scope: 'Um componente de cada uma das sete categorias; GPU discreta obrigatória, sem categoria de cooler nem seleção de múltiplos módulos/unidades.', declarativeRulesConsumedByRuntime: false, declarativeRules: compatibilityRules, runtimeChecks, ruleMutationProbe: { evidenceType: 'historical_audit_probe_not_rerun_by_generator', testedSourceCommit: 'd433bf930d7373eec073921427e146bc8c173f26', isolatedProcessOnly: true, action: 'updateCompatibilityRule(id, {active:false}) em todas as cinco regras', beforeAlertCodes: ['CPU_MOTHERBOARD_SOCKET_INCOMPATIBLE'], afterAlertCodes: ['CPU_MOTHERBOARD_SOCKET_INCOMPATIBLE'], conclusion: 'active, priority, operator e demais valores dos registros não governam checkBuildCompatibility.' }, schemaProbe: { evidenceType: 'historical_audit_probe_not_rerun_by_generator', testedSourceCommit: 'd433bf930d7373eec073921427e146bc8c173f26', isolatedProcessOnly: true, action: 'Criar placa-mãe com socket/memoryType/formFactor/chipset e sem storageInterfaces; passar a checkBuildCompatibility.', createAccepted: true, error: 'TypeError', message: "Cannot read properties of undefined (reading 'includes')", cause: 'storageInterfaces é usado pelo verificador, mas não consta dos campos obrigatórios do serviço administrativo.' } },
  performanceAndRecommendations: { bottleneckThresholds, consumptionFormula: 'performanceParameters.cpu.tdp + performanceParameters.gpu.tdp + 100', gameFormula: 'max(1, round(baseFpsReference * weightedPerformanceIndex / 100 * resolutionMultiplier * qualityMultiplier * bottleneckPenalty))', gameWeights: { gpu: 0.5, cpu: 0.3, ram: 0.15, storage: 0.05 }, resolutionMultipliers: { '1080p': 1, '1440p': 0.75, '4k': 0.55 }, qualityMultipliers: { low: 1.15, medium: 1, high: 0.9, ultra: 0.78 }, requirementRatioCap: 120, gameComparisonLimit: { min: 2, max: 10 }, partialGameSimulationRequiredSlots: ['cpu', 'gpu', 'ram', 'storage'], partialGameSimulationUsesBottleneckPenalty: false, professionalSoftwareCount: professionalSoftware.length, professionalSoftwareMethod: 'Soma ponderada de razões de requisitos recomendados (razão limitada a 120); score final inteiro entre 0 e 100.', supportedUsageTypes, usageSlotWeights, recommendationPriorities: ['cost-benefit', 'performance', 'lowest-price', 'balanced'], recommendationPool: { positivePriceRequired: true, minimumPerformanceScore: 40, preferredPerSlot: 5, cheapestPerSlot: 3, topPerformancePerSlot: '4 para prioridade performance; 2 nas demais', deduplicated: true }, recommendationsByBudgetRangeLimit: 3, recommendationIsGlobalCatalogOptimum: false, missingPerformanceFallbackScoreInCostBenefit: 50, limitations: ['FPS usa índices fixos por jogo e multiplicadores comuns; não há dataset de benchmarks ou intervalo de confiança.', 'Gargalo é diferença absoluta de scores, sem modelar carga específica, resolução ou limites de API gráfica.', 'GPU é exigida em qualquer finalidade, inclusive study/general/programming.', 'Recomendação poda candidatos por slot antes de buscar combinações; não garante a melhor combinação do catálogo inteiro.', 'A heurística da fonte na compatibilidade difere da soma CPU+GPU+100 usada na análise de consumo.', 'Componentes e performanceParameters são cadastros separados; novo componente não recebe automaticamente parâmetros de desempenho.', 'Links de compra são gerados uma vez na importação; CRUD posterior do catálogo não regenera preços/links nesta estrutura.'] },
  dependencies: { sourceFiles: Object.fromEntries(criticalSources.map(source => [source, Object.entries(importGraph).filter(([,dependencies]) => dependencies.includes(source)).map(([file]) => file)])), backendRuntimePackages: Object.fromEntries(Object.entries(packageJson.dependencies).map(([name, declared]) => [name, { declared, locked: packageLock.packages[`node_modules/${name}`]?.version ?? null }])), backendDevPackages: Object.fromEntries(Object.entries(packageJson.devDependencies).map(([name, declared]) => [name, { declared, locked: packageLock.packages[`node_modules/${name}`]?.version ?? null }])), database: null, persistence: 'Arrays/Maps do processo; reiniciam com o servidor.', externalPriceOrBenchmarkApis: [], imageHosting: 'frontend/public/images/components', adminAuthentication: 'Sessão em memória via cookie; rotas admin/components, compatibility-rules e performance-parameters protegidas em src/app.js.' },
  verification: { focusedBackendTests: { evidenceType: 'historical_audit_execution_not_rerun_by_generator', executedDateUtc: '2026-10-08', testedSourceCommit: 'd433bf930d7373eec073921427e146bc8c173f26', logSha256: sha(fs.readFileSync(path.join(root, 'docs/evidence/ra2-v2-baseline/backend-focused-tests.log'))), passed: 92, failed: 0, skipped: 0, durationMs: 1548.740033, log: 'docs/evidence/ra2-v2-baseline/backend-focused-tests.log', files: ['tests/component.service.test.js', 'tests/admin-component.service.test.js', 'tests/compatibility.service.test.js', 'tests/compatibility-rule.service.test.js', 'tests/bottleneck.service.test.js', 'tests/performanceParameters.test.js', 'tests/gamePerformance.test.js', 'tests/professionalSoftware.test.js', 'tests/catalog-expansion.test.js', 'tests/dataIntegrity.test.js', 'tests/recommendation.test.js', 'tests/recommendationByUsage.test.js', 'tests/recommendationBuildsByBudgetRange.test.js', 'tests/purchaseLinks.test.js'] }, coverageLimits: ['Estes 92 testes focados não equivalem a toda a suíte ou QA de UI.', 'Testes de regras existentes cobrem CRUD; o desacoplamento do motor foi verificado por probe isolado nesta auditoria.', 'Nenhum teste comprova desempenho/FPS físico, preço vivo ou compatibilidade além das seis regras.'] },
  sourceHashes: Object.fromEntries(trackedInputs.map(p => [p, sha(fs.readFileSync(path.join(root, p)))])),
  components: entries
};
fs.writeFileSync(path.join(root, 'docs/RA2-V2-INVENTARIO.json'), `${JSON.stringify(inventory, null, 2)}\n`);
const table = entries.map(e => `| ${e.id} | ${e.fullName} | ${e.manufacturer} | ${e.category} | ${JSON.stringify(e.specs)} | ${e.referencePrice.amount.toFixed(2)} | ${e.image.physicallyExists ? e.image.repositoryPath : 'Sem imagem'} | ${e.compatibilityRuleStatus.hasCompatibleCompleteBuildInCurrentCatalog ? 'Campos completos; há build válida*' : 'Campos completos; nenhuma build válida*'} |`).join('\n');
const report = `# Auditoria de baseline: catálogo/backend PCPowerLab V2

Commit auditado: \`${inventory.baseline.commit}\` · branch observada: \`${inventory.baseline.branchObserved}\` · 2026-10-08 UTC.

## Resultado

- 69 componentes ativos: 12 CPUs, 9 placas-mãe, 11 GPUs, 11 RAMs, 11 armazenamentos, 8 fontes e 7 gabinetes. 69 registros de desempenho, 20 jogos, 12 softwares, 9 builds prontas e 345 links de busca.
- 2 imagens referenciadas e fisicamente presentes; 67 componentes sem imagem. Não há caminho de imagem quebrado entre as referências atuais. São JPEGs locais de 960×370 e 960×343; metadados de licença/atribuição constam dos registros e de frontend/public/images/components/ATTRIBUTION.md.
- 6 componentes têm partNumber e URL técnica cadastrados; URLs/especificações não foram verificadas externamente nesta auditoria. O campo fabricante abaixo reproduz brand; não certifica fabricante de placa/SKU.
- Evidência histórica de 2026-10-08, commit d433bf9 (o gerador não reexecuta testes): 92 testes focados executados: 92 passaram, zero falhas/skips, 1.55 s. Log: docs/evidence/ra2-v2-baseline/backend-focused-tests.log.
- IDs únicos, 100% de cobertura de performanceParameters, sem campos obrigatórios de runtime ausentes e sem divergência nos campos duplicados efetivamente comparáveis.
- ${inventory.counts.componentsWithCompatibleCompleteBuild}/69 componentes participam de ao menos uma build completa aceita pelo serviço atual. Exceção: ${noWitness.join(', ')}. A fonte de 400 W não alcança sequer o mínimo CPU+350 do catálogo (menor TDP cadastrado: 58 W, mínimo de 408 W).

## Limites verificados que a V2 precisa explicitar

1. **Regras editáveis não executam no motor.** Há 5 registros CRUD, mas 6 verificações fixas no serviço. Em um processo isolado, desativar todas as regras manteve o alerta de socket. A regra de armazenamento só existe em código. Fonte: src/services/compatibility.service.js; src/services/compatibility-rule.service.js.
2. **Contrato administrativo incompleto.** Uma placa-mãe sem storageInterfaces é aceita no cadastro e causa TypeError ao verificar armazenamento. Reproduzido só em memória, sem alterar mocks. Fonte: src/services/admin-component.service.js:requiredSpecFieldsByCategory versus validateStorageAndMotherboard.
3. **Cobertura de compatibilidade limitada.** Socket; tipo DDR; interface de armazenamento; potência da fonte por max(GPU recomendada, CPU TDP+350); formato da placa-mãe; comprimento da GPU. Não há validação de BIOS/geração, DIMM/slots/QVL, cooler, radiador, conectores de energia, largura/altura da GPU, portas/pistas disponíveis ou qualidade elétrica. Sete slots obrigatórios, exatamente uma peça por categoria; nenhuma categoria de cooler e GPU sempre exigida.
4. **Simulação não é benchmark.** Scores internos 0–100 alimentam gargalo por diferença (médio >15; alto >30), FPS ponderado (GPU 50%, CPU 30%, RAM 15%, armazenamento 5%) e fatores fixos de resolução/qualidade. Consumo de gargalo = CPU TDP+GPU TDP+100, fórmula diferente da compatibilidade. Simulação parcial de quatro slots não aplica penalidade de gargalo. Nenhuma calibração/medição real foi produzida.
5. **Recomendação é heurística.** Só candidatos com preço positivo e score ≥40 entram. Pool por slot combina top 5, 3 mais baratos e top desempenho (4 ou 2), removendo duplicatas. Busca aplica as seis regras fixas e limites de orçamento, retorna uma build ou até três por faixa; não garante ótimo global. Score ausente pode virar fallback 50 no custo-benefício.
6. **Dados e vínculos vivem em memória.** Catálogo, parâmetros e regras são registros separados; criar componente não cria performance. Os 345 links são buscas em cinco lojas, todos unknown, com preço do mock e rótulo lastUpdated=2026-05-22. Geração acontece na importação, sem sincronização automática com CRUD posterior. Não representam cotação/estoque vivo. Há sessão administrativa em memória; README está desatualizado ao afirmar ausência de autenticação.
7. **Documentação antiga não serve de contagem.** README ainda informa 63 componentes, 63 parâmetros e 315 links; os imports atuais resultam em 69/69/345. Inventário JSON usa os dados reais do commit.

## Dependências e evidência

- Fonte de catálogo: src/data/components.mock.js → component.repository.js → component.service.js/admin-component.service.js. Desempenho: performanceParameters.js → performance-parameter.repository.js → performanceParametersService.js.
- Compatibilidade alimenta alertas, correções, resumos, scores, revalidação e recomendações. Gargalos/simulações dependem também de performanceParameters. Identidade de peças é vinculada por id/componentId.
- Backend direto: ${Object.entries(inventory.dependencies.backendRuntimePackages).map(([n,v]) => `${n} ${v.locked} (declara ${v.declared})`).join('; ')}. ESLint ${inventory.dependencies.backendDevPackages.eslint.locked}. Sem banco, API de preços ou API de benchmarks.
- Inventário completo: docs/RA2-V2-INVENTARIO.json. Inclui especificações, preço de referência, imagem com caminho/hash/existência, checks por categoria, regras declarativas relacionadas, testemunha de build, performance completa, links e hashes das fontes. Gerador desta auditoria: docs/evidence/ra2-v2-baseline/generate-backend-inventory.mjs.
- Limite de evidência: leitura e execução local de serviços/testes. Nenhuma conclusão sobre experiência de usuários, desempenho físico, autenticidade visual das fotos ou preço atual.

## Inventário completo resumido

*“Build válida” significa somente aprovação das seis verificações implementadas no baseline; a testemunha exata está no JSON. Todos os registros declarativos estão ativos, mas não governam o motor. Preços em BRL são referências do mock.*

| ID | Nome completo cadastrado | Fabricante/brand | Categoria | Especificações cadastradas | Preço ref. BRL | Imagem física/caminho | Estado de regras/compatibilidade |
|---|---|---|---|---|---:|---|---|
${table}
`;
fs.writeFileSync(path.join(root, 'docs/RA2-V2-AUDITORIA-BACKEND.md'), report);
console.log(JSON.stringify({ output: 'docs/RA2-V2-INVENTARIO.json', report: 'docs/RA2-V2-AUDITORIA-BACKEND.md', counts: inventory.counts, integrity: inventory.integrity }, null, 2));
