import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { buildToApiPayload, calculateBuildPrice } from '../utils/buildHelpers.js';

const storageKey = 'pcpowerlab-build-state';

const initialState = {
  selectedComponents: {},
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
  compatibility: null,
  alerts: null,
  bottlenecks: null,
  recommendation: null,
  gamePerformance: null,
  summary: null
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
    selectComponent(type, component) {
      setState((current) => ({
        ...current,
        selectedComponents: {
          ...current.selectedComponents,
          [type]: component
        }
      }));
    },
    removeComponent(type) {
      setState((current) => {
        const nextComponents = { ...current.selectedComponents };
        delete nextComponents[type];

        return {
          ...current,
          selectedComponents: nextComponents
        };
      });
    },
    setBudget(budget) {
      setState((current) => ({
        ...current,
        budget: {
          ...current.budget,
          ...budget
        }
      }));
    },
    setUsageType(usageType) {
      setState((current) => ({
        ...current,
        usageType
      }));
    },
    setGame(game) {
      setState((current) => ({
        ...current,
        game: {
          ...current.game,
          ...game
        }
      }));
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
      const selectedComponents = ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'case'].reduce((selection, type) => {
        const id = components[type] || components[`${type}Id`];

        return id
          ? { ...selection, [type]: componentMap[id] || { id } }
          : selection;
      }, {});

      setState((current) => ({
        ...current,
        selectedComponents,
        budget: savedBuild?.budget || current.budget,
        usageType: savedBuild?.usageType || current.usageType
      }));
    },
    applyRecommendation(recommendation) {
      setState((current) => ({
        ...current,
        selectedComponents: recommendation?.components || {},
        recommendation
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
      ? { ...initialState, ...stored }
      : initialState;
  } catch (_error) {
    return initialState;
  }
}
