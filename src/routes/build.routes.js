import { Router } from 'express';
import { checkCompatibility, selectComponents } from '../controllers/build.controller.js';

export const buildRoutes = Router();

buildRoutes.post('/selection', selectComponents);
buildRoutes.post('/check-compatibility', checkCompatibility);