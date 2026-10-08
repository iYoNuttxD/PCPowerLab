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
  if (!compatibility.compatible) {
    const error = new Error('Simulacao indisponivel: a compatibilidade da configuracao nao foi confirmada.');
    error.statusCode = 422;
    error.errors = [...compatibility.alerts, ...compatibility.unverifiedChecks].map((entry) => entry.message);
    throw error;
  }
  return { scope: 'full_build', status: compatibility.status, compatible: true };
}
