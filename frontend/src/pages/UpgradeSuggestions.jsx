import DecisionMethodology from '../components/build/DecisionMethodology.jsx';
import ComponentIdentity from '../components/componentsCatalog/ComponentIdentity.jsx';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Route, Zap } from 'lucide-react';
import ComponentReplacement from '../components/build/ComponentReplacement.jsx';
import Alert from '../components/ui/Alert.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import Input from '../components/ui/Input.jsx';
import Select from '../components/ui/Select.jsx';
import { useSimulationRequest } from '../hooks/useSimulationRequest.js';
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
import { validateBudgetAmount } from '../utils/validation.js';

export default function UpgradeSuggestions() {
  const navigate = useNavigate();
  const build = useBuildState();
  const { components: catalogComponents } = useComponents();
  const [savedBuilds, setSavedBuilds] = useState([]);
  const [usageProfiles, setUsageProfiles] = useState([]);
  const [selectedUsageProfileId, setSelectedUsageProfileId] = useState('');
  const [buildId, setBuildId] = useState('');
  const [budget, setBudget] = useState(1500);
  const [usageType, setUsageType] = useState(build.usageType);
  const [priority, setPriority] = useState('cost-benefit');
  const [roadmapBudget, setRoadmapBudget] = useState(2500);
  const [maxSteps, setMaxSteps] = useState(3);
  const [suggestionValidation, setSuggestionValidation] = useState(null);
  const [roadmapValidation, setRoadmapValidation] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [replacement, setReplacement] = useState(null);
  const latestRevision = useRef(build.revision);
  latestRevision.current = build.revision;
  const sourceKey = JSON.stringify([build.revision, buildId, buildId ? savedBuilds.find(item => item.id === buildId)?.components : build.buildPayload]);
  const suggestionKey = JSON.stringify([sourceKey, budget, usageType, priority]);
  const roadmapKey = JSON.stringify([sourceKey, roadmapBudget, maxSteps, usageType, priority]);
  const request = useSimulationRequest(suggestionKey);
  const roadmapRequest = useSimulationRequest(roadmapKey);
  const result = request.result?.data;
  const resultComponents = request.result?.components || {};
  const roadmapResult = roadmapRequest.result?.data;
  const roadmapComponents = roadmapRequest.result?.components || {};
  const suggestionError = (suggestionValidation?.key === suggestionKey && suggestionValidation.message) || request.error?.message;
  const roadmapError = (roadmapValidation?.key === roadmapKey && roadmapValidation.message) || roadmapRequest.error?.message;
  const roadmapLoading = roadmapRequest.status === 'loading';

  useEffect(() => {
    let active = true;
    savedBuildsService.list()
      .then((data) => { if (active) setSavedBuilds(Array.isArray(data) ? data : []); })
      .catch(() => { if (active) setSavedBuilds([]); });

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

    if (buildId) {
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
    if (!buildId) return build.selectedComponents;
    const savedBuild = savedBuilds.find((item) => item.id === buildId);
    const componentMap = Object.fromEntries(catalogComponents.map((component) => [component.id, component]));
    return hydrateBuildComponents(savedBuild?.components, componentMap);
  }

  function resolveBuildPayload() {
    if (buildId) {
      const savedBuild = savedBuilds.find((item) => item.id === buildId);
      return savedBuild ? buildToApiPayload(savedBuild.components) : null;
    }

    if (hasCompleteBuild(build.selectedComponents)) {
      return buildToApiPayload(build.selectedComponents);
    }

    return null;
  }

  async function generateRoadmap() {
    setRoadmapValidation(null);
    const budgetError = validateBudgetAmount(roadmapBudget);
    if (budgetError) {
      setRoadmapValidation({ key: roadmapKey, message: budgetError });
      return;
    }

    const normalizedMaxSteps = Number(maxSteps);
    if (!Number.isFinite(normalizedMaxSteps) || normalizedMaxSteps <= 0) {
      setRoadmapValidation({ key: roadmapKey, message: 'Informe uma quantidade de etapas maior que zero.' });
      return;
    }

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
      <DecisionMethodology />

      {suggestionError && <ErrorState message={suggestionError} />}
      {feedbackMessage && <Alert type="success">{feedbackMessage}</Alert>}

      <Card>
        <h2>Origem da build</h2>
        <div className="form-grid">
          <Select
            label="Build salva"
            value={buildId}
            onChange={(event) => setBuildId(event.target.value)}
            options={[
              { value: '', label: hasCompleteBuild(build.selectedComponents) ? 'Usar build atual' : 'Selecione uma build salva' },
              ...savedBuilds.map((savedBuild) => ({ value: savedBuild.id, label: savedBuild.name }))
            ]}
          />
          <Input label="Orçamento para upgrade" type="number" min="1" value={budget} onChange={(event) => setBudget(event.target.value)} error={validateBudgetAmount(budget)} />
          <Select
            label="Perfil personalizado"
            value={selectedUsageProfileId}
            onChange={(event) => applyUsageProfile(event.target.value)}
            options={[
              { value: '', label: 'Nenhum perfil personalizado' },
              ...usageProfiles.map((profile) => ({ value: profile.id, label: profile.name }))
            ]}
          />
          <Select label="Tipo de uso" value={usageType} onChange={(event) => setUsageType(event.target.value)} options={usageTypes.map((usage) => ({ value: usage, label: usageLabels[usage] }))} />
          <Select label="Prioridade" value={priority} onChange={(event) => setPriority(event.target.value)} options={['cost-benefit', 'performance', 'lowest-price'].map((value) => ({ value, label: priorityLabels[value] }))} />
        </div>
        <Button loading={request.status === 'loading'} onClick={suggest}><Zap size={18} /> Gerar sugestões</Button>
      </Card>

      {result && (
        <>
          <Alert type={result.suggestions?.length ? 'success' : 'warning'} title="Resultado de upgrade">
            {result.summary}
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
                  <small>Compatibilidade: {translateValue(suggestion.compatibilityStatus)}</small>
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

        <div className="form-grid">
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
              label: priorityLabels[value]
            }))}
          />
        </div>

        <div className="button-row">
          <Button disabled={roadmapLoading} loading={roadmapLoading} onClick={generateRoadmap}>
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
                    <Badge tone={getImpactTone(step.expectedImpact)}>{translateValue(step.expectedImpact)}</Badge>
                    <Badge tone={getImpactTone(step.priority)}>{translateValue(step.priority)}</Badge>
                  </div>
                </div>

                <p>{translateUpgradeText(step.reason)}</p>

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
    .replace(/\bcpu\b/gi, 'processador')
    .replace(/\bgpu\b/gi, 'placa de vídeo')
    .replace(/\bram\b/gi, 'memória RAM')
    .replace(/\bstorage\b/gi, 'armazenamento')
    .replace(/\bpsu\b/gi, 'fonte de alimentação')
    .replace(/\bgaming\b/gi, 'jogos')
    .replace(/\blow\b/gi, 'baixo')
    .replace(/\bmedium\b/gi, 'médio')
    .replace(/\bhigh\b/gi, 'alto');
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
  return compatibility.compatible === true ? 'Compatível' : compatibility.compatible === false ? 'Incompatível' : 'Não verificada';
}
