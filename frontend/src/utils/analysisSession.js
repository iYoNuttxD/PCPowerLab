// Navigation convenience only: seven fixed, tab-scoped records, each bounded in
// size and age. Never persist pending requests, errors, or authentication data.
const prefix = 'pcpowerlab-analysis-session:';
const version = 1;
const maxAge = 2 * 60 * 60 * 1000;
const maxLength = 384 * 1024;
const slots = new Set(['performance-inputs', 'performance-game-single', 'performance-game-comparison', 'performance-software', 'upgrade-inputs', 'upgrade-suggestions', 'upgrade-roadmap']);

export const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const isSessionId = value => typeof value === 'string' && value.length <= 200;
export const isOptionalText = value => value === undefined || value === null || typeof value === 'string';
export const isOptionalNumber = value => value === undefined || value === null || typeof value === 'string' || typeof value === 'number' && Number.isFinite(value);

// Object property insertion order is not part of build identity; fan/game order
// and all component metadata are. A catalog refresh must invalidate old prices.
export function analysisIdentity(value) {
  return JSON.stringify(value, (_key, item) => isRecord(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
}

export function clearAnalysisSession(slot) {
  if (!slots.has(slot)) return;
  try { sessionStorage.removeItem(prefix + slot); } catch (_error) { /* Storage is optional. */ }
}

export function readAnalysisSession(slot, identity, validate) {
  if (!slots.has(slot)) return null;
  try {
    const text = sessionStorage.getItem(prefix + slot);
    if (!text) return null;
    if (text.length > maxLength) throw new Error('Oversized analysis snapshot');
    const entry = JSON.parse(text);
    if (!isRecord(entry) || entry.version !== version || entry.identity !== identity
      || !Number.isFinite(entry.savedAt) || entry.savedAt > Date.now() || Date.now() - entry.savedAt > maxAge
      || !validate(entry.value)) throw new Error('Invalid analysis snapshot');
    return entry.value;
  } catch (_error) {
    clearAnalysisSession(slot);
    return null;
  }
}

export function writeAnalysisSession(slot, identity, value, validate) {
  if (!slots.has(slot)) return;
  try {
    if (typeof identity !== 'string' || !validate(value)) throw new Error('Invalid analysis snapshot');
    const text = JSON.stringify({ version, identity, savedAt: Date.now(), value });
    if (text.length > maxLength) throw new Error('Oversized analysis snapshot');
    sessionStorage.setItem(prefix + slot, text);
  } catch (_error) {
    // A failed newer save must not expose the previous success on return.
    clearAnalysisSession(slot);
  }
}
