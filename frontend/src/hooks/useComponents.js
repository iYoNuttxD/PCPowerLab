import { createContext, createElement, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { componentsService } from '../services/componentsService.js';
import { catalogComponentTypes } from '../utils/componentLabels.js';

import { catalogView, suggestedReplacement } from '../utils/catalogAvailability.js';
import { validateCatalogResponse } from '../utils/catalogResponse.js';

const ComponentsContext = createContext(null);

// A single current catalog is shared by every screen, including ID-only snapshots.
export function ComponentsProvider({ children }) {
  const catalog = useCatalogRequest();
  return createElement(ComponentsContext.Provider, { value: catalog }, children);
}

export function useComponents() {
  const catalog = useContext(ComponentsContext);
  if (!catalog) throw new Error('useComponents deve ser usado dentro de ComponentsProvider.');
  return catalog;
}

export function useCatalogComponent(component) {
  const { componentMap, loading, error } = useComponents();
  const id = typeof component === 'string' ? component : component?.id || component?.fanId;
  const current = typeof id === 'string' && Object.hasOwn(componentMap, id) ? componentMap[id] : undefined;
  return { component: current, replacement: suggestedReplacement(current, componentMap), loading, error };
}

function useCatalogRequest() {
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const requestId = useRef(0);
  const reload = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setComponents([]);
    setError('');
    try {
      const data = validateCatalogResponse(await componentsService.getAll({ includeLegacy: true }));
      if (id === requestId.current) setComponents(data);
    } catch (requestError) {
      if (id === requestId.current) setError(requestError?.message || 'Não foi possível carregar o catálogo.');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    // Invalidates the first StrictMode request and any response after unmount.
    return () => { requestId.current += 1; };
  }, [reload]);

  const view = useMemo(() => catalogView(components), [components]);

  const byType = useMemo(() => catalogComponentTypes.reduce((grouped, type) => ({
    ...grouped,
    [type]: view.components.filter((component) => component.category === type)
  }), {}), [view]);

  return {
    ...view,
    byType,
    loading,
    error,
    reload
  };
}
