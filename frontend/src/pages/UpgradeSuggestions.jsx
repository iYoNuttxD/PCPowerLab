import { useEffect, useState } from 'react';
import { Route, Zap } from 'lucide-react';
import Alert from '../components/ui/Alert.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import Input from '../components/ui/Input.jsx';
import Select from '../components/ui/Select.jsx';
import { useApiRequest } from '../hooks/useApiRequest.js';
import { useBuildState } from '../hooks/useBuildState.jsx';
import { savedBuildsService } from '../services/savedBuildsService.js';
import { upgradeRoadmapService } from '../services/upgradeRoadmapService.js';
import { upgradeService } from '../services/upgradeService.js';
import { buildToApiPayload, hasCompleteBuild, normalizeBudgetPayload } from '../utils/buildHelpers.js';
import { componentLabels, priorityLabels, usageLabels, usageTypes } from '../utils/componentLabels.js';
import { formatCurrency } from '../utils/formatCurrency.js';
import { translateValue } from '../utils/translations.js';
import { validateBudgetAmount } from '../utils/validation.js';

export default function UpgradeSuggestions() {
  const build = useBuildState();
  const request = useApiRequest();
  const [savedBuilds, setSavedBuilds] = useState([]);
  const [buildId, setBuildId] = useState('');
  const [budget, setBudget] = useState(1500);
  const [usageType, setUsageType] = useState(build.usageType);
  const [priority, setPriority] = useState('cost-benefit');
  const [result, setResult] = useState(null);
  const [roadmapBudget, setRoadmapBudget] = useState(2500);
  const [maxSteps, setMaxSteps] = useState(3);
  const [roadmapResult, setRoadmapResult] = useState(null);
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [roadmapError, setRoadmapError] = useState('');

  useEffect(() => {
    savedBuildsService.list()
      .then((data) => setSavedBuilds(Array.isArray(data) ? data : []))
      .catch(() => setSavedBuilds([]));
  }, []);

  async function suggest() {
    const budgetError = validateBudgetAmount(budget);
    if (budgetError) {
      request.setError(budgetError);
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
      request.setError('Escolha uma build salva ou monte uma build completa antes de sugerir upgrades.');
      return;
    }

    await request.run(async () => {
      const data = await upgradeService.suggest(payload);
      setResult(data);
    });
  }

  function resolveBuildPayload() {
    if (buildId) {
      const savedBuild = savedBuilds.find((item) => item.id === buildId);
      return savedBuild?.components || null;
    }

    if (hasCompleteBuild(build.selectedComponents)) {
      return buildToApiPayload(build.selectedComponents);
    }

    return null;
  }

  async function generateRoadmap() {
    const budgetError = validateBudgetAmount(roadmapBudget);
    if (budgetError) {
      setRoadmapError(budgetError);
      return;
    }

    const normalizedMaxSteps = Number(maxSteps);
    if (!Number.isFinite(normalizedMaxSteps) || normalizedMaxSteps <= 0) {
      setRoadmapError('Informe uma quantidade de etapas maior que zero.');
      return;
    }

    const selectedBuild = resolveBuildPayload();
    if (!selectedBuild) {
      setRoadmapError('Escolha uma build salva ou monte uma build completa antes de gerar o plano.');
      return;
    }

    setRoadmapError('');
    setRoadmapLoading(true);

    try {
      const data = await upgradeRoadmapService.generate({
        build: selectedBuild,
        totalBudget: Number(roadmapBudget),
        maxSteps: normalizedMaxSteps,
        usageType,
        priority
      });
      setRoadmapResult(data);
    } catch (error) {
      setRoadmapError(error.message || 'Não foi possível gerar o plano de upgrades.');
      setRoadmapResult(null);
    } finally {
      setRoadmapLoading(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="page-hero compact-hero">
        <span className="eyebrow">Upgrade lab</span>
        <h1>Sugestões de upgrade</h1>
        <p>Use gargalos, orçamento, compatibilidade e perfil de uso para encontrar o próximo passo da build.</p>
      </section>

      {request.error && <ErrorState message={request.error} />}

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
          <Select label="Tipo de uso" value={usageType} onChange={(event) => setUsageType(event.target.value)} options={usageTypes.map((usage) => ({ value: usage, label: usageLabels[usage] }))} />
          <Select label="Prioridade" value={priority} onChange={(event) => setPriority(event.target.value)} options={['cost-benefit', 'performance', 'lowest-price'].map((value) => ({ value, label: priorityLabels[value] }))} />
        </div>
        <Button disabled={request.loading} onClick={suggest}><Zap size={18} /> Gerar sugestões</Button>
      </Card>

      {result && (
        <>
          <Alert type={result.suggestions?.length ? 'success' : 'warning'} title="Resultado de upgrade">
            {result.summary}
          </Alert>
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
                    <strong className="upgrade-pair__value">{suggestion.currentComponent?.name}</strong>
                  </div>
                  <div className="upgrade-pair__item">
                    <span className="upgrade-pair__label">Sugerido</span>
                    <strong className="upgrade-pair__value">{suggestion.suggestedComponent?.name}</strong>
                  </div>
                </div>
                <div className="upgrade-card__meta">
                  <span>Custo estimado: <strong>{formatCurrency(suggestion.estimatedUpgradeCost)}</strong></span>
                  <small>Compatibilidade: {translateValue(suggestion.compatibilityStatus)}</small>
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
            <p>Monte uma sequência de trocas compatíveis respeitando orçamento total, tipo de uso e prioridade.</p>
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

      {roadmapResult && <UpgradeRoadmap result={roadmapResult} />}
    </div>
  );
}

function UpgradeRoadmap({ result }) {
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
                    <strong className="upgrade-pair__value">{step.currentComponent?.name || 'Não informado'}</strong>
                  </div>
                  <div className="upgrade-pair__item">
                    <span className="upgrade-pair__label">Sugerido</span>
                    <strong className="upgrade-pair__value">{step.suggestedComponent?.name || 'Não informado'}</strong>
                  </div>
                </div>

                <div className="roadmap-step-meta">
                  <span>Custo da etapa: <strong>{formatCurrency(step.estimatedCost)}</strong></span>
                  <span>Custo acumulado: <strong>{formatCurrency(step.cumulativeCost)}</strong></span>
                  <span>Compatibilidade após troca: <strong>{formatCompatibility(step.compatibilityAfterStep)}</strong></span>
                </div>

                {step.dependencyWarning && (
                  <Alert type="warning">{translateUpgradeText(step.dependencyWarning)}</Alert>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </Card>
  );
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

  return compatibility.compatible ? 'Compatível' : 'Incompatível';
}
