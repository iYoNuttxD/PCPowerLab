import test from 'node:test';
import assert from 'node:assert/strict';
import { readyBuilds } from '../src/data/readyBuilds.js';
import { savedBuildVersions } from '../src/data/savedBuildVersions.js';
import { saveBuild, deleteSavedBuild } from '../src/services/savedBuildsService.js';
import { createSavedBuildVersion, listSavedBuildVersions } from '../src/services/savedBuildVersionsService.js';
import { revalidateSavedBuild } from '../src/services/savedBuildRevalidationService.js';
import { listNotifications } from '../src/services/notificationsService.js';
import { createBuildShare, getSharedBuildById } from '../src/services/shareBuildService.js';

test('deleting a saved build removes dependent versions and notifications but preserves other builds and shared snapshots', () => {
  const components = { ...readyBuilds[0].components, psuId: 'psu-generic-400w' };
  const first = saveBuild({ name: 'Remove lifecycle', components });
  const second = saveBuild({ name: 'Keep lifecycle', components });
  for (const build of [first, second]) {
    createSavedBuildVersion(build.id, { buildSnapshot: build });
    assert.ok(revalidateSavedBuild(build.id).notificationsCreated > 0);
    assert.equal(listSavedBuildVersions(build.id).length, 1);
  }
  const share = createBuildShare({ buildId: first.id });
  const snapshot = JSON.stringify(share.buildSummary);
  const keptVersions = listSavedBuildVersions(second.id);
  const keptNotifications = listNotifications({ buildId: second.id });

  deleteSavedBuild(first.id);

  assert.equal(savedBuildVersions.some(version => version.buildId === first.id), false);
  assert.deepEqual(listNotifications({ buildId: first.id }), []);
  assert.deepEqual(listSavedBuildVersions(second.id), keptVersions);
  assert.deepEqual(listNotifications({ buildId: second.id }), keptNotifications);
  assert.equal(JSON.stringify(getSharedBuildById(share.shareId).buildSummary), snapshot);
});
