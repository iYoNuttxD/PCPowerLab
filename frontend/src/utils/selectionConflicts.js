// Immediate guidance on known pairs only. Absence of a conflict is not a full
// compatibility approval; the server still checks the completed configuration.
const text = value => typeof value === 'string' && value.trim() ? value.trim() : null;
const number = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
const textArray = value => Array.isArray(value) && value.length && value.every(item => text(item)) ? value : null;

export function selectionConflicts(selection = {}) {
  const alerts = [];
  const { cpu, motherboard, ram, gpu, case: enclosure } = selection;
  const add = (code, slots, message) => alerts.push({ code, slots, message });
  const cpuSocket = text(cpu?.specs?.socket), boardSocket = text(motherboard?.specs?.socket);
  if (cpuSocket && boardSocket && cpuSocket !== boardSocket) add('socket', ['cpu', 'motherboard'],
    `${cpu.name || 'O processador'} usa ${cpuSocket}, mas ${motherboard.name || 'a placa-mãe'} usa ${boardSocket}. Esses encaixes não funcionam juntos. Troque uma das duas peças.`);
  const ramType = text(ram?.specs?.memoryType), boardType = text(motherboard?.specs?.memoryType);
  if (ramType && boardType && ramType !== boardType) add('memory', ['ram', 'motherboard'],
    `${ram.name || 'A memória'} é ${ramType}, mas a placa-mãe aceita ${boardType}. Escolha memória ou placa-mãe do mesmo padrão.`);
  const formFactor = text(motherboard?.specs?.formFactor), supported = textArray(enclosure?.specs?.supportedFormFactors);
  if (formFactor && supported && !supported.includes(formFactor)) add('case-board', ['case', 'motherboard'],
    `A placa-mãe tem formato ${formFactor}; o gabinete informa suporte a ${supported.join(', ')}. Escolha um gabinete ou uma placa-mãe com formato compatível.`);
  const length = number(gpu?.specs?.lengthMm), maxLength = number(enclosure?.specs?.maxGpuLengthMm);
  if (length !== null && maxLength !== null && length > maxLength) add('case-gpu', ['case', 'gpu'],
    `A placa de vídeo mede ${length} mm, acima dos ${maxLength} mm informados para o gabinete. Troque a placa de vídeo ou o gabinete.`);
  return alerts;
}

export function stepSelectionConflicts(selection, step) {
  return selectionConflicts(selection).filter(alert => alert.slots.includes(step));
}
