import { Route, Routes } from 'react-router-dom';
import { Cpu, Gamepad2, ShieldCheck, Sparkles } from 'lucide-react';
import AppLayout from './components/layout/AppLayout.jsx';
import ErrorBoundary from './components/ui/ErrorBoundary.jsx';
import Home from './pages/Home.jsx';
import ComponentsCatalog from './pages/ComponentsCatalog.jsx';
import BuildWizard from './pages/BuildWizard.jsx';
import BuildSummary from './pages/BuildSummary.jsx';
import CompareBuilds from './pages/CompareBuilds.jsx';
import SavedBuilds from './pages/SavedBuilds.jsx';
import ReadyBuilds from './pages/ReadyBuilds.jsx';
import PerformanceLab from './pages/PerformanceLab.jsx';
import Insights from './pages/Insights.jsx';
import Feedback from './pages/Feedback.jsx';
import UpgradeSuggestions from './pages/UpgradeSuggestions.jsx';
import SharedBuild from './pages/SharedBuild.jsx';
import Admin from './pages/Admin.jsx';
import About from './pages/About.jsx';
import ImageCredits from './pages/ImageCredits.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <ErrorBoundary>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/components" element={<ComponentsCatalog />} />
          <Route path="/build" element={<BuildWizard />} />
          <Route path="/summary" element={<BuildSummary />} />
          <Route path="/performance-lab" element={<PerformanceLab />} />
          <Route path="/compare" element={<CompareBuilds />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/feedback/new" element={<Feedback />} />
          <Route path="/ready-builds" element={<ReadyBuilds />} />
          <Route path="/saved-builds" element={<SavedBuilds />} />
          <Route path="/upgrades" element={<UpgradeSuggestions />} />
          <Route path="/shared/:shareId" element={<SharedBuild />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/about" element={<About />} />
          <Route path="/image-credits" element={<ImageCredits />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppLayout>
    </ErrorBoundary>
  );
}

export const featureHighlights = [
  {
    icon: ShieldCheck,
    title: 'Compatibilidade',
    text: 'Valide socket, memória, gabinete, fonte e outras regras técnicas.'
  },
  {
    icon: Gamepad2,
    title: 'Desempenho',
    text: 'Simule jogos, gargalos e equilíbrio entre CPU, GPU, RAM e armazenamento.'
  },
  {
    icon: Cpu,
    title: 'Recomendações',
    text: 'Receba sugestões por orçamento, uso, custo-benefício e upgrades.'
  },
  {
    icon: Sparkles,
    title: 'Resumo claro',
    text: 'Transforme dados técnicos em explicações simples para decidir melhor.'
  }
];
