import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Eye, Upload, Wand2 } from 'lucide-react';
import Alert from '../components/ui/Alert.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import Input from '../components/ui/Input.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import Modal from '../components/ui/Modal.jsx';
import Select from '../components/ui/Select.jsx';
import { useApiRequest } from '../hooks/useApiRequest.js';
import { useBuildState } from '../hooks/useBuildState.jsx';
import { useComponents } from '../hooks/useComponents.js';
import { buildRecommendationService } from '../services/buildRecommendationService.js';
import { readyBuildsService } from '../services/readyBuildsService.js';
import { componentLabels, componentTypes, priorityLabels, priorityOptions } from '../utils/componentLabels.js';
import { formatCurrency } from '../utils/formatCurrency.js';
import { translateValue } from '../utils/translations.js';

const readyBuildProfiles = [
  'all',
  'gaming',
  'study',
  'programming',
  'video-editing',
  'work',
  'streaming',
  'general',
  'cost-benefit',
  'high-performance'
];

const recommendationUsageTypes = readyBuildProfiles.filter((profile) => profile !== 'all');

const initialBudgetRange = {
  min: '',
  max: '',
  usageType: 'gaming',
  priority: 'cost-benefit'
};

export default function ReadyBuilds() {
  const navigate = useNavigate();
  const buildState = useBuildState();
  const { components, loading: componentsLoading, error: componentsError, reload: reloadComponents } = useComponents();
  const request = useApiRequest();
  const recommendationRequest = useApiRequest();
  const [selectedProfile, setSelectedProfile] = useState('all');
  const [readyBuilds, setReadyBuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [detailsBuild, setDetailsBuild] = useState(null);
  const [budgetRange, setBudgetRange] = useState(initialBudgetRange);
  const [recommendation, setRecommendation] = useState(null);

  const componentMap = useMemo(() => (
    Object.fromEntries(components.map((component) => [component.id, component]))
  ), [components]);

  useEffect(() => {
    loadReadyBuilds(selectedProfile);
  }, [selectedProfile]);

  async function loadReadyBuilds(profile = selectedProfile) {
    setLoading(true);
    request.setError('');

    try {
      const filters = profile && profile !== 'all' ? { profile } : {};
      const data = await readyBuildsService.list(filters);
      setReadyBuilds(Array.isArray(data) ? data : []);
    } catch (error) {
      request.setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  function applyReadyBuild(readyBuild, destination = '/summary') {
    const selectedComponents = mapReadyBuildToSelectedComponents(readyBuild, componentMap);

    if (!hasAllComponents(selectedComponents)) {
      setFeedback('Alguns componentes desta build ainda não foram carregados. Tente novamente em instantes.');
      return;
    }

    componentTypes.forEach((type) => {
      buildState.actions.selectComponent(type, selectedComponents[type]);
    });
    buildState.actions.setBudget({
      amount: readyBuild.targetBudgetRange?.max || '',
      currency: 'BRL',
      priority: 'cost-benefit'
    });
    buildState.actions.setUsageType(readyBuild.usageProfile || buildState.usageType);
    setFeedback(`Build "${readyBuild.name}" aplicada como build atual.`);

    if (destination) {
      navigate(destination);
    }
  }

  function applyRecommendation(recommendationData, destination = '/summary') {
    const selectedComponents = normalizeRecommendationComponents(recommendationData?.components);

    if (!hasAllComponents(selectedComponents)) {
      setFeedback('A recomendação não retornou todos os componentes necessários para aplicar a build.');
      return;
    }

    componentTypes.forEach((type) => {
      buildState.actions.selectComponent(type, selectedComponents[type]);
    });
    buildState.actions.setBudget({
      amount: budgetRange.max,
      currency: 'BRL',
      priority: budgetRange.priority
    });
    buildState.actions.setUsageType(budgetRange.usageType);
    buildState.actions.setResult('recommendation', recommendationData);
    setFeedback('Recomendação aplicada como build atual.');

    if (destination) {
      navigate(destination);
    }
  }

  async function submitBudgetRecommendation(event) {
    event.preventDefault();
    setFeedback('');

    const validationError = validateBudgetRange(budgetRange);
    if (validationError) {
      recommendationRequest.setError(validationError);
      return;
    }

    await recommendationRequest.run(async () => {
      const result = await buildRecommendationService.byBudgetRange({
        budgetRange: {
          min: Number(budgetRange.min),
          max: Number(budgetRange.max),
          currency: 'BRL'
        },
        usageType: budgetRange.usageType,
        priority: budgetRange.priority
      });

      setRecommendation(result);
      setFeedback('Recomendação por faixa de orçamento gerada com sucesso.');
    });
  }

  const renderReadyBuilds = () => {
    if (loading || componentsLoading) {
      return <LoadingSpinner />;
    }

    if (request.error || componentsError) {
      return (
        <ErrorState
          message={request.error || componentsError}
          onRetry={() => {
            loadReadyBuilds();
            reloadComponents();
          }}
        />
      );
    }

    if (readyBuilds.length === 0) {
      return (
        <EmptyState
          title="Nenhuma build pronta encontrada"
          message="Tente outro perfil de uso ou gere uma recomendação por faixa de orçamento."
        />
      );
    }

    return (
      <div className="cards-grid ready-build-grid">
        {readyBuilds.map((readyBuild) => (
          <ReadyBuildCard
            key={readyBuild.id}
            readyBuild={readyBuild}
            componentMap={componentMap}
            onApply={() => applyReadyBuild(readyBuild)}
            onDetails={() => setDetailsBuild(readyBuild)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="page-stack">
      <section className="page-hero compact-hero">
        <span className="eyebrow">Atalhos inteligentes</span>
        <h1>Builds prontas</h1>
        <p>Consulte configurações completas por perfil de uso ou gere uma recomendação dentro da sua faixa de orçamento.</p>
      </section>

      {feedback && <Alert type="success">{feedback}</Alert>}

      <Card>
        <div className="section-heading compact">
          <div>
            <h2>Configurações por perfil</h2>
            <p>Escolha um perfil para filtrar builds já validadas pelo backend.</p>
          </div>
          <Select
            label="Perfil de uso"
            value={selectedProfile}
            onChange={(event) => setSelectedProfile(event.target.value)}
            options={readyBuildProfiles.map((profile) => ({
              value: profile,
              label: profile === 'all' ? 'Todos os perfis' : translateValue(profile)
            }))}
          />
        </div>
      </Card>

      {renderReadyBuilds()}

      <Card>
        <div className="section-heading compact">
          <div>
            <h2>Recomendar build por orçamento</h2>
            <p>Informe uma faixa de preço para receber uma configuração completa compatível.</p>
          </div>
          <Wand2 size={28} aria-hidden="true" />
        </div>

        <form className="form-grid" onSubmit={submitBudgetRecommendation}>
          <Input
            label="Orçamento mínimo"
            type="number"
            min="1"
            value={budgetRange.min}
            onChange={(event) => setBudgetRange((current) => ({ ...current, min: event.target.value }))}
            required
          />
          <Input
            label="Orçamento máximo"
            type="number"
            min="1"
            value={budgetRange.max}
            onChange={(event) => setBudgetRange((current) => ({ ...current, max: event.target.value }))}
            required
          />
          <Select
            label="Tipo de uso"
            value={budgetRange.usageType}
            onChange={(event) => setBudgetRange((current) => ({ ...current, usageType: event.target.value }))}
            options={recommendationUsageTypes.map((usageType) => ({
              value: usageType,
              label: translateValue(usageType)
            }))}
          />
          <Select
            label="Prioridade"
            value={budgetRange.priority}
            onChange={(event) => setBudgetRange((current) => ({ ...current, priority: event.target.value }))}
            options={priorityOptions.map((priority) => ({
              value: priority,
              label: priorityLabels[priority] || translateValue(priority)
            }))}
          />
          <div className="button-row">
            <Button type="submit" loading={recommendationRequest.loading} disabled={recommendationRequest.loading}>
              <Wand2 size={18} /> Gerar recomendação
            </Button>
          </div>
        </form>

        {recommendationRequest.error && (
          <ErrorState
            message={recommendationRequest.error}
            onRetry={() => setBudgetRange((current) => ({ ...current, max: Number(current.max || 0) + 500 }))}
          />
        )}
        {recommendationRequest.loading && <LoadingSpinner />}
        {!recommendationRequest.loading && recommendation && (
          <RecommendationResultCard recommendation={recommendation} onApply={() => applyRecommendation(recommendation)} />
        )}
      </Card>

      <Modal
        open={Boolean(detailsBuild)}
        title={detailsBuild ? detailsBuild.name : 'Detalhes da build'}
        onClose={() => setDetailsBuild(null)}
      >
        {detailsBuild && (
          <ReadyBuildDetails readyBuild={detailsBuild} componentMap={componentMap} onApply={() => applyReadyBuild(detailsBuild)} />
        )}
      </Modal>
    </div>
  );
}

function ReadyBuildCard({ readyBuild, componentMap, onApply, onDetails }) {
  return (
    <Card as="article" className="ready-build-card">
      <div className="section-heading compact">
        <div>
          <h2>{readyBuild.name}</h2>
          <Badge color="cyan">{translateValue(readyBuild.usageProfile)}</Badge>
        </div>
        <strong className="price">{formatCurrency(readyBuild.estimatedTotalPrice)}</strong>
      </div>
      <p>{readyBuild.description}</p>
      <div className="metric-grid">
        <div>
          <span>Faixa de orçamento</span>
          <strong>{formatBudgetRange(readyBuild.targetBudgetRange)}</strong>
        </div>
        <div>
          <span>Desempenho esperado</span>
          <strong>{translateValue(readyBuild.expectedPerformanceLevel)}</strong>
        </div>
      </div>
      <ComponentPreviewList componentsInput={readyBuild.components} componentMap={componentMap} />
      <InfoList title="Limitações" items={readyBuild.limitations} emptyMessage="Nenhuma limitação informada." />
      <div className="button-row">
        <Button onClick={onApply}><Upload size={18} /> Usar esta build</Button>
        <Button variant="ghost" onClick={onDetails}><Eye size={18} /> Ver detalhes</Button>
      </div>
    </Card>
  );
}

function ReadyBuildDetails({ readyBuild, componentMap, onApply }) {
  return (
    <div className="page-stack">
      <p>{readyBuild.description}</p>
      <div className="metric-grid">
        <div>
          <span>Preço estimado</span>
          <strong>{formatCurrency(readyBuild.estimatedTotalPrice)}</strong>
        </div>
        <div>
          <span>Faixa de orçamento</span>
          <strong>{formatBudgetRange(readyBuild.targetBudgetRange)}</strong>
        </div>
        <div>
          <span>Perfil</span>
          <strong>{translateValue(readyBuild.usageProfile)}</strong>
        </div>
      </div>
      <ul className="build-parts-list">
        {componentTypes.map((type) => (
          <li key={type}>
            <span>{componentLabels[type]}</span>
            <strong>{getComponentName(readyBuild.components, type, componentMap)}</strong>
          </li>
        ))}
      </ul>
      <InfoList title="Indicado para" items={readyBuild.recommendedFor} emptyMessage="Nenhuma indicação informada." />
      <InfoList title="Limitações" items={readyBuild.limitations} emptyMessage="Nenhuma limitação informada." />
      <div className="button-row">
        <Button onClick={onApply}><Upload size={18} /> Usar esta build</Button>
        <Link className="btn btn-secondary btn-md" to="/build">Abrir no wizard</Link>
      </div>
    </div>
  );
}

function RecommendationResultCard({ recommendation, onApply }) {
  return (
    <Card className="recommendation-result-card">
      <div className="section-heading compact">
        <div>
          <h2>Build recomendada</h2>
          <p>{recommendation.summary || 'Configuração completa recomendada para a faixa informada.'}</p>
        </div>
        <strong className="price">{formatCurrency(recommendation.totalEstimatedPrice)}</strong>
      </div>
      <div className="metric-grid">
        <div>
          <span>Status do orçamento</span>
          <strong>{translateValue(recommendation.budgetStatus || 'compatible')}</strong>
        </div>
        <div>
          <span>Compatibilidade</span>
          <strong>{recommendation.compatible === false ? 'Incompatível' : 'Compatível'}</strong>
        </div>
        <div>
          <span>Desempenho</span>
          <strong>{translateValue(recommendation.performanceLevel || recommendation.expectedPerformanceLevel || 'good')}</strong>
        </div>
      </div>
      <ul className="build-parts-list">
        {componentTypes.map((type) => (
          <li key={type}>
            <span>{componentLabels[type]}</span>
            <strong>{recommendation.components?.[type]?.name || recommendation.components?.[type]?.id || 'Não informado'}</strong>
          </li>
        ))}
      </ul>
      <div className="button-row">
        <Button onClick={onApply}><CheckCircle2 size={18} /> Usar recomendação como build atual</Button>
        <Link className="btn btn-secondary btn-md" to="/summary">Ir para resumo</Link>
      </div>
    </Card>
  );
}

function ComponentPreviewList({ componentsInput, componentMap }) {
  const visibleTypes = ['cpu', 'gpu', 'motherboard', 'ram'];

  return (
    <ul className="build-parts-list compact-list">
      {visibleTypes.map((type) => (
        <li key={type}>
          <span>{componentLabels[type]}</span>
          <strong>{getComponentName(componentsInput, type, componentMap)}</strong>
        </li>
      ))}
    </ul>
  );
}

function InfoList({ title, items = [], emptyMessage }) {
  return (
    <div className="info-block">
      <h3>{title}</h3>
      {Array.isArray(items) && items.length > 0 ? (
        <ul>
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : (
        <p>{emptyMessage}</p>
      )}
    </div>
  );
}

function mapReadyBuildToSelectedComponents(readyBuild, componentMap) {
  return componentTypes.reduce((selection, type) => {
    const componentId = readyBuild.components?.[`${type}Id`] || readyBuild.components?.[type];

    return componentId
      ? { ...selection, [type]: componentMap[componentId] || { id: componentId } }
      : selection;
  }, {});
}

function normalizeRecommendationComponents(componentsInput = {}) {
  return componentTypes.reduce((selection, type) => {
    const component = componentsInput[type] || componentsInput[`${type}Id`];

    if (!component) {
      return selection;
    }

    return {
      ...selection,
      [type]: typeof component === 'string' ? { id: component } : component
    };
  }, {});
}

function hasAllComponents(selectedComponents) {
  return componentTypes.every((type) => selectedComponents[type]?.id);
}

function getComponentName(componentsInput, type, componentMap) {
  const componentId = componentsInput?.[`${type}Id`] || componentsInput?.[type];

  return componentMap[componentId]?.name || componentId || 'Não informado';
}

function formatBudgetRange(range) {
  if (!range) {
    return 'Não informado';
  }

  return `${formatCurrency(range.min)} a ${formatCurrency(range.max)}`;
}

function validateBudgetRange(range) {
  const min = Number(range.min);
  const max = Number(range.max);

  if (!Number.isFinite(min) || min <= 0) {
    return 'Informe um orçamento mínimo válido.';
  }

  if (!Number.isFinite(max) || max <= 0) {
    return 'Informe um orçamento máximo válido.';
  }

  if (min >= max) {
    return 'O orçamento mínimo deve ser menor que o orçamento máximo.';
  }

  return '';
}
