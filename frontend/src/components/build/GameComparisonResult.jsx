import CoolingAssessmentNotice from '../compatibility/CoolingAssessmentNotice.jsx';
import { useId } from 'react';
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Alert from '../ui/Alert.jsx';
import Badge from '../ui/Badge.jsx';
import AnalysisHelp, { EstimateNotice } from './AnalysisHelp.jsx';
import { formatPerformanceNumber, formatRequirement, numericValue } from '../../utils/performancePresentation.js';
import { translateValue } from '../../utils/translations.js';

export default function GameComparisonResult({ result }) {
  const descriptionId = useId();
  if (!result) return null;
  const games = Array.isArray(result.results) ? result.results : Array.isArray(result.games) ? result.games : [];
  const chartData = games.map(game => ({ ...game, name: game.gameName || game.name || game.game || 'Jogo',
    estimatedFps: game.available === false ? null : numericValue(game.estimatedFps),
    ...(game.available === false && { performanceLevel: null, meetsMinimumRequirements: null, meetsRecommendedRequirements: null })
  }));
  const fpsValues = chartData.map(game => game.estimatedFps).filter(value => value !== null);
  const average = fpsValues.length ? Math.round(fpsValues.reduce((sum, fps) => sum + fps, 0) / fpsValues.length) : null;
  const belowMinimum = chartData.filter(game => game.meetsMinimumRequirements === false).length;

  return (
    <section className="performance-result-panel" aria-label="Resultado da comparação de jogos">
      <div className="section-heading compact">
        <h3>Resultado da comparação</h3>
        <Badge tone="cyan">{result.targetResolution || 'Resolução não informada'} · {translateValue(result.qualityPreset)}</Badge>
      </div>
      <CoolingAssessmentNotice result={result} />
      <EstimateNotice />
      {!games.length ? <p>Nenhum resultado retornado para os jogos selecionados.</p> : (
        <>
          <h4>FPS estimado por jogo</h4>
          <p id={descriptionId} className="chart-caption">Cada barra representa o FPS estimado de um jogo com a mesma build, resolução e qualidade. Barras maiores sugerem mais fluidez. A linha de 60 FPS é uma referência visual, não a verificação dos requisitos recomendados.</p>
          {fpsValues.length > 0 ? (
            <div className="game-comparison-chart" role="group" aria-label="Gráfico comparativo de FPS estimado por jogo" aria-describedby={descriptionId}>
              <ResponsiveContainer width="100%" height={Math.max(240, games.length * 56 + 48)}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 20, right: 32, bottom: 8, left: 0 }} accessibilityLayer>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" stroke="var(--muted)" unit=" FPS" tick={{ fontSize: 11 }} tickCount={3} />
                  <YAxis dataKey="name" type="category" width={120} stroke="var(--muted)" tick={{ fontSize: 12 }} tickFormatter={name => name.length > 18 ? `${name.slice(0, 17)}…` : name} />
                  <Tooltip content={<ComparisonTooltip />} position={{ x: 0, y: 0 }} allowEscapeViewBox={{ x: false, y: false }} wrapperStyle={{ maxWidth: '100%', width: 'min(260px, 100%)' }} />
                  <ReferenceLine x={60} ifOverflow="extendDomain" stroke="var(--yellow)" strokeDasharray="4 4" label={{ value: '60 FPS', fill: 'var(--yellow)', position: 'top' }} />
                  <Bar dataKey="estimatedFps" name="FPS estimado" fill="var(--cyan)" radius={[0, 6, 6, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p>Nenhum FPS disponível para o gráfico. Os jogos e seus requisitos continuam na tabela abaixo.</p>}
          <div className="metric-grid compact-metric-grid">
            <div><span>Média dos FPS disponíveis</span><strong>{formatPerformanceNumber(average)}{average !== null && ' FPS'}</strong></div>
            <div><span>Jogos comparados</span><strong>{games.length}</strong></div>
            <div><span>Abaixo da referência de 60 FPS</span><strong>{fpsValues.filter(value => value < 60).length}</strong></div>
          </div>
          {belowMinimum > 0 && <Alert type="warning">{belowMinimum} jogo(s) com requisitos mínimos não atendidos. Confira os resultados por jogo abaixo, mesmo quando o FPS estimado parecer alto.</Alert>}
          {fpsValues.length !== games.length && <Alert type="warning">Há jogos sem FPS disponível. Esses valores não entram na média e não são tratados como zero.</Alert>}
          <AnalysisHelp topics={['fps']} />
          <details className="analysis-help">
            <summary>Ver resultados e requisitos por jogo</summary>
            {result.summary && <p>{result.summary}</p>}
            <div className="analysis-table-scroll" role="region" aria-label="Tabela dos resultados por jogo" tabIndex={0}>
              <table className="analysis-table">
                <caption>Valores estimados e requisitos retornados pela simulação · {result.targetResolution || 'Resolução não informada'} · {translateValue(result.qualityPreset)}</caption>
                <thead><tr><th scope="col">Jogo</th><th scope="col">FPS estimado</th><th scope="col">Classificação</th><th scope="col">Atende mínimos</th><th scope="col">Atende recomendados</th></tr></thead>
                <tbody>{chartData.map((game, index) => <tr key={game.gameId || index}>
                  <th scope="row">{game.name}</th><td>{formatPerformanceNumber(game.estimatedFps)}</td><td>{game.available === false ? 'Sem estimativa' : translateValue(game.performanceLevel)}</td><td>{formatRequirement(game.meetsMinimumRequirements)}</td><td>{formatRequirement(game.meetsRecommendedRequirements)}</td>
                </tr>)}</tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  );
}

function ComparisonTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const game = payload[0].payload;
  return <div className="chart-tooltip"><strong>{game.name}</strong>
    <div className="chart-tooltip__row"><span>FPS estimado</span><strong>{formatPerformanceNumber(game.estimatedFps)}</strong></div>
    <div className="chart-tooltip__row"><span>Classificação</span><strong>{translateValue(game.performanceLevel)}</strong></div>
    <div className="chart-tooltip__row"><span>Atende recomendados</span><strong>{formatRequirement(game.meetsRecommendedRequirements)}</strong></div>
  </div>;
}
