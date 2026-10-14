import { useEffect, useId, useState } from 'react';
import ComponentCard from '../componentsCatalog/ComponentCard.jsx';
import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import TaskTabs, { TaskPanel } from '../ui/TaskTabs.jsx';
import { fanPackPrice } from '../../utils/buildHelpers.js';
import { formatCurrency } from '../../utils/formatCurrency.js';
import '../../styles/cooling.css';

function withPreservedSelections(options, selected) {
  const known = new Set(options.map(item => item.id));
  return [...selected.filter(item => item && !known.has(item.id)), ...options];
}

export default function CoolingPanel({ build, byType = {}, loading, error, onRetry, onChange, initialSection = 'cooler', activeSection, onSectionChange }) {
  const cooler = build.selectedComponents.cooler;
  const fans = build.selectedComponents.fans || [];
  const id = `cooling-choice-${useId()}`;
  const [localSection, setLocalSection] = useState(initialSection === 'fans' ? 'fans' : 'cooler');
  useEffect(() => setLocalSection(initialSection === 'fans' ? 'fans' : 'cooler'), [initialSection]);
  const section = activeSection === undefined ? localSection : activeSection === 'fans' ? 'fans' : 'cooler';
  function setSection(next) {
    setLocalSection(next);
    onSectionChange?.(next);
  }
  const coolerOptions = byType.cooler || [];
  const fanOptions = byType.fan || [];
  const coolers = withPreservedSelections(coolerOptions, [cooler]);
  const fanProducts = withPreservedSelections(fanOptions, fans);
  function change(callback) {
    onChange?.();
    callback();
  }
  function removeFan(fanId) {
    change(() => build.actions.setFans(fans.filter(fan => fan.id !== fanId)));
  }
  function updateQuantity(fanId, value) {
    const quantity = Number(value);
    if (Number.isInteger(quantity) && quantity >= 1 && quantity <= 20) {
      change(() => build.actions.setFans(fans.map(fan => fan.id === fanId ? { ...fan, quantity } : fan)));
    }
  }
  function preservedNotice(component, options) {
    if (options.some(item => item.id === component.id)) return null;
    return <p className="hint-text" role="status">{loading || error ? 'Seleção atual preservada.' : 'Fora do catálogo ativo · seleção preservada.'}</p>;
  }

  return <Card className="cooling-panel cooling-card-selection">
    <h3>Escolha a refrigeração</h3>
    <p className="hint-text">Opcional. As peças escolhidas entram no total da montagem.</p>
    {loading && <p role="status">Carregando opções de refrigeração...</p>}
    {error && <p role="alert">{error} <Button variant="ghost" onClick={onRetry}>Tentar novamente</Button></p>}
    <TaskTabs id={id} label="Categorias de refrigeração" value={section} onChange={setSection} tabs={[
      { id: 'cooler', label: `Cooler do processador${cooler ? ' · 1 selecionado' : ''}` },
      { id: 'fans', label: `Ventoinhas extras${fans.length ? ` · ${fans.length} produto(s)` : ''}` }
    ]} />
    <TaskPanel id={id} value="cooler" active={section === 'cooler'}>
      {build.selectedComponents.cpu && <p className="hint-text">CPU: {build.selectedComponents.cpu.name}</p>}
      {!cooler && <p className="hint-text">Nenhum cooler adicional selecionado. Você pode continuar sem escolher agora.</p>}
      <div className="cards-grid component-grid cooling-product-grid">
        {coolers.map(component => {
          const selected = cooler?.id === component.id;
          return <ComponentCard key={component.id} component={selected ? cooler : component} selected={selected}
            onSelect={() => { if (!selected) change(() => build.actions.selectComponent('cooler', component)); }}>
            {selected && <div className="cooling-card-controls">
              {preservedNotice(cooler, coolerOptions)}
              <Button variant="ghost" aria-label={`Remover cooler: ${cooler.name || cooler.id}`} onClick={() => change(() => build.actions.removeComponent('cooler'))}>Remover cooler</Button>
            </div>}
          </ComponentCard>;
        })}
      </div>
      {!loading && !error && coolers.length === 0 && <p role="status">Nenhum cooler disponível no catálogo.</p>}
    </TaskPanel>
    <TaskPanel id={id} value="fans" active={section === 'fans'}>
      <p className="hint-text">Adicione produtos e escolha a quantidade de pacotes.</p>
      <div className="cards-grid component-grid cooling-product-grid">
        {fanProducts.map(component => {
          const selected = fans.find(fan => fan.id === component.id);
          const product = selected || component;
          const units = product.specs?.unitsPerPack;
          const knownUnits = Number.isInteger(units) && units > 0;
          return <ComponentCard key={component.id} component={product} selected={Boolean(selected)} selectLabel="Adicionar" selectedLabel="Adicionado"
            onSelect={() => { if (!selected) change(() => build.actions.setFans([...fans, { ...component, quantity: 1 }])); }}>
            <div className="cooling-card-controls">
              {!selected && <p className="hint-text">{knownUnits ? `1 pacote = ${units} ventoinha(s)` : 'Unidades por pacote não informadas'}</p>}
              {selected && <>
                {preservedNotice(selected, fanOptions)}
                <Input label={`Pacotes: ${selected.name || selected.id}`} type="number" min="1" max="20" step="1" value={selected.quantity}
                  onChange={event => updateQuantity(selected.id, event.target.value)} />
                <p>{knownUnits ? `${selected.quantity} pacote(s) × ${units} unidades = ${selected.quantity * units} ventoinhas` : 'Quantidade física não verificada: faltam unidades por pacote.'}</p>
                <strong>Subtotal: {formatCurrency(fanPackPrice(selected))}</strong>
                <Button variant="ghost" aria-label={`Remover ventoinhas: ${selected.name || selected.id}`} onClick={() => removeFan(selected.id)}>Remover ventoinhas</Button>
              </>}
            </div>
          </ComponentCard>;
        })}
      </div>
      {!loading && !error && fanProducts.length === 0 && <p role="status">Nenhuma ventoinha disponível no catálogo.</p>}
    </TaskPanel>
    <details className="cooling-help"><summary>Antes de comprar</summary><p>Confira encaixe, espaço e consumo na análise. Não escolher um cooler aqui não confirma que o processador inclua um. Não estimamos ganho de FPS com refrigeração.</p></details>
  </Card>;
}
