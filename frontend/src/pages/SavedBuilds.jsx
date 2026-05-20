import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Edit3, Share2, Trash2, Upload } from 'lucide-react';
import Alert from '../components/ui/Alert.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import Input from '../components/ui/Input.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import { useApiRequest } from '../hooks/useApiRequest.js';
import { useBuildState } from '../hooks/useBuildState.jsx';
import { useComponents } from '../hooks/useComponents.js';
import { savedBuildsService } from '../services/savedBuildsService.js';
import { sharingService } from '../services/sharingService.js';
import { componentLabels, componentTypes } from '../utils/componentLabels.js';
import { formatCurrency } from '../utils/formatCurrency.js';

export default function SavedBuilds() {
  const navigate = useNavigate();
  const buildState = useBuildState();
  const { components } = useComponents();
  const request = useApiRequest();
  const [savedBuilds, setSavedBuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [editing, setEditing] = useState(null);

  const componentMap = useMemo(() => Object.fromEntries(components.map((component) => [component.id, component])), [components]);

  async function loadBuilds() {
    setLoading(true);
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
  }, []);

  async function removeBuild(id) {
    await request.run(async () => {
      await savedBuildsService.remove(id);
      setFeedback('Build removida com sucesso.');
      await loadBuilds();
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
      setFeedback(`Link gerado: ${result.shareUrl}`);
    });
  }

  function loadIntoWizard(savedBuild) {
    buildState.actions.loadSavedBuild(savedBuild, componentMap);
    navigate('/build');
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
      {!loading && savedBuilds.length === 0 && <EmptyState title="Nenhuma build salva" message="Salve uma configuração no wizard ou no resumo final." />}

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
                  <strong>{savedBuild.components?.[type] || 'Não informado'}</strong>
                </li>
              ))}
            </ul>
            <div className="button-row">
              <Button onClick={() => loadIntoWizard(savedBuild)}><Upload size={18} /> Abrir no wizard</Button>
              <Button variant="ghost" onClick={() => setEditing(savedBuild)}><Edit3 size={18} /> Editar</Button>
              <Button variant="ghost" onClick={() => shareBuild(savedBuild)}><Share2 size={18} /> Compartilhar</Button>
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
    </div>
  );
}
