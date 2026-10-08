import { referenceCoverage, priceMethodology } from '../../utils/referencePricing.js';
import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import { formatCurrency } from '../../utils/formatCurrency.js';

export default function BudgetPanel({ budget, totalPrice, pricing, selectedComponents }) {
  const coverage = referenceCoverage(selectedComponents);
  const dated = selectedComponents ? coverage.dated : pricing?.datedReferenceUnits;
  const estimated = selectedComponents ? coverage.estimated : pricing?.estimatedReferenceUnits;
  const amount = Number(budget?.amount);
  const hasBudget = budget?.amount !== '' && budget?.amount != null && Number.isFinite(amount) && amount > 0;
  const hasTotal = totalPrice !== null && totalPrice !== undefined && Number.isFinite(Number(totalPrice));
  const remaining = hasBudget && hasTotal ? amount - totalPrice : null;
  const status = remaining === null ? 'pending' : remaining >= 0 ? 'within' : 'over';

  return (
    <Card className="budget-panel">
      <div className="section-heading compact">
        <h3>Orçamento</h3>
        <Badge tone={status === 'over' ? 'red' : status === 'within' ? 'green' : 'cyan'}>
          {status === 'over' ? 'Acima' : status === 'within' ? 'Dentro' : 'Pendente'}
        </Badge>
      </div>
      <div className="metric-grid">
        <div>
          <span>Orçamento</span>
          <strong>{hasBudget ? formatCurrency(amount) : 'Não informado'}</strong>
        </div>
        <div>
          <span>Total estimado da build</span>
          <strong>{formatCurrency(totalPrice)}</strong>
        </div>
        <div>
          <span>{remaining >= 0 ? 'Restante' : 'Excedente'}</span>
          <strong>{remaining === null ? 'Aguardando' : formatCurrency(Math.abs(remaining))}</strong>
        </div>
      </div>
      {!hasTotal && <p role="status">Há peças sem preço informado. O total e a avaliação do orçamento estão indisponíveis.</p>}
      <details className="reference-price-note">
        <summary>Referências de preço{Number.isFinite(dated) && Number.isFinite(estimated) ? ` · ${dated} datadas · ${estimated} estimadas` : ''}</summary>
        <div className="reference-price-details">
          <p>Preço atual e estoque não confirmados.</p>
          {pricing && <div>
            <p>Cotações com disponibilidade confirmada: {pricing.availableMarketQuotesTotal === null ? 'indisponíveis' : formatCurrency(pricing.availableMarketQuotesTotal)}{!pricing.marketTotalComplete && ' (subtotal incompleto)'}</p>
            <p>Componentes sem cotação atual: {pricing.componentsWithoutCurrentQuote?.length ?? 'Não informado'}</p>
            <p>{pricing.methodology}</p>
          </div>}
          <p>{Number.isFinite(dated) && Number.isFinite(estimated) ? `${dated} pack(s) com referência datada · ${estimated} com estimativa sem fonte datada validada.` : 'Cobertura de fontes da seleção não informada.'}</p>
          <p>{priceMethodology}</p>
        </div>
      </details>
    </Card>
  );
}
