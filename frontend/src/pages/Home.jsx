import { Link } from 'react-router-dom';
import { ArrowRight, Layers3 } from 'lucide-react';
import { featureHighlights } from '../App.jsx';
import Card from '../components/ui/Card.jsx';
import { useBuildState } from '../hooks/useBuildState.jsx';

export default function Home() {
  const { selectedComponents, wizardStep, budget } = useBuildState();
  const hasProgress = Object.values(selectedComponents).some(component => Array.isArray(component) ? component.length > 0 : Boolean(component))
    || !['cpu', 'budget'].includes(wizardStep) || Number(budget.amount) > 0;

  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Seu PC, peça por peça</span>
          <h1>Seu próximo PC<br /><span className="hero-highlight">começa aqui.</span></h1>
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

      <ol className="home-journey" aria-label="Como montar seu PC">
        <li><span>01</span><div><strong>Defina seu limite</strong><p>Comece pelo orçamento e pelo que você quer fazer.</p></div></li>
        <li><span>02</span><div><strong>Encontre suas peças</strong><p>Busque recursos, compare modelos e monte no seu ritmo.</p></div></li>
        <li><span>03</span><div><strong>Confira antes de comprar</strong><p>Veja compatibilidade, pendências e lojas em um resumo.</p></div></li>
      </ol>
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
