import { Link, NavLink } from 'react-router-dom';
import { CircuitBoard, Menu } from 'lucide-react';

const navItems = [
  { to: '/components', label: 'Componentes' },
  { to: '/build', label: 'Montar PC' },
  { to: '/summary', label: 'Resumo' },
  { to: '/compare', label: 'Comparar' },
  { to: '/saved-builds', label: 'Builds salvas' },
  { to: '/upgrades', label: 'Upgrades' },
  { to: '/admin', label: 'Admin' }
];

export default function AppLayout({ children }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/">
          <CircuitBoard size={28} aria-hidden="true" />
          <span>PCPowerLab</span>
        </Link>
        <nav className="main-nav" aria-label="Navegação principal">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <Menu className="mobile-menu-icon" aria-hidden="true" />
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
