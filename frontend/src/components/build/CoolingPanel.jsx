import { useEffect, useState } from 'react';
import ComponentIdentity from '../componentsCatalog/ComponentIdentity.jsx';
import CoolingSimulationPanel from './CoolingSimulationPanel.jsx';
import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import Select from '../ui/Select.jsx';
import Input from '../ui/Input.jsx';
import { fanPackPrice } from '../../utils/buildHelpers.js';
import { formatCurrency } from '../../utils/formatCurrency.js';

export default function CoolingPanel({ build, byType = {}, loading, error, onRetry, onChange }) {
  const cooler = build.selectedComponents.cooler;
  const fans = build.selectedComponents.fans || [];
  const fanOptions = byType.fan || [];
  const [fansOpen, setFansOpen] = useState(fans.length > 0);
  useEffect(() => { if (fans.length > 0) setFansOpen(true); }, [fans.length]);
  function change(callback) {
    onChange?.();
    callback();
  }
  function updateFan(index, changes) {
    change(() => build.actions.setFans(fans.map((fan, i) => i === index ? { ...fan, ...changes } : fan)));
  }
  return <Card className="cooling-panel">
    <h3>Cooler e ventoinhas</h3>
    {build.selectedComponents.cpu && <p className="hint-text">CPU: {build.selectedComponents.cpu.name}</p>}
    {loading && <p role="status">Carregando opções de refrigeração...</p>}
    {error && <p role="alert">{error} <Button variant="ghost" onClick={onRetry}>Tentar novamente</Button></p>}
    <Select label="Cooler do processador" revealSelectedValue value={cooler?.id || ''} options={[
      { value: '', label: 'Não escolher agora' },
      ...((cooler && !(byType.cooler || []).some(item => item.id === cooler.id)) ? [{ value: cooler.id, label: cooler.name || cooler.id }] : []),
      ...(byType.cooler || []).map(item => ({ value: item.id, label: `${item.name} · ${formatCurrency(item.price)}` }))
    ]} onChange={event => {
      const next = (byType.cooler || []).find(item => item.id === event.target.value);
      change(() => next ? build.actions.selectComponent('cooler', next) : build.actions.removeComponent('cooler'));
    }} />
    {cooler && <ComponentIdentity component={cooler} category="cooler" />}
    {cooler && <Button variant="ghost" onClick={() => change(() => build.actions.removeComponent('cooler'))}>Remover cooler</Button>}
    <CoolingSimulationPanel cpu={build.selectedComponents.cpu} cooler={cooler} fans={fans} caseComponent={build.selectedComponents.case}
      conditions={build.coolingConditions} onConditionsChange={build.actions.setCoolingConditions} />
    <details className="cooling-fans" open={fansOpen} onToggle={event => setFansOpen(event.currentTarget.open)}>
    <summary>Ventoinhas extras{fans.length > 0 ? ` · ${fans.length} produto(s)` : ' (opcional)'}</summary>
    <p className="hint-text">Quantidade em pacotes. Altera ruído e consumo, não a temperatura simulada.</p>
    {fans.map((fan, index) => <fieldset key={`${index}-${fan.id}`} className="form-grid">
      <legend>Ventoinhas {index + 1}</legend>
      <ComponentIdentity component={fan} category="fan" />
      <Select label={`Modelo de ventoinha ${index + 1}`} value={fan.id} options={[
        ...(!fanOptions.some(item => item.id === fan.id) ? [{ value: fan.id, label: fan.name || fan.id }] : []),
        ...fanOptions.filter(item => item.id === fan.id || !fans.some(selected => selected.id === item.id)).map(item => ({ value: item.id, label: `${item.name} · ${formatCurrency(item.price)} / pacote` }))
      ]} onChange={event => { const next = fanOptions.find(item => item.id === event.target.value); if (next) updateFan(index, next); }} />
      <Input label={`Pacotes de ventoinhas ${index + 1}`} type="number" min="1" max="20" step="1" value={fan.quantity} onChange={event => {
        const quantity = Number(event.target.value);
        if (Number.isInteger(quantity) && quantity >= 1 && quantity <= 20) updateFan(index, { quantity });
      }} />
      <p>{fan.specs?.unitsPerPack ? `${fan.quantity} pacote(s) × ${fan.specs.unitsPerPack} unidades = ${fan.quantity * fan.specs.unitsPerPack} ventoinhas` : 'Unidades por pacote não informadas'} · {formatCurrency(fanPackPrice(fan))}</p>
      <Button variant="ghost" onClick={() => change(() => build.actions.setFans(fans.filter((_, i) => i !== index)))}>Remover ventoinhas {index + 1}</Button>
    </fieldset>)}
    <Select label="Adicionar ventoinhas" value="" options={[{ value: '', label: 'Selecione um produto' }, ...fanOptions.filter(item => !fans.some(fan => fan.id === item.id)).map(item => ({ value: item.id, label: item.name }))]} onChange={event => {
      const fan = fanOptions.find(item => item.id === event.target.value);
      if (fan) change(() => build.actions.setFans([...fans, { ...fan, quantity: 1 }]));
    }} />
    </details>
    <details className="cooling-help"><summary>Antes de comprar</summary><p>Confira encaixe, espaço e consumo na análise. Não escolher um cooler aqui não confirma que o processador inclua um. Não estimamos ganho de FPS com refrigeração.</p></details>
  </Card>;
}
