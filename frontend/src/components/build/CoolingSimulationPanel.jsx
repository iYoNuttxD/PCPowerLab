import { useId } from 'react';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import ThermalBenchmarkPanel from './ThermalBenchmarkPanel.jsx';
import { getThermalBenchmark } from '../../utils/thermalBenchmarks.js';
import { DEFAULT_COOLING_CONDITIONS, simulateCooling } from '../../utils/coolingSimulation.js';
import '../../styles/cooling.css';

const speedOptions = [
  { value: 0.5, label: '50% da rotação máxima' },
  { value: 0.75, label: '75% da rotação máxima' },
  { value: 1, label: '100% da rotação máxima' }
];
const labels = { light: 'Leve', mixed: 'Mista', sustained: 'Sustentada' };
const floor5 = value => Math.floor(value / 5) * 5;
const ceil5 = value => Math.ceil(value / 5) * 5;

function temperatureText(band, limit) {
  const { low, high } = band.temperatureCelsius;
  if (Number.isFinite(limit) && low >= limit) return `≥ ${limit} °C · limite`;
  if (Number.isFinite(limit) && high >= limit) return `${floor5(low)}–${limit} °C+`;
  return `${floor5(low)}–${ceil5(high)} °C`;
}

export default function CoolingSimulationPanel({ cpu, cooler, fans = [], caseComponent, conditions, onConditionsChange }) {
  const headingId = useId();
  const current = { ...DEFAULT_COOLING_CONDITIONS, ...conditions };
  const result = simulateCooling({ cpu, cooler, fans, caseComponent, conditions: current });
  const thermal = result.thermal;
  const acoustics = result.acoustics;
  const bands = (thermal.scenarioBands || []).filter(band => band.available && band.temperatureCelsius);
  const limit = thermal.tjMaxCelsius;
  const axisMax = Number.isFinite(limit) ? limit : Math.max(100, ...bands.map(band => ceil5(band.temperatureCelsius.high)));
  const reachesLimit = bands.some(band => band.centralReachesLimit || band.rangeReachesLimit);
  const fieldErrors = Object.fromEntries((result.conditionsErrors || []).map(error => [error.field, error.message]));
  const update = patch => onConditionsChange?.({ ...current, ...patch });
  const benchmark = getThermalBenchmark(cpu, cooler);
  const fixedControls = acoustics.includedSources?.find(source => source.sourceScope === 'assembly')?.fixedControls;
  const domainNotices = [...new Set((thermal.warnings || [])
    .filter(warning => !['unknown-thermal-limit', 'central-reaches-limit', 'range-crosses-limit'].includes(warning.code))
    .map(warning => warning.message).filter(Boolean))];

  return <Card className="cooling-simulation" aria-labelledby={headingId}>
    <div className="cooling-simulation-heading"><h3 id={headingId}>Temperatura e ruído</h3><Badge tone="yellow">Simulação aproximada</Badge></div>
    <p className="hint-text">Faixas de cenários, não medições. Não confirmam encaixe no gabinete.</p>
    <details className="cooling-simulation-controls">
      <summary>Ajustar cenário · entrada {current.inletCelsius} °C · cooler {Number(current.coolerSpeedFraction) * 100}% RPM</summary>
      <div className="form-grid">
        <Input label="Ar na entrada do cooler (°C)" type="number" min="15" max="35" step="1" value={current.inletCelsius}
          error={fieldErrors.inletCelsius} onChange={event => update({ inletCelsius: event.target.value === '' ? '' : Number(event.target.value) })} />
        <Input label="Potência de referência do cenário (W)" type="number" min="5" max="300" step="1" value={current.referenceHeatWatts ?? ''}
          placeholder={String(cpu?.specs?.tdpWatts || 'Automática')} error={fieldErrors.referenceHeatWatts}
          hint="Em branco: usa TDP/potência-base como hipótese, não consumo medido."
          onChange={event => update({ referenceHeatWatts: event.target.value === '' ? null : Number(event.target.value) })} />
        <Select label="Rotação do cooler" value={current.coolerSpeedFraction} options={speedOptions} onChange={event => update({ coolerSpeedFraction: Number(event.target.value) })} />
        {fans.length > 0 && <Select label="Rotação das ventoinhas extras" value={current.extraFanSpeedFraction} options={speedOptions} onChange={event => update({ extraFanSpeedFraction: Number(event.target.value) })} />}
      </div>
      <p className="hint-text">Cargas de 25%, 60% e 100% da potência escolhida; não são percentuais de uso do CPU. Rotação é RPM, não PWM.</p>
      <Button variant="ghost" onClick={() => onConditionsChange?.({ ...DEFAULT_COOLING_CONDITIONS })}>Restaurar cenário</Button>
    </details>

    {!thermal.available ? <p className="cooling-simulation-notice" role="status">{thermal.message || (!cpu || !cooler ? 'Selecione CPU e cooler para simular a temperatura.' : 'Perfil térmico indisponível para esta seleção. Confira identidade, encaixe e valores do cenário.')}</p> : <>
      <figure className="cooling-temperature-chart">
        <figcaption>Temperatura do CPU · faixas de cenários<small>Faixa: hipóteses exploradas · traço: cenário central</small></figcaption>
        <ul>
          {bands.map(band => {
            const low = Math.min(axisMax, Math.max(0, band.temperatureCelsius.low));
            const high = Math.min(axisMax, band.temperatureCelsius.high);
            const middle = Math.min(axisMax, band.temperatureCelsius.central);
            return <li key={band.id}>
              <div className="cooling-temperature-label"><span>{labels[band.id] || band.id}<small>{Math.round(band.heatWatts)} W</small></span><strong>{temperatureText(band, limit)}</strong></div>
              <div className="cooling-temperature-track" aria-hidden="true">
                <span className="cooling-temperature-band" style={{ left: `${low / axisMax * 100}%`, width: `${Math.max(0, high - low) / axisMax * 100}%` }} />
                <span className="cooling-temperature-central" style={{ '--cooling-central-position': `${middle / axisMax * 100}%` }} />
              </div>
              {band.centralReachesLimit && <small className="cooling-limit-warning">O cenário central atinge ou ultrapassa o limite térmico.</small>}
            </li>;
          })}
        </ul>
        <div className="thermal-benchmark-axis" aria-hidden="true"><span>0 °C</span><span>{axisMax} °C{Number.isFinite(limit) ? ' · limite do CPU' : ''}</span></div>
      </figure>
      {reachesLimit && <p className="cooling-limit-warning" role="status">A faixa pode atingir o limite térmico. “+” indica cenários acima dele, não temperaturas previstas de operação; o CPU pode reduzir potência.</p>}
      {thermal.thermalLimitStatus === 'unknown' && <p className="cooling-simulation-notice">Limite térmico não confirmado para este CPU.</p>}
      {domainNotices.map(message => <p className="cooling-simulation-notice" key={message}>{message}</p>)}
    </>}

    <section className="cooling-noise-result" aria-label="Ruído simulado">
      <div><h4>Ruído da refrigeração selecionada</h4><strong>{acoustics.bandDba ? `${Math.floor(acoustics.bandDba.low)}–${Math.ceil(acoustics.bandDba.high)} dBA` : acoustics.status === 'no-sources' ? 'Sem fontes modeladas' : 'Sem total disponível'}</strong></div>
      <p className="hint-text">A 1 m · cooler e ventoinhas selecionadas. Não inclui o restante do PC, fans do gabinete não selecionados nem o ambiente.</p>
      {!cooler && fans.length > 0 && <p className="cooling-simulation-notice">Somente ventoinhas selecionadas; cooler do processador não modelado.</p>}
      {acoustics.coverage === 'partial' && <p className="cooling-limit-warning" role="status">Subtotal parcial: há fontes sem perfil no cenário.</p>}
      {(acoustics.excludedSources || []).filter(source => source.affectsCoverage || source.selected !== false).map((source, index) => <p className="cooling-simulation-notice" key={`${source.id || source.componentId || 'source'}-${index}`}>{source.name || source.label ? `${source.name || source.label}: ` : ''}{source.message || 'Fonte não modelada neste cenário.'}</p>)}
      {fixedControls && <p className="hint-text">Bomba a {fixedControls.pumpRpm} RPM e fan VRM a {fixedControls.vrmFanRpm} RPM incluídos uma vez.</p>}
    </section>

    <details className="cooling-simulation-method">
      <summary>Hipóteses e fontes</summary>
      <p>Modelo {result.modelVersion}. Resistências equivalentes e faixas são hipóteses de engenharia, sem precisão validada. CPUs compartilham uma hipótese de contato térmico; a mesma potência pode gerar o mesmo resultado.</p>
      <p>As faixas não são intervalos de confiança nem garantias de temperatura. Instalação, pasta térmica, BIOS e ambiente reais podem produzir resultados fora delas.</p>
      <p>Ventoinhas extras entram no ruído, custo e consumo, mas não na temperatura. Os perfis acústicos usam uma distância comum presumida e incluem hipóteses genéricas; não são a soma direta de fichas técnicas.</p>
      <p>Condições ficam na montagem local. Abrir outra build salva restaura o cenário padrão; exportações existentes não incluem esta simulação.</p>
      <ul>{(result.provenance?.sourceUrls || []).map(url => <li key={url}><a href={url} target="_blank" rel="noreferrer">{new URL(url).hostname} · fonte do modelo</a></li>)}</ul>
      {benchmark && <details><summary>Ver referência medida deste par</summary><ThermalBenchmarkPanel cpu={cpu} cooler={cooler} /></details>}
    </details>
  </Card>;
}
