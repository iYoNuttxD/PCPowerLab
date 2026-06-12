import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, FileJson, FileText, Save, Share2, Sparkles, Wrench } from 'lucide-react';
import BottleneckPanel from '../components/build/BottleneckPanel.jsx';
import BudgetPanel from '../components/build/BudgetPanel.jsx';
import BuildSummaryCard from '../components/build/BuildSummaryCard.jsx';
import PurchaseLinksList from '../components/build/PurchaseLinksList.jsx';
import CompatibilityStatus from '../components/compatibility/CompatibilityStatus.jsx';
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
import { componentLabels } from '../utils/componentLabels.js';
import { formatCurrency } from '../utils/formatCurrency.js';
import { translateValue } from '../utils/translations.js';

export default function BuildSummary() {
  const build = useBuildState();
  const request = useApiRequest();
  const [games, setGames] = useState([]);
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

  useEffect(() => {
    performanceService.listGames()
      .then((data) => setGames(Array.isArray(data) ? data : []))
      .catch(() => setGames([]));
  }, []);

  async function generateSummary() {
    if (!hasCompleteBuild(build.selectedComponents)) {
      setFeedback('Complete a build antes de gerar o resumo.');
      return;
    }

    await request.run(async () => {
      const [summary, gamePerformance, links] = await Promise.all([
        recommendationService.summary({
          build: build.buildPayload,
          budget: build.budget.amount ? normalizeBudgetPayload(build.budget) : undefined,
          usageType: build.usageType,
          ...build.game
        }),
        performanceService.simulateGame({
          ...build.game,
          build: build.buildPayload
        }).catch((error) => ({
          status: 'unavailable',
          message: error.status === 0
            ? 'Não foi possível conectar ao servidor para simular desempenho.'
            : 'Não foi possível simular desempenho com os dados atuais.'
        })),
        purchaseLinksService.byBuild(buildToPurchaseLinksPayload(build.selectedComponents)).catch(() => null)
      ]);

      build.actions.setResult('summary', summary);
      build.actions.setResult('gamePerformance', gamePerformance);
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
      setFeedback('Build salva com sucesso.');
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
      setAnalyticsError(error.message || 'Não foi possível concluir a análise solicitada.');
    } finally {
      setLoadingAction('');
    }
  }

  async function calculateBuildScore() {
    await runAnalyticsAction('score', async () => {
      const result = await buildScoreService.calculate(buildAnalyticsPayload());
      setBuildScore(result);
      setFeedback('Nota geral da build calculada.');
    });
  }

  async function loadFixSuggestions() {
    await runAnalyticsAction('fixes', async () => {
      const result = await compatibilityFixService.suggest(build.selectedComponents);
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
      setExportedJson(result);
      setExportOpen(true);
      setFeedback('JSON da build exportado.');
    });
  }

  async function copyExportedJson() {
    await navigator.clipboard.writeText(JSON.stringify(exportedJson, null, 2));
    setFeedback('JSON copiado.');
  }

  function applyFixSuggestion(suggestion) {
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

    build.actions.selectComponent(componentType, suggestedComponent);
    setFeedback(`${componentLabels[componentType] || 'Componente'} atualizado com a sugestão escolhida.`);
  }

  const compatibilityData = build.summary?.compatibility || build.compatibility || build.alerts;
  const isIncompatible = isCompatibilityIncompatible(compatibilityData);

  return (
    <div className="page-stack">
      <section className="page-hero compact-hero">
        <span className="eyebrow">Painel final</span>
        <h1>Resumo da configuração</h1>
        <p>Consolide componentes, orçamento, compatibilidade, desempenho, gargalos e links de compra.</p>
      </section>

      {request.error && <ErrorState message={request.error} />}
      {feedback && <Alert type="success">{feedback}</Alert>}

      <Card className="summary-actions-card">
        <div className="form-grid">
          <Select
            label="Selecione um jogo para simular o desempenho"
            value={build.game.gameId}
            onChange={(event) => build.actions.setGame({ gameId: event.target.value })}
            options={(games.length ? games : [{ id: 'game-cyberpunk-2077', name: 'Cyberpunk 2077' }]).map((game) => ({
              value: game.id,
              label: game.name
            }))}
          />
          <Select
            label="Resolução"
            value={build.game.targetResolution}
            onChange={(event) => build.actions.setGame({ targetResolution: event.target.value })}
            options={['1080p', '1440p', '4k'].map((value) => ({ value, label: value }))}
          />
          <Select
            label="Qualidade"
            value={build.game.qualityPreset}
            onChange={(event) => build.actions.setGame({ qualityPreset: event.target.value })}
            options={['low', 'medium', 'high', 'ultra'].map((value) => ({ value, label: translateValue(value) }))}
          />
        </div>
        <div className="button-row">
          <Button disabled={request.loading} loading={request.loading} onClick={generateSummary}>Gerar resumo final</Button>
          <Button variant="secondary" disabled={request.loading} onClick={saveBuild}><Save size={18} /> Salvar</Button>
          <Button variant="ghost" disabled={request.loading} onClick={shareBuild}><Share2 size={18} /> Compartilhar</Button>
          <Link className="btn btn-secondary btn-md" to="/build">Voltar e editar</Link>
          <Link className="btn btn-primary btn-md" to="/compare">Comparar build</Link>
          <Link className="btn btn-ghost btn-md" to="/upgrades">Sugerir upgrade</Link>
        </div>
      </Card>

      <Card className="summary-actions-card">
        <div className="section-heading compact">
          <div>
            <h2>Análises avançadas</h2>
            <p>Calcule a nota geral, veja correções automáticas e gere materiais técnicos para compartilhar.</p>
          </div>
          <Badge tone="cyan">Sprint analítica</Badge>
        </div>
        {analyticsError && <Alert type="error">{analyticsError}</Alert>}
        <div className="button-row">
          <Button
            variant="secondary"
            disabled={Boolean(loadingAction)}
            loading={loadingAction === 'score'}
            onClick={calculateBuildScore}
          >
            <Sparkles size={18} /> Calcular nota da build
          </Button>
          <Button
            variant={isIncompatible ? 'secondary' : 'ghost'}
            disabled={Boolean(loadingAction) || !isIncompatible}
            loading={loadingAction === 'fixes'}
            onClick={loadFixSuggestions}
          >
            <Wrench size={18} /> Ver sugestões de correção
          </Button>
          <Button
            variant="ghost"
            disabled={Boolean(loadingAction)}
            loading={loadingAction === 'report'}
            onClick={generateTechnicalReport}
          >
            <FileText size={18} /> Gerar relatório técnico
          </Button>
          <Button
            variant="ghost"
            disabled={Boolean(loadingAction)}
            loading={loadingAction === 'export'}
            onClick={exportBuildJson}
          >
            <FileJson size={18} /> Exportar JSON
          </Button>
        </div>
        {!isIncompatible && (
          <p className="hint-text">Sugestões de correção ficam disponíveis quando a análise de compatibilidade identifica incompatibilidades.</p>
        )}
      </Card>

      {request.loading && <LoadingSpinner />}
      {share && (
        <Alert type="info" title="Compartilhamento">
          <p>ID: {share.shareId} • URL: {share.shareUrl}</p>
          <Button variant="ghost" onClick={copyShareLink}><Copy size={18} /> Copiar link</Button>
        </Alert>
      )}

      <div className="dashboard-grid">
        <BuildSummaryCard selectedComponents={build.selectedComponents} totalPrice={build.totalPrice} />
        <BudgetPanel budget={build.budget} totalPrice={build.totalPrice} />
      </div>

      <BuildScorePanel score={buildScore} />

      <CompatibilityStatus result={build.summary?.compatibility ? { ...build.summary.compatibility, alerts: build.summary.compatibility.alerts } : build.alerts} />
      {fixSuggestions && (
        <FixSuggestionsPanel suggestions={fixSuggestions} onApply={applyFixSuggestion} />
      )}
      <BottleneckPanel result={build.summary?.bottlenecks || build.bottlenecks} />

      {build.gamePerformance?.status === 'unavailable' && (
        <Card>
          <h2>Simulação em jogos indisponível</h2>
          <p>{build.gamePerformance.message}</p>
        </Card>
      )}

      {build.gamePerformance && build.gamePerformance.status !== 'unavailable' && (
        <Card>
          <h2>Simulação em jogos</h2>
          <div className="metric-grid">
            <div><span>Jogo</span><strong>{build.gamePerformance.game}</strong></div>
            <div><span>FPS estimado</span><strong>{build.gamePerformance.estimatedFps}</strong></div>
            <div><span>Nível</span><strong>{translateValue(build.gamePerformance.performanceLevel)}</strong></div>
          </div>
          <p>{build.gamePerformance.summary}</p>
        </Card>
      )}

      {build.summary && (
        <Card>
          <h2>Recomendação final</h2>
          <p>{build.summary.summary}</p>
          <strong>{build.summary.finalRecommendation}</strong>
        </Card>
      )}

      <PurchaseLinksList linksBySlot={linksByBuild} selectedComponents={build.selectedComponents} />

      <Modal open={reportOpen} title="Relatório técnico da configuração" onClose={() => setReportOpen(false)}>
        <TechnicalReportView report={technicalReport} />
      </Modal>

      <Modal open={exportOpen} title="Exportação JSON da build" onClose={() => setExportOpen(false)}>
        <div className="stack">
          <p className="hint-text">Use este JSON para compartilhar a configuração em integrações externas ou salvar uma cópia estruturada.</p>
          <pre className="json-preview">{JSON.stringify(exportedJson || {}, null, 2)}</pre>
          <div className="button-row">
            <Button variant="secondary" onClick={copyExportedJson}><Copy size={18} /> Copiar JSON</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function BuildScorePanel({ score }) {
  if (!score) {
    return null;
  }

  const criteria = score.criteria || {};
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
          <h2>Nota geral</h2>
          <p>{score.summary || 'Nota consolidada da configuração atual.'}</p>
        </div>
        <Badge tone={getScoreTone(score.overallScore)}>{score.classification || classifyScore(score.overallScore)}</Badge>
      </div>
      <div className="score-overview">
        <div className="score-circle" aria-label={`Nota ${score.overallScore || 0} de 100`}>
          <strong>{formatScore(score.overallScore)}</strong>
          <span>de 100</span>
        </div>
        <div className="criteria-grid">
          {criteriaItems.map(([key, label]) => (
            <article key={key} className="criterion-card">
              <div>
                <span>{label}</span>
                <strong>{formatScore(criteria[key])}</strong>
              </div>
              <div className="score-bar" aria-hidden="true">
                <i style={{ width: `${clampScore(criteria[key])}%` }} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </Card>
  );
}

function FixSuggestionsPanel({ suggestions, onApply }) {
  const items = normalizeSuggestionItems(suggestions);

  return (
    <Card>
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
                    <strong>{currentComponent?.name || suggestion.currentComponentName || 'Não informado'}</strong>
                  </div>
                  <div>
                    <span>Sugerido</span>
                    <strong>{suggestedComponent?.name || suggestion.suggestedComponentName || 'Alternativa sugerida'}</strong>
                    {suggestedComponent?.price && <small>{formatCurrency(suggestedComponent.price)}</small>}
                  </div>
                </div>
                {suggestedComponent?.id && (
                  <Button variant="secondary" onClick={() => onApply(suggestion)}>
                    Aplicar sugestão
                  </Button>
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
            <dd><ReportValue value={nestedValue} /></dd>
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

  return data.compatible === false
    || data.isCompatible === false
    || data.status === 'incompatible'
    || alerts.some((alert) => ['high', 'critical'].includes(alert.severity));
}

function formatScore(value) {
  const score = Number(value);

  return Number.isFinite(score) ? Math.round(score) : 0;
}

function clampScore(value) {
  return Math.max(0, Math.min(100, formatScore(value)));
}

function getScoreTone(value) {
  const score = Number(value);

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
  const score = Number(value);

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
