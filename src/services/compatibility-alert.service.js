import { checkBuildCompatibility } from './compatibility.service.js';

const alertTemplates = {
  CPU_MOTHERBOARD_SOCKET_INCOMPATIBLE: {
    title: 'Processador incompativel com a placa-mae',
    components: ['cpu', 'motherboard'],
    suggestion: 'Verifique se o processador e a placa-mae usam o mesmo socket.',
    blocking: true,
    buildMessage: (_issue, build) => (
      `O processador ${build.cpu.name} usa socket ${build.cpu.specs.socket}, mas a placa-mae ${build.motherboard.name} usa socket ${build.motherboard.specs.socket}. Escolha uma placa-mae compativel com esse processador ou selecione outro processador.`
    )
  },
  RAM_MOTHERBOARD_TYPE_INCOMPATIBLE: {
    title: 'Memoria RAM incompativel com a placa-mae',
    components: ['ram', 'motherboard'],
    suggestion: 'Use uma memoria do mesmo tipo aceito pela placa-mae, como DDR4 ou DDR5.',
    blocking: true,
    buildMessage: (_issue, build) => (
      `A memoria ${build.ram.name} e do tipo ${build.ram.specs.memoryType}, mas a placa-mae ${build.motherboard.name} aceita ${build.motherboard.specs.memoryType}. Troque a memoria ou escolha uma placa-mae compativel.`
    )
  },
  STORAGE_INTERFACE_INCOMPATIBLE: {
    title: 'Armazenamento sem interface compativel',
    components: ['storage', 'motherboard'],
    suggestion: 'Confira se a placa-mae possui suporte para a interface do armazenamento escolhido.',
    blocking: true,
    buildMessage: (_issue, build) => (
      `O armazenamento ${build.storage.name} usa interface ${build.storage.specs.interface}, mas a placa-mae ${build.motherboard.name} nao informa suporte para essa interface. Escolha outro armazenamento ou uma placa-mae com a interface adequada.`
    )
  },
  PSU_POWER_BELOW_RECOMMENDED: {
    title: 'Fonte com potencia insuficiente',
    components: ['psu', 'cpu', 'gpu'],
    suggestion: 'Escolha uma fonte com potencia igual ou superior ao recomendado para a placa de video e o conjunto.',
    blocking: true,
    buildMessage: (_issue, build) => (
      `A fonte ${build.psu.name} possui ${build.psu.specs.watts}W, mas a configuracao pede uma fonte mais forte para trabalhar com seguranca. Uma fonte abaixo do recomendado pode causar desligamentos ou instabilidade.`
    )
  },
  CASE_MOTHERBOARD_FORM_FACTOR_INCOMPATIBLE: {
    title: 'Gabinete incompativel com a placa-mae',
    components: ['case', 'motherboard'],
    suggestion: 'Escolha um gabinete que suporte o formato da placa-mae selecionada.',
    blocking: true,
    buildMessage: (_issue, build) => (
      `O gabinete ${build.case.name} nao suporta placa-mae no formato ${build.motherboard.specs.formFactor}. Troque o gabinete ou selecione uma placa-mae em um formato aceito.`
    )
  },
  CASE_GPU_LENGTH_INCOMPATIBLE: {
    title: 'Placa de video grande demais para o gabinete',
    components: ['gpu', 'case'],
    suggestion: 'Compare o comprimento da placa de video com o limite maximo informado pelo gabinete.',
    blocking: true,
    buildMessage: (_issue, build) => (
      `A placa de video ${build.gpu.name} tem ${build.gpu.specs.lengthMm}mm, mas o gabinete ${build.case.name} suporta ate ${build.case.specs.maxGpuLengthMm}mm. Escolha uma GPU menor ou um gabinete com mais espaco interno.`
    )
  },
  REQUIRED_COMPONENT_MISSING: {
    title: 'Componente obrigatorio ausente',
    components: [],
    suggestion: 'Complete todos os componentes principais antes de verificar a compatibilidade.',
    blocking: true,
    buildMessage: (issue) => issue.message || 'A configuracao esta incompleta.'
  }
};

export function checkBuildCompatibilityAlerts(selectedComponents) {
  const compatibilityResult = checkBuildCompatibility(selectedComponents);

  return {
    compatible: compatibilityResult.compatible,
    status: compatibilityResult.status,
    unverifiedChecks: compatibilityResult.unverifiedChecks ?? [],
    coolingPower: compatibilityResult.coolingPower,
    coolingAssessment: compatibilityResult.coolingAssessment,
    alerts: generateCompatibilityAlerts(compatibilityResult),
    issues: compatibilityResult.alerts,
    selectedComponents: compatibilityResult.selectedComponents,
    estimatedPrice: compatibilityResult.estimatedPrice,
    pricing: compatibilityResult.pricing
  };
}

export function generateCompatibilityAlerts(compatibilityResult) {
  const issues = [...(compatibilityResult.alerts ?? compatibilityResult.issues ?? []), ...(compatibilityResult.unverifiedChecks ?? [])];

  return issues.map((issue) => formatCompatibilityAlert(issue, compatibilityResult.selectedComponents));
}

export function generateMissingComponentAlerts(error) {
  const missingComponents = (error.errors ?? []).map((message) => {
    const [, componentSlot] = message.match(/ausente: ([^.]+)\./) ?? [];

    return componentSlot;
  }).filter(Boolean);

  return missingComponents.map((componentSlot) => formatCompatibilityAlert({
    code: 'REQUIRED_COMPONENT_MISSING',
    severity: 'high',
    message: `O componente ${componentSlot} ainda nao foi selecionado.`,
    components: [componentSlot]
  }));
}

function formatCompatibilityAlert(issue, build = {}) {
  const template = alertTemplates[issue.code] ?? buildDefaultTemplate(issue);
  const components = issue.components ?? template.components;

  return {
    code: issue.code,
    title: template.title,
    message: template.buildMessage(issue, build),
    severity: issue.severity,
    blocking: template.blocking || issue.severity === 'high',
    components,
    suggestion: template.suggestion
  };
}

function buildDefaultTemplate(issue) {
  return {
    title: 'Atencao na compatibilidade',
    components: [],
    suggestion: 'Revise os componentes selecionados antes de finalizar a configuracao.',
    blocking: issue.severity === 'high',
    buildMessage: () => issue.message || 'Foi identificado um ponto de atencao na configuracao.'
  };
}