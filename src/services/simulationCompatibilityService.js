import { requiredBuildSlots, selectBuildComponents } from './build.service.js';
import { evaluateResolvedBuildCompatibility } from './compatibility.service.js';

// Four-slot legacy simulations describe performance only, never a verified PC.
export function validateSimulationCompatibility(input) {
  const nested = input.components ?? {};
  const complete = requiredBuildSlots.every((slot) => (
    input[`${slot}Id`] ?? input[slot] ?? nested[slot] ?? nested[`${slot}Id`]
  ) != null);
  if (!complete) return { scope: 'partial_build', status: 'unverified', compatible: false };

  const compatibility = evaluateResolvedBuildCompatibility(selectBuildComponents(input));
  return { scope: 'full_build', status: compatibility.status, compatible: compatibility.compatible,
    scenarioOnly: compatibility.compatible !== true, alerts: compatibility.alerts,
    unverifiedChecks: compatibility.unverifiedChecks, coolingAssessment: compatibility.coolingAssessment };

}
