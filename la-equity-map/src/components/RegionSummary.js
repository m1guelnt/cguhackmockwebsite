// src/components/RegionSummary.js
import React from 'react';

function getSeverityLabel(score) {
  if (score <= 0) return 'No data';
  if (score < 0.2) return 'Low';
  if (score < 0.45) return 'Moderate';
  if (score < 0.75) return 'High';
  return 'Very high';
}

function RegionSummary({ summary, activeLayerIds, layers }) {
  const activeLayers = layers.filter((l) => activeLayerIds.includes(l.id));
  // Environmental layers only (exclude hospitals from percentile cards)
  const metricLayers = activeLayers.filter((l) => l.id !== 'hospitals');

  if (!summary) {
    return (
      <div className="region-summary region-summary--empty">
        <p>
          Draw a rectangle on the map to see a quick summary of environmental
          burdens in that area.
        </p>
      </div>
    );
  }

  const { count, averages, combinedScore, hospitalsInRegion } = summary;
  const label = getSeverityLabel(combinedScore || 0);
  const hospitalsLayerActive = activeLayerIds.includes('hospitals');


  return (
    <div className="region-summary">
      <div className="region-summary-header">
        <div>
          <h3>Selected area summary</h3>
          <p>{count} data points inside this rectangle.</p>
          {hospitalsLayerActive && typeof hospitalsInRegion === 'number' && (
            <p className="region-summary-hospitals">
              Hospitals &amp; clinics in this area:{' '}
              <strong>{hospitalsInRegion}</strong>
            </p>
          )}
        </div>
        <div
          className={`region-summary-chip region-summary-chip--${label
            .replace(' ', '-')
            .toLowerCase()}`}
        >
          {label}
        </div>
      </div>

      {count === 0 ? (
        <p className="region-summary-empty-text">
          No data points found in this area. Try drawing a larger region.
        </p>
      ) : (
        <>
          <div className="region-summary-metrics">
            {metricLayers.length === 0 ? (
              <p className="region-summary-empty-text">
                Turn on at least one environmental data layer (air, water,
                education, etc.) in the sidebar to see percentile metrics.
                Hospital counts are shown above.
              </p>
            ) : (
              metricLayers.map((layer) => {
                const avg = averages[layer.id];
                return (
                  <div key={layer.id} className="region-summary-metric">
                    <div className="region-summary-metric-label">
                      <span
                        className="region-summary-metric-icon"
                        aria-hidden="true"
                      >
                        {layer.icon}
                      </span>
                      <div>
                        <div className="region-summary-metric-title">
                          {layer.label}
                        </div>
                        <div className="region-summary-metric-subtitle">
                          Average percentile in this area
                        </div>
                      </div>
                    </div>
                    <div className="region-summary-metric-value">
                      {avg != null ? avg.toFixed(1) : '—'}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {combinedScore != null && (
            <p className="region-summary-footer">
              Combined overlapping burden score:{' '}
              <strong>{(combinedScore * 10).toFixed(1)}</strong> / 10
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default RegionSummary;
