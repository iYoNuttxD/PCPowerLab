import DecisionMethodology from '../components/build/DecisionMethodology.jsx';
import Card from '../components/ui/Card.jsx';

export default function About() {
  return (
    <div className="page-stack">
      <section className="page-hero compact-hero">
        <span className="eyebrow">Sobre</span>
        <h1>PCPowerLab</h1>
        <p>Uma ferramenta para escolher peças e planejar um computador de acordo com seu uso e orçamento.</p>
      </section>
      <DecisionMethodology />
      <Card>
        <h2>Como funciona</h2>
        <p>
          Escolha peças, compare alternativas e confira encaixes, custos e desempenho estimado.
          As análises usam especificações e regras do catálogo. Dados ausentes são sinalizados;
          uma simulação não substitui medidas reais nem a conferência dos manuais antes da compra.
        </p>
      </Card>
    </div>
  );
}
