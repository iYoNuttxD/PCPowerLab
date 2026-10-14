import { suggestedReplacement } from '../utils/catalogAvailability.js';
import { datedReference } from '../utils/referencePricing.js';
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
import { useBuildState } from '../hooks/useBuildState.jsx';
import { componentsService } from '../services/componentsService.js';
import { catalogMethodology, isCatalogComponentSelected, selectCatalogComponent } from '../utils/catalogSelection.js';
import { Link, useSearchParams } from 'react-router-dom';
import { useComponents } from '../hooks/useComponents.js';
import { purchaseLinksService } from '../services/purchaseLinksService.js';
import { emptyCatalogFilters, filterComponents, priceRangeError, performanceRangeError } from '../utils/componentPresentation.js';
import { componentLabels } from '../utils/componentLabels.js';

export default function ComponentsCatalog() {
  const { components, componentMap, loading, error, reload } = useComponents();
  const [searchParams] = useSearchParams();
  const replacementFor = searchParams.get('replacementFor');
  const legacy = replacementFor ? componentMap[replacementFor] : null;
  const proposedReplacement = suggestedReplacement(legacy, componentMap);
  const build = useBuildState();
  const hasBuild = Object.entries(build.selectedComponents).some(([key, value]) => key === 'fans' ? value?.length > 0 : Boolean(value?.id));
  const [selectionNotice, setSelectionNotice] = useState('');
  const [compatibility, setCompatibility] = useState({ key: '', data: {}, error: '' });
  const [compatibilityAttempt, setCompatibilityAttempt] = useState(0);
  const [filters, setFilters] = useState(emptyCatalogFilters);
  useEffect(() => {
    if (proposedReplacement?.selectable !== false && proposedReplacement?.id) {
      setFilters({ ...emptyCatalogFilters, category: proposedReplacement.category, search: proposedReplacement.name });
    }
  }, [proposedReplacement?.id, proposedReplacement?.name, proposedReplacement?.category, proposedReplacement?.selectable]);
  const [comparisonIds, setComparisonIds] = useState([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [links, setLinks] = useState(null);
  const [linksComponent, setLinksComponent] = useState(null);
  const [linksError, setLinksError] = useState('');
  const [linksLoading, setLinksLoading] = useState(false);
  const [linksAttempt, setLinksAttempt] = useState(0);

  const compatibilityRequested = hasBuild && filters.compatibility !== 'all';
  const compatibilityKey = JSON.stringify(build.buildPayload);
  const compatibilityReady = compatibility.key === compatibilityKey;
  const compatibilityError = compatibilityRequested && compatibilityReady ? compatibility.error : '';
  const compatibilityLoading = compatibilityRequested && !compatibilityReady;
  const filteredComponents = useMemo(() => filterComponents(components, { ...filters, compatibility: hasBuild ? filters.compatibility : 'all' }, compatibilityReady ? compatibility.data : {}), [components, filters, hasBuild, compatibilityReady, compatibility.data]);
  useEffect(() => {
    if (!compatibilityRequested) return;
    let active = true;
    componentsService.getCatalogCompatibility({ components: JSON.parse(compatibilityKey) })
      .then(results => { if (active) setCompatibility({ key: compatibilityKey, data: Object.fromEntries(results.map(item => [item.componentId, item])), error: '' }); })
      .catch(error => { if (active) setCompatibility({ key: compatibilityKey, data: {}, error: error.message }); });
    return () => { active = false; };
  }, [compatibilityRequested, compatibilityKey, compatibilityAttempt]);
  function addToBuild(component) {
    if (selectCatalogComponent(build.selectedComponents, build.actions, component)) {
      setSelectionNotice(`${component.name} selecionado na sua montagem${component.category === 'fan' ? ' (1 pacote)' : ''}. Análises anteriores foram invalidadas. Confira a compatibilidade no resumo.`);
    }
  }
  const comparedComponents = components.filter(component => comparisonIds.includes(component.id));
  const comparisonCategory = comparedComponents[0]?.category;
  const filterError = priceRangeError(filters) || performanceRangeError(filters);

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
    if (comparedComponents.length <= 2) setComparisonOpen(false);
  }

  return (
    <div className="page-stack">
      <section className="page-hero compact-hero">
        <span className="eyebrow">Catálogo técnico</span>
        <h1>Catálogo de componentes</h1>
        <p>Escolha peças, filtre e compare.</p>
      </section>

      {legacy?.catalogStatus === 'legacy' && <section className="panel-card"><p>Alternativa para {legacy.name}. Sua montagem não foi alterada.</p>{Array.isArray(legacy.replacementNotes) && <ul>{legacy.replacementNotes.map(note => <li key={note}>{note}</li>)}</ul>}</section>}
      <div className="catalog-toolbar panel-card">
        <ComponentFilters components={components} filters={filters} onChange={setFilters} hasBuild={hasBuild} />
        {!loading && !error && <p className="hint-text">{components.filter(datedReference).length}/{components.length} referências datadas · confirme preço e estoque na loja</p>}
      </div>

      {selectionNotice && <p role="status">{selectionNotice}</p>}
      <div className="context-strip"><span>{hasBuild ? 'Sua montagem está em andamento' : 'Selecione peças para começar'}</span><Link to="/summary">Ver minha montagem</Link></div>
      {compatibilityLoading && <LoadingSpinner label="Verificando candidatos com a montagem atual..." />}
      {compatibilityError && <ErrorState message={compatibilityError} onRetry={() => { setCompatibility({ key: '', data: {}, error: '' }); setCompatibilityAttempt(value => value + 1); }} />}
      {!loading && !error && !compatibilityLoading && !compatibilityError && <div className="section-heading catalog-results">
        <p role="status">{filterError ? 'Corrija a faixa de preço ou desempenho para consultar os resultados.' : `${filteredComponents.length} ${filteredComponents.length === 1 ? 'componente encontrado' : 'componentes encontrados'}`}</p>
      </div>}

      {!loading && !error && comparedComponents.length > 0 && <section className="catalog-compare-bar" aria-label="Peças selecionadas para comparar">
        <p role="status">{comparedComponents.length} de 4 · {componentLabels[comparisonCategory]}</p>
        {comparedComponents.length > 0 && <>
          <ul>{comparedComponents.map(component => <li key={component.id}><span>{component.name}</span><Button variant="ghost" size="sm" onClick={() => removeCompared(component.id)} aria-label={`Retirar ${component.name} da seleção`}>Retirar</Button></li>)}</ul>
        </>}
        <div className="button-row">
          <Button disabled={comparedComponents.length < 2} onClick={() => setComparisonOpen(true)}>Comparar peças ({comparedComponents.length})</Button>
          {comparedComponents.length > 0 && <Button variant="ghost" onClick={() => { setComparisonIds([]); setComparisonOpen(false); }}>Limpar seleção</Button>}
        </div>
      </section>}

      {loading && <LoadingSpinner />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {!loading && !error && !filterError && !compatibilityLoading && !compatibilityError && filteredComponents.length === 0 && <EmptyState title="Nenhum componente encontrado" message="Tente outro nome, marca, categoria ou faixa de preço. Use Limpar filtros para ver todas as peças." />}
      {!loading && !error && !compatibilityLoading && !compatibilityError && <div className="cards-grid component-grid">
        {filteredComponents.map((component) => (
          <ComponentCard key={component.id} component={component} compatibilityPreview={compatibilityRequested && compatibilityReady ? compatibility.data[component.id] : null} onSelect={addToBuild} selected={isCatalogComponentSelected(build.selectedComponents, component)} onLinks={openLinks} onCompare={toggleComparison}
            compared={comparisonIds.includes(component.id)} compareDisabled={!comparisonIds.includes(component.id) && (comparedComponents.length >= 4 || Boolean(comparisonCategory && comparisonCategory !== component.category))} />
        ))}
      </div>}

      <details className="task-disclosure catalog-methodology"><summary>Sobre os índices e filtros</summary><p>{catalogMethodology}</p><p>Compatibilidade considera a montagem atual. Dados ausentes permanecem pendentes.</p></details>

      <Modal open={comparisonOpen} title="Comparar componentes" onClose={() => setComparisonOpen(false)}>
        <ComponentComparison components={comparedComponents} onRemove={removeCompared} onSelect={addToBuild} selectedComponents={build.selectedComponents} />
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
