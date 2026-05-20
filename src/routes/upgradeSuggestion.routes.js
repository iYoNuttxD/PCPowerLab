import { Router } from 'express';
import { suggestBuildUpgrades } from '../controllers/upgradeSuggestionController.js';

export const upgradeSuggestionRoutes = Router();

upgradeSuggestionRoutes.post('/suggest', suggestBuildUpgrades);
