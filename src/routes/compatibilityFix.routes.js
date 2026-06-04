import { Router } from 'express';
import { getCompatibilityFixSuggestions } from '../controllers/compatibilityFixController.js';

export const compatibilityFixRoutes = Router();

compatibilityFixRoutes.post('/fix-suggestions', getCompatibilityFixSuggestions);
