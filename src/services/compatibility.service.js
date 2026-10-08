import { selectBuildComponents } from './build.service.js';
import { summarizeBuildPricing } from './marketPriceService.js';
import { checkCoolingCompatibility, getCoolingPower } from './cooling.service.js';
import { isNonEmptyTextArray } from '../models/component.model.js';
import { supplementalCompatibilityEvidence } from '../data/market-compatibility-evidence.js';

export function checkBuildCompatibility(selectedComponents) {
  const build = selectBuildComponents(selectedComponents);
  const pricing = summarizeBuildPricing(build);
  return { ...evaluateResolvedBuildCompatibility(build), selectedComponents: build,
    coolingPower: getCoolingPower(build), estimatedPrice: pricing.estimatedTotal, pricing };
}

// Shared by full-build validation and catalog previews; missing inputs stay unverified.
export function evaluateResolvedBuildCompatibility(selectedBuild) {
  const build = { ...selectedBuild };
  for (const slot of ['cpu', 'motherboard', 'gpu', 'ram', 'storage', 'psu', 'case']) {
    if (!build[slot]) build[slot] = { specs: {} };
  }
  const caseEvidence = supplementalCompatibilityEvidence(build.case);
  if (caseEvidence) build.case = { ...build.case, specs: { ...caseEvidence.specs, ...build.case.specs } };
  const { alerts, unverifiedChecks } = checkCoolingCompatibility(build);
  validateCpuAndMotherboard(build, alerts, unverifiedChecks);
  validateRamAndMotherboard(build, alerts, unverifiedChecks);
  validateStorageAndMotherboard(build, alerts, unverifiedChecks);
  validateReplacementDependencies(build, alerts, unverifiedChecks);
  validateReplacementPowerAndFit(build, alerts, unverifiedChecks);
  validatePsu(build, alerts, unverifiedChecks);
  validateCase(build, alerts, unverifiedChecks);
  const status = alerts.length ? 'incompatible' : unverifiedChecks.length ? 'unverified' : 'compatible';
  return { compatible: status === 'compatible', status, alerts, unverifiedChecks,
    ...(caseEvidence ? { verificationSources: [{ componentId: build.case.id,
      sourceUrl: caseEvidence.sourceUrl, verifiedAt: caseEvidence.verifiedAt, note: caseEvidence.note }] } : {}) };
}

function validateCpuAndMotherboard(build, alerts, unverifiedChecks) {
  if (!build.cpu.specs.socket || !build.motherboard.specs.socket) {
    unverifiedChecks.push({ code: 'CPU_SOCKET_UNVERIFIED', severity: 'medium', verification: 'unverified', message: 'Socket de CPU ou placa-mae nao informado.' });
    return;
  }
  if (build.cpu.specs.socket !== build.motherboard.specs.socket) {
    alerts.push({
      code: 'CPU_MOTHERBOARD_SOCKET_INCOMPATIBLE',
      severity: 'high',
      message: `O processador usa socket ${build.cpu.specs.socket}, mas a placa-mãe usa socket ${build.motherboard.specs.socket}.`
    });
  }
}

function validateRamAndMotherboard(build, alerts, unverifiedChecks) {
  if (!build.ram.specs.memoryType || !build.motherboard.specs.memoryType) {
    unverifiedChecks.push({ code: 'RAM_TYPE_UNVERIFIED', severity: 'medium', verification: 'unverified', message: 'Tipo de memoria nao informado.' });
    return;
  }
  if (build.ram.specs.memoryType !== build.motherboard.specs.memoryType) {
    alerts.push({
      code: 'RAM_MOTHERBOARD_TYPE_INCOMPATIBLE',
      severity: 'high',
      message: `A memória selecionada é ${build.ram.specs.memoryType}, mas a placa-mãe aceita ${build.motherboard.specs.memoryType}.`
    });
  }
}

function validateStorageAndMotherboard(build, alerts, unverifiedChecks) {
  const supportedInterfaces = build.motherboard.specs.storageInterfaces;

  if (!isNonEmptyTextArray(supportedInterfaces) || !build.storage.specs.interface) {
    unverifiedChecks.push({ code: 'STORAGE_INTERFACE_UNVERIFIED', severity: 'medium', verification: 'unverified', message: 'Interfaces de armazenamento nao verificadas.' });
    return;
  }

  if (!supportedInterfaces.includes(build.storage.specs.interface)) {
    alerts.push({
      code: 'STORAGE_INTERFACE_INCOMPATIBLE',
      severity: 'medium',
      message: `O armazenamento usa interface ${build.storage.specs.interface}, mas a placa-mãe não possui suporte para essa interface.`
    });
  }
}

