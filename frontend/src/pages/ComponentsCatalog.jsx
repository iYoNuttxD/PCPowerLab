import ComponentIdentity from '../components/componentsCatalog/ComponentIdentity.jsx';
import { useEffect, useMemo, useState } from 'react';
import ComponentCard from '../components/componentsCatalog/ComponentCard.jsx';
import Modal from '../components/ui/Modal.jsx';
import Button from '../components/ui/Button.jsx';
import ComponentFilters from '../components/componentsCatalog/ComponentFilters.jsx';
import ComponentComparison from '../components/componentsCatalog/ComponentComparison.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import PurchaseLinksList from '../components/build/PurchaseLinksList.jsx';
import { useComponents } from '../hooks/useComponents.js';
import { purchaseLinksService } from '../services/purchaseLinksService.js';
import { emptyCatalogFilters, filterComponents, priceRangeError } from '../utils/componentPresentation.js';
import { componentLabels } from '../utils/componentLabels.js';

export default function ComponentsCatalog() {
  const { components, loading, error, reload } = useComponents();
  const [filters, setFilters] = useState(emptyCatalogFilters);
  const [comparisonIds, setComparisonIds] = useState([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [links, setLinks] = useState(null);
  const [linksComponent, setLinksComponent] = useState(null);
  const [linksError, setLinksError] = useState('');
  const [linksLoading, setLinksLoading] = useState(false);
  const [linksAttempt, setLinksAttempt] = useState(0);

  const filteredComponents = useMemo(() => filterComponents(components, filters), [components, filters]);
  const comparedComponents = components.filter(component => comparisonIds.includes(component.id));
  const comparisonCategory = comparedComponents[0]?.category;
  const filterError = priceRangeError(filters);

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

  function toggleComparison(component) {
    setComparisonIds(current => current.includes(component.id) ? current.filter(id => id !== component.id)
      : current.length < 4 && (!comparisonCategory || comparisonCategory === component.category) ? [...current, component.id] : current);
  }

  function removeCompared(id) {
    setComparisonIds(current => current.filter(value => value !== id));
    if (comparedComponents.length <= 1) setComparisonOpen(false);
  }

  return (
    <div className="page-stack">
      <section className="page-hero compact-hero">
        <span className="eyebrow">Catálogo técnico</span>
        <h1>Componentes disponíveis</h1>
        <p>Encontre as peças para seu próximo PC. Compare especificações, preços estimados e opções de compra.</p>
      </section>

      <div className="catalog-toolbar panel-card">
        <ComponentFilters components={components} filters={filters} onChange={setFilters} />
        <p className="analysis-note">Preços estimados da base demonstrativa, sem atualização em tempo real. Os links das lojas são buscas; confirme o modelo, o preço e a disponibilidade antes de comprar.</p>
      </div>

      {!loading && !error && <div className="section-heading catalog-results">
        <p role="status">{filterError ? 'Corrija a faixa de preço para consultar os resultados.' : `${filteredComponents.length} ${filteredComponents.length === 1 ? 'componente encontrado' : 'componentes encontrados'}`}</p>
      </div>}

      {!loading && !error && <section className="panel-card catalog-compare-bar" aria-label="Peças selecionadas para comparar">
        <p role="status">{comparedComponents.length ? `${comparedComponents.length} de 4 peças selecionadas · ${componentLabels[comparisonCategory]}. A seleção é mantida ao filtrar.` : 'Selecione de 2 a 4 peças da mesma categoria para comparar.'}</p>
        {comparedComponents.length > 0 && <>
          <ul>{comparedComponents.map(component => <li key={component.id}><ComponentIdentity component={component} /><Button variant="ghost" size="sm" onClick={() => removeCompared(component.id)} aria-label={`Retirar ${component.name} da seleção`}>Retirar</Button></li>)}</ul>
          <p className="hint-text">Para comparar outra categoria, limpe esta seleção. Os filtros não removem as peças escolhidas.</p>
        </>}
        <div className="button-row">
          <Button disabled={comparedComponents.length < 2} onClick={() => setComparisonOpen(true)}>Comparar peças ({comparedComponents.length})</Button>
          {comparedComponents.length > 0 && <Button variant="ghost" onClick={() => setComparisonIds([])}>Limpar seleção</Button>}
        </div>
      </section>}

      {loading && <LoadingSpinner />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {!loading && !error && !filterError && filteredComponents.length === 0 && <EmptyState title="Nenhum componente encontrado" message="Tente outro nome, marca, categoria ou faixa de preço. Use Limpar filtros para ver todas as peças." />}
      {!loading && !error && <div className="cards-grid component-grid">
        {filteredComponents.map((component) => (
          <ComponentCard key={component.id} component={component} onLinks={openLinks} onCompare={toggleComparison}
            compared={comparisonIds.includes(component.id)} compareDisabled={!comparisonIds.includes(component.id) && (comparedComponents.length >= 4 || Boolean(comparisonCategory && comparisonCategory !== component.category))} />
        ))}
      </div>}

      <Modal open={comparisonOpen} title="Comparar componentes" onClose={() => setComparisonOpen(false)}>
        <ComponentComparison components={comparedComponents} onRemove={removeCompared} />
      </Modal>

      <Modal open={linksComponent !== null} title={`Lojas para ${linksComponent?.name || ''}`} onClose={() => setLinksComponent(null)}>
        {linksComponent && <ComponentIdentity component={linksComponent} />}
        {linksLoading && <LoadingSpinner label="Buscando opções de compra..." />}
        {linksError && <ErrorState message={linksError} onRetry={() => {
          setLinksError(''); setLinksLoading(true); setLinksAttempt((attempt) => attempt + 1);
        }} />}
        {!linksLoading && !linksError && <PurchaseLinksList links={links || []} variant="single" />}
      </Modal>
    </div>
  );
}
