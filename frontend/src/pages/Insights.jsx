import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Pencil, Plus, Trash2 } from 'lucide-react';
import Alert from '../components/ui/Alert.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Input from '../components/ui/Input.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import Select from '../components/ui/Select.jsx';
import { costBenefitService } from '../services/costBenefitService.js';
import { usageProfilesService } from '../services/usageProfilesService.js';
import { componentLabels } from '../utils/componentLabels.js';
import { formatCurrency } from '../utils/formatCurrency.js';
import { translateValue } from '../utils/translations.js';

const emptyProfileForm = {
  name: '',
  description: '',
  weights: {
    cpu: 30,
    gpu: 30,
    ram: 15,
    storage: 15,
    costBenefit: 10
  },
  recommendedMinimums: {
    ramGb: '',
    storageType: '',
    gpuVramGb: ''
  }
};

const categoryOptions = [
  { value: '', label: 'Todos' },
  ...Object.entries(componentLabels).map(([value, label]) => ({ value, label }))
];

const weightFields = [
  ['cpu', 'CPU'],
  ['gpu', 'GPU'],
  ['ram', 'RAM'],
  ['storage', 'Armazenamento'],
  ['costBenefit', 'Custo-benefício']
];

export default function Insights() {
  const [ranking, setRanking] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [rankingFilters, setRankingFilters] = useState({ category: '', limit: 10 });
  const [profileForm, setProfileForm] = useState(emptyProfileForm);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState({ ranking: true, profiles: true, saving: false, deleting: '' });
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [formError, setFormError] = useState('');

  const weightTotal = useMemo(() => (
    weightFields.reduce((total, [key]) => total + Number(profileForm.weights[key] || 0), 0)
  ), [profileForm.weights]);

  useEffect(() => {
    loadRanking();
    loadProfiles();
  }, []);

  async function loadRanking() {
    setLoading((current) => ({ ...current, ranking: true }));
    setError('');

    try {
      const filters = {
        ...(rankingFilters.category && { category: rankingFilters.category }),
        ...(rankingFilters.limit && { limit: Number(rankingFilters.limit) })
      };
      const result = await costBenefitService.listComponents(filters);
      setRanking(Array.isArray(result) ? result : []);
    } catch (rankingError) {
      setError(rankingError.message || 'Não foi possível carregar o ranking de custo-benefício.');
      setRanking([]);
    } finally {
      setLoading((current) => ({ ...current, ranking: false }));
    }
  }

  async function loadProfiles() {
    setLoading((current) => ({ ...current, profiles: true }));

    try {
      const result = await usageProfilesService.list();
      setProfiles(Array.isArray(result) ? result : []);
    } catch (profilesError) {
      setError(profilesError.message || 'Não foi possível carregar perfis personalizados.');
      setProfiles([]);
    } finally {
      setLoading((current) => ({ ...current, profiles: false }));
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    setFormError('');
    setFeedback('');

    const validationMessage = validateProfileForm(profileForm);
    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }

    setLoading((current) => ({ ...current, saving: true }));

    try {
      const payload = normalizeProfilePayload(profileForm);
      if (editingId) {
        await usageProfilesService.update(editingId, payload);
        setFeedback('Perfil personalizado atualizado.');
      } else {
        await usageProfilesService.create(payload);
        setFeedback('Perfil personalizado criado.');
      }

      setProfileForm(emptyProfileForm);
      setEditingId('');
      await loadProfiles();
    } catch (saveError) {
      setFormError(saveError.message || 'Não foi possível salvar o perfil.');
    } finally {
      setLoading((current) => ({ ...current, saving: false }));
    }
  }

  async function deleteProfile(profileId) {
    setFeedback('');
    setLoading((current) => ({ ...current, deleting: profileId }));

    try {
      await usageProfilesService.remove(profileId);
      setFeedback('Perfil removido.');
      if (editingId === profileId) {
        setEditingId('');
        setProfileForm(emptyProfileForm);
      }
      await loadProfiles();
    } catch (deleteError) {
      setError(deleteError.message || 'Não foi possível remover o perfil.');
    } finally {
      setLoading((current) => ({ ...current, deleting: '' }));
    }
  }

  function startEditing(profile) {
    setEditingId(profile.id);
    setFormError('');
    setProfileForm({
      name: profile.name || '',
      description: profile.description || '',
      weights: {
        cpu: Number(profile.weights?.cpu ?? 0),
        gpu: Number(profile.weights?.gpu ?? 0),
        ram: Number(profile.weights?.ram ?? 0),
        storage: Number(profile.weights?.storage ?? 0),
        costBenefit: Number(profile.weights?.costBenefit ?? 0)
      },
      recommendedMinimums: {
        ramGb: profile.recommendedMinimums?.ramGb ?? '',
        storageType: profile.recommendedMinimums?.storageType ?? '',
        gpuVramGb: profile.recommendedMinimums?.gpuVramGb ?? ''
      }
    });
  }

  function updateWeight(key, value) {
    setProfileForm((current) => ({
      ...current,
      weights: {
        ...current.weights,
        [key]: value
      }
    }));
  }

  function updateMinimum(key, value) {
    setProfileForm((current) => ({
      ...current,
      recommendedMinimums: {
        ...current.recommendedMinimums,
        [key]: value
      }
    }));
  }

  return (
    <div className="page-stack">
      <section className="page-hero compact-hero">
        <span className="eyebrow">Insights</span>
        <h1>Custo-benefício e perfis personalizados</h1>
        <p>Compare componentes por valor entregue e crie perfis de uso para futuras recomendações.</p>
      </section>

      {error && <Alert type="error">{error}</Alert>}
      {feedback && <Alert type="success">{feedback}</Alert>}

      <Card>
        <div className="section-heading compact">
          <div>
            <span className="eyebrow">Ranking de custo-benefício</span>
            <h2><BarChart3 size={22} aria-hidden="true" /> Componentes com melhor relação preço/desempenho</h2>
          </div>
          <Badge tone="green">Ranking</Badge>
        </div>

        <div className="form-grid compact-form-grid">
          <Select
            label="Categoria"
            value={rankingFilters.category}
            onChange={(event) => setRankingFilters((current) => ({ ...current, category: event.target.value }))}
            options={categoryOptions}
          />
          <Input
            label="Limite"
            type="number"
            min="1"
            max="50"
            value={rankingFilters.limit}
            onChange={(event) => setRankingFilters((current) => ({ ...current, limit: event.target.value }))}
          />
        </div>
        <div className="button-row">
          <Button disabled={loading.ranking} loading={loading.ranking} onClick={loadRanking}>
            Atualizar ranking
          </Button>
        </div>

        {loading.ranking ? <LoadingSpinner /> : <RankingList ranking={ranking} />}
      </Card>

      <div className="insights-grid">
        <Card>
          <div className="section-heading compact">
            <div>
              <span className="eyebrow">Perfis personalizados</span>
              <h2>{editingId ? 'Editar perfil' : 'Criar perfil de uso'}</h2>
            </div>
            <Badge tone={weightTotal === 100 ? 'green' : 'yellow'}>{weightTotal}% em pesos</Badge>
          </div>

          {formError && <Alert type="error">{formError}</Alert>}
          {weightTotal !== 100 && (
            <Alert type="warning">
              A soma dos pesos está em {weightTotal}%. O backend pode normalizar os valores, mas 100% facilita a leitura.
            </Alert>
          )}

          <form className="profile-form" onSubmit={saveProfile}>
            <Input
              label="Nome"
              value={profileForm.name}
              maxLength={80}
              onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))}
              required
            />
            <label className="field">
              <span>Descrição</span>
              <textarea
                value={profileForm.description}
                maxLength={180}
                onChange={(event) => setProfileForm((current) => ({ ...current, description: event.target.value }))}
                rows={3}
              />
            </label>

            <div className="weight-grid">
              {weightFields.map(([key, label]) => (
                <Input
                  key={key}
                  label={label}
                  type="number"
                  min="0"
                  value={profileForm.weights[key]}
                  onChange={(event) => updateWeight(key, event.target.value)}
                />
              ))}
            </div>

            <div className="form-grid compact-form-grid">
              <Input
                label="RAM mínima (GB)"
                type="number"
                min="1"
                value={profileForm.recommendedMinimums.ramGb}
                onChange={(event) => updateMinimum('ramGb', event.target.value)}
              />
              <Input
                label="Tipo de armazenamento"
                placeholder="SSD"
                value={profileForm.recommendedMinimums.storageType}
                onChange={(event) => updateMinimum('storageType', event.target.value)}
              />
              <Input
                label="VRAM mínima (GB)"
                type="number"
                min="1"
                value={profileForm.recommendedMinimums.gpuVramGb}
                onChange={(event) => updateMinimum('gpuVramGb', event.target.value)}
              />
            </div>

            <div className="button-row">
              <Button type="submit" disabled={loading.saving} loading={loading.saving}>
                <Plus size={18} aria-hidden="true" /> {editingId ? 'Salvar edição' : 'Criar perfil'}
              </Button>
              {editingId && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditingId('');
                    setProfileForm(emptyProfileForm);
                    setFormError('');
                  }}
                >
                  Cancelar edição
                </Button>
              )}
            </div>
          </form>
        </Card>

        <Card>
          <div className="section-heading compact">
            <div>
              <span className="eyebrow">Perfis cadastrados</span>
              <h2>Biblioteca de perfis</h2>
            </div>
            <Badge tone="cyan">{profiles.length} perfil(is)</Badge>
          </div>

          {loading.profiles ? (
            <LoadingSpinner />
          ) : profiles.length === 0 ? (
            <EmptyState
              title="Nenhum perfil personalizado"
              message="Crie um perfil para ajustar pesos de CPU, GPU, RAM, armazenamento e custo-benefício."
            />
          ) : (
            <div className="usage-profile-list">
              {profiles.map((profile) => (
                <UsageProfileCard
                  key={profile.id}
                  profile={profile}
                  deleting={loading.deleting === profile.id}
                  onEdit={() => startEditing(profile)}
                  onDelete={() => deleteProfile(profile.id)}
                />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function RankingList({ ranking }) {
  if (!ranking.length) {
    return (
      <EmptyState
        title="Ranking vazio"
        message="Nenhum componente com dados suficientes de preço e desempenho foi encontrado para o filtro atual."
      />
    );
  }

  return (
    <div className="cost-benefit-grid">
      {ranking.map((entry, index) => {
        const component = entry.component || {};

        return (
          <article key={component.id || index} className="cost-benefit-card">
            <div className="ranking-position">#{index + 1}</div>
            <div className="cost-benefit-card__body">
              <div className="section-heading compact">
                <div>
                  <span className="eyebrow">{componentLabels[component.category] || translateValue(component.category)}</span>
                  <h3>{component.name || 'Componente sem nome'}</h3>
                </div>
                <Badge tone={getCostBenefitTone(entry.costBenefitScore)}>
                  {entry.classification || classifyCostBenefit(entry.costBenefitScore)}
                </Badge>
              </div>
              <div className="metric-grid compact-metric-grid">
                <div>
                  <span>Preço</span>
                  <strong>{formatCurrency(component.price)}</strong>
                </div>
                <div>
                  <span>Performance</span>
                  <strong>{formatNumber(entry.performanceScore)}</strong>
                </div>
                <div>
                  <span>Custo-benefício</span>
                  <strong>{formatNumber(entry.costBenefitScore)}</strong>
                </div>
              </div>
              <p>{entry.summary || 'Componente bem posicionado no ranking de custo-benefício.'}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function UsageProfileCard({ profile, deleting, onEdit, onDelete }) {
  const weights = profile.weights || {};
  const minimums = profile.recommendedMinimums || {};

  return (
    <article className="usage-profile-card">
      <div className="section-heading compact">
        <div>
          <h3>{profile.name}</h3>
          <p>{profile.description || 'Sem descrição.'}</p>
        </div>
        <Badge tone="purple">{profile.id}</Badge>
      </div>

      <div className="weight-bars">
        {weightFields.map(([key, label]) => (
          <div key={key}>
            <span>{label}</span>
            <strong>{formatNumber(weights[key])}%</strong>
            <i aria-hidden="true"><b style={{ width: `${Math.min(Number(weights[key] || 0), 100)}%` }} /></i>
          </div>
        ))}
      </div>

      <div className="profile-minimums">
        <span>RAM mínima: <strong>{minimums.ramGb ? `${minimums.ramGb} GB` : 'Não informado'}</strong></span>
        <span>Armazenamento: <strong>{minimums.storageType || 'Não informado'}</strong></span>
        <span>VRAM mínima: <strong>{minimums.gpuVramGb ? `${minimums.gpuVramGb} GB` : 'Não informado'}</strong></span>
      </div>

      <div className="button-row">
        <Button variant="secondary" onClick={onEdit}>
          <Pencil size={18} aria-hidden="true" /> Editar
        </Button>
        <Button variant="danger" loading={deleting} disabled={deleting} onClick={onDelete}>
          <Trash2 size={18} aria-hidden="true" /> Remover
        </Button>
      </div>
    </article>
  );
}

function validateProfileForm(form) {
  if (!form.name.trim()) {
    return 'Informe o nome do perfil.';
  }

  for (const [key, label] of weightFields) {
    const value = Number(form.weights[key]);
    if (!Number.isFinite(value) || value < 0) {
      return `Peso inválido para ${label}.`;
    }
  }

  if (form.recommendedMinimums.ramGb !== '' && Number(form.recommendedMinimums.ramGb) <= 0) {
    return 'RAM mínima deve ser maior que zero.';
  }

  if (form.recommendedMinimums.gpuVramGb !== '' && Number(form.recommendedMinimums.gpuVramGb) <= 0) {
    return 'VRAM mínima deve ser maior que zero.';
  }

  return '';
}

function normalizeProfilePayload(form) {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    weights: weightFields.reduce((weights, [key]) => ({
      ...weights,
      [key]: Number(form.weights[key] || 0)
    }), {}),
    recommendedMinimums: {
      ...(form.recommendedMinimums.ramGb && { ramGb: Number(form.recommendedMinimums.ramGb) }),
      ...(form.recommendedMinimums.storageType.trim() && { storageType: form.recommendedMinimums.storageType.trim() }),
      ...(form.recommendedMinimums.gpuVramGb && { gpuVramGb: Number(form.recommendedMinimums.gpuVramGb) })
    }
  };
}

function getCostBenefitTone(score) {
  const value = Number(score);

  if (value >= 80) return 'green';
  if (value >= 60) return 'cyan';
  if (value >= 40) return 'yellow';
  return 'red';
}

function classifyCostBenefit(score) {
  const value = Number(score);

  if (value >= 80) return 'Excelente';
  if (value >= 60) return 'Bom';
  if (value >= 40) return 'Regular';
  return 'Baixo';
}

function formatNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? Math.round(number) : 'N/D';
}
