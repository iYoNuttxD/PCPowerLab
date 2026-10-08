import CoolingAssessmentNotice from '../components/compatibility/CoolingAssessmentNotice.jsx';
import { compatibilityDisplayLabel } from '../utils/coolingAssessment.js';
import ComponentIdentity from '../components/componentsCatalog/ComponentIdentity.jsx';
import { useEffect, useRef, useState } from 'react';
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
import { componentLabels, componentTypes, priorityLabels, usageLabels } from '../utils/componentLabels.js';
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
  const { componentMap, loading: componentsLoading, error: componentsError, reload: reloadComponents } = useComponents();
  const request = useApiRequest();
  const [savedBuilds, setSavedBuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [editing, setEditing] = useState(null);
  const [pendingRemoval, setPendingRemoval] = useState(null);
  const [editSaved, setEditSaved] = useState(false);
  const editSession = useRef(0);
  const editIsSaved = useRef(false);
  const [notifications, setNotifications] = useState([]);
  const [versionsModal, setVersionsModal] = useState({ open: false, build: null, versions: [], loading: false });
  const [historyModal, setHistoryModal] = useState({ open: false, build: null, records: [], loading: false });
  const [detailModal, setDetailModal] = useState({ open: false, title: '', data: null });
  const [revalidationResult, setRevalidationResult] = useState(null);
  const [operationLoading, setOperationLoading] = useState('');
  const versionsRequest = useRef(0);
  const historyRequest = useRef(0);
  useEffect(() => () => { versionsRequest.current += 1; historyRequest.current += 1; }, []);

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
      setPendingRemoval(null);
      setFeedback('Build removida com sucesso.');
      await loadBuilds();
    });
  }

  async function revalidateAllBuilds() {
    await request.run(async () => {
      setOperationLoading('revalidate-all');
      try {
      const result = await savedBuildsService.revalidateAll();
      setRevalidationResult(result);
      setFeedback(`Revalidação concluída: ${result.checkedBuilds || 0} build(s) verificadas e ${result.notificationsCreated || 0} notificação(ões) criada(s).`);
      await loadNotifications();
      } finally { setOperationLoading(''); }
    });
  }

  async function revalidateBuild(savedBuild) {
    await request.run(async () => {
      setOperationLoading(`revalidate-${savedBuild.id}`);
      try {
      const result = await savedBuildsService.revalidateById(savedBuild.id);
      setRevalidationResult(result);
      setFeedback(`Build revalidada: ${result.notificationsCreated || 0} notificação(ões) criada(s).`);
      await loadNotifications();
      } finally { setOperationLoading(''); }
    });
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

  function openEditor(savedBuild) {
    editSession.current += 1;
    editIsSaved.current = false;
    setEditSaved(false);
    request.setError('');
    setEditing(savedBuild);
  }

  function closeEditor() {
    editSession.current += 1;
    setEditing(null);
  }

  async function updateBuild(event) {
    event.preventDefault();
    if (!editing || editIsSaved.current) return;
    const token = editSession.current;
    const formData = new FormData(event.currentTarget);

    await request.run(async () => {
      await savedBuildsService.update(editing.id, {
        name: String(formData.get('name')).slice(0, 80),
        description: String(formData.get('description')).slice(0, 180)
      });
      // Keep the native dialog open: removing the old inline editor made the
      // page shrink, exposing unrelated card actions to the next double-click.
      if (token === editSession.current) {
        editIsSaved.current = true;
        setEditSaved(true);
      }
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
    const token = ++versionsRequest.current;
    setVersionsModal({ open: true, build: savedBuild, versions: [], loading: true });
    try {
      const data = await savedBuildVersionsService.list(savedBuild.id);
      if (token !== versionsRequest.current) return;
      setVersionsModal({ open: true, build: savedBuild, versions: Array.isArray(data) ? data : [], loading: false });
    } catch (error) {
      if (token !== versionsRequest.current) return;
      setVersionsModal({ open: true, build: savedBuild, versions: [], loading: false });
      request.setError(error.message);
    }
  }

  async function createVersion(savedBuild) {
    const token = versionsRequest.current;
    await request.run(async () => {
      await savedBuildVersionsService.create(savedBuild.id, {
        reason: 'Cópia da configuração salva para consultar depois.',
        buildSnapshot: buildSnapshotFromSavedBuild(savedBuild)
      });
      setFeedback('Versão criada com sucesso.');
      if (token === versionsRequest.current && versionsModal.open && versionsModal.build?.id === savedBuild.id) {
        await openVersions(savedBuild);
      }
    });
  }

  async function removeVersion(version) {
    if (!versionsModal.build) return;
    const token = versionsRequest.current;

    await request.run(async () => {
      await savedBuildVersionsService.remove(versionsModal.build.id, version.id);
      setFeedback('Versão removida.');
      if (token === versionsRequest.current) await openVersions(versionsModal.build);
    });
  }

  async function openHistory(savedBuild) {
    const token = ++historyRequest.current;
    setHistoryModal({ open: true, build: savedBuild, records: [], loading: true });
    try {
      const data = await analysisHistoryService.list({ buildId: savedBuild.id });
      if (token !== historyRequest.current) return;
      setHistoryModal({ open: true, build: savedBuild, records: Array.isArray(data) ? data : [], loading: false });
    } catch (error) {
      if (token !== historyRequest.current) return;
      setHistoryModal({ open: true, build: savedBuild, records: [], loading: false });
      request.setError(error.message);
    }
  }

  async function removeHistoryRecord(record) {
    const token = historyRequest.current;
    await request.run(async () => {
      await analysisHistoryService.remove(record.id);
      setFeedback('Registro de histórico removido.');
      if (token === historyRequest.current && historyModal.build) {
        await openHistory(historyModal.build);
      }
    });
  }

  return (
    <div className="page-stack">
      <section className="page-hero compact-hero">
        <span className="eyebrow">Garagem digital</span>
        <h1>Builds salvas</h1>
      </section>

      {request.error && <ErrorState message={request.error} onRetry={loadBuilds} />}
      {feedback && !editing && <Alert type="success">{feedback}</Alert>}
      {loading && <LoadingSpinner />}
      {componentsLoading && <LoadingSpinner label="Carregando dados das peças salvas..." />}
      {componentsError && <ErrorState message={`Não foi possível carregar as peças salvas. ${componentsError}`} onRetry={reloadComponents} />}
      {!loading && !request.error && savedBuilds.length === 0 && <EmptyState title="Nenhuma build salva" message="Salve uma configuração no assistente ou no resumo final.">
        <Link className="btn btn-primary btn-md" to="/build">Montar meu PC</Link>
      </EmptyState>}

      <Card className="saved-build-monitoring">
        <div className="section-heading compact">
          <h2><Bell size={20} aria-hidden="true" /> Compatibilidade das builds salvas</h2>
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
          busy={request.loading}
          notifications={notifications}
          onRead={markNotificationAsRead}
          onRemove={removeNotification}
        />
      </Card>

      <div className="cards-grid">
        {savedBuilds.map((savedBuild) => (
          <Card key={savedBuild.id} as="article" className="saved-build-card">
            <div className="section-heading compact">
              <h2>{savedBuild.name}</h2>
              <strong><small className="estimated-price-label">Total estimado de referência</small>{formatCurrency(savedBuild.totalEstimatedPrice)}</strong>
            </div>
            <p>{savedBuild.description || 'Sem descrição.'}</p>
            <details className="saved-build-components">
              <summary>Ver componentes</summary>
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
                  <span>{componentLabels.fan} · {fan.quantity ?? 1} pacote(s)</span>
                  <ComponentIdentity component={fan} category="fan" />
                </li>
              ))}
            </ul>
            </details>
            <div className="button-row saved-build-primary-actions">
              <Button disabled={componentsLoading || Boolean(componentsError)} onClick={() => loadIntoWizard(savedBuild)}><Upload size={18} /> Abrir montagem</Button>
              <Button variant="secondary" disabled={componentsLoading || Boolean(componentsError)} onClick={() => loadIntoWizard(savedBuild, '/summary')}>Trocar peça</Button>
            </div>
            <details className="saved-build-actions" onKeyDown={closeActionsOnEscape}>
              <summary aria-label={`Mais ações de ${savedBuild.name}`}>Mais ações</summary>
              <div className="button-row">
                <Button variant="ghost" onClick={() => openEditor(savedBuild)}><Edit3 size={18} /> Nome e descrição</Button>
                <Button variant="ghost" disabled={request.loading} onClick={() => shareBuild(savedBuild)}><Share2 size={18} /> Compartilhar</Button>
                <Button variant="ghost" onClick={() => openVersions(savedBuild)}><Clock3 size={18} /> Ver versões</Button>
                <Button variant="ghost" disabled={request.loading} onClick={() => createVersion(savedBuild)}>Criar versão</Button>
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
                <Link className="btn btn-secondary btn-md" to={`/upgrades?buildId=${encodeURIComponent(savedBuild.id)}`}>Upgrade</Link>
                <Button variant="danger" disabled={request.loading} onClick={() => { request.setError(''); setPendingRemoval(savedBuild); }}><Trash2 size={18} /> Excluir</Button>
              </div>
            </details>
          </Card>
        ))}
      </div>

      <Modal open={Boolean(pendingRemoval)} title="Excluir build salva" onClose={() => setPendingRemoval(null)}>
        {pendingRemoval && <>
          <p>Excluir “{pendingRemoval.name}” das builds salvas?</p>
          <div className="button-row">
            <Button variant="ghost" autoFocus disabled={request.loading} onClick={() => setPendingRemoval(null)}>Cancelar</Button>
            <Button variant="danger" disabled={request.loading} loading={request.loading} onClick={() => removeBuild(pendingRemoval.id)}>Confirmar exclusão</Button>
          </div>
          {request.error && <Alert type="error">{request.error}</Alert>}
        </>}
      </Modal>

      <Modal open={Boolean(editing)} title="Editar build salva" onClose={closeEditor}>
        {editing && <form key={editing.id} className="form-grid" onSubmit={updateBuild}
          onChange={() => { editIsSaved.current = false; setEditSaved(false); }}>
          <Input label="Nome" name="name" defaultValue={editing.name} maxLength="80" required disabled={request.loading} />
          <Input label="Descrição" name="description" defaultValue={editing.description || ''} maxLength="180" disabled={request.loading} />
          <div className="button-row">
            <Button disabled={request.loading || editSaved} loading={request.loading} type="submit">Salvar alterações</Button>
            <Button variant="ghost" type="button" onClick={closeEditor}>{editSaved ? 'Concluir' : 'Cancelar'}</Button>
          </div>
          {editSaved && <Alert type="success">Alterações salvas. Você pode fechar esta janela ou continuar editando.</Alert>}
          {request.error && <Alert type="error">{request.error}</Alert>}
        </form>}
      </Modal>

      <VersionsModal
        busy={request.loading}
        state={versionsModal}
        onClose={() => { versionsRequest.current += 1; setVersionsModal({ open: false, build: null, versions: [], loading: false }); }}
        onShowSnapshot={(version) => setDetailModal({ open: true, title: `Configuração da versão ${version.versionNumber}`, data: version.buildSnapshot, kind: 'version' })}
        onRemove={removeVersion}
      />

      <HistoryModal
        busy={request.loading}
        state={historyModal}
        onClose={() => { historyRequest.current += 1; setHistoryModal({ open: false, build: null, records: [], loading: false }); }}
        onShowDetails={(record) => setDetailModal({ open: true, title: `Detalhes de ${getAnalysisTypeLabel(record.analysisType)}`, data: record, kind: 'history' })}
        onRemove={removeHistoryRecord}
      />

      <Modal open={detailModal.open} title={detailModal.title} onClose={() => setDetailModal({ open: false, title: '', data: null })}>
        {detailModal.kind === 'version' ? <SavedVersionSummary snapshot={detailModal.data} componentMap={componentMap} /> : (
          <pre className="json-preview">{JSON.stringify(detailModal.data || {}, null, 2)}</pre>
        )}
      </Modal>
    </div>
  );
}

