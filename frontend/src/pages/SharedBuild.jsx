import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Card from '../components/ui/Card.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import { sharingService } from '../services/sharingService.js';
import { componentLabels, componentTypes } from '../utils/componentLabels.js';
import { formatCurrency } from '../utils/formatCurrency.js';

export default function SharedBuild() {
  const { shareId } = useParams();
  const [sharedBuild, setSharedBuild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    sharingService.get(shareId)
      .then(setSharedBuild)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [shareId]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  const summary = sharedBuild?.buildSummary || sharedBuild?.summary || {};
  const components = summary.components || sharedBuild?.components || {};

  return (
    <div className="page-stack">
      <section className="page-hero compact-hero">
        <span className="eyebrow">Build compartilhada</span>
        <h1>{summary.name || sharedBuild?.name || shareId}</h1>
        <p>Visualização somente leitura de uma configuração compartilhada.</p>
      </section>

      <Card>
        <div className="section-heading compact">
          <h2>Resumo</h2>
          <strong>{formatCurrency(summary.totalEstimatedPrice)}</strong>
        </div>
        <p>{summary.summary || 'Resumo não informado.'}</p>
        <p>{summary.finalRecommendation}</p>
      </Card>

      <Card>
        <h2>Componentes</h2>
        <ul className="build-parts-list">
          {componentTypes.map((type) => (
            <li key={type}>
              <span>{componentLabels[type]}</span>
              <strong>{components[type]?.name || components[type] || 'Não informado'}</strong>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
