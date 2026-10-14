import { evaluateFanLayout } from './cooling-layout.service.js';

const knownNumber = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;

export function getCoolingPower(build) {
  let knownWatts = 0;
  const unknownComponents = [];
  if (build.cooler) {
    if (knownNumber(build.cooler.specs.powerWatts)) knownWatts += build.cooler.specs.powerWatts;
    else unknownComponents.push(build.cooler.id);
  }
  for (const fan of build.fans || []) {
    if (knownNumber(fan.specs.powerWatts) && Number.isInteger(fan.specs.unitsPerPack) && fan.specs.unitsPerPack > 0) {
      knownWatts += fan.specs.powerWatts * fan.specs.unitsPerPack * fan.quantity;
    } else unknownComponents.push(fan.id);
    if (fan.specs.auxiliaryPowerUnknown && !unknownComponents.includes(fan.id)) unknownComponents.push(fan.id);
  }
  return { knownWatts: Number(knownWatts.toFixed(2)), complete: unknownComponents.length === 0, unknownComponents };
}

export function checkCoolingCompatibility(build) {
  const alerts = [];
  const unverifiedChecks = [];
  const scopeWarnings = [];
  const unknown = (code, message) => unverifiedChecks.push({ code, severity: 'medium', verification: 'unverified', message });
  const conflict = (code, message) => alerts.push({ code, severity: 'high', message });
  const caseSpecs = build.case?.specs || {};
  let radiatorFans = 0;
  let radiatorDiameter = null;
  let viableRadiatorPositions = null;
  const stock = build.cpu?.specs?.includedCpuCooler;
  const verifiedStock = !build.cooler && build.cpu?.specs?.includesCpuCooler === true
    && stock?.name && stock?.specSourceUrl && stock?.specs?.coolingType === 'air'
    && knownNumber(stock.specs.heightMm) && stock.specs.heightMm > 0;
  const cooler = build.cooler?.specs || (verifiedStock ? stock.specs : null);
  if (!build.cooler && !verifiedStock) {
    scopeWarnings.push({ code: 'CPU_COOLING_FIT_UNVERIFIED', severity: 'medium', verification: 'unverified', message: build.cpu?.specs?.includesCpuCooler === false
      ? 'Este processador não inclui cooler. Informe a refrigeração que será utilizada; não é necessário comprar outro cooler se você já possui um compatível.'
      : 'Nenhum cooler avulso selecionado. A identidade e as medidas do cooler incluído ou já disponível não foram verificadas; isso não significa que seja necessário comprar outro.' });
  }
  if (cooler) {
    if (!Array.isArray(cooler.supportedSockets) || !cooler.supportedSockets.length || !build.cpu?.specs?.socket) {
      unknown('COOLER_SOCKET_UNVERIFIED', 'Socket suportado pelo cooler não verificado.');
    } else if (!cooler.supportedSockets.includes(build.cpu.specs.socket)) {
      conflict('COOLER_CPU_SOCKET_INCOMPATIBLE', 'O cooler não suporta o socket do processador.');
    }
    if (cooler.coolingType === 'air') {
      unknown('AIR_COOLER_CLEARANCE_UNVERIFIED', 'Altura e encaixe não confirmam o espaço ao redor do cooler. Confira no manual se ele encosta na memória RAM ou nos componentes de alimentação da placa-mãe (VRM).');
      if (!knownNumber(cooler.heightMm) || !knownNumber(caseSpecs.maxCoolerHeightMm)) {
        unknown('COOLER_HEIGHT_UNVERIFIED', 'Altura do cooler ou limite do gabinete não informado.');
      } else if (cooler.heightMm > caseSpecs.maxCoolerHeightMm) {
        conflict('CASE_COOLER_HEIGHT_INCOMPATIBLE', 'A altura do cooler excede o limite do gabinete.');
      }
    } else if (cooler.coolingType === 'aio') {
      if (!knownNumber(cooler.radiatorSizeMm) || !Array.isArray(caseSpecs.radiatorSizesMm)) {
        unknown('RADIATOR_SIZE_UNVERIFIED', 'Suporte ao tamanho do radiador não verificado.');
      } else if (!caseSpecs.radiatorSizesMm.includes(cooler.radiatorSizeMm)) {
        conflict('CASE_RADIATOR_SIZE_INCOMPATIBLE', 'O gabinete não suporta o tamanho do radiador.');
      }
      if (knownNumber(cooler.radiatorThicknessMm) && knownNumber(caseSpecs.maxRadiatorThicknessMm)
        && cooler.radiatorThicknessMm > caseSpecs.maxRadiatorThicknessMm) {
        conflict('CASE_RADIATOR_THICKNESS_INCOMPATIBLE', 'A espessura do radiador excede o limite declarado do gabinete.');
      }
      const positions = Object.entries(caseSpecs.radiatorLayouts || {}).filter(([, sizes]) =>
        Array.isArray(sizes) && sizes.includes(cooler.radiatorSizeMm));
      if (positions.length) {
        const dimensions = { ...cooler.radiatorDimensionsMm, thickness: cooler.radiatorThicknessMm };
        viableRadiatorPositions = positions.filter(([position]) => {
          const limits = caseSpecs.radiatorLimitsMm?.[position] || {};
          return !['length', 'width', 'thickness'].some(axis => knownNumber(limits[axis])
            && knownNumber(dimensions[axis]) && dimensions[axis] > limits[axis]);
        }).map(([position]) => position);
        if (!viableRadiatorPositions.length) conflict('CASE_RADIATOR_DIMENSIONS_INCOMPATIBLE',
          'As dimensões do radiador excedem os limites em todas as posições que suportam seu tamanho nominal.');
      }
      // A nominal radiator length does not prove thickness, RAM or GPU clearance.
      unknown('RADIATOR_CLEARANCE_UNVERIFIED', 'Verifique a espessura, a posição do radiador e a folga para RAM e GPU no manual do gabinete.');
      if ([120, 240, 360, 480].includes(cooler.radiatorSizeMm)) radiatorDiameter = 120;
      if ([140, 280, 420].includes(cooler.radiatorSizeMm)) radiatorDiameter = 140;
      if (radiatorDiameter) radiatorFans = cooler.radiatorSizeMm / radiatorDiameter;
    } else unknown('COOLER_TYPE_UNVERIFIED', 'Tipo de cooler não informado.');
  }
  const fans = build.fans || [];
  if (fans.length || cooler?.coolingType === 'aio') {
    const mounts = caseSpecs.fanMounts;
    const validMounts = Array.isArray(mounts) && mounts.every((mount) => knownNumber(mount.diameterMm)
      && Number.isInteger(mount.capacity) && mount.capacity >= 0);
    const selectedByDiameter = new Map();
    let unitsKnown = true;
    for (const fan of fans) {
      const specs = fan.specs || {};
      if (!knownNumber(specs.diameterMm) || !validMounts) {
        unknown('FAN_DIAMETER_UNVERIFIED', `Diâmetro ou suportes do gabinete não verificados para ${fan.name}.`);
      } else if (!mounts.some((mount) => mount.diameterMm === specs.diameterMm && mount.capacity > 0)) {
        conflict('CASE_FAN_DIAMETER_INCOMPATIBLE', `O gabinete não suporta fans de ${specs.diameterMm}mm.`);
      }
      if (!knownNumber(specs.thicknessMm) || !knownNumber(caseSpecs.maxFanThicknessMm)) {
        unknown('FAN_THICKNESS_UNVERIFIED', `Espessura ou folga do gabinete não verificada para ${fan.name}.`);
      } else if (specs.thicknessMm > caseSpecs.maxFanThicknessMm) {
        conflict('CASE_FAN_THICKNESS_INCOMPATIBLE', `A espessura de ${fan.name} excede o limite do gabinete.`);
      }
      if (!Number.isInteger(specs.unitsPerPack) || specs.unitsPerPack < 1 || !Number.isInteger(fan.quantity) || fan.quantity < 1 || !knownNumber(specs.diameterMm) || specs.diameterMm <= 0) {
        unitsKnown = false;
      } else selectedByDiameter.set(specs.diameterMm, (selectedByDiameter.get(specs.diameterMm) || 0) + specs.unitsPerPack * fan.quantity);
    }
    if (!validMounts || !unitsKnown || !Number.isInteger(caseSpecs.includedFanCount) || caseSpecs.includedFanCount < 0
      || (cooler?.coolingType === 'aio' && !radiatorDiameter)) {
      unknown('FAN_CAPACITY_UNVERIFIED', 'Capacidade de fans, unidades por pack ou fans incluídos não verificados.');
    } else {
      const capacity = new Map();
      for (const mount of mounts) capacity.set(mount.diameterMm, Math.max(capacity.get(mount.diameterMm) || 0, mount.capacity));
      const layoutFit = evaluateFanLayout(caseSpecs, selectedByDiameter, radiatorDiameter
        ? { diameter: radiatorDiameter, count: radiatorFans, size: cooler.radiatorSizeMm, positions: viableRadiatorPositions } : null);
      if (layoutFit === false) conflict('CASE_FAN_CAPACITY_EXCEEDED', 'Fans adicionais, incluídos e do radiador não cabem simultaneamente nos layouts declarados. Nenhum fan foi removido.');
      const totalByDiameter = new Map(selectedByDiameter);
      if (caseSpecs.includedFanCount && knownNumber(caseSpecs.includedFanDiameterMm)) {
        totalByDiameter.set(caseSpecs.includedFanDiameterMm, (totalByDiameter.get(caseSpecs.includedFanDiameterMm) || 0) + caseSpecs.includedFanCount);
      }
      if (radiatorDiameter && !totalByDiameter.has(radiatorDiameter)) totalByDiameter.set(radiatorDiameter, 0);
      for (const [diameter, count] of totalByDiameter) {
        if (count + (diameter === radiatorDiameter ? radiatorFans : 0) > (capacity.get(diameter) || 0)) {
          conflict('CASE_FAN_CAPACITY_EXCEEDED', `Fans de ${diameter}mm (incluindo radiador) excedem a capacidade nominal.`);
        }
      }
      const requested = [...selectedByDiameter.values()].reduce((a, b) => a + b, 0);
      // Different diameters often share the same holes. Never sum alternative layouts.
      const conservativeCapacity = Math.max(0, ...capacity.values());
      if (capacity.size === 1 && requested + caseSpecs.includedFanCount + radiatorFans > conservativeCapacity) {
        conflict('CASE_FAN_CAPACITY_EXCEEDED', 'Fans adicionais, incluídos e do radiador excedem os suportes disponíveis.');
      } else if (capacity.size > 1 && layoutFit === null) {
        unknown('FAN_LAYOUT_UNVERIFIED', 'Suportes de diâmetros diferentes podem compartilhar posições; confirme o layout e os fans incluídos.');
      }
    }
    unknown('FAN_PLACEMENT_UNVERIFIED', 'Capacidade nominal não confirma posição instalada nem interferências entre fans, radiador, RAM e GPU.');
    unknown('FAN_CONNECTORS_UNVERIFIED', 'Confirme os conectores da placa-mãe, a corrente máxima e a necessidade de divisores ou controladoras para as ventoinhas.');
  }
  const power = getCoolingPower(build);
  if (!power.complete) unknown('COOLING_POWER_UNVERIFIED', 'Consumo de um ou mais componentes de refrigeração não informado.');
  return { alerts, unverifiedChecks, coolingAssessment: {
    status: alerts.length ? 'incompatible' : (unverifiedChecks.length || scopeWarnings.length) ? 'unverified' : 'compatible',
    scope: cooler ? (build.cooler ? 'selected_cooler' : 'included_cooler') : 'cooling_not_assessed',
    unverifiedChecks: [...scopeWarnings, ...unverifiedChecks], alerts: [...alerts]
  } };
}