function validatePsu(build, alerts, unverifiedChecks) {
  if (![build.cpu.specs.tdpWatts, build.gpu.specs.recommendedPsuWatts, build.psu.specs.watts].every((v) => Number.isFinite(v) && v >= 0)) {
    unverifiedChecks.push({ code: 'PSU_POWER_UNVERIFIED', severity: 'medium', verification: 'unverified', message: 'Dados de potencia insuficientes para verificar a fonte.' });
    return;
  }
  const cpuTdp = build.cpu.specs.tdpWatts || 0;
  const gpuRecommendedPsu = build.gpu.specs.recommendedPsuWatts || 0;
  const minimumRecommended = Math.max(gpuRecommendedPsu, cpuTdp + 350) + getCoolingPower(build).knownWatts;

  if (build.psu.specs.watts < minimumRecommended) {
    alerts.push({
      code: 'PSU_POWER_BELOW_RECOMMENDED',
      severity: 'high',
      message: `A fonte selecionada possui ${build.psu.specs.watts}W, mas a configuração recomenda pelo menos ${minimumRecommended}W.`
    });
  }
}

function validateCase(build, alerts, unverifiedChecks) {
  const supportedFormFactors = build.case.specs.supportedFormFactors;

  if (!isNonEmptyTextArray(supportedFormFactors) || !build.motherboard.specs.formFactor) {
    unverifiedChecks.push({ code: 'CASE_FORM_FACTOR_UNVERIFIED', severity: 'medium', verification: 'unverified', message: 'Formatos de placa-mae suportados nao verificados.' });
  } else if (!supportedFormFactors.includes(build.motherboard.specs.formFactor)) {
    alerts.push({
      code: 'CASE_MOTHERBOARD_FORM_FACTOR_INCOMPATIBLE',
      severity: 'medium',
      message: `O gabinete não suporta placa-mãe no formato ${build.motherboard.specs.formFactor}.`
    });
  }

  if (![build.gpu.specs.lengthMm, build.case.specs.maxGpuLengthMm].every((v) => Number.isFinite(v) && v > 0)) {
    unverifiedChecks.push({ code: 'CASE_GPU_LENGTH_UNVERIFIED', severity: 'medium', verification: 'unverified', message: 'Comprimento da GPU ou limite do gabinete nao informado.' });
  } else if (build.gpu.specs.lengthMm > build.case.specs.maxGpuLengthMm) {
    alerts.push({
      code: 'CASE_GPU_LENGTH_INCOMPATIBLE',
      severity: 'medium',
      message: `A placa de vídeo possui ${build.gpu.specs.lengthMm}mm, mas o gabinete suporta até ${build.case.specs.maxGpuLengthMm}mm.`
    });
  }
}

// New models carry verified kit/form-factor inputs. Do not retroactively claim these
// additional checks for historical generic records that never supplied those inputs.
function validateReplacementDependencies(build, alerts, unverifiedChecks) {
  const motherboard = build.motherboard.specs;
  const ram = build.ram.specs;
  const storage = build.storage.specs;
  const unknown = (code, message) => unverifiedChecks.push({ code, severity: 'medium', verification: 'unverified', message });
  const conflict = (code, message) => alerts.push({ code, severity: 'high', message });
  if (build.ram.catalogRevision || build.motherboard.catalogRevision) {
    if (!Number.isInteger(ram.modulesPerKit) || !Number.isInteger(motherboard.memorySlots)) {
      unknown('RAM_SLOT_COUNT_UNVERIFIED', 'Quantidade de módulos ou slots não confirmada para este modelo. Confira a ficha da placa-mãe.');
    } else if (ram.modulesPerKit > motherboard.memorySlots) {
      conflict('RAM_SLOT_COUNT_EXCEEDED', 'O kit tem mais módulos que os slots de memória da placa-mãe.');
    }
    if (!Number.isFinite(ram.capacityGb) || !Number.isFinite(motherboard.maxMemoryGb)) {
      unknown('RAM_CAPACITY_LIMIT_UNVERIFIED', 'Capacidade máxima de memória desta placa-mãe não confirmada.');
    } else if (ram.capacityGb > motherboard.maxMemoryGb) {
      conflict('RAM_CAPACITY_EXCEEDED', 'A capacidade do kit excede o limite de memória da placa-mãe.');
    }
  }
  if (build.storage.catalogRevision && storage.interface === 'M.2 NVMe') {
    if (!Number.isFinite(storage.m2LengthMm) || !Array.isArray(motherboard.m2SupportedLengthsMm)) {
      unknown('M2_LENGTH_UNVERIFIED', 'Comprimento do SSD M.2 ou suporte físico da placa-mãe não confirmado.');
    } else if (!motherboard.m2SupportedLengthsMm.includes(storage.m2LengthMm)) {
      conflict('M2_LENGTH_INCOMPATIBLE', 'A placa-mãe não declara suporte ao comprimento deste SSD M.2.');
    }
  }
}


const MARKET_REVALIDATION = '2026-10-08-market-revalidation';
const revalidated = (component) => component.catalogRevision === MARKET_REVALIDATION;
const hasField = (specs, field) => Object.hasOwn(specs, field);
const positiveNumber = (value) => Number.isFinite(value) && value > 0;

