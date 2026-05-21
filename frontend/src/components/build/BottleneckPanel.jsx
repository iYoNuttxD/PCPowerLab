import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Badge from '../ui/Badge.jsx';
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

  const bottlenecks = Array.isArray(result.bottlenecks) ? result.bottlenecks : [];
  const chartData = Object.entries(result.performanceSummary || {}).map(([name, value]) => ({
    name: translateComponent(name.replace('Score', '')),
    score: value
  }));

  return (
    <Card>
      <div className="section-heading compact">
        <h3>Análise de gargalos</h3>
        <Badge tone={result.hasBottleneck ? 'yellow' : 'green'}>
          {translateValue(result.overallBalance || (result.hasBottleneck ? 'moderate' : 'balanced'))}
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