function closeActionsOnEscape(event) {
  if (event.key !== 'Escape' || !event.currentTarget.open) return;
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.open = false;
  event.currentTarget.querySelector('summary')?.focus();
}

function NotificationsPanel({ busy, notifications, onRead, onRemove }) {
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
              <Button variant="secondary" disabled={busy} onClick={() => onRead(notification.id)}>
                <CheckCircle2 size={18} /> Marcar como lida
              </Button>
            )}
            <Button variant="danger" disabled={busy} onClick={() => onRemove(notification.id)}>
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
              <strong>{compatibilityDisplayLabel(item.status, item)}</strong>
              <CoolingAssessmentNotice result={item} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VersionsModal({ busy, state, onClose, onShowSnapshot, onRemove }) {
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
                <p>{versionReasonLabel(version.reason)}</p>
                <small>{formatDate(version.createdAt)}</small>
              </div>
              <div className="button-row">
                <Button variant="secondary" onClick={() => onShowSnapshot(version)}>Ver configuração</Button>
                <Button variant="danger" disabled={busy} onClick={() => onRemove(version)}>Excluir versão</Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </Modal>
  );
}

function versionReasonLabel(reason) {
  if (!reason || /^Snapshot criado pelo frontend/i.test(reason)) return 'Cópia da configuração salva para consultar depois.';
  if (reason === 'Versao inicial da configuracao salva.') return 'Primeira versão da configuração salva.';
  if (reason === 'Atualizacao da configuracao salva.') return 'Configuração atualizada.';
  return reason;
}

