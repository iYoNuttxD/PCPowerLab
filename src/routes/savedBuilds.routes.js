import { Router } from 'express';
import {
  createSavedBuild,
  getSavedBuild,
  getSavedBuilds,
  removeSavedBuild
} from '../controllers/savedBuildsController.js';

export const savedBuildsRoutes = Router();

savedBuildsRoutes.get('/', getSavedBuilds);
savedBuildsRoutes.get('/:id', getSavedBuild);
savedBuildsRoutes.post('/', createSavedBuild);
savedBuildsRoutes.delete('/:id', removeSavedBuild);
