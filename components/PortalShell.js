"use client";

import { useState } from "react";

import logo from "../assets/LA_CLOTHES_Logotipo-04.png";
import LaRousseDashboard from "./LaRousseDashboard";
import LaRousseOperationalDashboard from "./LaRousseOperationalDashboard";

// Both dashboards belong to GrupoLA_BI. Transactional screens remain in Ops/Finance.
export default function PortalShell() {
  const [view, setView] = useState("commercial");
  const isCommercial = view === "commercial";
  const mainId = isCommercial ? "dashboard-comercial" : "dashboard-operativo";
  return (
    <div className="bi-app">
      <a className="bi-skip-link" href={"#" + mainId}>Ir al dashboard</a>
      <header className="bi-appbar">
        <div className="bi-appbar-inner">
          <div className="bi-brand">
            <span className="bi-brand-mark"><img src={logo.src} alt="LA Clothes" /></span>
            <span className="bi-brand-divider" aria-hidden="true" />
            <span className="bi-brand-copy">
              <small>GRUPO LA</small>
              <strong>Inteligencia de negocios</strong>
            </span>
          </div>
          <div className="bi-current-business" aria-label="Unidad de negocio actual: La Rousse">
            <span className="bi-current-dot" aria-hidden="true" /><span>La Rousse</span>
          </div>
        </div>
        <nav className="bi-view-nav" aria-label="Dashboards de La Rousse">
          <button type="button" aria-current={isCommercial ? "page" : undefined}
            className={isCommercial ? "bi-view-current" : ""}
            onClick={() => setView("commercial")}>Comercial</button>
          <button type="button" aria-current={!isCommercial ? "page" : undefined}
            className={!isCommercial ? "bi-view-current" : ""}
            onClick={() => setView("operational")}>Operativo</button>
        </nav>
      </header>
      <main id={mainId} className="bi-workspace" tabIndex={-1}>
        {isCommercial ? <LaRousseDashboard /> : <LaRousseOperationalDashboard />}
      </main>
    </div>
  );
}
