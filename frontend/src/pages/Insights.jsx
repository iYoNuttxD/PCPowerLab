import { performanceScoreLabel } from '../utils/performanceMethodology.js';
import DecisionMethodology from '../components/build/DecisionMethodology.jsx';
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
import { componentLabels, componentTypes } from '../utils/componentLabels.js';
import { formatCurrency } from '../utils/formatCurrency.js';
import { numericValue } from '../utils/performancePresentation.js';
import { translateValue } from '../utils/translations.js';

const categoryOptions = [
  { value: '', label: 'Todos' },
  // Cooling has no performance-score model; build-only labels are not API categories.
  ...componentTypes.map((value) => ({ value, label: componentLabels[value] }))
];

export default function Insights() {
  const [ranking, setRanking] = useState(null);
  const [rankingFilters, setRankingFilters] = useState({ category: '', limit: 10 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [limitError, setLimitError] = useState('');

  useEffect(() => {
    loadRanking();
  }, []);

  async function loadRanking() {
    const limit = Number(rankingFilters.limit);
    setError('');
    setRanking(null);
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
      setLimitError('Informe um número inteiro entre 1 e 50.');
      return;
    }

    setLimitError('');
    setLoading(true);

    try {
      const filters = {
        ...(rankingFilters.category && { category: rankingFilters.category }),
        limit
      };
      const result = await costBenefitService.listComponents(filters);
      if (!Array.isArray(result)) throw new Error('Não foi possível carregar o ranking de custo-benefício.');
      setRanking(result);
    } catch (rankingError) {
      setError(rankingError.message || 'Não foi possível carregar o ranking de custo-benefício.');
      setRanking(null);
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
      <DecisionMethodology />

      {error && <Alert type="error">{error}</Alert>}

      <Card>
        <div className="section-heading compact">
          <div>
            <span className="eyebrow">Ranking de custo-benefício</span>
            <h2><BarChart3 size={22} aria-hidden="true" /> Relação preço/desempenho estimada no catálogo</h2>
          </div>
          <Badge tone="green">Ranking</Badge>
        </div>

        <p className="analysis-note">Índice calculado com desempenho cadastrado e preço de referência. A nota de custo-benefício é relativa à categoria; filtre uma categoria para comparar peças equivalentes.</p>
        <p className="analysis-note">Coolers e ventoinhas não participam deste ranking porque não possuem índice de desempenho para esta comparação.</p>
        <AnalysisHelp topics={['costBenefit', 'score']} title="Como ler este ranking" />
        <div className="form-grid compact-form-grid">
          <Select
            label="Categoria"
            disabled={loading}
            value={rankingFilters.category}
            onChange={(event) => {
              setRankingFilters((current) => ({ ...current, category: event.target.value }));
              setRanking(null);
              setError('');
            }}
            options={categoryOptions}
          />
          <Input
            label="Limite"
            type="number"
            min="1"
            max="50"
            step="1"
            disabled={loading}
            hint="De 1 a 50 componentes."
            error={limitError}
            value={rankingFilters.limit}
            onChange={(event) => {
              setRankingFilters((current) => ({ ...current, limit: event.target.value }));
              setLimitError('');
              setError('');
              setRanking(null);
            }}
          />
        </div>
        <div className="button-row">
          <Button disabled={loading} loading={loading} onClick={loadRanking}>
            Atualizar ranking
          </Button>
        </div>

        {loading ? <LoadingSpinner /> : ranking !== null && !error && !limitError && <RankingList ranking={ranking} />}
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
                  {numericValue(entry.costBenefitScore) === null ? 'Não disponível' : entry.classification ? translateValue(entry.classification) : classifyCostBenefit(entry.costBenefitScore)}
                </Badge>
              </div>
              <div className="metric-grid compact-metric-grid">
                <div>
                  <span>Preço de referência</span>
                  <strong>{formatCurrency(component.price)}</strong>
                </div>
                <div>
                  <span>{numericValue(entry.performanceScore) === null ? 'Pontuação de desempenho' : performanceScoreLabel(entry, component)}</span>
                  <strong>{formatNumber(entry.performanceScore)}{numericValue(entry.performanceScore) !== null && ' / 100'}</strong>
                </div>
                <div>
                  <span>Custo-benefício</span>
                  <strong>{formatNumber(entry.costBenefitScore)}{numericValue(entry.costBenefitScore) !== null && ' / 100'}</strong>
                </div>
              </div>
              <p>{entry.summary || (numericValue(entry.costBenefitScore) === null ? 'Nota de custo-benefício indisponível para este componente.' : 'Posição calculada com dados cadastrados e preço de referência, sem cotação atual de mercado.')}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function getCostBenefitTone(score) {
  const value = numericValue(score);

  if (value === null) return 'cyan';
  if (value >= 80) return 'green';
  if (value >= 60) return 'cyan';
  if (value >= 40) return 'yellow';
  return 'red';
}

function classifyCostBenefit(score) {
  const value = numericValue(score);

  if (value === null) return 'Não disponível';
  if (value >= 80) return 'Excelente';
  if (value >= 60) return 'Bom';
  if (value >= 40) return 'Regular';
  return 'Baixo';
}

function formatNumber(value) {
  const number = numericValue(value);

  return number === null ? 'Não disponível' : Math.round(number);
}
