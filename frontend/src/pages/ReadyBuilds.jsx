import ComponentIdentity from '../components/componentsCatalog/ComponentIdentity.jsx';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Eye, Upload, Wand2 } from 'lucide-react';
import ComponentReplacement from '../components/build/ComponentReplacement.jsx';
import { SuggestedPiecePicker } from '../components/recommendations/RecommendationCard.jsx';
import Alert from '../components/ui/Alert.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import Input from '../components/ui/Input.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import Modal from '../components/ui/Modal.jsx';
import Select from '../components/ui/Select.jsx';
import UsageProfilesManager from '../components/usageProfiles/UsageProfilesManager.jsx';
import { useApiRequest } from '../hooks/useApiRequest.js';
import { useBuildState } from '../hooks/useBuildState.jsx';
import { useComponents } from '../hooks/useComponents.js';
import { buildRecommendationService } from '../services/buildRecommendationService.js';
import { readyBuildsService } from '../services/readyBuildsService.js';
import { buildToApiPayload, hydrateBuildComponents } from '../utils/buildHelpers.js';
import { componentLabels, componentTypes, priorityLabels, priorityOptions } from '../utils/componentLabels.js';
import { formatCurrency } from '../utils/formatCurrency.js';
import { translateValue } from '../utils/translations.js';
import { consumeSelectedUsageProfile, inferUsageSettingsFromProfile } from '../utils/usageProfileHelpers.js';

const readyBuildProfiles = [
  'all',
  'gaming',
  'study',
  'programming',
  'video-editing',
  'work',
  'streaming',
  'general',
  'cost-benefit',
  'high-performance'
];

const recommendationUsageTypes = readyBuildProfiles.filter((profile) => profile !== 'all');

const initialBudgetRange = {
  min: '',
  max: '',
  usageType: 'gaming',
  priority: 'cost-benefit'
};

