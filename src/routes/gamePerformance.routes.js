import { Router } from 'express';
import {
  getGameById,
  getGames,
  simulateGame
} from '../controllers/gamePerformanceController.js';

export const gamePerformanceRoutes = Router();

gamePerformanceRoutes.get('/games', getGames);
gamePerformanceRoutes.get('/games/:id', getGameById);
gamePerformanceRoutes.post('/simulate-game', simulateGame);
