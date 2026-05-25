import { useMemo, useState } from 'react';
import ComponentCard from '../components/componentsCatalog/ComponentCard.jsx';
import Modal from '../components/ui/Modal.jsx';
import Input from '../components/ui/Input.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import PurchaseLinksList from '../components/build/PurchaseLinksList.jsx';
import { useComponents } from '../hooks/useComponents.js';
import { purchaseLinksService } from '../services/purchaseLinksService.js';
import { componentLabels, componentTypes } from '../utils/componentLabels.js';

export default function ComponentsCatalog() {
  const { components, loading, error, reload } = useComponents();
  const [activeType, setActiveType] = useState('all');
  const [search, setSearch] = useState('');
  const [links, setLinks] = useState(null);
  const [modalTitle, setModalTitle] = useState('');

  const filteredComponents = useMemo(() => components.filter((component) => {
    const matchesType = activeType === 'all' || component.category === activeType;
    const term = search.trim().toLowerCase();
    const matchesSearch = !term
      || component.name?.toLowerCase().includes(term)
      || component.brand?.toLowerCase().includes(term);

    return matchesType && matchesSearch;
  }), [components, activeType, search]);

  async function openLinks(component) {
    setModalTitle(`Lojas para ${component.name}`);
    try {
      const data = await purchaseLinksService.byComponent(component.id);
      setLinks(Array.isArray(data) ? data : []);
    } catch (_error) {
      setLinks([]);
    }
  }

  return (
    <div className="page-stack">
      <section className="page-hero compact-hero">
        <span className="eyebrow">Catálogo técnico</span>
        <h1>Componentes disponíveis</h1>
        <p>Explore a base mockada da API, filtre por categoria e consulte links de compra quando existirem.</p>
      </section>

      <div className="toolbar">
        <Input
          label="Buscar por nome ou marca"
          value={search}
          onChange={(event) => setSearch(event.target.value.slice(0, 80))}
          placeholder="Ex.: Ryzen, RTX, Kingston"
        />
        <div className="segmented-control" aria-label="Filtro de categoria">
          <button className={activeType === 'all' ? 'active' : ''} onClick={() => setActiveType('all')}>Todos</button>
          {componentTypes.map((type) => (
            <button key={type} className={activeType === type ? 'active' : ''} onClick={() => setActiveType(type)}>
              {componentLabels[type]}
            </button>
          ))}
        </div>
      </div>

      {loading && <LoadingSpinner />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {!loading && !error && filteredComponents.length === 0 && <EmptyState title="Nenhum componente encontrado" />}
      <div className="cards-grid">
        {filteredComponents.map((component) => (
          <ComponentCard key={component.id} component={component} onLinks={openLinks} />
        ))}
      </div>

      <Modal open={links !== null} title={modalTitle} onClose={() => setLinks(null)}>
        <PurchaseLinksList links={links || []} variant="single" />
      </Modal>
    </div>
  );
}
