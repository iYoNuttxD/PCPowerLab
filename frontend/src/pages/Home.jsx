import { Link } from 'react-router-dom';
import { ArrowRight, Layers3 } from 'lucide-react';
import { featureHighlights } from '../App.jsx';
import Card from '../components/ui/Card.jsx';
import { useBuildState } from '../hooks/useBuildState.jsx';

export default function Home() {
  const { selectedComponents, wizardStep, budget } = useBuildState();
  const hasProgress = Object.values(selectedComponents).some(component => Array.isArray(component) ? component.length > 0 : Boolean(component))
    || wizardStep !== 'cpu' || Number(budget.amount) > 0;

  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Retro-arcade PC builder</span>
          <h1>PCPowerLab</h1>
          <p>
            Monte uma configuração personalizada, valide compatibilidade, simule desempenho
            e receba recomendações claras antes de investir nas peças.
          </p>
          <div className="button-row">
            <Link className="btn btn-primary btn-md" to="/build">{hasProgress ? 'Continuar montagem' : 'Montar meu PC'} <ArrowRight size={18} aria-hidden="true" /></Link>
            <Link className="btn btn-secondary btn-md" to="/components">Ver componentes</Link>
            <Link className="btn btn-ghost btn-md" to="/ready-builds">Explorar builds prontas</Link>
          </div>
        </div>
        <div className="hero-console" aria-hidden="true">
          <Layers3 size={64} />
          <div className="console-screen">
            <span>CPU + GPU</span>
            <strong>PC</strong>
            <span>Exemplo ilustrativo</span>
          </div>
          <div className="scan-lines" />
        </div>
      </section>

      <section className="feature-grid" aria-label="Benefícios">
        {featureHighlights.map((feature) => {
          const Icon = feature.icon;

          return (
            <Card key={feature.title}>
              <Icon size={28} aria-hidden="true" />
              <h2>{feature.title}</h2>
              <p>{feature.text}</p>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
