import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import Select from '../ui/Select.jsx';
import Input from '../ui/Input.jsx';
import { fanPackPrice } from '../../utils/buildHelpers.js';
import { formatCurrency } from '../../utils/formatCurrency.js';

export default function CoolingPanel({ build, byType = {}, loading, error, onRetry }) {
  const cooler = build.selectedComponents.cooler;
  const fans = build.selectedComponents.fans || [];
  const fanOptions = byType.fan || [];
  function updateFan(index, changes) {
    build.actions.setFans(fans.map((fan, i) => i === index ? { ...fan, ...changes } : fan));
  }
  return <Card className="cooling-panel">
    <h3>Refrigeração complementar (opcional)</h3>
    <p>Escolha um cooler e ventoinhas sem adicionar etapas obrigatórias. A refrigeração não gera ganho de FPS estimado. Confira encaixes, espaço e consumo na análise.</p>
    {loading && <p role="status">Carregando opções de refrigeração...</p>}
    {error && <p role="alert">{error} <Button variant="ghost" onClick={onRetry}>Tentar novamente</Button></p>}
    <Select label="Cooler do processador" value={cooler?.id || ''} options={[
      { value: '', label: 'Sem cooler adicional' },
      ...((cooler && !(byType.cooler || []).some(item => item.id === cooler.id)) ? [{ value: cooler.id, label: cooler.name || cooler.id }] : []),
      ...(byType.cooler || []).map(item => ({ value: item.id, label: `${item.name} · ${formatCurrency(item.price)}` }))
    ]} onChange={event => {
      const next = (byType.cooler || []).find(item => item.id === event.target.value);
      if (next) build.actions.selectComponent('cooler', next);
      else build.actions.removeComponent('cooler');
    }} />
    {cooler && <Button variant="ghost" onClick={() => build.actions.removeComponent('cooler')}>Remover cooler</Button>}
    <p>Quantidade de ventoinhas = pacotes do produto. O preço usa pacotes; consumo e ocupação usam unidades por pacote.</p>
    {fans.map((fan, index) => <fieldset key={`${index}-${fan.id}`} className="form-grid">
      <legend>Ventoinhas {index + 1}</legend>
      <Select label={`Modelo de ventoinha ${index + 1}`} value={fan.id} options={[
        ...(!fanOptions.some(item => item.id === fan.id) ? [{ value: fan.id, label: fan.name || fan.id }] : []),
        ...fanOptions.filter(item => item.id === fan.id || !fans.some(selected => selected.id === item.id)).map(item => ({ value: item.id, label: `${item.name} · ${formatCurrency(item.price)} / pacote` }))
      ]} onChange={event => { const next = fanOptions.find(item => item.id === event.target.value); if (next) updateFan(index, next); }} />
      <Input label={`Pacotes de ventoinhas ${index + 1}`} type="number" min="1" max="20" step="1" value={fan.quantity} onChange={event => {
        const quantity = Number(event.target.value);
        if (Number.isInteger(quantity) && quantity >= 1 && quantity <= 20) updateFan(index, { quantity });
      }} />
      <p>{fan.specs?.unitsPerPack ? `${fan.quantity * fan.specs.unitsPerPack} ventoinha(s) física(s)` : 'Unidades por pacote não informadas: montagem não verificada'} · {formatCurrency(fanPackPrice(fan))}</p>
      <Button variant="ghost" onClick={() => build.actions.setFans(fans.filter((_, i) => i !== index))}>Remover ventoinhas {index + 1}</Button>
    </fieldset>)}
    <Select label="Adicionar ventoinhas" value="" options={[{ value: '', label: 'Selecione um produto' }, ...fanOptions.filter(item => !fans.some(fan => fan.id === item.id)).map(item => ({ value: item.id, label: item.name }))]} onChange={event => {
      const fan = fanOptions.find(item => item.id === event.target.value);
      if (fan) build.actions.setFans([...fans, { ...fan, quantity: 1 }]);
    }} />
  </Card>;
}
