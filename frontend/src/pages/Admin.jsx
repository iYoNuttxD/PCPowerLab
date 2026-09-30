import { useEffect, useState } from 'react';
import Alert from '../components/ui/Alert.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import Input from '../components/ui/Input.jsx';
import Select from '../components/ui/Select.jsx';
import { adminService } from '../services/adminService.js';
import { componentLabels, componentTypes } from '../utils/componentLabels.js';
import { translateSeverity, translateValue } from '../utils/translations.js';

export default function Admin() {
  const [authenticated, setAuthenticated] = useState(null);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [rules, setRules] = useState([]);
  const [parameters, setParameters] = useState([]);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  function handleAdminError(requestError) {
    if (requestError.status === 401) {
      setAuthenticated(false);
      setAuthError('A sessão expirou. Digite a senha novamente.');
      return;
    }
    setError(requestError.message);
  }

  async function loadAdminData() {
    try {
      const [rulesData, parametersData] = await Promise.all([
        adminService.listRules(),
        adminService.listParameters()
      ]);
      setRules(Array.isArray(rulesData) ? rulesData : []);
      setParameters(Array.isArray(parametersData) ? parametersData : []);
    } catch (requestError) {
      handleAdminError(requestError);
    }
  }

  useEffect(() => {
    adminService.session()
      .then((session) => setAuthenticated(session.authenticated === true))
      .catch(() => {
        setAuthenticated(false);
        setAuthError('Não foi possível verificar o acesso administrativo.');
      });
  }, []);

  useEffect(() => {
    if (authenticated) loadAdminData();
  }, [authenticated]);

  async function unlock(event) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      await adminService.unlock(password);
      setPassword('');
      setError('');
      setAuthenticated(true);
    } catch (requestError) {
      setAuthError(requestError.message);
    } finally {
      setAuthLoading(false);
    }
  }

  async function logout() {
    try {
      await adminService.logout();
      setAuthenticated(false);
      setRules([]);
      setParameters([]);
      setError('');
      setFeedback('');
    } catch (requestError) {
      handleAdminError(requestError);
    }
  }

  async function createRule(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      await adminService.createRule({
        name: String(form.get('name')).slice(0, 100),
        sourceType: form.get('sourceType'),
        targetType: form.get('targetType'),
        field: String(form.get('field')).slice(0, 60),
        targetField: String(form.get('targetField') || form.get('field')).slice(0, 60),
        operator: form.get('operator'),
        severity: form.get('severity'),
        message: String(form.get('message')).slice(0, 220)
      });
      event.currentTarget.reset();
      setFeedback('Regra cadastrada.');
      await loadAdminData();
    } catch (requestError) {
      handleAdminError(requestError);
    }
  }

  async function deleteRule(id) {
    try {
      await adminService.deleteRule(id);
      setFeedback('Regra removida.');
      await loadAdminData();
    } catch (requestError) {
      handleAdminError(requestError);
    }
  }

  async function markRuleHigh(rule) {
    try {
      await adminService.updateRule(rule.id, {
        ...rule,
        severity: 'high',
        active: true
      });
      setFeedback('Regra atualizada.');
      await loadAdminData();
    } catch (requestError) {
      handleAdminError(requestError);
    }
  }

  async function saveParameter(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      componentId: String(form.get('componentId')).slice(0, 80),
      type: form.get('type'),
      performanceScore: Number(form.get('performanceScore'))
    };

    try {
      await adminService.createParameter(payload);
      event.currentTarget.reset();
      setFeedback('Parâmetro cadastrado.');
      await loadAdminData();
    } catch (requestError) {
      handleAdminError(requestError);
    }
  }

  async function updateParameter(parameter) {
    try {
      await adminService.updateParameter(parameter.componentId, {
        performanceScore: Math.min(Number(parameter.performanceScore || 0) + 1, 100)
      });
      setFeedback('Parâmetro atualizado.');
      await loadAdminData();
    } catch (requestError) {
      handleAdminError(requestError);
    }
  }

  async function deleteParameter(componentId) {
    try {
      await adminService.deleteParameter(componentId);
      setFeedback('Parâmetro removido.');
      await loadAdminData();
    } catch (requestError) {
      handleAdminError(requestError);
    }
  }

  if (authenticated === null) return <div className="page-stack"><p>Verificando acesso administrativo...</p></div>;

  if (!authenticated) return (
    <div className="page-stack">
      <section className="page-hero compact-hero">
        <span className="eyebrow">PCPowerLab</span>
        <h1>Área Administrativa</h1>
      </section>
      <Card>
        <form className="form-grid" onSubmit={unlock}>
          <Input label="Senha de acesso" name="password" type="password" autoComplete="current-password"
            value={password} onChange={(event) => setPassword(event.target.value)} required />
          {authError && <Alert type="error">{authError}</Alert>}
          <Button type="submit" loading={authLoading}>Entrar</Button>
        </form>
      </Card>
    </div>
  );

  return (
    <div className="page-stack">
      <section className="page-hero compact-hero">
        <span className="eyebrow">MVP admin</span>
        <h1>Administração técnica</h1>
        <p>Gerencie regras e parâmetros de desempenho disponíveis na API mockada.</p>
        <Button type="button" variant="ghost" onClick={logout}>Sair</Button>
      </section>
      {error && <ErrorState message={error} onRetry={loadAdminData} />}
      {feedback && <Alert type="success">{feedback}</Alert>}

      <div className="admin-grid">
        <Card>
          <h2>Nova regra</h2>
          <form className="form-grid" onSubmit={createRule}>
            <Input label="Nome" name="name" required maxLength="100" />
            <Select label="Origem" name="sourceType" options={componentTypes.map((type) => ({ value: type, label: componentLabels[type] }))} />
            <Select label="Destino" name="targetType" options={[...componentTypes, 'build'].map((type) => ({ value: type, label: componentLabels[type] || 'Build completa' }))} />
            <Input label="Campo" name="field" required maxLength="60" />
            <Input label="Campo destino" name="targetField" maxLength="60" />
            <Select label="Operador" name="operator" options={['equals', 'includes', 'lessThanOrEqual', 'greaterThanOrEqual'].map((value) => ({ value, label: translateValue(value) }))} />
            <Select label="Severidade" name="severity" options={['low', 'medium', 'high'].map((value) => ({ value, label: translateSeverity(value) }))} />
            <Input label="Mensagem" name="message" required maxLength="220" />
            <Button type="submit">Cadastrar regra</Button>
          </form>
        </Card>

        <Card>
          <h2>Novo parâmetro</h2>
          <form className="form-grid" onSubmit={saveParameter}>
            <Input label="Component ID" name="componentId" required maxLength="80" />
            <Select label="Tipo" name="type" options={componentTypes.map((type) => ({ value: type, label: componentLabels[type] }))} />
            <Input label="Performance score" name="performanceScore" type="number" min="0" max="100" required />
            <Button type="submit">Cadastrar parâmetro</Button>
          </form>
        </Card>
      </div>

      <Card>
        <h2>Regras cadastradas</h2>
        <div className="admin-list">
          {rules.map((rule) => (
            <article key={rule.id} className="admin-row">
              <div>
                <strong>{rule.name}</strong>
                <span>{translateValue(rule.sourceType)} → {translateValue(rule.targetType)} • {translateSeverity(rule.severity)}</span>
              </div>
              <Button variant="ghost" onClick={() => markRuleHigh(rule)}>Marcar como alta</Button>
              <Button variant="danger" onClick={() => deleteRule(rule.id)}>Remover</Button>
            </article>
          ))}
        </div>
      </Card>

      <Card>
        <h2>Parâmetros de desempenho</h2>
        <div className="admin-list">
          {parameters.map((parameter) => (
            <article key={parameter.componentId} className="admin-row">
              <div>
                <strong>{parameter.componentId}</strong>
                <span>{translateValue(parameter.type)} • score {parameter.performanceScore}</span>
              </div>
              <Button variant="ghost" onClick={() => updateParameter(parameter)}>+1 score</Button>
              <Button variant="danger" onClick={() => deleteParameter(parameter.componentId)}>Remover</Button>
            </article>
          ))}
        </div>
      </Card>
    </div>
  );
}
