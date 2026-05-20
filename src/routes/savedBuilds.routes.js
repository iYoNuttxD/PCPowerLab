import { Router } from 'express';
import {
  createSavedBuild,
  editSavedBuild,
  getSavedBuild,
  getSavedBuilds,
  removeSavedBuild
} from '../controllers/savedBuildsController.js';

export const savedBuildsRoutes = Router();

savedBuildsRoutes.get('/', getSavedBuilds);
savedBuildsRoutes.get('/:id', getSavedBuild);
savedBuildsRoutes.post('/', createSavedBuild);
savedBuildsRoutes.put('/:id', editSavedBuild);
savedBuildsRoutes.patch('/:id', editSavedBuild);
savedBuildsRoutes.delete('/:id', removeSavedBuild);
