import ComponentIdentity from '../componentsCatalog/ComponentIdentity.jsx';
import { usesIntegratedGraphics } from '../../../../src/utils/graphicsSelection.js';
import { componentLabels, componentTypes } from '../../utils/componentLabels.js';

export default function BuildComponentsPreview({ components = {} }) {
  const parts = [...componentTypes, 'cooler'].flatMap(category => {
    const component = components[category] || components[`${category}Id`];
    return component ? [{ component, category }] : [];
  }).concat((Array.isArray(components.fans) ? components.fans : []).map(component => ({ component, category: 'fan' })));
  if (!parts.length) return <p>Componentes não informados.</p>;
  return <ul className="build-parts-list component-preview-list">
    {usesIntegratedGraphics(components) && <li><span>Placa de vídeo</span><strong>Vídeo integrado à CPU · sem compra separada</strong></li>}
    {parts.map(({ component, category }, index) => <li key={`${category}-${index}`}>
      <span>{componentLabels[category]}{category === 'fan' ? ` · ${component.quantity ?? 1} pack(s)` : ''}</span>
      <ComponentIdentity component={component} category={category} />
    </li>)}
  </ul>;
}
