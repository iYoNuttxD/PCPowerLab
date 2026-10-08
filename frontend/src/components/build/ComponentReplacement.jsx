import ComponentIdentity from '../componentsCatalog/ComponentIdentity.jsx';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ComponentComparison from '../componentsCatalog/ComponentComparison.jsx';
import ComponentFilters from '../componentsCatalog/ComponentFilters.jsx';
import CompatibilityStatus from '../compatibility/CompatibilityStatus.jsx';
import Alert from '../ui/Alert.jsx';
import Button from '../ui/Button.jsx';
import ErrorState from '../ui/ErrorState.jsx';
import LoadingSpinner from '../ui/LoadingSpinner.jsx';
import Modal from '../ui/Modal.jsx';
import { useComponents } from '../../hooks/useComponents.js';
import { useSimulationRequest } from '../../hooks/useSimulationRequest.js';
import { recommendationService } from '../../services/recommendationService.js';
import { buildToApiPayload, hasCompleteBuild, normalizeBudgetPayload } from '../../utils/buildHelpers.js';
import { componentLabels } from '../../utils/componentLabels.js';
import { emptyCatalogFilters, filterComponents, priceRangeError } from '../../utils/componentPresentation.js';
import { formatCurrency } from '../../utils/formatCurrency.js';

export default function ComponentReplacement({ type, build, initialComponent, onApply, onClose }) {
  const { components, loading, error, reload } = useComponents();
  const [filters, setFilters] = useState({ ...emptyCatalogFilters, category: type });
  const [candidateId, setCandidateId] = useState(initialComponent?.id || '');
  const verificationRef = useRef(null);
  const current = build.selectedComponents[type];
  const options = filterComponents(components, filters).filter(component => component.id !== current?.id);
  const candidate = components.find(component => component.category === type && component.id === candidateId && component.id !== current?.id);
  const selection = { ...build.selectedComponents, [type]: candidate };
  const payload = {
    build: buildToApiPayload(selection),
    budget: build.budget.amount ? normalizeBudgetPayload(build.budget) : undefined,
    usageType: build.usageType,
    ...build.game
  };
  const check = useSimulationRequest(JSON.stringify(payload));
  const complete = candidate && hasCompleteBuild(selection);
  const validated = check.result?.compatibility?.compatible === true;
  const budgetStatus = check.result?.budgetStatus;
  const overBudget = budgetStatus && Number(budgetStatus.amount) < check.result.totalEstimatedPrice;

  useEffect(() => {
    if (check.status !== 'success' && check.status !== 'error') return;
    const target = verificationRef.current;
    if (!target) return;
    const dialog = target.closest('dialog');
    const header = dialog.querySelector('.modal-header');
    target.focus({ preventScroll: true });
    dialog.scrollTo({
      top: dialog.scrollTop + target.getBoundingClientRect().top - dialog.getBoundingClientRect().top - header.offsetHeight - 24,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
    });
  }, [check.status, check.result]);

  function validate() {
    if (complete) check.run(() => recommendationService.summary(payload));
  }

  return (
    <Modal open className="replacement-dialog" title={`Substituir ${componentLabels[type]}`} onClose={onClose}>
      <div className="replacement-preview">
        {current && <ComponentIdentity component={current} category={type} />}
        <p>Peça atual: <strong>{current?.name || 'Não selecionada'}</strong>. As outras peças, o orçamento e o perfil de uso serão preservados.</p>
        <p className="analysis-note">Escolha uma alternativa e verifique a montagem antes de aplicar. Os valores são estimados, sem cotação em tempo real.</p>
        {loading ? <LoadingSpinner label="Carregando alternativas..." /> : error ? <ErrorState message={error} onRetry={reload} /> : <>
          <ComponentFilters components={components} filters={filters} fixedCategory={type} onChange={setFilters} />
          <fieldset className="replacement-options">
            <legend>Nova peça</legend>
            {options.map(component => <label key={component.id} className="replacement-option">
              <input type="radio" name="replacement" checked={candidateId === component.id} onChange={() => setCandidateId(component.id)} />
              <ComponentIdentity component={component} category={type}><small>{component.brand} · {formatCurrency(component.price)} estimados</small></ComponentIdentity>
            </label>)}
          </fieldset>
          {!options.length && !priceRangeError(filters) && <p>Nenhuma alternativa encontrada. Ajuste ou limpe os filtros.</p>}
          {candidate && !options.some(option => option.id === candidate.id) && <p role="status">Selecionada fora dos filtros: {candidate.name}. Limpar os filtros não altera sua escolha.</p>}
        </>}
        {candidate && <details className="analysis-help"><summary>Comparar a peça atual com {candidate.name}</summary>
          <ComponentComparison components={[current, candidate].filter(Boolean)} />
        </details>}
        {candidate && !complete && <Link className="btn btn-secondary btn-md" to="/build">Completar montagem</Link>}
        {(check.error || check.result) && <section ref={verificationRef} tabIndex={-1} className="stack" aria-label="Verificação da substituição">
          {check.error && <ErrorState message={check.error.message || 'Não foi possível verificar. A montagem original foi mantida.'} onRetry={validate} />}
          {check.result && <>
          <CompatibilityStatus result={check.result.compatibility} />
          {!budgetStatus && <Alert type="info">Sem orçamento informado: o limite de gasto não foi avaliado.</Alert>}
          {check.result.bottlenecks?.hasBottleneck && <Alert type="warning">A nova configuração tem possíveis gargalos. Confira os detalhes no resumo após aplicar.</Alert>}
          {(check.result.bottlenecks?.available === false || check.result.gamePerformance?.available === false) && <Alert type="warning">Parte das análises de desempenho está indisponível. A verificação de compatibilidade não garante FPS; os avisos serão preservados no resumo.</Alert>}
          {check.result.finalRecommendation && <p>{check.result.finalRecommendation}</p>}
          </>}
        </section>}
        <div className="replacement-actions">
          <p role="status">{check.status === 'loading' ? 'Verificando compatibilidade, orçamento e análises da nova montagem...'
          : !candidate ? 'Selecione uma alternativa para verificar.'
            : !complete ? 'Complete as outras categorias no assistente antes de verificar a substituição.'
              : check.status === 'success' ? validated ? 'Verificação concluída. Revise os avisos antes de aplicar.' : check.result?.compatibility?.status === 'unverified' ? 'A compatibilidade não pôde ser confirmada: faltam dados técnicos. Confira os avisos.' : 'Há incompatibilidades. Escolha outra peça e verifique novamente.'
                : 'A alteração ainda não foi aplicada. Verifique esta combinação.'}</p>
          {check.result && <p>Total estimado após a troca: <strong>{formatCurrency(check.result.totalEstimatedPrice)}</strong></p>}
          {overBudget && <Alert type="warning">O novo total excede o orçamento em {formatCurrency(check.result.totalEstimatedPrice - Number(budgetStatus.amount))}. Aplicar mantém o orçamento informado.</Alert>}
          <div className="button-row">
            <Button disabled={!complete || loading || Boolean(error)} loading={check.status === 'loading'} onClick={validate}>Verificar substituição</Button>
            <Button variant="secondary" disabled={!validated || !candidate || loading || Boolean(error)} onClick={() => onApply(type, candidate, check.result)}>
              Aplicar substituição
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
