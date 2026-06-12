import {
  createRecommendationFeedback,
  deleteRecommendationFeedback,
  getRecommendationFeedbackById,
  listRecommendationFeedback
} from '../services/recommendationFeedbackService.js';
import { created, ok } from '../utils/api-response.js';

export function getRecommendationFeedback(req, res, next) {
  try {
    const feedback = listRecommendationFeedback(req.query);

    return ok(res, feedback, 'Avaliacoes de recomendacoes encontradas com sucesso.');
  } catch (error) {
    return next(error);
  }
}

export function getRecommendationFeedbackRecord(req, res, next) {
  try {
    const feedback = getRecommendationFeedbackById(req.params.id);

    return ok(res, feedback, 'Avaliacao da recomendacao encontrada com sucesso.');
  } catch (error) {
    return next(error);
  }
}

export function createRecommendationFeedbackRecord(req, res, next) {
  try {
    const feedback = createRecommendationFeedback(req.body);

    return created(res, feedback, 'Avaliacao da recomendacao registrada com sucesso.');
  } catch (error) {
    return next(error);
  }
}

export function removeRecommendationFeedback(req, res, next) {
  try {
    const removedFeedback = deleteRecommendationFeedback(req.params.id);

    return ok(res, removedFeedback, 'Avaliacao da recomendacao removida com sucesso.');
  } catch (error) {
    return next(error);
  }
}
