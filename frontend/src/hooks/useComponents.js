import { useEffect, useMemo, useState } from 'react';
import { componentsService } from '../services/componentsService.js';
import { catalogComponentTypes } from '../utils/componentLabels.js';

export function useComponents() {
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    componentsService.getAll()
      .then((data) => {
        if (active) {
          setComponents(Array.isArray(data) ? data : []);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.message);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const byType = useMemo(() => catalogComponentTypes.reduce((grouped, type) => ({
    ...grouped,
    [type]: components.filter((component) => component.category === type)
  }), {}), [components]);

  return {
    components,
    byType,
    loading,
    error,
    reload: async () => {
      setLoading(true);
      setError('');
      try {
        const data = await componentsService.getAll();
        setComponents(Array.isArray(data) ? data : []);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    }
  };
}
