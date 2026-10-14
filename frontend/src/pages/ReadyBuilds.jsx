import CoolingAssessmentNotice from '../components/compatibility/CoolingAssessmentNotice.jsx';
import { compatibilityDisplayLabel } from '../utils/coolingAssessment.js';
import TaskTabs, { TaskPanel } from '../components/ui/TaskTabs.jsx';
import { hasSimulatedPerformance } from '../utils/performanceMethodology.js';
import DecisionMethodology from '../components/build/DecisionMethodology.jsx';
import ComponentIdentity from '../components/componentsCatalog/ComponentIdentity.jsx';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  const location = useLocation();
  const taskForHash = hash => ({ '#ready-build-catalog': 'explore', '#ready-build-profiles': 'profiles' })[hash] || 'recommend';
  const [task, setTask] = useState(() => taskForHash(location.hash));
  useEffect(() => { setTask(taskForHash(location.hash)); }, [location.hash]);
  const [focusRecommendationPending, setFocusRecommendationPending] = useState(false);
  const buildState = useBuildState();
  const { componentMap, loading: componentsLoading, error: componentsError, reload: reloadComponents } = useComponents();
  const request = useApiRequest();
  const recommendationRequest = useApiRequest();
  const recommendationSectionRef = useRef(null);
  const readyBuildsSectionRef = useRef(null);
  const usageProfilesSectionRef = useRef(null);
  const recommendationHighlightTimer = useRef(null);
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

  useEffect(() => {
    loadReadyBuilds(selectedProfile);
  }, [selectedProfile]);

  useEffect(() => () => {
    readyRequestSequence.current += 1;
    recommendationSequence.current += 1;
    clearTimeout(recommendationHighlightTimer.current);
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
        totalEstimatedPrice: getCurrentBuildPricing(readyBuild, componentMap).total,
        compatibilityStatus: getReadyBuildCompatibility(readyBuild),
        coolingAssessment: readyBuild.compatibility?.coolingAssessment || readyBuild.coolingAssessment,
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

    await recommendationRequest.run(async () => {
      const requestId = ++recommendationSequence.current;
      const isCurrent = () => requestId === recommendationSequence.current && latestRecommendationKey.current === recommendationKey;
      setRecommendations([]);
      setRecommendationContext(null);
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
      setFeedback('Consulta por faixa de orçamento concluída. Confira o total e o status da sugestão.');
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
      focusRecommendation();
    }
  }

  useEffect(() => {
    if (!focusRecommendationPending || task !== 'recommend') return;
    const section = recommendationSectionRef.current;
    if (section) {
      const headerHeight = document.querySelector('.topbar')?.getBoundingClientRect().height || 0;
      section.style.scrollMarginTop = `${headerHeight + 16}px`;
      section.focus({ preventScroll: true });
      section.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }
    setFocusRecommendationPending(false);
  }, [task, focusRecommendationPending]);

  function focusRecommendation() {
    setTask('recommend');
    setFocusRecommendationPending(true);
    setHighlightRecommendation(true);
    clearTimeout(recommendationHighlightTimer.current);
    recommendationHighlightTimer.current = setTimeout(() => setHighlightRecommendation(false), 1600);
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
            currentBudget={buildState.budget}
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
        <p>Consulte configurações completas por perfil de uso ou consulte sugestões para sua faixa de orçamento.</p>

      </section>
      <TaskTabs id="ready-build-tasks" label="Builds prontas" value={task} onChange={setTask}
        tabs={[{ id: 'recommend', label: 'Recomendar' }, { id: 'explore', label: 'Explorar' }, { id: 'profiles', label: 'Meus perfis' }]} />

      {feedback && <Alert type="success">{feedback}</Alert>}

      <TaskPanel id="ready-build-tasks" value="recommend" active={task === 'recommend'}>
      <section id="budget-recommendation" ref={recommendationSectionRef} tabIndex={-1} aria-labelledby="budget-recommendation-heading">
        <Card className={highlightRecommendation ? 'recommendation-section is-highlighted' : 'recommendation-section'}>
          <div className="section-heading compact">
            <div>
              <h2 id="budget-recommendation-heading">Recomendar build por orçamento</h2>
              <p>Informe uma faixa de orçamento para receber uma sugestão do catálogo. Confira as verificações de compatibilidade antes de comprar.</p>
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
              revealSelectedValue
              value={selectedUsageProfileId}
              onChange={(event) => applyUsageProfile(event.target.value)}
              options={[
                { value: '', label: 'Sem perfil' },
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
            <div className="cards-grid recommendation-results-grid">
              {recommendations.map((recommendation, index) => (
                <RecommendationResultCard
                  key={recommendation.id || recommendation.name || index}
                  recommendation={recommendation}
                  currentSelection={buildState.selectedComponents}
                  componentMap={componentMap}
                  budgetRange={budgetRange}
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
                        totalEstimatedPrice: getCurrentBuildPricing(recommendation, componentMap).total,
                        compatibilityStatus: recommendation.compatibilityStatus,
                        coolingAssessment: recommendation.coolingAssessment,
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
      </section>
      </TaskPanel>

      <TaskPanel id="ready-build-tasks" value="explore" active={task === 'explore'}>
      <section id="ready-build-catalog" ref={readyBuildsSectionRef} tabIndex={-1} aria-labelledby="ready-build-catalog-heading" className="page-stack">
        <Card>
          <div className="section-heading compact">
            <div>
              <h2 id="ready-build-catalog-heading">Configurações por perfil</h2>
              <p>Escolha um perfil e confira o preço atual de referência e a compatibilidade de cada configuração.</p>
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
      </section>
      </TaskPanel>

      <TaskPanel id="ready-build-tasks" value="profiles" active={task === 'profiles'}>
      <section id="ready-build-profiles" ref={usageProfilesSectionRef} tabIndex={-1} aria-label="Perfis personalizados">
        <UsageProfilesManager
          appliedProfileId={selectedUsageProfileId}
          onProfilesLoaded={handleProfilesLoaded}
          onApplyProfile={(profile) => applyUsageProfile(profile, usageProfiles, true)}
        />
      </section>
      </TaskPanel>

      <DecisionMethodology />

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
            currentBudget={buildState.budget}
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

function ReadyBuildCard({ readyBuild, componentMap, currentSelection, currentBudget, onApply, onPreview, onDetails, onFeedback }) {
  const pricing = getCurrentBuildPricing(readyBuild, componentMap);
  return (
    <Card as="article" className="ready-build-card">
      <div className="section-heading compact">
        <div>
          <h2>{readyBuild.name}</h2>
          <Badge tone="cyan">{translateValue(readyBuild.usageProfile)}</Badge>
        </div>
        <strong className="price"><small className="estimated-price-label">{pricing.complete ? 'Total estimado atual de referência' : 'Subtotal conhecido · preço incompleto'}</small>{formatCurrency(pricing.knownCount ? pricing.knownTotal : null)}</strong>
      </div>
      <p>{readyBuild.description}</p>
      <div className="metric-grid">
        <div>
          <span>{currentBudget?.amount ? `Seu orçamento: ${formatCurrency(currentBudget.amount)}` : 'Seu orçamento'}</span>
          <strong>{getBudgetFitLabel(pricing, { max: currentBudget?.amount }, true)}</strong>
        </div>
        <div>
          <span>Faixa-alvo original</span>
          <strong>{formatCurrency(readyBuild.targetBudgetRange?.min)} a {formatCurrency(readyBuild.targetBudgetRange?.max)}</strong>
          <span>{getBudgetFitLabel(pricing, readyBuild.targetBudgetRange)}</span>
        </div>
        <div>
          <span>{hasSimulatedPerformance(readyBuild) ? 'Desempenho simulado' : 'Desempenho estimado'}</span>
          <strong>{translateValue(readyBuild.expectedPerformanceLevel)}</strong>
        </div>
      </div>
      <ReadyBuildChecks readyBuild={readyBuild} pricing={pricing} />
      <ComponentPreviewList componentsInput={readyBuild.components} componentMap={componentMap} />
      <InfoList title="Limitações" items={readyBuild.limitations} emptyMessage="Nenhuma limitação informada." />
      <SuggestedPiecePicker components={mapReadyBuildToSelectedComponents(readyBuild, componentMap)} currentComponents={currentSelection} onPreview={onPreview} />
      <p className="hint-text">Usar a build inteira substitui a montagem atual, incluindo a refrigeração, e carrega o perfil desta configuração. Seu orçamento é mantido.</p>
      <div className="button-row">
        <Button variant="secondary" onClick={onApply}><Upload size={18} /> Usar build inteira</Button>
        <Button variant="ghost" onClick={onDetails}><Eye size={18} /> Ver detalhes</Button>
        <Button variant="ghost" onClick={onFeedback}>Avaliar build</Button>
      </div>
    </Card>
  );
}

function ReadyBuildDetails({ readyBuild, componentMap, currentSelection, currentBudget, onApply, onPreview, onEdit, onFeedback }) {
  const pricing = getCurrentBuildPricing(readyBuild, componentMap);
  return (
    <div className="page-stack">
      <p>{readyBuild.description}</p>
      <div className="metric-grid">
        <div>
          <span>{pricing.complete ? 'Total estimado atual de referência' : 'Subtotal conhecido · preço incompleto'}</span>
          <strong>{formatCurrency(pricing.knownCount ? pricing.knownTotal : null)}</strong>
        </div>
        <div>
          <span>{currentBudget?.amount ? `Seu orçamento: ${formatCurrency(currentBudget.amount)}` : 'Seu orçamento'}</span>
          <strong>{getBudgetFitLabel(pricing, { max: currentBudget?.amount }, true)}</strong>
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
      <ReadyBuildChecks readyBuild={readyBuild} pricing={pricing} />
      <InfoList title="Indicado para" items={readyBuild.recommendedFor} emptyMessage="Nenhuma indicação informada." />
      <InfoList title="Limitações" items={readyBuild.limitations} emptyMessage="Nenhuma limitação informada." />
      <SuggestedPiecePicker components={mapReadyBuildToSelectedComponents(readyBuild, componentMap)} currentComponents={currentSelection} onPreview={onPreview} />
      <p className="hint-text">Usar ou editar a build inteira substitui a montagem atual, incluindo a refrigeração e o perfil. Seu orçamento é mantido.</p>
      <div className="button-row">
        <Button variant="secondary" onClick={onApply}><Upload size={18} /> Usar build inteira</Button>
        <Button variant="ghost" onClick={onFeedback}>Avaliar build</Button>
        <Button variant="secondary" onClick={onEdit}>Editar build inteira no assistente</Button>
      </div>
    </div>
  );
}

function RecommendationResultCard({ recommendation, componentMap, budgetRange, currentSelection = {}, onApply, onPreview, onFeedback }) {
  const components = normalizeRecommendationComponents(recommendation, componentMap);
  const pricing = getCurrentBuildPricing(recommendation, componentMap);
  const preservesCooling = recommendationPreservesCooling(recommendation, currentSelection);

  return (
    <Card className="recommendation-result-card">
      <div className="section-heading compact">
        <div>
          <h2>Build recomendada</h2>
          <p>{preservesCooling ? 'Configuração recomendada antes de incluir sua refrigeração atual.' : 'Configuração sugerida para os critérios informados. Confira o preço atual abaixo.'}</p>
        </div>
        <div>
          <small className="estimated-price-label">{!pricing.complete ? 'Subtotal conhecido · preço incompleto' : preservesCooling ? 'Total estimado base, sem a refrigeração mantida' : 'Total estimado atual de referência'}</small>
          <strong className="price">{formatCurrency(pricing.knownCount ? pricing.knownTotal : null)}</strong>
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
          <strong>{!pricing.complete ? 'Preço incompleto: orçamento não verificado' : preservesCooling ? 'Recalcular no resumo' : getBudgetFitLabel(pricing, budgetRange)}</strong>
        </div>
        <div>
          <span>Compatibilidade</span>
          <strong>{preservesCooling ? 'Não verificada' : compatibilityDisplayLabel(recommendation.compatibilityStatus || (recommendation.unverifiedChecks?.length ? 'unverified' : recommendation.compatible === true ? 'compatible' : recommendation.compatible === false ? 'incompatible' : 'unverified'), recommendation)}</strong>
          <CoolingAssessmentNotice result={recommendation} />
        </div>
        <div>
          <span>{hasSimulatedPerformance(recommendation) ? 'Desempenho simulado' : 'Desempenho estimado'}</span>
          <strong>{(recommendation.performanceLevel || recommendation.expectedPerformanceLevel || recommendation.estimatedPerformanceLevel) ? translateValue(recommendation.performanceLevel || recommendation.expectedPerformanceLevel || recommendation.estimatedPerformanceLevel) : 'Não informado'}</strong>
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
  return hydrateBuildComponents(readyBuild.components, componentMap, { preferCatalog: true });
}

function normalizeRecommendationComponents(recommendationOrComponents = {}, componentMap = {}) {
  return hydrateBuildComponents(getRecommendationComponents(recommendationOrComponents), componentMap, { preferCatalog: true });
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

function ReadyBuildChecks({ readyBuild, pricing }) {
  const compatibilityStatus = getReadyBuildCompatibility(readyBuild);
  return <><p className="hint-text">
    {!pricing.complete && 'Há peças sem preço atual. O subtotal conhecido não confirma o custo total nem o enquadramento no orçamento. '}
    Compatibilidade: {compatibilityDisplayLabel(compatibilityStatus, readyBuild)}.
    {compatibilityStatus !== 'compatible' && ' Confira as verificações no resumo antes de comprar.'}
  </p><CoolingAssessmentNotice result={readyBuild} /></>;
}

function getReadyBuildCompatibility(readyBuild) {
  const compatibility = readyBuild.compatibility || readyBuild;
  if (compatibility.status === 'incompatible') return 'incompatible';
  if (compatibility.status === 'unverified' || compatibility.unverifiedChecks?.length) return 'unverified';
  if (compatibility.compatible === false) return 'incompatible';
  return compatibility.status === 'compatible' || compatibility.compatible === true ? 'compatible' : 'unverified';
}

function getCurrentBuildPricing(build, componentMap) {
  const selected = normalizeRecommendationComponents(build, componentMap);
  const parts = componentTypes.map(type => selected[type]);
  if (selected.cooler) parts.push(selected.cooler);
  parts.push(...selected.fans);
  let knownTotal = 0;
  let knownCount = 0;
  for (const component of parts) {
    // An explicit unknown catalog price must never fall back to a saved estimate.
    const current = componentMap?.[component?.id];
    const value = current && Object.hasOwn(current, 'price') ? current.price : current?.estimatedPrice;
    const price = value === null || value === undefined || value === '' ? NaN : Number(value);
    if (!component?.id || !Number.isFinite(price) || price < 0) continue;
    knownTotal += price * Number(component.quantity ?? 1);
    knownCount += 1;
  }
  knownTotal = Number(knownTotal.toFixed(2));
  const complete = knownCount === parts.length;
  return { knownTotal, knownCount, complete, total: complete ? knownTotal : null };
}

function getBudgetFitLabel(pricing, range = {}, isUserBudget = false) {
  if (!pricing.complete) return 'Preço incompleto: orçamento não verificado';
  const max = Number(range.max);
  if (!Number.isFinite(max) || max <= 0) return 'Orçamento não informado';
  if (pricing.total > max) return isUserBudget ? 'Acima do seu orçamento' : 'Acima da faixa informada';
  const min = Number(range.min);
  if (Number.isFinite(min) && min > 0 && pricing.total < min) return 'Abaixo da faixa informada';
  return isUserBudget ? 'Dentro do seu orçamento' : 'Dentro da faixa informada';
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
