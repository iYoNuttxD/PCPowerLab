import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearRecommendationFeedbackForTests,
  createRecommendationFeedback,
  deleteRecommendationFeedback,
  getRecommendationFeedbackById,
  listRecommendationFeedback
} from '../src/services/recommendationFeedbackService.js';

const validFeedbackInput = {
  recommendationType: 'upgrade-suggestion',
  recommendationId: 'upgrade-001',
  rating: 4,
  comment: 'A sugestao fez sentido, mas o custo ficou um pouco acima do esperado.',
  wouldFollowRecommendation: true
};

test('deve registrar avaliacao de recomendacao', () => {
  clearRecommendationFeedbackForTests();

  const feedback = createRecommendationFeedback(validFeedbackInput);

  assert.equal(feedback.id, 'feedback-001');
  assert.equal(feedback.recommendationType, 'upgrade-suggestion');
  assert.equal(feedback.recommendationId, 'upgrade-001');
  assert.equal(feedback.rating, 4);
  assert.equal(feedback.comment, validFeedbackInput.comment);
  assert.equal(feedback.wouldFollowRecommendation, true);
  assert.equal(Boolean(feedback.createdAt), true);
});

test('deve listar avaliacoes registradas', () => {
  clearRecommendationFeedbackForTests();
  createRecommendationFeedback(validFeedbackInput);

  const feedbackList = listRecommendationFeedback();

  assert.equal(feedbackList.length, 1);
  assert.equal(feedbackList[0].recommendationType, 'upgrade-suggestion');
});

test('deve filtrar avaliacoes por tipo de recomendacao', () => {
  clearRecommendationFeedbackForTests();
  createRecommendationFeedback(validFeedbackInput);
  createRecommendationFeedback({
    ...validFeedbackInput,
    recommendationType: 'build-recommendation',
    recommendationId: 'build-rec-001',
    rating: 5
  });

  const feedbackList = listRecommendationFeedback({ recommendationType: ' upgrade-suggestion ' });

  assert.equal(feedbackList.length, 1);
  assert.equal(feedbackList[0].recommendationType, 'upgrade-suggestion');
});

test('deve consultar avaliacao por ID', () => {
  clearRecommendationFeedbackForTests();
  const feedback = createRecommendationFeedback(validFeedbackInput);

  const foundFeedback = getRecommendationFeedbackById(feedback.id);

  assert.equal(foundFeedback.id, feedback.id);
});

test('deve remover avaliacao de recomendacao', () => {
  clearRecommendationFeedbackForTests();
  const feedback = createRecommendationFeedback(validFeedbackInput);

  const removedFeedback = deleteRecommendationFeedback(feedback.id);

  assert.equal(removedFeedback.id, feedback.id);
  assert.equal(listRecommendationFeedback().length, 0);
});

test('deve permitir registrar avaliacao sem campos opcionais', () => {
  clearRecommendationFeedbackForTests();

  const feedback = createRecommendationFeedback({
    recommendationType: 'general',
    rating: 3
  });

  assert.equal(feedback.recommendationType, 'general');
  assert.equal(feedback.rating, 3);
  assert.equal(Object.prototype.hasOwnProperty.call(feedback, 'recommendationId'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(feedback, 'comment'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(feedback, 'wouldFollowRecommendation'), false);
});

test('deve retornar erro controlado quando campos obrigatorios estiverem ausentes', () => {
  clearRecommendationFeedbackForTests();

  assert.throws(
    () => createRecommendationFeedback({
      rating: 4
    }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Dados obrigatorios ausentes para registrar avaliacao da recomendacao.');
      assert.equal(error.errors.includes('recommendationType deve ser informado.'), true);
      return true;
    }
  );
});

test('deve retornar erro controlado para nota invalida', () => {
  clearRecommendationFeedbackForTests();

  assert.throws(
    () => createRecommendationFeedback({
      ...validFeedbackInput,
      rating: 6
    }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Nota da recomendacao invalida.');
      assert.equal(error.errors.includes('rating deve ser um numero entre 1 e 5.'), true);
      return true;
    }
  );
});

test('deve retornar erro controlado para tipo de recomendacao invalido', () => {
  clearRecommendationFeedbackForTests();

  assert.throws(
    () => createRecommendationFeedback({
      ...validFeedbackInput,
      recommendationType: 'tipo-invalido'
    }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Tipo de recomendacao invalido.');
      assert.equal(error.errors[0].includes('upgrade-suggestion'), true);
      return true;
    }
  );
});

test('deve retornar erro controlado quando comentario for muito longo', () => {
  clearRecommendationFeedbackForTests();

  assert.throws(
    () => createRecommendationFeedback({
      ...validFeedbackInput,
      comment: 'a'.repeat(501)
    }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Comentario da avaliacao muito longo.');
      return true;
    }
  );
});

test('deve retornar erro controlado para ID inexistente', () => {
  clearRecommendationFeedbackForTests();

  assert.throws(
    () => getRecommendationFeedbackById('feedback-inexistente'),
    (error) => {
      assert.equal(error.statusCode, 404);
      assert.equal(error.message, 'Avaliacao da recomendacao nao encontrada.');
      return true;
    }
  );
});
