import { formatVerifiedFeature } from '../../utils/verifiedFeaturesPresentation.js';

export default function MotherboardGuide({ component }) {
  if (component.category !== 'motherboard') return null;
  const fields = component.verifiedFeatures?.fields;
  if (!fields) return <p>Confira expansão, rede e conectores no fabricante antes de escolher este modelo.</p>;
  return <section className="motherboard-guide" aria-label={`Como escolher ${component.name}`}>
    <h3>O que muda no seu uso</h3>
    <p>O chipset não resume a placa. Compare estes recursos com os dispositivos que você pretende instalar.</p>
    <ul>
      <li><strong>Conexão à internet:</strong> {fields.wifi === false ? 'sem Wi-Fi integrado; use cabo ou um adaptador separado.' : fields.wifi ? `${fields.wifi} integrado; confira antenas e roteador.` : 'Wi-Fi não confirmado.'} Rede cabeada: {formatVerifiedFeature('ethernetGbps', fields.ethernetGbps)}; a velocidade também depende da sua rede.</li>
      <li><strong>Expansão:</strong> {formatVerifiedFeature('m2Slots', fields.m2Slots)} slots M.2 para SSDs e {formatVerifiedFeature('memorySlots', fields.memorySlots)} slots de memória. Confira ocupação e compartilhamento de pistas no manual.</li>
      <li><strong>Porta do gabinete:</strong> {fields.frontUsbCHeader === true ? `conector USB-C frontal de ${formatVerifiedFeature('frontUsbCDataRateGbps', fields.frontUsbCDataRateGbps)}; requer gabinete com cabo compatível.` : fields.frontUsbCHeader === false ? 'sem conector USB-C frontal; a porta frontal do gabinete pode não funcionar sem adaptador.' : 'conector USB-C frontal não confirmado.'}</li>
      <li><strong>Atualização de BIOS:</strong> {fields.flashback === true ? 'permite atualizar sem uma CPU instalada, seguindo o manual. Isso não confirma a BIOS que vem de fábrica.' : fields.flashback === false ? 'não oferece atualização sem CPU; confirme o procedimento e a versão necessária.' : 'atualização sem CPU não confirmada; consulte o manual e o vendedor.'}</li>
    </ul>
    <p className="hint-text">Mais portas não significam mais FPS. Estas informações não avaliam a qualidade do VRM nem garantem suporte de BIOS.</p>
  </section>;
}
