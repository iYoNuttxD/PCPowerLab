import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, BriefcaseBusiness, Gamepad2 } from 'lucide-react';
import AnalysisHelp from '../components/build/AnalysisHelp.jsx';
import GameComparisonResult from '../components/build/GameComparisonResult.jsx';
import GameSimulationResult from '../components/build/GameSimulationResult.jsx';
import Alert from '../components/ui/Alert.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import Select from '../components/ui/Select.jsx';
import { useBuildState } from '../hooks/useBuildState.jsx';
import { useSimulationRequest } from '../hooks/useSimulationRequest.js';
import { gameComparisonService } from '../services/gameComparisonService.js';
import { performanceService } from '../services/performanceService.js';
import { professionalSoftwareService } from '../services/professionalSoftwareService.js';
import { buildToApiPayload, hasCompleteBuild } from '../utils/buildHelpers.js';
import { componentLabels } from '../utils/componentLabels.js';
import { getMissingBuildSlots } from '../utils/validation.js';
import { formatPerformanceNumber, formatRequirement, getPerformanceErrorMessage } from '../utils/performancePresentation.js';
import { translateValue } from '../utils/translations.js';

export default function PerformanceLab() {
  const build = useBuildState();
  const games = useOptions(performanceService.listGames);
  const software = useOptions(professionalSoftwareService.list);
  const [mode, setMode] = useState('single');
  const [gameId, setGameId] = useState(build.game.gameId);
  const [selectedGameIds, setSelectedGameIds] = useState(['game-counter-strike-2', 'game-cyberpunk-2077']);
  const [targetResolution, setTargetResolution] = useState(build.game.targetResolution);
  const [qualityPreset, setQualityPreset] = useState(build.game.qualityPreset);
  const [softwareId, setSoftwareId] = useState('software-adobe-premiere-pro');
  const buildComplete = hasCompleteBuild(build.selectedComponents);
  const buildPayload = buildToApiPayload(build.selectedComponents);
  const gameRequest = useSimulationRequest(JSON.stringify([buildPayload, mode, gameId, selectedGameIds, targetResolution, qualityPreset]));
  const softwareRequest = useSimulationRequest(JSON.stringify([buildPayload, softwareId]));
  const selectedSoftware = software.items.find(item => item.id === softwareId);

  useEffect(() => {
    if (!games.items.length) return;
    const available = new Set(games.items.map(game => game.id));
    setGameId(current => available.has(current) ? current : games.items[0].id);
    setSelectedGameIds(current => {
      const kept = current.filter(id => available.has(id));
      return kept.length ? kept : games.items.slice(0, 2).map(game => game.id);
    });
  }, [games.items]);

  useEffect(() => {
    if (software.items.length) setSoftwareId(current => software.items.some(item => item.id === current) ? current : software.items[0].id);
  }, [software.items]);

  const selectionValid = mode === 'single'
    ? games.items.some(game => game.id === gameId)
    : selectedGameIds.length >= 2 && selectedGameIds.length <= 10;
  const gameBlockReason = !buildComplete ? 'Complete a montagem para simular. As peças que faltam estão indicadas acima.'
    : games.loading ? 'Aguarde o carregamento dos jogos.'
      : games.error ? 'Não foi possível carregar os jogos. Use Tentar novamente.'
        : !games.items.length ? 'Não há jogos disponíveis para simular.'
          : mode === 'single' && !selectionValid ? 'Selecione um jogo para simular.'
            : mode === 'compare' && !selectionValid ? 'Selecione de 2 a 10 jogos para comparar.' : '';

  async function runGames() {
    if (gameBlockReason) return;
    const settings = { targetResolution, qualityPreset, build: buildPayload };
    await gameRequest.run(() => mode === 'single'
      ? performanceService.simulateGame({ ...settings, gameId })
      : gameComparisonService.compare({ ...settings, gameIds: selectedGameIds }));
  }

  async function runSoftware() {
    if (!buildComplete || !selectedSoftware) return;
    await softwareRequest.run(() => professionalSoftwareService.simulate({ softwareId, build: buildPayload }));
  }

  function toggleGame(id) {
    setSelectedGameIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  }

  return (
    <div className="page-stack">
      <section className="page-hero compact-hero">
        <span className="eyebrow">Performance Lab</span>
        <h1>Simule o desempenho do seu PC</h1>
        <p>Estime o desempenho em um jogo, compare vários jogos ou confira os requisitos dos seus programas.</p>
      </section>
      {!buildComplete && <Alert type="warning" title="Build incompleta">
        <p>Faltam peças: {getMissingBuildSlots(build.selectedComponents).map(type => componentLabels[type]).join(', ')}. Complete a montagem antes de simular.</p>
        <Link className="btn btn-secondary btn-md" to="/build">Ir para Montar PC</Link>
      </Alert>}
      <div className="performance-lab-grid">
        <Card className="performance-lab-card">
          <div className="section-heading compact"><div><span className="eyebrow">Jogos</span><h2><Gamepad2 size={22} aria-hidden="true" /> Desempenho em jogos</h2></div><Badge tone="cyan">Estimativas</Badge></div>
          <fieldset className="simulation-modes">
            <legend>O que você quer fazer?</legend>
            <label><input type="radio" name="game-mode" value="single" checked={mode === 'single'} onChange={() => setMode('single')} /><span><strong>Simular um jogo</strong><small>Veja FPS e requisitos de um título.</small></span></label>
            <label><input type="radio" name="game-mode" value="compare" checked={mode === 'compare'} onChange={() => setMode('compare')} /><span><strong>Comparar jogos</strong><small>Compare de 2 a 10 títulos na mesma build.</small></span></label>
          </fieldset>
          <p className="hint-text">Escolha a resolução do monitor e a qualidade gráfica. Configurações mais exigentes podem reduzir o FPS estimado.</p>
          {games.loading ? <LoadingSpinner label="Carregando jogos..." /> : games.error ? <ErrorState message={getPerformanceErrorMessage(games.error)} onRetry={games.reload} />
            : games.items.length === 0 ? <EmptyState title="Nenhum jogo encontrado" message="O catálogo ainda não tem jogos disponíveis para simulação."><Button variant="secondary" onClick={games.reload}>Atualizar jogos</Button></EmptyState> : <>
              <div className="form-grid compact-form-grid">
                {mode === 'single' && <Select label="Jogo" value={gameId} onChange={event => setGameId(event.target.value)} options={games.items.map(game => ({ value: game.id, label: game.name }))} />}
                <Select label="Resolução" value={targetResolution} onChange={event => setTargetResolution(event.target.value)} options={['1080p', '1440p', '4k'].map(value => ({ value, label: value === '4k' ? '4K' : value }))} />
                <Select label="Qualidade gráfica" value={qualityPreset} onChange={event => setQualityPreset(event.target.value)} options={['low', 'medium', 'high', 'ultra'].map(value => ({ value, label: translateValue(value) }))} />
              </div>
              {mode === 'compare' && <>
                <div className="game-checkbox-grid" role="group" aria-label="Jogos para comparação">
                  {games.items.map(game => <label key={game.id} className="game-checkbox-card">
                    <input type="checkbox" checked={selectedGameIds.includes(game.id)} onChange={() => toggleGame(game.id)} />
                    <span><strong>{game.name}</strong><small>{game.category} · Referência do cadastro: {game.targetResolution}</small></span>
                  </label>)}
                </div>
                <p className="hint-text">{selectedGameIds.length} jogo(s) selecionado(s). A resolução escolhida acima será usada para todos.</p>
              </>}
            </>}
          <p id="game-action-hint" className="hint-text" role="status">{gameRequest.status === 'loading' ? 'Calculando estimativas para a sua configuração...'
            : gameBlockReason || (gameRequest.status === 'success' ? 'Simulação concluída. Confira os resultados abaixo.'
              : gameRequest.status === 'error' ? 'A simulação não foi concluída. Confira o erro abaixo e tente novamente.'
                : 'Tudo pronto. Execute a simulação para ver os resultados destas escolhas.')}</p>
          <div className="button-row"><Button disabled={Boolean(gameBlockReason)} loading={gameRequest.status === 'loading'} aria-describedby="game-action-hint" onClick={runGames}>
            {mode === 'single' ? <Gamepad2 size={18} aria-hidden="true" /> : <BarChart3 size={18} aria-hidden="true" />}{mode === 'single' ? 'Simular jogo' : 'Comparar jogos'}
          </Button></div>
          <RequestError error={gameRequest.error} onRetry={runGames} />
          <div aria-busy={gameRequest.status === 'loading'}>
            {gameRequest.status === 'success' && (mode === 'single' ? <GameSimulationResult result={gameRequest.result} /> : <GameComparisonResult result={gameRequest.result} />)}
          </div>
        </Card>

        <Card className="performance-lab-card">
          <div className="section-heading compact"><div><span className="eyebrow">Softwares profissionais</span><h2><BriefcaseBusiness size={22} aria-hidden="true" /> Simulação profissional</h2><p>Confira se a configuração atende o perfil de trabalho escolhido.</p></div><Badge tone="cyan">Produtividade</Badge></div>
          {software.loading ? <LoadingSpinner label="Carregando softwares..." /> : software.error ? <ErrorState message={getPerformanceErrorMessage(software.error)} onRetry={software.reload} />
            : !software.items.length ? <EmptyState title="Nenhum software encontrado" message="O catálogo ainda não tem softwares disponíveis." /> : <>
              <Select label="Software" value={softwareId} onChange={event => setSoftwareId(event.target.value)} options={software.items.map(item => ({ value: item.id, label: item.name }))} />
              {selectedSoftware && <div className="info-block"><Badge tone="purple">{selectedSoftware.category}</Badge><p>{selectedSoftware.description}</p></div>}
              {!buildComplete && <p className="hint-text">Complete a montagem para liberar a simulação profissional.</p>}
              <div className="button-row"><Button disabled={!buildComplete || !selectedSoftware} loading={softwareRequest.status === 'loading'} onClick={runSoftware}>Simular software</Button></div>
            </>}
          {softwareRequest.status === 'loading' && <LoadingSpinner label="Analisando requisitos do software..." />}
          <RequestError error={softwareRequest.error} onRetry={runSoftware} />
          <SoftwareResult result={softwareRequest.result} />
        </Card>
      </div>
    </div>
  );
}