// These checks deliberately do not infer cables, adapters, installed BIOS or
// chassis clearance from wattage, sockets, product names or missing fields.
function validateReplacementPowerAndFit(build, alerts, unverifiedChecks) {
  const gpu = build.gpu.specs;
  const psu = build.psu.specs;
  const chassis = build.case.specs;
  const board = build.motherboard.specs;
  const unknown = (code, message) => unverifiedChecks.push({ code, severity: 'medium', verification: 'unverified', message });
  const conflict = (code, message) => alerts.push({ code, severity: 'high', message });
  const connectorFields = { 'pcie-8pin': 'pcie8PinConnectors', '12v-2x6': 'native12v2x6Connectors' };
  if (revalidated(build.gpu) || revalidated(build.psu) || hasField(gpu, 'powerConnectors')
    || Object.values(connectorFields).some(field => hasField(psu, field))) {
    const requirements = gpu.powerConnectors;
    if (!Array.isArray(requirements) || !requirements.length) {
      unknown('GPU_POWER_CONNECTORS_UNVERIFIED', 'Conectores de alimentação da GPU não confirmados.');
    } else {
      const totals = new Map();
      for (const requirement of requirements) {
        if (!requirement || !Object.hasOwn(connectorFields, requirement.type)
          || !Number.isInteger(requirement.count) || requirement.count < 1) {
          unknown('GPU_POWER_CONNECTORS_UNVERIFIED', 'Tipo ou quantidade de conectores da GPU não confirmados.');
          continue;
        }
        totals.set(requirement.type, (totals.get(requirement.type) || 0) + requirement.count);
      }
      for (const [type, count] of totals) {
        const available = psu[connectorFields[type]];
        if (!Number.isInteger(available) || available < 0) {
          unknown('PSU_GPU_CONNECTORS_UNVERIFIED', `Quantidade disponível de conectores ${type} da fonte não confirmada; adaptadores não são presumidos.`);
        } else if (available < count) {
          conflict('PSU_GPU_CONNECTORS_INCOMPATIBLE', `A GPU exige ${count} conector(es) ${type}, mas a fonte declara ${available}. Adaptadores exigem verificação separada.`);
        }
      }
    }
  }
  if (revalidated(build.psu) || revalidated(build.case) || hasField(psu, 'formFactor')
    || hasField(chassis, 'supportedPsuFormFactors') || hasField(psu, 'dimensionsMm') || hasField(chassis, 'maxPsuLengthMm')) {
    if (!psu.formFactor || !isNonEmptyTextArray(chassis.supportedPsuFormFactors)) {
      unknown('CASE_PSU_FORM_FACTOR_UNVERIFIED', 'Formato da fonte ou formatos aceitos pelo gabinete não confirmados.');
    } else if (!chassis.supportedPsuFormFactors.includes(psu.formFactor)) {
      conflict('CASE_PSU_FORM_FACTOR_INCOMPATIBLE', 'O gabinete não declara suporte ao formato desta fonte.');
    }
    const length = !Array.isArray(psu.dimensionsMm) ? psu.dimensionsMm?.length : undefined;
    if (!positiveNumber(length) || !positiveNumber(chassis.maxPsuLengthMm)) {
      unknown('CASE_PSU_LENGTH_UNVERIFIED', 'Comprimento da fonte ou espaço disponível no gabinete não confirmado.');
    } else if (length > chassis.maxPsuLengthMm) {
      conflict('CASE_PSU_LENGTH_INCOMPATIBLE', 'O comprimento da fonte excede o espaço declarado do gabinete.');
    }
  }
  if (revalidated(build.motherboard) || hasField(board, 'minimumBiosByCpu') || hasField(board, 'installedBiosVersion')) {
    const minimums = board.minimumBiosByCpu;
    const minimum = minimums && (minimums[build.cpu.id] ?? minimums[build.cpu.specs.family]);
    const comparison = compareBiosVersions(board.installedBiosVersion, minimum);
    if (comparison === null) {
      unknown('CPU_BIOS_UNVERIFIED', 'BIOS instalado ou versão mínima para este processador não confirmados; socket igual não confirma suporte.');
    } else if (comparison < 0) {
      conflict('CPU_BIOS_BELOW_MINIMUM', `A BIOS instalada é anterior à versão mínima ${minimum} para este processador.`);
    }
  }
}

function compareBiosVersions(installed, minimum) {
  if (typeof installed !== 'string' || typeof minimum !== 'string' || !installed.trim() || !minimum.trim()) return null;
  // Only stable, same-scheme numeric releases have an ordering here. Beta labels,
  // different prefixes and arbitrary vendor labels cannot establish support.
  const actual = /^(F?)(\d+)$/i.exec(installed.trim());
  const required = /^(F?)(\d+)$/i.exec(minimum.trim());
  if (!actual || !required || actual[1].toUpperCase() !== required[1].toUpperCase()) return null;
  return Number(actual[2]) - Number(required[2]);
}
