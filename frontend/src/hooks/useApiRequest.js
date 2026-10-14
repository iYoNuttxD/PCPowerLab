import { useCallback, useEffect, useRef, useState } from 'react';

export function useApiRequest() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const active = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const run = useCallback((callback) => {
    // A state-only disabled button cannot prevent two events in one render.
    // Skip a second action without returning another action’s result.
    if (active.current) return Promise.resolve(undefined);
    setLoading(true);
    setError('');
    active.current = true;
    let result;
    try { result = callback(); }
    catch (requestError) { result = Promise.reject(requestError); }
    const pending = Promise.resolve(result).catch(requestError => {
      if (mounted.current) setError(requestError?.message || 'Não foi possível concluir a operação.');
      return undefined;
    }).finally(() => {
      active.current = false;
      if (mounted.current) setLoading(false);
    });
    return pending;
  }, []);

  return { loading, error, setError, run };
}
