import CoolingAssessmentNotice from './CoolingAssessmentNotice.jsx';
import { hasUnverifiedCooling } from '../../utils/coolingAssessment.js';
import Badge from '../ui/Badge.jsx';
import Card from '../ui/Card.jsx';
import AnalysisHelp from '../build/AnalysisHelp.jsx';
import { translateSeverity, translateValue, readableMessage } from '../../utils/translations.js';

export default function CompatibilityStatus({ result }) {
  if (!result) {
    return (
      <Card>
        <h3>Compatibilidade ainda não verificada</h3>
        <p>Monte uma build completa e execute a análise para receber alertas técnicos.</p>
        <AnalysisHelp topics={['compatibility']} title="O que a compatibilidade verifica?" />
      </Card>
    );
  }

  const unverified = result.status === 'unverified';
  const coolingPending = hasUnverifiedCooling(result);
  const unverifiedChecks = Array.isArray(result.unverifiedChecks) ? result.unverifiedChecks : [];
  const pendingCodes = new Set(unverifiedChecks.map(check => check.code).filter(Boolean));
  const issues = (Array.isArray(result.alerts) ? result.alerts : (result.violations || result.issues || [])).filter(issue => !pendingCodes.has(issue.code));

  return (
    <Card className={result.compatible ? coolingPending ? 'status-unverified' : 'status-compatible' : unverified ? 'status-unverified' : 'status-incompatible'}>
      <div className="section-heading compact">
        <h3>{result.compatible ? coolingPending ? 'Peças principais compatíveis' : 'Build compatível' : unverified ? 'Compatibilidade não verificada' : 'Atenção: incompatibilidades encontradas'}</h3>
        <Badge tone={result.compatible ? coolingPending ? 'yellow' : 'green' : unverified ? 'yellow' : 'red'}>{result.compatible ? coolingPending ? 'Parcial' : 'OK' : unverified ? 'Dados insuficientes' : `${issues.length} alerta(s)`}</Badge>
      </div>
      <CoolingAssessmentNotice result={result} />
      <p className="analysis-note">Verificação pelas especificações cadastradas. Compatibilidade indica se as peças podem funcionar juntas; não é uma garantia de FPS.</p>
      <AnalysisHelp topics={['compatibility']} title="Entenda a compatibilidade" />
      {unverifiedChecks.length > 0 && <div className="stack"><h4>Verificações pendentes</h4>{unverifiedChecks.map((check, index) => <article className="issue-card" key={check.code || index}><strong>{readableMessage(check.title) || translateValue(check.code, 'Dados técnicos insuficientes')}</strong><p>{readableMessage(typeof check === 'string' ? check : check.message || check.reason)}</p></article>)}</div>}
      {issues.length === 0 ? (
        <p>{unverified ? 'Dados incompletos não confirmam compatibilidade. Verifique as especificações do fabricante.' : 'Nenhuma incompatibilidade crítica foi identificada nas regras verificadas.'}</p>
      ) : (
        <div className="stack">
          {issues.map((alert, index) => (
            <article key={`${alert.code || alert.title}-${index}`} className={`issue-card severity-${alert.severity || 'medium'}`}>
              <strong>{readableMessage(alert.title) || translateValue(alert.code, 'Alerta técnico')}</strong>
              <p>{readableMessage(alert.message)}</p>
              <small>
                Severidade {translateSeverity(alert.severity || 'medium')}
                {Array.isArray(alert.components) && alert.components.length > 0
                  ? ` • Componentes: ${alert.components.map((component) => translateValue(component)).join(', ')}`
                  : ''}
              </small>
              {alert.suggestion && <p className="suggestion-text">{readableMessage(alert.suggestion)}</p>}
            </article>
          ))}
        </div>
      )}
    </Card>
  );
}
