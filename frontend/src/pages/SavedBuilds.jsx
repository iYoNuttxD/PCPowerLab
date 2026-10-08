import ComponentIdentity from '../components/componentsCatalog/ComponentIdentity.jsx';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, Clock3, Edit3, History, MessageSquare, RefreshCw, Share2, Trash2, Upload } from 'lucide-react';
import Alert from '../components/ui/Alert.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import Input from '../components/ui/Input.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import Modal from '../components/ui/Modal.jsx';
import { useApiRequest } from '../hooks/useApiRequest.js';
import { useBuildState } from '../hooks/useBuildState.jsx';
import { useComponents } from '../hooks/useComponents.js';
import { analysisHistoryService } from '../services/analysisHistoryService.js';
import { notificationsService } from '../services/notificationsService.js';
import { savedBuildsService } from '../services/savedBuildsService.js';
import { savedBuildVersionsService } from '../services/savedBuildVersionsService.js';
import { sharingService } from '../services/sharingService.js';
import { buildToApiPayload, hydrateBuildComponents } from '../utils/buildHelpers.js';
import { componentLabels, componentTypes } from '../utils/componentLabels.js';
import { formatCurrency } from '../utils/formatCurrency.js';
import { translateValue } from '../utils/translations.js';

const analysisTypeLabels = {
  compatibility: 'Compatibilidade',
  alerts: 'Alertas',
  bottlenecks: 'Gargalos',
  'game-performance': 'Desempenho em jogos',
  budget: 'Orçamento',
  recommendation: 'Recomendação',
  'build-summary': 'Resumo da build',
  'build-score': 'Nota geral',
  'upgrade-suggestion': 'Sugestão de upgrade'
};

