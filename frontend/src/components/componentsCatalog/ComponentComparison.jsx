import ComponentImage from './ComponentImage.jsx';
import Button from '../ui/Button.jsx';
import { componentLabels } from '../../utils/componentLabels.js';
import { formatCurrency } from '../../utils/formatCurrency.js';
import { formatSpecValue, specKeys, specLabel } from '../../utils/componentPresentation.js';

export default function ComponentComparison({ components, onRemove }) {
  if (!components.length) return null;
  return (
    <section className="panel-card component-comparison" aria-label="Comparação de peças">
      <h2>Compare {componentLabels[components[0].category]}</h2>
      <p>Especificações do cadastro, lado a lado. A comparação não verifica compatibilidade com sua montagem nem substitui as especificações do fabricante.</p>
      <p className="hint-text">As taxas máximas de memória e armazenamento dependem do sistema e das condições de uso. Campo ausente aparece como “Não informado”.</p>
      <p className="comparison-scroll-hint">Deslize a tabela para os lados para ver todas as peças. Pelo teclado, foque a tabela e use as setas.</p>
      <div className="analysis-table-scroll" role="region" aria-label="Tabela de comparação de peças" tabIndex={0}>
        <table className="analysis-table component-comparison-table">
          <caption>Peças da mesma categoria · preços estimados, sem atualização em tempo real</caption>
          <thead><tr><th scope="col">Característica</th>{components.map(component => <th scope="col" key={component.id}>{component.name}</th>)}</tr></thead>
          <tbody>
            <tr><th scope="row">Fotografia do modelo</th>{components.map(component => <td key={component.id}><ComponentImage component={component} /></td>)}</tr>
            <tr><th scope="row">Marca</th>{components.map(component => <td key={component.id}>{component.brand || 'Não informado'}</td>)}</tr>
            <tr><th scope="row">Modelo / código</th>{components.map(component => <td key={component.id}>{component.partNumber || 'Não informado'}</td>)}</tr>
            <tr><th scope="row">Preço estimado</th>{components.map(component => <td key={component.id}>{formatCurrency(component.price)}</td>)}</tr>
            {specKeys(components).map(key => <tr key={key}><th scope="row">{specLabel(key)}</th>{components.map(component => <td key={component.id}>{formatSpecValue(key, component.specs?.[key])}</td>)}</tr>)}
            {onRemove && <tr><th scope="row">Seleção</th>{components.map(component => <td key={component.id}><Button variant="ghost" onClick={() => onRemove(component.id)} aria-label={`Remover ${component.name} da comparação`}>Remover</Button></td>)}</tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
