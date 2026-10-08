import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import { formatCurrency } from '../../utils/formatCurrency.js';

export default function BudgetPanel({ budget, totalPrice }) {
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
      <p className="hint-text">Calculado com preços estimados do catálogo. Não inclui frete nem acompanha ofertas em tempo real.</p>
    </Card>
  );
}
