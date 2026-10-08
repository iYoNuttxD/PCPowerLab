import { useEffect, useState } from 'react';
import { useSimulationRequest } from './useSimulationRequest.js';
import { clearAnalysisSession, readAnalysisSession, writeAnalysisSession } from '../utils/analysisSession.js';

const idle = { status: 'idle', result: null, error: null };

// The existing request hook owns concurrency/unmount safety. This wrapper only
// restores a completed result after its source has been revalidated, and only
// for exactly the same identity. Changing inputs discards the previous snapshot.
export function useSessionSimulationRequest(slot, inputKey, validate, { ready = true, invalid = false } = {}) {
  const request = useSimulationRequest(ready ? inputKey : null);
  const [restored, setRestored] = useState(null);

  useEffect(() => {
    if (!ready) {
      setRestored(null);
      if (invalid) clearAnalysisSession(slot);
      return;
    }
    const result = readAnalysisSession(slot, inputKey, validate);
    setRestored(result === null ? null : { key: inputKey, result });
  }, [slot, inputKey, ready, invalid, validate]);

  useEffect(() => {
    if (ready && request.status === 'success') writeAnalysisSession(slot, inputKey, request.result, validate);
    if (request.status === 'loading' || request.status === 'error') clearAnalysisSession(slot);
  }, [slot, inputKey, ready, request.status, request.result, validate]);

  async function run(callback) {
    if (!ready) return;
    // Clear synchronously, including when navigation unmounts before the next
    // React commit. An interrupted retry must never resurrect its old result.
    clearAnalysisSession(slot);
    setRestored(null);
    return request.run(callback);
  }

  const visible = !ready ? idle : request.status !== 'idle' ? request
    : restored?.key === inputKey ? { status: 'success', result: restored.result, error: null } : idle;
  return { ...visible, run };
}
