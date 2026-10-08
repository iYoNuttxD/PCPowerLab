import ReferencePriceNote from '../build/ReferencePriceNote.jsx';
import ComponentImage from './ComponentImage.jsx';
import Button from '../ui/Button.jsx';
import { componentLabels } from '../../utils/componentLabels.js';
import { formatCurrency } from '../../utils/formatCurrency.js';
import { formatSpecValue, specKeys, specLabel, catalogPerformanceScore, componentValueScore } from '../../utils/componentPresentation.js';
import { catalogMethodology, formatCatalogScore, isCatalogComponentSelected } from '../../utils/catalogSelection.js';

export default function ComponentComparison({ components, onRemove, onSelect, selectedComponents = {} }) {
  if (components.length < 2) return <p>Selecione pelo menos duas peças da mesma categoria.</p>;
  if (components.some(component => component.category !== components[0].category)) return <p role="alert">Compare somente peças da mesma categoria.</p>;
  const rows = [
    ['Marca', components.map(component => component.brand || 'Não informado')],
    ['Modelo / código', components.map(component => component.partNumber || 'Não informado')],
    ['Preço de referência', components.map(component => formatCurrency(component.price))],
    ...specKeys(components).map(key => [specLabel(key), components.map(component => formatSpecValue(key, component.specs?.[key]))]),
    ['Desempenho estimado (0–100)', components.map(component => formatCatalogScore(catalogPerformanceScore(component)))],
    ['Índice por real (pontos / R$ 1.000)', components.map(component => formatCatalogScore(componentValueScore(component)))]
  ];
  return (
    <section className="panel-card component-comparison" aria-label="Comparação de peças">
      <h2>Compare {componentLabels[components[0].category]}</h2>
      <p>Compare especificações e preços. A compatibilidade com sua montagem é verificada no resumo.</p>
      <p className="hint-text">“Diferença” destaca o que muda entre as peças. Dados ausentes aparecem como “Não informado”.</p>
      <details><summary>Metodologia e limites dos índices</summary><p>{catalogMethodology}</p></details>
      <p className="comparison-scroll-hint">Deslize a tabela para os lados para ver todas as peças. Pelo teclado, foque a tabela e use as setas.</p>
      <div className="analysis-table-scroll" role="region" aria-label="Tabela de comparação de peças" tabIndex={0}>
        <table className="analysis-table component-comparison-table">
          <caption>Peças da mesma categoria · preços de referência</caption>
          <thead><tr><th scope="col">Característica</th>{components.map(component => <th scope="col" key={component.id}>{component.name}</th>)}</tr></thead>
          <tbody>
            <tr><th scope="row">Fotografia</th>{components.map(component => <td key={component.id}><ComponentImage component={component} /></td>)}</tr>
            <tr><th scope="row">Condições da referência</th>{components.map(component => <td key={component.id}><ReferencePriceNote component={component} compact /></td>)}</tr>
            {rows.map(([label, values]) => {
              const differs = new Set(values).size > 1;
              return <tr key={label} className={differs ? 'comparison-difference' : ''}><th scope="row">{label}{differs && <small className="comparison-difference-label">Diferença</small>}</th>{values.map((value, index) => <td key={components[index].id}>{value}</td>)}</tr>;
            })}
            {onSelect && <tr><th scope="row">Minha montagem</th>{components.map(component => {
              const selected = isCatalogComponentSelected(selectedComponents, component);
              return <td key={component.id}><Button onClick={() => onSelect(component)} disabled={selected} aria-label={`${selected ? 'Selecionado' : 'Selecionar'}: ${component.name}`}>{selected ? 'Selecionado' : 'Selecionar'}</Button></td>;
            })}</tr>}
            {onRemove && <tr><th scope="row">Seleção</th>{components.map(component => <td key={component.id}><Button variant="ghost" onClick={() => onRemove(component.id)} aria-label={`Remover ${component.name} da comparação`}>Remover</Button></td>)}</tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
