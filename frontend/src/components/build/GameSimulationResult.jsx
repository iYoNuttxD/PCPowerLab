import Alert from '../ui/Alert.jsx';
import Badge from '../ui/Badge.jsx';
import AnalysisHelp, { EstimateNotice } from './AnalysisHelp.jsx';
import { formatPerformanceNumber, formatRequirement, numericValue } from '../../utils/performancePresentation.js';
import { translateBottleneckType, translateMetricLabel, translateSeverity, translateValue } from '../../utils/translations.js';

export default function GameSimulationResult({ result }) {
  if (!result) return null;
  if (result.available === false) return (
    <section className="performance-result-panel" aria-label="Resultado da simulação individual">
      <div className="section-heading compact">
        <div><h3>{result.game || 'Jogo simulado'}</h3><p>{result.targetResolution || 'Resolução não informada'} · Nível gráfico: {translateValue(result.qualityPreset)}</p></div>
        <Badge tone="yellow">Sem estimativa</Badge>
      </div>
      <Alert type="warning">{translateValue('performance_model_unavailable')}</Alert>
    </section>
  );
  const technical = result.technicalDetails || {};
  const bottlenecks = Array.isArray(technical.bottlenecks) ? technical.bottlenecks : [];
  const belowMinimum = result.meetsMinimumRequirements === false;

  return (
    <section className="performance-result-panel" aria-label="Resultado da simulação individual">
      <div className="section-heading compact">
        <div><h3>{result.game || 'Jogo simulado'}</h3><p>{result.targetResolution || 'Resolução não informada'} · Nível gráfico: {translateValue(result.qualityPreset)}</p></div>
        <Badge tone={belowMinimum ? 'red' : 'cyan'}>Estimativa</Badge>
      </div>
      <div className="metric-grid">
        <div><span>FPS estimado</span><strong>{formatPerformanceNumber(result.estimatedFps)}{numericValue(result.estimatedFps) !== null && ' FPS'}</strong></div>
        <div><span>Classificação de desempenho</span><strong>{translateValue(result.performanceLevel)}</strong></div>
        <div><span>Atende requisitos mínimos</span><strong>{formatRequirement(result.meetsMinimumRequirements)}</strong></div>
        <div><span>Atende requisitos recomendados</span><strong>{formatRequirement(result.meetsRecommendedRequirements)}</strong></div>
      </div>
      <EstimateNotice />
      {belowMinimum ? <Alert type="warning">A configuração está abaixo dos requisitos mínimos cadastrados. Pode haver limitações mesmo que o FPS estimado pareça alto.</Alert>
        : result.meetsRecommendedRequirements === false && <Alert type="warning">A configuração não atende a todos os requisitos recomendados cadastrados. Confira as limitações por componente nos detalhes.</Alert>}
      {bottlenecks.length > 0 && <Alert type="warning">A simulação identificou possíveis gargalos e considerou seu impacto na estimativa. Veja quais peças nos detalhes técnicos.</Alert>}
      {Array.isArray(result.warnings) && result.warnings.map((warning, index) => <Alert key={index} type="warning">{warning}</Alert>)}
      <AnalysisHelp topics={['fps', 'bottleneck']} />
      <details className="analysis-help">
        <summary>Ver requisitos e detalhes técnicos da simulação</summary>
        {result.summary && <p>{result.summary}</p>}
        <dl className="technical-details">
          {Object.entries(result.details || {}).map(([key, value]) => (
            <div key={key}><dt>{requirementLabels[key] || translateMetricLabel(key)}</dt><dd>{translateValue(value)}</dd></div>
          ))}
          {['weightedPerformanceIndex', 'qualityMultiplier', 'resolutionMultiplier', 'bottleneckPenalty'].filter(key => key in technical).map(key => (
            <div key={key}><dt>{technicalLabels[key]}</dt><dd>{formatPerformanceNumber(technical[key])}</dd></div>
          ))}
        </dl>
        {Object.keys(technical).length > 0 && <p className="hint-text">O índice ponderado combina as peças em relação aos requisitos do jogo. Os multiplicadores ajustam o cálculo: 1 mantém a referência; valores menores a reduzem. A classificação considera também os requisitos, não apenas o FPS.</p>}
        {bottlenecks.map((item, index) => (
          <article className="issue-card" key={index}>
            <strong>{translateBottleneckType(item.type)} · Severidade {translateSeverity(item.severity)}</strong>
            <p>{item.message}</p>
            <dl className="technical-details">{Object.entries(item.technicalDetails || {}).map(([key, value]) => <div key={key}><dt>{translateMetricLabel(key)}</dt><dd>{String(value)}</dd></div>)}</dl>
          </article>
        ))}
      </details>
    </section>
  );
}

const requirementLabels = { cpuStatus: 'Processador', gpuStatus: 'Placa de vídeo', ramStatus: 'Memória RAM', storageStatus: 'Armazenamento' };
const technicalLabels = { weightedPerformanceIndex: 'Índice ponderado de desempenho', qualityMultiplier: 'Multiplicador de qualidade gráfica', resolutionMultiplier: 'Multiplicador de resolução', bottleneckPenalty: 'Multiplicador por gargalos' };
