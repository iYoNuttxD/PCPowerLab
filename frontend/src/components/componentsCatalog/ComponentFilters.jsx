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
  return (
    <div className="catalog-filters">
      <div className="form-grid catalog-filter-grid">
        <Input label="Buscar por nome, modelo ou marca" type="search" value={filters.search} placeholder="Ex.: Ryzen, RTX, KF432C16BBK2/16"
          onChange={event => update('search', event.target.value.slice(0, 100))} />
        {!fixedCategory && <Select label="Categoria" value={filters.category} onChange={event => changeCategory(event.target.value)}
          options={[{ value: 'all', label: 'Todas as categorias' }, ...catalogComponentTypes.map(type => ({ value: type, label: componentLabels[type] }))]} />}
        <Select label="Marca" value={filters.brand} onChange={event => update('brand', event.target.value)}
          options={[{ value: 'all', label: 'Todas as marcas' }, ...brands.map(brand => ({ value: brand, label: brand }))]} />
        <Input label="Preço mínimo estimado (R$)" type="number" min="0" step="0.01" value={filters.minPrice}
          onChange={event => update('minPrice', event.target.value)} />
        <Input label="Preço máximo estimado (R$)" type="number" min="0" step="0.01" value={filters.maxPrice}
          error={priceRangeError(filters)} onChange={event => update('maxPrice', event.target.value)} />
        {(catalogFilterFields[category] || []).map(key => {
          const values = [...new Set(categoryComponents.flatMap(component => {
            const value = component.specs?.[key];
            return value === undefined || value === null || value === '' ? [] : Array.isArray(value) ? value : [value];
          }).filter(value => typeof value !== 'object').map(String))].sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
          return <Select key={key} label={specLabel(key)} value={filters.specs?.[key] || ''}
            onChange={event => update('specs', { ...filters.specs, [key]: event.target.value })}
            options={[{ value: '', label: 'Qualquer valor cadastrado' }, ...values.map(value => ({ value, label: formatSpecValue(key, value) }))]} />;
        })}
        {performanceAvailable && <>
          <Input label="Desempenho mínimo estimado" type="number" min="0" max="100" value={filters.minPerformance || ''} onChange={event => update('minPerformance', event.target.value)} />
          <Input label="Desempenho máximo estimado" type="number" min="0" max="100" value={filters.maxPerformance || ''} error={performanceRangeError(filters)} onChange={event => update('maxPerformance', event.target.value)} />
        </>}
        <Select label="Ordenar por" value={filters.sort || 'name-asc'} onChange={event => update('sort', event.target.value)} options={[
          { value: 'name-asc', label: 'Nome: A–Z' }, { value: 'name-desc', label: 'Nome: Z–A' },
          { value: 'price-asc', label: 'Menor preço de referência' }, { value: 'price-desc', label: 'Maior preço de referência' },
          ...(performanceAvailable ? [
            { value: 'performance-desc', label: 'Maior desempenho estimado' }, { value: 'performance-asc', label: 'Menor desempenho estimado' },
            { value: 'value-desc', label: 'Maior índice por real' }, { value: 'value-asc', label: 'Menor índice por real' }
          ] : [])
        ]} />
        {hasBuild && <Select label="Compatibilidade com a montagem" value={filters.compatibility || 'all'} onChange={event => update('compatibility', event.target.value)} options={[
          { value: 'all', label: 'Todas (sem filtrar)' }, { value: 'compatible', label: 'Compatível nas regras verificadas' },
          { value: 'incompatible', label: 'Conflito encontrado' }, { value: 'unverified', label: 'Verificação incompleta' }
        ]} />}
      </div>
      <Button variant="ghost" onClick={() => onChange({ ...emptyCatalogFilters, specs: {}, category: fixedCategory || 'all' })}>Limpar filtros</Button>
      <p className="hint-text">Todos os filtros são combinados. Escolha uma categoria para filtrar especificações. Ao trocar a categoria, marca e filtros técnicos são limpos; nome e preço são mantidos. Dados ausentes não atendem a um filtro técnico.</p>
    </div>
  );
}
