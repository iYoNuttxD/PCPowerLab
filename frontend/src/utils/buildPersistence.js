import { hydrateBuildComponents } from './buildHelpers.js';
import { usageTypes, priorityOptions } from './componentLabels.js';
import { emptyResults } from './buildTransitions.js';
import { normalizeWizardStep } from './wizardSteps.js';

export const buildStorageKey = 'pcpowerlab-build-state';
export const initialBuildState = {
  revision: 0,
  replacementHistory: [],
  wizardStep: 'cpu',
  selectedComponents: { fans: [] },
  budget: { amount: '', currency: 'BRL', priority: 'cost-benefit' },
  usageType: 'gaming',
  game: { gameId: 'game-cyberpunk-2077', targetResolution: '1080p', qualityPreset: 'high' },
  ...emptyResults
};
const record = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const nonEmptyString = (value, fallback) => typeof value === 'string' && value.trim() ? value : fallback;

// Storage is an untrusted, potentially older input snapshot. Cached analyses
// cannot be assumed to match today's catalog or analysis contract.
export function normalizePersistedBuild(value) {
  const stored = record(value);
  const budget = record(stored.budget);
  const game = record(stored.game);
  return {
    ...initialBuildState,
    revision: Number.isSafeInteger(stored.revision) && stored.revision >= 0 ? stored.revision : 0,
    replacementHistory: Array.isArray(stored.replacementHistory)
      ? stored.replacementHistory.filter(item => item && typeof item === 'object' && !Array.isArray(item)).slice(-20).map(item => hydrateBuildComponents(item)) : [],
    wizardStep: normalizeWizardStep(stored.wizardStep),
    selectedComponents: hydrateBuildComponents(stored.selectedComponents),
    budget: {
      amount: ['string', 'number'].includes(typeof budget.amount) && (budget.amount === '' || Number.isFinite(Number(budget.amount)) && Number(budget.amount) >= 0) ? budget.amount : '',
      currency: nonEmptyString(budget.currency, initialBuildState.budget.currency),
      priority: priorityOptions.includes(budget.priority) ? budget.priority : initialBuildState.budget.priority
    },
    usageType: [...usageTypes, 'cost-benefit', 'high-performance'].includes(stored.usageType) ? stored.usageType : initialBuildState.usageType,
    game: Object.fromEntries(Object.entries(initialBuildState.game).map(([key, fallback]) => [key, nonEmptyString(game[key], fallback)]))
  };
}

export function readPersistedBuild(storage) {
  try {
    return normalizePersistedBuild(JSON.parse(storage.getItem(buildStorageKey)));
  } catch (_error) {
    return normalizePersistedBuild(null);
  }
}
