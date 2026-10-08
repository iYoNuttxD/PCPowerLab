import { serializeBuildSelection } from './build.service.js';
import { getCoolingPower } from './cooling.service.js';
import { checkBuildCompatibility } from './compatibility.service.js';
import { listComponents } from './component.service.js';

const maxSuggestionsPerProblem = 3;

const problemTypesByAlertCode = {
  CPU_MOTHERBOARD_SOCKET_INCOMPATIBLE: 'socket_mismatch',
  RAM_MOTHERBOARD_TYPE_INCOMPATIBLE: 'ram_mismatch',
  PSU_POWER_BELOW_RECOMMENDED: 'psu_insufficient',
  CASE_MOTHERBOARD_FORM_FACTOR_INCOMPATIBLE: 'case_form_factor_mismatch',
  CASE_GPU_LENGTH_INCOMPATIBLE: 'gpu_length_mismatch'
};

const suggestionBuildersByAlertCode = {
  CPU_MOTHERBOARD_SOCKET_INCOMPATIBLE: buildSocketMismatchOptions,
  RAM_MOTHERBOARD_TYPE_INCOMPATIBLE: buildRamMismatchOptions,
  PSU_POWER_BELOW_RECOMMENDED: buildPsuOptions,
  CASE_MOTHERBOARD_FORM_FACTOR_INCOMPATIBLE: buildCaseFormFactorOptions,
  CASE_GPU_LENGTH_INCOMPATIBLE: buildGpuLengthOptions
};

export function suggestCompatibilityFixes(selectedComponents) {
  const compatibilityResult = checkBuildCompatibility(selectedComponents);
  const originalAlertCodes = new Set(compatibilityResult.alerts.map((alert) => alert.code));

  return {
    compatible: compatibilityResult.compatible,
    status: compatibilityResult.status,
    unverifiedChecks: compatibilityResult.unverifiedChecks ?? [],
    issues: compatibilityResult.alerts.map(formatIssue),
    suggestions: compatibilityResult.alerts.flatMap((alert) => (
      buildSuggestionsForAlert(alert, compatibilityResult.selectedComponents, originalAlertCodes)
    ))
  };
}

function buildSuggestionsForAlert(alert, build, originalAlertCodes) {
  const buildOptions = suggestionBuildersByAlertCode[alert.code];

  if (!buildOptions) {
    return [];
  }

  let remainingSuggestions = maxSuggestionsPerProblem;

  return buildOptions(build)
    .map((option) => {
      if (remainingSuggestions === 0) {
        return null;
      }

      const suggestedComponents = option.candidates
        .filter((candidate) => candidate.id !== build[option.replaceComponent].id)
        .filter((candidate) => isValidFixCandidate({
          alertCode: alert.code,
          build,
          candidate,
          replaceComponent: option.replaceComponent,
          originalAlertCodes
        }))
        .slice(0, remainingSuggestions)
        .map((candidate) => ({
          component: candidate,
          reason: option.buildReason(candidate)
        }));

      remainingSuggestions -= suggestedComponents.length;

      if (suggestedComponents.length === 0) {
        return null;
      }

      return {
        problem: problemTypesByAlertCode[alert.code] ?? alert.code,
        replaceComponent: option.replaceComponent,
        currentComponent: build[option.replaceComponent],
        suggestedComponents
      };
    })
    .filter(Boolean);
}

function buildSocketMismatchOptions(build) {
  return [
    {
      replaceComponent: 'motherboard',
      candidates: listComponents({ category: 'motherboard' })
        .filter((motherboard) => motherboard.specs.socket === build.cpu.specs.socket),
      buildReason: (motherboard) => (
        `Esta placa-mae possui socket ${motherboard.specs.socket}, compativel com o processador selecionado.`
      )
    },
    {
      replaceComponent: 'cpu',
      candidates: listComponents({ category: 'cpu' })
        .filter((cpu) => cpu.specs.socket === build.motherboard.specs.socket),
      buildReason: (cpu) => (
        `Este processador usa socket ${cpu.specs.socket}, compativel com a placa-mae selecionada.`
      )
    }
  ];
}

