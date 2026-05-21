import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Link } from 'react-router-dom';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import { translateBottleneckType, translateComponent, translateSeverity, translateValue } from '../../utils/translations.js';

export default function BottleneckPanel({ result }) {
  if (!result) {
    return (
      <Card>
        <h3>Gargalos</h3>
        <p>A análise será exibida depois que uma build completa for enviada.</p>
      </Card>
    );
  }

  if (result.status === 'loading') {
    return (
      <Card>
        <div className="section-heading compact">
          <h3>Análise de gargalos</h3>
          <Badge tone="cyan">Em análise</Badge>
        </div>
        <p>Analisando possíveis gargalos...</p>
      </Card>
    );
  }

  if (result.status === 'unavailable' || result.unavailable || result.available === false) {
    const reason = result.reason || (hasMissingParameterMessage(result) ? 'missing_performance_parameters' : 'unexpected_error');

    return (
      <Card>
        <div className="section-heading compact">
          <h3>Análise de gargalos indisponível</h3>
          <Badge tone="yellow">{translateValue(reason)}</Badge>
        </div>
        <p>{result.message || defaultUnavailableMessage(reason)}</p>
        {reason === 'missing_performance_parameters' && (
          <Link className="btn btn-secondary btn-md" to="/admin">
            Ver parâmetros de desempenho
          </Link>
        )}
      </Card>
    );
  }

  if (result.status === 'error') {
    return (
      <Card>
        <div className="section-heading compact">
          <h3>Gargalos</h3>
          <Badge tone="red">{translateValue(result.reason || 'unexpected_error')}</Badge>
        </div>
        <p>{result.message || 'Não foi possível analisar gargalos no momento.'}</p>
        {result.onRetry && <Button variant="secondary" onClick={result.onRetry}>Tentar novamente</Button>}
      </Card>
    );
  }

  const analysis = result.data || result;
  const bottlenecks = Array.isArray(analysis.bottlenecks) ? analysis.bottlenecks : [];
  const chartData = Object.entries(analysis.performanceSummary || {}).map(([name, value]) => ({
    name: translateComponent(name.replace('Score', '')),
    score: value
  }));

  return (
    <Card>
      <div className="section-heading compact">
        <h3>Análise de gargalos</h3>
        <Badge tone={analysis.hasBottleneck ? 'yellow' : 'green'}>
          {translateValue(analysis.overallBalance || (analysis.hasBottleneck ? 'moderate' : 'balanced'))}
        </Badge>
      </div>
      {chartData.length > 0 && (
        <div className="chart-box" aria-label="Gráfico de scores dos componentes">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#234" />
              <XAxis dataKey="name" stroke="#b9f8ff" />
              <YAxis stroke="#b9f8ff" />
              <Tooltip contentStyle={{ background: '#09111f', border: '1px solid #36f2ff', color: '#fff' }} />
              <Bar dataKey="score" fill="#39ff88" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="stack">
        {bottlenecks.length === 0 ? (
          <p>Não foram identificados gargalos relevantes para os dados enviados.</p>
        ) : bottlenecks.map((bottleneck, index) => (
          <article key={`${bottleneck.type}-${index}`} className={`issue-card severity-${bottleneck.severity}`}>
            <strong>{translateBottleneckType(bottleneck.type)}</strong>
            <p>{bottleneck.message}</p>
            <small>
              Severidade {translateSeverity(bottleneck.severity)} • {translateComponent(bottleneck.component)}
              {bottleneck.relatedComponent ? ` relacionado a ${translateComponent(bottleneck.relatedComponent)}` : ''}
            </small>
          </article>
        ))}
      </div>
    </Card>
  );
}

function hasMissingParameterMessage(result) {
  const message = `${result.message || ''} ${(result.errors || []).join(' ')}`.toLowerCase();

  return message.includes('parâmetros de desempenho') || message.includes('parametros de desempenho');
}

function defaultUnavailableMessage(reason) {
  if (reason === 'incompatible_build') {
    return 'A análise de gargalos será liberada após corrigir as incompatibilidades da build.';
  }

  if (reason === 'missing_performance_parameters') {
    return 'Não foi possível analisar gargalos porque alguns componentes ainda não possuem parâmetros de desempenho cadastrados.';
  }

  return 'Não foi possível analisar gargalos no momento.';
}
