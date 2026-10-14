import CoolingAssessmentNotice from '../components/compatibility/CoolingAssessmentNotice.jsx';
import { compatibilityDisplayLabel, getCoolingAssessment } from '../utils/coolingAssessment.js';
import TaskTabs, { TaskPanel } from '../components/ui/TaskTabs.jsx';
import { hasSimulatedPerformance } from '../utils/performanceMethodology.js';
import DecisionMethodology from '../components/build/DecisionMethodology.jsx';
import ComponentIdentity from '../components/componentsCatalog/ComponentIdentity.jsx';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Route, Zap } from 'lucide-react';
import ComponentReplacement from '../components/build/ComponentReplacement.jsx';
import Alert from '../components/ui/Alert.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import Input from '../components/ui/Input.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import Select from '../components/ui/Select.jsx';
import { useSessionSimulationRequest } from '../hooks/useSessionSimulationRequest.js';
import { useBuildState } from '../hooks/useBuildState.jsx';
import { useComponents } from '../hooks/useComponents.js';
import { savedBuildsService } from '../services/savedBuildsService.js';
import { upgradeRoadmapService } from '../services/upgradeRoadmapService.js';
import { upgradeService } from '../services/upgradeService.js';
import { usageProfilesService } from '../services/usageProfilesService.js';
import { buildToApiPayload, calculateBuildPrice, hasCompleteBuild, hydrateBuildComponents, normalizeBudgetPayload } from '../utils/buildHelpers.js';
import { componentLabels, componentTypes, priorityLabels, usageLabels, usageTypes } from '../utils/componentLabels.js';
import { formatCurrency } from '../utils/formatCurrency.js';
import { translateValue } from '../utils/translations.js';
import { consumeSelectedUsageProfile, inferUsageSettingsFromProfile } from '../utils/usageProfileHelpers.js';
import { validateBudgetAmount, validateUpgradeStepCount } from '../utils/validation.js';
import { analysisIdentity, isOptionalNumber, isOptionalText, isRecord, isSessionId, readAnalysisSession, writeAnalysisSession } from '../utils/analysisSession.js';

