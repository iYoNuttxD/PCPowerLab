import { findComponentById } from './component.service.js';

const requiredBuildSlots = ['cpu', 'motherboard', 'gpu', 'ram', 'storage', 'psu', 'case'];

export function checkBuildCompatibility(selectedComponents) {
  validateSelectedComponents(selectedComponents);

  const build = mapSelectedComponents(selectedComponents);
  const alerts = [];

  validateCpuAndMotherboard(build, alerts);
  validateRamAndMotherboard(build, alerts);
  validateStorageAndMotherboard(build, alerts);
  validatePsu(build, alerts);
  validateCase(build, alerts);

  return {
    compatible: alerts.length === 0,
    alerts,
    selectedComponents: build,
    estimatedPrice: calculateEstimatedPrice(build)
  };
}

function validateSelectedComponents(selectedComponents) {
  if (!selectedComponents || typeof selectedComponents !== 'object') {
    const error = new Error('Informe os componentes da configuração.');
    error.statusCode = 400;
    throw error;
  }

  const missingSlots = requiredBuildSlots.filter((slot) => !selectedComponents[slot]);

  if (missingSlots.length > 0) {
    const error = new Error('Configuração incompleta.');
    error.statusCode = 400;
    error.errors = missingSlots.map((slot) => `Componente obrigatório ausente: ${slot}.`);
    throw error;
  }
}

function mapSelectedComponents(selectedComponents) {
  const build = {};

  for (const slot of requiredBuildSlots) {
    const component = findComponentById(selectedComponents[slot]);

    if (!component) {
      const error = new Error('Um ou mais componentes não foram encontrados.');
      error.statusCode = 404;
      error.errors = [`Componente não encontrado para ${slot}: ${selectedComponents[slot]}.`];
      throw error;
    }

    if (component.category !== slot) {
      const error = new Error('Componente selecionado em categoria incorreta.');
      error.statusCode = 400;
      error.errors = [`O componente ${component.name} não pertence à categoria ${slot}.`];
      throw error;
    }

    build[slot] = component;
  }

  return build;
}

function validateCpuAndMotherboard(build, alerts) {
  if (build.cpu.specs.socket !== build.motherboard.specs.socket) {
    alerts.push({
      code: 'CPU_MOTHERBOARD_SOCKET_INCOMPATIBLE',
      severity: 'high',
      message: `O processador usa socket ${build.cpu.specs.socket}, mas a placa-mãe usa socket ${build.motherboard.specs.socket}.`
    });
  }
}

function validateRamAndMotherboard(build, alerts) {
  if (build.ram.specs.memoryType !== build.motherboard.specs.memoryType) {
    alerts.push({
      code: 'RAM_MOTHERBOARD_TYPE_INCOMPATIBLE',
      severity: 'high',
      message: `A memória selecionada é ${build.ram.specs.memoryType}, mas a placa-mãe aceita ${build.motherboard.specs.memoryType}.`
    });
  }
}

function validateStorageAndMotherboard(build, alerts) {
  const supportedInterfaces = build.motherboard.specs.storageInterfaces;

  if (!supportedInterfaces.includes(build.storage.specs.interface)) {
    alerts.push({
      code: 'STORAGE_INTERFACE_INCOMPATIBLE',
      severity: 'medium',
      message: `O armazenamento usa interface ${build.storage.specs.interface}, mas a placa-mãe não possui suporte para essa interface.`
    });
  }
}

function validatePsu(build, alerts) {
  const cpuTdp = build.cpu.specs.tdpWatts || 0;
  const gpuRecommendedPsu = build.gpu.specs.recommendedPsuWatts || 0;
  const minimumRecommended = Math.max(gpuRecommendedPsu, cpuTdp + 350);

  if (build.psu.specs.watts < minimumRecommended) {
    alerts.push({
      code: 'PSU_POWER_BELOW_RECOMMENDED',
      severity: 'high',
      message: `A fonte selecionada possui ${build.psu.specs.watts}W, mas a configuração recomenda pelo menos ${minimumRecommended}W.`
    });
  }
}

function validateCase(build, alerts) {
  const supportedFormFactors = build.case.specs.supportedFormFactors;

  if (!supportedFormFactors.includes(build.motherboard.specs.formFactor)) {
    alerts.push({
      code: 'CASE_MOTHERBOARD_FORM_FACTOR_INCOMPATIBLE',
      severity: 'medium',
      message: `O gabinete não suporta placa-mãe no formato ${build.motherboard.specs.formFactor}.`
    });
  }

  if (build.gpu.specs.lengthMm > build.case.specs.maxGpuLengthMm) {
    alerts.push({
      code: 'CASE_GPU_LENGTH_INCOMPATIBLE',
      severity: 'medium',
      message: `A placa de vídeo possui ${build.gpu.specs.lengthMm}mm, mas o gabinete suporta até ${build.case.specs.maxGpuLengthMm}mm.`
    });
  }
}

function calculateEstimatedPrice(build) {
  return Object.values(build).reduce((total, component) => total + component.price, 0);
}
