import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import Alert from '../components/ui/Alert.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import Input from '../components/ui/Input.jsx';
import Select from '../components/ui/Select.jsx';
import { useApiRequest } from '../hooks/useApiRequest.js';
import { useBuildState } from '../hooks/useBuildState.jsx';
import { savedBuildsService } from '../services/savedBuildsService.js';
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
              <Card key={`${suggestion.componentType}-${suggestion.suggestedComponent?.id}`} as="article">
                <div className="section-heading compact">
                  <h2>{componentLabels[suggestion.componentType] || suggestion.componentType}</h2>
                  <strong>{translateValue(suggestion.expectedImpact)}</strong>
                </div>
                <p>{suggestion.reason}</p>
                <div className="upgrade-pair">
                  <div>
                    <span>Atual</span>
                    <strong>{suggestion.currentComponent?.name}</strong>
                  </div>
                  <div>
                    <span>Sugerido</span>
                    <strong>{suggestion.suggestedComponent?.name}</strong>
                  </div>
                </div>
                <p>Custo estimado: {formatCurrency(suggestion.estimatedUpgradeCost)}</p>
                <small>Compatibilidade: {translateValue(suggestion.compatibilityStatus)}</small>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
