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
import { formatCatalogScore } from '../../utils/catalogSelection.js';
import ComponentImage from './ComponentImage.jsx';

export default function ComponentCard({ component, onSelect, onLinks, onCompare, compared = false, compareDisabled = false, selected = false, compatibilityPreview = null }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const specs = component?.specs && typeof component.specs === 'object' ? component.specs : {};
  const keys = specKeys([component]);
  const name = component?.name || 'Componente sem nome';

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
          {keys.slice(0, 5).map((key) => (
            <div key={key}>
              <dt>{specLabel(key)}</dt>
              <dd>{formatSpecValue(key, specs[key])}</dd>
            </div>
          ))}
        </dl>
        {['cpu', 'gpu', 'ram', 'storage'].includes(component?.category) && <p className="hint-text" title="Índices estimados, comparáveis apenas na mesma categoria. Veja a metodologia do catálogo.">Índice estimado: {formatCatalogScore(catalogPerformanceScore(component))} / 100<br />Índice por R$ 1.000: {formatCatalogScore(componentValueScore(component))}</p>}
        {compatibilityPreview && <div className="catalog-compatibility-note">
          <p>{compatibilityPreview.status === 'compatible' ? 'Compatível nas regras verificadas' : compatibilityPreview.status === 'incompatible' ? 'Conflito na montagem resultante' : 'Verificação incompleta'}</p>
          {[...(compatibilityPreview.alerts || []), ...(compatibilityPreview.unverifiedChecks || [])].length > 0 && <details><summary>Ver motivos de compatibilidade</summary><ul>{[...(compatibilityPreview.alerts || []), ...(compatibilityPreview.unverifiedChecks || [])].map((item, index) => <li key={`${item.code}-${index}`}>{item.message}</li>)}</ul></details>}
        </div>}
        <div className="component-card-price">
          <strong className="price">{formatCurrency(component?.price)}</strong>
          <ReferencePriceNote component={component} compact />
        </div>
        <div className="button-row">
          {onSelect && (
            <Button type="button" onClick={() => onSelect(component)} variant={selected ? 'success' : 'primary'}
              aria-pressed={selected} aria-label={`${selected ? 'Selecionado' : 'Selecionar'}: ${name}`}>
              {selected ? <Check size={18} aria-hidden="true" /> : <PlusCircle size={18} aria-hidden="true" />}
              {selected ? 'Selecionado' : 'Selecionar'}
            </Button>
          )}
          {onLinks && (
            <Button type="button" onClick={() => onLinks(component)} variant="secondary" aria-label={`Lojas para ${name}`}>
              <ExternalLink size={18} aria-hidden="true" />
              Lojas
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={() => setDetailsOpen(true)} aria-label={`Detalhes de ${name}`}>Detalhes</Button>
          {onCompare && <Button type="button" variant={compared ? 'success' : 'secondary'} disabled={compareDisabled}
            aria-pressed={compared} aria-label={`${compared ? 'Retirar da comparação' : 'Comparar'}: ${name}`} onClick={() => onCompare(component)}>
            {compared ? 'Na comparação' : 'Comparar'}
          </Button>}
        </div>
      </Card>
      <Modal open={detailsOpen} title={name} onClose={() => setDetailsOpen(false)}>
        <ComponentImage component={component} />
        <p>{component?.brand || 'Marca não informada'} · {componentLabels[component?.category]}</p>
        {component?.partNumber && <p>Modelo: {component.partNumber}</p>}
        <p className="price">{formatCurrency(component?.price)}</p>
        <ReferencePriceNote component={component} />
        <p className="hint-text">Especificações do cadastro; taxas máximas dependem do sistema. Confira os dados do fabricante antes da compra.</p>
        <dl className="spec-grid component-details">
          {keys.map((key) => (
            <div key={key}><dt>{specLabel(key)}</dt><dd>{formatSpecValue(key, specs[key])}</dd></div>
          ))}
        </dl>
        {Object.keys(specs).length === 0 && <p>Especificações não informadas para este componente.</p>}
        {component?.specSourceUrl?.startsWith('https://') && <p><a href={component.specSourceUrl} target="_blank" rel="noopener noreferrer">Consultar especificações do fabricante</a></p>}
      </Modal>
    </>
  );
}
