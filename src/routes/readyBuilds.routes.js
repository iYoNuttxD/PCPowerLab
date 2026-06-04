import { Router } from 'express';
import {
  getReadyBuild,
  getReadyBuilds
} from '../controllers/readyBuildsController.js';

export const readyBuildsRoutes = Router();

readyBuildsRoutes.get('/', getReadyBuilds);
readyBuildsRoutes.get('/:id', getReadyBuild);