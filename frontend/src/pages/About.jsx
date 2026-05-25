import Card from '../components/ui/Card.jsx';

export default function About() {
  return (
    <div className="page-stack">
      <section className="page-hero compact-hero">
        <span className="eyebrow">Sobre</span>
        <h1>PCPowerLab</h1>
        <p>Uma API e interface web para apoiar decisões na montagem de computadores personalizados.</p>
      </section>
      <Card>
        <h2>Como funciona</h2>
        <p>
          O frontend consome a API REST local, organiza os fluxos de montagem e apresenta dados
          técnicos em linguagem mais simples. Compatibilidade, gargalos, orçamento e recomendações
          continuam sendo calculados pelo backend.
        </p>
      </Card>
    </div>
  );
}
