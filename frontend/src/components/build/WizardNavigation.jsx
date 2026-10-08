import { ArrowLeft, ArrowRight, Check, ChevronDown } from 'lucide-react';
import Button from '../ui/Button.jsx';
import { optionalWizardSteps, requiredWizardSteps, wizardLabels, wizardSteps } from '../../utils/wizardSteps.js';

export default function WizardNavigation({ currentStep, completedSteps, canAdvance, guidance, onStepChange, onSummary, controlsRef }) {
  const stepIndex = wizardSteps.indexOf(currentStep);
  const optional = optionalWizardSteps.includes(currentStep);
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
        <div className="wizard-actions-row">
          <strong>{optional ? 'Opcional' : `Etapa ${requiredWizardSteps.indexOf(currentStep) + 1} de ${requiredWizardSteps.length}`} · {wizardLabels[currentStep]}</strong>
          <div className="wizard-controls">
            <Button variant="ghost" disabled={stepIndex === 0} onClick={() => onStepChange(wizardSteps[stepIndex - 1])}>
              <ArrowLeft size={18} aria-hidden="true" /> Voltar
            </Button>
            {stepIndex < wizardSteps.length - 1 ? (
              <Button disabled={!canAdvance} aria-describedby="wizard-guidance" onClick={() => onStepChange(wizardSteps[stepIndex + 1])}>
                {optional ? 'Continuar' : 'Avançar'} <ArrowRight size={18} aria-hidden="true" />
              </Button>
            ) : (
              <Button onClick={onSummary} aria-describedby="wizard-guidance">Ir para resumo <ArrowRight size={18} aria-hidden="true" /></Button>
            )}
          </div>
        </div>
        <p id="wizard-guidance" role="status" aria-atomic="true">{guidance}</p>
      </div>
    </>
  );
}
