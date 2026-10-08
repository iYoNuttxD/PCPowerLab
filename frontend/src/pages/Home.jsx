import { Link } from 'react-router-dom';
import { ArrowRight, Layers3 } from 'lucide-react';
import { featureHighlights } from '../App.jsx';
import Card from '../components/ui/Card.jsx';

export default function Home() {
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
            <Link className="btn btn-primary btn-md" to="/build">Montar meu PC <ArrowRight size={18} /></Link>
            <Link className="btn btn-secondary btn-md" to="/components">Ver componentes</Link>
          </div>
        </div>
        <div className="hero-console" aria-hidden="true">
          <Layers3 size={64} />
          <div className="console-screen">
            <span>CPU + GPU SYNC</span>
            <strong>98%</strong>
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
