import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import { formatCurrency } from '../../utils/formatCurrency.js';

export default function BudgetPanel({ budget, totalPrice }) {
  const amount = Number(budget?.amount);
  const remaining = Number.isFinite(amount) ? amount - totalPrice : null;
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
          <strong>{Number.isFinite(amount) ? formatCurrency(amount) : 'Não informado'}</strong>
        </div>
        <div>
          <span>Total da build</span>
          <strong>{formatCurrency(totalPrice)}</strong>
        </div>
        <div>
          <span>{remaining >= 0 ? 'Restante' : 'Excedente'}</span>
          <strong>{remaining === null ? 'Aguardando' : formatCurrency(Math.abs(remaining))}</strong>
        </div>
      </div>
    </Card>
  );
}
