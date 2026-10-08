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
import { formatPerformanceNumber } from '../../utils/performancePresentation.js';
import { canApplyReplacement, compareReplacementSummaries } from '../../utils/replacementComparison.js';
import { translateValue } from '../../utils/translations.js';

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
  const baselinePayload = { ...payload, build: buildToApiPayload(build.selectedComponents) };
  const check = useSimulationRequest(JSON.stringify({ before: baselinePayload, after: payload, revision: build.revision }));
  const result = check.result?.after;
  const comparison = check.result && compareReplacementSummaries(check.result.before, result, build.game);
  const complete = candidate && hasCompleteBuild(selection);
  const validated = result?.compatibility?.compatible === true && !['unverified', 'incompatible'].includes(result?.compatibility?.status);
  const canApply = canApplyReplacement(result);
  const budgetStatus = result?.budgetStatus;
  const overBudget = budgetStatus && comparison?.cost.after !== null && Number(budgetStatus.amount) < comparison?.cost.after;

  useEffect(() => {
    if (check.status !== 'success' && check.status !== 'error') return;
    const target = verificationRef.current;
    if (!target) return;
    const dialog = target.closest('dialog');
    if (!dialog) return;
    const header = dialog.querySelector('.modal-header');
    target.focus({ preventScroll: true });
    dialog.scrollTo({
      top: dialog.scrollTop + target.getBoundingClientRect().top - dialog.getBoundingClientRect().top - (header?.offsetHeight || 0) - 24,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
    });
  }, [check.status, check.result]);

  function validate() {
    if (complete) check.run(async () => {
      // Both summaries are tied to the same selection/settings key. Candidate
      // validation remains useful if the original build cannot be analyzed.
      const [after, before] = await Promise.allSettled([
        recommendationService.summary(payload),
        recommendationService.summary(baselinePayload)
      ]);
      if (after.status === 'rejected') throw after.reason;
      return {
        after: after.value,
        before: before.status === 'fulfilled' ? before.value : null,
        baselineUnavailable: before.status === 'rejected'
      };
    });
  }

  return (
    <Modal open className="replacement-dialog" title={`Substituir ${componentLabels[type]}`} onClose={onClose}>
      <div className="replacement-preview">
        <section className="replacement-pair" aria-label="Peça atual e alternativa escolhida">
          <div><h3>Peça atual</h3><ComponentIdentity component={current} category={type} fallback="Não selecionada" /><p>{formatCurrency(current?.price)} de referência</p></div>
          <div><h3>Alternativa escolhida</h3>{candidate ? <><ComponentIdentity component={candidate} category={type} /><p>{formatCurrency(candidate.price)} de referência</p></> : <p>{loading && initialComponent ? `Carregando ${initialComponent.name || 'a alternativa'}…` : 'Escolha uma alternativa abaixo.'}</p>}</div>
        </section>
        <p>As outras peças, o orçamento e o perfil de uso serão preservados. A alteração ainda não foi aplicada.</p>
        <p className="analysis-note">Escolha uma alternativa para comparar custo, desempenho estimado e consumo antes e depois. Verifique a montagem antes de aplicar. Os valores são estimados, sem cotação em tempo real.</p>
        {(build.selectedComponents.cooler || build.selectedComponents.fans?.length > 0 || type === 'cooler') && <p className="hint-text">Cooler e ventoinhas selecionados entram na verificação. Dados ausentes de encaixe, espaço ou consumo serão indicados como não verificados.</p>}
        {loading ? <LoadingSpinner label="Carregando alternativas..." /> : error ? <ErrorState message={error} onRetry={reload} /> : <>
          <details className="analysis-help" open={!initialComponent}><summary>Filtrar outras alternativas</summary><ComponentFilters components={components} filters={filters} fixedCategory={type} onChange={setFilters} /></details>
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
        {candidate && <details className="analysis-help"><summary>Comparar alternativas: peça atual e {candidate.name}</summary>
          <ComponentComparison components={[current, candidate].filter(Boolean)} />
        </details>}
        {candidate && !complete && <Link className="btn btn-secondary btn-md" to="/build">Completar montagem</Link>}
        {(check.error || check.result) && <section ref={verificationRef} tabIndex={-1} className="stack" aria-label="Verificação da substituição">
          {check.error && <ErrorState message={check.error.message || 'Não foi possível verificar. A montagem original foi mantida.'} onRetry={validate} />}
          {result && <>
          <ReplacementImpact comparison={comparison} baselineUnavailable={check.result.baselineUnavailable} />
          <CompatibilityStatus result={result.compatibility} />
          {!budgetStatus && <Alert type="info">Sem orçamento informado: o limite de gasto não foi avaliado.</Alert>}
          {result.bottlenecks?.hasBottleneck && <Alert type="warning">A nova configuração tem possíveis gargalos. Confira os detalhes no resumo após aplicar.</Alert>}
          {(result.bottlenecks?.available === false || result.gamePerformance?.available === false) && <Alert type="warning">Parte das análises de desempenho está indisponível. A verificação de compatibilidade não garante FPS; os avisos serão preservados no resumo.</Alert>}
          {Array.isArray(result.gamePerformance?.warnings) && result.gamePerformance.warnings.map((warning, index) => <Alert type="warning" key={index}>{warning}</Alert>)}
          {result.gamePerformance?.meetsMinimumRequirements === false && <Alert type="warning">A alternativa não atende a todos os requisitos mínimos do jogo selecionado. A estimativa não garante uma experiência adequada.</Alert>}
          {result.finalRecommendation && <p>{result.finalRecommendation}</p>}
          </>}
        </section>}
        <div className="replacement-actions">
          <p role="status">{check.status === 'loading' ? 'Verificando a montagem atual e a alternativa com o mesmo jogo, resolução e qualidade...'
          : !candidate ? 'Selecione uma alternativa para verificar.'
            : !complete ? 'Complete as outras categorias no assistente antes de verificar a substituição.'
              : check.status === 'success' ? canApply ? validated ? 'Verificação concluída. Revise os avisos antes de aplicar.' : 'Verificação concluída com dados pendentes. Leia os avisos de compatibilidade antes de aplicar.' : result?.compatibility ? 'Há incompatibilidades. Escolha outra peça e verifique novamente.' : 'Não foi possível confirmar a compatibilidade. Verifique novamente.'
                : 'A alteração ainda não foi aplicada. Verifique esta combinação.'}</p>
          {canApply && !validated && <Alert type="warning">Compatibilidade não confirmada: há dados técnicos pendentes. Você pode aplicar a troca mantendo esses avisos, mas confirme encaixes, folgas e ligações nos manuais antes de comprar ou montar.</Alert>}
          {result && <p>Total estimado após a troca: <strong>{formatCurrency(comparison.cost.after)}</strong></p>}
          {overBudget && <Alert type="warning">O novo total excede o orçamento em {formatCurrency(comparison.cost.after - Number(budgetStatus.amount))}. Aplicar mantém o orçamento informado.</Alert>}
          <div className="button-row">
            <Button disabled={!complete || loading || Boolean(error)} loading={check.status === 'loading'} onClick={validate}>Verificar substituição</Button>
            <Button variant="secondary" disabled={!canApply || !candidate || loading || Boolean(error)} onClick={() => onApply(type, candidate, result)}>
              Aplicar substituição
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ReplacementImpact({ comparison, baselineUnavailable }) {
  const { cost, power, performance } = comparison;
  const powerValue = (value, complete) => value === null ? 'Não disponível' : `${formatPerformanceNumber(value)} W${complete ? '' : ' (parcial)'}`;
  return <section className="stack" aria-label="Comparação antes e depois">
    <h3>Antes e depois da substituição</h3>
    {baselineUnavailable && <Alert type="warning">Não foi possível analisar a montagem atual nesta verificação. Os valores anteriores e as diferenças estão indisponíveis. Tente verificar novamente para comparar.</Alert>}
    <div className="metric-grid">
      <div><span>Custo total estimado antes</span><strong>{formatCurrency(cost.before)}</strong></div>
      <div><span>Custo total estimado depois</span><strong>{formatCurrency(cost.after)}</strong></div>
      <div><span>Diferença de custo</span><strong>{formatDifference(cost.delta, formatCurrency)}</strong></div>
      <div><span>Consumo estimado antes</span><strong>{powerValue(power.before, power.beforeComplete)}</strong></div>
      <div><span>Consumo estimado depois</span><strong>{powerValue(power.after, power.afterComplete)}</strong></div>
      <div><span>Diferença de consumo</span><strong>{formatDifference(power.delta, value => `${formatPerformanceNumber(value)} W`)}</strong></div>
    </div>
    {(power.before !== null && !power.beforeComplete || power.after !== null && !power.afterComplete) && <Alert type="warning">O consumo é parcial porque faltam dados de uma ou mais peças de refrigeração. A diferença de consumo não pode ser confirmada.</Alert>}
    {performance.comparable ? <>
      <p>Desempenho estimado em {performance.game} · {performance.targetResolution} · {translateValue(performance.qualityPreset)}. Mesmas configurações nas duas simulações.</p>
      <div className="metric-grid">
        <div><span>FPS estimado antes</span><strong>{formatPerformanceNumber(performance.before)} FPS</strong></div>
        <div><span>FPS estimado depois</span><strong>{formatPerformanceNumber(performance.after)} FPS</strong></div>
        <div><span>Diferença estimada de FPS</span><strong>{formatDifference(performance.delta, value => `${formatPerformanceNumber(value)} FPS`)}</strong>{performance.percentage !== null && <small>{formatDifference(performance.percentage, value => `${formatPerformanceNumber(value)}%`)}</small>}</div>
      </div>
      <p className="analysis-note">Estimativas do simulador, sem benchmark real. FPS pode variar por cena, drivers e condições de uso. A estimativa não confirma a compatibilidade física das peças; confira os avisos abaixo.</p>
    </> : <Alert type="info">Comparação de FPS indisponível. {performanceReasons[performance.reason]}</Alert>}
  </section>;
}

function formatDifference(value, format) {
  return value === null ? 'Não disponível' : value === 0 ? 'Sem alteração' : `${value > 0 ? '+' : '−'}${format(Math.abs(value))}`;
}

const performanceReasons = {
  'missing-settings': 'Selecione um jogo, resolução e qualidade para comparar o desempenho.',
  unavailable: 'Uma ou ambas as montagens não têm uma estimativa válida para o jogo selecionado.',
  'unverified-settings': 'A resposta não informa todos os dados necessários para confirmar o mesmo jogo, resolução e qualidade.',
  'different-settings': 'As estimativas não correspondem ao mesmo jogo, resolução e qualidade selecionados. Verifique novamente.',
  'unverified-compatibility': 'Há dados de compatibilidade pendentes em uma das montagens. Não é possível confirmar uma comparação válida de desempenho.',
  'incompatible-build': 'Uma das montagens tem incompatibilidades conhecidas ou não retornou uma análise de compatibilidade. Corrija ou verifique a montagem para comparar o desempenho.'
};