function buildRamMismatchOptions(build) {
  return [
    {
      replaceComponent: 'ram',
      candidates: listComponents({ category: 'ram' })
        .filter((ram) => ram.specs.memoryType === build.motherboard.specs.memoryType),
      buildReason: (ram) => (
        `Esta memoria e ${ram.specs.memoryType}, o mesmo tipo aceito pela placa-mae selecionada.`
      )
    },
    {
      replaceComponent: 'motherboard',
      candidates: listComponents({ category: 'motherboard' })
        .filter((motherboard) => motherboard.specs.memoryType === build.ram.specs.memoryType),
      buildReason: (motherboard) => (
        `Esta placa-mae aceita memoria ${motherboard.specs.memoryType}, compativel com a memoria selecionada.`
      )
    }
  ];
}

function buildPsuOptions(build) {
  const minimumRecommendedWatts = calculateMinimumRecommendedWatts(build);

  return [
    {
      replaceComponent: 'psu',
      candidates: listComponents({ category: 'psu' })
        .filter((psu) => psu.specs.watts >= minimumRecommendedWatts)
        .sort((first, second) => first.specs.watts - second.specs.watts),
      buildReason: (psu) => (
        `Esta fonte possui ${psu.specs.watts}W, atendendo a recomendacao minima de ${minimumRecommendedWatts}W para a configuracao.`
      )
    }
  ];
}

function buildCaseFormFactorOptions(build) {
  return [
    {
      replaceComponent: 'case',
      candidates: listComponents({ category: 'case' })
        .filter((computerCase) => computerCase.specs.supportedFormFactors.includes(build.motherboard.specs.formFactor)),
      buildReason: () => (
        `Este gabinete suporta placa-mae no formato ${build.motherboard.specs.formFactor}.`
      )
    }
  ];
}

function buildGpuLengthOptions(build) {
  return [
    {
      replaceComponent: 'case',
      candidates: listComponents({ category: 'case' })
        .filter((computerCase) => computerCase.specs.maxGpuLengthMm >= build.gpu.specs.lengthMm)
        .sort((first, second) => first.specs.maxGpuLengthMm - second.specs.maxGpuLengthMm),
      buildReason: (computerCase) => (
        `Este gabinete suporta GPUs de ate ${computerCase.specs.maxGpuLengthMm}mm, suficiente para a placa de video selecionada.`
      )
    },
    {
      replaceComponent: 'gpu',
      candidates: listComponents({ category: 'gpu' })
        .filter((gpu) => gpu.specs.lengthMm <= build.case.specs.maxGpuLengthMm)
        .sort((first, second) => second.specs.vramGb - first.specs.vramGb),
      buildReason: (gpu) => (
        `Esta placa de video possui ${gpu.specs.lengthMm}mm, dentro do limite de ${build.case.specs.maxGpuLengthMm}mm do gabinete selecionado.`
      )
    }
  ];
}

function isValidFixCandidate({
  alertCode,
  build,
  candidate,
  replaceComponent,
  originalAlertCodes
}) {
  const candidateBuild = {
    ...build,
    [replaceComponent]: candidate
  };
  const candidateResult = checkBuildCompatibility(mapBuildToIds(candidateBuild));
  const candidateAlertCodes = candidateResult.alerts.map((candidateAlert) => candidateAlert.code);

  return !(candidateResult.unverifiedChecks?.length)
    && !candidateAlertCodes.includes(alertCode)
    && candidateAlertCodes.every((candidateAlertCode) => originalAlertCodes.has(candidateAlertCode));
}

function formatIssue(alert) {
  return {
    type: problemTypesByAlertCode[alert.code] ?? alert.code,
    message: alert.message
  };
}

function mapBuildToIds(build) {
  return serializeBuildSelection(build);
}

function calculateMinimumRecommendedWatts(build) {
  const cpuTdp = build.cpu.specs.tdpWatts || 0;
  const gpuRecommendedPsu = build.gpu.specs.recommendedPsuWatts || 0;

  return Math.max(gpuRecommendedPsu, cpuTdp + 350) + getCoolingPower(build).knownWatts;
}
