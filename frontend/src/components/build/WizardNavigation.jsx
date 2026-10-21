import { ArrowLeft, ArrowRight, Check, ChevronDown } from 'lucide-react';
import Button from '../ui/Button.jsx';
import { formatCurrency } from '../../utils/formatCurrency.js';
import { knownPriceSubtotal } from '../../utils/referencePricing.js';
import { optionalWizardSteps, requiredWizardSteps, wizardLabels, wizardSteps } from '../../utils/wizardSteps.js';

export default function WizardNavigation({ currentStep, completedSteps, canAdvance, summaryReady = true, guidance, onStepChange, onSummary, controlsRef, nextStep, budget, totalPrice, selectedComponents, onEditBudget }) {
  const stepIndex = wizardSteps.indexOf(currentStep);
  const optional = optionalWizardSteps.includes(currentStep);
  const budgetAmount = Number(budget?.amount);
  const hasBudget = Number.isFinite(budgetAmount) && budgetAmount > 0;
  const hasTotal = typeof totalPrice === 'number' && Number.isFinite(totalPrice);
  const currency = typeof budget?.currency === 'string' ? budget.currency.trim().toUpperCase() : 'BRL';
  const currencyValid = /^[A-Z]{3}$/.test(currency);
  const sameCurrency = currency === 'BRL';
  const remaining = hasBudget && hasTotal && sameCurrency ? budgetAmount - totalPrice : null;
  const known = knownPriceSubtotal(selectedComponents);
  const upcomingStep = nextStep || wizardSteps[stepIndex + 1];
  const completeCount = completedSteps.filter(step => requiredWizardSteps.includes(step)).length;

  return (
    <>
      <div className="wizard-progress">
        <progress value={completeCount} max={requiredWizardSteps.length} aria-label="Etapas obrigatórias concluídas" />
        <details onKeyDown={(event) => {
          if (event.key !== 'Escape' || !event.currentTarget.open) return;
          event.preventDefault();
          event.currentTarget.open = false;
          event.currentTarget.querySelector('summary')?.focus();
        }}>
          <summary>
            <span>{completeCount} de {requiredWizardSteps.length} etapas obrigatórias concluídas</span>
            <span>Ver etapas <ChevronDown size={16} aria-hidden="true" /></span>
          </summary>
          <nav aria-label="Etapas do assistente">
            <ol className="wizard-step-list">
              {wizardSteps.map((step) => {
                const completed = completedSteps.includes(step);
                const isOptional = optionalWizardSteps.includes(step);
                return (
                  <li key={step}>
                    <button type="button" aria-current={step === currentStep ? 'step' : undefined}
                      onClick={(event) => {
                        event.currentTarget.closest('details').open = false;
                        onStepChange(step);
                      }}>
                      <span className={`wizard-step-number ${completed ? 'is-complete' : ''}`}>
                        {completed ? <Check size={16} aria-hidden="true" /> : isOptional ? '+' : requiredWizardSteps.indexOf(step) + 1}
                      </span>
                      <span>{wizardLabels[step]}<small>{isOptional ? 'Opcional' : completed ? 'Concluída' : 'Pendente'}</small></span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        </details>
      </div>

      <div className="wizard-actions" ref={controlsRef} role="region" aria-label="Avançar ou voltar na montagem">
        <div className="wizard-budget-progress" aria-label="Acompanhamento do orçamento">
          <dl>
            <div><dt>Limite</dt><dd>{hasBudget ? currencyValid ? formatCurrency(budgetAmount, currency) : 'Moeda inválida' : 'Não definido'}</dd></div>
            <div><dt>{hasTotal ? 'Acumulado' : 'Subtotal conhecido'}</dt><dd>{formatCurrency(hasTotal ? totalPrice : known.subtotal)}</dd></div>
            <div className={remaining !== null && remaining < 0 ? 'is-over-budget' : ''}><dt>{remaining !== null && remaining < 0 ? 'Acima do limite' : 'Restante'}</dt><dd>{remaining === null ? 'Pendente' : formatCurrency(Math.abs(remaining))}</dd></div>
          </dl>
          {currentStep !== 'budget' && <Button variant="ghost" size="sm" onClick={onEditBudget}>Editar orçamento</Button>}
          {hasBudget && !sameCurrency && <p className="wizard-price-pending" role="status">Os preços estão em BRL. Informe o orçamento em reais para comparar; não há conversão automática.</p>}
          {!hasTotal && <p className="wizard-price-pending">Preço pendente em {known.missing || 'uma ou mais'} peça(s). O restante ainda não pode ser calculado.</p>}
        </div>
        <div className="wizard-actions-row">
          <strong>{optional ? 'Opcional' : `Etapa ${requiredWizardSteps.indexOf(currentStep) + 1} de ${requiredWizardSteps.length}`} · {wizardLabels[currentStep]}</strong>
          <div className="wizard-controls">
            <Button variant="ghost" disabled={stepIndex === 0} onClick={() => onStepChange(wizardSteps[stepIndex - 1])}>
              <ArrowLeft size={18} aria-hidden="true" /> Voltar
            </Button>
            {stepIndex < wizardSteps.length - 1 ? (
              <Button disabled={!canAdvance} aria-describedby="wizard-guidance" onClick={() => onStepChange(upcomingStep)}>
                {optional ? 'Continuar' : 'Avançar'} <ArrowRight size={18} aria-hidden="true" />
              </Button>
            ) : (
              <Button disabled={!summaryReady} onClick={onSummary} aria-describedby="wizard-guidance">Ir para resumo <ArrowRight size={18} aria-hidden="true" /></Button>
            )}
          </div>
        </div>
        {upcomingStep && <p className="wizard-next-step">Próximo: {wizardLabels[upcomingStep]}</p>}
        <p id="wizard-guidance" role="status" aria-atomic="true">{guidance}</p>
      </div>
    </>
  );
}
