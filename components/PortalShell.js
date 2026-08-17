'use client';

import { useEffect, useState } from 'react';
import logo from '../assets/LA_CLOTHES_Logotipo-04.png';
import PacasDashboard from './PacasDashboard';

const views = {
  global: {
    label: 'Global',
    src: 'https://datastudio.google.com/embed/reporting/f65fb799-b645-42a5-beb4-8a824fb86613/page/lZNyF',
    link: 'https://datastudio.google.com/reporting/f65fb799-b645-42a5-beb4-8a824fb86613',
  },
  afluencia: {
    label: 'Afluencia',
    src: 'https://datastudio.google.com/embed/reporting/11d460ed-ed72-4543-a143-4bdcf611f580/page/KU01F',
    link: 'https://datastudio.google.com/reporting/11d460ed-ed72-4543-a143-4bdcf611f580',
  },
  larousse_encuestas: {
    label: 'Encuestas',
    src: 'https://datastudio.google.com/embed/reporting/0f76e3dc-4f94-495b-86f4-0de5a6e63e2a/page/hOjyF',
    link: 'https://datastudio.google.com/reporting/0f76e3dc-4f94-495b-86f4-0de5a6e63e2a',
  },
  larousse: {
    label: 'La Rousse',
    src: 'https://datastudio.google.com/embed/reporting/055e6005-5133-498d-8a93-4960dbc60f1b/page/aSIvF',
    link: 'https://datastudio.google.com/reporting/055e6005-5133-498d-8a93-4960dbc60f1b',
  },
  chino: {
    label: 'Chino Regalado',
    src: 'https://datastudio.google.com/embed/reporting/b9b8ec77-cf71-4fe2-a950-c099f02eef72/page/p_du10sayh4d',
    link: 'https://datastudio.google.com/reporting/b9b8ec77-cf71-4fe2-a950-c099f02eef72',
  },
  pacas: {
    label: 'Pacas MX',
    native: true,
  },
};

export default function PortalShell() {
  const [activeView, setActiveView] = useState('global');
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem('sidebarStatus') === 'closed');
  }, []);

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current;
      localStorage.setItem('sidebarStatus', next ? 'closed' : 'open');
      return next;
    });
  }

  const current = views[activeView];

  return (
    <div className="app-shell">
      <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="brand-logo">
            <img src={logo.src} alt="Logo LA" />
          </div>
          <div className="brand-info">
            <strong>BI Center</strong>
          </div>
          <button className="toggle-btn" onClick={toggleSidebar} aria-label="Alternar menú">
            ☰
          </button>
        </div>

        <nav className="sidebar-nav">
          <NavGroup title="MONITOREO DIRECTIVO">
            <NavButton view="global" activeView={activeView} setActiveView={setActiveView} dot="dg" />
            <NavButton view="afluencia" activeView={activeView} setActiveView={setActiveView} dot="af" />
            <NavButton view="larousse_encuestas" activeView={activeView} setActiveView={setActiveView} dot="en" />
          </NavGroup>

          <NavGroup title="DASHBOARDS POR MARCA">
            <NavButton view="larousse" activeView={activeView} setActiveView={setActiveView} dot="lr" />
            <NavButton view="chino" activeView={activeView} setActiveView={setActiveView} dot="cr" />
            <NavButton view="pacas" activeView={activeView} setActiveView={setActiveView} dot="pm" />
          </NavGroup>

          <div className="nav-group">
            <a href="#documentacion" className="nav-link">
              <span className="nav-icon">📄</span>
              <span>Documentación</span>
            </a>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="status-indicator">
            <span className="pulse-icon" />
            <span>Ecosistema Activo</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        {!current.native && (
          <div className="floating-actions">
            <a href={current.link} target="_blank" rel="noreferrer" className="btn-minimal" title="Abrir en Looker Studio">
              ↗
            </a>
          </div>
        )}

        <section className="dashboard-viewport">
          {current.native ? (
            <PacasDashboard />
          ) : (
            <div className="iframe-container">
              <iframe
                key={activeView}
                src={current.src}
                title={current.label}
                allowFullScreen
              />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function NavGroup({ title, children }) {
  return (
    <div className="nav-group">
      <small>{title}</small>
      {children}
    </div>
  );
}

function NavButton({ view, activeView, setActiveView, dot }) {
  return (
    <button
      className={`nav-btn${activeView === view ? ' active' : ''}`}
      onClick={() => setActiveView(view)}
      type="button"
    >
      <span className={`dot ${dot}`} />
      <span>{views[view].label}</span>
    </button>
  );
}
