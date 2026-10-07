import { useEffect, useMemo, useState } from 'react';
import ComponentCard from '../components/componentsCatalog/ComponentCard.jsx';
import Modal from '../components/ui/Modal.jsx';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';
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
  const [linksComponent, setLinksComponent] = useState(null);
  const [linksError, setLinksError] = useState('');
  const [linksLoading, setLinksLoading] = useState(false);
  const [linksAttempt, setLinksAttempt] = useState(0);

  const filteredComponents = useMemo(() => components.filter((component) => {
    const matchesType = activeType === 'all' || component.category === activeType;
    const term = search.trim().toLowerCase();
    const matchesSearch = !term
      || component.name?.toLowerCase().includes(term)
      || component.brand?.toLowerCase().includes(term);

    return matchesType && matchesSearch;
  }), [components, activeType, search]);

  useEffect(() => {
    if (!linksComponent) return;
    let active = true;
    purchaseLinksService.byComponent(linksComponent.id)
      .then((data) => { if (active) setLinks(Array.isArray(data) ? data : []); })
      .catch((error) => { if (active) setLinksError(error.message); })
      .finally(() => { if (active) setLinksLoading(false); });
    return () => { active = false; };
  }, [linksComponent, linksAttempt]);

  function openLinks(component) {
    setLinks(null);
    setLinksError('');
    setLinksLoading(true);
    setLinksComponent(component);
  }

  function clearFilters() {
    setSearch('');
    setActiveType('all');
  }

  return (
    <div className="page-stack">
      <section className="page-hero compact-hero">
        <span className="eyebrow">Catálogo técnico</span>
        <h1>Componentes disponíveis</h1>
        <p>Encontre as peças para seu próximo PC. Compare especificações, preços de referência e opções de compra.</p>
      </section>

      <div className="catalog-toolbar panel-card">
        <Input
          label="Buscar por nome ou marca"
          value={search}
          onChange={(event) => setSearch(event.target.value.slice(0, 80))}
          placeholder="Ex.: Ryzen, RTX, Kingston"
          type="search"
        />
        <div className="segmented-control" role="group" aria-label="Filtro de categoria">
          <button type="button" aria-pressed={activeType === 'all'} className={activeType === 'all' ? 'active' : ''} onClick={() => setActiveType('all')}>Todos</button>
          {componentTypes.map((type) => (
            <button type="button" key={type} aria-pressed={activeType === type} className={activeType === type ? 'active' : ''} onClick={() => setActiveType(type)}>
              {componentLabels[type]}
            </button>
          ))}
        </div>
      </div>

      {!loading && !error && <div className="section-heading catalog-results">
        <p role="status">{filteredComponents.length} {filteredComponents.length === 1 ? 'componente encontrado' : 'componentes encontrados'}</p>
        {(search || activeType !== 'all') && <Button variant="ghost" onClick={clearFilters}>Limpar filtros</Button>}
      </div>}

      {loading && <LoadingSpinner />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {!loading && !error && filteredComponents.length === 0 && <EmptyState title="Nenhum componente encontrado" message="Tente outro nome, marca ou categoria. Use Limpar filtros para ver todas as peças." />}
      {!loading && !error && <div className="cards-grid component-grid">
        {filteredComponents.map((component) => (
          <ComponentCard key={component.id} component={component} onLinks={openLinks} />
        ))}
      </div>}

      <Modal open={linksComponent !== null} title={`Lojas para ${linksComponent?.name || ''}`} onClose={() => setLinksComponent(null)}>
        {linksLoading && <LoadingSpinner label="Buscando opções de compra..." />}
        {linksError && <ErrorState message={linksError} onRetry={() => {
          setLinksError(''); setLinksLoading(true); setLinksAttempt((attempt) => attempt + 1);
        }} />}
        {!linksLoading && !linksError && <PurchaseLinksList links={links || []} variant="single" />}
      </Modal>
    </div>
  );
}
