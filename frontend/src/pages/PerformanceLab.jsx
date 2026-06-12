import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, BriefcaseBusiness, Gamepad2 } from 'lucide-react';
import Alert from '../components/ui/Alert.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import Select from '../components/ui/Select.jsx';
import { useBuildState } from '../hooks/useBuildState.jsx';
import { gameComparisonService } from '../services/gameComparisonService.js';
import { performanceService } from '../services/performanceService.js';
import { professionalSoftwareService } from '../services/professionalSoftwareService.js';
import { buildToApiPayload, hasCompleteBuild } from '../utils/buildHelpers.js';
import { translateMetricLabel, translateValue } from '../utils/translations.js';

const defaultSoftwareId = 'software-adobe-premiere-pro';
const defaultGameIds = ['game-counter-strike-2', 'game-cyberpunk-2077'];

export default function PerformanceLab() {
  const build = useBuildState();
  const [softwareList, setSoftwareList] = useState([]);
  const [games, setGames] = useState([]);
  const [selectedSoftwareId, setSelectedSoftwareId] = useState(defaultSoftwareId);
  const [selectedGameIds, setSelectedGameIds] = useState(defaultGameIds);
  const [targetResolution, setTargetResolution] = useState('1080p');
  const [qualityPreset, setQualityPreset] = useState('high');
  const [softwareResult, setSoftwareResult] = useState(null);
  const [gameComparison, setGameComparison] = useState(null);
  const [loading, setLoading] = useState({ initial: true, software: false, games: false });
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  const buildComplete = hasCompleteBuild(build.selectedComponents);
  const selectedSoftware = useMemo(() => (
    softwareList.find((software) => software.id === selectedSoftwareId)
  ), [softwareList, selectedSoftwareId]);

  useEffect(() => {
    let active = true;

    async function loadOptions() {
      setLoading((current) => ({ ...current, initial: true }));
      setError('');

      try {
        const [softwareData, gameData] = await Promise.all([
          professionalSoftwareService.list(),
          performanceService.listGames()
        ]);

        if (!active) {
          return;
        }

        const normalizedSoftware = Array.isArray(softwareData) ? softwareData : [];
        const normalizedGames = Array.isArray(gameData) ? gameData : [];

        setSoftwareList(normalizedSoftware);
        setGames(normalizedGames);
        setSelectedSoftwareId((current) => (
          normalizedSoftware.some((software) => software.id === current)
            ? current
            : normalizedSoftware[0]?.id || defaultSoftwareId
        ));
        setSelectedGameIds((current) => {
          const availableIds = new Set(normalizedGames.map((game) => game.id));
          const stillAvailable = current.filter((gameId) => availableIds.has(gameId));

          if (stillAvailable.length >= 2) {
            return stillAvailable;
          }

          return normalizedGames.slice(0, 2).map((game) => game.id);
        });
      } catch (loadError) {
        if (active) {
          setError(loadError.message || 'Não foi possível carregar opções de desempenho.');
          setSoftwareList([]);
          setGames([]);
        }
      } finally {
        if (active) {
          setLoading((current) => ({ ...current, initial: false }));
        }
      }
    }

    loadOptions();

    return () => {
      active = false;
    };
  }, []);

  async function simulateSoftware() {
    if (!buildComplete) {
      setActionError('Monte uma configuração antes de simular desempenho.');
      return;
    }

    setActionError('');
    setSoftwareResult(null);
    setLoading((current) => ({ ...current, software: true }));

    try {
      const result = await professionalSoftwareService.simulate({
        softwareId: selectedSoftwareId,
        build: buildToApiPayload(build.selectedComponents)
      });
      setSoftwareResult(result);
    } catch (simulationError) {
      setActionError(getPerformanceErrorMessage(simulationError, 'Não foi possível simular o software com os dados atuais.'));
    } finally {
      setLoading((current) => ({ ...current, software: false }));
    }
  }

  async function compareGames() {
    if (!buildComplete) {
      setActionError('Monte uma configuração antes de simular desempenho.');
      return;
    }

    if (selectedGameIds.length < 2) {
      setActionError('Selecione pelo menos dois jogos para comparar.');
      return;
    }

    setActionError('');
    setGameComparison(null);
    setLoading((current) => ({ ...current, games: true }));

    try {
      const result = await gameComparisonService.compare({
        gameIds: selectedGameIds,
        targetResolution,
        qualityPreset,
        build: buildToApiPayload(build.selectedComponents)
      });
      setGameComparison(result);
    } catch (comparisonError) {
      setActionError(getPerformanceErrorMessage(comparisonError, 'Não foi possível comparar jogos com os dados atuais.'));
    } finally {
      setLoading((current) => ({ ...current, games: false }));
    }
  }

  function toggleGame(gameId) {
    setSelectedGameIds((current) => (
      current.includes(gameId)
        ? current.filter((selectedId) => selectedId !== gameId)
        : [...current, gameId]
    ));
  }

  return (
    <div className="page-stack">
      <section className="page-hero compact-hero">
        <span className="eyebrow">Performance Lab</span>
        <h1>Simulações avançadas de desempenho</h1>
        <p>Analise sua build em softwares profissionais e compare o desempenho esperado em vários jogos.</p>
      </section>

      {!buildComplete && (
        <Alert type="warning" title="Build incompleta">
          <p>Monte uma configuração antes de simular desempenho.</p>
          <Link className="btn btn-secondary btn-md" to="/build">Ir para Montar PC</Link>
        </Alert>
      )}

      {loading.initial && <LoadingSpinner />}
      {error && <ErrorState message={error} />}
      {actionError && <Alert type="error">{actionError}</Alert>}

      <div className="performance-lab-grid">
        <Card className="performance-lab-card">
          <div className="section-heading compact">
            <div>
              <span className="eyebrow">Softwares profissionais</span>
              <h2><BriefcaseBusiness size={22} aria-hidden="true" /> Simulação profissional</h2>
              <p>Confira se a configuração atende o perfil de trabalho escolhido.</p>
            </div>
            <Badge tone="cyan">Produtividade</Badge>
          </div>

          {softwareList.length === 0 && !loading.initial ? (
            <EmptyState
              title="Nenhum software encontrado"
              message="Não foi possível listar softwares profissionais no momento."
            />
          ) : (
            <>
              <Select
                label="Software"
                value={selectedSoftwareId}
                onChange={(event) => setSelectedSoftwareId(event.target.value)}
                options={softwareList.map((software) => ({
                  value: software.id,
                  label: software.name
                }))}
              />

              {selectedSoftware && (
                <div className="info-block">
                  <Badge tone="purple">{selectedSoftware.category}</Badge>
                  <p>{selectedSoftware.description}</p>
                </div>
              )}

              <div className="button-row">
                <Button
                  disabled={!buildComplete || loading.software}
                  loading={loading.software}
                  onClick={simulateSoftware}
                >
                  Simular software
                </Button>
              </div>

              <SoftwareResult result={softwareResult} />
            </>
          )}
        </Card>

        <Card className="performance-lab-card">
          <div className="section-heading compact">
            <div>
              <span className="eyebrow">Comparação entre jogos</span>
              <h2><Gamepad2 size={22} aria-hidden="true" /> Jogos selecionados</h2>
              <p>Compare FPS estimado e requisitos recomendados em múltiplos jogos.</p>
            </div>
            <Badge tone="green">Gaming</Badge>
          </div>

          {games.length === 0 && !loading.initial ? (
            <EmptyState
              title="Nenhum jogo encontrado"
              message="Não foi possível listar jogos para comparação no momento."
            />
          ) : (
            <>
              <div className="form-grid compact-form-grid">
                <Select
                  label="Resolução"
                  value={targetResolution}
                  onChange={(event) => setTargetResolution(event.target.value)}
                  options={['1080p', '1440p', '4k'].map((value) => ({ value, label: value }))}
                />
                <Select
                  label="Qualidade"
                  value={qualityPreset}
                  onChange={(event) => setQualityPreset(event.target.value)}
                  options={['low', 'medium', 'high', 'ultra'].map((value) => ({
                    value,
                    label: translateValue(value)
                  }))}
                />
              </div>

              <div className="game-checkbox-grid" aria-label="Jogos para comparação">
                {games.map((game) => (
                  <label key={game.id} className="game-checkbox-card">
                    <input
                      type="checkbox"
                      checked={selectedGameIds.includes(game.id)}
                      onChange={() => toggleGame(game.id)}
                    />
                    <span>
                      <strong>{game.name}</strong>
                      <small>{game.category} • {game.targetResolution}</small>
                    </span>
                  </label>
                ))}
              </div>

              <div className="button-row">
                <Button
                  disabled={!buildComplete || loading.games || selectedGameIds.length < 2}
                  loading={loading.games}
                  onClick={compareGames}
                >
                  <BarChart3 size={18} aria-hidden="true" /> Comparar jogos
                </Button>
              </div>

              <GameComparisonResult result={gameComparison} />
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function SoftwareResult({ result }) {
  if (!result) {
    return null;
  }

  const details = result.details || {};

  return (
    <div className="performance-result-panel">
      <div className="section-heading compact">
        <div>
          <h3>{result.software}</h3>
          <p>{result.category}</p>
        </div>
        <Badge tone={result.meetsMinimumRequirements ? 'green' : 'red'}>
          {result.performanceLevel || 'Não informado'}
        </Badge>
      </div>
      <div className="metric-grid">
        <div>
          <span>{translateMetricLabel('performanceScore')}</span>
          <strong>{formatNumber(result.performanceScore)}</strong>
        </div>
        <div>
          <span>Atende requisitos mínimos</span>
          <strong>{formatBoolean(result.meetsMinimumRequirements)}</strong>
        </div>
        <div>
          <span>Atende requisitos recomendados</span>
          <strong>{formatBoolean(result.meetsRecommendedRequirements)}</strong>
        </div>
      </div>
      <div className="requirement-grid">
        {[
          ['cpuStatus', 'CPU'],
          ['gpuStatus', 'GPU'],
          ['ramStatus', 'RAM'],
          ['storageStatus', 'Storage']
        ].map(([key, label]) => (
          <div key={key}>
            <span>{translateValue(label.toLowerCase(), label)}</span>
            <strong>{translateValue(details[key])}</strong>
          </div>
        ))}
      </div>
      <p>{result.summary}</p>
    </div>
  );
}

function GameComparisonResult({ result }) {
  if (!result) {
    return null;
  }

  const games = Array.isArray(result.results)
    ? result.results
    : Array.isArray(result.games)
      ? result.games
      : [];

  return (
    <div className="performance-result-panel">
      <div className="section-heading compact">
        <div>
          <h3>Resultado da comparação</h3>
          <p>{result.summary || 'Comparação concluída para os jogos selecionados.'}</p>
        </div>
        <Badge tone="cyan">{result.targetResolution} • {translateValue(result.qualityPreset)}</Badge>
      </div>
      {games.length === 0 ? (
        <p>Nenhum resultado retornado para os jogos selecionados.</p>
      ) : (
        <div className="game-result-grid">
          {games.map((game) => (
            <article key={game.gameId || game.id || game.gameName} className="game-result-card">
              <div>
                <strong>{game.gameName || game.name || game.game}</strong>
                <span>{translateValue(game.performanceLevel)}</span>
              </div>
              <div className="metric-grid compact-metric-grid">
                <div>
                  <span>FPS estimado</span>
                  <strong>{formatNumber(game.estimatedFps)}</strong>
                </div>
                <div>
                  <span>Recomendado</span>
                  <strong>{formatBoolean(game.meetsRecommendedRequirements)}</strong>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function getPerformanceErrorMessage(error, fallback) {
  if (error?.status === 400) {
    return error.message || 'Dados insuficientes para simular desempenho com a build atual.';
  }

  if (error?.status === 0) {
    return error.message || 'Não foi possível conectar ao backend do PCPowerLab.';
  }

  return error?.message || fallback;
}

function formatBoolean(value) {
  if (value === true) {
    return 'Sim';
  }

  if (value === false) {
    return 'Não';
  }

  return 'Não informado';
}

function formatNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? Math.round(number) : 'N/D';
}
