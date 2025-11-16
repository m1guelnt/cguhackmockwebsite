// src/components/RegionSummary.js
import React from 'react';

const ENV_LAYER_IDS = ['water', 'pm25', 'asthma', 'education', 'poverty', 'hazw'];

function getSeverityLabelFromScore(score0to10) {
  if (score0to10 == null || isNaN(score0to10)) return 'No data';
  if (score0to10 < 3) return 'Low';
  if (score0to10 < 6) return 'Moderate';
  if (score0to10 < 8) return 'High';
  return 'Very High';
}

function getSeverityLabelFromPercentile(pct) {
  if (pct == null || isNaN(pct)) return 'No data';
  if (pct < 25) return 'Low';
  if (pct < 60) return 'Moderate';
  if (pct < 85) return 'High';
  return 'Very High';
}

function severityPillClass(label) {
  switch (label) {
    case 'Very High':
      return 'region-pill region-pill--very-high';
    case 'High':
      return 'region-pill region-pill--high';
    case 'Moderate':
      return 'region-pill region-pill--moderate';
    case 'Low':
      return 'region-pill region-pill--low';
    default:
      return 'region-pill region-pill--no-data';
  }
}

function combinedSubtitle(label) {
  switch (label) {
    case 'Very High':
      return '⚠ High cumulative environmental burden';
    case 'High':
      return 'Elevated environmental burden in this area';
    case 'Moderate':
      return 'Mixed environmental conditions in this area';
    case 'Low':
      return 'Overall low environmental burden in this area';
    default:
      return 'No combined burden data available for this selection';
  }
}

function narrativeFromSummary(combinedLabel, hospitalsInRegion) {
  const hospitalText =
    hospitalsInRegion == null
      ? ''
      : hospitalsInRegion === 0
      ? ' Access to nearby hospitals or clinics may be limited.'
      : hospitalsInRegion <= 3
      ? ` There are ${hospitalsInRegion} hospitals or clinics in this rectangle, which may indicate limited access for some residents.`
      : ` There are ${hospitalsInRegion} hospitals and clinics in this rectangle, which may improve access to care for residents.`;

  switch (combinedLabel) {
    case 'Very High':
      return (
        'This area experiences significant environmental pressures with ' +
        'multiple stressors at high percentiles. Residents may face compounded ' +
        'health risks from air, water, and socio-economic factors.' +
        hospitalText
      );
    case 'High':
      return (
        'This area shows elevated environmental burdens compared with the rest ' +
        'of Los Angeles. Some indicators are high while others are moderate.' +
        hospitalText
      );
    case 'Moderate':
      return (
        'This area has a mix of moderate environmental burdens. Certain ' +
        'indicators may still require attention, but overall risks are not ' +
        'among the highest in the region.' +
        hospitalText
      );
    case 'Low':
      return (
        'This area shows generally low environmental burdens relative to the ' +
        'rest of Los Angeles. Ongoing monitoring can help ensure conditions ' +
        'remain healthy.' +
        hospitalText
      );
    default:
      return (
        'Draw a larger rectangle or enable more data layers to view a ' +
        'summary of environmental conditions for this area.'
      );
  }
}

function RegionSummary({ summary, activeLayerIds, layers }) {
  const activeEnvLayers = layers.filter(
    (l) => ENV_LAYER_IDS.includes(l.id) && activeLayerIds.includes(l.id)
  );

  if (!summary) {
    return (
      <div className="region-summary region-summary--empty">
        <h2 className="region-summary-title">Selected Area</h2>
        <p className="region-summary-empty-text">
          Draw a rectangle on the map to see a quick summary of environmental
          burdens in that area.
        </p>
      </div>
    );
  }

  const { count, averages = {}, combinedScore, hospitalsInRegion } = summary;

  const combinedScore10 = combinedScore != null ? combinedScore * 10 : null;
  const combinedLabel = getSeverityLabelFromScore(combinedScore10);
  const combinedText = combinedSubtitle(combinedLabel);
  const narrative = narrativeFromSummary(combinedLabel, hospitalsInRegion);

  return (
    <div className="region-summary">
      {/* Header */}
      <div className="region-summary-header">
        <h2 className="region-summary-title">Selected Area</h2>
        <div className="region-summary-count">
          <span className="region-summary-count-icon">!</span>
          <span>{count} data points inside this rectangle</span>
        </div>
        {typeof hospitalsInRegion === 'number' && (
          <div className="region-summary-hospitals-line">
            Hospitals &amp; clinics in this area:{' '}
            <span className="region-summary-hospitals-count">
              {hospitalsInRegion}
            </span>
          </div>
        )}
      </div>

      {count === 0 ? (
        <p className="region-summary-empty-text">
          No data points found in this area. Try drawing a larger region or
          enabling more layers.
        </p>
      ) : (
        <>
          {/* Combined burden card */}
          <div className="region-summary-combined-card">
            <p className="region-summary-combined-label">
              Combined Burden Score
            </p>
            <div className="region-summary-combined-main">
              <span className="region-summary-combined-value">
                {combinedScore10 != null ? combinedScore10.toFixed(1) : '—'}
              </span>
              <span className="region-summary-combined-denom">/10</span>
            </div>
            <p className="region-summary-combined-subtitle">{combinedText}</p>
          </div>

          {/* Individual metrics (active environmental layers only) */}
          <div className="region-summary-metric-list">
            {activeEnvLayers.length === 0 ? (
              <p className="region-summary-empty-text">
                Turn on at least one environmental data layer to see metrics
                for this area.
              </p>
            ) : (
              activeEnvLayers.map((layer) => {
                const avg = averages[layer.id];
                const label = getSeverityLabelFromPercentile(avg);
                const pillClass = severityPillClass(label);

                return (
                  <div
                    key={layer.id}
                    className="region-summary-metric-card"
                  >
                    <div className="region-summary-metric-header">
                      <div className="region-summary-metric-icon-wrap">
                        <span className="region-summary-metric-icon">
                          {layer.icon}
                        </span>
                      </div>
                      <div className="region-summary-metric-text">
                        <p className="region-summary-metric-title">
                          {layer.label}
                        </p>
                        <p className="region-summary-metric-subtitle">
                          Average percentile in area
                        </p>
                      </div>
                    </div>

                    <div className="region-summary-metric-footer">
                      {avg != null ? (
                        <div className="region-summary-metric-value-wrap">
                          <span className="region-summary-metric-value">
                            {avg.toFixed(1)}
                          </span>
                          <span className="region-summary-metric-unit">
                            percentile
                          </span>
                        </div>
                      ) : (
                        <span className="region-summary-metric-no-data">
                          Data unavailable
                        </span>
                      )}
                      <span className={pillClass}>{label}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Narrative summary */}
          <div className="region-summary-narrative">
            <p>{narrative}</p>
          </div>

        </>
      )}
    </div>
  );
}

export default RegionSummary;
