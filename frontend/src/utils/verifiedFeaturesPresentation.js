// This metadata is separate from compatibility specs; do not infer unavailable evidence.
export const verifiedFeatureFields = {
  memorySlots: 'Slots de memória', maxMemoryGb: 'Capacidade publicada (fabricante)', m2Slots: 'Slots M.2', sataPorts: 'Portas SATA',
  ethernetGbps: 'Rede cabeada', wifi: 'Wi-Fi integrado', bluetooth: 'Bluetooth',
  frontUsbCHeader: 'Conector USB-C frontal', frontUsbCDataRateGbps: 'Taxa do USB-C frontal',
  flashback: 'Atualização de BIOS sem CPU', systemFanHeaders: 'Conectores para ventoinhas do gabinete'
};
export function formatVerifiedFeature(key, value) {
  if (value === null || value === undefined || value === '') return 'Não confirmado';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) return 'Não confirmado';
    const unit = key === 'maxMemoryGb' ? ' GB' : ['ethernetGbps', 'frontUsbCDataRateGbps'].includes(key) ? ' Gbps' : '';
    return `${value.toLocaleString('pt-BR')}${unit}`;
  }
  return String(value);
}
