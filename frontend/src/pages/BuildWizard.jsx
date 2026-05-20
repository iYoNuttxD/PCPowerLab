import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save, Wand2 } from 'lucide-react';
import BottleneckPanel from '../components/build/BottleneckPanel.jsx';
import BudgetPanel from '../components/build/BudgetPanel.jsx';
import BuildSummaryCard from '../components/build/BuildSummaryCard.jsx';
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
import { normalizeSavedBuildPayload } from '../utils/buildHelpers.js';
import { getMissingBuildSlots, validateBudgetAmount } from '../utils/validation.js';

const steps = [...componentTypes, 'budget', 'review'];

export default function BuildWizard() {
  const navigate = useNavigate();
  const { byType, loading, error, reload } = useComponents();
  const build = useBuildState();
  const request = useApiRequest();
  const [stepIndex, setStepIndex] = useState(0);
  const [feedback, setFeedback] = useState('');
  const currentStep = steps[stepIndex];

  const missingSlots = getMissingBuildSlots(build.selectedComponents);
  const canAdvance = componentTypes.includes(currentStep)
    ? Boolean(build.selectedComponents[currentStep])
    : currentStep === 'budget'
      ? !validateBudgetAmount(build.budget.amount)
      : missingSlots.length === 0;

  const stepComponents = useMemo(() => byType[currentStep] || [], [byType, currentStep]);

  async function runAnalysis() {
    if (missingSlots.length > 0) {
      setFeedback(`Complete: ${missingSlots.map((slot) => componentLabels[slot]).join(', ')}.`);
      return;
    }

    await request.run(async () => {
      const [budgetResult, compatibility, alerts, bottlenecks] = await Promise.all([
        budgetService.validate(build.budget),
        compatibilityService.check(build.buildPayload),
        compatibilityService.alerts(build.buildPayload),
        performanceService.analyzeBottlenecks(build.buildPayload)
      ]);

      build.actions.setResult('compatibility', compatibility);
      build.actions.setResult('alerts', alerts);
      build.actions.setResult('bottlenecks', bottlenecks);
      build.actions.setBudget(budgetResult);
      setFeedback('Build analisada com sucesso.');
    });
  }

  async function generateRecommendation() {
    await request.run(async () => {
      const recommendation = await recommendationService.byBudget({
        budget: build.budget,
        usageType: build.usageType
      });

      build.actions.setResult('recommendation', recommendation);
      setFeedback('Recomendação gerada com sucesso.');
    });
  }

  async function saveCurrentBuild() {
    if (missingSlots.length > 0) {
      setFeedback('Complete a build antes de salvar.');
      return;
    }

    await request.run(async () => {
      await savedBuildsService.create(normalizeSavedBuildPayload({
        name: `Build ${new Date().toLocaleDateString('pt-BR')}`,
        selectedComponents: build.selectedComponents,
        budget: build.budget,
        usageType: build.usageType
      }));
      setFeedback('Build salva com sucesso.');
    });
  }

  return (
    <div className="wizard-layout">
      <section className="wizard-main">
        <div className="page-hero compact-hero">
          <span className="eyebrow">Assistente de montagem</span>
          <h1>Monte seu PC passo a passo</h1>
          <p>Escolha cada peça, informe orçamento e execute as análises do backend.</p>
        </div>

        <div className="stepper" aria-label="Etapas do assistente">
          {steps.map((step, index) => (
            <button
              key={step}
              className={index === stepIndex ? 'active' : ''}
              onClick={() => setStepIndex(index)}
            >
              {componentLabels[step] || (step === 'budget' ? 'Orçamento' : 'Revisão')}
            </button>
          ))}
        </div>

        {request.error && <ErrorState message={request.error} />}
        {feedback && <Alert type="success">{feedback}</Alert>}

        {componentTypes.includes(currentStep) && (
          <>
            <h2>{componentLabels[currentStep]}</h2>
            {loading && <LoadingSpinner />}
            {error && <ErrorState message={error} onRetry={reload} />}
            {!loading && !error && stepComponents.length === 0 && <EmptyState title="Nenhuma peça nesta categoria" />}
            <div className="cards-grid">
              {stepComponents.map((component) => (
                <ComponentCard
                  key={component.id}
                  component={component}
                  selected={build.selectedComponents[currentStep]?.id === component.id}
                  onSelect={(selected) => build.actions.selectComponent(currentStep, selected)}
                />
              ))}
            </div>
          </>
        )}

        {currentStep === 'budget' && (
          <Card>
            <h2>Orçamento e tipo de uso</h2>
            <div className="form-grid">
              <Input
                label="Orçamento"
                type="number"
                min="1"
                value={build.budget.amount}
                onChange={(event) => build.actions.setBudget({ amount: event.target.value })}
                error={validateBudgetAmount(build.budget.amount)}
              />
              <Select
                label="Prioridade"
                value={build.budget.priority}
                onChange={(event) => build.actions.setBudget({ priority: event.target.value })}
                options={priorityOptions.map((priority) => ({ value: priority, label: priorityLabels[priority] }))}
              />
              <Select
                label="Tipo de uso"
                value={build.usageType}
                onChange={(event) => build.actions.setUsageType(event.target.value)}
                options={usageTypes.map((usage) => ({ value: usage, label: usageLabels[usage] }))}
              />
            </div>
            <BudgetPanel budget={build.budget} totalPrice={build.totalPrice} />
          </Card>
        )}

        {currentStep === 'review' && (
          <div className="page-stack">
            <Card>
              <h2>Revisão e análises</h2>
              <p>Execute compatibilidade, alertas, gargalos e orçamento antes de gerar o resumo final.</p>
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
                <Link className="btn btn-primary btn-md" to="/summary">Ver resumo final</Link>
              </div>
            </Card>
            <CompatibilityStatus result={build.alerts || build.compatibility} />
            <BottleneckPanel result={build.bottlenecks} />
            <RecommendationCard recommendation={build.recommendation} onApply={build.actions.applyRecommendation} />
          </div>
        )}

        <div className="wizard-controls">
          <Button variant="ghost" disabled={stepIndex === 0} onClick={() => setStepIndex((index) => Math.max(index - 1, 0))}>
            <ArrowLeft size={18} /> Voltar
          </Button>
          {stepIndex < steps.length - 1 ? (
            <Button disabled={!canAdvance} onClick={() => setStepIndex((index) => Math.min(index + 1, steps.length - 1))}>
              Avançar <ArrowRight size={18} />
            </Button>
          ) : (
            <Button onClick={() => navigate('/summary')}>Ir para resumo</Button>
          )}
        </div>
      </section>

      <aside className="wizard-sidebar">
        <BuildSummaryCard
          selectedComponents={build.selectedComponents}
          totalPrice={build.totalPrice}
          onRemove={build.actions.removeComponent}
        />
      </aside>
    </div>
  );
}
