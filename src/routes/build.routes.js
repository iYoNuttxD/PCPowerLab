import { Router } from 'express';
import { checkCompatibility } from '../controllers/build.controller.js';

export const buildRoutes = Router();

buildRoutes.post('/check-compatibility', checkCompatibility);
