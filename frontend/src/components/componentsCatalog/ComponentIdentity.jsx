import ComponentImage from './ComponentImage.jsx';
import { useCatalogComponent } from '../../hooks/useComponents.js';

// Accept objects, component IDs and fanId snapshots, never infer identity from a name.
export default function ComponentIdentity({ component, category, children, fallback = 'Não informado' }) {
  const { component: current } = useCatalogComponent(component);
  const name = current?.name || component?.name || (typeof component === 'string' ? component : component?.id || component?.fanId);
  return <div className="component-identity">
    {component && <ComponentImage component={component} category={category} compact />}
    <div className="component-identity-text"><strong>{name || fallback}</strong>{children}</div>
  </div>;
}
