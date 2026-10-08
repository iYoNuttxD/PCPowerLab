import { Link } from 'react-router-dom';
import { selectedComparisonBuilds } from '../utils/buildComparisonSelection.js';
import { formatPerformanceNumber } from '../utils/performancePresentation.js';
import DecisionMethodology from '../components/build/DecisionMethodology.jsx';
import BuildComponentsPreview from '../components/build/BuildComponentsPreview.jsx';
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
import { useSimulationRequest } from '../hooks/useSimulationRequest.js';
import { useBuildState } from '../hooks/useBuildState.jsx';
import { buildComparisonService } from '../services/buildComparisonService.js';
import { savedBuildsService } from '../services/savedBuildsService.js';
import { priorityLabels, usageLabels, usageTypes } from '../utils/componentLabels.js';
import { hasCompleteBuild, normalizeBudgetPayload } from '../utils/buildHelpers.js';
import { formatCurrency } from '../utils/formatCurrency.js';
import { translateValue } from '../utils/translations.js';
import { validateBudgetAmount } from '../utils/validation.js';

export default function CompareBuilds() {
  const build = useBuildState();
  const [validationError, setValidationError] = useState('');
  const [savedBuilds, setSavedBuilds] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [includeCurrent, setIncludeCurrent] = useState(true);
  const currentComplete = hasCompleteBuild(build.selectedComponents);
  const chosenBuilds = selectedComparisonBuilds({ savedBuilds, selectedIds, currentComponents: build.selectedComponents, includeCurrent });
  const [budget, setBudget] = useState(build.budget.amount || 5000);
  const [usageType, setUsageType] = useState(build.usageType);
  const [criteria, setCriteria] = useState('cost-benefit');
  const request = useSimulationRequest(JSON.stringify([selectedIds, includeCurrent, savedBuilds, budget, usageType, criteria, build.buildPayload]));
  const comparison = request.result;
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
    setValidationError('');
    const budgetError = validateBudgetAmount(budget);
    if (budgetError) {
      setValidationError(budgetError);
      return;
    }

    const selectedBuilds = chosenBuilds;

    if (selectedBuilds.length < 2) {
      setValidationError('Escolha pelo menos duas configurações. A montagem atual conta apenas quando está completa e marcada abaixo.');
      return;
    }

    await request.run(() => buildComparisonService.compare({
      builds: selectedBuilds,
      budget: normalizeBudgetPayload({
        amount: budget,
        currency: 'BRL',
        priority: ['cost-benefit', 'performance'].includes(criteria) ? criteria : 'balanced'
      }),
      usageType,
      comparisonCriteria: criteria
    }));
  }

  return (
    <div className="page-stack">
      <section className="page-hero compact-hero">
        <span className="eyebrow">Alternativas lado a lado</span>
        <h1>Comparação de configurações</h1>
        <p>Compare preço de referência, compatibilidade, desempenho estimado e custo-benefício e possíveis gargalos entre duas ou mais configurações.</p>
      </section>
      <DecisionMethodology />

      {(validationError || request.error) && <ErrorState message={validationError || request.error.message} />}

      <Card>
        <h2>Critérios</h2>
        <div className="form-grid">
          <Input label="Orçamento de referência" type="number" min="1" value={budget} onChange={(event) => setBudget(event.target.value)} error={validateBudgetAmount(budget)} />
          <Select label="Tipo de uso" value={usageType} onChange={(event) => setUsageType(event.target.value)} options={usageTypes.map((usage) => ({ value: usage, label: usageLabels[usage] }))} />
          <Select label="Critério" value={criteria} onChange={(event) => setCriteria(event.target.value)} options={['cost-benefit', 'performance', 'budget', 'balanced'].map((value) => ({ value, label: priorityLabels[value] || value }))} />
        </div>
        <p id="build-comparison-guidance" role="status">{chosenBuilds.length} configuração(ões) selecionada(s). Escolha pelo menos duas; mudar as escolhas invalida o resultado anterior.</p>
        <Button disabled={chosenBuilds.length < 2 || request.status === 'loading'} aria-describedby="build-comparison-guidance" loading={request.status === 'loading'} onClick={compare}>Comparar selecionadas</Button>
      </Card>

      <Card>
        <h2>Montagem atual</h2>
        {currentComplete ? <>
          <label className="checkbox-label"><input type="checkbox" checked={includeCurrent} onChange={event => { setIncludeCurrent(event.target.checked); setValidationError(''); }} /> Incluir minha montagem atual na comparação</label>
          <details className="build-image-details"><summary>Ver componentes da montagem atual</summary><BuildComponentsPreview components={build.selectedComponents} /></details>
          <p>Desmarque para comparar somente configurações salvas. Suas peças não serão alteradas.</p>
        </> : <p>Complete a montagem para incluí-la, ou escolha duas configurações salvas. <Link to="/build">Continuar montagem</Link></p>}
      </Card>
      {loadingBuilds && <LoadingSpinner label="Carregando builds para comparar..." />}
      {buildsError && <ErrorState message={buildsError} onRetry={() => {
        setBuildsError(''); setLoadingBuilds(true); setLoadAttempt((attempt) => attempt + 1);
      }} />}
      {!loadingBuilds && !buildsError && (savedBuilds.length === 0 ? (
        <EmptyState title="Nenhuma configuração salva" message="Salve uma configuração, altere as peças e compare as alternativas aqui."><Link to="/summary">Abrir resumo e salvar configuração</Link></EmptyState>
      ) : (
        <div className="cards-grid compact-cards">
          {savedBuilds.map((savedBuild) => (
            <Card key={savedBuild.id} as="article" className={selectedIds.includes(savedBuild.id) ? 'is-selected' : ''}>
              <h3>{savedBuild.name}</h3>
              <p>Total estimado de referência: {formatCurrency(savedBuild.totalEstimatedPrice)}</p>
              <details className="build-image-details"><summary>Ver componentes</summary><BuildComponentsPreview components={savedBuild.components} /></details>
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
          <Alert type={(comparison.builds || []).some((item) => item.comparisonIndex === comparison.recommendedBuild?.comparisonIndex && getCompatibilityStatus(item) === 'compatible') ? 'success' : 'warning'} title={comparison.recommendedBuild?.available === false ? 'Comparação de custo pendente' : `Sugestão entre as builds comparadas: ${Number.isInteger(comparison.recommendedBuild?.comparisonIndex) ? `${comparison.recommendedBuild.comparisonIndex + 1} · ` : ''}${comparison.recommendedBuild?.name || 'Não informada'}`}>
            {comparison.recommendedBuild?.reason}
          </Alert>
          <details className="analysis-help"><summary>Como a sugestão é escolhida?</summary><p>A pontuação combina desempenho, orçamento, compatibilidade e alertas. Estar acima do orçamento reduz a nota, mas não exclui automaticamente a configuração.</p></details>
          <p className="comparison-scroll-hint">Deslize para ver todos os critérios. Pelo teclado, foque a tabela e use as setas.</p>
          <div className="comparison-table" role="region" aria-label="Comparação de configurações — role horizontalmente para ver todos os critérios" tabIndex={0}>
            <table>
              <caption>Preços de referência e desempenho estimado</caption>
              <thead><tr>
                <th scope="col">Build</th><th scope="col">Preço estimado de referência</th><th scope="col">Compatível</th>
                <th scope="col">Pontuação estimada de desempenho</th><th scope="col">Índice de custo-benefício</th><th scope="col">Alertas e gargalos</th><th scope="col">Orçamento</th><th scope="col">Pontuação final do critério</th>
              </tr></thead>
              <tbody>
                {(comparison.builds || []).map((item) => (
                  <tr key={item.comparisonIndex}>
                    <th scope="row">{item.comparisonIndex + 1} · {item.name}<details className="build-image-details"><summary>Ver componentes</summary><BuildComponentsPreview components={item.components} /></details></th>
                    <td className="comparison-money">{formatCurrency(item.totalEstimatedPrice)}</td>
                    <td>
                      <span>{translateValue(getCompatibilityStatus(item))}</span>
                      {Array.isArray(item.unverifiedChecks) && item.unverifiedChecks.length > 0 && (
                        <div>
                          <small>Verificações pendentes:</small>
                          <ul>{item.unverifiedChecks.map((check, index) => (
                            <li key={check.code || index}>{typeof check === 'string' ? check : check.message || check.reason || check.code}</li>
                          ))}</ul>
                        </div>
                      )}
                    </td>
                    <td>{formatPerformanceNumber(item.performanceScore)} / 100</td>
                    <td>{formatPerformanceNumber(item.costBenefitScore)} / 100<small>Índice interno relativo; não equivale a desconto ou economia.</small></td>
                    <td><p>{item.alertSummary?.total ?? 'Não informado'} alerta(s) de compatibilidade</p><p>{item.bottleneckStatus === 'analyzed' ? `${item.bottleneckSummary?.total ?? 'Não informado'} possível(is) gargalo(s)` : 'Gargalos: sem conclusão para esta configuração'}</p></td>
                    <td>{translateValue(item.budgetStatus)}</td><td>{formatPerformanceNumber(item.comparisonScore)}<small>Combina o critério escolhido com orçamento, compatibilidade e alertas; pode ultrapassar 100.</small></td>
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

function getCompatibilityStatus(item) {
  if (item.compatibilityStatus === 'incompatible') return 'incompatible';
  if (item.compatibilityStatus === 'unverified' || item.unverifiedChecks?.length) return 'unverified';
  return item.compatible === true ? 'compatible' : item.compatible === false ? 'incompatible' : 'unverified';
}
