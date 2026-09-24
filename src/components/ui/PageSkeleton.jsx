import React from 'react';

const Block = ({ className = '' }) => <div className={`skeleton ${className}`} />;

/** Esqueleto que ocupa el lugar de la página mientras se carga o se cambia de sección. */
export default function PageSkeleton() {
  return (
    <div className="page-skeleton" role="status" aria-live="polite">
      <span className="visually-hidden">Cargando la sección…</span>
      <div className="skeleton-row">
        <Block className="skeleton-hero" />
        <Block className="skeleton-card" />
        <Block className="skeleton-card" />
        <Block className="skeleton-card" />
      </div>
      <Block className="skeleton-strip" />
      <div className="skeleton-panels">
        <Block className="skeleton-panel" />
        <Block className="skeleton-panel skeleton-panel-narrow" />
      </div>
    </div>
  );
}
