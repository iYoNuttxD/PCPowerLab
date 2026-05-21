import { Cpu, ExternalLink, PlusCircle } from 'lucide-react';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import { componentLabels } from '../../utils/componentLabels.js';
import { formatCurrency } from '../../utils/formatCurrency.js';
import { translateValue } from '../../utils/translations.js';

export default function ComponentCard({ component, onSelect, onLinks, selected = false }) {
  const specs = component?.specs && typeof component.specs === 'object' ? component.specs : {};

  return (
    <Card className={`component-card ${selected ? 'is-selected' : ''}`} as="article">
      <div className="component-card-header">
        <Cpu aria-hidden="true" />
        <Badge tone={selected ? 'green' : 'cyan'}>{componentLabels[component?.category] || component?.category}</Badge>
      </div>
      <h3>{component?.name || 'Componente sem nome'}</h3>
      <p>{component?.brand || 'Marca não informada'}</p>
      <strong className="price">{formatCurrency(component?.price)}</strong>
      <dl className="spec-grid">
        {Object.entries(specs).slice(0, 5).map(([key, value]) => (
          <div key={key}>
            <dt>{translateValue(key)}</dt>
            <dd>{Array.isArray(value) ? value.join(', ') : String(value)}</dd>
          </div>
        ))}
      </dl>
      <div className="button-row">
        {onSelect && (
          <Button type="button" onClick={() => onSelect(component)} variant={selected ? 'success' : 'primary'}>
            <PlusCircle size={18} aria-hidden="true" />
            {selected ? 'Selecionado' : 'Selecionar'}
          </Button>
        )}
        {onLinks && (
          <Button type="button" onClick={() => onLinks(component)} variant="ghost">
            <ExternalLink size={18} aria-hidden="true" />
            Lojas
          </Button>
        )}
      </div>
    </Card>
  );
}
