import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Wand2 } from 'lucide-react';
import BottleneckPanel from '../components/build/BottleneckPanel.jsx';
import CoolingPanel from '../components/build/CoolingPanel.jsx';
import BudgetPanel from '../components/build/BudgetPanel.jsx';
import BuildSummaryCard from '../components/build/BuildSummaryCard.jsx';
import ComponentReplacement from '../components/build/ComponentReplacement.jsx';
import WizardNavigation from '../components/build/WizardNavigation.jsx';
import ComponentCard from '../components/componentsCatalog/ComponentCard.jsx';
import CompatibilityStatus from '../components/compatibility/CompatibilityStatus.jsx';
import RecommendationCard from '../components/recommendations/RecommendationCard.jsx';
import Alert from '../components/ui/Alert.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import Input from '../components/ui/Input.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import Select from '../components/ui/Select.jsx';
import { useApiRequest } from '../hooks/useApiRequest.js';
import { useBuildState } from '../hooks/useBuildState.jsx';
import { useComponents } from '../hooks/useComponents.js';
import { budgetService } from '../services/budgetService.js';
import { compatibilityService } from '../services/compatibilityService.js';
import { performanceService } from '../services/performanceService.js';
import { recommendationService } from '../services/recommendationService.js';
import { savedBuildsService } from '../services/savedBuildsService.js';
import { componentLabels, componentTypes, priorityLabels, priorityOptions, usageLabels, usageTypes } from '../utils/componentLabels.js';
import { normalizeBudgetPayload, normalizeRecommendationBudgetPayload, normalizeSavedBuildPayload } from '../utils/buildHelpers.js';
import { getMissingBuildSlots, validateBudgetAmount } from '../utils/validation.js';
import { hasWizardCompatibilityBlockers, wizardDescriptions, wizardLabels, wizardSteps } from '../utils/wizardSteps.js';

