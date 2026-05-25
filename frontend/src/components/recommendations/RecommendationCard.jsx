import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import { componentLabels, componentTypes } from '../../utils/componentLabels.js';
import { formatCurrency } from '../../utils/formatCurrency.js';

export default function RecommendationCard({ recommendation, onApply }) {
  if (!recommendation) {
    return (
      <Card>
        <h3>Recomendações</h3>
        <p>Informe orçamento e tipo de uso para gerar uma configuração recomendada.</p>
      </Card>
    );
  }

  return (
    <Card className="recommendation-card">
      <div className="section-heading compact">
        <h3>Configuração recomendada</h3>
        <strong>{formatCurrency(recommendation.totalEstimatedPrice)}</strong>
      </div>
      <p>{recommendation.summary || recommendation.strategy}</p>
      <ul className="build-parts-list">
        {componentTypes.map((type) => {
          const component = recommendation.components?.[type];

          return (
            <li key={type}>
              <span>{componentLabels[type]}</span>
              <strong>{component?.name || 'Não sugerido'}</strong>
            </li>
          );
        })}
      </ul>
      {onApply && (
        <Button onClick={() => onApply(recommendation)}>
          Usar esta recomendação
        </Button>
      )}
    </Card>
  );
}
