import { useState } from 'react';
import { Check, CircuitBoard, Cpu, ExternalLink, Fan, HardDrive, MemoryStick, Monitor, PlusCircle, Zap } from 'lucide-react';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import Modal from '../ui/Modal.jsx';
import { componentLabels } from '../../utils/componentLabels.js';
import { formatCurrency } from '../../utils/formatCurrency.js';
import { translateSpecLabel } from '../../utils/translations.js';

const categoryIcons = { cpu: Cpu, gpu: Monitor, motherboard: CircuitBoard, ram: MemoryStick, storage: HardDrive, psu: Zap, case: Fan };

export default function ComponentCard({ component, onSelect, onLinks, selected = false }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const specs = component?.specs && typeof component.specs === 'object' ? component.specs : {};
  const Icon = categoryIcons[component?.category] || Cpu;
  const name = component?.name || 'Componente sem nome';

  return (
    <>
      <Card className={`component-card ${selected ? 'is-selected' : ''}`} as="article">
        <div className="component-card-header">
          <Icon size={24} aria-hidden="true" />
          <Badge tone={selected ? 'green' : 'cyan'}>{componentLabels[component?.category] || component?.category}</Badge>
        </div>
        <h3 title={name}>{name}</h3>
        <p className="component-brand" title={component?.brand}>{component?.brand || 'Marca não informada'}</p>
        <dl className="spec-grid">
          {Object.entries(specs).slice(0, 5).map(([key, value]) => (
            <div key={key}>
              <dt>{translateSpecLabel(key)}</dt>
              <dd>{formatSpecValue(key, value)}</dd>
            </div>
          ))}
        </dl>
        <div className="component-card-price">
          <span>Preço de referência</span>
          <strong className="price">{formatCurrency(component?.price)}</strong>
        </div>
        <div className="button-row">
          {onSelect && (
            <Button type="button" onClick={() => onSelect(component)} variant={selected ? 'success' : 'primary'}
              aria-pressed={selected} aria-label={`${selected ? 'Selecionado' : 'Selecionar'}: ${name}`}>
              {selected ? <Check size={18} aria-hidden="true" /> : <PlusCircle size={18} aria-hidden="true" />}
              {selected ? 'Selecionado' : 'Selecionar'}
            </Button>
          )}
          {onLinks && (
            <Button type="button" onClick={() => onLinks(component)} variant="secondary" aria-label={`Lojas para ${name}`}>
              <ExternalLink size={18} aria-hidden="true" />
              Lojas
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={() => setDetailsOpen(true)} aria-label={`Detalhes de ${name}`}>Detalhes</Button>
        </div>
      </Card>
      <Modal open={detailsOpen} title={name} onClose={() => setDetailsOpen(false)}>
        <p>{component?.brand || 'Marca não informada'} · {componentLabels[component?.category]}</p>
        <p className="price">{formatCurrency(component?.price)}</p>
        <dl className="spec-grid component-details">
          {Object.entries(specs).map(([key, value]) => (
            <div key={key}><dt>{translateSpecLabel(key)}</dt><dd>{formatSpecValue(key, value)}</dd></div>
          ))}
        </dl>
        {Object.keys(specs).length === 0 && <p>Especificações não informadas para este componente.</p>}
      </Modal>
    </>
  );
}

function formatSpecValue(key, value) {
  const units = {
    baseClockGhz: 'GHz',
    boostClockGhz: 'GHz',
    tdpWatts: 'W',
    recommendedPsuWatts: 'W',
    lengthMm: 'mm',
    maxGpuLengthMm: 'mm',
    speedMhz: 'MHz',
    capacityGb: 'GB',
    vramGb: 'GB',
    readSpeedMbS: 'MB/s',
    writeSpeedMbS: 'MB/s',
    watts: 'W'
  };

  if (Array.isArray(value)) {
    return value.join(', ');
  }

  return units[key] && Number.isFinite(Number(value))
    ? `${value} ${units[key]}`
    : String(value);
}
