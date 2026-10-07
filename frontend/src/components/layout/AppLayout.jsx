import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, CircuitBoard, Menu, X } from 'lucide-react';

const navGroups = [
  { id: 'explore', label: 'Explorar', items: [
    { to: '/components', label: 'Componentes', description: 'Catálogo de peças e preços' },
    { to: '/ready-builds', label: 'Builds prontas', description: 'Configurações para começar' },
    { to: '/insights', label: 'Custo-benefício', description: 'Insights para escolher suas peças' }
  ] },
  { id: 'builds', label: 'Minhas builds', items: [
    { to: '/summary', label: 'Resumo da build', description: 'Peças, orçamento e análises' },
    { to: '/saved-builds', label: 'Builds salvas', description: 'Suas configurações e histórico' }
  ] },
  { id: 'analyze', label: 'Analisar', items: [
    { to: '/performance-lab', label: 'Performance', description: 'Simulações em jogos e softwares' },
    { to: '/compare', label: 'Comparar builds', description: 'Compare suas configurações' },
    { to: '/upgrades', label: 'Upgrades', description: 'Planeje as próximas melhorias' }
  ] }
];

export default function AppLayout({ children }) {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState(null);
  const headerRef = useRef(null);
  const menuButtonRef = useRef(null);
  const mainRef = useRef(null);
  const previousPath = useRef(pathname);

  function closeMenu() {
    setMenuOpen(false);
    setOpenGroup(null);
  }

  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    setMenuOpen(false);
    setOpenGroup(null);
    const heading = mainRef.current?.querySelector('h1');
    heading?.setAttribute('tabindex', '-1');
    (heading || mainRef.current)?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    function dismiss(event) {
      if (!headerRef.current?.contains(event.target)) closeMenu();
    }
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, []);

  function handleEscape(event) {
    if (event.key !== 'Escape') return;
    if (openGroup) {
      headerRef.current?.querySelector(`#nav-toggle-${openGroup}`)?.focus();
      setOpenGroup(null);
    } else if (menuOpen) {
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    }
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Pular para o conteúdo</a>
      <header className="topbar" ref={headerRef} onKeyDown={handleEscape}
        onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) closeMenu(); }}>
        <Link className="brand" to="/" onClick={closeMenu} aria-label="PCPowerLab — início">
          <CircuitBoard size={28} aria-hidden="true" />
          <span>PCPowerLab</span>
        </Link>
        <button ref={menuButtonRef} className="mobile-menu-button" type="button"
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menuOpen}
          aria-controls="main-navigation" onClick={() => { setMenuOpen(!menuOpen); setOpenGroup(null); }}>
          {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          <span>Menu</span>
        </button>
        <nav id="main-navigation" className={`main-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Navegação principal">
          <ul className="nav-list">
            <li><NavLink className="nav-build" to="/build" onClick={closeMenu}>Montar PC</NavLink></li>
            {navGroups.map((group) => (
              <li key={group.id} className="nav-group">
                <button id={`nav-toggle-${group.id}`} className={`nav-toggle ${group.items.some(item => item.to === pathname) ? 'is-current' : ''}`}
                  type="button" aria-expanded={openGroup === group.id} aria-controls={`nav-${group.id}`}
                  onClick={() => setOpenGroup(openGroup === group.id ? null : group.id)}>
                  {group.label}<ChevronDown size={16} aria-hidden="true" />
                </button>
                <ul id={`nav-${group.id}`} className="nav-dropdown" hidden={openGroup !== group.id}>
                  {group.items.map((item) => (
                    <li key={item.to}>
                      <NavLink to={item.to} onClick={closeMenu}>
                        <span>{item.label}</span><small>{item.description}</small>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
            <li><NavLink to="/feedback" onClick={closeMenu}>Feedback</NavLink></li>
          </ul>
        </nav>
      </header>
      <main id="main-content" className="page-content" tabIndex={-1} ref={mainRef}>{children}</main>
      <footer className="footer">
        <span>PCPowerLab · Seu próximo PC começa aqui.</span>
        <Link to="/about">Sobre o projeto</Link>
      </footer>
    </div>
  );
}
