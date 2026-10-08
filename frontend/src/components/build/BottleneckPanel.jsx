import { useId } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Alert from '../ui/Alert.jsx';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import AnalysisHelp from './AnalysisHelp.jsx';
import { formatPerformanceNumber, numericValue } from '../../utils/performancePresentation.js';
import { translateBottleneckType, translateComponent, translateMetricLabel, translateSeverity, translateValue, readableMessage } from '../../utils/translations.js';

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
        <p>{readableMessage(result.message) || defaultUnavailableMessage(reason)}</p>
        {reason === 'missing_performance_parameters' && (
          <p>Os parâmetros precisam ser atualizados pela equipe responsável pelo catálogo. Suas escolhas foram mantidas; revise as peças ou tente novamente após a atualização dos dados.</p>
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
  const scoreData = scoreKeys.map((name) => ({
    key: name,
    name: translateMetricLabel(name),
    shortName: { cpuScore: 'CPU', gpuScore: 'GPU', ramScore: 'RAM', storageScore: 'SSD/HD' }[name],
    score: numericValue(performanceSummary[name]),
    color: performanceColors[name]
  }));
  const chartData = scoreData.filter(entry => entry.score !== null);
  const power = buildPowerData(performanceSummary);
  const powerData = power.values.filter(entry => entry.watts !== null);
  const safetyMargin = power.complete && power.estimated !== null && power.psu !== null ? power.psu - power.estimated : null;

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
      <div className="performance-chart-panel" role="group" aria-label="Gráfico de desempenho dos componentes" aria-describedby={scoreDescriptionId}>
        <h4>Pontuação de desempenho por componente</h4>
        <p id={scoreDescriptionId} className="chart-caption">Pontuações de 0 a 100 por componente. Barras maiores indicam maior pontuação no cadastro; os pontos não são FPS. Avalie o equilíbrio junto dos alertas abaixo.</p>
        {chartData.length > 0 ? (
          <div className="chart-box performance-chart">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} accessibilityLayer>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
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
        ) : <p>Nenhuma pontuação de desempenho disponível para o gráfico.</p>}
        <div className="manual-legend performance-legend" role="group" aria-label="Legenda do desempenho dos componentes">
          {scoreData.map((entry) => (
            <span key={entry.key}>
              <i style={{ background: entry.color }} aria-hidden="true" />
              {entry.shortName}: {entry.name} · {formatPerformanceNumber(entry.score)}{entry.score !== null && ' pontos'}
            </span>
          ))}
        </div>
        {chartData.length < scoreData.length && <p className="chart-caption">Pontuações ausentes não geram barras e não são tratadas como zero.</p>}
      </div>
      <div className="energy-panel">
        <div>
          <h4>Consumo energético e capacidade da fonte</h4>
          <p id={powerDescriptionId} className="chart-caption">Compare a potência estimada das peças com a capacidade da fonte, em watts (W). A barra da fonte indica sua capacidade, não o consumo medido na tomada.</p>
        </div>
        {!power.complete && <Alert type="warning" title="Consumo parcial">Faltam dados de consumo de refrigeração. O valor mostrado soma apenas os dados conhecidos; a referência com folga e a margem da fonte ficam indisponíveis até completar os dados.</Alert>}
        {powerData.length > 0 ? (
          <div className="chart-box energy-chart" role="group" aria-label="Gráfico de consumo energético da build" aria-describedby={powerDescriptionId}>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={powerData} layout="vertical" margin={{ top: 12, right: 12, bottom: 8, left: 0 }} accessibilityLayer>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" stroke="var(--muted)" unit=" W" tick={{ fontSize: 11 }} tickCount={3} />
                <YAxis type="category" dataKey="shortName" stroke="var(--muted)" tick={{ fontSize: 12 }} width={78} interval={0} />
                <Tooltip content={<PowerTooltip />} />
                <Bar dataKey="watts" name="Potência (W)" radius={[0, 6, 6, 0]} isAnimationActive={false}>
                  {powerData.map(entry => <Cell key={entry.key} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <p>Nenhum valor de potência disponível para o gráfico.</p>}
        <div className="manual-legend" role="group" aria-label="Legenda do consumo energético">
          {power.values.map(entry => (
            <span key={entry.key}>
              <i style={{ background: entry.color }} aria-hidden="true" />
              {entry.name}: {formatPerformanceNumber(entry.watts)}{entry.watts !== null && ' W'}
            </span>
          ))}
        </div>
        {Number.isFinite(safetyMargin) && (
          <p className="energy-note">
            Diferença entre capacidade da fonte e consumo estimado: <strong>{formatPerformanceNumber(safetyMargin)} W</strong>.
          </p>
        )}
        <details className="analysis-help"><summary>Como interpretar a referência da fonte</summary><p>Fonte dos dados: parâmetros de potência e acessórios cadastrados, usados pelo modelo heurístico. A referência visual usa o consumo estimado acrescido de 35% de folga, arredondado para o próximo múltiplo de 50 W. A diferença exibida é a potência nominal da fonte menos o consumo estimado; não garante segurança elétrica. Quando faltam dados, a referência e a diferença não são calculadas. Consulte também os alertas técnicos e as recomendações dos fabricantes.</p></details>
      </div>
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
  const value = numericValue(entry.score);

  return (
    <div className="chart-tooltip">
      <strong>{entry.name || 'Pontuação de desempenho'}</strong>
      <div className="chart-tooltip__row">
        <span>Pontuação</span>
        <strong>{value === null ? 'Não disponível' : `${formatPerformanceNumber(value)} pontos`}</strong>
      </div>
    </div>
  );
}

function buildPowerData(performanceSummary) {
  const estimated = numericValue(performanceSummary.estimatedConsumptionWatts);
  const psu = numericValue(performanceSummary.psuWatts);
  const complete = performanceSummary.powerEstimateComplete !== false && !performanceSummary.unknownPowerComponents?.length;
  return { estimated, psu, complete, values: [
    { key: 'estimatedConsumptionWatts', shortName: complete ? 'Consumo' : 'Parcial', name: complete ? 'Consumo estimado' : 'Consumo parcial conhecido', watts: estimated, color: 'var(--cyan)' },
    { key: 'recommendedWatts', shortName: 'Referência', name: 'Referência da fonte com folga', watts: complete && estimated !== null ? Math.ceil((estimated * 1.35) / 50) * 50 : null, color: 'var(--yellow)' },
    { key: 'psuWatts', shortName: 'Fonte', name: 'Capacidade nominal da fonte', watts: psu, color: 'var(--green)' }
  ] };
}

function PowerTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;
  return <div className="chart-tooltip"><strong>{entry.name}</strong><p>{formatPerformanceNumber(entry.watts)} W</p></div>;
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