export default function BuildWizard() {
  const navigate = useNavigate();
  const { byType, loading, error, reload } = useComponents();
  const build = useBuildState();
  const request = useApiRequest();
  const [feedback, setFeedback] = useState(null);
  const [replacement, setReplacement] = useState(null);
  const currentStep = build.wizardStep;
  const stepIndex = wizardSteps.indexOf(currentStep);
  const layoutRef = useRef(null);
  const controlsRef = useRef(null);
  const headingRef = useRef(null);
  const previousStep = useRef(currentStep);
  const activeRequest = useRef(0);
  const pendingBottlenecks = useRef(false);
  const configurationKey = JSON.stringify([build.revision, build.buildPayload, normalizeBudgetPayload(build.budget), build.usageType]);
  const latestConfiguration = useRef(configurationKey);
  latestConfiguration.current = configurationKey;

  const missingSlots = getMissingBuildSlots(build.selectedComponents);
  const budgetError = validateBudgetAmount(build.budget.amount);
  const isComponentStep = componentTypes.includes(currentStep);
  const canAdvance = isComponentStep
    ? Boolean(build.selectedComponents[currentStep])
    : currentStep === 'budget'
      ? !budgetError
      : missingSlots.length === 0;

  const stepComponents = useMemo(() => byType[currentStep] || [], [byType, currentStep]);
  // The wizard stores a request envelope; /build-summary returns the analysis
  // directly. Both represent a completed analysis of the current configuration.
  const bottlenecksComplete = build.bottlenecks?.status === 'success'
    || (!build.bottlenecks?.status && typeof build.bottlenecks?.hasBottleneck === 'boolean' && build.bottlenecks?.available !== false);
  const completedSteps = wizardSteps.filter((step) => componentTypes.includes(step)
    ? Boolean(build.selectedComponents[step])
    : step === 'budget' ? !budgetError
      : !missingSlots.length && !budgetError && bottlenecksComplete
        && !hasWizardCompatibilityBlockers(build.compatibility, build.alerts));

  const guidance = isComponentStep
    ? canAdvance ? `Peça selecionada. Avance para ${wizardLabels[wizardSteps[stepIndex + 1]]}.`
      : loading ? 'Aguarde o catálogo carregar para escolher uma peça.'
        : error ? 'Não foi possível carregar as peças. Use Tentar novamente abaixo.'
          : !stepComponents.length ? 'Não há peças nesta categoria. Tente atualizar o catálogo abaixo.'
            : `Selecione uma peça de ${componentLabels[currentStep]} para avançar.`
    : currentStep === 'budget'
      ? budgetError || 'Orçamento definido. Avance para revisar as peças e analisar a montagem.'
      : missingSlots.length ? `${missingSlots.length === 1 ? 'Falta 1 peça' : `Faltam ${missingSlots.length} peças`}. Use Ver etapas para completar antes de analisar ou salvar.`
        : budgetError ? 'Defina um orçamento maior que zero na etapa Orçamento antes de analisar.'
          : completedSteps.includes('review') ? 'Análises concluídas. Você pode salvar a build ou abrir o resumo.'
            : 'Use Analisar build para verificar compatibilidade, orçamento e desempenho.';

  useEffect(() => {
    const header = document.querySelector('.topbar');
    function measureOffsets() {
      const top = (header?.getBoundingClientRect().height || 0) + 8;
      layoutRef.current?.style.setProperty('--wizard-top-offset', `${top}px`);
      layoutRef.current?.style.setProperty('--wizard-scroll-offset', `${top + (controlsRef.current?.offsetHeight || 0) + 16}px`);
    }
    const observer = new ResizeObserver(measureOffsets);
    if (header) observer.observe(header);
    if (controlsRef.current) observer.observe(controlsRef.current);
    measureOffsets();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (previousStep.current === currentStep) return;
    previousStep.current = currentStep;
    const frame = focusStepContent();
    return () => cancelAnimationFrame(frame);
  }, [currentStep]);

  function focusStepContent() {
    return requestAnimationFrame(() => {
      // The guidance can wrap differently on the new step. Measure this render
      // before scrolling; ResizeObserver runs after animation-frame callbacks.
      const top = (document.querySelector('.topbar')?.getBoundingClientRect().height || 0) + 8;
      layoutRef.current?.style.setProperty('--wizard-scroll-offset', `${top + (controlsRef.current?.offsetHeight || 0) + 16}px`);
      headingRef.current?.focus({ preventScroll: true });
      headingRef.current?.scrollIntoView({
        block: 'start',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
      });
    });
  }

  useEffect(() => () => {
    activeRequest.current += 1;
    if (pendingBottlenecks.current === latestConfiguration.current) build.actions.setResult('bottlenecks', null);
  }, [build.actions]);

  function clearMessages() {
    setFeedback(null);
    request.setError('');
  }

  function changeStep(step) {
    clearMessages();
    if (step === currentStep) focusStepContent();
    build.actions.setWizardStep(step);
  }

  // Ignore late responses if the configuration changed or the user left the wizard.
  async function runWizardRequest(callback) {
    clearMessages();
    const requestId = ++activeRequest.current;
    const isCurrent = () => activeRequest.current === requestId && latestConfiguration.current === configurationKey;
    await request.run(async () => {
      try { await callback(isCurrent); }
      catch (error) { if (isCurrent()) throw error; }
    });
  }

  async function runAnalysis() {
    clearMessages();
    if (missingSlots.length > 0) {
      request.setError(`Selecione as peças que faltam: ${missingSlots.map((slot) => componentLabels[slot]).join(', ')}. Use Ver etapas para voltar à categoria.`);
      return;
    }

    const budgetError = validateBudgetAmount(build.budget.amount);
    if (budgetError) {
      request.setError(budgetError);
      return;
    }
    await runWizardRequest(async (isCurrent) => {
      const compatibility = await compatibilityService.check(build.buildPayload);
      if (!isCurrent()) return;
      build.actions.setResult('compatibility', compatibility);

      const alerts = await compatibilityService.alerts(build.buildPayload);
      if (!isCurrent()) return;
      build.actions.setResult('alerts', alerts);

      const budgetResult = await budgetService.validate(build.budget);
      if (!isCurrent()) return;

      function finishAnalysis(bottlenecks) {
        pendingBottlenecks.current = false;
        // Commit normalized budget and its matching results together. A rounded
        // API amount must not leave the previous configuration marked as analyzed.
        build.actions.setBudget(budgetResult);
        build.actions.setResult('compatibility', compatibility);
        build.actions.setResult('alerts', alerts);
        build.actions.setResult('bottlenecks', bottlenecks);
      }

      if (hasWizardCompatibilityBlockers(compatibility, alerts)) {
        const unverified = compatibility.status === 'unverified' || alerts?.status === 'unverified';
        finishAnalysis({
          status: 'unavailable',
          reason: unverified ? 'unverified_compatibility' : 'incompatible_build',
          message: unverified ? 'Há dados técnicos insuficientes para confirmar a compatibilidade. Revise as verificações pendentes antes de analisar desempenho.' : 'A análise de gargalos não foi executada porque a configuração possui incompatibilidades técnicas. Corrija os problemas de compatibilidade antes de analisar desempenho.',
          data: null
        });
        setFeedback({ type: 'warning', message: 'A compatibilidade não foi confirmada. Confira os alertas abaixo e use Ver etapas para substituir as peças indicadas antes de analisar o desempenho.' });
        return;
      }

      pendingBottlenecks.current = configurationKey;
      build.actions.setResult('bottlenecks', {
        status: 'loading',
        message: 'Analisando possíveis gargalos...',
        data: null
      });

      try {
        const bottlenecks = await performanceService.analyzeBottlenecks(build.buildPayload);
        if (!isCurrent()) return;

        finishAnalysis({
          status: 'success',
          data: bottlenecks
        });
      } catch (error) {
        if (!isCurrent()) return;
        if (error.status === 400) {
          finishAnalysis({
            status: 'unavailable',
            reason: 'missing_performance_parameters',
            message: buildBottleneckUnavailableMessage(error),
            errors: error.errors || [],
            data: null
          });
          setFeedback({ type: 'warning', message: 'Compatibilidade analisada. Faltam dados de desempenho para avaliar os gargalos; confira os detalhes abaixo.' });
          return;
        }

        finishAnalysis({
          status: 'error',
          reason: error.status === 0 ? 'network_error' : 'unexpected_error',
          message: error.status === 0
            ? 'Falha de comunicação com o servidor. Verifique se o backend está rodando.'
            : 'Não foi possível concluir a análise de gargalos no momento. Tente novamente.',
          errors: error.errors || [],
          data: null
        });
        setFeedback({ type: 'warning', message: 'Compatibilidade analisada. Não foi possível concluir os gargalos. Use Analisar build para tentar novamente.' });
        return;
      }

      setFeedback({ type: 'success', message: 'Build analisada com sucesso. Confira os resultados abaixo.' });
    });
  }

  async function generateRecommendation() {
    clearMessages();
    const budgetError = validateBudgetAmount(build.budget.amount);
    if (budgetError) {
      request.setError(budgetError);
      return;
    }

    await runWizardRequest(async (isCurrent) => {
      const recommendation = await recommendationService.byBudget({
        budget: normalizeRecommendationBudgetPayload(build.budget),
        usageType: build.usageType
      });
      if (!isCurrent()) return;
      build.actions.setResult('recommendation', recommendation);
      setFeedback({ type: 'success', message: 'Recomendação gerada. Confira as peças antes de aplicá-la à sua montagem.' });
    });
  }

  async function saveCurrentBuild() {
    clearMessages();
    if (missingSlots.length > 0) {
      request.setError(`Antes de salvar, selecione: ${missingSlots.map(slot => componentLabels[slot]).join(', ')}.`);
      return;
    }
    await runWizardRequest(async (isCurrent) => {
      await savedBuildsService.create(normalizeSavedBuildPayload({
        name: `Build ${new Date().toLocaleDateString('pt-BR')}`,
        selectedComponents: build.selectedComponents,
        budget: build.budget,
        usageType: build.usageType
      }));
      if (isCurrent()) setFeedback({ type: 'success', message: 'Build salva com sucesso.' });
    });
  }

  return (
    <div className="wizard-layout" ref={layoutRef}>
      <section className="wizard-main">
        <div className="page-hero compact-hero">
          <span className="eyebrow">Assistente de montagem</span>
          <h1>Monte seu PC</h1>
          <p>Escolha cada peça, defina seu orçamento e confira se tudo funciona bem junto.</p>
        </div>

        <WizardNavigation currentStep={currentStep} completedSteps={completedSteps}
          canAdvance={canAdvance} guidance={guidance} onStepChange={changeStep}
          onSummary={() => navigate('/summary')} controlsRef={controlsRef} />

        <section className="wizard-step-content" aria-labelledby="wizard-step-heading" aria-busy={request.loading || (isComponentStep && loading)}>
          <div className="wizard-step-intro">
            <h2 id="wizard-step-heading" ref={headingRef} tabIndex={-1}>{wizardLabels[currentStep]}</h2>
            <p>{wizardDescriptions[currentStep]}</p>
          </div>
          {request.loading && <LoadingSpinner label="Aguarde, processando sua montagem..." />}
          {request.error && <ErrorState message={request.error} />}
          {feedback && <Alert type={feedback.type}>{feedback.message}</Alert>}

        {isComponentStep && (
          <>
            {build.selectedComponents[currentStep] && (
              <p className="wizard-selection"><strong>Peça atual: {build.selectedComponents[currentStep].name || 'Componente selecionado'}</strong>
                <span>Para substituir, selecione outra opção. As demais peças serão mantidas.</span></p>
            )}
            {loading && <LoadingSpinner />}
            {error && <ErrorState message={error} onRetry={reload} />}
            {!loading && !error && stepComponents.length === 0 && <EmptyState title="Nenhuma peça nesta categoria">
              <Button variant="secondary" onClick={reload}>Atualizar catálogo</Button>
            </EmptyState>}
            {!loading && !error && <div className="cards-grid component-grid">
              {stepComponents.map((component) => (
                <ComponentCard
                  key={component.id}
                  component={component}
                  selected={build.selectedComponents[currentStep]?.id === component.id}
                  onSelect={(selected) => { clearMessages(); build.actions.selectComponent(currentStep, selected); }}
                />
              ))}
            </div>}
          </>
        )}

        {(currentStep === 'case' || currentStep === 'review') && <CoolingPanel build={build} byType={byType} loading={loading} error={error} onRetry={reload} onChange={clearMessages} />}

        {currentStep === 'budget' && (
          <Card>
            <h3>Orçamento e tipo de uso</h3>
            <div className="form-grid">
              <Input
                label="Orçamento"
                type="number"
                min="1"
                value={build.budget.amount}
                onChange={(event) => { clearMessages(); build.actions.setBudget({ amount: event.target.value }); }}
                hint="Valor total disponível em reais. Suas peças não serão alteradas ao editar o orçamento."
                error={validateBudgetAmount(build.budget.amount)}
              />
              <Select
                label="Prioridade"
                value={build.budget.priority}
                onChange={(event) => { clearMessages(); build.actions.setBudget({ priority: event.target.value }); }}
                options={priorityOptions.map((priority) => ({ value: priority, label: priorityLabels[priority] }))}
              />
              <Select
                label="Tipo de uso"
                value={build.usageType}
                onChange={(event) => { clearMessages(); build.actions.setUsageType(event.target.value); }}
                options={usageTypes.map((usage) => ({ value: usage, label: usageLabels[usage] }))}
              />
            </div>
            <BudgetPanel budget={build.budget} totalPrice={build.totalPrice} />
          </Card>
        )}

        {currentStep === 'review' && (
          <div className="page-stack">
            <Card>
              <h3>Revisão e análises</h3>
              <p>Execute compatibilidade, alertas, gargalos e orçamento antes de gerar o resumo final.</p>
              {!build.compatibility && <p>Ao alterar peças ou orçamento, execute as análises novamente para conferir a configuração atual.</p>}
              {missingSlots.length > 0 && <Alert type="warning">Faltam peças: {missingSlots.map(slot => componentLabels[slot]).join(', ')}. Volte à categoria para escolher.</Alert>}
              {budgetError && <Alert type="warning">{budgetError} Volte à etapa Orçamento para corrigir.</Alert>}
              <div className="button-row">
                <Button disabled={request.loading} onClick={runAnalysis}>
                  <Wand2 size={18} /> Analisar build
                </Button>
                <Button variant="secondary" disabled={request.loading} onClick={generateRecommendation}>
                  Gerar recomendação
                </Button>
                <Button variant="ghost" disabled={request.loading} onClick={saveCurrentBuild}>
                  <Save size={18} /> Salvar build
                </Button>
              </div>
            </Card>
            <CompatibilityStatus result={build.alerts || build.compatibility} />
            <BottleneckPanel result={build.bottlenecks} />
            <RecommendationCard currentComponents={build.selectedComponents} recommendation={build.recommendation} disabled={request.loading}
              onPreview={(type, component) => setReplacement({ type, component, revision: build.revision, configurationKey })} onApply={(recommendation) => {
              clearMessages();
              build.actions.applyRecommendation(recommendation);
              setFeedback({ type: 'info', message: 'A recomendação inteira foi aplicada. Execute Analisar build para conferir esta configuração.' });
            }} />
          </div>
        )}

        </section>
      </section>

      <aside className="wizard-sidebar">
        <BuildSummaryCard
          selectedComponents={build.selectedComponents}
          totalPrice={build.totalPrice}
          onEdit={type => changeStep(['cooler', 'fans'].includes(type) ? 'case' : type)}
          onRemove={(type) => { clearMessages(); build.actions.removeComponent(type); }}
        />
      </aside>
      {replacement && replacement.revision === build.revision && <ComponentReplacement
        key={`${replacement.revision}:${replacement.type}:${replacement.component.id}`}
        type={replacement.type} build={build} initialComponent={replacement.component}
        onClose={() => setReplacement(null)}
        onApply={(type, component, summary) => {
          if (latestConfiguration.current !== replacement.configurationKey) return;
          build.actions.replaceComponent(type, component, summary, replacement.revision);
          setReplacement(null);
          navigate('/summary');
        }}
      />}
    </div>
  );
}

function buildBottleneckUnavailableMessage(error) {
  const complement = 'Cadastre os parâmetros de desempenho dos componentes na área administrativa para liberar esta análise.';
  const fallback = `Não foi possível analisar gargalos porque alguns componentes ainda não possuem parâmetros de desempenho cadastrados. ${complement}`;

  if (!error?.message) {
    return fallback;
  }

  return error.message.includes('área administrativa')
    ? error.message
    : `${error.message} ${complement}`;
}
