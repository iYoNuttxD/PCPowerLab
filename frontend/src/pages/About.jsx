import DecisionMethodology from '../components/build/DecisionMethodology.jsx';
import Card from '../components/ui/Card.jsx';

export default function About() {
  return (
    <div className="page-stack">
      <section className="page-hero compact-hero">
        <span className="eyebrow">Sobre</span>
        <h1>PCPowerLab</h1>
        <p>Escolha peças e planeje um computador para seu uso e orçamento.</p>
      </section>
      <Card>
        <h2>Da escolha à montagem</h2>
        <p>Explore o catálogo ou comece com uma build pronta. Compare alternativas, confira a compatibilidade e salve sua configuração.</p>
        <h2>Antes de comprar</h2>
        <p>As análises usam os dados do catálogo; informações ausentes são sinalizadas. Confira preços, estoque e manuais do fabricante.</p>
      </Card>
      <DecisionMethodology />
    </div>
  );
}
