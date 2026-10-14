import { isSelectableComponent } from '../utils/catalogAvailability.js';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { buildToApiPayload, calculateBuildPrice, hydrateBuildComponents, recommendationSelection } from '../utils/buildHelpers.js';
import { normalizeWizardStep } from '../utils/wizardSteps.js';

import { useComponents } from './useComponents.js';
import { reconcileBuildCatalog, emptyResults, changeSelection, replaceBuildComponent, undoBuildReplacement, analyzedResults } from '../utils/buildTransitions.js';

import { buildStorageKey as storageKey, initialBuildState as initialState, readPersistedBuild } from '../utils/buildPersistence.js';

const BuildContext = createContext(null);

export function BuildProvider({ children }) {
  const [state, setState] = useState(() => loadInitialState());
  const catalog = useComponents();
  const currentCatalog = useRef(null);
  if (!catalog.loading && !catalog.error) currentCatalog.current = catalog.componentMap;
  useEffect(() => {
    if (!catalog.loading && !catalog.error) setState(current => reconcileBuildCatalog(current, catalog.componentMap));
  }, [catalog.componentMap, catalog.loading, catalog.error]);

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
    setCoolingConditions(conditions) {
      // Local what-if inputs do not change the purchased build or its API analyses.
      // The pure thermal/acoustic model recomputes directly from these inputs.
      setState(current => ({ ...current, coolingConditions: { ...current.coolingConditions, ...conditions } }));
    },
    selectComponent(type, component) {
      component = currentCatalog.current?.[component?.id] || component;
      if (!isSelectableComponent(component)) return;
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
      const currentFans = hydrateBuildComponents({ fans }, currentCatalog.current || {}, { preferCatalog: true }).fans;
      setState(current => changeSelection(current, { ...current.selectedComponents, fans: currentFans }));
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
      const hydrated = hydrateBuildComponents(components, currentCatalog.current ?? componentMap, { preferCatalog: true });
      const selectedComponents = currentCatalog.current ? reconcileBuildCatalog({ selectedComponents: hydrated, replacementHistory: [], revision: 0 }, currentCatalog.current).selectedComponents : hydrated;

      setState((current) => ({
        ...changeSelection(current, selectedComponents, { remember: false }),
        wizardStep: 'cpu',
        selectedComponents,
        budget: { ...initialState.budget, ...(savedBuild?.budget || {}) },
        usageType: savedBuild?.usageType || current.usageType,
        coolingConditions: { ...initialState.coolingConditions }
      }));
    },
    applyRecommendation(recommendation, { replaceCooling = false } = {}) {
      setState(current => changeSelection(current,
        hydrateBuildComponents(recommendationSelection(current.selectedComponents, recommendation?.components || {}, replaceCooling), currentCatalog.current || {}, { preferCatalog: true })));

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
    return readPersistedBuild(localStorage);
  } catch (_error) {
    // Accessing localStorage itself may throw in privacy-restricted contexts.
    return readPersistedBuild(null);
  }
}
