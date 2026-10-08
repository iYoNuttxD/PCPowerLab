import ComponentIdentity from '../components/componentsCatalog/ComponentIdentity.jsx';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Save, Send, Trash2, Upload } from 'lucide-react';
import Alert from '../components/ui/Alert.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Input from '../components/ui/Input.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import Select from '../components/ui/Select.jsx';
import { useBuildState } from '../hooks/useBuildState.jsx';
import { useComponents } from '../hooks/useComponents.js';
import { recommendationFeedbackService } from '../services/recommendationFeedbackService.js';
import { savedBuildsService } from '../services/savedBuildsService.js';
import { buildToApiPayload, calculateBuildPrice, hasCompleteBuild, hydrateBuildComponents, normalizeSavedBuildPayload } from '../utils/buildHelpers.js';
import { componentLabels, componentTypes } from '../utils/componentLabels.js';
import { formatCurrency } from '../utils/formatCurrency.js';
import { translateValue } from '../utils/translations.js';

const recommendationTypeOptions = [
  'build-recommendation',
  'ready-build',
  'upgrade-suggestion',
  'compatibility-fix',
  'budget-recommendation',
  'general'
];

const recommendationTypeLabels = {
  'build-recommendation': 'Recomendação de build',
  'ready-build': 'Build pronta',
  'upgrade-suggestion': 'Sugestão de upgrade',
  'compatibility-fix': 'Correção de compatibilidade',
  'budget-recommendation': 'Recomendação por orçamento',
  general: 'Geral'
};

