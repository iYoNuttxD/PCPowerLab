import Card from '../ui/Card.jsx';
import { readableMessage } from '../../utils/translations.js';

export default function CompatibilityStatus({ result }) {
  if (!result) return <Card><h3>Conferência das peças</h3><p>Escolha suas peças para conferir os dados disponíveis.</p></Card>;
  const issues = Array.isArray(result.alerts) ? result.alerts : [];
  const hasConflict = issues.length > 0 || result.status === 'incompatible';
  const pending = (result.unverifiedChecks || []).filter(check => !String(check.code).includes('BIOS'));
  const cooling = result.coolingAssessment?.unverifiedChecks || [];
  const details = [...pending, ...cooling].filter((v, i, a) => a.findIndex(x => x.code === v.code) === i);
  return <Card className={hasConflict ? 'status-incompatible' : 'status-compatible'}>
    <h3>{result.available === false ? 'Conferência temporariamente indisponível' : hasConflict ? 'Confira um conflito entre as peças' : 'Nenhum conflito nos dados disponíveis'}</h3>
    <p>{hasConflict ? `${issues[0]?.message ? readableMessage(issues[0].message) : 'Há uma incompatibilidade informada nesta montagem.'} Você pode continuar; os resultados serão um cenário teórico.` : 'Você pode continuar a montagem e ver as estimativas.'}</p>
    {(details.length > 0 || issues.length > 1 || result.available === false) && <details className="task-disclosure">
      <summary>Detalhes da conferência</summary>
      <p>Dados ausentes não significam incompatibilidade e não impedem estimar o desempenho. A conferência usa somente informações disponíveis.</p>
      <ul>{[...issues.slice(1), ...details].map((item, index) => <li key={item.code || index}>{readableMessage(item.message || item.reason)}</li>)}</ul>
      {result.available === false && <p>A consulta técnica não respondeu. As estimativas e as peças continuam disponíveis.</p>}
    </details>}
  </Card>;
}
