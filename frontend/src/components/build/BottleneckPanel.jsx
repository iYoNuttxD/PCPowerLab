import { useId } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Link } from 'react-router-dom';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import AnalysisHelp from './AnalysisHelp.jsx';
import { numericValue } from '../../utils/performancePresentation.js';
import { translateBottleneckType, translateComponent, translateMetricLabel, translateSeverity, translateValue } from '../../utils/translations.js';

export default function BottleneckPanel({ result }) {
  const scoreDescriptionId = useId();
  const powerDescriptionId = useId();
  if (!result) {
    return (
      <Card>
        <h3>Gargalos</h3>
        <p>A análise será exibida depois que uma build completa for enviada.</p>
        <AnalysisHelp topics={['bottleneck']} title="O que é um gargalo?" />
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
  const performanceSummary = analysis.performanceSummary || {};
  const scoreKeys = ['cpuScore', 'gpuScore', 'ramScore', 'storageScore'];
  const performanceColors = {
    cpuScore: 'var(--cyan)',
    gpuScore: 'var(--magenta)',
    ramScore: 'var(--green)',
    storageScore: 'var(--yellow)'
  };
  const chartData = scoreKeys
    .filter((name) => numericValue(performanceSummary[name]) !== null)
    .map((name) => ({
      key: name,
      name: translateMetricLabel(name),
      shortName: { cpuScore: 'CPU', gpuScore: 'GPU', ramScore: 'RAM', storageScore: 'SSD/HD' }[name],
      score: performanceSummary[name],
      color: performanceColors[name]
    }));
  const powerData = buildPowerData(performanceSummary);
  const safetyMargin = powerData.length ? powerData[0].psuWatts - powerData[0].estimatedConsumptionWatts : null;
  const hasPowerData = powerData.length > 0;

  const tooltipFormatter = (value, name) => [
    `${value}${name === 'score' ? ' pts' : ' W'}`,
    name === 'score' ? 'Pontuação' : translateMetricLabel(name)
  ];

  const tooltipLabelFormatter = (label) => translateMetricLabel(label) || label;

  const powerLegendItems = [
    ['estimatedConsumptionWatts', 'var(--cyan)'],
    ['recommendedWatts', 'var(--yellow)'],
    ['psuWatts', 'var(--green)']
  ];

  return (
    <Card>
      <div className="section-heading compact">
        <h3>Análise de gargalos</h3>
        <Badge tone={analysis.hasBottleneck ? 'yellow' : 'green'}>
          {translateValue(analysis.overallBalance || (analysis.hasBottleneck ? 'moderate' : 'balanced'))}
        </Badge>
      </div>
      <p className="analysis-note">Análise estimada a partir dos parâmetros cadastrados. Um gargalo indica uma possível limitação entre peças, não um defeito ou uma medição feita no seu PC.</p>
      <AnalysisHelp topics={['bottleneck', 'score', 'energy']} />
      {chartData.length > 0 && (
        <div className="performance-chart-panel" role="group" aria-label="Gráfico de desempenho dos componentes" aria-describedby={scoreDescriptionId}>
          <p id={scoreDescriptionId} className="chart-caption">Pontuações de 0 a 100 por componente. Barras maiores indicam maior pontuação no cadastro; os pontos não são FPS. Avalie o equilíbrio junto dos alertas abaixo.</p>
          <div className="chart-box performance-chart">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#234" />
                <XAxis dataKey="shortName" stroke="var(--muted)" tick={{ fontSize: 12 }} />
                <YAxis stroke="var(--muted)" domain={[0, 100]} width={36} />
                <Tooltip
                  content={<PerformanceTooltip />}
                />
                <Bar dataKey="score" name="Pontuação" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                  {chartData.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="manual-legend performance-legend" role="group" aria-label="Legenda do desempenho dos componentes">
            {chartData.map((entry) => (
              <span key={entry.key}>
                <i style={{ background: entry.color }} aria-hidden="true" />
                {entry.shortName}: {entry.name} · {entry.score} pontos
              </span>
            ))}
          </div>
        </div>
      )}
      {hasPowerData && (
        <div className="energy-panel">
          <div>
            <h4>Consumo energético</h4>
            <p id={powerDescriptionId} className="chart-caption">Compare a potência estimada das peças com a capacidade da fonte, em watts (W). A barra da fonte indica sua capacidade, não o consumo medido na tomada.</p>
          </div>
          <div className="chart-box energy-chart" role="group" aria-label="Gráfico de consumo energético da build" aria-describedby={powerDescriptionId}>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={powerData} margin={{ top: 12, right: 12, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#234" />
                <XAxis dataKey="name" stroke="#b9f8ff" tickFormatter={tooltipLabelFormatter} />
                <YAxis stroke="#b9f8ff" unit=" W" />
                <Tooltip
                  formatter={tooltipFormatter}
                  labelFormatter={tooltipLabelFormatter}
                  contentStyle={{ background: '#09111f', border: '1px solid #36f2ff', color: '#fff' }}
                />
                <Bar dataKey="estimatedConsumptionWatts" fill="var(--cyan)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="recommendedWatts" fill="var(--yellow)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="psuWatts" fill="var(--green)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="manual-legend" role="group" aria-label="Legenda do consumo energético">
            {powerLegendItems.map(([key, color]) => (
              <span key={key}>
                <i style={{ background: color }} aria-hidden="true" />
                {key === 'recommendedWatts' ? 'Referência da fonte com folga' : translateMetricLabel(key)}: {powerData[0][key]} W
              </span>
            ))}
          </div>
          {Number.isFinite(safetyMargin) && (
            <p className="energy-note">
              Margem de segurança da fonte: <strong>{safetyMargin} W</strong>.
            </p>
          )}
          <details className="analysis-help"><summary>Como interpretar a referência da fonte</summary><p>A referência visual usa o consumo estimado acrescido de 35% de folga, arredondado para o próximo múltiplo de 50 W. A margem exibida é a potência nominal da fonte menos o consumo estimado. Consulte também os alertas técnicos e as recomendações dos fabricantes.</p></details>
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
            {bottleneck.technicalDetails && (
              <details className="analysis-help"><summary>Ver detalhes técnicos deste gargalo</summary>
              <dl className="technical-details">
                {Object.entries(bottleneck.technicalDetails).map(([key, value]) => (
                  <div key={key}>
                    <dt>{translateMetricLabel(key)}</dt>
                    <dd>{formatTechnicalValue(key, value)}</dd>
                  </div>
                ))}
              </dl>
              </details>
            )}
          </article>
        ))}
      </div>
    </Card>
  );
}

function PerformanceTooltip({ active, payload }) {
  if (!active || !Array.isArray(payload) || payload.length === 0) {
    return null;
  }

  const entry = payload[0]?.payload || {};
  const value = Number(entry.score);

  return (
    <div className="chart-tooltip">
      <strong>{entry.name || 'Pontuação de desempenho'}</strong>
      <div className="chart-tooltip__row">
        <span>Pontuação</span>
        <strong>{Number.isFinite(value) ? `${value} pontos` : 'Não disponível'}</strong>
      </div>
    </div>
  );
}

function buildPowerData(performanceSummary) {
  const estimated = numericValue(performanceSummary.estimatedConsumptionWatts);
  const psu = numericValue(performanceSummary.psuWatts);

  if (!Number.isFinite(estimated) || !Number.isFinite(psu)) {
    return [];
  }

  return [{
    name: 'powerUsage',
    estimatedConsumptionWatts: estimated,
    recommendedWatts: Math.ceil((estimated * 1.35) / 50) * 50,
    psuWatts: psu
  }];
}

function formatTechnicalValue(key, value) {
  if (!Number.isFinite(Number(value))) {
    return String(value);
  }

  if (key.toLowerCase().includes('watts') || key.toLowerCase().includes('power') || key === 'tdpTotal') {
    return `${value} W`;
  }

  if (key.toLowerCase().includes('percent')) {
    return `${value}%`;
  }

  return String(value);
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
