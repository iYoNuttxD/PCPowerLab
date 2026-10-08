import { buildToApiPayload, hasCompleteBuild } from './buildHelpers.js';
export function selectedComparisonBuilds({ savedBuilds = [], selectedIds = [], currentComponents = {}, includeCurrent = true }) {
  const chosen = savedBuilds.filter(build => selectedIds.includes(build.id)).map(build => ({ name: build.name, components: buildToApiPayload(build.components) }));
  if (includeCurrent && hasCompleteBuild(currentComponents)) chosen.unshift({ name: 'Montagem atual', components: buildToApiPayload(currentComponents) });
  return chosen;
}
