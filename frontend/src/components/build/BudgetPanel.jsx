import { referenceCoverage, knownPriceSubtotal } from '../../utils/referencePricing.js';
import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import { formatCurrency } from '../../utils/formatCurrency.js';

export default function BudgetPanel({ budget, totalPrice, pricing, selectedComponents }) {
  const coverage = referenceCoverage(selectedComponents);
  const known = selectedComponents ? knownPriceSubtotal(selectedComponents) : { subtotal: pricing?.knownReferenceSubtotal, missing: pricing?.componentsWithoutReference?.length };
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
      {!hasTotal && <p role="status">Preço pendente em uma ou mais peças. Orçamento ainda não concluído.</p>}
      {!hasTotal && Number.isFinite(known.subtotal) && <p className="reference-price-note">Subtotal conhecido: {formatCurrency(known.subtotal)}{known.missing > 0 ? ` · ${known.missing} sem cotação` : ''}</p>}
      <p className="reference-price-note">Total de referência, sem frete e montagem{Number.isFinite(dated) && Number.isFinite(estimated) && estimated > 0 ? ` · ${estimated} ${estimated === 1 ? 'item estimado' : 'itens estimados'}` : ''}.</p>
      {pricing?.availableMarketQuotesTotal != null && <p className="reference-price-note">Cotações disponíveis: {formatCurrency(pricing.availableMarketQuotesTotal)}{!pricing.marketTotalComplete && ' (subtotal incompleto)'}. Separadas do total de referência.</p>}
    </Card>
  );
}
