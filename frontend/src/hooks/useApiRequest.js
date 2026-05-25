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
      throw requestError;
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
