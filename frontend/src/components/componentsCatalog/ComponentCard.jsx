import CoolingAssessmentNotice from '../compatibility/CoolingAssessmentNotice.jsx';
import ReferencePriceNote from '../build/ReferencePriceNote.jsx';
import { useState } from 'react';
import { Check, ExternalLink, PlusCircle } from 'lucide-react';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import Modal from '../ui/Modal.jsx';
import { componentLabels } from '../../utils/componentLabels.js';
import { formatCurrency } from '../../utils/formatCurrency.js';
import { formatSpecValue, specKeys, specLabel, catalogPerformanceScore, componentValueScore } from '../../utils/componentPresentation.js';
import { performanceScoreLabel } from '../../utils/performanceMethodology.js';
import { formatCatalogScore } from '../../utils/catalogSelection.js';
import ComponentImage from './ComponentImage.jsx';
import { verifiedFeatureFields, formatVerifiedFeature } from '../../utils/verifiedFeaturesPresentation.js';

export default function ComponentCard({ component, onSelect, onLinks, onCompare, compared = false, compareDisabled = false, selected = false, compatibilityPreview = null, selectLabel = 'Selecionar', selectedLabel = 'Selecionado', children }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const specs = component?.specs && typeof component.specs === 'object' ? component.specs : {};
  const keys = specKeys([component]);
  const primaryKeys = component?.category === 'fan' ? ['diameterMm', 'connector', 'unitsPerPack', 'powerWatts']
    : component?.category === 'cooler' ? keys.slice(0, 4)
      : ({ cpu: ['socket', 'cores'], gpu: ['vramGb', 'recommendedPsuWatts'], motherboard: ['socket', 'memoryType'], ram: ['capacityGb', 'memoryType'], storage: ['capacityGb', 'interface'], psu: ['watts', 'efficiency'], case: ['supportedFormFactors', 'maxGpuLengthMm'] })[component?.category] || keys.slice(0, 2);
  const name = component?.name || 'Componente sem nome';
  const performanceUnavailable = component?.performanceModelStatus === 'unavailable';
  const performanceScore = performanceUnavailable ? null : catalogPerformanceScore(component);

  return (
    <>
      <Card className={`component-card ${selected ? 'is-selected' : ''}`} as="article">
        <div className="component-card-header">
          <Badge tone={selected ? 'green' : 'cyan'}>{componentLabels[component?.category] || component?.category}</Badge>
        </div>
        <ComponentImage component={component} />
        <h3 title={name}>{name}</h3>
        <p className="component-brand" title={component?.brand}>{component?.brand || 'Marca não informada'}</p>
        <dl className="spec-grid">
          {primaryKeys.map((key) => (
            <div key={key}>
              <dt>{specLabel(key)}</dt>
              <dd>{formatSpecValue(key, specs[key])}</dd>
            </div>
          ))}
        </dl>
        <div className="component-card-context">
        {performanceUnavailable && <p className="component-performance-unavailable">Desempenho não estimado</p>}
        {performanceScore !== null && <details className="component-score-disclosure"><summary>Índice de desempenho</summary><p className="hint-text">{performanceScoreLabel(component)}: {formatCatalogScore(performanceScore)} / 100</p></details>}
        {component?.category === 'motherboard' && component?.verifiedFeatures && <p className="component-feature-summary">
          M.2: {formatVerifiedFeature('m2Slots', component.verifiedFeatures.fields?.m2Slots)} · Wi-Fi: {formatVerifiedFeature('wifi', component.verifiedFeatures.fields?.wifi)}
        </p>}
        {compatibilityPreview && <div className="catalog-compatibility-note">
          <p>{compatibilityPreview.status === 'compatible' ? 'Compatível nas regras verificadas' : compatibilityPreview.status === 'incompatible' ? 'Conflito na montagem resultante' : 'Verificação incompleta'}</p>
          <CoolingAssessmentNotice result={compatibilityPreview} />
          {[...(compatibilityPreview.alerts || []), ...(compatibilityPreview.unverifiedChecks || [])].length > 0 && <details><summary>Ver motivos de compatibilidade</summary><ul>{[...(compatibilityPreview.alerts || []), ...(compatibilityPreview.unverifiedChecks || [])].map((item, index) => <li key={`${item.code}-${index}`}>{item.message}</li>)}</ul></details>}
        </div>}
        </div>
        <div className="component-card-price">
          <strong className="price">{formatCurrency(component?.price)}</strong>
          <ReferencePriceNote component={component} compact />
        </div>
        <div className="button-row">
          {onSelect && (
            <Button type="button" onClick={() => onSelect(component)} variant={selected ? 'success' : 'primary'}
              aria-pressed={selected} aria-label={`${selected ? selectedLabel : selectLabel}: ${name}`}>
              {selected ? <Check size={18} aria-hidden="true" /> : <PlusCircle size={18} aria-hidden="true" />}
              {selected ? selectedLabel : selectLabel}
            </Button>
          )}
          {onLinks && (
            <Button type="button" onClick={() => onLinks(component)} variant="secondary" aria-label={`Lojas para ${name}`}>
              <ExternalLink size={18} aria-hidden="true" />
              Lojas
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={() => setDetailsOpen(true)} aria-haspopup="dialog" aria-label={`Detalhes de ${name}`}>Detalhes</Button>
          {onCompare && <Button type="button" variant={compared ? 'success' : 'secondary'} disabled={compareDisabled}
            aria-pressed={compared} aria-label={`${compared ? 'Retirar da comparação' : 'Comparar'}: ${name}`} onClick={() => onCompare(component)}>
            {compared ? 'Na comparação' : 'Comparar'}
          </Button>}
        </div>
        {children}
      </Card>
      <Modal open={detailsOpen} title={name} onClose={() => setDetailsOpen(false)}>
        <ComponentImage component={component} />
        <p>{component?.brand || 'Marca não informada'} · {componentLabels[component?.category]}</p>
        {component?.partNumber && <p>Modelo: {component.partNumber}</p>}
        <p className="price">{formatCurrency(component?.price)}</p>
        <ReferencePriceNote component={component} />
        {Array.isArray(component?.selectionNotes) && component.selectionNotes.length > 0 && <section><h3>Cuidados ao escolher</h3><ul>{component.selectionNotes.map(note => <li key={note}>{note}</li>)}</ul></section>}
        <PerformanceModelNotice component={component} />
        {!performanceUnavailable && ['cpu', 'gpu', 'ram', 'storage'].includes(component?.category) && <p className="hint-text" title="Índices do modelo, comparáveis apenas na mesma categoria. Sem benchmark medido.">{performanceScore === null ? 'Pontuação de desempenho' : performanceScoreLabel(component)}: {formatCatalogScore(performanceScore)}{performanceScore !== null && ' / 100'}<br />Índice por R$ 1.000: {formatCatalogScore(componentValueScore(component))}</p>}
        <dl className="spec-grid component-details">
          {keys.map((key) => (
            <div key={key}><dt>{specLabel(key)}</dt><dd>{formatSpecValue(key, specs[key])}</dd></div>
          ))}
        </dl>
        {component?.verifiedFeatures && <section className="verified-feature-details" aria-label="Recursos verificados da placa-mãe">
          <h3>Expansão e conectividade</h3>
          <dl className="spec-grid component-details">
            {Object.entries(verifiedFeatureFields).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{formatVerifiedFeature(key, component.verifiedFeatures.fields?.[key])}</dd></div>)}
          </dl>
          {component.verifiedFeatures.notes?.length > 0 && <ul>{component.verifiedFeatures.notes.map(note => <li key={note}>{note}</li>)}</ul>}
          <p className="hint-text">Verificação: {component.verifiedFeatures.verifiedAt || 'data não informada'}. Recurso não confirmado não significa ausência.</p>
          <ul>{(component.verifiedFeatures.sourceUrls || []).filter(url => typeof url === 'string' && url.startsWith('https://')).map((url, index) => <li key={url}><a href={url} target="_blank" rel="noopener noreferrer">Fonte do fabricante {index + 1}</a></li>)}</ul>
        </section>}
        {Object.keys(specs).length === 0 && <p>Especificações não informadas para este componente.</p>}
        {component?.specSourceUrl?.startsWith('https://') && <p><a href={component.specSourceUrl} target="_blank" rel="noopener noreferrer">Consultar especificações do fabricante</a></p>}
      </Modal>
    </>
  );
}

export function PerformanceModelNotice({ component }) {
  if (component?.performanceModelStatus !== 'unavailable') return null;
  return <section aria-label="Limites do modelo de desempenho">
    <h3>Desempenho não estimado</h3>
    <p>{typeof component.performanceModelNotes === 'string' && component.performanceModelNotes.trim()
      ? component.performanceModelNotes : 'Não há modelo de desempenho disponível para este componente.'}</p>
  </section>;
}
