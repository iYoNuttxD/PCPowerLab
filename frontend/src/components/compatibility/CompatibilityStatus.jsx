import Badge from '../ui/Badge.jsx';
import Card from '../ui/Card.jsx';
import { translateSeverity, translateValue } from '../../utils/translations.js';

export default function CompatibilityStatus({ result }) {
  if (!result) {
    return (
      <Card>
        <h3>Compatibilidade ainda não verificada</h3>
        <p>Monte uma build completa e execute a análise para receber alertas técnicos.</p>
      </Card>
    );
  }

  const issues = Array.isArray(result.alerts) ? result.alerts : [];

  return (
    <Card className={result.compatible ? 'status-compatible' : 'status-incompatible'}>
      <div className="section-heading compact">
        <h3>{result.compatible ? 'Build compatível' : 'Atenção: incompatibilidades encontradas'}</h3>
        <Badge tone={result.compatible ? 'green' : 'red'}>{result.compatible ? 'OK' : `${issues.length} alerta(s)`}</Badge>
      </div>
      {issues.length === 0 ? (
        <p>Nenhuma incompatibilidade crítica foi retornada pela API.</p>
      ) : (
        <div className="stack">
          {issues.map((alert, index) => (
            <article key={`${alert.code || alert.title}-${index}`} className={`issue-card severity-${alert.severity || 'medium'}`}>
              <strong>{alert.title || translateValue(alert.code, 'Alerta técnico')}</strong>
              <p>{alert.message}</p>
              <small>
                Severidade {translateSeverity(alert.severity || 'medium')}
                {Array.isArray(alert.components) && alert.components.length > 0
                  ? ` • Componentes: ${alert.components.map((component) => translateValue(component)).join(', ')}`
                  : ''}
              </small>
              {alert.suggestion && <p className="suggestion-text">{alert.suggestion}</p>}
            </article>
          ))}
        </div>
      )}
    </Card>
  );
}
