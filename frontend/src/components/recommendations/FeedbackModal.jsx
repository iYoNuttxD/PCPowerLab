import { useState } from 'react';
import Alert from '../ui/Alert.jsx';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import Modal from '../ui/Modal.jsx';
import Select from '../ui/Select.jsx';
import { recommendationFeedbackService } from '../../services/recommendationFeedbackService.js';

const recommendationTypeLabels = {
  'budget-recommendation': 'Recomendação por orçamento',
  'build-recommendation': 'Recomendação de build',
  'upgrade-suggestion': 'Sugestão de upgrade',
  'ready-build': 'Build pronta',
  'compatibility-fix': 'Correção de compatibilidade',
  general: 'Geral'
};

export default function FeedbackModal({ open, context, onClose, onSuccess }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [wouldFollow, setWouldFollow] = useState('true');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submitFeedback(event) {
    event.preventDefault();
    const numericRating = Number(rating);

    if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
      setError('Informe uma nota entre 1 e 5.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await recommendationFeedbackService.create({
        recommendationType: context?.recommendationType || 'general',
        ...(context?.recommendationId && { recommendationId: context.recommendationId }),
        rating: numericRating,
        ...(comment.trim() && { comment: comment.trim().slice(0, 500) }),
        wouldFollowRecommendation: wouldFollow === 'true'
      });
      setComment('');
      setRating(5);
      setWouldFollow('true');
      onSuccess?.('Feedback registrado com sucesso.');
      onClose();
    } catch (feedbackError) {
      setError(feedbackError.message || 'Não foi possível registrar o feedback.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} title="Avaliar recomendação" onClose={onClose}>
      <form className="profile-form" onSubmit={submitFeedback}>
        {error && <Alert type="error">{error}</Alert>}
        <p>
          Avaliando: <strong>{context?.title || recommendationTypeLabels[context?.recommendationType] || 'Recomendação'}</strong>
        </p>
        <Input
          label="Nota"
          type="number"
          min="1"
          max="5"
          value={rating}
          onChange={(event) => setRating(event.target.value)}
        />
        <Select
          label="Você seguiria esta recomendação?"
          value={wouldFollow}
          onChange={(event) => setWouldFollow(event.target.value)}
          options={[
            { value: 'true', label: 'Sim' },
            { value: 'false', label: 'Não' }
          ]}
        />
        <label className="field">
          <span>Comentário opcional</span>
          <textarea rows={4} maxLength={500} value={comment} onChange={(event) => setComment(event.target.value)} />
        </label>
        <div className="button-row">
          <Button type="submit" loading={loading} disabled={loading}>Enviar feedback</Button>
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
        </div>
      </form>
    </Modal>
  );
}
