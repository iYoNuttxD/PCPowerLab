import { useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import CoolingSimulationPanel from './CoolingSimulationPanel.jsx';

export default function CoolingExplorer({ build, open: controlledOpen, onOpen, onClose }) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen ?? localOpen;
  function close() { if (onClose) onClose(); else setLocalOpen(false); }
  return <section className="panel-card cooling-explorer" aria-label="Temperatura e ruído">
    <span className="eyebrow">Conforto da montagem</span>
    <h3>Explore o conforto da montagem</h3>
    <p>Explore o efeito do cooler, das ventoinhas e do ambiente quando precisar, sem sair da sua montagem.</p>
    <Button aria-haspopup="dialog" onClick={() => onOpen ? onOpen() : setLocalOpen(true)}>Explorar temperatura e ruído</Button>
    <Modal open={open} title="Temperatura e ruído" onClose={close}>
      <p className="hint-text">Estimativa ilustrativa do modelo. Dados ausentes continuam indicados; não é uma medição deste computador.</p>
      {!build.selectedComponents.cooler && build.selectedComponents.cpu?.specs?.includedCpuCooler?.name && <p>Esta CPU inclui {build.selectedComponents.cpu.specs.includedCpuCooler.name}, sem custo adicional. Não há medidas nem curva térmica/acústica verificadas para esse cooler; nenhum resultado é inventado. Você pode conferir ou escolher outra refrigeração abaixo.</p>}
      {!build.selectedComponents.cooler && <p>Para explorar um cenário ilustrativo, selecione um cooler com dados de simulação. Isso não exige comprar outro cooler quando a CPU já inclui um adequado. <Link to="/build" onClick={() => { build.actions.setWizardStep('cooling'); close(); }}>Escolher refrigeração</Link></p>}
      <CoolingSimulationPanel heading="Resultados do cenário" cpu={build.selectedComponents.cpu} cooler={build.selectedComponents.cooler}
        fans={build.selectedComponents.fans || []} caseComponent={build.selectedComponents.case}
        conditions={build.coolingConditions} onConditionsChange={build.actions.setCoolingConditions} />
    </Modal>
  </section>;
}
