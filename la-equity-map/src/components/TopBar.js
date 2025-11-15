// src/components/TopBar.js
import React from 'react';


function TopBar({ layers, activeLayerIds, onToggleLayer }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="brand-icon" aria-hidden="true">
          <span className="brand-icon-pin">📍</span>
        </div>
        <div className="brand-text">
          <div className="brand-title">LA Equity Map</div>
          <div className="brand-subtitle">Environmental &amp; Health Data</div>
        </div>
      </div>

      <div className="topbar-layers">
        {layers.map((layer) => {
          const active = activeLayerIds.includes(layer.id);
          return (
            <button
              key={layer.id}
              type="button"
              className={`topbar-layer-btn ${
                active ? 'topbar-layer-btn--active' : ''
              }`}
              onClick={() => onToggleLayer(layer.id)}
            >
              <span className="topbar-layer-icon" aria-hidden="true">
                {layer.icon}
              </span>
              <span className="topbar-layer-label">{layer.label}</span>
              <span className="topbar-layer-toggle-pill">
                {active ? 'On' : 'Off'}
              </span>
            </button>
          );
        })}
      </div>
    </header>
  );
}

export default TopBar;
