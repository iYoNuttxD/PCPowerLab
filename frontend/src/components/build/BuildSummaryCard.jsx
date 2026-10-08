import ComponentIdentity from '../componentsCatalog/ComponentIdentity.jsx';
import { Trash2 } from 'lucide-react';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import { componentLabels, componentTypes } from '../../utils/componentLabels.js';
import { fanPackPrice } from '../../utils/buildHelpers.js';
import { formatCurrency } from '../../utils/formatCurrency.js';

export default function BuildSummaryCard({ selectedComponents, totalPrice, onRemove, onEdit }) {
  return (
    <Card className="build-summary-card">
      <div className="section-heading compact">
        <span>Build atual</span>
        <strong><small className="estimated-price-label">Total estimado</small>{formatCurrency(totalPrice)}</strong>
      </div>
      <ul className="build-parts-list">
        {[...componentTypes, 'cooler'].map((type) => {
          const component = selectedComponents?.[type];

          return (
            <li key={type}>
              {onEdit ? (
                <button className="build-part-edit" type="button" onClick={() => onEdit(type)}
                  aria-label={`${component ? 'Alterar' : 'Escolher'} ${componentLabels[type]}`}>
                  {componentLabels[type]}<small>{component ? 'Trocar componente' : 'Escolher peça'}</small>
                </button>
              ) : <span>{componentLabels[type]}</span>}
              <ComponentIdentity component={component} category={type} fallback="Não selecionado" />
              {component && onRemove && (
                <Button variant="ghost" size="sm" onClick={() => onRemove(type)} aria-label={`Remover ${componentLabels[type]}`}>
                  <Trash2 size={16} aria-hidden="true" />
                </Button>
              )}
            </li>
          );
        })}
        {(selectedComponents?.fans || []).map((fan, index) => <li key={`${fan.id}-${index}`}>
          {onEdit ? <button className="build-part-edit" type="button" onClick={() => onEdit('fans')}>Ventoinhas<small>Alterar modelo ou quantidade</small></button> : <span>Ventoinhas</span>}
          <ComponentIdentity component={fan} category="fan"><small>{fan.quantity} pacote(s){fan.specs?.unitsPerPack ? ` · ${fan.quantity * fan.specs.unitsPerPack} unidade(s)` : ''}</small></ComponentIdentity>
          <span>Total estimado: {formatCurrency(fanPackPrice(fan))}</span>
        </li>)}
        {!!selectedComponents?.fans?.length && onRemove && <li><Button variant="ghost" onClick={() => onRemove('fans')}>Remover todas as ventoinhas</Button></li>}
      </ul>
    </Card>
  );
}