export default function UpgradeSuggestions() {
  const navigate = useNavigate();
  const [task, setTask] = useState('single');
  const [searchParams, setSearchParams] = useSearchParams();
  const build = useBuildState();
  const { componentMap, loading: catalogLoading, error: catalogError, reload: reloadCatalog } = useComponents();
  const identity = analysisIdentity([build.revision, build.selectedComponents, build.usageType]);
  const hasUrlSource = searchParams.has('buildId') || searchParams.get('source') === 'current';
  const [initialInputs] = useState(() => {
    const stored = readAnalysisSession('upgrade-inputs', identity, validUpgradeInputs);
    if (stored && (!hasUrlSource || stored.buildId === searchParams.get('buildId'))) return stored;
    return { buildId: searchParams.get('buildId'), sourceIdentity: null, selectedUsageProfileId: '', budget: 1500,
      usageType: build.usageType, priority: 'cost-benefit', roadmapBudget: 2500, maxSteps: 3 };
  });
  const lastSource = useRef(initialInputs.buildId);
  // Explicit URLs always win, including unavailable IDs. Bare navigation resumes
  // this tab's last source; canonical current URLs preserve Back/Forward intent.
  const requestedBuildId = hasUrlSource ? searchParams.get('buildId') : lastSource.current;
  lastSource.current = requestedBuildId;
  const buildId = requestedBuildId ?? '';
  const hasRequestedBuild = requestedBuildId !== null;
  const [savedBuilds, setSavedBuilds] = useState([]);
  const [savedBuildsLoading, setSavedBuildsLoading] = useState(true);
  const [savedBuildsError, setSavedBuildsError] = useState('');
  const [savedBuildsAttempt, setSavedBuildsAttempt] = useState(0);
  const [usageProfiles, setUsageProfiles] = useState([]);
  const [selectedUsageProfileId, setSelectedUsageProfileId] = useState(initialInputs.selectedUsageProfileId);
  const [budget, setBudget] = useState(initialInputs.budget);
  const [usageType, setUsageType] = useState(initialInputs.usageType);
  const [priority, setPriority] = useState(initialInputs.priority);
  const [roadmapBudget, setRoadmapBudget] = useState(initialInputs.roadmapBudget);
  const [maxSteps, setMaxSteps] = useState(initialInputs.maxSteps);
  const maxStepsError = validateUpgradeStepCount(maxSteps);
  const [suggestionValidation, setSuggestionValidation] = useState(null);
  const [roadmapValidation, setRoadmapValidation] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [replacement, setReplacement] = useState(null);
  const latestRevision = useRef(build.revision);
  latestRevision.current = build.revision;
  const selectedSavedBuild = savedBuilds.find(item => item.id === buildId);
  const sourceKey = analysisIdentity([identity, requestedBuildId, hasRequestedBuild ? selectedSavedBuild : null, resolveSelectedComponents()]);
  const sourceError = catalogLoading ? 'Aguarde a atualização do catálogo de componentes.'
    : catalogError ? 'Não foi possível atualizar o catálogo de componentes. Tente novamente.'
      : !hasRequestedBuild ? '' : savedBuildsLoading
    ? 'Aguarde o carregamento da build salva selecionada.'
    : savedBuildsError ? 'Não foi possível carregar a build salva selecionada. Tente novamente.'
      : !selectedSavedBuild ? 'A build salva selecionada não está disponível. Escolha outra origem ou tente carregar novamente.' : '';
  const suggestionKey = JSON.stringify([sourceKey, budget, usageType, priority]);
  const roadmapKey = JSON.stringify([sourceKey, roadmapBudget, maxSteps, usageType, priority]);
  const sourceReady = !sourceError && !catalogLoading && !catalogError;
  const sourceInvalid = Boolean(catalogError) || hasRequestedBuild && !savedBuildsLoading && Boolean(sourceError);
  const request = useSessionSimulationRequest('upgrade-suggestions', suggestionKey, validSuggestionSnapshot, { ready: sourceReady, invalid: sourceInvalid });
  const roadmapRequest = useSessionSimulationRequest('upgrade-roadmap', roadmapKey, validRoadmapSnapshot, { ready: sourceReady, invalid: sourceInvalid });
  const result = request.result?.data;
  const resultComponents = request.result?.components || {};
  const roadmapResult = roadmapRequest.result?.data;
  const roadmapComponents = roadmapRequest.result?.components || {};
  const suggestionError = (suggestionValidation?.key === suggestionKey && suggestionValidation.message) || request.error?.message;
  const roadmapError = (roadmapValidation?.key === roadmapKey && roadmapValidation.message) || roadmapRequest.error?.message;
  const roadmapLoading = roadmapRequest.status === 'loading';
  const restoredSourceChecked = useRef(false);

  useEffect(() => {
    if (restoredSourceChecked.current || catalogLoading || (hasRequestedBuild && savedBuildsLoading)) return;
    restoredSourceChecked.current = true;
    // Settings saved for a previous version of a saved build must not silently
    // become the settings of an edited source after returning to this page.
    if (initialInputs.sourceIdentity && requestedBuildId === initialInputs.buildId
      && (!sourceReady || initialInputs.sourceIdentity !== sourceKey)) {
      setSelectedUsageProfileId('');
      setBudget(1500);
      setUsageType(build.usageType);
      setPriority('cost-benefit');
      setRoadmapBudget(2500);
      setMaxSteps(3);
    }
  }, [catalogLoading, hasRequestedBuild, savedBuildsLoading, initialInputs, requestedBuildId, sourceReady, sourceKey, build.usageType]);

  useEffect(() => {
    if (hasUrlSource) return;
    const next = new URLSearchParams(searchParams);
    if (requestedBuildId !== null) next.set('buildId', requestedBuildId);
    else next.set('source', 'current');
    setSearchParams(next, { replace: true });
  }, [hasUrlSource, requestedBuildId, searchParams, setSearchParams]);

  useEffect(() => {
    const pendingSource = catalogLoading || (hasRequestedBuild && savedBuildsLoading);
    const sourceIdentity = sourceReady ? sourceKey
      : pendingSource && requestedBuildId === initialInputs.buildId ? initialInputs.sourceIdentity : null;
    writeAnalysisSession('upgrade-inputs', identity,
      { buildId: requestedBuildId, sourceIdentity, selectedUsageProfileId, budget, usageType, priority, roadmapBudget, maxSteps }, validUpgradeInputs);
  }, [identity, initialInputs, requestedBuildId, sourceKey, sourceReady, catalogLoading, hasRequestedBuild, savedBuildsLoading, selectedUsageProfileId, budget, usageType, priority, roadmapBudget, maxSteps]);

  useEffect(() => {
    let active = true;
    setSavedBuildsLoading(true);
    setSavedBuildsError('');
    savedBuildsService.list()
      .then((data) => {
        if (!Array.isArray(data)) throw new Error('Resposta de builds salvas inválida.');
        if (active) setSavedBuilds(data);
      })
      .catch((error) => { if (active) { setSavedBuilds([]); setSavedBuildsError(error.message); } })
      .finally(() => { if (active) setSavedBuildsLoading(false); });
    return () => { active = false; };
  }, [savedBuildsAttempt]);

  useEffect(() => {
    let active = true;
    usageProfilesService.list()
      .then((data) => {
        if (!active) return;
        const profiles = Array.isArray(data) ? data : [];
        setUsageProfiles(profiles);
        const pendingProfileId = consumeSelectedUsageProfile();
        if (pendingProfileId) {
          applyUsageProfile(pendingProfileId, profiles);
        }
      })
      .catch(() => { if (active) setUsageProfiles([]); });
    return () => { active = false; };
  }, []);

  function selectBuild(id) {
    const next = new URLSearchParams(searchParams);
    if (id) { next.set('buildId', id); next.delete('source'); }
    else { next.delete('buildId'); next.set('source', 'current'); }
    setSearchParams(next);
  }

  function reloadSavedBuilds() {
    setSavedBuildsLoading(true);
    setSavedBuildsAttempt(attempt => attempt + 1);
  }

  function applyUsageProfile(profileId, profiles = usageProfiles) {
    setSelectedUsageProfileId(profileId);
    if (!profileId) {
      return;
    }

    const profile = profiles.find((item) => item.id === profileId);
    if (!profile) {
      return;
    }

    const settings = inferUsageSettingsFromProfile(profile);
    setUsageType(settings.usageType);
    setPriority(settings.priority);
    setFeedbackMessage(`Perfil "${profile.name}" aplicado ao plano de upgrades.`);
  }

  async function suggest() {
    setSuggestionValidation(null);
    if (sourceError) {
      setSuggestionValidation({ key: suggestionKey, message: sourceError });
      return;
    }
    const budgetError = validateBudgetAmount(budget);
    if (budgetError) {
      setSuggestionValidation({ key: suggestionKey, message: budgetError });
      return;
    }

    const payload = {
      budget: normalizeBudgetPayload({ amount: budget, currency: 'BRL', priority }),
      usageType,
      priority
    };

    if (hasRequestedBuild) {
      payload.buildId = buildId;
    } else if (hasCompleteBuild(build.selectedComponents)) {
      payload.build = buildToApiPayload(build.selectedComponents);
    } else {
      setSuggestionValidation({ key: suggestionKey, message: 'Escolha uma build salva ou monte uma build completa antes de sugerir upgrades.' });
      return;
    }

    const sourceComponents = resolveSelectedComponents();
    await request.run(async () => ({ data: await upgradeService.suggest(payload), components: sourceComponents }));
  }

  function resolveSelectedComponents() {
    if (!hasRequestedBuild) return build.selectedComponents;
    return hydrateBuildComponents(selectedSavedBuild?.components, componentMap, { preferCatalog: true });
  }

  function resolveBuildPayload() {
    if (hasRequestedBuild) {
      return selectedSavedBuild ? buildToApiPayload(selectedSavedBuild.components) : null;
    }

    if (hasCompleteBuild(build.selectedComponents)) {
      return buildToApiPayload(build.selectedComponents);
    }

    return null;
  }

  async function generateRoadmap() {
    setRoadmapValidation(null);
    if (sourceError) {
      setRoadmapValidation({ key: roadmapKey, message: sourceError });
      return;
    }
    const budgetError = validateBudgetAmount(roadmapBudget);
    if (budgetError) {
      setRoadmapValidation({ key: roadmapKey, message: budgetError });
      return;
    }

    if (maxStepsError) return;
    const normalizedMaxSteps = Number(maxSteps);

    const selectedBuild = resolveBuildPayload();
    if (!selectedBuild) {
      setRoadmapValidation({ key: roadmapKey, message: 'Escolha uma build salva ou monte uma build completa antes de gerar o plano.' });
      return;
    }

    const sourceComponents = resolveSelectedComponents();
    await roadmapRequest.run(async () => ({
      data: await upgradeRoadmapService.generate({
        build: selectedBuild,
        totalBudget: Number(roadmapBudget),
        maxSteps: normalizedMaxSteps,
        usageType,
        priority
      }), components: sourceComponents
    }));
  }

  function previewSuggestion(suggestion) {
    if (!canPreviewSuggestion(suggestion, build.selectedComponents)) return;
    setReplacement({ type: suggestion.componentType, component: suggestion.suggestedComponent, revision: build.revision });
  }

  return (
    <div className="page-stack">
      <section className="page-hero compact-hero">
        <span className="eyebrow">Upgrade lab</span>
        <h1>Sugestões de upgrade</h1>
        <p>Use gargalos, orçamento, compatibilidade e perfil de uso para encontrar o próximo passo da build.</p>
      </section>

      {suggestionError && <ErrorState message={suggestionError} />}
      {feedbackMessage && <Alert type="success">{feedbackMessage}</Alert>}

      <Card>
        <h2>Origem da build</h2>
        {catalogLoading && <LoadingSpinner label="Atualizando o catálogo de componentes..." />}
        {catalogError && <ErrorState message="Não foi possível atualizar o catálogo de componentes. Tente novamente." onRetry={reloadCatalog} />}
        {hasRequestedBuild && savedBuildsLoading && <LoadingSpinner label="Carregando a build salva selecionada..." />}
        {savedBuildsError && <ErrorState message={`Não foi possível carregar as builds salvas. ${savedBuildsError}`} onRetry={reloadSavedBuilds} />}
        {hasRequestedBuild && !savedBuildsLoading && !savedBuildsError && !selectedSavedBuild && <ErrorState message={sourceError} onRetry={reloadSavedBuilds} />}
        {sourceError && hasCompleteBuild(build.selectedComponents) && <Button variant="secondary" onClick={() => selectBuild('')}>Usar build atual</Button>}
        <div className="form-grid field-row-grid upgrade-source-grid">
          <Select
            label="Build salva"
            revealSelectedValue
            value={buildId}
            onChange={(event) => selectBuild(event.target.value)}
            options={[
              { value: '', label: hasCompleteBuild(build.selectedComponents) ? 'Usar build atual' : 'Selecione uma build salva' },
              ...(hasRequestedBuild && buildId && !selectedSavedBuild ? [{ value: buildId, label: savedBuildsLoading ? 'Carregando build selecionada...' : 'Build selecionada indisponível' }] : []),
              ...savedBuilds.map((savedBuild) => ({ value: savedBuild.id, label: savedBuild.name }))
            ]}
          />

          <Select
            label="Perfil personalizado"
            revealSelectedValue
            value={selectedUsageProfileId}
            onChange={(event) => applyUsageProfile(event.target.value)}
            options={[
              { value: '', label: 'Nenhum' },
              ...usageProfiles.map((profile) => ({ value: profile.id, label: profile.name }))
            ]}
          />

        </div>

      </Card>

      <TaskTabs id="upgrade-tasks" label="Tipo de upgrade" value={task} onChange={setTask}
        tabs={[{ id: 'single', label: 'Uma troca' }, { id: 'plan', label: 'Plano em etapas' }]} />
      <TaskPanel id="upgrade-tasks" value="single" active={task === 'single'}>
      <Card>
        <h2>Próxima troca</h2>
        <div className="form-grid field-row-grid">
          <Input label="Orçamento para upgrade" type="number" min="1" value={budget} onChange={(event) => setBudget(event.target.value)} error={validateBudgetAmount(budget)} />
          <Select label="Tipo de uso" value={usageType} onChange={(event) => setUsageType(event.target.value)} options={usageTypes.map((usage) => ({ value: usage, label: usageLabels[usage] }))} />
          <Select label="Prioridade" value={priority} onChange={(event) => setPriority(event.target.value)} options={['cost-benefit', 'performance', 'balanced', 'lowest-price', 'upgrade-ready'].map((value) => ({ value, label: value === 'lowest-price' ? 'Menor preço' : value === 'upgrade-ready' ? 'Próximos upgrades' : priorityLabels[value] }))} />
        </div>
        <Button disabled={Boolean(sourceError)} loading={request.status === 'loading'} onClick={suggest}><Zap size={18} /> Gerar sugestões</Button>
      </Card>

      {result && (
        <>
          <Alert type={result.suggestions?.length ? 'success' : 'warning'} title="Resultado de upgrade">
            {translateUpgradeText(result.summary)}
          </Alert>
          <Alert type="info">A prévia troca uma peça na build atual e mantém as outras escolhas. Sugestões de builds salvas serão verificadas novamente com a montagem atual; a build salva não será editada.</Alert>
          <div className="cards-grid">
            {(result.suggestions || []).map((suggestion) => (
              <Card key={`${suggestion.componentType}-${suggestion.suggestedComponent?.id}`} className="upgrade-card" as="article">
                <div className="section-heading compact">
                  <h2>{componentLabels[suggestion.componentType] || suggestion.componentType}</h2>
                  <strong>{translateValue(suggestion.expectedImpact)}</strong>
                </div>
                <p className="upgrade-card__description">{translateUpgradeText(suggestion.reason)}</p>
                {hasSimulatedPerformance(suggestion, suggestion.currentComponent, suggestion.suggestedComponent, result) && <p className="hint-text">Impacto com pontuações simuladas</p>}
                <div className="upgrade-pair">
                  <div className="upgrade-pair__item">
                    <span className="upgrade-pair__label">Atual</span>
                    <ComponentIdentity component={suggestion.currentComponent} category={suggestion.componentType} />
                  </div>
                  <div className="upgrade-pair__item">
                    <span className="upgrade-pair__label">Sugerido</span>
                    <ComponentIdentity component={suggestion.suggestedComponent} category={suggestion.componentType} />
                  </div>
                </div>
                <div className="upgrade-card__meta">
                  <span>Custo estimado: <strong>{formatCurrency(suggestion.estimatedUpgradeCost)}</strong></span>
                  <small>Compatibilidade: {compatibilityDisplayLabel(suggestion.compatibilityStatus, suggestion)}</small>
                  <CoolingAssessmentNotice result={suggestion} />
                </div>
                <div className="button-row">
                  {canPreviewSuggestion(suggestion, build.selectedComponents) ? <Button onClick={() => previewSuggestion(suggestion)}>Pré-visualizar esta peça na build atual</Button>
                    : <p className="hint-text">{previewUnavailableMessage(suggestion, build.selectedComponents)}</p>}
                  <Button
                    variant="ghost"
                    onClick={() => navigate('/feedback/new', {
                      state: createUpgradeFeedbackState({
                        suggestion,
                        selectedComponents: resultComponents,
                        title: `Upgrade de ${componentLabels[suggestion.componentType] || translateValue(suggestion.componentType)}`,
                        source: 'upgrade'
                      })
                    })}
                  >
                    Avaliar recomendação
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      </TaskPanel>
      <TaskPanel id="upgrade-tasks" value="plan" active={task === 'plan'}>
      <Card>
        <div className="section-heading compact">
          <div>
            <span className="eyebrow">Plano em etapas</span>
            <h2><Route size={22} aria-hidden="true" /> Plano de upgrades em etapas</h2>
            <p>Planeje trocas entre as opções do catálogo, conforme o orçamento de referência, tipo de uso e prioridade. Revise as verificações de compatibilidade.</p>
          </div>
          <Badge tone="cyan">Roadmap</Badge>
        </div>

        {roadmapError && <Alert type="error">{roadmapError}</Alert>}

        <div className="form-grid field-row-grid">
          <Input
            label="Orçamento total"
            type="number"
            min="1"
            value={roadmapBudget}
            onChange={(event) => setRoadmapBudget(event.target.value)}
            error={validateBudgetAmount(roadmapBudget)}
          />
          <Input
            label="Número máximo de etapas"
            type="number"
            min="1"
            max="5"
            value={maxSteps}
            error={maxStepsError}
            onChange={(event) => setMaxSteps(event.target.value)}
          />
          <Select
            label="Tipo de uso"
            value={usageType}
            onChange={(event) => setUsageType(event.target.value)}
            options={usageTypes.map((usage) => ({ value: usage, label: usageLabels[usage] }))}
          />
          <Select
            label="Prioridade"
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
            options={['cost-benefit', 'performance', 'balanced', 'lowest-price', 'upgrade-ready'].map((value) => ({
              value,
              label: value === 'lowest-price' ? 'Menor preço' : value === 'upgrade-ready' ? 'Próximos upgrades' : priorityLabels[value]
            }))}
          />
        </div>

        <div className="button-row">
          <Button disabled={roadmapLoading || Boolean(sourceError)} loading={roadmapLoading} onClick={generateRoadmap}>
            <Route size={18} /> Gerar plano de upgrades
          </Button>
        </div>
      </Card>

      {roadmapResult && (
        <UpgradeRoadmap
          result={roadmapResult}
          currentSelection={build.selectedComponents}
          onPreview={previewSuggestion}
          onFeedback={(step) => navigate('/feedback/new', {
            state: createUpgradeFeedbackState({
              suggestion: step,
              selectedComponents: componentsBeforeRoadmapStep(roadmapComponents, roadmapResult.steps, step),
              title: `Etapa ${step.step || step.orderRecommended || ''} do roadmap`.trim(),
              source: 'upgrade'
            })
          })}
        />
      )}
      </TaskPanel>
      <DecisionMethodology />
      {replacement && replacement.revision === build.revision && <ComponentReplacement
        key={`${replacement.revision}:${replacement.type}:${replacement.component.id}`}
        type={replacement.type} build={build} initialComponent={replacement.component}
        onClose={() => setReplacement(null)}
        onApply={(type, component, summary) => {
          if (latestRevision.current !== replacement.revision) return;
          build.actions.replaceComponent(type, component, summary, replacement.revision);
          setReplacement(null);
          navigate('/summary');
        }}
      />}
    </div>
  );
}

function UpgradeRoadmap({ result, currentSelection, onPreview, onFeedback }) {
  const steps = Array.isArray(result.steps) ? result.steps : [];

  return (
    <Card className="upgrade-roadmap-card">
      <div className="section-heading compact">
        <div>
          <h2>Roadmap de upgrades</h2>
          <p>{translateUpgradeText(result.summary || 'Plano de upgrades gerado para a configuração atual.')}</p>
        </div>
        <Badge tone={steps.length ? 'green' : 'yellow'}>{steps.length} etapa(s)</Badge>
      </div>

      <div className="metric-grid">
        <div>
          <span>Orçamento total</span>
          <strong>{formatCurrency(result.totalBudget)}</strong>
        </div>
        <div>
          <span>Custo estimado</span>
          <strong>{formatCurrency(result.totalEstimatedCost)}</strong>
        </div>
        <div>
          <span>Saldo estimado</span>
          <strong>{formatCurrency(result.remainingBudget)}</strong>
        </div>
      </div>
      <CoolingAssessmentNotice result={result.initialCompatibility} />
      {steps.length > 0 && <p>A prévia aplica somente a peça escolhida à build atual. Etapas anteriores não são aplicadas automaticamente; dependências e compatibilidade serão verificadas novamente.</p>}

      {steps.length === 0 ? (
        <Alert type="warning">
          Não foi encontrado um plano de upgrade dentro do orçamento informado.
        </Alert>
      ) : (
        <div className="upgrade-roadmap-timeline">
          {steps.map((step) => (
            <article key={`${step.step}-${step.componentType}-${step.suggestedComponent?.id}`} className="upgrade-roadmap-step">
              <div className="roadmap-step-marker">
                <span>{step.step || step.orderRecommended}</span>
              </div>
              <div className="roadmap-step-content">
                <div className="section-heading compact">
                  <div>
                    <span className="eyebrow">{componentLabels[step.componentType] || translateValue(step.componentType)}</span>
                    <h3>Trocar {componentLabels[step.componentType] || translateValue(step.componentType)}</h3>
                  </div>
                  <div className="button-row">
                    <Badge tone={getImpactTone(step.expectedImpact)}>Impacto esperado: {translateValue(step.expectedImpact)}</Badge>
                    <Badge tone={getImpactTone(step.priority)}>Prioridade: {translateValue(step.priority)}</Badge>
                  </div>
                </div>

                <p>{translateUpgradeText(step.reason)}</p>
                {hasSimulatedPerformance(step, step.currentComponent, step.suggestedComponent, result) && <p className="hint-text">Impacto com pontuações simuladas</p>}

                <div className="upgrade-pair">
                  <div className="upgrade-pair__item">
                    <span className="upgrade-pair__label">Atual</span>
                    <ComponentIdentity component={step.currentComponent} category={step.componentType} />
                  </div>
                  <div className="upgrade-pair__item">
                    <span className="upgrade-pair__label">Sugerido</span>
                    <ComponentIdentity component={step.suggestedComponent} category={step.componentType} />
                  </div>
                </div>

                <div className="roadmap-step-meta">
                  <span>Custo estimado da etapa: <strong>{formatCurrency(step.estimatedCost)}</strong></span>
                  <span>Custo estimado acumulado: <strong>{formatCurrency(step.cumulativeCost)}</strong></span>
                  <span>Compatibilidade após troca: <strong>{formatCompatibility(step.compatibilityAfterStep)}</strong></span>
                  <CoolingAssessmentNotice result={step.compatibilityAfterStep} />
                </div>

                {step.dependencyWarning && (
                  <Alert type="warning">{translateUpgradeText(step.dependencyWarning)}</Alert>
                )}
                <div className="button-row">
                  {canPreviewSuggestion(step, currentSelection) ? <Button onClick={() => onPreview(step)}>Pré-visualizar esta peça na build atual</Button>
                    : <p className="hint-text">{previewUnavailableMessage(step, currentSelection)}</p>}
                  <Button variant="ghost" onClick={() => onFeedback(step)}>
                    Avaliar recomendação
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </Card>
  );
}

function canPreviewSuggestion(suggestion, currentSelection = {}) {
  const current = currentSelection[suggestion.componentType];
  const currentId = typeof current === 'string' ? current : current?.id;
  return [...componentTypes, 'cooler'].includes(suggestion.componentType)
    && Boolean(suggestion.suggestedComponent?.id) && suggestion.suggestedComponent.id !== currentId;
}

function previewUnavailableMessage(suggestion, currentSelection = {}) {
  if (['fan', 'fans'].includes(suggestion.componentType)) return 'Ajuste packs e quantidades de ventoinhas na seção Refrigeração do assistente.';
  const current = currentSelection[suggestion.componentType];
  if (suggestion.suggestedComponent?.id === (typeof current === 'string' ? current : current?.id)) return 'Esta peça já está selecionada na build atual.';
  return 'Faltam dados da peça para pré-visualizar esta sugestão.';
}

function translateUpgradeText(text = '') {
  return String(text)
    .replace(/R\$\s*(-?\d+(?:\.\d+)?)(?![\d,]|\.\d)/g, (_match, amount) => formatCurrency(Number(amount)))
    .replace(/\bcpu\b/gi, 'processador')
    .replace(/\bgpu\b/gi, 'placa de vídeo')
    .replace(/\bram\b/gi, 'memória RAM')
    .replace(/\bstorage\b/gi, 'armazenamento')
    .replace(/\bpsu\b/gi, 'fonte de alimentação')
    .replace(/\bgaming\b/gi, 'jogos')
    .replace(/\blow\b/gi, 'baixo')
    .replace(/\bmedium\b/gi, 'médio')
    .replace(/\bhigh\b/gi, 'alto')
    .replace(/\b(catalogo|simulacao|referencia|configuracao|orcamento|nao|Nao|compativeis|restricoes|posicoes|proximo|tecnicos|basico)\b/g, word => ({ catalogo: 'catálogo', simulacao: 'simulação', referencia: 'referência', configuracao: 'configuração', orcamento: 'orçamento', nao: 'não', Nao: 'Não', compativeis: 'compatíveis', restricoes: 'restrições', posicoes: 'posições', proximo: 'próximo', tecnicos: 'técnicos', basico: 'básico' })[word])
    .replace('upgrade sugerido e trocar', 'upgrade sugerido é trocar');
}

function validUpgradeInputs(value) {
  const amount = number => (typeof number === 'number' && Number.isFinite(number))
    || (typeof number === 'string' && number.length <= 30 && (number === '' || Number.isFinite(Number(number))));
  return isRecord(value) && (value.buildId === null || isSessionId(value.buildId))
    && (value.sourceIdentity === null || typeof value.sourceIdentity === 'string')
    && isSessionId(value.selectedUsageProfileId) && amount(value.budget) && amount(value.roadmapBudget) && amount(value.maxSteps)
    && [...usageTypes, 'cost-benefit', 'high-performance'].includes(value.usageType)
    && ['cost-benefit', 'performance', 'balanced', 'lowest-price', 'upgrade-ready'].includes(value.priority);
}

function validSuggestionSnapshot(value) {
  return isRecord(value) && validSnapshotComponents(value.components) && isRecord(value.data)
    && typeof value.data.summary === 'string' && Array.isArray(value.data.suggestions)
    && value.data.suggestions.length <= 50 && value.data.suggestions.every(validUpgradeStep);
}

function validRoadmapSnapshot(value) {
  return isRecord(value) && validSnapshotComponents(value.components) && isRecord(value.data)
    && typeof value.data.summary === 'string' && Array.isArray(value.data.steps)
    && value.data.steps.length <= 5 && value.data.steps.every(validUpgradeStep);
}

function validUpgradeStep(value) {
  return isRecord(value) && isSessionId(value.componentType) && validSnapshotComponent(value.suggestedComponent)
    && (value.currentComponent == null || validSnapshotComponent(value.currentComponent))
    && isOptionalText(value.reason) && isOptionalNumber(value.step) && isOptionalNumber(value.orderRecommended);
}

function validSnapshotComponent(value) {
  return isRecord(value) && isSessionId(value.id) && isOptionalText(value.name) && isOptionalNumber(value.quantity);
}

function validSnapshotComponents(value) {
  return isRecord(value) && [...componentTypes, 'cooler'].every(type => value[type] === undefined || validSnapshotComponent(value[type]))
    && (value.fans === undefined || Array.isArray(value.fans) && value.fans.every(validSnapshotComponent));
}

function createUpgradeFeedbackState({ suggestion, selectedComponents, title, source }) {
  const nextComponents = createSuggestedBuildComponents(selectedComponents, suggestion);
  const hasSuggestedBuild = hasCompleteBuild(nextComponents);
  const priceComponents = [...componentTypes, 'cooler'].map((type) => nextComponents[type]).filter(Boolean)
    .concat(nextComponents.fans || []);
  const hasCompletePrice = priceComponents.every((component) => Number.isFinite(Number(component.price ?? component.estimatedPrice)));

  return {
    mode: 'contextual',
    recommendationType: 'upgrade-suggestion',
    recommendationId: suggestion.suggestedComponent?.id || suggestion.componentType || `${suggestion.step || suggestion.orderRecommended || 'upgrade'}`,
    recommendationTitle: title,
    summary: translateUpgradeText(suggestion.reason),
    coolingAssessment: getCoolingAssessment(suggestion) || getCoolingAssessment(suggestion.compatibilityAfterStep),
    currentComponent: suggestion.currentComponent,
    suggestedComponent: suggestion.suggestedComponent,
    totalEstimatedPrice: hasSuggestedBuild && hasCompletePrice ? calculateBuildPrice(nextComponents) : undefined,
    source,
    ...(hasSuggestedBuild && {
      build: nextComponents,
      buildSnapshot: buildToApiPayload(nextComponents),
      buildDetails: buildDetailsFromSelectedComponents(nextComponents)
    })
  };
}

function createSuggestedBuildComponents(selectedComponents = {}, suggestion = {}) {
  const componentType = suggestion.componentType;

  if (!componentType || !suggestion.suggestedComponent) {
    return selectedComponents;
  }

  if (componentType === 'fan' || componentType === 'fans') {
    const fans = selectedComponents.fans || [];
    const currentId = suggestion.currentComponent?.id || suggestion.currentComponent?.fanId;
    const current = fans.find((fan) => (fan.id || fan.fanId) === currentId);
    const replacement = { ...suggestion.suggestedComponent, quantity: suggestion.suggestedComponent.quantity ?? current?.quantity ?? 1 };
    return {
      ...selectedComponents,
      fans: current
        ? fans.map((fan) => fan === current ? replacement : fan)
        : [...fans, replacement]
    };
  }

  return {
    ...selectedComponents,
    [componentType]: suggestion.suggestedComponent
  };
}

function buildDetailsFromSelectedComponents(selectedComponents = {}) {
  const details = Object.fromEntries([...componentTypes, 'cooler']
    .filter((type) => selectedComponents[type])
    .map((type) => [type, feedbackComponentDetails(selectedComponents[type])]));
  if (selectedComponents.fans?.length) {
    details.fans = selectedComponents.fans.map((fan) => ({ ...feedbackComponentDetails(fan), quantity: fan.quantity ?? 1 }));
  }
  return details;
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

function componentsBeforeRoadmapStep(components, steps = [], targetStep) {
  let current = components;
  for (const step of steps) {
    if (step === targetStep) break;
    current = createSuggestedBuildComponents(current, step);
  }
  return current;
}

function getImpactTone(value) {
  if (value === 'high') return 'green';
  if (value === 'medium') return 'yellow';
  if (value === 'low') return 'cyan';
  return 'cyan';
}

function formatCompatibility(compatibility) {
  if (!compatibility || compatibility.available === false) {
    return 'Não disponível';
  }

  if (compatibility.status === 'incompatible' || compatibility.compatibilityStatus === 'incompatible') return 'Incompatível';
  if (compatibility.status === 'unverified' || compatibility.compatibilityStatus === 'unverified' || compatibility.unverifiedChecks?.length) return 'Não verificada';
  return compatibility.compatible === true ? compatibilityDisplayLabel('compatible', compatibility) : compatibility.compatible === false ? 'Incompatível' : 'Não verificada';
}