export default function Feedback() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isNewFeedbackRoute = location.pathname === '/feedback/new';
  const buildState = useBuildState();
  const { components } = useComponents();
  const context = location.state || {};
  const initialType = context.recommendationType || searchParams.get('type') || 'general';
  const recommendationId = context.recommendationId || searchParams.get('recommendationId') || '';
  const isContextual = Boolean(
    isNewFeedbackRoute
    && (
      context.mode === 'contextual'
      || context.recommendationTitle
      || context.title
      || context.summary
      || context.buildSnapshot
      || context.build
      || context.components
      || context.recommendation
    )
  );
  const [form, setForm] = useState({
    recommendationType: initialType,
    rating: 5,
    comment: '',
    wouldFollowRecommendation: 'true'
  });
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingBuild, setSavingBuild] = useState(false);
  const [feedbacks, setFeedbacks] = useState([]);
  const [feedbackFilter, setFeedbackFilter] = useState(searchParams.get('recommendationType') || '');
  const [centralLoading, setCentralLoading] = useState(false);
  const [removingFeedbackId, setRemovingFeedbackId] = useState('');
  const [appliedFeedbackBuildId, setAppliedFeedbackBuildId] = useState('');

  const componentMap = useMemo(() => (
    Object.fromEntries((components || []).map((component) => [component.id, component]))
  ), [components]);

  const contextBuildSnapshot = useMemo(() => normalizeFeedbackBuildSnapshot(context), [context]);

  const selectedComponents = useMemo(() => (
    normalizeContextComponents(context.buildDetails
      ? { ...contextBuildSnapshot, ...context.buildDetails }
      : contextBuildSnapshot || context.build || context.components || context.recommendation?.components, componentMap)
  ), [componentMap, context.buildDetails, contextBuildSnapshot, context.build, context.components, context.recommendation]);

  const hasRecommendationBuild = hasCompleteBuild(selectedComponents);
  const feedbackBuildSnapshot = useMemo(() => (
    contextBuildSnapshot || (hasRecommendationBuild ? normalizeBuildSnapshot(buildToApiPayload(selectedComponents)) : null)
  ), [contextBuildSnapshot, hasRecommendationBuild, selectedComponents]);
  const returnLink = getReturnLink(context);

  useEffect(() => {
    if (!isNewFeedbackRoute) {
      loadFeedbacks(feedbackFilter);
    }
  }, [feedbackFilter, isNewFeedbackRoute]);

  useEffect(() => {
    if (!isNewFeedbackRoute && location.state?.successMessage) {
      setFeedback(location.state.successMessage);
      navigate('/feedback', { replace: true });
    }
  }, [isNewFeedbackRoute, location.state, navigate]);

  async function loadFeedbacks(recommendationType = feedbackFilter) {
    setCentralLoading(true);
    setError('');

    try {
      const data = await recommendationFeedbackService.list(recommendationType ? { recommendationType } : {});
      setFeedbacks(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError.message || 'Não foi possível carregar os feedbacks registrados.');
      setFeedbacks([]);
    } finally {
      setCentralLoading(false);
    }
  }

  async function submitFeedback(event) {
    event.preventDefault();
    const rating = Number(form.rating);

    if (!form.recommendationType) {
      setError('Informe o tipo de recomendação.');
      return;
    }

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      setError('Informe uma nota entre 1 e 5.');
      return;
    }

    if (requiresBuildSnapshot(context) && !feedbackBuildSnapshot) {
      setError('Esta recomendação não possui uma build completa para vincular ao feedback.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const totalEstimatedPrice = getContextPrice(context, selectedComponents);
      const payload = {
        recommendationType: form.recommendationType,
        ...(recommendationId && { recommendationId }),
        rating,
        ...(form.comment.trim() && { comment: form.comment.trim().slice(0, 500) }),
        wouldFollowRecommendation: form.wouldFollowRecommendation === 'true',
        ...(isContextual && context.source && { source: context.source }),
        ...(isContextual && getContextTitle(context) && { recommendationTitle: getContextTitle(context).slice(0, 120) }),
        ...(isContextual && getContextSummary(context) && { recommendationSummary: getContextSummary(context).slice(0, 500) }),
        ...(isContextual && Number.isFinite(totalEstimatedPrice) && totalEstimatedPrice > 0 && { totalEstimatedPrice }),
        ...(isContextual && context.compatibilityStatus && { compatibilityStatus: context.compatibilityStatus }),
        ...(isContextual && context.performanceLevel && { performanceLevel: context.performanceLevel }),
        ...(isContextual && feedbackBuildSnapshot && { buildSnapshot: feedbackBuildSnapshot }),
        ...(isContextual && feedbackBuildSnapshot && { buildDetails: normalizeBuildDetails(selectedComponents) })
      };

      await recommendationFeedbackService.create(payload);
      navigate('/feedback', {
        state: {
          successMessage: 'Feedback registrado com sucesso.'
        }
      });
    } catch (feedbackError) {
      setError(feedbackError.message || 'Não foi possível registrar a avaliação.');
    } finally {
      setLoading(false);
    }
  }

  function useFeedbackBuild(feedbackRecord, destination) {
    const feedbackSnapshot = normalizeFeedbackBuildSnapshot(feedbackRecord);
    const feedbackComponents = normalizeContextComponents(feedbackSnapshot, componentMap);

    if (!hasCompleteBuild(feedbackComponents)) {
      setError('Este feedback não possui uma build completa para aplicar.');
      return;
    }

    buildState.actions.applyRecommendation({ ...feedbackRecord, components: feedbackComponents }, { replaceCooling: true });
    setAppliedFeedbackBuildId(feedbackRecord.id || '');
    setFeedback('Build do feedback aplicada como configuração atual.');

    if (destination) {
      navigate(destination);
    }
  }

  async function removeFeedback(feedbackId) {
    setRemovingFeedbackId(feedbackId);
    setError('');

    try {
      await recommendationFeedbackService.remove(feedbackId);
      setFeedback('Feedback removido.');
      await loadFeedbacks(feedbackFilter);
    } catch (removeError) {
      setError(removeError.message || 'Não foi possível remover o feedback.');
    } finally {
      setRemovingFeedbackId('');
    }
  }

  function useRecommendationBuild(destination) {
    if (!hasRecommendationBuild) {
      setError('Esta recomendação não possui componentes suficientes para aplicar como build atual.');
      return;
    }

    buildState.actions.applyRecommendation({ ...(context.recommendation || context), components: selectedComponents }, { replaceCooling: true });
    setFeedback('Build aplicada como configuração atual.');

    if (destination) {
      navigate(destination);
    }
  }

  async function saveRecommendationBuild() {
    if (!hasRecommendationBuild) {
      setError('Esta recomendação não possui componentes suficientes para salvar.');
      return;
    }

    setSavingBuild(true);
    setError('');

    try {
      await savedBuildsService.create(normalizeSavedBuildPayload({
        name: context.recommendationTitle || context.title || 'Build recomendada PCPowerLab',
        description: getContextSummary(context),
        selectedComponents,
        budget: buildState.budget,
        usageType: context.usageType || buildState.usageType
      }));
      setFeedback('Build salva com sucesso.');
    } catch (saveError) {
      setError(saveError.message || 'Não foi possível salvar a build.');
    } finally {
      setSavingBuild(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="page-hero compact-hero">
        <span className="eyebrow">Feedback</span>
        <h1>{isNewFeedbackRoute ? (isContextual ? 'Feedback da recomendação' : 'Feedback geral') : 'Central de feedback'}</h1>
        <p>
          {isNewFeedbackRoute
            ? (isContextual
              ? 'Avalie se esta recomendação fez sentido para sua necessidade.'
              : 'Registre uma avaliação geral sobre as recomendações do PCPowerLab.')
            : 'Acompanhe avaliações registradas, reutilize builds avaliadas e filtre o histórico.'}
        </p>
      </section>

      {feedback && <Alert type="success">{feedback}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      {isNewFeedbackRoute ? (
        <>
          <div className="feedback-layout">
            <RecommendationSummary
              context={context}
              selectedComponents={selectedComponents}
              hasRecommendationBuild={hasRecommendationBuild}
            />

            <FeedbackForm
              form={form}
              loading={loading}
              contextual={isContextual}
              onChange={setForm}
              onSubmit={submitFeedback}
            />
          </div>

          <Card className="feedback-actions-card">
            <div className="section-heading compact">
              <div>
                <h2>Continuar com esta recomendação</h2>
                <p>Usar aplica a configuração inteira avaliada, incluindo refrigeração. Para alterar só uma peça, abra o resumo da sua montagem atual.</p>
              </div>
            </div>
            <div className="button-row">
              {hasRecommendationBuild && (
                <>
                  <Button variant="secondary" onClick={() => useRecommendationBuild()}>
                    <Upload size={18} /> Usar esta build inteira
                  </Button>
                  <Button onClick={() => useRecommendationBuild('/summary')}>
                    <CheckCircle2 size={18} /> Usar build inteira e ir para resumo
                  </Button>
                  <Button variant="ghost" loading={savingBuild} disabled={savingBuild} onClick={saveRecommendationBuild}>
                    <Save size={18} /> Salvar build
                  </Button>
                </>
              )}
              <Link className="btn btn-secondary btn-md" to={returnLink.to}>{returnLink.label}</Link>
              {!hasRecommendationBuild && isContextual && (
                <Link className="btn btn-ghost btn-md" to={returnLink.to}>{getFallbackActionLabel(context)}</Link>
              )}
            </div>
          </Card>
        </>
      ) : (
        <CentralFeedback
          feedbacks={feedbacks}
          loading={centralLoading}
          filter={feedbackFilter}
          removingFeedbackId={removingFeedbackId}
          appliedFeedbackBuildId={appliedFeedbackBuildId}
          componentMap={componentMap}
          onFilterChange={setFeedbackFilter}
          onRemove={removeFeedback}
          onUseBuild={useFeedbackBuild}
        />
      )}
    </div>
  );
}

function FeedbackForm({ form, loading, contextual = false, onChange, onSubmit }) {
  return (
    <Card className="feedback-form-card">
      <div className="section-heading compact">
        <div>
          <span className="eyebrow">Sua avaliação</span>
          <h2>{contextual ? 'Avaliar recomendação' : 'Feedback geral'}</h2>
          <p>{contextual ? 'O tipo de recomendação foi preenchido com o contexto enviado.' : 'Registre uma avaliação geral sobre as recomendações recebidas.'}</p>
        </div>
      </div>

      <form className="profile-form" onSubmit={onSubmit}>
        <Select
          label="Tipo de recomendação"
          value={form.recommendationType}
          onChange={(event) => onChange((current) => ({ ...current, recommendationType: event.target.value }))}
          options={recommendationTypeOptions.map((type) => ({
            value: type,
            label: recommendationTypeLabels[type] || translateValue(type)
          }))}
        />
        <Input
          label="Nota"
          type="number"
          min="1"
          max="5"
          value={form.rating}
          onChange={(event) => onChange((current) => ({ ...current, rating: event.target.value }))}
          required
        />
        <Select
          label="Você seguiria esta recomendação?"
          value={form.wouldFollowRecommendation}
          onChange={(event) => onChange((current) => ({ ...current, wouldFollowRecommendation: event.target.value }))}
          options={[
            { value: 'true', label: 'Sim' },
            { value: 'false', label: 'Não' }
          ]}
        />
        <label className="field">
          <span>Comentário opcional</span>
          <textarea
            rows={5}
            maxLength={500}
            value={form.comment}
            onChange={(event) => onChange((current) => ({ ...current, comment: event.target.value }))}
          />
        </label>
        <div className="button-row">
          <Button type="submit" loading={loading} disabled={loading}>
            <Send size={18} /> Enviar feedback
          </Button>
        </div>
      </form>
    </Card>
  );
}

function CentralFeedback({
  feedbacks,
  loading,
  filter,
  removingFeedbackId,
  appliedFeedbackBuildId,
  componentMap,
  onFilterChange,
  onRemove,
  onUseBuild
}) {
  const stats = calculateFeedbackStats(feedbacks);

  return (
    <>
      <div className="metric-grid">
        <div><span>Total de avaliações</span><strong>{stats.total}</strong></div>
        <div><span>Nota média</span><strong>{stats.averageRating}</strong></div>
        <div><span>Seguiriam</span><strong>{stats.wouldFollow}</strong></div>
        <div><span>Não seguiriam / N/D</span><strong>{stats.wouldNotFollow}</strong></div>
      </div>

      <Card>
        <div className="section-heading compact">
          <div>
            <span className="eyebrow">Avaliações registradas</span>
            <h2>Histórico de feedbacks</h2>
            <p>As avaliações aparecerão aqui quando você avaliar builds recomendadas, upgrades ou correções.</p>
          </div>
          <div className="feedback-toolbar">
            <div className="feedback-filter">
            <Select
              label="Filtrar por tipo"
              value={filter}
              onChange={(event) => onFilterChange(event.target.value)}
              options={[
                { value: '', label: 'Todos' },
                ...recommendationTypeOptions.map((type) => ({ value: type, label: recommendationTypeLabels[type] || translateValue(type) }))
              ]}
            />
            </div>
            <div className="feedback-toolbar-actions">
              <Link className="btn btn-secondary btn-md" to="/feedback/new?type=general">Registrar feedback geral</Link>
            </div>
          </div>
        </div>
        {loading ? (
          <LoadingSpinner />
        ) : feedbacks.length === 0 ? (
          <EmptyState
            title="Nenhuma avaliação registrada ainda"
            message="As avaliações aparecerão aqui quando você avaliar builds recomendadas, upgrades ou correções."
          />
        ) : (
          <div className="feedback-list">
            {feedbacks.map((item) => {
              const feedbackSnapshot = normalizeFeedbackBuildSnapshot(item);
              const feedbackComponents = normalizeContextComponents(feedbackSnapshot, componentMap);
              const feedbackDisplayComponents = normalizeContextComponents({ ...feedbackSnapshot, ...item.buildDetails }, componentMap);
              const canUseFeedbackBuild = hasCompleteBuild(feedbackComponents);
              const hasLinkedBuild = Boolean(feedbackSnapshot || item.buildDetails);
              const isApplied = appliedFeedbackBuildId === item.id;

              return (
                <article key={item.id} className="feedback-list-item">
                  <div className="feedback-list-item__content">
                    <div>
                      <Badge tone="cyan">{recommendationTypeLabels[item.recommendationType] || translateValue(item.recommendationType)}</Badge>
                      <h3>Nota {item.rating || 'N/D'}/5</h3>
                      <p>{item.comment || item.recommendationSummary || 'Sem comentário.'}</p>
                      <small>
                        Seguiria: {item.wouldFollowRecommendation === true ? 'Sim' : item.wouldFollowRecommendation === false ? 'Não' : 'Não informado'}
                        {item.recommendationId ? ` • Ref.: ${item.recommendationId}` : ''}
                        {item.createdAt ? ` • ${new Date(item.createdAt).toLocaleString('pt-BR')}` : ''}
                      </small>
                    </div>

                    {hasLinkedBuild ? (
                      <FeedbackBuildSnapshot
                        selectedComponents={feedbackDisplayComponents}
                        totalEstimatedPrice={item.totalEstimatedPrice}
                      />
                    ) : (
                      <p className="hint-text">Feedback sem build vinculada.</p>
                    )}
                  </div>

                  <div className="feedback-list-item__actions">
                    {feedbackSnapshot && (
                      <>
                        <Button
                          variant="secondary"
                          disabled={!canUseFeedbackBuild}
                          onClick={() => onUseBuild(item)}
                        >
                          <Upload size={18} /> Usar build inteira do feedback
                        </Button>
                        <Button
                          disabled={!canUseFeedbackBuild}
                          onClick={() => onUseBuild(item, '/summary')}
                        >
                          <CheckCircle2 size={18} /> Usar build inteira e ir para resumo
                        </Button>
                        {isApplied && <Link className="btn btn-ghost btn-md" to="/summary">Ir para resumo</Link>}
                      </>
                    )}
                    {item.id && (
                      <Button variant="danger" loading={removingFeedbackId === item.id} disabled={removingFeedbackId === item.id} onClick={() => onRemove(item.id)}>
                        <Trash2 size={18} /> Remover feedback
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Card>
    </>
  );
}

function FeedbackBuildSnapshot({ selectedComponents, totalEstimatedPrice }) {
  return (
    <div className="feedback-build-snapshot">
      <div className="section-heading compact">
        <div>
          <span className="eyebrow">Build vinculada</span>
          <h4>Configuração vinculada ao feedback</h4>
        </div>
        {Number.isFinite(Number(totalEstimatedPrice)) && Number(totalEstimatedPrice) > 0 && (
          <strong className="price"><small className="estimated-price-label">Total estimado de referência</small>{formatCurrency(totalEstimatedPrice)}</strong>
        )}
      </div>
      <ul className="build-parts-list compact-build-list">
        {componentTypes.map((type) => (
          <li key={type}>
            <span>{componentLabels[type]}</span>
            <ComponentIdentity component={selectedComponents[type]} category={type} fallback="Componente não encontrado" />
          </li>
        ))}
        <CoolingParts components={selectedComponents} />
      </ul>
    </div>
  );
}

function RecommendationSummary({ context, selectedComponents, hasRecommendationBuild }) {
  const isUpgrade = context.recommendationType === 'upgrade-suggestion';
  const isFix = context.recommendationType === 'compatibility-fix';

  return (
    <Card className="feedback-summary-card">
      <div className="section-heading compact">
        <div>
          <span className="eyebrow">Resumo da recomendação</span>
          <h2>{getContextTitle(context) || recommendationTypeLabels[context.recommendationType] || 'Feedback geral'}</h2>
          <p>{getContextSummary(context) || 'Nenhuma recomendação específica foi enviada. Você ainda pode registrar um feedback geral.'}</p>
        </div>
        <Badge tone="cyan">{recommendationTypeLabels[context.recommendationType] || 'Geral'}</Badge>
      </div>

      {isUpgrade && <UpgradeSummary context={context} />}
      {isFix && <CompatibilityFixSummary context={context} />}

      {hasRecommendationBuild && (
        <>
          <div className="metric-grid compact-metric-grid">
            <div>
              <span>Preço estimado</span>
              <strong>{formatCurrency(getContextPrice(context, selectedComponents))}</strong>
            </div>
            <div>
              <span>Tipo de uso</span>
              <strong>{translateValue(context.usageType)}</strong>
            </div>
            <div>
              <span>Prioridade</span>
              <strong>{translateValue(context.priority)}</strong>
            </div>
            <div>
              <span>Compatibilidade</span>
              <strong>{translateValue(context.compatibilityStatus || (context.unverifiedChecks?.length ? 'unverified' : context.compatible === true ? 'compatible' : context.compatible === false ? 'incompatible' : 'unverified'))}</strong>
            </div>
          </div>
          <ul className="build-parts-list">
            {componentTypes.map((type) => (
              <li key={type}>
                <span>{componentLabels[type]}</span>
                <ComponentIdentity component={selectedComponents[type]} category={type} />
              </li>
            ))}
            <CoolingParts components={selectedComponents} />
          </ul>
        </>
      )}
    </Card>
  );
}

function UpgradeSummary({ context }) {
  return (
    <div className="upgrade-pair">
      <div className="upgrade-pair__item">
        <span className="upgrade-pair__label">Atual</span>
        <ComponentIdentity component={context.currentComponent} />
      </div>
      <div className="upgrade-pair__item">
        <span className="upgrade-pair__label">Sugerido</span>
        <ComponentIdentity component={context.suggestedComponent} />
      </div>
    </div>
  );
}

function CompatibilityFixSummary({ context }) {
  return (
    <div className="upgrade-pair">
      <div className="upgrade-pair__item">
        <span className="upgrade-pair__label">Problema</span>
        <strong className="upgrade-pair__value">{context.problem || context.issue || 'Correção de compatibilidade'}</strong>
      </div>
      <div className="upgrade-pair__item">
        <span className="upgrade-pair__label">Alternativa</span>
        <ComponentIdentity component={context.suggestedComponent} fallback="Alternativa sugerida" />
      </div>
    </div>
  );
}

function getContextSummary(context = {}) {
  return context.recommendationSummary || context.summary || context.recommendation?.summary || context.description || '';
}

function getContextTitle(context = {}) {
  return context.recommendationTitle || context.title || context.recommendation?.name || context.name || '';
}

function getFallbackActionLabel(context = {}) {
  if (context.source === 'builds-by-budget') {
    return 'Gerar nova recomendação';
  }

  if (context.source === 'upgrade' || context.recommendationType === 'upgrade-suggestion') {
    return 'Gerar novo plano de upgrade';
  }

  if (context.source === 'saved-builds') {
    return 'Voltar para Builds salvas';
  }

  if (context.source === 'ready-build' || context.source === 'ready-builds') {
    return 'Explorar outras builds prontas';
  }

  return 'Voltar para Central de feedbacks';
}

function getReturnLink(context = {}) {
  if (context.source === 'builds-by-budget') {
    return { to: '/ready-builds', label: 'Voltar para recomendações por orçamento' };
  }

  if (context.source === 'upgrade' || context.recommendationType === 'upgrade-suggestion') {
    return { to: '/upgrades', label: 'Voltar para Upgrades' };
  }

  if (context.source === 'saved-builds') {
    return { to: '/saved-builds', label: 'Voltar para Builds salvas' };
  }

  if (context.source === 'ready-build' || context.source === 'ready-builds') {
    return { to: '/ready-builds', label: 'Voltar para Builds prontas' };
  }

  return { to: '/feedback', label: 'Voltar para Central de feedbacks' };
}

function requiresBuildSnapshot(context = {}) {
  return ['ready-build', 'ready-builds', 'builds-by-budget', 'saved-builds'].includes(context.source)
    || ['ready-build', 'build-recommendation', 'budget-recommendation'].includes(context.recommendationType);
}

function normalizeContextComponents(input = {}, componentMap = {}) {
  const componentsInput = input?.components || input?.build?.components || input?.build || input;

  return hydrateBuildComponents(componentsInput || {}, componentMap);
}

function normalizeFeedbackBuildSnapshot(context = {}) {
  const candidateSources = [
    context.buildSnapshot,
    context.components,
    context.build?.components,
    context.build,
    context.recommendation?.components,
    context.buildDetails
  ];

  for (const source of candidateSources) {
    const snapshot = normalizeBuildSnapshot(source);

    if (snapshot && componentTypes.every((type) => snapshot[`${type}Id`])) {
      return snapshot;
    }
  }

  return null;
}

function normalizeBuildDetails(selectedComponents = {}) {
  const details = Object.fromEntries([...componentTypes, 'cooler']
    .filter((type) => selectedComponents[type])
    .map((type) => [type, normalizeComponentDetails(selectedComponents[type])]));
  if (selectedComponents.fans?.length) {
    details.fans = selectedComponents.fans.map((fan) => ({ ...normalizeComponentDetails(fan), quantity: fan.quantity ?? 1 }));
  }
  return details;
}

function normalizeComponentDetails(component) {
  return {
    ...(component.id && { id: component.id }),
    ...(component.name && { name: component.name }),
    ...(component.category && { category: component.category }),
    ...(component.brand && { brand: component.brand }),
    ...(component.price != null && component.price !== '' && Number.isFinite(Number(component.price)) && { price: Number(component.price) })
  };
}

function normalizeBuildSnapshot(snapshot = {}) {
  const normalized = buildToApiPayload(snapshot);
  return componentTypes.some((type) => normalized[`${type}Id`]) ? normalized : null;
}

function getContextPrice(context, selectedComponents) {
  return context.totalEstimatedPrice
    ?? context.estimatedTotalPrice
    ?? context.totalPrice
    ?? calculateBuildPrice(selectedComponents);
}

function CoolingParts({ components }) {
  return (
    <>
      {components.cooler && (
        <li>
          <span>{componentLabels.cooler}</span>
          <ComponentIdentity component={components.cooler} category="cooler" />
        </li>
      )}
      {(components.fans || []).map((fan) => (
        <li key={fan.id}>
          <span>{componentLabels.fan} · {fan.quantity ?? 1} pack(s)</span>
          <ComponentIdentity component={fan} category="fan" />
        </li>
      ))}
    </>
  );
}

function calculateFeedbackStats(feedbacks) {
  const total = feedbacks.length;
  const ratings = feedbacks.map((item) => Number(item.rating)).filter(Number.isFinite);
  const averageRating = ratings.length
    ? (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1)
    : 'N/D';
  const wouldFollow = feedbacks.filter((item) => item.wouldFollowRecommendation === true).length;
  const wouldNotFollow = feedbacks.filter((item) => item.wouldFollowRecommendation !== true).length;

  return {
    total,
    averageRating,
    wouldFollow,
    wouldNotFollow
  };
}
