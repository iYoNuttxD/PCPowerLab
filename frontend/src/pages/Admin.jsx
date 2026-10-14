import ComponentIdentity from '../components/componentsCatalog/ComponentIdentity.jsx';
import { useEffect, useState } from 'react';
import Alert from '../components/ui/Alert.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import Input from '../components/ui/Input.jsx';
import Select from '../components/ui/Select.jsx';
import TaskTabs, { TaskPanel } from '../components/ui/TaskTabs.jsx';
import { adminService } from '../services/adminService.js';
import { componentLabels, componentTypes, catalogComponentTypes } from '../utils/componentLabels.js';
import { translateSeverity, translateValue } from '../utils/translations.js';

export default function Admin() {
  const [authenticated, setAuthenticated] = useState(null);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [rules, setRules] = useState([]);
  const [parameters, setParameters] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [activeTask, setActiveTask] = useState('rules');
  const [ruleSearch, setRuleSearch] = useState('');
  const [parameterSearch, setParameterSearch] = useState('');

  function handleAdminError(requestError) {
    if (requestError.status === 401) {
      setAuthenticated(false);
      setAuthError('A sessão expirou. Digite a senha novamente.');
      return;
    }
    setError(requestError.message);
  }

  async function loadAdminData() {
    setDataLoading(true);
    try {
      const [rulesData, parametersData] = await Promise.all([
        adminService.listRules(),
        adminService.listParameters()
      ]);
      setRules(Array.isArray(rulesData) ? rulesData : []);
      setParameters(Array.isArray(parametersData) ? parametersData : []);
    } catch (requestError) {
      handleAdminError(requestError);
    } finally {
      setDataLoading(false);
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
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

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
      formElement.reset();
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
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = {
      componentId: String(form.get('componentId')).slice(0, 80),
      type: form.get('type'),
      performanceScore: Number(form.get('performanceScore'))
    };

    try {
      await adminService.createParameter(payload);
      formElement.reset();
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

  if (authenticated === null) return <div className="page-stack">
    <section className="page-hero compact-hero"><span className="eyebrow">PCPowerLab</span><h1>Área Administrativa</h1></section>
    <p role="status">Verificando acesso administrativo...</p>
  </div>;

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

  const matchingRules = rules.filter(rule => `${rule.name} ${rule.sourceType} ${rule.targetType}`.toLocaleLowerCase('pt-BR').includes(ruleSearch.trim().toLocaleLowerCase('pt-BR')));
  const matchingParameters = parameters.filter(parameter => `${parameter.componentId} ${componentLabels[parameter.type] || parameter.type}`.toLocaleLowerCase('pt-BR').includes(parameterSearch.trim().toLocaleLowerCase('pt-BR')));

  return (
    <div className="page-stack">
      <section className="page-hero compact-hero">
        <div className="section-heading compact">
          <div><span className="eyebrow">Acesso administrativo</span><h1>Administração técnica</h1></div>
          <Button type="button" variant="ghost" onClick={logout}>Sair</Button>
        </div>
      </section>
      <Alert type="warning" title="Regras documentais">
        Estes registros editáveis não executam nem controlam a compatibilidade: a análise utiliza verificações implementadas no backend. Alterar uma regra aqui não altera os testes técnicos.
      </Alert>
      {error && <ErrorState message={error} onRetry={loadAdminData} />}
      {feedback && <Alert type="success">{feedback}</Alert>}
      {dataLoading && <p role="status">Carregando regras e parâmetros…</p>}

      <TaskTabs id="admin-tasks" label="Tarefas administrativas" value={activeTask} onChange={setActiveTask}
        tabs={[{ id: 'rules', label: 'Regras' }, { id: 'parameters', label: 'Parâmetros' }]} />

      <TaskPanel id="admin-tasks" value="rules" active={activeTask === 'rules'}>
        <Card>
          <h2>Regras cadastradas</h2>
          <Input label="Buscar regra" type="search" value={ruleSearch} onChange={event => setRuleSearch(event.target.value)} />
          <div className="admin-list">
            {matchingRules.map((rule) => (
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
          {!dataLoading && !error && !matchingRules.length && <p role="status">{ruleSearch.trim() ? 'Nenhuma regra encontrada.' : 'Nenhuma regra cadastrada.'}</p>}
          <details className="analysis-help">
            <summary>Adicionar regra</summary>
            <form className="form-grid" onSubmit={createRule}>
              <Input label="Nome" name="name" required maxLength="100" />
              <Select label="Origem" name="sourceType" options={catalogComponentTypes.map((type) => ({ value: type, label: componentLabels[type] }))} />
              <Select label="Destino" name="targetType" options={[...catalogComponentTypes, 'build'].map((type) => ({ value: type, label: componentLabels[type] || 'Build completa' }))} />
              <Input label="Campo" name="field" required maxLength="60" />
              <Input label="Campo destino" name="targetField" maxLength="60" />
              <Select label="Operador" name="operator" options={['equals', 'includes', 'lessThanOrEqual', 'greaterThanOrEqual'].map((value) => ({ value, label: translateValue(value) }))} />
              <Select label="Severidade" name="severity" options={['low', 'medium', 'high'].map((value) => ({ value, label: translateSeverity(value) }))} />
              <Input label="Mensagem" name="message" required maxLength="220" />
              <Button type="submit">Cadastrar regra</Button>
            </form>
          </details>
        </Card>
      </TaskPanel>

      <TaskPanel id="admin-tasks" value="parameters" active={activeTask === 'parameters'}>
        <Card>
          <h2>Parâmetros de desempenho</h2>
          <Input label="Buscar parâmetro" type="search" value={parameterSearch} onChange={event => setParameterSearch(event.target.value)} />
          <div className="admin-list">
            {matchingParameters.map((parameter) => (
              <article key={parameter.componentId} className="admin-row">
                <div>
                  <ComponentIdentity component={parameter.componentId} category={parameter.type}><small>{parameter.componentId}</small></ComponentIdentity>
                  <span>{translateValue(parameter.type)} • pontuação simulada {parameter.performanceScore} / 100 pontos</span>
                </div>
                <Button variant="ghost" onClick={() => updateParameter(parameter)}>+1 ponto</Button>
                <Button variant="danger" onClick={() => deleteParameter(parameter.componentId)}>Remover</Button>
              </article>
            ))}
          </div>
          {!dataLoading && !error && !matchingParameters.length && <p role="status">{parameterSearch.trim() ? 'Nenhum parâmetro encontrado.' : 'Nenhum parâmetro cadastrado.'}</p>}
          <details className="analysis-help">
            <summary>Adicionar parâmetro</summary>
            <p className="analysis-note" id="admin-score-scope">Pontuação simulada de 0 a 100 pontos, sem benchmark medido. Pontos não equivalem a FPS nem a uma porcentagem de velocidade.</p>
            <p className="analysis-note" id="admin-cooling-scope">Coolers e ventoinhas não recebem pontuação sintética de desempenho nem ganho de FPS. Suas especificações são usadas para refrigeração, consumo e compatibilidade.</p>
            <form className="form-grid" onSubmit={saveParameter}>
              <Input label="Component ID" name="componentId" required maxLength="80" />
              <Select label="Tipo" name="type" aria-describedby="admin-cooling-scope" options={componentTypes.map((type) => ({ value: type, label: componentLabels[type] }))} />
              <Input label="Pontuação simulada" name="performanceScore" type="number" min="0" max="100" required
                hint="De 0 a 100 pontos." aria-describedby="admin-score-scope admin-cooling-scope" />
              <Button type="submit">Cadastrar parâmetro</Button>
            </form>
          </details>
        </Card>
      </TaskPanel>
    </div>
  );
}
