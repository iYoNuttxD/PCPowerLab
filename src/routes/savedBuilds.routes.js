import { Router } from 'express';
import {
  createSavedBuild,
  editSavedBuild,
  getSavedBuild,
  getSavedBuildJsonExport,
  getSavedBuilds,
  removeSavedBuild
} from '../controllers/savedBuildsController.js';
import {
  revalidateSavedBuilds,
  revalidateSingleSavedBuild
} from '../controllers/savedBuildRevalidationController.js';
import { savedBuildVersionsRoutes } from './savedBuildVersions.routes.js';

export const savedBuildsRoutes = Router();

savedBuildsRoutes.get('/', getSavedBuilds);
savedBuildsRoutes.post('/revalidate', revalidateSavedBuilds);
savedBuildsRoutes.get('/:id/export/json', getSavedBuildJsonExport);
savedBuildsRoutes.post('/:id/revalidate', revalidateSingleSavedBuild);
savedBuildsRoutes.use('/:id/versions', savedBuildVersionsRoutes);
savedBuildsRoutes.get('/:id', getSavedBuild);
savedBuildsRoutes.post('/', createSavedBuild);
savedBuildsRoutes.put('/:id', editSavedBuild);
savedBuildsRoutes.patch('/:id', editSavedBuild);
savedBuildsRoutes.delete('/:id', removeSavedBuild);
