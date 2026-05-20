import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import Alert from '../components/ui/Alert.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import Input from '../components/ui/Input.jsx';
import Select from '../components/ui/Select.jsx';
import { useApiRequest } from '../hooks/useApiRequest.js';
import { useBuildState } from '../hooks/useBuildState.jsx';
import { recommendationService } from '../services/recommendationService.js';
import { savedBuildsService } from '../services/savedBuildsService.js';
import { componentTypes, priorityLabels, usageLabels, usageTypes } from '../utils/componentLabels.js';
import { formatCurrency } from '../utils/formatCurrency.js';

export default function CompareBuilds() {
  const build = useBuildState();
  const request = useApiRequest();
  const [savedBuilds, setSavedBuilds] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [budget, setBudget] = useState(build.budget.amount || 5000);
  const [usageType, setUsageType] = useState(build.usageType);
  const [criteria, setCriteria] = useState('cost-benefit');
  const [comparison, setComparison] = useState(null);

  useEffect(() => {
    savedBuildsService.list()
      .then((data) => setSavedBuilds(Array.isArray(data) ? data : []))
      .catch((error) => request.setError(error.message));
  }, []);

  function toggleBuild(id) {
    setSelectedIds((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id]);
  }

  async function compare() {
    const selectedBuilds = savedBuilds
      .filter((savedBuild) => selectedIds.includes(savedBuild.id))
      .map((savedBuild) => ({
        name: savedBuild.name,
        components: savedBuild.components
      }));

    if (componentTypes.every((type) => build.selectedComponents[type])) {
      selectedBuilds.unshift({
        name: 'Build atual',
        components: componentTypes.reduce((payload, type) => ({
          ...payload,
          [`${type}Id`]: build.selectedComponents[type].id
        }), {})
      });
    }

    if (selectedBuilds.length < 2) {
      request.setError('Selecione pelo menos duas builds ou mantenha uma build atual completa.');
      return;
    }

    await request.run(async () => {
      const result = await recommendationService.compare({
        builds: selectedBuilds,
        budget: {
          amount: Number(budget),
          currency: 'BRL'
        },
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
          <Input label="Orçamento de referência" type="number" value={budget} onChange={(event) => setBudget(event.target.value)} />
          <Select label="Tipo de uso" value={usageType} onChange={(event) => setUsageType(event.target.value)} options={usageTypes.map((usage) => ({ value: usage, label: usageLabels[usage] }))} />
          <Select label="Critério" value={criteria} onChange={(event) => setCriteria(event.target.value)} options={['cost-benefit', 'performance', 'budget', 'balanced'].map((value) => ({ value, label: priorityLabels[value] || value }))} />
        </div>
        <Button disabled={request.loading} onClick={compare}>Comparar selecionadas</Button>
      </Card>

      {savedBuilds.length === 0 ? (
        <EmptyState title="Nenhuma build salva" message="Você ainda pode comparar quando salvar builds no assistente." />
      ) : (
        <div className="cards-grid compact-cards">
          {savedBuilds.map((savedBuild) => (
            <Card key={savedBuild.id} as="article" className={selectedIds.includes(savedBuild.id) ? 'is-selected' : ''}>
              <h3>{savedBuild.name}</h3>
              <p>{formatCurrency(savedBuild.totalEstimatedPrice)}</p>
              <Button variant={selectedIds.includes(savedBuild.id) ? 'success' : 'secondary'} onClick={() => toggleBuild(savedBuild.id)}>
                {selectedIds.includes(savedBuild.id) ? 'Selecionada' : 'Selecionar'}
              </Button>
            </Card>
          ))}
        </div>
      )}

      {comparison && (
        <Card>
          <div className="section-heading compact">
            <h2>Resultado</h2>
            <Trophy aria-hidden="true" />
          </div>
          <Alert type="success" title={`Recomendada: ${comparison.recommendedBuild?.name}`}>
            {comparison.recommendedBuild?.reason}
          </Alert>
          <div className="comparison-table" role="table">
            <div className="comparison-row header" role="row">
              <span>Build</span>
              <span>Preço</span>
              <span>Compatível</span>
              <span>Score</span>
              <span>Orçamento</span>
            </div>
            {(comparison.builds || []).map((item) => (
              <div className="comparison-row" key={item.name} role="row">
                <span>{item.name}</span>
                <span>{formatCurrency(item.totalEstimatedPrice)}</span>
                <span>{item.compatible ? 'Sim' : 'Não'}</span>
                <span>{item.performanceScore}</span>
                <span>{item.budgetStatus}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
