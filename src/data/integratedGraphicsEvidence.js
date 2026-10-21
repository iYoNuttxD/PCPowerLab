// Model-specific published capabilities, independent of benchmark coefficients.
// No inferred GPU, separate SKU, price or synthetic performance is created.
const cpuSources = {
  'cpu-ryzen-3-3200g-box': ['AMD Ryzen 3 3200G Box', 'AM4', 'Radeon Vega 8 Graphics', 'https://www.amd.com/en/support/downloads/drivers.html/processors/ryzen/ryzen-3000-series/amd-ryzen-3-3200g.html'],
  'cpu-ryzen-5-7600': ['AMD Ryzen 5 7600', 'AM5', 'AMD Radeon Graphics', 'https://www.amd.com/en/products/processors/desktops/ryzen/7000-series/amd-ryzen-5-7600.html'],
  'cpu-ryzen-7-7800x3d-box': ['AMD Ryzen 7 7800X3D Box', 'AM5', 'AMD Radeon Graphics', 'https://www.amd.com/en/products/processors/desktops/ryzen/7000-series/amd-ryzen-7-7800x3d.html'],
  'cpu-ryzen-9-9900x-box': ['AMD Ryzen 9 9900X Box', 'AM5', 'AMD Radeon Graphics', 'https://www.amd.com/en/products/processors/desktops/ryzen/9000-series/amd-ryzen-9-9900x.html']
};
export function integratedCpuEvidence(cpu) {
  const record = cpuSources[cpu?.id];
  return record && record[0] === cpu.name && record[1] === cpu.specs?.socket
    ? { model: record[2], sourceUrl: record[3], verifiedAt: '2026-10-21', memory: 'shared-system-ram', performanceModel: 'unavailable' } : null;
}
export function integratedDisplayEvidence(board) {
  if (board?.id === 'mb-asrock-b450m-hdv-r4' && board.name === 'ASRock B450M-HDV R4.0') return {
    outputs: ['HDMI', 'DVI-D', 'VGA'], sourceUrl: 'https://asrock.com/mb/AMD/B450M-HDV%20R4.0/index.asp',
    note: 'Conecte o monitor na placa-mãe; capacidade de resolução depende da saída, CPU e monitor. Não é desempenho de jogo.' };
  return null;
}
