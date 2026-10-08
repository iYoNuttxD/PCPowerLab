import ComponentIdentity from '../components/componentsCatalog/ComponentIdentity.jsx';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import CompatibilityStatus from '../components/compatibility/CompatibilityStatus.jsx';
import Card from '../components/ui/Card.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import { sharingService } from '../services/sharingService.js';
import { componentLabels, componentTypes } from '../utils/componentLabels.js';
import { formatCurrency } from '../utils/formatCurrency.js';

export default function SharedBuild() {
  const { shareId } = useParams();
  const [request, setRequest] = useState({ shareId: null, status: 'loading', data: null, error: '' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setRequest({ shareId, status: 'loading', data: null, error: '' });
    sharingService.get(shareId)
      .then((data) => { if (active) setRequest({ shareId, status: 'success', data, error: '' }); })
      .catch((requestError) => { if (active) setRequest({ shareId, status: 'error', data: null, error: requestError.message }); });
    return () => { active = false; };
  }, [shareId, attempt]);

  const sharedBuild = request.shareId === shareId ? request.data : null;
  const loading = request.shareId !== shareId || request.status === 'loading';
  const error = request.shareId === shareId ? request.error : '';
  const summary = sharedBuild?.buildSummary || sharedBuild?.summary || {};
  const components = summary.components || sharedBuild?.components || {};

  return (
    <div className="page-stack">
      <section className="page-hero compact-hero">
        <span className="eyebrow">Build compartilhada</span>
        <h1>{summary.name || sharedBuild?.name || 'Configuração compartilhada'}</h1>
        <p>Visualização somente leitura de uma configuração compartilhada.</p>
      </section>

      {loading && <LoadingSpinner label="Carregando configuração compartilhada..." />}
      {error && <ErrorState message={error} onRetry={() => setAttempt(value => value + 1)} />}
      {!loading && !error && <>
      <Card>
        <div className="section-heading compact">
          <h2>Resumo</h2>
          <strong><small className="estimated-price-label">Total estimado de referência</small>{formatCurrency(summary.totalEstimatedPrice)}</strong>
        </div>
        <p>{summary.summary || 'Resumo não informado.'}</p>
        <p>{summary.finalRecommendation}</p>
      </Card>

      {summary.compatibility && <CompatibilityStatus result={summary.compatibility} />}

      <Card>
        <h2>Componentes</h2>
        <ul className="build-parts-list">
          {componentTypes.map((type) => (
            <li key={type}>
              <span>{componentLabels[type]}</span>
              <ComponentIdentity component={components[type] || components[`${type}Id`]} category={type} />
            </li>
          ))}
          {(components.cooler || components.coolerId) && (
            <li>
              <span>{componentLabels.cooler}</span>
              <ComponentIdentity component={components.cooler || components.coolerId} category="cooler" />
            </li>
          )}
          {(Array.isArray(components.fans) ? components.fans : []).map((fan, index) => (
            <li key={fan.id || fan.fanId || index}>
              <span>{componentLabels.fan} · {fan.quantity ?? 1} pack(s)</span>
              <ComponentIdentity component={fan} category="fan" />
            </li>
          ))}
        </ul>
      </Card>
      </>}
    </div>
  );
}
