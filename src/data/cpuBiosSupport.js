// Published support is distinct from the BIOS actually installed on a unit.
const sourceUrl = 'https://www.asus.com/br/motherboards-components/motherboards/all-series/tuf-gaming-b550m-plus/helpdesk_cpu?model2Name=TUF-GAMING-B550M-PLUS';
const asusSupport = {
  'cpu-ryzen-5-5500': { cpuName: 'AMD Ryzen 5 5500', minimumVersion: '2423' },
  'cpu-ryzen-5-4500-box': { cpuName: 'AMD Ryzen 5 4500 Box', minimumVersion: '2423' }
};
export function publishedCpuBiosSupport(cpu, motherboard) {
  const record = asusSupport[cpu.id];
  if (!record || record.cpuName !== cpu.name || motherboard.id !== 'mb-asus-tuf-b550m-plus'
    || motherboard.name.toLowerCase() !== 'asus tuf gaming b550m-plus') return null;
  return { cpuId: cpu.id, motherboardId: motherboard.id, minimumVersion: record.minimumVersion,
    installedVersion: null, sourceUrl, verifiedAt: '2026-10-21',
    scope: 'Published support table; not evidence of the installed firmware.' };
}
