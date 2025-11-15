// src/components/Legend.js
import React from 'react';

function Legend({ layers, activeLayerIds }) {
  const activeLayers = layers.filter((l) => activeLayerIds.includes(l.id));

  return (
    <div className="legend">
      <div className="legend-top">
        <div>
          <div className="legend-title">Severity Scale</div>
          <div className="legend-caption">
            Green = lower burden · Dark red = multiple overlapping issues
          </div>
        </div>
        <div className="legend-labels">
          <span>Good</span>
          <span>Severe</span>
        </div>
      </div>

      <div className="legend-bar" aria-hidden="true" />

      <div className="legend-active">
        <div className="legend-active-title">Active layers</div>
        {activeLayers.length === 0 ? (
          <div className="legend-empty">
            Toggle a data layer in the sidebar to see its legend here.
          </div>
        ) : (
          <div className="legend-chip-row">
            {activeLayers.map((layer) => (
              <div key={layer.id} className="legend-chip">
                <span className="legend-chip-icon" aria-hidden="true">
                  {layer.icon}
                </span>
                <div className="legend-chip-text">
                  <span className="legend-chip-label">{layer.label}</span>
                  <span className="legend-chip-subtitle">{layer.subtitle}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Legend;
