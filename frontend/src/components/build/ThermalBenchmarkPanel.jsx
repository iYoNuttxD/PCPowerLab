import { useId } from 'react';
import Card from '../ui/Card.jsx';
import { getThermalBenchmark } from '../../utils/thermalBenchmarks.js';

export default function ThermalBenchmarkPanel({ cpu, cooler }) {
  const headingId = useId();
  const captionId = useId();
  const benchmark = getThermalBenchmark(cpu, cooler);
  const missingSelection = !cpu || !cooler;
  const selectionPrompt = !cpu && !cooler
    ? 'Selecione um processador e um cooler para consultar testes publicados.'
    : !cpu
      ? 'Selecione um processador para consultar testes publicados com este cooler.'
      : 'Selecione um cooler para consultar testes publicados com este processador.';

  return <Card className="thermal-benchmark-panel" aria-labelledby={headingId}>
    <h3 id={headingId}>Temperatura em teste publicado</h3>
    {!benchmark ? <p role="status">{missingSelection
      ? selectionPrompt
      : 'Ainda não há teste publicado cadastrado para este par de processador e cooler.'}</p>
      : <>
        <p className="thermal-benchmark-pair">{benchmark.cpu.name} + {benchmark.cooler.name} ({benchmark.cooler.partNumber})</p>
        <p className="thermal-benchmark-conditions">
          Ambiente de {benchmark.conditions.ambientCelsius} °C · {benchmark.conditions.fanPwmPercent}% PWM · Carga de {benchmark.conditions.chartPowerLabelWatts} W<br />
          {benchmark.conditions.workload} por {benchmark.conditions.loadDurationMinutes} min · Repouso por {benchmark.conditions.idleDurationMinutes} min
        </p>
        <figure className="thermal-benchmark-chart" aria-labelledby={captionId}>
          <figcaption id={captionId}>Temperaturas reportadas pela fonte (°C)</figcaption>
          <ul className="thermal-benchmark-bars">
            {benchmark.measurements.map(measurement => <li key={measurement.id} className="thermal-benchmark-bar">
              <div className="thermal-benchmark-bar-label"><span>{measurement.label}</span><strong>{measurement.temperatureCelsius} °C</strong></div>
              <div className="thermal-benchmark-bar-track" aria-hidden="true">
                <span className={`thermal-benchmark-bar-fill thermal-benchmark-bar-fill--${measurement.id}`} style={{ width: `${measurement.temperatureCelsius}%` }} />
              </div>
            </li>)}
          </ul>
          <div className="thermal-benchmark-axis" aria-hidden="true"><span>0 °C</span><span>100 °C</span></div>
        </figure>
        <p className="chart-caption">Referência de laboratório; não prevê a temperatura da sua montagem.</p>
        <details className="analysis-help thermal-benchmark-details">
          <summary>Fonte e condições completas do teste</summary>
          <p>Fonte: <a href={benchmark.source.url} target="_blank" rel="noreferrer">{benchmark.source.publisher}: {benchmark.source.title}</a>. Consulte também o <a href={benchmark.source.chartUrl} target="_blank" rel="noreferrer">gráfico original de temperaturas</a>.</p>
          <dl>
            <div><dt>Placa-mãe</dt><dd>{benchmark.conditions.motherboard}</dd></div>
            <div><dt>Bancada / gabinete</dt><dd>{benchmark.conditions.case}</dd></div>
            <div><dt>Pasta térmica</dt><dd>{benchmark.conditions.thermalPaste}</dd></div>
            <div><dt>Potência indicada no gráfico</dt><dd>{benchmark.conditions.chartPowerLabelWatts} W; não representa uma medição de consumo desta montagem.</dd></div>
          </dl>
          <p>A fonte não informa se os valores são médias ou picos. Resultados restritos a esse par e às condições publicadas. Ventoinhas extras selecionadas na montagem não alteram estes valores.</p>
        </details>
      </>}
  </Card>;
}
