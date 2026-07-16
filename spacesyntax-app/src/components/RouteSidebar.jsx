import { useState } from 'react';

function Collapsible({ title, defaultOpen, children }) {
  const [open, setOpen] = useState(defaultOpen !== false);
  return (
    <div className="collapsible">
      <button className="collapsible-header" onClick={() => setOpen(!open)}>
        <span>{title}</span>
        <span className={`collapsible-arrow ${open ? 'open' : ''}`}>▸</span>
      </button>
      {open && <div className="collapsible-body">{children}</div>}
    </div>
  );
}

export default function RouteSidebar({ routeMode, onToggleRouteMode, routeData, routeLoading, onClearRoute }) {
  return (
    <aside className="route-sidebar">
      <h2>Route</h2>

      <button
        className={`route-btn${routeMode ? ' active' : ''}`}
        onClick={onToggleRouteMode}
      >
        {routeMode ? 'Exit Route' : 'Get Route'}
      </button>

      {routeMode && !routeData && !routeLoading && (
        <p className="route-hint">
          Click two points on the map to get route directions.
        </p>
      )}

      {routeLoading && (
        <div className="analysis-loading" style={{ marginTop: 8 }}>
          <div className="loading-spinner-inline" />
          <span>Getting directions...</span>
        </div>
      )}

      {routeData && routeData.error && (
        <p className="route-hint" style={{ color: '#e74c3c' }}>Error: {routeData.error}</p>
      )}

      {routeData && routeData.routes && routeData.routes.length > 0 && (() => {
        const route = routeData.routes[0];
        const leg = route.legs[0];
        return (
          <div className="route-result">
            <div className="route-result-header">
              <div className="route-summary-row">
                <span className="route-dist">{leg.distance.text}</span>
                <span className="route-duration">{leg.duration.text}</span>
              </div>
              <button className="clear-btn" onClick={onClearRoute} title="Clear route">×</button>
            </div>

            <div className="route-via">
              Via {route.summary}
            </div>

            <Collapsible title={`Directions (${leg.steps.length} steps)`} defaultOpen={true}>
              <div className="route-steps">
                {leg.steps.map((step, i) => (
                  <div className="route-step" key={i}>
                    <div className="route-step-num">{i + 1}</div>
                    <div className="route-step-body">
                      <div
                        className="route-step-instruction"
                        dangerouslySetInnerHTML={{ __html: step.instruction }}
                      />
                      <div className="route-step-meta">
                        <span>{step.distance.text}</span>
                        <span className="route-step-dot">&middot;</span>
                        <span>{step.duration.text}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Collapsible>
          </div>
        );
      })()}
    </aside>
  );
}
