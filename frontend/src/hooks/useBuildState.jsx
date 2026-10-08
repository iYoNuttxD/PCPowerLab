import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { buildToApiPayload, calculateBuildPrice, hydrateBuildComponents, recommendationSelection } from '../utils/buildHelpers.js';
import { normalizeWizardStep } from '../utils/wizardSteps.js';

const storageKey = 'pcpowerlab-build-state';

const emptyResults = {
  compatibility: null,
  alerts: null,
  bottlenecks: null,
  recommendation: null,
  gamePerformance: null,
  summary: null
};

const initialState = {
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
      setState((current) => current.selectedComponents[type] === component ? current : ({
        ...current,
        ...emptyResults,
        selectedComponents: {
          ...current.selectedComponents,
          [type]: component
        }
      }));
    },
    setFans(fans) {
      setState(current => ({ ...current, ...emptyResults, selectedComponents: { ...current.selectedComponents, fans } }));
    },
    removeComponent(type) {
      setState((current) => {
        const nextComponents = { ...current.selectedComponents };
        delete nextComponents[type];

        return {
          ...current,
          ...emptyResults,
          selectedComponents: nextComponents
        };
      });
    },
    setBudget(budget) {
      setState((current) => {
        const nextBudget = { ...current.budget, ...budget };
        const changed = Number(nextBudget.amount) !== Number(current.budget.amount)
          || nextBudget.currency !== current.budget.currency
          || nextBudget.priority !== current.budget.priority;
        return { ...current, ...(changed ? emptyResults : {}), budget: nextBudget };
      });
    },
    setUsageType(usageType) {
      setState((current) => ({
        ...current,
        ...(current.usageType !== usageType ? emptyResults : {}),
        usageType
      }));
    },
    setGame(game) {
      setState((current) => {
        const nextGame = { ...current.game, ...game };
        const changed = Object.keys(nextGame).some(key => nextGame[key] !== current.game[key]);
        return { ...current, game: nextGame, ...(changed ? { gamePerformance: null, summary: null } : {}) };
      });
    },
    setResult(key, value) {
      setState((current) => ({
        ...current,
        [key]: value
      }));
    },
    clearBuild() {
      setState(initialState);
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
        ...current,
        ...emptyResults,
        wizardStep: 'cpu',
        selectedComponents,
        budget: savedBuild?.budget || current.budget,
        usageType: savedBuild?.usageType || current.usageType
      }));
    },
    applyRecommendation(recommendation, { replaceCooling = false } = {}) {
      setState((current) => ({
        ...current,
        ...emptyResults,
        selectedComponents: recommendationSelection(current.selectedComponents, recommendation?.components || {}, replaceCooling),
        recommendation: null
      }));
    }
  }), []);

  const value = useMemo(() => ({
    ...state,
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
      ? { ...initialState, ...stored, selectedComponents: hydrateBuildComponents(stored.selectedComponents || {}), wizardStep: normalizeWizardStep(stored.wizardStep) }
      : initialState;
  } catch (_error) {
    return initialState;
  }
}
