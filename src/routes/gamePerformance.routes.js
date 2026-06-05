import { Router } from 'express';
import {
  compareGames,
  getGameById,
  getGames,
  simulateGame
} from '../controllers/gamePerformanceController.js';
import { simulateProfessionalSoftware } from '../controllers/professionalSoftwareController.js';

export const gamePerformanceRoutes = Router();

gamePerformanceRoutes.get('/games', getGames);
gamePerformanceRoutes.get('/games/:id', getGameById);
gamePerformanceRoutes.post('/simulate-game', simulateGame);
gamePerformanceRoutes.post('/compare-games', compareGames);
gamePerformanceRoutes.post('/simulate-software', simulateProfessionalSoftware);
