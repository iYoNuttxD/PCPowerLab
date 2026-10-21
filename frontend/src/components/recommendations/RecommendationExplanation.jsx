import { componentLabels } from '../../utils/componentLabels.js';
import { formatCurrency } from '../../utils/formatCurrency.js';

const finite = value => Number.isFinite(value);
const signedMoney = value => `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatCurrency(Math.abs(value))}`;

// Server explanations are bound to the exact selection that was evaluated.
// Older responses or cooling retained only in the client cannot inherit them.
export default function RecommendationExplanation({ explanation, comparison, needsRecalculation = false }) {
  if (needsRecalculation) return <p className="hint-text">As justificativas de custo e compatibilidade precisam ser recalculadas com a refrigeração mantida. Confira o resumo da montagem antes de aplicar uma troca.</p>;
  if (!explanation?.componentReasons?.length) return <p className="hint-text">Justificativas por peça indisponíveis nesta resposta. Gere uma nova análise para os critérios atuais.</p>;
  const budget = explanation.budget || {};
  const compatibility = explanation.compatibility || {};
  const selected = explanation.selectionSource === 'current_selection';
  const checks = [...(compatibility.checks || []), ...(compatibility.coolingWarnings || [])]
    .filter((check, index, all) => all.findIndex(item => item.code === check.code && item.message === check.message) === index);

  return <details className="task-disclosure recommendation-explanation">
    <summary>{selected ? 'Entender as peças da minha montagem' : 'Por que estas peças? Custos, perfil e alternativas'}</summary>
    <p>{selected ? 'Estas peças foram escolhidas por você; os dados abaixo não são uma aprovação automática de compra.' : explanation.selectionRule}</p>
    <div className="recommendation-explanation-budget">
      <p>{finite(budget.total) ? `Total de referência: ${formatCurrency(budget.total)}.` : `Total incompleto. Subtotal conhecido: ${formatCurrency(budget.knownReferenceSubtotal)}.`}
        {finite(budget.coolingSubtotal) ? ` Refrigeração selecionada incluída: ${formatCurrency(budget.coolingSubtotal)}.` : ' Há preço de refrigeração pendente.'}</p>
      {finite(budget.limit) && <p>Limite: {formatCurrency(budget.limit)}.
        {finite(budget.min) ? ` Mínimo da faixa: ${formatCurrency(budget.min)}.` : ''}
        {finite(budget.remaining) ? budget.remaining >= 0 ? ` Saldo estimado: ${formatCurrency(budget.remaining)}.` : ` Excede o limite em ${formatCurrency(-budget.remaining)}.` : ' Saldo não verificável com os dados disponíveis.'}</p>}
    </div>
    {comparison && <div className="recommendation-comparison">
      <h4>Impacto em relação à montagem atual</h4>
      <p>{finite(comparison.priceDelta) ? `Variação do custo total: ${signedMoney(comparison.priceDelta)}.` : 'Diferença de custo indisponível: há preços pendentes.'}
        {finite(comparison.simulatedScoreDelta) ? ` Variação do índice simulado do conjunto: ${comparison.simulatedScoreDelta > 0 ? '+' : ''}${comparison.simulatedScoreDelta} ponto(s).` : ' Diferença de desempenho não calculada por falta de modelo utilizável.'}</p>
      <p>{comparison.changedSlots?.length ? `Peças diferentes: ${comparison.changedSlots.map(slot => componentLabels[slot] || slot).join(', ')}.` : 'As peças principais são as mesmas da sua montagem.'}</p>
      <p className="hint-text">{comparison.message}</p>
    </div>}
    {checks.length > 0 && <div className="recommendation-explanation-warnings">
      <h4>Verificações e pendências</h4>
      <ul>{checks.map((check, index) => <li key={`${check.code}-${index}`}>{check.message}</li>)}</ul>
    </div>}
    <div className="recommendation-component-reasons">
      {explanation.componentReasons.map(reason => <details className="recommendation-component-reason" key={`${reason.slot}-${reason.componentId}`}>
        <summary>{componentLabels[reason.slot] || (reason.slot === 'fans' ? 'Ventoinhas' : reason.slot)}: {reason.name}</summary>
        <p>{reason.role}</p>
        <p>{reason.selectionReason}</p>
        {reason.facts?.length > 0 && <ul className="recommendation-spec-facts">{reason.facts.map(fact => <li key={fact.label}>{fact.label}: {fact.value}</li>)}</ul>}
        <p>{reason.budget?.message}</p>
        {reason.budget?.observedAt && <p className="hint-text">Referência datada: {reason.budget.observedAt}. Não confirma preço ou estoque atual.</p>}
        <p>{reason.profile?.message}</p>
        <p className="hint-text">{reason.performance?.message}</p>
        {reason.compatibility?.facts?.map(fact => <p key={fact}>{fact}</p>)}
        <p>{reason.compatibility?.message}</p>
        <p>{reason.tradeoff}</p>
        {reason.excludedAlternatives?.length > 0 && <details className="recommendation-excluded-alternatives">
          <summary>Por que outras peças não servem como troca direta? ({reason.excludedAlternatives.length})</summary>
          <p className="hint-text">Esta comparação mantém todas as outras peças. Não significa que estes modelos sejam incompatíveis com todas as montagens.</p>
          <ul>{reason.excludedAlternatives.map(candidate => <li key={candidate.componentId}>
            <strong>{candidate.name}</strong>
            <p>Preço de referência: {formatCurrency(candidate.referencePrice)}.</p>
            {candidate.facts?.length > 0 && <p>{candidate.facts.map(fact => `${fact.label}: ${fact.value}`).join(' · ')}</p>}
            <ul>{candidate.reasons?.map((reason, index) => <li key={`${reason.code}-${index}`}>{reason.message}</li>)}</ul>
          </li>)}</ul>
        </details>}
      </details>)}
    </div>
    <ul className="hint-text recommendation-explanation-limits">{explanation.limits?.map(limit => <li key={limit}>{limit}</li>)}</ul>
  </details>;
}
