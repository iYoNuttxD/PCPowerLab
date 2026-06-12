import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { CircuitBoard, Menu } from 'lucide-react';

const navItems = [
  { to: '/components', label: 'Componentes' },
  { to: '/build', label: 'Montar PC' },
  { to: '/summary', label: 'Resumo' },
  { to: '/performance-lab', label: 'Performance' },
  { to: '/compare', label: 'Comparar' },
  { to: '/insights', label: 'Insights' },
  { to: '/ready-builds', label: 'Builds prontas' },
  { to: '/saved-builds', label: 'Builds salvas' },
  { to: '/upgrades', label: 'Upgrades' },
  { to: '/admin', label: 'Admin' }
];

export default function AppLayout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/">
          <CircuitBoard size={28} aria-hidden="true" />
          <span>PCPowerLab</span>
        </Link>
        <nav className={`main-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Navegação principal">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} onClick={() => setMenuOpen(false)}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button
          className="mobile-menu-button"
          type="button"
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((current) => !current)}
        >
          <Menu size={22} aria-hidden="true" />
        </button>
      </header>
      <main className="page-content">
        {children}
      </main>
      <footer className="footer">
        <span>PCPowerLab MVP</span>
        <Link to="/about">Sobre o projeto</Link>
      </footer>
    </div>
  );
}
