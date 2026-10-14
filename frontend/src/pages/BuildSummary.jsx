import CoolingSimulationPanel from '../components/build/CoolingSimulationPanel.jsx';
import CoolingAssessmentNotice from '../components/compatibility/CoolingAssessmentNotice.jsx';
import { hasUnverifiedCooling } from '../utils/coolingAssessment.js';
import { hasSimulatedPerformance } from '../utils/performanceMethodology.js';
import { summarySimulationHint } from '../utils/summarySimulationHint.js';
import ComponentIdentity from '../components/componentsCatalog/ComponentIdentity.jsx';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Copy, FileJson, FileText, Save, Share2, Sparkles, Wrench } from 'lucide-react';
import BottleneckPanel from '../components/build/BottleneckPanel.jsx';
import BudgetPanel from '../components/build/BudgetPanel.jsx';
import BuildSummaryCard from '../components/build/BuildSummaryCard.jsx';
import CoolingPanel from '../components/build/CoolingPanel.jsx';
import { useComponents } from '../hooks/useComponents.js';
import ComponentReplacement from '../components/build/ComponentReplacement.jsx';
import AnalysisHelp from '../components/build/AnalysisHelp.jsx';
import GameSimulationResult from '../components/build/GameSimulationResult.jsx';
import CompatibilityStatus from '../components/compatibility/CompatibilityStatus.jsx';
import PurchaseLinksList from '../components/build/PurchaseLinksList.jsx';
import Alert from '../components/ui/Alert.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import Modal from '../components/ui/Modal.jsx';
import Select from '../components/ui/Select.jsx';
import { useApiRequest } from '../hooks/useApiRequest.js';
import { useBuildState } from '../hooks/useBuildState.jsx';
import { buildExportService } from '../services/buildExportService.js';
import { buildReportService } from '../services/buildReportService.js';
import { buildScoreService } from '../services/buildScoreService.js';
import { compatibilityFixService } from '../services/compatibilityFixService.js';
import { performanceService } from '../services/performanceService.js';
import { purchaseLinksService } from '../services/purchaseLinksService.js';
import { recommendationService } from '../services/recommendationService.js';
import { savedBuildsService } from '../services/savedBuildsService.js';
import { sharingService } from '../services/sharingService.js';
import { buildToApiPayload, buildToPurchaseLinksPayload, hasCompleteBuild, normalizeBudgetPayload, normalizeSavedBuildPayload } from '../utils/buildHelpers.js';
import { componentLabels, componentTypes } from '../utils/componentLabels.js';
import { formatCurrency } from '../utils/formatCurrency.js';
import { numericValue } from '../utils/performancePresentation.js';
import { translateValue } from '../utils/translations.js';

