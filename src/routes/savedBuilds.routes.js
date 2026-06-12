import { Router } from 'express';
import {
  createSavedBuild,
  editSavedBuild,
  getSavedBuild,
  getSavedBuildJsonExport,
  getSavedBuilds,
  removeSavedBuild
} from '../controllers/savedBuildsController.js';
import { savedBuildVersionsRoutes } from './savedBuildVersions.routes.js';

export const savedBuildsRoutes = Router();

savedBuildsRoutes.get('/', getSavedBuilds);
savedBuildsRoutes.get('/:id/export/json', getSavedBuildJsonExport);
savedBuildsRoutes.use('/:id/versions', savedBuildVersionsRoutes);
savedBuildsRoutes.get('/:id', getSavedBuild);
savedBuildsRoutes.post('/', createSavedBuild);
savedBuildsRoutes.put('/:id', editSavedBuild);
savedBuildsRoutes.patch('/:id', editSavedBuild);
savedBuildsRoutes.delete('/:id', removeSavedBuild);