function SavedVersionSummary({ snapshot, componentMap }) {
  const saved = snapshot && typeof snapshot === 'object' ? snapshot : {};
  const selection = hydrateBuildComponents(saved.components, componentMap);
  const nameFor = component => component?.name || 'Peça registrada, mas não encontrada no catálogo atual';
  const budgetAmount = saved.budget?.amount ?? (typeof saved.budget === 'number' ? saved.budget : null);
  return <div className="saved-version-summary">
    <p>Esta é a configuração guardada nesta versão. Consultá-la não altera sua build atual.</p>
    <h3>{saved.name || 'Configuração salva'}</h3>
    {saved.description && <p>{saved.description}</p>}
    <h4>Peças desta versão</h4>
    <dl>
      {componentTypes.map(type => <div key={type}>
        <dt>{componentLabels[type]}</dt><dd>{selection[type] ? nameFor(selection[type]) : 'Não informado nesta versão'}</dd>
      </div>)}
      <div><dt>{componentLabels.cooler}</dt><dd>{selection.cooler ? nameFor(selection.cooler) : 'Nenhum cooler separado registrado'}</dd></div>
      <div><dt>Ventoinhas adicionais</dt><dd>{selection.fans.length ? <ul>{selection.fans.map(fan => (
        <li key={fan.id}>{nameFor(fan)} · {fan.quantity} {fan.quantity === 1 ? 'pacote' : 'pacotes'}</li>
      ))}</ul> : 'Nenhuma ventoinha adicional registrada'}</dd></div>
    </dl>
    <h4>Orçamento e preferências</h4>
    <dl>
      <div><dt>Uso principal</dt><dd>{usageLabels[saved.usageType] || 'Não informado nesta versão'}</dd></div>
      <div><dt>Orçamento planejado</dt><dd>{budgetAmount == null ? 'Não informado nesta versão' : formatCurrency(budgetAmount, saved.budget?.currency || 'BRL')}</dd></div>
      <div><dt>Prioridade</dt><dd>{priorityLabels[saved.budget?.priority] || 'Não informada nesta versão'}</dd></div>
      <div><dt>Total estimado registrado</dt><dd>{formatCurrency(saved.totalEstimatedPrice)}</dd></div>
    </dl>
    <p className="hint-text">O total é uma referência guardada nesta versão, não uma cotação atual. Quando a versão contém apenas o código da peça, o nome é consultado no catálogo atual.</p>
    <details>
      <summary>Ver dados técnicos desta versão</summary>
      <pre className="json-preview">{JSON.stringify(saved, null, 2)}</pre>
    </details>
  </div>;
}

function HistoryModal({ busy, state, onClose, onShowDetails, onRemove }) {
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
                <Button variant="danger" disabled={busy} onClick={() => onRemove(record)}>Excluir</Button>
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
