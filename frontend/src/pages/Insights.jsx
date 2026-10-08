import ComponentImage from '../components/componentsCatalog/ComponentImage.jsx';
import { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import Alert from '../components/ui/Alert.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Input from '../components/ui/Input.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import Select from '../components/ui/Select.jsx';
import AnalysisHelp from '../components/build/AnalysisHelp.jsx';
import { costBenefitService } from '../services/costBenefitService.js';
import { componentLabels } from '../utils/componentLabels.js';
import { formatCurrency } from '../utils/formatCurrency.js';
import { translateValue } from '../utils/translations.js';

const categoryOptions = [
  { value: '', label: 'Todos' },
  ...Object.entries(componentLabels).map(([value, label]) => ({ value, label }))
];

export default function Insights() {
  const [ranking, setRanking] = useState([]);
  const [rankingFilters, setRankingFilters] = useState({ category: '', limit: 10 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadRanking();
  }, []);

  async function loadRanking() {
    setLoading(true);
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
      setLoading(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="page-hero compact-hero">
        <span className="eyebrow">Insights</span>
        <h1>Custo-benefício de componentes</h1>
        <p>Compare componentes por valor entregue e encontre peças com boa relação entre preço e desempenho.</p>
      </section>

      {error && <Alert type="error">{error}</Alert>}

      <Card>
        <div className="section-heading compact">
          <div>
            <span className="eyebrow">Ranking de custo-benefício</span>
            <h2><BarChart3 size={22} aria-hidden="true" /> Componentes com melhor relação preço/desempenho</h2>
          </div>
          <Badge tone="green">Ranking</Badge>
        </div>

        <p className="analysis-note">Índice calculado com desempenho cadastrado e preço de referência. A nota de custo-benefício é relativa à categoria; filtre uma categoria para comparar peças equivalentes.</p>
        <AnalysisHelp topics={['costBenefit', 'score']} title="Como ler este ranking" />
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
          <Button disabled={loading} loading={loading} onClick={loadRanking}>
            Atualizar ranking
          </Button>
        </div>

        {loading ? <LoadingSpinner /> : <RankingList ranking={ranking} />}
      </Card>
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
              <ComponentImage component={component} compact />
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
                  <span>Preço de referência</span>
                  <strong>{formatCurrency(component.price)}</strong>
                </div>
                <div>
                  <span>Desempenho cadastrado</span>
                  <strong>{formatNumber(entry.performanceScore)} / 100</strong>
                </div>
                <div>
                  <span>Custo-benefício</span>
                  <strong>{formatNumber(entry.costBenefitScore)} / 100</strong>
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
