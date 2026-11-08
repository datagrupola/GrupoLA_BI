import logo from '../assets/LA_CLOTHES_Logotipo-04.png';
import LaRousseDashboard from './LaRousseDashboard';

// The portal has one official business view. Keep other business modules
// isolated until their operational capture and data contracts are ready.
export default function PortalShell() {
  return (
    <div className="bi-app">
      <a className="bi-skip-link" href="#dashboard-comercial">
        Ir al dashboard
      </a>
      <header className="bi-appbar">
        <div className="bi-appbar-inner">
          <div className="bi-brand">
            <span className="bi-brand-mark">
              <img src={logo.src} alt="LA Clothes" />
            </span>
            <span className="bi-brand-divider" aria-hidden="true" />
            <span className="bi-brand-copy">
              <small>GRUPO LA</small>
              <strong>Inteligencia comercial</strong>
            </span>
          </div>
          <div className="bi-current-business" aria-label="Unidad de negocio actual: La Rousse">
            <span className="bi-current-dot" aria-hidden="true" />
            <span>La Rousse</span>
          </div>
        </div>
      </header>
      <main id="dashboard-comercial" className="bi-workspace" tabIndex={-1}>
        <LaRousseDashboard />
      </main>
    </div>
  );
}
