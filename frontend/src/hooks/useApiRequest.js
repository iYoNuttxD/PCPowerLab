import { useCallback, useState } from 'react';

export function useApiRequest() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = useCallback(async (callback) => {
    setLoading(true);
    setError('');

    try {
      return await callback();
    } catch (requestError) {
      const message = requestError?.message || 'Não foi possível concluir a operação.';
      setError(message);
      // UI event handlers consume the error state. Rethrowing here would create
      // an unhandled rejection after the failure had already been presented.
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    setError,
    run
  };
}
