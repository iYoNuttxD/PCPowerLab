import { Router } from 'express';
import {
  createAnalysisHistory,
  getAnalysisHistory,
  getAnalysisHistoryRecord,
  removeAnalysisHistory
} from '../controllers/analysisHistoryController.js';

export const analysisHistoryRoutes = Router();

analysisHistoryRoutes.get('/', getAnalysisHistory);
analysisHistoryRoutes.get('/:id', getAnalysisHistoryRecord);
analysisHistoryRoutes.post('/', createAnalysisHistory);
analysisHistoryRoutes.delete('/:id', removeAnalysisHistory);