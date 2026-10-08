import { Link } from 'react-router-dom';
import { ArrowRight, Cpu, ShieldCheck, Sparkles, Gamepad2 } from 'lucide-react';
import { useBuildState } from '../hooks/useBuildState.jsx';

const features = [
  { icon: ShieldCheck, label: 'Compatibilidade' },
  { icon: Gamepad2, label: 'Desempenho simulado' },
  { icon: Cpu, label: 'Recomendações' },
  { icon: Sparkles, label: 'Resumo da montagem' }
];

export default function Home() {
  const { selectedComponents, wizardStep, budget } = useBuildState();
  const hasProgress = Object.values(selectedComponents).some(component => Array.isArray(component) ? component.length > 0 : Boolean(component))
    || wizardStep !== 'cpu' || Number(budget.amount) > 0;

  return (
    <div className="home-page page-stack">
      <section className="page-hero compact-hero home-task-hero">
        <span className="eyebrow">PCPowerLab</span>
        <h1>Monte seu próximo PC</h1>
        <p>Escolha as peças, confira a compatibilidade e planeje seu orçamento.</p>
        <div className="button-row">
          <Link className="btn btn-primary btn-md" to="/build">
            {hasProgress ? 'Continuar montagem' : 'Montar meu PC'} <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <Link className="btn btn-secondary btn-md" to="/components">Ver componentes</Link>
          <Link className="btn btn-ghost btn-md" to="/ready-builds">Explorar builds prontas</Link>
        </div>
      </section>

      <ul className="home-feature-list" aria-label="Recursos">
        {features.map(({ icon: Icon, label }) => (
          <li key={label}><Icon size={22} aria-hidden="true" /><span>{label}</span></li>
        ))}
      </ul>
    </div>
  );
}