export default function BuildSummary() {
  const navigate = useNavigate();
  const location = useLocation();
  const coolingSectionRef = useRef(null);
  useEffect(() => {
    if (location.hash !== '#cooling-simulation') return;
    const frame = requestAnimationFrame(() => {
      const section = coolingSectionRef.current;
      if (!section) return;
      const headerHeight = document.querySelector('.topbar')?.getBoundingClientRect().height || 0;
      section.style.scrollMarginTop = `${headerHeight + 16}px`;
      section.focus({ preventScroll: true });
      section.scrollIntoView({ block: 'start', behavior: 'auto' });
    });
    return () => cancelAnimationFrame(frame);
  }, [location.hash, location.key]);
  const build = useBuildState();
  const catalog = useComponents();
  const request = useApiRequest();
  const [games, setGames] = useState([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [gamesError, setGamesError] = useState('');
  const [gamesReload, setGamesReload] = useState(0);
  const [linksByBuild, setLinksByBuild] = useState(null);
  const [share, setShare] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [analyticsError, setAnalyticsError] = useState('');
  const [loadingAction, setLoadingAction] = useState('');
  const [buildScore, setBuildScore] = useState(null);
  const [fixSuggestions, setFixSuggestions] = useState(null);
  const [technicalReport, setTechnicalReport] = useState(null);
  const [exportedJson, setExportedJson] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [replacement, setReplacement] = useState(null);
  const configurationKey = JSON.stringify([build.revision, build.buildPayload, normalizeBudgetPayload(build.budget), build.usageType, build.game]);
  const latestConfiguration = useRef(configurationKey);
  const mounted = useRef(true);
  latestConfiguration.current = configurationKey;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // Results can only describe the submitted configuration, including game settings.
  const isCurrent = () => mounted.current && latestConfiguration.current === configurationKey;

  useEffect(() => {
    let active = true;
    setGamesLoading(true);
    setGamesError('');
    performanceService.listGames()
      .then((data) => { if (active) setGames(Array.isArray(data) ? data : []); })
      .catch((error) => { if (active) { setGames([]); setGamesError(error.message || 'Não foi possível carregar os jogos.'); } })
      .finally(() => { if (active) setGamesLoading(false); });
    return () => { active = false; };
  }, [gamesReload]);

  useEffect(() => {
    setLoadingAction('');
    setAnalyticsError('');
    setBuildScore(null);
    setFixSuggestions(null);
    setShare(null);
    setTechnicalReport(null);
    setExportedJson(null);
    setLinksByBuild(null);
    setFeedback('');
  }, [configurationKey]);

  async function generateSummary() {
    if (!hasCompleteBuild(build.selectedComponents)) {
      setFeedback('Complete a build antes de gerar o resumo.');
      return;
    }

    await request.run(async () => {
      const [summary, links] = await Promise.all([
        recommendationService.summary({
          build: build.buildPayload,
          budget: build.budget.amount ? normalizeBudgetPayload(build.budget) : undefined,
          usageType: build.usageType,
          ...build.game
        }),
        purchaseLinksService.byBuild(buildToPurchaseLinksPayload(build.selectedComponents)).catch(() => null)
      ]);

      if (!isCurrent()) return;
      storeAnalyzedSummary(summary);
      setLinksByBuild(links);
      setFeedback('Resumo final atualizado.');
    });
  }

  async function saveBuild() {
    if (!hasCompleteBuild(build.selectedComponents)) {
      setFeedback('Complete a build antes de salvar.');
      return;
    }

    await request.run(async () => {
      await savedBuildsService.create(normalizeSavedBuildPayload({
        name: 'Build final PCPowerLab',
        selectedComponents: build.selectedComponents,
        budget: build.budget,
        usageType: build.usageType
      }));
      if (isCurrent()) setFeedback('Build salva como nova configuração. A versão salva anteriormente foi mantida.');
    });
  }

  async function shareBuild() {
    if (!hasCompleteBuild(build.selectedComponents)) {
      setFeedback('Complete a build antes de compartilhar.');
      return;
    }

    await request.run(async () => {
      const result = await sharingService.create({
        name: 'Build compartilhada',
        build: buildToApiPayload(build.selectedComponents),
        budget: build.budget.amount ? normalizeBudgetPayload(build.budget) : undefined,
        usageType: build.usageType
      });
      if (!isCurrent()) return;
      setShare(result);
      setFeedback('Link de compartilhamento gerado.');
    });
  }

  async function copyShareLink() {
    const path = share?.shareUrl?.replace('/shared-builds/', '/shared/') || `/shared/${share?.shareId}`;
    const url = `${window.location.origin}${path}`;
    await navigator.clipboard.writeText(url);
    setFeedback('Link copiado.');
  }

  function buildAnalyticsPayload() {
    return {
      build: buildToApiPayload(build.selectedComponents),
      budget: build.budget.amount ? normalizeBudgetPayload(build.budget) : undefined,
      usageType: build.usageType
    };
  }

  async function runAnalyticsAction(actionName, action) {
    if (!hasCompleteBuild(build.selectedComponents)) {
      setFeedback('Complete a build antes de executar esta análise.');
      return;
    }

    setAnalyticsError('');
    setFeedback('');
    setLoadingAction(actionName);

    try {
      await action();
    } catch (error) {
      if (isCurrent()) setAnalyticsError(error.message || 'Não foi possível concluir a análise solicitada.');
    } finally {
      if (isCurrent()) setLoadingAction('');
    }
  }

  async function calculateBuildScore() {
    await runAnalyticsAction('score', async () => {
      const result = await buildScoreService.calculate(buildAnalyticsPayload());
      if (!isCurrent()) return;
      setBuildScore(result);
      setFeedback('Nota geral da build calculada.');
    });
  }

  async function loadFixSuggestions() {
    await runAnalyticsAction('fixes', async () => {
      const result = await compatibilityFixService.suggest(build.selectedComponents);
      if (!isCurrent()) return;
      setFixSuggestions(result);
      setFeedback('Sugestões de correção carregadas.');
    });
  }

  async function generateTechnicalReport() {
    await runAnalyticsAction('report', async () => {
      const result = await buildReportService.generate({
        ...buildAnalyticsPayload(),
        gameIds: build.game.gameId ? [build.game.gameId] : [],
        includePurchaseLinks: true
      });
      if (!isCurrent()) return;
      setTechnicalReport(result);
      setReportOpen(true);
      setFeedback('Relatório técnico gerado.');
    });
  }

  async function exportBuildJson() {
    await runAnalyticsAction('export', async () => {
      const result = await buildExportService.exportJson({
        ...buildAnalyticsPayload(),
        includeSummary: true,
        includePurchaseLinks: true
      });
      if (!isCurrent()) return;
      setExportedJson(result);
      setExportOpen(true);
      setFeedback('JSON da build exportado.');
    });
  }

  async function copyExportedJson() {
    await navigator.clipboard.writeText(JSON.stringify(exportedJson, null, 2));
    setFeedback('JSON copiado.');
  }

  function previewFixSuggestion(suggestion) {
    const componentType = suggestion.componentType
      || suggestion.category
      || suggestion.component
      || suggestion.targetComponent
      || suggestion.suggestedComponent?.category;
    const suggestedComponent = suggestion.suggestedComponent
      || suggestion.recommendedComponent
      || suggestion.replacementComponent
      || suggestion.componentSuggestion;

    if (!componentType || !suggestedComponent?.id) {
      setFeedback('Esta sugestão não possui dados suficientes para aplicação automática.');
      return;
    }

    if (request.loading || loadingAction) return;
    setReplacement({ type: componentType, component: suggestedComponent });
  }

  function applyReplacement(type, component, summary) {
    build.actions.replaceComponent(type, component, summary, build.revision);
    setLinksByBuild(null);
    setBuildScore(null);
    setFixSuggestions(null);
    setShare(null);
    setTechnicalReport(null);
    setExportedJson(null);
    setAnalyticsError('');
    request.setError('');
    setReplacement(null);
    setFeedback(`${componentLabels[type]} substituído. Compatibilidade e resumo verificados novamente; as demais escolhas foram mantidas. Recalcule a nota ou gere novos relatórios quando precisar.`);
  }

  async function undoReplacement() {
    const previous = build.replacementHistory?.at(-1);
    if (!previous) return;
    const revision = build.revision + 1;
    build.actions.undoReplacement();
    setReplacement(null);
    if (!hasCompleteBuild(previous)) return;
    try {
      const summary = await recommendationService.summary({
        build: buildToApiPayload(previous),
        budget: build.budget.amount ? normalizeBudgetPayload(build.budget) : undefined,
        usageType: build.usageType,
        ...build.game
      });
      // The provider checks the revision even if another edit or undo happened.
      build.actions.setAnalyzedSummary(summary, revision);
    } catch (_error) {
      // Invalidated results stay pending. The existing summary action can retry.
    }
  }

  function storeAnalyzedSummary(summary) {
    build.actions.setAnalyzedSummary(summary, build.revision);
  }

  function changeGame(settings) {
    build.actions.setGame(settings);
    setTechnicalReport(null);
    setExportedJson(null);
    setFeedback('');
    setAnalyticsError('');
    request.setError('');
  }

  const compatibilityData = build.summary?.compatibility || build.compatibility || build.alerts;
  const isIncompatible = isCompatibilityIncompatible(compatibilityData);
  const gameAvailable = games.some(game => game.id === build.game.gameId);
  const simulationBlocked = gamesLoading || Boolean(gamesError) || !gameAvailable || !hasCompleteBuild(build.selectedComponents);

  return (
    <div className="page-stack">
      {build.catalogNotice && <Alert type="info">{build.catalogNotice}</Alert>}
      <section className="page-hero compact-hero">
        <span className="eyebrow">Painel final</span>
        <h1>Resumo da configuração</h1>
        <p>Revise as peças e a compatibilidade antes de salvar ou comprar.</p>
      </section>

      {build.canUndo && <Card>
        <p>Voltar à configuração anterior preserva o orçamento. A análise será recalculada; se falhar, use Simular desempenho para tentar novamente.</p>
        <Button variant="secondary" onClick={undoReplacement}>Desfazer última troca</Button>
      </Card>}
      {request.error && <ErrorState message={request.error} />}

      <SummarySection eyebrow="Painel da build" title="Visão geral">
        <div className="summary-overview">
          <div className="summary-overview-top">
            <div className="summary-overview-build">
              {!hasCompleteBuild(build.selectedComponents) && <Alert type="warning">Montagem incompleta. Escolha as peças que faltam antes de analisar.</Alert>}
              <details className="task-disclosure">
                <summary>Ver ou trocar peças</summary>
              <BuildSummaryCard selectedComponents={build.selectedComponents} totalPrice={build.totalPrice}
                onEdit={request.loading || loadingAction ? undefined : type => setReplacement({ type })} />
              </details>
            </div>
            <div className="summary-overview-side">
              <BudgetPanel selectedComponents={build.selectedComponents} budget={build.budget} totalPrice={build.totalPrice} pricing={build.summary?.pricing} />
              <BuildStatusCard
                compatibility={compatibilityData}
                verified={typeof compatibilityData?.compatible === 'boolean' && compatibilityData?.status !== 'unverified'}
                incompatible={isIncompatible}
                loading={loadingAction === 'fixes'}
                disabled={Boolean(loadingAction)}
                onFixes={loadFixSuggestions}
              />
            </div>
          </div>
          <details className="task-disclosure summary-score-full">
            <summary>Pontuação da configuração</summary>
            <BuildScorePanel
              score={buildScore}
              onCalculate={calculateBuildScore}
              loading={loadingAction === 'score'}
              disabled={Boolean(loadingAction)}
            />
          </details>
        </div>
      </SummarySection>

      <SummarySection eyebrow="Próximos passos" title="Ações">
        <Card className="summary-actions-card">
          <div className="button-row summary-action-row">
            <Button disabled={request.loading} loading={request.loading} onClick={generateSummary}>Gerar resumo final</Button>
            <Button variant="secondary" disabled={request.loading} onClick={saveBuild}><Save size={18} /> Salvar como nova configuração</Button>
            <Button variant="secondary" disabled={request.loading} onClick={shareBuild}><Share2 size={18} /> Compartilhar</Button>
            <Link className="btn btn-ghost btn-md" to="/build">Voltar e editar</Link>
            <Link className="btn btn-secondary btn-md" to="/compare">Comparar build</Link>
            <Link className="btn btn-ghost btn-md" to="/upgrades">Sugerir upgrade</Link>
          </div>
          <details className="task-disclosure">
            <summary>Relatório e exportação</summary>
            <div className="button-row">
              <Button variant="ghost" disabled={Boolean(loadingAction)} loading={loadingAction === 'report'} onClick={generateTechnicalReport}><FileText size={18} /> Gerar relatório técnico</Button>
              <Button variant="ghost" disabled={Boolean(loadingAction)} loading={loadingAction === 'export'} onClick={exportBuildJson}><FileJson size={18} /> Exportar JSON</Button>
            </div>
          </details>
          {share ? (
            <Alert type="info" title="Link de compartilhamento">
              <p>ID: {share.shareId} • URL: {share.shareUrl}</p>
              <Button variant="ghost" onClick={copyShareLink}><Copy size={18} /> Copiar link</Button>
            </Alert>
          ) : null}
          {analyticsError && <Alert type="error">{analyticsError}</Alert>}
          {feedback && <Alert type="success">{feedback}</Alert>}
          {request.loading && <LoadingSpinner />}
        </Card>
      </SummarySection>

      <SummarySection eyebrow="Compatibilidade e desempenho" title="Análises da configuração">
        <div className="summary-analysis-stack">
          <CompatibilityStatus result={compatibilityData} />
          {fixSuggestions && (
            <FixSuggestionsPanel
              suggestions={fixSuggestions}
              onApply={previewFixSuggestion}
              onFeedback={(suggestion, index) => {
                const suggestedComponent = suggestion.suggestedComponent
                  || suggestion.recommendedComponent
                  || suggestion.replacementComponent
                  || suggestion.componentSuggestion;
                navigate('/feedback/new', {
                  state: {
                    mode: 'contextual',
                    recommendationType: 'compatibility-fix',
                    recommendationId: suggestedComponent?.id || suggestion.type || `compatibility-fix-${index + 1}`,
                    recommendationTitle: suggestedComponent?.name || 'Correção de compatibilidade',
                    summary: suggestion.reason || suggestion.message || suggestion.summary,
                    coolingAssessment: suggestion.coolingAssessment || fixSuggestions?.coolingAssessment,
                    problem: suggestion.problem || suggestion.issue || suggestion.type,
                    currentComponent: suggestion.currentComponent || suggestion.current || suggestion.componentCurrent,
                    suggestedComponent,
                    ...(hasCompleteBuild(build.selectedComponents) && {
                      buildSnapshot: buildToApiPayload(build.selectedComponents),
                      buildDetails: buildDetailsFromSelectedComponents(build.selectedComponents)
                    }),
                    source: 'compatibility-fix'
                  }
                });
              }}
            />
          )}
          <BottleneckPanel result={build.summary?.bottlenecks || build.bottlenecks} />
        </div>
      </SummarySection>

      <SummarySection eyebrow="Jogos" title="Simulação em jogos">
        <Card className="summary-actions-card">
          <div className="section-heading compact">
            <div>
              <h3>Desempenho estimado</h3>
              <p>Escolha o jogo, resolução e qualidade para atualizar a estimativa de FPS.</p>
            </div>
          </div>
          {gamesLoading && <LoadingSpinner label="Carregando jogos..." />}
          {gamesError && <ErrorState message={gamesError} onRetry={() => setGamesReload(key => key + 1)} />}
          {!gamesLoading && !gamesError && !games.length && <div><p className="hint-text">Nenhum jogo disponível no catálogo. Gere o resumo para consultar as outras análises.</p><Button variant="secondary" onClick={() => setGamesReload(key => key + 1)}>Atualizar jogos</Button></div>}
          <div className="form-grid field-row-grid summary-game-controls">
            <Select
              revealSelectedValue
              label="Jogo"
              value={gameAvailable ? build.game.gameId : ''}
              onChange={(event) => changeGame({ gameId: event.target.value })}
              disabled={gamesLoading || Boolean(gamesError) || !games.length}
              options={[...(!gameAvailable ? [{ value: '', label: 'Selecione um jogo disponível' }] : []), ...games.map((game) => ({ value: game.id, label: game.name }))]}
            />
            <Select
              label="Resolução"
              value={build.game.targetResolution}
              onChange={(event) => changeGame({ targetResolution: event.target.value })}
              options={['1080p', '1440p', '4k'].map((value) => ({ value, label: value }))}
            />
            <Select
              label="Qualidade"
              value={build.game.qualityPreset}
              onChange={(event) => changeGame({ qualityPreset: event.target.value })}
              options={['low', 'medium', 'high', 'ultra'].map((value) => ({ value, label: translateValue(value) }))}
            />
          </div>
          <p id="summary-simulation-hint" className="hint-text" role="status">{summarySimulationHint({ complete: hasCompleteBuild(build.selectedComponents), gamesLoading, gamesError, gameAvailable, loading: request.loading, error: request.error, result: build.gamePerformance })}</p>
          <div className="button-row">
            <Button disabled={request.loading || simulationBlocked} loading={request.loading} aria-describedby="summary-simulation-hint" onClick={generateSummary}>
              Simular desempenho
            </Button>
          </div>
        </Card>

        {build.gamePerformance?.status === 'unavailable' && (
          <Card>
            <h3>Simulação indisponível</h3>
            <p>{build.gamePerformance.message}</p>
          </Card>
        )}

        {build.gamePerformance && build.gamePerformance.status !== 'unavailable' && (
          <GameSimulationResult result={build.gamePerformance} />
        )}

        {build.summary && (
          <Card>
            <h3>Recomendação final</h3>
            <p>{build.summary.summary}</p>
            <strong>{build.summary.finalRecommendation}</strong>
          </Card>
        )}
      </SummarySection>

      <section id="cooling-simulation" ref={coolingSectionRef} tabIndex={-1} aria-label="Temperatura e ruído" className="summary-section">
        <CoolingSimulationPanel cpu={build.selectedComponents.cpu} cooler={build.selectedComponents.cooler}
          fans={build.selectedComponents.fans || []} caseComponent={build.selectedComponents.case}
          conditions={build.coolingConditions} onConditionsChange={build.actions.setCoolingConditions} />
      </section>

      <SummarySection eyebrow="Compra" title="Links de compra">
        <PurchaseLinksList linksBySlot={linksByBuild} selectedComponents={build.selectedComponents} />
      </SummarySection>

      <Modal open={reportOpen} title="Relatório técnico da configuração" onClose={() => setReportOpen(false)}>
        <TechnicalReportView report={technicalReport} />
      </Modal>

      {replacement && ['cooler', 'fans'].includes(replacement.type) && <Modal open title="Alterar refrigeração" onClose={() => setReplacement(null)}><CoolingPanel initialSection={replacement.type === 'fans' ? 'fans' : 'cooler'} build={build} byType={catalog.byType} loading={catalog.loading} error={catalog.error} onRetry={catalog.reload} /></Modal>}
      {replacement && !['cooler', 'fans'].includes(replacement.type) && <ComponentReplacement type={replacement.type} initialComponent={replacement.component}
        build={build} onApply={applyReplacement} onClose={() => setReplacement(null)} />}

      <Modal open={exportOpen} title="Exportação JSON da build" onClose={() => setExportOpen(false)}>
        <div className="stack">
          <p className="hint-text">Use este JSON para compartilhar a configuração em integrações externas ou salvar uma cópia estruturada.</p>
          <CoolingAssessmentNotice result={exportedJson} />
          <pre className="json-preview">{JSON.stringify(exportedJson || {}, null, 2)}</pre>
          <div className="button-row">
            <Button variant="secondary" onClick={copyExportedJson}><Copy size={18} /> Copiar JSON</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function SummarySection({ eyebrow, title, children }) {
  return (
    <section className="summary-section">
      <div className="summary-section-heading">
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function BuildStatusCard({ compatibility, incompatible, verified, loading = false, disabled = false, onFixes }) {
  const coolingPending = hasUnverifiedCooling(compatibility);
  return (
    <Card className="build-status-card">
      <div className="section-heading compact">
        <div>
          <h3>Status da build</h3>
          <p>{!verified ? 'Gere o resumo ou analise a montagem para verificar as peças.' : incompatible ? 'Há incompatibilidades técnicas que precisam de atenção.' : 'Nenhuma incompatibilidade crítica identificada nos dados analisados.'}</p>
        </div>
        <Badge tone={!verified ? 'cyan' : incompatible || coolingPending ? 'yellow' : 'green'}>
          {!verified ? 'Pendente' : incompatible ? 'Atenção' : coolingPending ? 'Parcial' : 'Verificado'}
        </Badge>
      </div>
      <strong className={!verified ? 'status-text' : incompatible || coolingPending ? 'status-text warning' : 'status-text success'}>
        {!verified ? 'Compatibilidade não verificada' : incompatible ? 'Incompatível' : coolingPending ? 'Peças principais compatíveis' : 'Compatível'}
      </strong>
      <CoolingAssessmentNotice result={compatibility} />
      {incompatible && (
        <div className="button-row">
          <Button variant="secondary" disabled={disabled} loading={loading} onClick={onFixes}>
            <Wrench size={18} /> Ver correções
          </Button>
        </div>
      )}
    </Card>
  );
}

function BuildScorePanel({ score, onCalculate, loading = false, disabled = false }) {
  if (!score) {
    return (
      <Card className="build-score-card build-score-card--empty">
        <div className="section-heading compact">
          <div>
            <h3>Nota geral</h3>
            <p>Calcule uma nota consolidada para compatibilidade, desempenho, orçamento e custo-benefício.</p>
          </div>
          <Badge tone="cyan">0-100</Badge>
        </div>
        <AnalysisHelp topics={['buildScore', 'score']} title="O que significa a nota geral?" />
        <Button variant="secondary" disabled={disabled} loading={loading} onClick={onCalculate}>
          <Sparkles size={18} /> Calcular nota da build
        </Button>
      </Card>
    );
  }

  const criteria = score.criteria || {};
  const overallScore = numericValue(score.overallScore);
  const criteriaItems = [
    ['compatibilityScore', 'Compatibilidade'],
    ['performanceScore', 'Desempenho'],
    ['balanceScore', 'Equilíbrio'],
    ['budgetScore', 'Orçamento'],
    ['costBenefitScore', 'Custo-benefício']
  ];

  return (
    <Card className="build-score-card">
      <div className="section-heading compact">
        <div>
          <h3>Nota geral</h3>
          <p>{score.summary || 'Nota consolidada da configuração atual.'}</p>
        </div>
        <Badge tone={getScoreTone(overallScore)}>{overallScore === null ? 'Não disponível' : score.classification ? translateValue(score.classification) : classifyScore(overallScore)}</Badge>
      </div>
      <p className="chart-caption">{hasSimulatedPerformance(score) && numericValue(criteria.performanceScore) !== null && 'Desempenho com pontuação simulada. '}Nota calculada de 0 a 100. As barras detalham os critérios usados; não representam FPS nem resultados de um teste real.</p>
      {Array.isArray(score.warnings) && score.warnings.length > 0 && <Alert type="warning" title="Limitações desta nota"><ul>{score.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></Alert>}
      <CoolingAssessmentNotice result={score} />
      <AnalysisHelp topics={['buildScore', 'score', 'compatibility']} title="Como interpretar a nota e seus critérios" />
      <div className="score-overview">
        <div className="score-circle" role="img" aria-label={overallScore === null ? 'Nota geral não disponível' : `Nota ${formatScore(overallScore)} de 100`}>
          <strong>{overallScore === null ? '—' : formatScore(overallScore)}</strong>
          <span>{overallScore === null ? 'Não disponível' : 'de 100'}</span>
        </div>
        <div className="criteria-grid">
          {criteriaItems.map(([key, label]) => (
            <article key={key} className="criterion-card">
              <div>
                <span>{label}</span>
                <strong>{formatScore(criteria[key])}</strong>
              </div>
              <div className="score-bar" aria-hidden="true">
                {numericValue(criteria[key]) !== null && <i style={{ width: `${clampScore(criteria[key])}%` }} />}
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="button-row">
        <Button variant="ghost" disabled={disabled} loading={loading} onClick={onCalculate}>
          <Sparkles size={18} /> Recalcular nota
        </Button>
      </div>
    </Card>
  );
}

function FixSuggestionsPanel({ suggestions, onApply, onFeedback }) {
  const items = normalizeSuggestionItems(suggestions);

  return (
    <Card>
      <CoolingAssessmentNotice result={suggestions} />
      <div className="section-heading compact">
        <div>
          <h2>Sugestões para corrigir incompatibilidades</h2>
          <p>Confira alternativas técnicas antes de alterar sua build.</p>
        </div>
        <Badge tone={items.length ? 'yellow' : 'green'}>{items.length ? `${items.length} sugestão(ões)` : 'Sem sugestões'}</Badge>
      </div>
      {items.length === 0 ? (
        <p>Não há sugestões automáticas disponíveis para os problemas encontrados.</p>
      ) : (
        <div className="fix-suggestions-grid">
          {items.map((suggestion, index) => {
            const suggestedComponent = suggestion.suggestedComponent
              || suggestion.recommendedComponent
              || suggestion.replacementComponent
              || suggestion.componentSuggestion;
            const componentType = suggestion.componentType
              || suggestion.category
              || suggestion.component
              || suggestion.targetComponent
              || suggestedComponent?.category;
            const currentComponent = suggestion.currentComponent || suggestion.current || suggestion.componentCurrent;
            const issueLabel = suggestion.problem
              || suggestion.issue
              || translateShortValue(suggestion.type, 'Correção sugerida');

            return (
              <article key={`${componentType || 'fix'}-${suggestedComponent?.id || index}`} className="fix-suggestion-card">
                <div>
                  <span className="eyebrow">{componentLabels[componentType] || translateValue(componentType || 'compatibility')}</span>
                  <h3>{issueLabel}</h3>
                  <p>{suggestion.reason || suggestion.message || suggestion.summary || 'Sugestão gerada para reduzir incompatibilidades da configuração.'}</p>
                </div>
                <div className="fix-component-pair">
                  <div>
                    <span>Atual</span>
                    <ComponentIdentity component={currentComponent} category={componentType} fallback={suggestion.currentComponentName || 'Não informado'} />
                  </div>
                  <div>
                    <span>Sugerido</span>
                    <ComponentIdentity component={suggestedComponent} category={componentType} fallback={suggestion.suggestedComponentName || 'Alternativa sugerida'} />
                    {suggestedComponent?.price && <small>Preço estimado de referência: {formatCurrency(suggestedComponent.price)}</small>}
                  </div>
                </div>
                {suggestedComponent?.id && (
                  <div className="button-row">
                    <Button variant="secondary" onClick={() => onApply(suggestion)}>
                      Revisar substituição
                    </Button>
                    <Button variant="ghost" onClick={() => onFeedback(suggestion, index)}>
                      Avaliar recomendação
                    </Button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function TechnicalReportView({ report }) {
  if (!report) {
    return <p>Gere um relatório para visualizar as seções técnicas.</p>;
  }

  const reportData = report.report || report.data || report;
  const sections = Object.entries(reportData).filter(([, value]) => value !== undefined && value !== null);

  return (
    <div className="technical-report stack">
      <CoolingAssessmentNotice result={reportData} />
      {sections.map(([key, value]) => (
        <article key={key} className="report-section">
          <h3>{translateValue(key)}</h3>
          <ReportValue value={value} />
        </article>
      ))}
    </div>
  );
}

function ReportValue({ value }) {
  if (value === null || value === undefined) {
    return <span>Não disponível</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <p>Nenhum item registrado.</p>;
    }

    return (
      <div className="report-list">
        {value.map((item, index) => (
          <div key={index} className="report-list-item">
            <ReportValue value={item} />
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === 'object') {
    if (value.status === 'unavailable' || value.available === false) {
      return <Alert type="warning">{value.message || 'Esta seção está indisponível para os dados atuais.'}</Alert>;
    }

    return (
      <dl className="report-definition-list">
        {Object.entries(value).map(([key, nestedValue]) => (
          <div key={key}>
            <dt>{translateValue(key)}</dt>
            <dd>{((key === 'compatible' && nestedValue === true) || (key === 'status' && nestedValue === 'compatible')) && hasUnverifiedCooling(value) ? 'Peças principais compatíveis' : <ReportValue value={nestedValue} />}</dd>
          </div>
        ))}
      </dl>
    );
  }

  if (typeof value === 'boolean') {
    return <span>{value ? 'Sim' : 'Não'}</span>;
  }

  return <span>{translateShortValue(value, String(value))}</span>;
}

function normalizeSuggestionItems(result) {
  if (Array.isArray(result)) {
    return result;
  }

  if (Array.isArray(result?.suggestions)) {
    return result.suggestions;
  }

  if (Array.isArray(result?.fixSuggestions)) {
    return result.fixSuggestions;
  }

  if (Array.isArray(result?.data?.suggestions)) {
    return result.data.suggestions;
  }

  return [];
}

function isCompatibilityIncompatible(result) {
  const data = result?.data || result || {};
  const alerts = [
    ...(Array.isArray(data.alerts) ? data.alerts : []),
    ...(Array.isArray(data.issues) ? data.issues : []),
    ...(Array.isArray(data.problems) ? data.problems : [])
  ];

  if (data.status === 'unverified') return false;
  return data.compatible === false
    || data.isCompatible === false
    || data.status === 'incompatible'
    || alerts.some((alert) => ['high', 'critical'].includes(alert.severity));
}

function formatScore(value) {
  const score = numericValue(value);

  return score === null ? 'Não disponível' : Math.round(score);
}

function clampScore(value) {
  return Math.max(0, Math.min(100, formatScore(value)));
}

function buildDetailsFromSelectedComponents(selectedComponents = {}) {
  return [...componentTypes, 'cooler'].reduce((details, type) => {
    const component = selectedComponents[type];

    if (!component) {
      return details;
    }

    return {
      ...details,
      [type]: {
        id: component.id,
        ...(component.name && { name: component.name }),
        ...(component.category && { category: component.category }),
        ...(component.brand && { brand: component.brand }),
        ...(component.price != null && component.price !== '' && Number.isFinite(Number(component.price)) && { price: Number(component.price) })
      }
    };
  }, { fans: selectedComponents.fans || [] });
}

function getScoreTone(value) {
  const score = numericValue(value);

  if (score === null) return 'cyan';

  if (score >= 75) {
    return 'green';
  }

  if (score >= 60) {
    return 'cyan';
  }

  if (score >= 40) {
    return 'yellow';
  }

  return 'red';
}

function classifyScore(value) {
  const score = numericValue(value);

  if (score === null) return 'Não disponível';
  if (score >= 90) return 'Excelente';
  if (score >= 75) return 'Muito boa';
  if (score >= 60) return 'Boa';
  if (score >= 40) return 'Regular';
  return 'Não recomendada';
}

function translateShortValue(value, fallback = 'Não informado') {
  if (typeof value !== 'string') {
    return translateValue(value, fallback);
  }

  const looksLikeSentence = value.includes(' ') && value.length > 28;

  return looksLikeSentence ? value : translateValue(value, fallback);
}
