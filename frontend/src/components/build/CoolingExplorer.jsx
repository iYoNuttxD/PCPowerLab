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
    <Button variant="secondary" aria-haspopup="dialog" onClick={() => onOpen ? onOpen() : setLocalOpen(true)}>Explorar temperatura e ruído</Button>
    <Modal className="cooling-dialog" open={open} title="Temperatura e ruído" onClose={close}>
      <p className="hint-text">Estimativas aproximadas com seu cooler ou uma hipótese padrão.</p>
      <CoolingSimulationPanel heading="Resultados do cenário" cpu={build.selectedComponents.cpu} cooler={build.selectedComponents.cooler}
        fans={build.selectedComponents.fans || []} caseComponent={build.selectedComponents.case}
        conditions={build.coolingConditions} onConditionsChange={build.actions.setCoolingConditions} />
      <details className="task-disclosure"><summary>Refrigeração desta montagem</summary>
        <p>{build.selectedComponents.cooler?.name || build.selectedComponents.cpu?.specs?.includedCpuCooler?.name || 'Cooler padrão aproximado; confira se a CPU inclui refrigeração.'}</p>
        <Link to="/build" onClick={() => { build.actions.setWizardStep('cooling'); close(); }}>Escolher refrigeração</Link>
      </details>
    </Modal>
  </section>;
}
