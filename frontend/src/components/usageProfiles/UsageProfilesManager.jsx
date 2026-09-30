import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import Alert from '../ui/Alert.jsx';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import Input from '../ui/Input.jsx';
import LoadingSpinner from '../ui/LoadingSpinner.jsx';
import { usageProfilesService } from '../../services/usageProfilesService.js';

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

const weightFields = [
  ['cpu', 'CPU'],
  ['gpu', 'GPU'],
  ['ram', 'RAM'],
  ['storage', 'Armazenamento'],
  ['costBenefit', 'Custo-benefício']
];

export default function UsageProfilesManager({ appliedProfileId = '', onApplyProfile, onProfilesLoaded }) {
  const [profiles, setProfiles] = useState([]);
  const [profileForm, setProfileForm] = useState(emptyProfileForm);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState({ profiles: true, saving: false, deleting: '' });
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [formError, setFormError] = useState('');

  const weightTotal = useMemo(() => (
    weightFields.reduce((total, [key]) => total + Number(profileForm.weights[key] || 0), 0)
  ), [profileForm.weights]);

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    setLoading((current) => ({ ...current, profiles: true }));
    setError('');

    try {
      const result = await usageProfilesService.list();
      const normalizedProfiles = Array.isArray(result) ? result : [];
      setProfiles(normalizedProfiles);
      onProfilesLoaded?.(normalizedProfiles);
    } catch (profilesError) {
      setError(profilesError.message || 'Não foi possível carregar perfis personalizados.');
      setProfiles([]);
      onProfilesLoaded?.([]);
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
    <Card>
      <div className="section-heading compact">
        <div>
          <span className="eyebrow">Perfis personalizados</span>
          <h2>Perfis personalizados para recomendação</h2>
          <p>Crie critérios próprios para orientar a recomendação de build por orçamento.</p>
        </div>
        <Badge tone="purple">{profiles.length} perfil(is)</Badge>
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {feedback && <Alert type="success">{feedback}</Alert>}

      <div className="usage-profiles-manager">
        <section>
          <div className="section-heading compact">
            <div>
              <h3>{editingId ? 'Editar perfil' : 'Criar perfil'}</h3>
              <p>Pesos devem somar 100% para deixar a recomendação previsível.</p>
            </div>
            <Badge tone={weightTotal === 100 ? 'green' : 'yellow'}>{weightTotal}%</Badge>
          </div>

          {formError && <Alert type="error">{formError}</Alert>}
          {weightTotal !== 100 && (
            <Alert type="warning">A soma dos pesos deve ser 100%.</Alert>
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
        </section>

        <section>
          <div className="section-heading compact">
            <div>
              <h3>Biblioteca de perfis</h3>
              <p>Aplique um perfil diretamente na recomendação por orçamento.</p>
            </div>
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
                  selected={appliedProfileId === profile.id}
                  deleting={loading.deleting === profile.id}
                  onApply={() => onApplyProfile?.(profile)}
                  onEdit={() => startEditing(profile)}
                  onDelete={() => deleteProfile(profile.id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </Card>
  );
}

function UsageProfileCard({ profile, selected, deleting, onApply, onEdit, onDelete }) {
  const weights = profile.weights || {};
  const minimums = profile.recommendedMinimums || {};

  return (
    <article className={`usage-profile-card ${selected ? 'is-selected' : ''}`}>
      <div className="section-heading compact">
        <div>
          <h3>{profile.name}</h3>
          <p>{profile.description || 'Sem descrição.'}</p>
        </div>
        <Badge tone={selected ? 'green' : 'purple'}>{selected ? 'Aplicado' : 'Personalizado'}</Badge>
      </div>

      <ProfileWeights weights={weights} compact />

      <div className="profile-minimums">
        <span>RAM mínima: <strong>{minimums.ramGb ? `${minimums.ramGb} GB` : 'Não informado'}</strong></span>
        <span>Armazenamento: <strong>{minimums.storageType || 'Não informado'}</strong></span>
        <span>VRAM mínima: <strong>{minimums.gpuVramGb ? `${minimums.gpuVramGb} GB` : 'Não informado'}</strong></span>
      </div>

      <div className="button-row">
        <Button variant={selected ? 'success' : 'primary'} disabled={selected} onClick={onApply}>
          {selected ? 'Aplicado' : 'Aplicar na recomendação'}
        </Button>
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

export function ProfileWeights({ weights = {}, compact = false }) {
  return (
    <div className={compact ? 'profile-weight-summary' : 'weight-bars'}>
      {weightFields.map(([key, label]) => (
        <div key={key}>
          <span>{label}</span>
          <strong>{formatNumber(weights[key])}%</strong>
          {!compact && <i aria-hidden="true"><b style={{ width: `${Math.min(Number(weights[key] || 0), 100)}%` }} /></i>}
        </div>
      ))}
    </div>
  );
}

function validateProfileForm(form) {
  if (!form.name.trim()) {
    return 'Informe o nome do perfil.';
  }

  const total = weightFields.reduce((sum, [key]) => sum + Number(form.weights[key] || 0), 0);
  if (total !== 100) {
    return 'A soma dos pesos deve ser 100%.';
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

function formatNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? Math.round(number) : 'N/D';
}
