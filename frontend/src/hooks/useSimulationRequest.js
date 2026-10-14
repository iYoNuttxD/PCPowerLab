import { useEffect, useRef, useState } from 'react';

const idle = { status: 'idle', result: null, error: null };

// Results belong to the submitted inputs, including the build. A late response
// must not label another game's settings (or another configuration) as analyzed.
export function useSimulationRequest(inputKey) {
  const [state, setState] = useState(idle);
  const latestKey = useRef(inputKey);
  const sequence = useRef(0);
  latestKey.current = inputKey;

  useEffect(() => () => { sequence.current += 1; }, []);
  useEffect(() => {
    sequence.current += 1;
    setState(idle);
  }, [inputKey]);

  async function run(callback) {
    const key = inputKey;
    const id = ++sequence.current;
    const isCurrent = () => sequence.current === id && latestKey.current === key;
    setState({ ...idle, key, status: 'loading' });
    try {
      const result = await callback();
      if (isCurrent()) setState({ key, status: 'success', result, error: null });
    } catch (error) {
      if (isCurrent()) setState({ key, status: 'error', result: null, error });
    }
  }

  return { ...(state.key === inputKey ? state : idle), run };
}
