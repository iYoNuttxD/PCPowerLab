import DecisionMethodology from '../build/DecisionMethodology.jsx';
import { useState } from 'react';
import ComponentIdentity from '../componentsCatalog/ComponentIdentity.jsx';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import Select from '../ui/Select.jsx';
import { componentLabels, componentTypes } from '../../utils/componentLabels.js';
import { calculateBuildPrice, recommendationSelection } from '../../utils/buildHelpers.js';
import { formatCurrency } from '../../utils/formatCurrency.js';

export default function RecommendationCard({ recommendation, onApply, onPreview, currentComponents = {}, disabled = false }) {
  if (!recommendation) {
    return (
      <Card>
        <h3>Recomendações</h3>
        <p>Informe orçamento e tipo de uso para gerar uma configuração recomendada.</p>
      </Card>
    );
  }

  const suggested = recommendation.components || {};
  const retainsCooling = ((!Object.hasOwn(suggested, 'cooler') && !Object.hasOwn(suggested, 'coolerId') && currentComponents.cooler)
    || (!Object.hasOwn(suggested, 'fans') && currentComponents.fans?.length));
  const displayedTotal = retainsCooling ? calculateBuildPrice(recommendationSelection(currentComponents, suggested)) : recommendation.totalEstimatedPrice;
  return (
    <Card className="recommendation-card">
      <div className="section-heading compact">
        <h3>Configuração recomendada</h3>
        <strong><small className="estimated-price-label">Total estimado de referência</small>{formatCurrency(displayedTotal)}</strong>
      </div>
      {retainsCooling ? <p>O total inclui a refrigeração atual que será mantida. Esta combinação ainda não foi verificada: compatibilidade e orçamento precisam de nova análise antes de concluir a montagem.</p> : <p>{recommendation.summary || recommendation.strategy}</p>}
      <DecisionMethodology />
      <ul className="build-parts-list">
        {[...componentTypes, ...(recommendation.components?.cooler ? ['cooler'] : [])].map((type) => {
          const component = recommendation.components?.[type];

          return (
            <li key={type}>
              <span>{componentLabels[type]}</span>
              <ComponentIdentity component={component || recommendation.components?.[`${type}Id`]} category={type} fallback="Não sugerido" />
            </li>
          );
        })}
        {(recommendation.components?.fans || []).map((fan, index) => <li key={fan.id || index}><span>Ventoinhas</span><ComponentIdentity component={fan} category="fan"><small>{fan.quantity} pacote(s)</small></ComponentIdentity></li>)}
      </ul>
      <SuggestedPiecePicker components={suggested} currentComponents={currentComponents} onPreview={onPreview} disabled={disabled} />
      {onApply && <p className="hint-text">Usar a recomendação inteira substitui as peças principais. Se ela não incluir refrigeração, as escolhas atuais de cooler e ventoinhas serão mantidas. Execute a análise novamente: total e compatibilidade podem mudar.</p>}
      {onApply && (
        <Button variant="secondary" disabled={disabled} onClick={() => onApply(recommendation)}>
          Usar recomendação inteira
        </Button>
      )}
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
    <p>Quer trocar apenas uma peça? Pré-visualize a sugestão na build atual. As demais peças, incluindo os packs de ventoinhas, o orçamento e o perfil serão preservados.</p>
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
