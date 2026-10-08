import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { buildToApiPayload, calculateBuildPrice, hydrateBuildComponents, recommendationSelection } from '../utils/buildHelpers.js';
import { normalizeWizardStep } from '../utils/wizardSteps.js';

import { emptyResults, changeSelection, replaceBuildComponent, undoBuildReplacement, analyzedResults } from '../utils/buildTransitions.js';

const storageKey = 'pcpowerlab-build-state';

const initialState = {
  revision: 0,
  replacementHistory: [],
  wizardStep: 'cpu',
  selectedComponents: { fans: [] },
  budget: {
    amount: '',
    currency: 'BRL',
    priority: 'cost-benefit'
  },
  usageType: 'gaming',
  game: {
    gameId: 'game-cyberpunk-2077',
    targetResolution: '1080p',
    qualityPreset: 'high'
  },
  ...emptyResults
};

const BuildContext = createContext(null);

export function BuildProvider({ children }) {
  const [state, setState] = useState(() => loadInitialState());

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (_error) {
      // Persistência local é apenas conveniência; a UI continua funcionando sem ela.
    }
  }, [state]);

  const actions = useMemo(() => ({
    setWizardStep(step) {
      setState((current) => ({ ...current, wizardStep: normalizeWizardStep(step) }));
    },
    selectComponent(type, component) {
      setState(current => current.selectedComponents[type]?.id === component?.id ? current
        : changeSelection(current, { ...current.selectedComponents, [type]: component }));
    },
    replaceComponent(type, component, summary, expectedRevision) {
      setState(current => replaceBuildComponent(current, type, component, summary, expectedRevision));
    },
    undoReplacement() {
      setState(undoBuildReplacement);
    },
    setAnalyzedSummary(summary, expectedRevision) {
      setState(current => current.revision === expectedRevision ? { ...current, ...analyzedResults(summary) } : current);
    },
    setFans(fans) {
      setState(current => changeSelection(current, { ...current.selectedComponents, fans }));
    },
    removeComponent(type) {
      setState(current => {
        if (!current.selectedComponents[type]) return current;
        const nextComponents = { ...current.selectedComponents };
        delete nextComponents[type];
        return changeSelection(current, nextComponents);
      });
    },
    setBudget(budget) {
      setState((current) => {
        const nextBudget = { ...current.budget, ...budget };
        const changed = Number(nextBudget.amount) !== Number(current.budget.amount)
          || nextBudget.currency !== current.budget.currency
          || nextBudget.priority !== current.budget.priority;
        return { ...current, ...(changed ? { ...emptyResults, revision: current.revision + 1 } : {}), budget: nextBudget };
      });
    },
    setUsageType(usageType) {
      setState((current) => ({
        ...current,
        ...(current.usageType !== usageType ? { ...emptyResults, revision: current.revision + 1 } : {}),
        usageType
      }));
    },
    setGame(game) {
      setState((current) => {
        const nextGame = { ...current.game, ...game };
        const changed = Object.keys(nextGame).some(key => nextGame[key] !== current.game[key]);
        return { ...current, game: nextGame, ...(changed ? { gamePerformance: null, summary: null, revision: current.revision + 1 } : {}) };
      });
    },
    setResult(key, value) {
      setState((current) => ({
        ...current,
        [key]: value
      }));
    },
    clearBuild() {
      setState(current => ({ ...initialState, revision: current.revision + 1 }));
      try {
        localStorage.removeItem(storageKey);
      } catch (_error) {
        // Sem ação: alguns navegadores podem bloquear storage local.
      }
    },
    loadSavedBuild(savedBuild, componentMap = {}) {
      const components = savedBuild?.components || {};
      const selectedComponents = hydrateBuildComponents(components, componentMap);

      setState((current) => ({
        ...changeSelection(current, selectedComponents, { remember: false }),
        wizardStep: 'cpu',
        selectedComponents,
        budget: savedBuild?.budget || current.budget,
        usageType: savedBuild?.usageType || current.usageType
      }));
    },
    applyRecommendation(recommendation, { replaceCooling = false } = {}) {
      setState(current => changeSelection(current,
        recommendationSelection(current.selectedComponents, recommendation?.components || {}, replaceCooling)));

    }
  }), []);

  const value = useMemo(() => ({
    ...state,
    canUndo: Boolean(state.replacementHistory?.length),
    totalPrice: calculateBuildPrice(state.selectedComponents),
    buildPayload: buildToApiPayload(state.selectedComponents),
    actions
  }), [state, actions]);

  return (
    <BuildContext.Provider value={value}>
      {children}
    </BuildContext.Provider>
  );
}

export function useBuildState() {
  const context = useContext(BuildContext);

  if (!context) {
    throw new Error('useBuildState deve ser usado dentro de BuildProvider.');
  }

  return context;
}

function loadInitialState() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey));

    return stored && typeof stored === 'object'
      ? { ...initialState, ...stored, replacementHistory: Array.isArray(stored.replacementHistory) ? stored.replacementHistory.slice(-20).map(item => hydrateBuildComponents(item)) : [], revision: Number.isSafeInteger(stored.revision) ? stored.revision : 0, selectedComponents: hydrateBuildComponents(stored.selectedComponents || {}), wizardStep: normalizeWizardStep(stored.wizardStep) }
      : initialState;
  } catch (_error) {
    return initialState;
  }
}
