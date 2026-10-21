// Published support is distinct from the BIOS actually installed on a unit.
const sourceUrl = 'https://www.asus.com/br/motherboards-components/motherboards/all-series/tuf-gaming-b550m-plus/helpdesk_cpu?model2Name=TUF-GAMING-B550M-PLUS';
const asusSupport = {
  'cpu-ryzen-5-5500': { cpuName: 'AMD Ryzen 5 5500', minimumVersion: '2423' },
  'cpu-ryzen-5-4500-box': { cpuName: 'AMD Ryzen 5 4500 Box', minimumVersion: '2423' }
};
export function publishedCpuBiosSupport(cpu, motherboard) {
  const asrock = {
    'cpu-ryzen-5-5500': ['AMD Ryzen 5 5500', '684'],
    'cpu-ryzen-5-4500-box': ['AMD Ryzen 5 4500 Box', '692']
  }[cpu.id];
  if (asrock && cpu.name === asrock[0] && motherboard.id === 'mb-asrock-b450m-hdv-r4' && motherboard.name === 'ASRock B450M-HDV R4.0') return {
    cpuId: cpu.id, motherboardId: motherboard.id, minimumVersion: 'P4.90', installedVersion: null, verifiedAt: '2026-10-21',
    sourceUrl: `https://www.asrock.com/support/cpu.us.asp?s=AM4&u=${asrock[1]}`, scope: 'Published support table; confirm installed firmware before purchase.' };
  if (cpu.id === 'cpu-ryzen-3-3200g-box' && cpu.name === 'AMD Ryzen 3 3200G Box'
    && motherboard.id === 'mb-asrock-b450m-hdv-r4' && motherboard.name === 'ASRock B450M-HDV R4.0') return {
    cpuId: cpu.id, motherboardId: motherboard.id, minimumVersion: 'P2.30', installedVersion: null, verifiedAt: '2026-10-21',
    sourceUrl: 'https://www.asrock.com/support/cpu.asp?s=AM4&u=599', scope: 'Published support table; confirm installed firmware before purchase.' };
  const record = asusSupport[cpu.id];
  if (!record || record.cpuName !== cpu.name || motherboard.id !== 'mb-asus-tuf-b550m-plus'
    || motherboard.name.toLowerCase() !== 'asus tuf gaming b550m-plus') return null;
  return { cpuId: cpu.id, motherboardId: motherboard.id, minimumVersion: record.minimumVersion,
    installedVersion: null, sourceUrl, verifiedAt: '2026-10-21',
    scope: 'Published support table; not evidence of the installed firmware.' };
}
