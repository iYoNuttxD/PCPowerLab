import { Router } from 'express';
import {
  createRecommendationFeedbackRecord,
  getRecommendationFeedback,
  getRecommendationFeedbackRecord,
  removeRecommendationFeedback
} from '../controllers/recommendationFeedbackController.js';

export const recommendationFeedbackRoutes = Router();

recommendationFeedbackRoutes.get('/', getRecommendationFeedback);
recommendationFeedbackRoutes.get('/:id', getRecommendationFeedbackRecord);
recommendationFeedbackRoutes.post('/', createRecommendationFeedbackRecord);
recommendationFeedbackRoutes.delete('/:id', removeRecommendationFeedback);
