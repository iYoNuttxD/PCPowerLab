import { Trash2 } from 'lucide-react';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import { componentLabels, componentTypes } from '../../utils/componentLabels.js';
import { formatCurrency } from '../../utils/formatCurrency.js';

export default function BuildSummaryCard({ selectedComponents, totalPrice, onRemove }) {
  return (
    <Card className="build-summary-card">
      <div className="section-heading compact">
        <span>Build atual</span>
        <strong>{formatCurrency(totalPrice)}</strong>
      </div>
      <ul className="build-parts-list">
        {componentTypes.map((type) => {
          const component = selectedComponents?.[type];

          return (
            <li key={type}>
              <span>{componentLabels[type]}</span>
              <strong>{component?.name || 'Não selecionado'}</strong>
              {component && onRemove && (
                <Button variant="ghost" size="sm" onClick={() => onRemove(type)} aria-label={`Remover ${componentLabels[type]}`}>
                  <Trash2 size={16} aria-hidden="true" />
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
