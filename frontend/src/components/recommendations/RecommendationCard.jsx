import ComponentIdentity from '../componentsCatalog/ComponentIdentity.jsx';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import { componentLabels, componentTypes } from '../../utils/componentLabels.js';
import { calculateBuildPrice, recommendationSelection } from '../../utils/buildHelpers.js';
import { formatCurrency } from '../../utils/formatCurrency.js';

export default function RecommendationCard({ recommendation, onApply, currentComponents = {} }) {
  if (!recommendation) {
    return (
      <Card>
        <h3>Recomendações</h3>
        <p>Informe orçamento e tipo de uso para gerar uma configuração recomendada.</p>
      </Card>
    );
  }

  const suggested = recommendation.components || {};
  const retainsCooling = ((!Object.hasOwn(suggested, 'cooler') && !Object.hasOwn(suggested, 'coolerId') && currentComponents.cooler)
    || (!Object.hasOwn(suggested, 'fans') && currentComponents.fans?.length));
  const displayedTotal = retainsCooling ? calculateBuildPrice(recommendationSelection(currentComponents, suggested)) : recommendation.totalEstimatedPrice;
  return (
    <Card className="recommendation-card">
      <div className="section-heading compact">
        <h3>Configuração recomendada</h3>
        <strong>{formatCurrency(displayedTotal)}</strong>
      </div>
      {retainsCooling ? <p>O total inclui a refrigeração atual que será mantida. Esta combinação ainda não foi verificada: compatibilidade e orçamento precisam de nova análise antes de concluir a montagem.</p> : <p>{recommendation.summary || recommendation.strategy}</p>}
      <ul className="build-parts-list">
        {[...componentTypes, ...(recommendation.components?.cooler ? ['cooler'] : [])].map((type) => {
          const component = recommendation.components?.[type];

          return (
            <li key={type}>
              <span>{componentLabels[type]}</span>
              <ComponentIdentity component={component || recommendation.components?.[`${type}Id`]} category={type} fallback="Não sugerido" />
            </li>
          );
        })}
        {(recommendation.components?.fans || []).map((fan, index) => <li key={fan.id || index}><span>Ventoinhas</span><ComponentIdentity component={fan} category="fan"><small>{fan.quantity} pacote(s)</small></ComponentIdentity></li>)}
      </ul>
      {onApply && <p className="hint-text">Se a recomendação não incluir refrigeração, as escolhas atuais de cooler e ventoinhas serão mantidas. Execute a análise novamente: total e compatibilidade podem mudar.</p>}
      {onApply && (
        <Button onClick={() => onApply(recommendation)}>
          Usar esta recomendação
        </Button>
      )}
    </Card>
  );
}