function RequestError({ error, onRetry }) {
  if (!error) return null;
  return <div className="page-stack"><ErrorState message={getPerformanceErrorMessage(error)} onRetry={onRetry} />
    {Array.isArray(error.errors) && error.errors.length > 0 && <details className="analysis-help"><summary>Ver detalhes do erro</summary><ul>{error.errors.map((message, index) => <li key={index}>{message}</li>)}</ul></details>}
  </div>;
}

function SoftwareResult({ result }) {
  if (!result) return null;
  return <section className="performance-result-panel" aria-label="Resultado da simulação profissional">
    <div className="section-heading compact"><div><h3>{result.software}</h3><p>{result.category}</p></div><Badge tone={result.meetsMinimumRequirements === false ? 'red' : 'cyan'}>{translateValue(result.performanceLevel)}</Badge></div>
    <p className="analysis-note">Avaliação estimada a partir dos requisitos cadastrados. Nenhum teste foi executado no seu computador.</p>
    <div className="metric-grid">
      <div><span>Pontuação de desempenho</span><strong>{formatPerformanceNumber(result.performanceScore)}</strong></div>
      <div><span>Atende requisitos mínimos</span><strong>{formatRequirement(result.meetsMinimumRequirements)}</strong></div>
      <div><span>Atende requisitos recomendados</span><strong>{formatRequirement(result.meetsRecommendedRequirements)}</strong></div>
    </div>
    <p>{result.summary}</p>
    <AnalysisHelp topics={['score']} />
    <details className="analysis-help"><summary>Ver requisitos por componente</summary><dl className="technical-details">
      {Object.entries(result.details || {}).map(([key, value]) => <div key={key}><dt>{({ cpuStatus: 'Processador', gpuStatus: 'Placa de vídeo', ramStatus: 'Memória RAM', storageStatus: 'Armazenamento' })[key] || key}</dt><dd>{translateValue(value)}</dd></div>)}
    </dl></details>
  </section>;
}

function useOptions(fetchOptions) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchOptions().then(data => { if (active) setItems(Array.isArray(data) ? data : []); })
      .catch(error => { if (active) { setError(error); setItems([]); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [fetchOptions, reloadKey]);
  return { items, loading, error, reload: () => setReloadKey(key => key + 1) };
}
