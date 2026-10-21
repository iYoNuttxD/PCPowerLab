import { useRef } from 'react';
import { formatCurrency } from '../../utils/formatCurrency.js';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';
import { componentLabels, catalogComponentTypes } from '../../utils/componentLabels.js';
import { emptyCatalogFilters, priceRangeError, specLabel, formatSpecValue } from '../../utils/componentPresentation.js';

const essential = { cpu: 'socket', gpu: 'vramGb', motherboard: 'socket', ram: 'capacityGb', storage: 'capacityGb', psu: 'watts', case: 'supportedFormFactors', cooler: 'coolingType', fan: 'diameterMm' };
const extra = { cpu: ['cores'], gpu: [], motherboard: ['chipset', 'memoryType', 'formFactor'], ram: ['memoryType', 'speedMhz'], storage: ['storageType', 'interface'], psu: ['efficiency'], case: ['radiatorSizesMm'], cooler: ['supportedSockets', 'radiatorSizeMm'], fan: ['connector', 'unitsPerPack'] };

export default function ComponentFilters({ components, filters, onChange, fixedCategory, showLayout = true }) {
  const filtersRef = useRef(null);
  const category = fixedCategory || filters.category;
  const categoryComponents = components.filter(c => category === 'all' || c.category === category);
  const brands = [...new Set(categoryComponents.map(c => c.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const update = (key, value) => onChange({ ...filters, [key]: value });
  const changeCategory = value => onChange({ ...emptyCatalogFilters, search: filters.search, maxPrice: filters.maxPrice, category: value, layout: filters.layout || 'grid', specs: {} });
  function valuesFor(key) {
    return [...new Set(categoryComponents.flatMap(c => {
      const value = c.specs?.[key] ?? c.verifiedFeatures?.fields?.[key];
      return value == null || value === '' ? [] : Array.isArray(value) ? value : [value];
    }).filter(v => typeof v !== 'object').map(String))].sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
  }
  function specFilter(key) {
    const values = valuesFor(key);
    if (values.length < 2 || (key === 'radiatorSizeMm' && filters.specs?.coolingType === 'air')) return null;
    return <Select key={key} label={specLabel(key)} value={filters.specs?.[key] || ''}
      onChange={event => update('specs', { ...filters.specs, [key]: event.target.value })}
      options={[{ value: '', label: 'Qualquer opção' }, ...values.map(value => ({ value, label: formatSpecValue(key, value) }))]} />;
  }
  const applied = [
    ...(filters.search.trim() ? [{ key: 'search', text: `Busca: ${filters.search.trim()}`, clear: () => update('search', '') }] : []),
    ...(!fixedCategory && category !== 'all' ? [{ key: 'category', text: componentLabels[category], clear: () => changeCategory('all') }] : []),
    ...(filters.maxPrice !== '' ? [{ key: 'maxPrice', text: `Até ${formatCurrency(Number(filters.maxPrice))}`, clear: () => update('maxPrice', '') }] : []),
    ...(filters.brand !== 'all' ? [{ key: 'brand', text: filters.brand, clear: () => update('brand', 'all') }] : []),
    ...Object.entries(filters.specs || {}).filter(([, value]) => value !== '').map(([key, value]) => ({ key, text: `${specLabel(key)}: ${formatSpecValue(key, value)}`, clear: () => update('specs', { ...filters.specs, [key]: '' }) }))
  ];
  function removeFilter(event, item, index) {
    item.clear();
    if (event.detail === 0) requestAnimationFrame(() => {
      const buttons = filtersRef.current?.querySelectorAll('.active-filter-list button');
      (buttons?.[Math.min(index, buttons.length - 1)] || filtersRef.current?.querySelector('input[type="search"]'))?.focus();
    });
  }
  return <div className="catalog-filters compact-catalog-filters" ref={filtersRef}>
    <div className="form-grid catalog-filter-grid catalog-essential-filters">
      <Input label="Buscar componente" type="search" value={filters.search} placeholder="Nome, marca ou recurso"
        onChange={event => update('search', event.target.value.slice(0, 100))} />
      {!fixedCategory && <Select label="Categoria" value={category} onChange={event => changeCategory(event.target.value)}
        options={[{ value: 'all', label: 'Todas as peças' }, ...catalogComponentTypes.map(type => ({ value: type, label: componentLabels[type] }))]} />}
      <Input label="Preço máximo (R$)" type="number" min="0" step="0.01" value={filters.maxPrice} placeholder="Sem limite"
        error={priceRangeError(filters)} onChange={event => update('maxPrice', event.target.value)} />
      {essential[category] && specFilter(essential[category])}
    </div>
    <details className="task-disclosure catalog-advanced-filters" onKeyDown={event => {
      if (event.key === 'Escape' && event.currentTarget.open) { event.preventDefault(); event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus(); }
    }}>
      <summary>Mais filtros e exibição</summary>
      <div className="form-grid catalog-filter-grid">
        {brands.length > 1 && <Select label="Marca" value={filters.brand} onChange={event => update('brand', event.target.value)} options={[{ value: 'all', label: 'Qualquer marca' }, ...brands.map(brand => ({ value: brand, label: brand }))]} />}
        {(extra[category] || []).map(specFilter)}
        <Select label="Ordenar por" value={filters.sort || 'name-asc'} onChange={event => update('sort', event.target.value)} options={[
          { value: 'name-asc', label: 'Nome' }, { value: 'price-asc', label: 'Menor preço' },
          ...(['cpu', 'gpu', 'ram', 'storage'].includes(category) ? [{ value: 'performance-desc', label: 'Maior desempenho estimado' }] : [])
        ]} />
        {showLayout && <Select label="Exibição das peças" value={filters.layout || 'grid'} onChange={event => update('layout', event.target.value)} options={[{ value: 'grid', label: 'Cartões com fotos' }, { value: 'list', label: 'Lista com fotos' }]} />}
      </div>
    </details>
    {applied.length > 0 && <section className="active-filters" aria-label="Filtros aplicados">
      <div className="section-heading compact"><p>{applied.length} {applied.length === 1 ? 'filtro ativo' : 'filtros ativos'}</p><Button variant="ghost" size="sm" onClick={() => onChange({ ...emptyCatalogFilters, specs: {}, category: fixedCategory || 'all' })}>Limpar filtros</Button></div>
      <div className="active-filter-list">{applied.map((item, index) => <button type="button" key={item.key} onClick={event => removeFilter(event, item, index)} aria-label={`Remover filtro ${item.text}`}>{item.text}<span aria-hidden="true"> ×</span></button>)}</div>
    </section>}
  </div>;
}
