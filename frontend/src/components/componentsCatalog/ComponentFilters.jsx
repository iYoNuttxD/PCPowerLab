import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';
import { componentLabels, catalogComponentTypes } from '../../utils/componentLabels.js';
import { emptyCatalogFilters, priceRangeError, performanceRangeError, catalogFilterFields, specLabel, formatSpecValue } from '../../utils/componentPresentation.js';

export default function ComponentFilters({ components, filters, onChange, fixedCategory, hasBuild = false }) {
  const category = fixedCategory || filters.category;
  const categoryComponents = components.filter(component => category === 'all' || component.category === category);
  const brands = [...new Set(categoryComponents.map(component => component.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const update = (key, value) => onChange({ ...filters, [key]: value });
  const performanceAvailable = ['cpu', 'gpu', 'ram', 'storage'].includes(category);
  const changeCategory = value => onChange({ ...filters, category: value, brand: 'all', specs: {}, minPerformance: '', maxPerformance: '', sort: 'name-asc' });
  const applied = [
    ...(filters.brand !== 'all' ? [{ key: 'brand', text: filters.brand, clear: () => update('brand', 'all') }] : []),
    ...Object.entries(filters.specs || {}).filter(([, value]) => value !== '').map(([key, value]) => ({ key, text: `${specLabel(key)}: ${formatSpecValue(key, value)}`, clear: () => update('specs', { ...filters.specs, [key]: '' }) })),
    ...(filters.minPerformance !== '' && filters.minPerformance != null ? [{ key: 'minPerformance', text: `Desempenho ≥ ${filters.minPerformance}`, clear: () => update('minPerformance', '') }] : []),
    ...(filters.maxPerformance !== '' && filters.maxPerformance != null ? [{ key: 'maxPerformance', text: `Desempenho ≤ ${filters.maxPerformance}`, clear: () => update('maxPerformance', '') }] : []),
    ...(hasBuild && filters.compatibility && filters.compatibility !== 'all' ? [{ key: 'compatibility', text: ({ compatible: 'Sem conflitos', incompatible: 'Com conflito', unverified: 'Dados incompletos' })[filters.compatibility], clear: () => update('compatibility', 'all') }] : [])
  ];
  return (
    <div className="catalog-filters">
      <div className="form-grid catalog-filter-grid">
        <Input label="Buscar componente" type="search" value={filters.search} placeholder="Nome, modelo ou marca"
          onChange={event => update('search', event.target.value.slice(0, 100))} />
        {!fixedCategory && <Select label="Categoria" value={filters.category} onChange={event => changeCategory(event.target.value)}
          options={[{ value: 'all', label: 'Todas as categorias' }, ...catalogComponentTypes.map(type => ({ value: type, label: componentLabels[type] }))]} />}
        <Input label="Preço mínimo (R$)" type="number" min="0" step="0.01" value={filters.minPrice} onChange={event => update('minPrice', event.target.value)} />
        <Input label="Preço máximo (R$)" type="number" min="0" step="0.01" value={filters.maxPrice}
          error={priceRangeError(filters)} onChange={event => update('maxPrice', event.target.value)} />
        <Select label="Ordenar por" value={filters.sort || 'name-asc'} onChange={event => update('sort', event.target.value)} options={[
          { value: 'name-asc', label: 'Nome: A–Z' }, { value: 'name-desc', label: 'Nome: Z–A' },
          { value: 'price-asc', label: 'Menor preço' }, { value: 'price-desc', label: 'Maior preço' },
          ...(performanceAvailable ? [
            { value: 'performance-desc', label: 'Maior desempenho' }, { value: 'performance-asc', label: 'Menor desempenho' },
            { value: 'value-desc', label: 'Maior índice por real' }, { value: 'value-asc', label: 'Menor índice por real' }
          ] : [])
        ]} />
      </div>
      <details className="task-disclosure catalog-advanced-filters">
        <summary>Mais filtros{applied.length ? ` (${applied.length})` : ''}</summary>
        <div className="form-grid catalog-filter-grid">
          <Select label="Marca" value={filters.brand} onChange={event => update('brand', event.target.value)}
            options={[{ value: 'all', label: 'Todas as marcas' }, ...brands.map(brand => ({ value: brand, label: brand }))]} />
          {(catalogFilterFields[category] || []).map(key => {
            const values = [...new Set(categoryComponents.flatMap(component => {
              const value = component.specs?.[key];
              return value === undefined || value === null || value === '' ? [] : Array.isArray(value) ? value : [value];
            }).filter(value => typeof value !== 'object').map(String))].sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
            return <Select key={key} label={specLabel(key)} value={filters.specs?.[key] || ''}
              onChange={event => update('specs', { ...filters.specs, [key]: event.target.value })}
              options={[{ value: '', label: 'Todos os valores' }, ...values.map(value => ({ value, label: formatSpecValue(key, value) }))]} />;
          })}
          {performanceAvailable && <>
            <Input label="Desempenho mínimo" type="number" min="0" max="100" value={filters.minPerformance || ''} onChange={event => update('minPerformance', event.target.value)} />
            <Input label="Desempenho máximo" type="number" min="0" max="100" value={filters.maxPerformance || ''} error={performanceRangeError(filters)} onChange={event => update('maxPerformance', event.target.value)} />
          </>}
          {hasBuild && <Select label="Compatibilidade" value={filters.compatibility || 'all'} onChange={event => update('compatibility', event.target.value)} options={[
            { value: 'all', label: 'Todas' }, { value: 'compatible', label: 'Sem conflitos' },
            { value: 'incompatible', label: 'Com conflito' }, { value: 'unverified', label: 'Dados incompletos' }
          ]} />}
        </div>
      </details>
      {applied.length > 0 && <div className="active-filter-list" aria-label="Filtros aplicados">{applied.map(item => <button type="button" key={item.key} onClick={item.clear} aria-label={`Remover filtro ${item.text}`}>{item.text}<span aria-hidden="true"> ×</span></button>)}</div>}
      {performanceRangeError(filters) && <p className="field-error" role="alert">{performanceRangeError(filters)}</p>}
      <Button variant="ghost" size="sm" onClick={() => onChange({ ...emptyCatalogFilters, specs: {}, category: fixedCategory || 'all' })}>Limpar filtros</Button>
    </div>
  );
}
