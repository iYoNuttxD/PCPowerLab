import { usesIntegratedGraphics } from '../../../../src/utils/graphicsSelection.js';
import { useState } from 'react';
import ComponentIdentity from '../componentsCatalog/ComponentIdentity.jsx';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import Select from '../ui/Select.jsx';
import { componentLabels, componentTypes, usageLabels, priorityLabels } from '../../utils/componentLabels.js';
import { calculateBuildPrice, recommendationSelection } from '../../utils/buildHelpers.js';
import { formatCurrency } from '../../utils/formatCurrency.js';
import RecommendationExplanation from './RecommendationExplanation.jsx';

export default function RecommendationCard({ recommendation, onApply, onPreview, currentComponents = {}, disabled = false }) {
  if (!recommendation) {
    return (
      <Card>
        <h3>Recomendações</h3>
        <p>Use Gerar recomendação para comparar uma sugestão com seu orçamento e tipo de uso. Suas peças só mudam quando você aplica a sugestão.</p>
      </Card>
    );
  }

  const suggested = recommendation.components || {};
  const retainsCooling = Boolean((!Object.hasOwn(suggested, 'cooler') && !Object.hasOwn(suggested, 'coolerId') && currentComponents.cooler)
    || (!Object.hasOwn(suggested, 'fans') && currentComponents.fans?.length));
  const displayedTotal = retainsCooling ? calculateBuildPrice(recommendationSelection(currentComponents, suggested)) : recommendation.totalEstimatedPrice;
  return (
    <Card className="recommendation-card">
      <div className="section-heading compact">
        <h3>Configuração recomendada</h3>
        <strong><small className="estimated-price-label">Total estimado de referência</small>{formatCurrency(displayedTotal)}</strong>
      </div>
      {recommendation.pricing?.referenceTotalComplete === false && <p>Subtotal conhecido: {formatCurrency(recommendation.pricing.knownReferenceSubtotal)} · custo de refrigeração pendente.</p>}
      <p>{recommendation.selectionMode === 'price-and-compatibility' ? 'Opção de menor custo estimado, evitando conflitos conhecidos no catálogo.' : 'Peças escolhidas para seu uso e orçamento, com desempenho aproximado.'} {recommendation.usageType && `Perfil: ${usageLabels[recommendation.usageType] || recommendation.usageType}.`}</p>
      {onApply && <Button disabled={disabled} onClick={() => onApply(recommendation)}>Usar recomendação inteira</Button>}
      <ul className="build-parts-list">
        {[...componentTypes, ...(recommendation.components?.cooler ? ['cooler'] : [])].map((type) => {
          const component = recommendation.components?.[type];

          return (
            <li key={type}>
              <span>{componentLabels[type]}</span>
              {type === 'gpu' && usesIntegratedGraphics(suggested) ? <strong>Vídeo integrado à CPU · sem compra separada</strong> : <ComponentIdentity component={component || recommendation.components?.[`${type}Id`]} category={type} fallback="Não sugerido" />}
            </li>
          );
        })}
        {(recommendation.components?.fans || []).map((fan, index) => <li key={fan.id || index}><span>Ventoinhas</span><ComponentIdentity component={fan} category="fan"><small>{fan.quantity} pacote(s)</small></ComponentIdentity></li>)}
      </ul>
      <details className="task-disclosure"><summary>Como escolhemos estas peças</summary>
        {retainsCooling && <p>O total inclui sua refrigeração atual.</p>}
        {suggested.cpu?.specs?.includedCpuCooler?.name && !suggested.cooler && <p>{suggested.cpu.specs.includedCpuCooler.name} incluso no preço da CPU. Temperatura e ruído são estimativas.</p>}
        <p>{recommendation.priority && `Prioridade: ${priorityLabels[recommendation.priority] || recommendation.priority}. `}{recommendation.requestedBudget && `Limite informado: ${formatCurrency(recommendation.requestedBudget.amount)}.`}</p>
        <p>Dados ausentes não significam incompatibilidade. As simulações usam aproximações; confira detalhes de montagem e preços antes da compra.</p>
        {recommendation.memoryRequirement && <p>RAM: {suggested.ram?.specs?.capacityGb} GB. {recommendation.memoryRequirement.policy}</p>}
        <ul>{[...(recommendation.warnings || []), ...(recommendation.unverifiedChecks || []).filter(v => !String(v.code).includes('BIOS')).map(v => v.message)].map((warning, index) => <li key={index}>{warning}</li>)}</ul>
        <RecommendationExplanation explanation={recommendation.selectionExplanation} comparison={recommendation.comparison} needsRecalculation={Boolean(retainsCooling)} />
      </details>
      {onPreview && <details className="task-disclosure"><summary>Trocar só uma peça</summary><SuggestedPiecePicker components={suggested} currentComponents={currentComponents} onPreview={onPreview} disabled={disabled} /></details>}

    </Card>
  );
}

// Shared by budget and ready-build entrypoints. Fan packs have quantities and
// multiple identities; they must not be treated as a replaceable single slot.
export function SuggestedPiecePicker({ components = {}, currentComponents = {}, onPreview, disabled = false }) {
  const [selectedType, setSelectedType] = useState('');
  const choices = [...componentTypes, 'cooler'].flatMap((type) => {
    const value = components[type] || components[`${type}Id`];
    const component = typeof value === 'string' ? { id: value } : value;
    const current = currentComponents[type];
    const currentId = typeof current === 'string' ? current : current?.id;
    return component?.id && component.id !== currentId ? [{ type, component }] : [];
  });
  const selected = choices.find(({ type }) => type === selectedType);

  if (!onPreview) return null;

  return <div className="stack">
    <p>Troque apenas uma peça e mantenha o restante da montagem.</p>
    {choices.length ? <>
      <Select label="Peça sugerida para substituir" value={selected?.type || ''} disabled={disabled}
        options={[{ value: '', label: 'Escolha uma peça' }, ...choices.map(({ type, component }) => ({
          value: type, label: `${componentLabels[type]}: ${component.name || component.id}`
        }))]} onChange={(event) => setSelectedType(event.target.value)} />
      <Button disabled={disabled || !selected} onClick={() => selected && onPreview(selected.type, selected.component)}>
        Pré-visualizar esta peça
      </Button>
    </> : <p>Não há uma peça individual diferente para pré-visualizar nesta sugestão.</p>}
    {components.fans?.length > 0 && <p className="hint-text">Para ajustar packs e quantidades de ventoinhas, use a seção Refrigeração no assistente.</p>}
  </div>;
}