export default function SavedBuilds() {
  const navigate = useNavigate();
  const buildState = useBuildState();
  const { components, loading: componentsLoading, error: componentsError, reload: reloadComponents } = useComponents();
  const request = useApiRequest();
  const [savedBuilds, setSavedBuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [editing, setEditing] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [versionsModal, setVersionsModal] = useState({ open: false, build: null, versions: [], loading: false });
  const [historyModal, setHistoryModal] = useState({ open: false, build: null, records: [], loading: false });
  const [detailModal, setDetailModal] = useState({ open: false, title: '', data: null });
  const [revalidationResult, setRevalidationResult] = useState(null);
  const [operationLoading, setOperationLoading] = useState('');
  const componentMap = useMemo(() => Object.fromEntries(components.map((component) => [component.id, component])), [components]);

  async function loadBuilds() {
    setLoading(true);
    request.setError('');
    try {
      const data = await savedBuildsService.list();
      setSavedBuilds(Array.isArray(data) ? data : []);
    } catch (error) {
      request.setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBuilds();
    loadNotifications();
  }, []);

  async function loadNotifications() {
    try {
      const data = await notificationsService.list();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (_error) {
      setNotifications([]);
    }
  }

  async function removeBuild(id) {
    await request.run(async () => {
      await savedBuildsService.remove(id);
      setFeedback('Build removida com sucesso.');
      await loadBuilds();
    });
  }

  async function revalidateAllBuilds() {
    setOperationLoading('revalidate-all');
    await request.run(async () => {
      const result = await savedBuildsService.revalidateAll();
      setRevalidationResult(result);
      setFeedback(`Revalidação concluída: ${result.checkedBuilds || 0} build(s) verificadas e ${result.notificationsCreated || 0} notificação(ões) criada(s).`);
      await loadNotifications();
    }).finally(() => setOperationLoading(''));
  }

  async function revalidateBuild(savedBuild) {
    setOperationLoading(`revalidate-${savedBuild.id}`);
    await request.run(async () => {
      const result = await savedBuildsService.revalidateById(savedBuild.id);
      setRevalidationResult(result);
      setFeedback(`Build revalidada: ${result.notificationsCreated || 0} notificação(ões) criada(s).`);
      await loadNotifications();
    }).finally(() => setOperationLoading(''));
  }

  async function markNotificationAsRead(notificationId) {
    await request.run(async () => {
      await notificationsService.markAsRead(notificationId);
      setFeedback('Notificação marcada como lida.');
      await loadNotifications();
    });
  }

  async function removeNotification(notificationId) {
    await request.run(async () => {
      await notificationsService.remove(notificationId);
      setFeedback('Notificação removida.');
      await loadNotifications();
    });
  }

  async function updateBuild(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    await request.run(async () => {
      await savedBuildsService.update(editing.id, {
        name: String(formData.get('name')).slice(0, 80),
        description: String(formData.get('description')).slice(0, 180)
      });
      setEditing(null);
      setFeedback('Build atualizada com sucesso.');
      await loadBuilds();
    });
  }

  async function shareBuild(savedBuild) {
    await request.run(async () => {
      const result = await sharingService.create({ buildId: savedBuild.id });
      const path = result?.shareUrl?.replace('/shared-builds/', '/shared/') || `/shared/${result?.shareId}`;
      setFeedback(`Link gerado: ${window.location.origin}${path}`);
    });
  }

  function loadIntoWizard(savedBuild, destination = '/build') {
    if (componentsLoading || componentsError) return;
    buildState.actions.loadSavedBuild(savedBuild, componentMap);
    navigate(destination);
  }

  async function openVersions(savedBuild) {
    setVersionsModal({ open: true, build: savedBuild, versions: [], loading: true });
    try {
      const data = await savedBuildVersionsService.list(savedBuild.id);
      setVersionsModal({ open: true, build: savedBuild, versions: Array.isArray(data) ? data : [], loading: false });
    } catch (error) {
      setVersionsModal({ open: true, build: savedBuild, versions: [], loading: false });
      request.setError(error.message);
    }
  }

  async function createVersion(savedBuild) {
    await request.run(async () => {
      await savedBuildVersionsService.create(savedBuild.id, {
        reason: `Snapshot criado pelo frontend em ${new Date().toLocaleString('pt-BR')}.`,
        buildSnapshot: buildSnapshotFromSavedBuild(savedBuild)
      });
      setFeedback('Versão criada com sucesso.');
      if (versionsModal.open && versionsModal.build?.id === savedBuild.id) {
        await openVersions(savedBuild);
      }
    });
  }

  async function removeVersion(version) {
    if (!versionsModal.build) return;

    await request.run(async () => {
      await savedBuildVersionsService.remove(versionsModal.build.id, version.id);
      setFeedback('Versão removida.');
      await openVersions(versionsModal.build);
    });
  }

  async function openHistory(savedBuild) {
    setHistoryModal({ open: true, build: savedBuild, records: [], loading: true });
    try {
      const data = await analysisHistoryService.list({ buildId: savedBuild.id });
      setHistoryModal({ open: true, build: savedBuild, records: Array.isArray(data) ? data : [], loading: false });
    } catch (error) {
      setHistoryModal({ open: true, build: savedBuild, records: [], loading: false });
      request.setError(error.message);
    }
  }

  async function removeHistoryRecord(record) {
    await request.run(async () => {
      await analysisHistoryService.remove(record.id);
      setFeedback('Registro de histórico removido.');
      if (historyModal.build) {
        await openHistory(historyModal.build);
      }
    });
  }

  return (
    <div className="page-stack">
      <section className="page-hero compact-hero">
        <span className="eyebrow">Garagem digital</span>
        <h1>Builds salvas</h1>
        <p>Visualize, edite, compartilhe, remova ou reabra uma configuração no assistente.</p>
      </section>

      {request.error && <ErrorState message={request.error} onRetry={loadBuilds} />}
      {feedback && <Alert type="success">{feedback}</Alert>}
      {loading && <LoadingSpinner />}
      {componentsLoading && <LoadingSpinner label="Carregando dados das peças salvas..." />}
      {componentsError && <ErrorState message={`Não foi possível carregar as peças salvas. ${componentsError}`} onRetry={reloadComponents} />}
      {!loading && !request.error && savedBuilds.length === 0 && <EmptyState title="Nenhuma build salva" message="Salve uma configuração no assistente ou no resumo final.">
        <Link className="btn btn-primary btn-md" to="/build">Montar meu PC</Link>
      </EmptyState>}

      <Card>
        <div className="section-heading compact">
          <div>
            <span className="eyebrow">Revalidação e notificações</span>
            <h2><Bell size={22} aria-hidden="true" /> Monitoramento das builds salvas</h2>
            <p>Reavalie compatibilidade e acompanhe alertas gerados por mudanças na base técnica.</p>
          </div>
          <Button
            variant="secondary"
            loading={operationLoading === 'revalidate-all'}
            disabled={request.loading || operationLoading === 'revalidate-all'}
            onClick={revalidateAllBuilds}
          >
            <RefreshCw size={18} /> Revalidar todas
          </Button>
        </div>
        {revalidationResult && <RevalidationResult result={revalidationResult} />}
        <NotificationsPanel
          notifications={notifications}
          onRead={markNotificationAsRead}
          onRemove={removeNotification}
        />
      </Card>

      <div className="cards-grid">
        {savedBuilds.map((savedBuild) => (
          <Card key={savedBuild.id} as="article">
            <div className="section-heading compact">
              <h2>{savedBuild.name}</h2>
              <strong>{formatCurrency(savedBuild.totalEstimatedPrice)}</strong>
            </div>
            <p>{savedBuild.description || 'Sem descrição.'}</p>
            <ul className="build-parts-list">
              {componentTypes.map((type) => (
                <li key={type}>
                  <span>{componentLabels[type]}</span>
                  <ComponentIdentity component={savedBuild.components?.[type] || savedBuild.components?.[`${type}Id`]} category={type} />
                </li>
              ))}
              {(savedBuild.components?.coolerId || savedBuild.components?.cooler) && (
                <li>
                  <span>{componentLabels.cooler}</span>
                  <ComponentIdentity component={savedBuild.components?.cooler || savedBuild.components?.coolerId} category="cooler" />
                </li>
              )}
              {(Array.isArray(savedBuild.components?.fans) ? savedBuild.components.fans : []).map((fan) => (
                <li key={fan.fanId || fan.id}>
                  <span>{componentLabels.fan} · {fan.quantity ?? 1} pack(s)</span>
                  <ComponentIdentity component={fan} category="fan" />
                </li>
              ))}
            </ul>
            <div className="button-row">
              <Button disabled={componentsLoading || Boolean(componentsError)} onClick={() => loadIntoWizard(savedBuild)}><Upload size={18} /> Abrir no wizard</Button>
              <Button variant="secondary" disabled={componentsLoading || Boolean(componentsError)} onClick={() => loadIntoWizard(savedBuild, '/summary')}>Trocar componente nesta configuração</Button>
              <Button variant="ghost" onClick={() => setEditing(savedBuild)}><Edit3 size={18} /> Editar</Button>
              <Button variant="ghost" onClick={() => shareBuild(savedBuild)}><Share2 size={18} /> Compartilhar</Button>
              <Button variant="ghost" onClick={() => openVersions(savedBuild)}><Clock3 size={18} /> Ver versões</Button>
              <Button variant="ghost" onClick={() => createVersion(savedBuild)}>Criar versão atual</Button>
              <Button variant="ghost" onClick={() => openHistory(savedBuild)}><History size={18} /> Histórico</Button>
              <Button
                variant="ghost"
                onClick={() => navigate('/feedback/new', {
                  state: {
                    mode: 'contextual',
                    recommendationType: 'general',
                    recommendationId: savedBuild.id,
                    recommendationTitle: 'Feedback sobre build salva',
                    summary: savedBuild.description || 'Avalie esta configuração salva.',
                    build: savedBuild.components,
                    buildSnapshot: feedbackSnapshotFromSavedBuild(savedBuild),
                    buildDetails: feedbackDetailsFromSavedBuild(savedBuild, componentMap),
                    totalEstimatedPrice: savedBuild.totalEstimatedPrice,
                    source: 'saved-builds'
                  }
                })}
              >
                <MessageSquare size={18} /> Enviar feedback
              </Button>
              <Button
                variant="secondary"
                loading={operationLoading === `revalidate-${savedBuild.id}`}
                disabled={request.loading || operationLoading === `revalidate-${savedBuild.id}`}
                onClick={() => revalidateBuild(savedBuild)}
              >
                <RefreshCw size={18} /> Revalidar compatibilidade
              </Button>
              <Link className="btn btn-secondary btn-md" to="/upgrades">Upgrade</Link>
              <Button variant="danger" onClick={() => removeBuild(savedBuild.id)}><Trash2 size={18} /> Excluir</Button>
            </div>
          </Card>
        ))}
      </div>

      {editing && (
        <Card>
          <h2>Editar build salva</h2>
          <form className="form-grid" onSubmit={updateBuild}>
            <Input label="Nome" name="name" defaultValue={editing.name} maxLength="80" required />
            <Input label="Descrição" name="description" defaultValue={editing.description || ''} maxLength="180" />
            <div className="button-row">
              <Button disabled={request.loading} type="submit">Salvar alterações</Button>
              <Button variant="ghost" type="button" onClick={() => setEditing(null)}>Cancelar</Button>
            </div>
          </form>
        </Card>
      )}

      <VersionsModal
        state={versionsModal}
        onClose={() => setVersionsModal({ open: false, build: null, versions: [], loading: false })}
        onShowSnapshot={(version) => setDetailModal({ open: true, title: `Snapshot da versão ${version.versionNumber}`, data: version.buildSnapshot })}
        onRemove={removeVersion}
      />

      <HistoryModal
        state={historyModal}
        onClose={() => setHistoryModal({ open: false, build: null, records: [], loading: false })}
        onShowDetails={(record) => setDetailModal({ open: true, title: `Detalhes de ${getAnalysisTypeLabel(record.analysisType)}`, data: record })}
        onRemove={removeHistoryRecord}
      />

      <Modal open={detailModal.open} title={detailModal.title} onClose={() => setDetailModal({ open: false, title: '', data: null })}>
        <pre className="json-preview">{JSON.stringify(detailModal.data || {}, null, 2)}</pre>
      </Modal>
    </div>
  );
}

function NotificationsPanel({ notifications, onRead, onRemove }) {
  if (!notifications.length) {
    return <p className="hint-text">Nenhuma notificação registrada até o momento.</p>;
  }

  return (
    <div className="notification-list">
      {notifications.map((notification) => (
        <article key={notification.id} className={`notification-card ${notification.read ? 'is-read' : ''}`}>
          <div>
            <div className="section-heading compact">
              <strong>{getSeverityLabel(notification.severity)}</strong>
              <Badge tone={notification.read ? 'green' : 'yellow'}>{notification.read ? 'Lida' : 'Não lida'}</Badge>
            </div>
            <p>{notification.message}</p>
            <small>Build: {notification.buildId || 'Não informada'} • {formatDate(notification.createdAt)}</small>
          </div>
          <div className="button-row">
            {!notification.read && (
              <Button variant="secondary" onClick={() => onRead(notification.id)}>
                <CheckCircle2 size={18} /> Marcar como lida
              </Button>
            )}
            <Button variant="danger" onClick={() => onRemove(notification.id)}>
              <Trash2 size={18} /> Remover
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}

function RevalidationResult({ result }) {
  const results = Array.isArray(result.results) ? result.results : [];

  return (
    <div className="revalidation-result">
      <div className="metric-grid compact-metric-grid">
        <div><span>Builds verificadas</span><strong>{result.checkedBuilds || 0}</strong></div>
        <div><span>Notificações criadas</span><strong>{result.notificationsCreated || 0}</strong></div>
      </div>
      {results.length > 0 && (
        <div className="compact-list">
          {results.map((item) => (
            <div key={item.buildId} className="admin-row">
              <span>{item.buildId}</span>
              <strong>{translateValue(item.status)}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VersionsModal({ state, onClose, onShowSnapshot, onRemove }) {
  return (
    <Modal open={state.open} title={`Versões de ${state.build?.name || 'build salva'}`} onClose={onClose}>
      {state.loading ? <LoadingSpinner /> : state.versions.length === 0 ? (
        <p>Nenhuma versão registrada para esta build.</p>
      ) : (
        <div className="saved-build-extra-list">
          {state.versions.map((version) => (
            <article key={version.id} className="saved-build-extra-card">
              <div>
                <strong>Versão {version.versionNumber}</strong>
                <p>{version.reason}</p>
                <small>{formatDate(version.createdAt)}</small>
              </div>
              <div className="button-row">
                <Button variant="secondary" onClick={() => onShowSnapshot(version)}>Ver snapshot</Button>
                <Button variant="danger" onClick={() => onRemove(version)}>Excluir versão</Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </Modal>
  );
}

function HistoryModal({ state, onClose, onShowDetails, onRemove }) {
  return (
    <Modal open={state.open} title={`Histórico de análises de ${state.build?.name || 'build salva'}`} onClose={onClose}>
      {state.loading ? <LoadingSpinner /> : state.records.length === 0 ? (
        <p>Nenhum histórico registrado para esta build.</p>
      ) : (
        <div className="saved-build-extra-list">
          {state.records.map((record) => (
            <article key={record.id} className="saved-build-extra-card">
              <div>
                <strong>{getAnalysisTypeLabel(record.analysisType)}</strong>
                <p>{summarizeAnalysisRecord(record)}</p>
                <small>{formatDate(record.createdAt)}</small>
              </div>
              <div className="button-row">
                <Button variant="secondary" onClick={() => onShowDetails(record)}>Ver detalhes</Button>
                <Button variant="danger" onClick={() => onRemove(record)}>Excluir</Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </Modal>
  );
}

function buildSnapshotFromSavedBuild(savedBuild) {
  return {
    id: savedBuild.id,
    name: savedBuild.name,
    description: savedBuild.description,
    components: savedBuild.components,
    budget: savedBuild.budget,
    usageType: savedBuild.usageType,
    totalEstimatedPrice: savedBuild.totalEstimatedPrice,
    updatedAt: savedBuild.updatedAt
  };
}

function feedbackSnapshotFromSavedBuild(savedBuild) {
  return buildToApiPayload(savedBuild.components);
}

function feedbackDetailsFromSavedBuild(savedBuild, componentMap) {
  const selection = hydrateBuildComponents(savedBuild.components, componentMap);
  const details = Object.fromEntries([...componentTypes, 'cooler']
    .filter((type) => selection[type])
    .map((type) => [type, feedbackComponentDetails(selection[type])]));
  if (selection.fans.length) {
    details.fans = selection.fans.map((fan) => ({ ...feedbackComponentDetails(fan), quantity: fan.quantity }));
  }
  return details;
}

function feedbackComponentDetails(component) {
  return {
    id: component.id,
    ...(component.name && { name: component.name }),
    ...(component.category && { category: component.category }),
    ...(component.brand && { brand: component.brand }),
    ...(component.price != null && component.price !== '' && Number.isFinite(Number(component.price)) && { price: Number(component.price) })
  };
}

function getAnalysisTypeLabel(value) {
  return analysisTypeLabels[value] || translateValue(value);
}

function getSeverityLabel(value) {
  const labels = {
    high: 'Alta',
    medium: 'Média',
    low: 'Baixa'
  };

  return labels[value] || translateValue(value);
}

function summarizeAnalysisRecord(record) {
  const result = record.result || {};

  return result.summary
    || result.message
    || result.finalRecommendation
    || `Registro de ${getAnalysisTypeLabel(record.analysisType)}.`;
}

function formatDate(value) {
  if (!value) {
    return 'Data não informada';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Data inválida';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
}
