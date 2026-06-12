import { Router } from 'express';
import {
  createSavedBuildVersionRecord,
  getSavedBuildVersion,
  getSavedBuildVersions,
  removeSavedBuildVersion
} from '../controllers/savedBuildVersionsController.js';

export const savedBuildVersionsRoutes = Router({ mergeParams: true });

savedBuildVersionsRoutes.get('/', getSavedBuildVersions);
savedBuildVersionsRoutes.get('/:versionId', getSavedBuildVersion);
savedBuildVersionsRoutes.post('/', createSavedBuildVersionRecord);
savedBuildVersionsRoutes.delete('/:versionId', removeSavedBuildVersion);