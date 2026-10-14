import ComponentIdentity from '../components/componentsCatalog/ComponentIdentity.jsx';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import CompatibilityStatus from '../components/compatibility/CompatibilityStatus.jsx';
import Alert from '../components/ui/Alert.jsx';
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
  const compatibility = summary.compatibility;
  const hasCompatibilityEvidence = compatibility && typeof compatibility === 'object' && !Array.isArray(compatibility)
    && (typeof compatibility.compatible === 'boolean' || ['compatible', 'incompatible', 'unverified'].includes(compatibility.status));
  const compatibilityResult = hasCompatibilityEvidence ? {
    ...compatibility,
    compatible: typeof compatibility.compatible === 'boolean' ? compatibility.compatible : compatibility.status === 'compatible'
  } : null;

  return (
    <div className="page-stack">
      <section className="page-hero compact-hero shared-build-overview">
        <div>
          <span className="eyebrow">Build compartilhada</span>
          <h1>{summary.name || sharedBuild?.name || 'Configuração compartilhada'}</h1>
          <p className="shared-build-meta">Somente leitura · Compartilhamento: {shareId}</p>
          {sharedBuild?.buildId && <p className="shared-build-meta">Build de origem: {sharedBuild.buildId}</p>}
        </div>
        {!loading && !error && <strong><small className="estimated-price-label">Total estimado de referência</small>{formatCurrency(summary.totalEstimatedPrice)}</strong>}
      </section>

      {loading && <LoadingSpinner label="Carregando configuração compartilhada..." />}
      {error && <ErrorState message={error} onRetry={() => setAttempt(value => value + 1)} />}
      {!loading && !error && <>
      <div className="shared-build-verdict">
        <p>{summary.summary || 'Resumo não informado.'}</p>
        {summary.finalRecommendation && <p>{summary.finalRecommendation}</p>}
      </div>

      {compatibilityResult ? <CompatibilityStatus result={compatibilityResult} /> : (
        <Alert type="warning" title="Compatibilidade não verificada">Este compartilhamento não inclui uma análise de compatibilidade.</Alert>
      )}

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
              <span>{componentLabels.fan} · {fan.quantity ?? 1} pacote(s)</span>
              <ComponentIdentity component={fan} category="fan" />
            </li>
          ))}
        </ul>
      </Card>
      </>}
    </div>
  );
}
