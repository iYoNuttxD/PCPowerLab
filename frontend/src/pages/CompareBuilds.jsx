import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
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
import { buildComparisonService } from '../services/buildComparisonService.js';
import { savedBuildsService } from '../services/savedBuildsService.js';
import { componentTypes, priorityLabels, usageLabels, usageTypes } from '../utils/componentLabels.js';
import { buildToApiPayload, normalizeBudgetPayload } from '../utils/buildHelpers.js';
import { formatCurrency } from '../utils/formatCurrency.js';
import { translateValue } from '../utils/translations.js';
import { validateBudgetAmount } from '../utils/validation.js';

export default function CompareBuilds() {
  const build = useBuildState();
  const request = useApiRequest();
  const [savedBuilds, setSavedBuilds] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [budget, setBudget] = useState(build.budget.amount || 5000);
  const [usageType, setUsageType] = useState(build.usageType);
  const [criteria, setCriteria] = useState('cost-benefit');
  const [comparison, setComparison] = useState(null);
  const [loadingBuilds, setLoadingBuilds] = useState(true);
  const [buildsError, setBuildsError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    savedBuildsService.list()
      .then((data) => { if (active) setSavedBuilds(Array.isArray(data) ? data : []); })
      .catch((error) => { if (active) setBuildsError(error.message); })
      .finally(() => { if (active) setLoadingBuilds(false); });
    return () => { active = false; };
  }, [loadAttempt]);

  function toggleBuild(id) {
    setSelectedIds((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id]);
  }

  async function compare() {
    const budgetError = validateBudgetAmount(budget);
    if (budgetError) {
      request.setError(budgetError);
      return;
    }

    const selectedBuilds = savedBuilds
      .filter((savedBuild) => selectedIds.includes(savedBuild.id))
      .map((savedBuild) => ({
        name: savedBuild.name,
        components: savedBuild.components
      }));

    if (componentTypes.every((type) => build.selectedComponents[type])) {
      selectedBuilds.unshift({
        name: 'Build atual',
        components: buildToApiPayload(build.selectedComponents)
      });
    }

    if (selectedBuilds.length < 2) {
      request.setError('Selecione pelo menos duas builds ou mantenha uma build atual completa.');
      return;
    }

    await request.run(async () => {
      const result = await buildComparisonService.compare({
        builds: selectedBuilds,
        budget: normalizeBudgetPayload({
          amount: budget,
          currency: 'BRL',
          priority: ['cost-benefit', 'performance'].includes(criteria) ? criteria : 'balanced'
        }),
        usageType,
        comparisonCriteria: criteria
      });
      setComparison(result);
    });
  }

  return (
    <div className="page-stack">
      <section className="page-hero compact-hero">
        <span className="eyebrow">Versus mode</span>
        <h1>Comparação de builds</h1>
        <p>Compare preço, compatibilidade, desempenho, custo-benefício e gargalos entre duas ou mais configurações.</p>
      </section>

      {request.error && <ErrorState message={request.error} />}

      <Card>
        <h2>Critérios</h2>
        <div className="form-grid">
          <Input label="Orçamento de referência" type="number" min="1" value={budget} onChange={(event) => setBudget(event.target.value)} error={validateBudgetAmount(budget)} />
          <Select label="Tipo de uso" value={usageType} onChange={(event) => setUsageType(event.target.value)} options={usageTypes.map((usage) => ({ value: usage, label: usageLabels[usage] }))} />
          <Select label="Critério" value={criteria} onChange={(event) => setCriteria(event.target.value)} options={['cost-benefit', 'performance', 'budget', 'balanced'].map((value) => ({ value, label: priorityLabels[value] || value }))} />
        </div>
        <Button loading={request.loading} onClick={compare}>Comparar selecionadas</Button>
      </Card>

      {loadingBuilds && <LoadingSpinner label="Carregando builds para comparar..." />}
      {buildsError && <ErrorState message={buildsError} onRetry={() => {
        setBuildsError(''); setLoadingBuilds(true); setLoadAttempt((attempt) => attempt + 1);
      }} />}
      {!loadingBuilds && !buildsError && (savedBuilds.length === 0 ? (
        <EmptyState title="Nenhuma build salva" message="Você ainda pode comparar quando salvar builds no assistente." />
      ) : (
        <div className="cards-grid compact-cards">
          {savedBuilds.map((savedBuild) => (
            <Card key={savedBuild.id} as="article" className={selectedIds.includes(savedBuild.id) ? 'is-selected' : ''}>
              <h3>{savedBuild.name}</h3>
              <p>{formatCurrency(savedBuild.totalEstimatedPrice)}</p>
              <Button aria-pressed={selectedIds.includes(savedBuild.id)} variant={selectedIds.includes(savedBuild.id) ? 'success' : 'secondary'} onClick={() => toggleBuild(savedBuild.id)}>
                {selectedIds.includes(savedBuild.id) ? 'Selecionada' : 'Selecionar'}
              </Button>
            </Card>
          ))}
        </div>
      ))}

      {comparison && (
        <Card>
          <div className="section-heading compact">
            <h2>Resultado</h2>
            <Trophy aria-hidden="true" />
          </div>
          <Alert type="success" title={`Recomendada: ${comparison.recommendedBuild?.name}`}>
            {comparison.recommendedBuild?.reason}
          </Alert>
          <div className="comparison-table" role="region" aria-label="Comparação de builds — role horizontalmente para ver todos os critérios" tabIndex={0}>
            <table>
              <caption>Preço de referência e pontuação estimada das builds. Pontos maiores indicam melhor avaliação no modelo; não equivalem a FPS nem a uma medição real.</caption>
              <thead><tr>
                <th scope="col">Build</th><th scope="col">Preço</th><th scope="col">Compatível</th>
                <th scope="col">Pontuação de desempenho</th><th scope="col">Orçamento</th>
              </tr></thead>
              <tbody>
                {(comparison.builds || []).map((item) => (
                  <tr key={item.name}>
                    <th scope="row">{item.name}</th>
                    <td>{formatCurrency(item.totalEstimatedPrice)}</td>
                    <td>{item.compatible ? 'Sim' : 'Não'}</td>
                    <td>{item.performanceScore}</td>
                    <td>{translateValue(item.budgetStatus)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
