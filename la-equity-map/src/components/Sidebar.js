import React from 'react';

function Sidebar({ layers, activeLayerIds, onToggleLayer, viewMode }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-title">Layers</h2>
        <p className="sidebar-subtitle">
          Toggle map layers to see overlapping risks.
        </p>
      </div>

      <div className="sidebar-layer-list">
        {layers.map((layer) => {
          const isActive = activeLayerIds.includes(layer.id);
          return (
            <button
              key={layer.id}
              type="button"
              className={`layer-toggle ${isActive ? 'layer-toggle--active' : ''}`}
              onClick={() => onToggleLayer(layer.id)}
              aria-pressed={isActive}
              aria-label={layer.label}
            >
              <span className="layer-toggle-icon" aria-hidden="true">
                {layer.icon}
              </span>

              {viewMode === 'text' && (
                <span className="layer-toggle-text">
                  <span className="layer-toggle-label">{layer.label}</span>
                  <span className="layer-toggle-subtitle">
                    {layer.subtitle}
                  </span>
                </span>
              )}

              <span
                className="layer-toggle-indicator"
                aria-hidden="true"
              >
                <span className="layer-toggle-indicator-knob" />
              </span>
            </button>
          );
        })}
      </div>

      <div className="sidebar-note">
        <div className="sidebar-note-dot" />
        <p>
          This is a visual prototype. Future versions will use live data from
          public and community-driven datasets.
        </p>
      </div>
    </aside>
  );
}

export default Sidebar;
