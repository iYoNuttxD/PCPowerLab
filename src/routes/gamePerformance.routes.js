import { Router } from 'express';
import {
  compareGames,
  getGameById,
  getGames,
  simulateGame
} from '../controllers/gamePerformanceController.js';

export const gamePerformanceRoutes = Router();

gamePerformanceRoutes.get('/games', getGames);
gamePerformanceRoutes.get('/games/:id', getGameById);
gamePerformanceRoutes.post('/simulate-game', simulateGame);
gamePerformanceRoutes.post('/compare-games', compareGames);
