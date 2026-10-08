import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';
import { componentLabels, componentTypes } from '../../utils/componentLabels.js';
import { emptyCatalogFilters, priceRangeError } from '../../utils/componentPresentation.js';

export default function ComponentFilters({ components, filters, onChange, fixedCategory }) {
  const brands = [...new Set(components.filter(component => !fixedCategory || component.category === fixedCategory).map(component => component.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const update = (key, value) => onChange({ ...filters, [key]: value });
  const error = priceRangeError(filters);
  const hasFilters = Object.entries(filters).some(([key, value]) => value !== emptyCatalogFilters[key] && !(fixedCategory && key === 'category'));
  return (
    <div className="catalog-filters">
      <div className="form-grid catalog-filter-grid">
        <Input label="Buscar por nome ou marca" type="search" value={filters.search} placeholder="Ex.: Ryzen, RTX, Kingston"
          onChange={event => update('search', event.target.value.slice(0, 80))} />
        {!fixedCategory && <Select label="Categoria" value={filters.category} onChange={event => update('category', event.target.value)}
          options={[{ value: 'all', label: 'Todas as categorias' }, ...componentTypes.map(type => ({ value: type, label: componentLabels[type] }))]} />}
        <Select label="Marca" value={filters.brand} onChange={event => update('brand', event.target.value)}
          options={[{ value: 'all', label: 'Todas as marcas' }, ...brands.map(brand => ({ value: brand, label: brand }))]} />
        <Input label="Preço mínimo estimado (R$)" type="number" min="0" step="0.01" value={filters.minPrice}
          onChange={event => update('minPrice', event.target.value)} />
        <Input label="Preço máximo estimado (R$)" type="number" min="0" step="0.01" value={filters.maxPrice}
          error={error} onChange={event => update('maxPrice', event.target.value)} />
      </div>
      {hasFilters && <Button variant="ghost" onClick={() => onChange({ ...emptyCatalogFilters, category: fixedCategory || 'all' })}>Limpar filtros</Button>}
    </div>
  );
}
