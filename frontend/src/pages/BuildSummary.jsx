import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Save, Share2 } from 'lucide-react';
import BottleneckPanel from '../components/build/BottleneckPanel.jsx';
import BudgetPanel from '../components/build/BudgetPanel.jsx';
import BuildSummaryCard from '../components/build/BuildSummaryCard.jsx';
import PurchaseLinksList from '../components/build/PurchaseLinksList.jsx';
import CompatibilityStatus from '../components/compatibility/CompatibilityStatus.jsx';
import Alert from '../components/ui/Alert.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import Select from '../components/ui/Select.jsx';
import { useApiRequest } from '../hooks/useApiRequest.js';
import { useBuildState } from '../hooks/useBuildState.jsx';
import { performanceService } from '../services/performanceService.js';
import { purchaseLinksService } from '../services/purchaseLinksService.js';
import { recommendationService } from '../services/recommendationService.js';
import { savedBuildsService } from '../services/savedBuildsService.js';
import { sharingService } from '../services/sharingService.js';
import { buildToApiPayload, buildToPurchaseLinksPayload, hasCompleteBuild, normalizeBudgetPayload, normalizeSavedBuildPayload } from '../utils/buildHelpers.js';
import { translateValue } from '../utils/translations.js';

export default function BuildSummary() {
  const build = useBuildState();
  const request = useApiRequest();
  const [games, setGames] = useState([]);
  const [linksByBuild, setLinksByBuild] = useState(null);
  const [share, setShare] = useState(null);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    performanceService.listGames()
      .then((data) => setGames(Array.isArray(data) ? data : []))
      .catch(() => setGames([]));
  }, []);

  async function generateSummary() {
    if (!hasCompleteBuild(build.selectedComponents)) {
      setFeedback('Complete a build antes de gerar o resumo.');
      return;
    }

    await request.run(async () => {
      const [summary, gamePerformance, links] = await Promise.all([
        recommendationService.summary({
          build: build.buildPayload,
          budget: build.budget.amount ? normalizeBudgetPayload(build.budget) : undefined,
          usageType: build.usageType,
          ...build.game
        }),
        performanceService.simulateGame({
          ...build.game,
          build: build.buildPayload
        }).catch((error) => ({
          status: 'unavailable',
          message: error.status === 0
            ? 'Não foi possível conectar ao servidor para simular desempenho.'
            : 'Não foi possível simular desempenho com os dados atuais.'
        })),
        purchaseLinksService.byBuild(buildToPurchaseLinksPayload(build.selectedComponents)).catch(() => null)
      ]);

      build.actions.setResult('summary', summary);
      build.actions.setResult('gamePerformance', gamePerformance);
      setLinksByBuild(links);
      setFeedback('Resumo final atualizado.');
    });
  }

  async function saveBuild() {
    if (!hasCompleteBuild(build.selectedComponents)) {
      setFeedback('Complete a build antes de salvar.');
      return;
    }

    await request.run(async () => {
      await savedBuildsService.create(normalizeSavedBuildPayload({
        name: 'Build final PCPowerLab',
        selectedComponents: build.selectedComponents,
        budget: build.budget,
        usageType: build.usageType
      }));
      setFeedback('Build salva com sucesso.');
    });
  }

  async function shareBuild() {
    if (!hasCompleteBuild(build.selectedComponents)) {
      setFeedback('Complete a build antes de compartilhar.');
      return;
    }

    await request.run(async () => {
      const result = await sharingService.create({
        name: 'Build compartilhada',
        build: buildToApiPayload(build.selectedComponents),
        budget: build.budget.amount ? normalizeBudgetPayload(build.budget) : undefined,
        usageType: build.usageType
      });
      setShare(result);
      setFeedback('Link de compartilhamento gerado.');
    });
  }

  async function copyShareLink() {
    const path = share?.shareUrl?.replace('/shared-builds/', '/shared/') || `/shared/${share?.shareId}`;
    const url = `${window.location.origin}${path}`;
    await navigator.clipboard.writeText(url);
    setFeedback('Link copiado.');
  }

  return (
    <div className="page-stack">
      <section className="page-hero compact-hero">
        <span className="eyebrow">Painel final</span>
        <h1>Resumo da configuração</h1>
        <p>Consolide componentes, orçamento, compatibilidade, desempenho, gargalos e links de compra.</p>
      </section>

      {request.error && <ErrorState message={request.error} />}
      {feedback && <Alert type="success">{feedback}</Alert>}

      <Card>
        <div className="form-grid">
          <Select
            label="Selecione um jogo para simular o desempenho"
            value={build.game.gameId}
            onChange={(event) => build.actions.setGame({ gameId: event.target.value })}
            options={(games.length ? games : [{ id: 'game-cyberpunk-2077', name: 'Cyberpunk 2077' }]).map((game) => ({
              value: game.id,
              label: game.name
            }))}
          />
          <Select
            label="Resolução"
            value={build.game.targetResolution}
            onChange={(event) => build.actions.setGame({ targetResolution: event.target.value })}
            options={['1080p', '1440p', '4k'].map((value) => ({ value, label: value }))}
          />
          <Select
            label="Qualidade"
            value={build.game.qualityPreset}
            onChange={(event) => build.actions.setGame({ qualityPreset: event.target.value })}
            options={['low', 'medium', 'high', 'ultra'].map((value) => ({ value, label: translateValue(value) }))}
          />
        </div>
        <div className="button-row">
          <Button disabled={request.loading} loading={request.loading} onClick={generateSummary}>Gerar resumo final</Button>
          <Button variant="secondary" disabled={request.loading} onClick={saveBuild}><Save size={18} /> Salvar</Button>
          <Button variant="ghost" disabled={request.loading} onClick={shareBuild}><Share2 size={18} /> Compartilhar</Button>
          <Link className="btn btn-secondary btn-md" to="/build">Voltar e editar</Link>
          <Link className="btn btn-primary btn-md" to="/compare">Comparar build</Link>
          <Link className="btn btn-ghost btn-md" to="/upgrades">Sugerir upgrade</Link>
        </div>
      </Card>

      {request.loading && <LoadingSpinner />}
      {share && (
        <Alert type="info" title="Compartilhamento">
          <p>ID: {share.shareId} • URL: {share.shareUrl}</p>
          <Button variant="ghost" onClick={copyShareLink}><Copy size={18} /> Copiar link</Button>
        </Alert>
      )}

      <div className="dashboard-grid">
        <BuildSummaryCard selectedComponents={build.selectedComponents} totalPrice={build.totalPrice} />
        <BudgetPanel budget={build.budget} totalPrice={build.totalPrice} />
      </div>

      <CompatibilityStatus result={build.summary?.compatibility ? { ...build.summary.compatibility, alerts: build.summary.compatibility.alerts } : build.alerts} />
      <BottleneckPanel result={build.summary?.bottlenecks || build.bottlenecks} />

      {build.gamePerformance?.status === 'unavailable' && (
        <Card>
          <h2>Simulação em jogos indisponível</h2>
          <p>{build.gamePerformance.message}</p>
        </Card>
      )}

      {build.gamePerformance && build.gamePerformance.status !== 'unavailable' && (
        <Card>
          <h2>Simulação em jogos</h2>
          <div className="metric-grid">
            <div><span>Jogo</span><strong>{build.gamePerformance.game}</strong></div>
            <div><span>FPS estimado</span><strong>{build.gamePerformance.estimatedFps}</strong></div>
            <div><span>Nível</span><strong>{translateValue(build.gamePerformance.performanceLevel)}</strong></div>
          </div>
          <p>{build.gamePerformance.summary}</p>
        </Card>
      )}

      {build.summary && (
        <Card>
          <h2>Recomendação final</h2>
          <p>{build.summary.summary}</p>
          <strong>{build.summary.finalRecommendation}</strong>
        </Card>
      )}

      <PurchaseLinksList linksBySlot={linksByBuild} />
    </div>
  );
}