export default function ReadyBuilds() {
  const navigate = useNavigate();
  const buildState = useBuildState();
  const { components, loading: componentsLoading, error: componentsError, reload: reloadComponents } = useComponents();
  const request = useApiRequest();
  const recommendationRequest = useApiRequest();
  const recommendationSectionRef = useRef(null);
  const consumedProfileRef = useRef(false);
  const readyRequestSequence = useRef(0);
  const recommendationSequence = useRef(0);
  const [selectedProfile, setSelectedProfile] = useState('all');
  const [readyBuilds, setReadyBuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [detailsBuild, setDetailsBuild] = useState(null);
  const [budgetRange, setBudgetRange] = useState(initialBudgetRange);
  const [recommendations, setRecommendations] = useState([]);
  const [usageProfiles, setUsageProfiles] = useState([]);
  const [selectedUsageProfileId, setSelectedUsageProfileId] = useState('');
  const [highlightRecommendation, setHighlightRecommendation] = useState(false);
  const [replacement, setReplacement] = useState(null);
  const [recommendationContext, setRecommendationContext] = useState(null);
  const recommendationKey = JSON.stringify([buildState.revision, budgetRange]);
  const latestRecommendationKey = useRef(recommendationKey);
  latestRecommendationKey.current = recommendationKey;
  const latestRevision = useRef(buildState.revision);
  latestRevision.current = buildState.revision;
  const latestProfile = useRef(selectedProfile);
  latestProfile.current = selectedProfile;

  const componentMap = useMemo(() => (
    Object.fromEntries(components.map((component) => [component.id, component]))
  ), [components]);

  useEffect(() => {
    loadReadyBuilds(selectedProfile);
  }, [selectedProfile]);

  useEffect(() => () => {
    readyRequestSequence.current += 1;
    recommendationSequence.current += 1;
  }, []);

  async function loadReadyBuilds(profile = selectedProfile) {
    const requestId = ++readyRequestSequence.current;
    const isCurrent = () => requestId === readyRequestSequence.current && latestProfile.current === profile;
    setLoading(true);
    request.setError('');

    try {
      const filters = profile && profile !== 'all' ? { profile } : {};
      const data = await readyBuildsService.list(filters);
      if (isCurrent()) setReadyBuilds(Array.isArray(data) ? data : []);
    } catch (error) {
      if (isCurrent()) request.setError(error.message);
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }

  function applyReadyBuild(readyBuild, destination = '/summary') {
    const selectedComponents = mapReadyBuildToSelectedComponents(readyBuild, componentMap);

    if (!hasAllComponents(selectedComponents)) {
      setFeedback('Alguns componentes desta build ainda não foram carregados. Tente novamente em instantes.');
      return;
    }

    buildState.actions.applyRecommendation({ ...readyBuild, components: selectedComponents }, { replaceCooling: true });
    buildState.actions.setBudget({
      amount: readyBuild.targetBudgetRange?.max || '',
      currency: 'BRL',
      priority: 'cost-benefit'
    });
    buildState.actions.setUsageType(readyBuild.usageProfile || buildState.usageType);
    if (destination === '/build') buildState.actions.setWizardStep('cpu');
    setFeedback(`Build "${readyBuild.name}" aplicada como build atual.`);

    if (destination) {
      navigate(destination);
    }
  }

  function openReadyBuildFeedback(readyBuild) {
    const feedbackBuild = createFeedbackBuildContext(readyBuild.components, componentMap);

    navigate('/feedback/new', {
      state: {
        mode: 'contextual',
        recommendationType: 'ready-build',
        recommendationId: readyBuild.id || readyBuild.name,
        title: readyBuild.name,
        recommendationTitle: readyBuild.name,
        build: readyBuild.components,
        ...feedbackBuild,
        summary: readyBuild.description,
        totalEstimatedPrice: readyBuild.estimatedTotalPrice,
        compatibilityStatus: 'compatible',
        performanceLevel: readyBuild.expectedPerformanceLevel,
        usageType: readyBuild.usageProfile,
        source: 'ready-build'
      }
    });
  }

  function applyRecommendation(recommendationData, destination = '/summary') {
    if (recommendationContext !== latestRecommendationKey.current) return;
    const selectedComponents = normalizeRecommendationComponents(recommendationData, componentMap);

    if (!hasAllComponents(selectedComponents)) {
      setFeedback('A recomendação não retornou todos os componentes necessários para aplicar a build.');
      return;
    }

    const recommendationComponents = getRecommendationComponents(recommendationData);
    if (!Object.hasOwn(recommendationComponents, 'fans')) delete selectedComponents.fans;
    if ((Object.hasOwn(recommendationComponents, 'cooler') || Object.hasOwn(recommendationComponents, 'coolerId')) && !selectedComponents.cooler) {
      selectedComponents.cooler = null;
    }
    buildState.actions.applyRecommendation({ ...recommendationData, components: selectedComponents });
    buildState.actions.setBudget({
      amount: budgetRange.max,
      currency: 'BRL',
      priority: budgetRange.priority
    });
    buildState.actions.setUsageType(budgetRange.usageType);
    setFeedback('Recomendação aplicada como build atual.');

    if (destination) {
      navigate(destination);
    }
  }

  async function submitBudgetRecommendation(event) {
    event?.preventDefault();
    setFeedback('');

    const validationError = validateBudgetRange(budgetRange);
    if (validationError) {
      recommendationRequest.setError(validationError);
      return;
    }

    const requestId = ++recommendationSequence.current;
    const isCurrent = () => requestId === recommendationSequence.current && latestRecommendationKey.current === recommendationKey;
    setRecommendations([]);
    setRecommendationContext(null);
    await recommendationRequest.run(async () => {
      let result;
      try { result = await buildRecommendationService.byBudgetRange({
        budgetRange: {
          min: Number(budgetRange.min),
          max: Number(budgetRange.max)
        },
        usageType: budgetRange.usageType,
        priority: budgetRange.priority
      }); } catch (error) { if (isCurrent()) throw error; else return; }
      if (!isCurrent()) return;
      setRecommendations(normalizeRecommendationList(result));
      setRecommendationContext(recommendationKey);
      setFeedback('Recomendação por faixa de orçamento gerada com sucesso.');
    });
  }

  function updateRecommendationCriteria(changes) {
    recommendationSequence.current += 1;
    setRecommendations([]);
    setRecommendationContext(null);
    recommendationRequest.setError('');
    setFeedback('');
    setBudgetRange(current => ({ ...current, ...changes }));
  }

  function previewComponent(type, component) {
    setDetailsBuild(null);
    setReplacement({ type, component, revision: buildState.revision });
  }

  function applyUsageProfile(profileOrId, profiles = usageProfiles, shouldFocusRecommendation = false) {
    const profileId = typeof profileOrId === 'string' ? profileOrId : profileOrId?.id || '';
    setSelectedUsageProfileId(profileId);
    if (!profileId) {
      return;
    }

    const profile = typeof profileOrId === 'object'
      ? profileOrId
      : profiles.find((item) => item.id === profileId);
    if (!profile) {
      return;
    }

    const settings = inferUsageSettingsFromProfile(profile);
    updateRecommendationCriteria({
      usageType: settings.usageType,
      priority: settings.priority
    });
    setFeedback(`Perfil "${profile.name}" aplicado aos critérios da recomendação.`);

    if (shouldFocusRecommendation) {
      setHighlightRecommendation(true);
      recommendationSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.setTimeout(() => setHighlightRecommendation(false), 1600);
    }
  }

  function handleProfilesLoaded(profiles) {
    setUsageProfiles(profiles);

    if (selectedUsageProfileId && !profiles.some((profile) => profile.id === selectedUsageProfileId)) {
      setSelectedUsageProfileId('');
    }

    if (!consumedProfileRef.current) {
      consumedProfileRef.current = true;
      const pendingProfileId = consumeSelectedUsageProfile();
      if (pendingProfileId) {
        applyUsageProfile(pendingProfileId, profiles, true);
      }
    }
  }

  const renderReadyBuilds = () => {
    if (loading || componentsLoading) {
      return <LoadingSpinner />;
    }

    if (request.error || componentsError) {
      return (
        <ErrorState
          message={request.error || componentsError}
          onRetry={() => {
            loadReadyBuilds();
            reloadComponents();
          }}
        />
      );
    }

    if (readyBuilds.length === 0) {
      return (
        <EmptyState
          title="Nenhuma build pronta encontrada"
          message="Tente outro perfil de uso ou gere uma recomendação por faixa de orçamento."
        />
      );
    }

    return (
      <div className="cards-grid ready-build-grid">
        {readyBuilds.map((readyBuild) => (
          <ReadyBuildCard
            key={readyBuild.id}
            readyBuild={readyBuild}
            componentMap={componentMap}
            onApply={() => applyReadyBuild(readyBuild)}
            currentSelection={buildState.selectedComponents}
            onPreview={previewComponent}
            onDetails={() => setDetailsBuild(readyBuild)}
            onFeedback={() => openReadyBuildFeedback(readyBuild)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="page-stack">
      <section className="page-hero compact-hero">
        <span className="eyebrow">Atalhos inteligentes</span>
        <h1>Builds prontas</h1>
        <p>Consulte configurações completas por perfil de uso ou gere uma recomendação dentro da sua faixa de orçamento.</p>
      </section>

      {feedback && <Alert type="success">{feedback}</Alert>}

      <Card>
        <div className="section-heading compact">
          <div>
            <h2>Configurações por perfil</h2>
            <p>Escolha um perfil para filtrar builds já validadas pelo backend.</p>
          </div>
          <Select
            label="Perfil de uso"
            value={selectedProfile}
            onChange={(event) => setSelectedProfile(event.target.value)}
            options={readyBuildProfiles.map((profile) => ({
              value: profile,
              label: profile === 'all' ? 'Todos os perfis' : translateValue(profile)
            }))}
          />
        </div>
      </Card>

      {renderReadyBuilds()}

      <UsageProfilesManager
        appliedProfileId={selectedUsageProfileId}
        onProfilesLoaded={handleProfilesLoaded}
        onApplyProfile={(profile) => applyUsageProfile(profile, usageProfiles, true)}
      />

      <div ref={recommendationSectionRef}>
      <Card className={highlightRecommendation ? 'recommendation-section is-highlighted' : 'recommendation-section'}>
        <div className="section-heading compact">
          <div>
            <h2>Recomendar build por orçamento</h2>
            <p>Informe uma faixa de preço para receber uma configuração completa compatível.</p>
          </div>
          <Wand2 size={28} aria-hidden="true" />
        </div>

        <form className="form-grid" onSubmit={submitBudgetRecommendation}>
          <Input
            label="Orçamento mínimo"
            type="number"
            min="1"
            value={budgetRange.min}
            onChange={(event) => updateRecommendationCriteria({ min: event.target.value })}
            required
          />
          <Input
            label="Orçamento máximo"
            type="number"
            min="1"
            value={budgetRange.max}
            onChange={(event) => updateRecommendationCriteria({ max: event.target.value })}
            required
          />
          <Select
            label="Perfil personalizado"
            value={selectedUsageProfileId}
            onChange={(event) => applyUsageProfile(event.target.value)}
            options={[
              { value: '', label: 'Nenhum perfil personalizado' },
              ...usageProfiles.map((profile) => ({ value: profile.id, label: profile.name }))
            ]}
          />
          <Select
            label="Tipo de uso"
            value={budgetRange.usageType}
            onChange={(event) => updateRecommendationCriteria({ usageType: event.target.value })}
            options={recommendationUsageTypes.map((usageType) => ({
              value: usageType,
              label: translateValue(usageType)
            }))}
          />
          <Select
            label="Prioridade"
            value={budgetRange.priority}
            onChange={(event) => updateRecommendationCriteria({ priority: event.target.value })}
            options={priorityOptions.map((priority) => ({
              value: priority,
              label: priorityLabels[priority] || translateValue(priority)
            }))}
          />
          <div className="button-row">
            <Button type="submit" loading={recommendationRequest.loading} disabled={recommendationRequest.loading}>
              <Wand2 size={18} /> Gerar recomendação
            </Button>
          </div>
        </form>

        {recommendationRequest.error && (
          <ErrorState
            message={recommendationRequest.error}
            onRetry={() => submitBudgetRecommendation()}
          />
        )}
        {recommendationRequest.loading && <LoadingSpinner />}
        {!recommendationRequest.loading && recommendationContext === recommendationKey && recommendations.length > 0 && (
          <div className="cards-grid">
            {recommendations.map((recommendation, index) => (
              <RecommendationResultCard
                key={recommendation.id || recommendation.name || index}
                recommendation={recommendation}
                currentSelection={buildState.selectedComponents}
                componentMap={componentMap}
                onApply={() => applyRecommendation(recommendation)}
                onPreview={previewComponent}
                onFeedback={() => {
                  const feedbackBuild = createFeedbackBuildContext(recommendation.components || recommendation.build || recommendation, componentMap);
                  navigate('/feedback/new', {
                    state: {
                      mode: 'contextual',
                      recommendationType: 'build-recommendation',
                      recommendationId: recommendation.id || recommendation.name || `budget-range-${index + 1}`,
                      title: recommendation.name || 'Build recomendada',
                      recommendationTitle: recommendation.name || 'Build recomendada',
                      recommendation,
                      build: recommendation.components || recommendation.build,
                      ...feedbackBuild,
                      summary: recommendation.summary,
                      totalEstimatedPrice: getRecommendationPrice(recommendation),
                      compatibilityStatus: recommendation.compatibilityStatus,
                      performanceLevel: recommendation.performanceLevel || recommendation.expectedPerformanceLevel || recommendation.estimatedPerformanceLevel,
                      usageType: budgetRange.usageType,
                      priority: budgetRange.priority,
                      source: 'builds-by-budget'
                    }
                  });
                }}
              />
            ))}
          </div>
        )}
      </Card>
      </div>

      <Modal
        open={Boolean(detailsBuild)}
        title={detailsBuild ? detailsBuild.name : 'Detalhes da build'}
        onClose={() => setDetailsBuild(null)}
      >
        {detailsBuild && (
          <ReadyBuildDetails
            readyBuild={detailsBuild}
            componentMap={componentMap}
            onApply={() => applyReadyBuild(detailsBuild)}
            onEdit={() => applyReadyBuild(detailsBuild, '/build')}
            currentSelection={buildState.selectedComponents}
            onPreview={previewComponent}
            onFeedback={() => openReadyBuildFeedback(detailsBuild)}
          />
        )}
      </Modal>
      {replacement && replacement.revision === buildState.revision && <ComponentReplacement
        key={`${replacement.revision}:${replacement.type}:${replacement.component.id}`}
        type={replacement.type} build={buildState} initialComponent={replacement.component}
        onClose={() => setReplacement(null)}
        onApply={(type, component, summary) => {
          if (latestRevision.current !== replacement.revision) return;
          buildState.actions.replaceComponent(type, component, summary, replacement.revision);
          setReplacement(null);
          navigate('/summary');
        }}
      />}
    </div>
  );
}

function ReadyBuildCard({ readyBuild, componentMap, currentSelection, onApply, onPreview, onDetails, onFeedback }) {
  return (
    <Card as="article" className="ready-build-card">
      <div className="section-heading compact">
        <div>
          <h2>{readyBuild.name}</h2>
          <Badge tone="cyan">{translateValue(readyBuild.usageProfile)}</Badge>
        </div>
        <strong className="price">{formatCurrency(readyBuild.estimatedTotalPrice)}</strong>
      </div>
      <p>{readyBuild.description}</p>
      <div className="metric-grid">
        <div>
          <span>Faixa de orçamento</span>
          <strong>{formatBudgetRange(readyBuild.targetBudgetRange)}</strong>
        </div>
        <div>
          <span>Desempenho esperado</span>
          <strong>{translateValue(readyBuild.expectedPerformanceLevel)}</strong>
        </div>
      </div>
      <ComponentPreviewList componentsInput={readyBuild.components} componentMap={componentMap} />
      <InfoList title="Limitações" items={readyBuild.limitations} emptyMessage="Nenhuma limitação informada." />
      <SuggestedPiecePicker components={mapReadyBuildToSelectedComponents(readyBuild, componentMap)} currentComponents={currentSelection} onPreview={onPreview} />
      <p className="hint-text">Usar a build inteira substitui a montagem atual, incluindo a refrigeração, e carrega o orçamento e o perfil desta build pronta.</p>
      <div className="button-row">
        <Button variant="secondary" onClick={onApply}><Upload size={18} /> Usar build inteira</Button>
        <Button variant="ghost" onClick={onDetails}><Eye size={18} /> Ver detalhes</Button>
        <Button variant="ghost" onClick={onFeedback}>Avaliar build</Button>
      </div>
    </Card>
  );
}

function ReadyBuildDetails({ readyBuild, componentMap, currentSelection, onApply, onPreview, onEdit, onFeedback }) {
  return (
    <div className="page-stack">
      <p>{readyBuild.description}</p>
      <div className="metric-grid">
        <div>
          <span>Preço estimado</span>
          <strong>{formatCurrency(readyBuild.estimatedTotalPrice)}</strong>
        </div>
        <div>
          <span>Faixa de orçamento</span>
          <strong>{formatBudgetRange(readyBuild.targetBudgetRange)}</strong>
        </div>
        <div>
          <span>Perfil</span>
          <strong>{translateValue(readyBuild.usageProfile)}</strong>
        </div>
      </div>
      <ul className="build-parts-list">
        {componentTypes.map((type) => (
          <li key={type}>
            <span>{componentLabels[type]}</span>
            <ComponentIdentity component={readyBuild.components?.[type] || readyBuild.components?.[`${type}Id`]} category={type} />
          </li>
        ))}
        <CoolingParts components={normalizeRecommendationComponents(readyBuild.components, componentMap)} />
      </ul>
      <InfoList title="Indicado para" items={readyBuild.recommendedFor} emptyMessage="Nenhuma indicação informada." />
      <InfoList title="Limitações" items={readyBuild.limitations} emptyMessage="Nenhuma limitação informada." />
      <SuggestedPiecePicker components={mapReadyBuildToSelectedComponents(readyBuild, componentMap)} currentComponents={currentSelection} onPreview={onPreview} />
      <p className="hint-text">Usar ou editar a build inteira substitui a montagem atual, incluindo a refrigeração, o orçamento e o perfil.</p>
      <div className="button-row">
        <Button variant="secondary" onClick={onApply}><Upload size={18} /> Usar build inteira</Button>
        <Button variant="ghost" onClick={onFeedback}>Avaliar build</Button>
        <Button variant="secondary" onClick={onEdit}>Editar build inteira no assistente</Button>
      </div>
    </div>
  );
}

function RecommendationResultCard({ recommendation, componentMap, currentSelection = {}, onApply, onPreview, onFeedback }) {
  const components = normalizeRecommendationComponents(recommendation, componentMap);
  const totalPrice = getRecommendationPrice(recommendation);
  const preservesCooling = recommendationPreservesCooling(recommendation, currentSelection);

  return (
    <Card className="recommendation-result-card">
      <div className="section-heading compact">
        <div>
          <h2>Build recomendada</h2>
          <p>{preservesCooling ? 'Configuração recomendada antes de incluir sua refrigeração atual.' : recommendation.summary || 'Configuração completa recomendada para a faixa informada.'}</p>
        </div>
        <div>
          {preservesCooling && <small>Preço base, sem a refrigeração mantida</small>}
          <strong className="price">{formatCurrency(totalPrice)}</strong>
        </div>
      </div>
      {preservesCooling && (
        <Alert type="warning" title="Refrigeração atual será mantida">
          O cooler e/ou os packs de ventoinhas já selecionados serão incluídos no total ao aplicar. Reavalie compatibilidade e orçamento no resumo antes de comprar.
        </Alert>
      )}
      <div className="metric-grid">
        <div>
          <span>Status do orçamento</span>
          <strong>{preservesCooling ? 'Recalcular no resumo' : translateValue(recommendation.budgetStatus || 'compatible')}</strong>
        </div>
        <div>
          <span>Compatibilidade</span>
          <strong>{preservesCooling ? 'Não verificada' : translateValue(recommendation.compatibilityStatus || (recommendation.unverifiedChecks?.length ? 'unverified' : recommendation.compatible === true ? 'compatible' : recommendation.compatible === false ? 'incompatible' : 'unverified'))}</strong>
        </div>
        <div>
          <span>Desempenho</span>
          <strong>{translateValue(recommendation.performanceLevel || recommendation.expectedPerformanceLevel || recommendation.estimatedPerformanceLevel || 'good')}</strong>
        </div>
      </div>
      <ul className="build-parts-list">
        {componentTypes.map((type) => (
          <li key={type}>
            <span>{componentLabels[type]}</span>
            <ComponentIdentity component={components[type]} category={type} />
          </li>
        ))}
        <CoolingParts components={components} />
      </ul>
      <SuggestedPiecePicker components={components} currentComponents={currentSelection} onPreview={onPreview} />
      <p className="hint-text">Usar a recomendação inteira substitui as peças principais e usa os critérios de orçamento e perfil informados acima. A refrigeração atual é mantida quando não estiver incluída na recomendação.</p>
      <div className="button-row">
        <Button variant="secondary" onClick={onApply}><CheckCircle2 size={18} /> Usar recomendação inteira</Button>
        <Button variant="ghost" onClick={onFeedback}>Avaliar recomendação</Button>
        <Link className="btn btn-secondary btn-md" to="/summary">Ir para resumo</Link>
      </div>
    </Card>
  );
}

function ComponentPreviewList({ componentsInput, componentMap }) {
  const visibleTypes = componentTypes;

  return (
    <ul className="build-parts-list compact-list">
      {visibleTypes.map((type) => (
        <li key={type}>
          <span>{componentLabels[type]}</span>
          <ComponentIdentity component={componentsInput?.[type] || componentsInput?.[`${type}Id`]} category={type} />
        </li>
      ))}
      <CoolingParts components={normalizeRecommendationComponents(componentsInput, componentMap)} />
    </ul>
  );
}

function InfoList({ title, items = [], emptyMessage }) {
  return (
    <div className="info-block">
      <h3>{title}</h3>
      {Array.isArray(items) && items.length > 0 ? (
        <ul>
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : (
        <p>{emptyMessage}</p>
      )}
    </div>
  );
}

function mapReadyBuildToSelectedComponents(readyBuild, componentMap) {
  return hydrateBuildComponents(readyBuild.components, componentMap);
}

function normalizeRecommendationComponents(recommendationOrComponents = {}, componentMap = {}) {
  return hydrateBuildComponents(getRecommendationComponents(recommendationOrComponents), componentMap);
}

function getRecommendationComponents(recommendationOrComponents = {}) {
  return recommendationOrComponents.components
    || recommendationOrComponents.build?.components
    || recommendationOrComponents.build
    || recommendationOrComponents.selectedComponents
    || recommendationOrComponents;
}

function recommendationPreservesCooling(recommendation, currentSelection) {
  const components = getRecommendationComponents(recommendation);
  return Boolean((currentSelection.cooler && !Object.hasOwn(components, 'cooler') && !Object.hasOwn(components, 'coolerId'))
    || (currentSelection.fans?.length && !Object.hasOwn(components, 'fans')));
}

function createFeedbackBuildContext(componentsInput = {}, componentMap = {}) {
  const selectedComponents = normalizeRecommendationComponents(componentsInput, componentMap);

  if (!hasAllComponents(selectedComponents)) {
    return {};
  }

  return {
    buildSnapshot: buildToApiPayload(selectedComponents),
    buildDetails: {
      ...Object.fromEntries([...componentTypes, 'cooler']
        .filter((type) => selectedComponents[type])
        .map((type) => [type, feedbackComponentDetails(selectedComponents[type])])),
      ...(selectedComponents.fans.length && {
        fans: selectedComponents.fans.map((fan) => ({ ...feedbackComponentDetails(fan), quantity: fan.quantity }))
      })
    }
  };
}

function feedbackComponentDetails(component) {
  return {
    id: component.id,
    ...(component.name && { name: component.name }),
    ...(component.category && { category: component.category }),
    ...(component.brand && { brand: component.brand }),
    ...(component.price != null && component.price !== '' && Number.isFinite(Number(component.price)) && { price: Number(component.price) })
  };
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

function hasAllComponents(selectedComponents) {
  return componentTypes.every((type) => selectedComponents[type]?.id);
}

function formatBudgetRange(range) {
  if (!range) {
    return 'Não informado';
  }

  return `${formatCurrency(range.min)} a ${formatCurrency(range.max)}`;
}

function validateBudgetRange(range) {
  const min = Number(range.min);
  const max = Number(range.max);

  if (!Number.isFinite(min) || min <= 0) {
    return 'Informe um orçamento mínimo válido.';
  }

  if (!Number.isFinite(max) || max <= 0) {
    return 'Informe um orçamento máximo válido.';
  }

  if (min >= max) {
    return 'O orçamento mínimo deve ser menor que o orçamento máximo.';
  }

  return '';
}

function normalizeRecommendationList(result) {
  if (Array.isArray(result)) {
    return result;
  }

  if (Array.isArray(result?.recommendations)) {
    return result.recommendations;
  }

  if (Array.isArray(result?.builds)) {
    return result.builds;
  }

  return result ? [result] : [];
}

function getRecommendationPrice(recommendation) {
  return recommendation.totalEstimatedPrice
    ?? recommendation.estimatedTotalPrice
    ?? recommendation.totalPrice
    ?? recommendation.price
    ?? recommendation.build?.totalEstimatedPrice
    ?? recommendation.build?.estimatedTotalPrice
    ?? recommendation.build?.totalPrice
    ?? null;
}
