// src/components/MapView.js
import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
  FeatureGroup,
  useMap,
  Polygon,
} from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import L from 'leaflet';
import 'leaflet.heat';

// Map CSV columns to our layer ids (water_data.csv)
const METRIC_KEYS = {
  water: 'Drinking Water Pctl',
  pm25: 'PM2.5 Pctl',
  asthma: 'Asthma Pctl',
  education: 'Education',
  poverty: 'Poverty',
  hazw: 'Haz. Waste Pctl',
};

export const METRIC_LABELS = {
  water: 'Water Quality (Drinking Water Pctl)',
  pm25: 'PM2.5 Air Pollution',
  asthma: 'Asthma Burden',
  education: 'Low Education',
  poverty: 'Poverty',
  hazw: 'Hazardous Waste',
};

const LA_CENTER = [34.0522, -118.2437];

/**
 * Helper to linearly interpolate between two numbers.
 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Given t in [0, 1], return a green→yellow→orange→red color as hex.
 *
 * 0   → deep green (good)
 * ~0.3→ lighter green
 * ~0.5→ yellow
 * ~0.75→ orange
 * 1   → red (bad)
 */
function getColorForIntensity(t) {
  if (Number.isNaN(t) || t <= 0) {
    t = 0;
  }
  if (t > 1) t = 1;

  let r, g, b;

  if (t <= 0.33) {
    // green (#22c55e) to yellow (#eab308)
    const local = t / 0.33;
    const start = { r: 34, g: 197, b: 94 };
    const end = { r: 234, g: 179, b: 8 };
    r = Math.round(lerp(start.r, end.r, local));
    g = Math.round(lerp(start.g, end.g, local));
    b = Math.round(lerp(start.b, end.b, local));
  } else if (t <= 0.66) {
    // yellow (#eab308) to orange (#f97316)
    const local = (t - 0.33) / 0.33;
    const start = { r: 234, g: 179, b: 8 };
    const end = { r: 249, g: 115, b: 22 };
    r = Math.round(lerp(start.r, end.r, local));
    g = Math.round(lerp(start.g, end.g, local));
    b = Math.round(lerp(start.b, end.b, local));
  } else {
    // orange (#f97316) to red (#b91c1c)
    const local = (t - 0.66) / 0.34;
    const start = { r: 249, g: 115, b: 22 };
    const end = { r: 185, g: 28, b: 28 };
    r = Math.round(lerp(start.r, end.r, local));
    g = Math.round(lerp(start.g, end.g, local));
    b = Math.round(lerp(start.b, end.b, local));
  }

  const toHex = (x) => x.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Convex hull helper for outlining the data region.
 */
function computeConvexHullLatLng(rawPoints) {
  if (!rawPoints || rawPoints.length < 3) {
    return rawPoints.map((p) => [p.lat, p.lng]);
  }

  const pts = rawPoints.map((p) => ({
    x: p.lng,
    y: p.lat,
  }));

  pts.sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));

  const cross = (o, a, b) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lower = [];
  for (const p of pts) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    ) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    ) {
      upper.pop();
    }
    upper.push(p);
  }

  const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
  return hull.map((p) => [p.y, p.x]);
}

/**
 * Simple haversine distance (in kilometers) for hospital proximity.
 */
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Hospital access heat layer
 * Green = close to a hospital (good)
 * Red   = far from any hospital (bad)
 */
const HOSPITAL_HEAT_OPTIONS = {
  radius: 40,
  blur: 80,
  minOpacity: 0.35,
  gradient: {
    0.0: 'rgba(34, 197, 94, 1.0)', // green
    0.25: 'rgba(190, 242, 100, 1.0)', // light green
    0.5: 'rgba(234, 179, 8, 1.0)', // yellow
    0.75: 'rgba(249, 115, 22, 1.0)', // orange
    1.0: 'rgba(220, 38, 38, 1.0)', // red
  },
};

function HospitalHeatLayer({ points, viewMode }) {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;

    const heatLayer = L.heatLayer(points, {
      ...HOSPITAL_HEAT_OPTIONS,
      maxZoom: 13,
      maxOpacity: viewMode === 'image' ? 0.9 : 0.85,
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points, viewMode]);

  return null;
}

function MapView({
  activeLayerIds,
  viewMode,
  onRegionSummaryChange,
  onBoundsChange, // <-- NEW PROP
}) {
  const [rawPoints, setRawPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [hospitalPoints, setHospitalPoints] = useState([]);
  const [hospitalError, setHospitalError] = useState('');

  const drawGroupRef = useRef(null);

  // ----- Load environmental data from water_data.csv -----
  useEffect(() => {
    let cancelled = false;

    async function loadCsv() {
      try {
        const res = await fetch('/water_data.csv');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();

        const lines = text.trim().split(/\r?\n/);
        if (lines.length < 2) throw new Error('CSV appears empty');

        const headers = lines[0].split(',');
        const idx = (name) => headers.indexOf(name);

        const latIdx = idx('Latitude');
        const lonIdx = idx('Longitude');
        const countyIdx = idx('California County');

        const metricIndices = {};
        Object.entries(METRIC_KEYS).forEach(([id, csvKey]) => {
          metricIndices[id] = idx(csvKey);
        });

        const points = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line.trim()) continue;
          const parts = line.split(',');
          if (parts.length !== headers.length) continue;

          const county = parts[countyIdx];
          if (county !== 'Los Angeles') continue;

          const lat = parseFloat(parts[latIdx]);
          const lng = parseFloat(parts[lonIdx]);
          if (Number.isNaN(lat) || Number.isNaN(lng)) continue;

          const values = {};
          for (const id of Object.keys(METRIC_KEYS)) {
            const v = parseFloat(parts[metricIndices[id]]);
            values[id] = Number.isNaN(v) ? 0 : v;
          }

          points.push({ lat, lng, values });
        }

        if (!cancelled) {
          setRawPoints(points);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError('Failed to load water_data.csv');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCsv();
    return () => {
      cancelled = true;
    };
  }, []);

  // ----- Load hospitals from hospitals.csv (dedup by location) -----
  useEffect(() => {
    let cancelled = false;

    async function loadHospitals() {
      try {
        const res = await fetch('/hospitals.csv');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();

        const lines = text.trim().split(/\r?\n/);
        if (lines.length < 2) throw new Error('Hospitals CSV appears empty');

        const headers = lines[0].split(',');
        const idx = (name) => headers.indexOf(name);

        const latIdx = idx('lat');
        const lngIdx = idx('lng');
        const nameIdx = idx('Facility Name');
        const cityIdx = idx('City/Town');

        const hospitals = [];
        const seen = new Set();

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line.trim()) continue;
          const parts = line.split(',');

          const lat = parseFloat(parts[latIdx]);
          const lng = parseFloat(parts[lngIdx]);
          if (Number.isNaN(lat) || Number.isNaN(lng)) continue;

          const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
          if (seen.has(key)) continue;
          seen.add(key);

          hospitals.push({
            lat,
            lng,
            name: nameIdx >= 0 ? parts[nameIdx] : 'Hospital',
            city: cityIdx >= 0 ? parts[cityIdx] : '',
          });
        }

        if (!cancelled) {
          setHospitalPoints(hospitals);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setHospitalError('Failed to load hospitals.csv');
        }
      }
    }

    loadHospitals();
    return () => {
      cancelled = true;
    };
  }, []);

  // ----- Per-metric max values (for normalization) -----
  const maxValues = useMemo(() => {
    const max = {};
    Object.keys(METRIC_KEYS).forEach((id) => {
      max[id] = 0;
    });

    rawPoints.forEach((p) => {
      Object.keys(METRIC_KEYS).forEach((id) => {
        const v = p.values[id] || 0;
        if (v > max[id]) max[id] = v;
      });
    });

    return max;
  }, [rawPoints]);

  /**
   * For each point:
   *  - normalize each metric to [0,1] ⇒ intensities[id]
   *  - compute combinedScore = average intensity across *active* layers,
   *    for the summary chip; visualization is per-layer circles.
   */
  const scoredPoints = useMemo(() => {
    const metrics = Object.keys(METRIC_KEYS);

    return rawPoints.map((p) => {
      const intensities = {};
      let sumActive = 0;
      let countActive = 0;

      metrics.forEach((id) => {
        const v = p.values[id] || 0;
        const max = maxValues[id] || 1;
        const intensity = max > 0 ? v / max : 0; // 0–1

        intensities[id] = intensity;

        if (activeLayerIds.includes(id)) {
          sumActive += intensity;
          countActive += 1;
        }
      });

      const combinedScore = countActive ? sumActive / countActive : 0; // 0–1

      return { ...p, intensities, combinedScore };
    });
  }, [rawPoints, maxValues, activeLayerIds]);

  // ----- Hospital access heat points (distance to nearest hospital) -----
  const hospitalHeatPoints = useMemo(() => {
    if (!hospitalPoints.length || !rawPoints.length) return [];

    // Compute min distance to any hospital for each environmental point
    const distances = rawPoints.map((p) => {
      let minKm = Infinity;
      hospitalPoints.forEach((h) => {
        const d = haversineKm(p.lat, p.lng, h.lat, h.lng);
        if (d < minKm) minKm = d;
      });
      return minKm;
    });

    const maxDist = Math.max(...distances.filter((d) => Number.isFinite(d))) || 1;

    // Normalize distances to [0,1]: 0 = close (good), 1 = far (bad)
    return rawPoints.map((p, idx) => {
      const d = distances[idx];
      const t = maxDist > 0 ? d / maxDist : 0;
      return [p.lat, p.lng, t];
    });
  }, [hospitalPoints, rawPoints]);

  // ----- Convex hull outline around all environmental points -----
  const hullLatLngs = useMemo(
    () => (rawPoints.length ? computeConvexHullLatLng(rawPoints) : []),
    [rawPoints]
  );

  // ----- Rectangle drawing handlers (for region summary + bounds) -----
  const handleDrawCreated = (e) => {
    const layer = e.layer;

    // keep only most recent rectangle
    if (drawGroupRef.current) {
      const fg = drawGroupRef.current;
      fg.eachLayer((l) => {
        if (l !== layer) {
          fg.removeLayer(l);
        }
      });
    }

    if (layer instanceof L.Rectangle) {
      const bounds = layer.getBounds();

      // === NEW: compute lat/lng extents & send to parent + backend ===
      const latMin = bounds.getSouth();
      const latMax = bounds.getNorth();
      const lngMin = bounds.getWest();
      const lngMax = bounds.getEast();

      const boundsPayload = {
        north: latMax,
        south: latMin,
        east: lngMax,
        west: lngMin,
      };

      // Notify React so the chatbot can use these bounds
      if (onBoundsChange) {
        onBoundsChange(boundsPayload);
      }

      // Send to FastAPI backend
      fetch('http://127.0.0.1:8000/save-bounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(boundsPayload),
      })
        .then((r) => r.json())
        .then((d) => console.log('Saved bounds:', d))
        .catch((err) => console.error('Error saving bounds:', err));
      // === END NEW CODE ===

      const activeMetrics = Object.keys(METRIC_KEYS).filter((id) =>
        activeLayerIds.includes(id)
      );

      const pointsInRegion = scoredPoints.filter((p) =>
        bounds.contains(L.latLng(p.lat, p.lng))
      );

      const count = pointsInRegion.length;

      const averages = {};
      let combinedIntensitySum = 0;
      let combinedIntensityCount = 0;

      activeMetrics.forEach((id) => {
        let sum = 0;
        let c = 0;

        pointsInRegion.forEach((p) => {
          const v = p.values?.[id];
          if (v != null) {
            sum += v;
            c += 1;
          }
        });

        averages[id] = c ? sum / c : null;

        pointsInRegion.forEach((p) => {
          const intensity = p.intensities?.[id] ?? 0;
          combinedIntensitySum += intensity;
          combinedIntensityCount += 1;
        });
      });

      const combinedScore =
        combinedIntensityCount > 0
          ? combinedIntensitySum / combinedIntensityCount
          : 0;

      const hospitalsInRegion = hospitalPoints.filter((h) =>
        bounds.contains(L.latLng(h.lat, h.lng))
      ).length;

      if (onRegionSummaryChange) {
        onRegionSummaryChange({
          count,
          averages,
          combinedScore,
          hospitalsInRegion,
        });
      }
    }
  };

  const handleDrawDeleted = () => {
    if (onRegionSummaryChange) {
      onRegionSummaryChange(null);
    }
    // also clear bounds when rectangle is removed
    if (onBoundsChange) {
      onBoundsChange(null);
    }
  };

  if (loading) {
    return (
      <div className="map-loading">
        Loading Los Angeles environmental data…
      </div>
    );
  }

  if (error) {
    return <div className="map-error">{error}</div>;
  }

  return (
    <div className="map-leaflet-wrapper">
      <MapContainer
        center={LA_CENTER}
        zoom={10}
        minZoom={8}
        maxZoom={14}
        scrollWheelZoom
        className="map-leaflet-container"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Rectangle drawing controls */}
        <FeatureGroup ref={drawGroupRef}>
          <EditControl
            position="topleft"
            onCreated={handleDrawCreated}
            onDeleted={handleDrawDeleted}
            draw={{
              polygon: false,
              polyline: false,
              circle: false,
              circlemarker: false,
              marker: false,
              rectangle: true,
            }}
            edit={{
              edit: false,
              remove: true,
            }}
          />
        </FeatureGroup>

        {/* Semi-solid border outlining environmental data extent */}
        {hullLatLngs.length >= 3 && (
          <Polygon
            positions={hullLatLngs}
            pathOptions={{
              color: 'rgba(37, 99, 235, 0.9)',
              weight: 2.5,
              dashArray: '6 4',
              fillColor: 'rgba(191, 219, 254, 0.35)',
              fillOpacity: 0.1,
            }}
          />
        )}

        {/* ✅ Hospital access heatmap (green = close, red = far) */}
        {activeLayerIds.includes('hospitals') &&
          hospitalHeatPoints.length > 0 && (
            <HospitalHeatLayer
              points={hospitalHeatPoints}
              viewMode={viewMode}
            />
          )}

        {/* ✅ PER-LAYER TRANSPARENT CIRCLES (softened colors) */}
        {activeLayerIds
          .filter((id) => METRIC_KEYS[id]) // only metric layers, not hospitals
          .map((layerId) =>
            scoredPoints.map((p, idx) => {
              const base = p.intensities?.[layerId] ?? 0;
              if (base <= 0) return null;

              // Slight boost so mid values still show nicely
              const intensity = Math.sqrt(base); // 0–1
              const color = getColorForIntensity(intensity);

              return (
                <CircleMarker
                  key={`${layerId}-${idx}`}
                  center={[p.lat, p.lng]}
                  radius={9} // slightly smaller
                  pathOptions={{
                    color, // stroke color
                    opacity: 0.45, // softer stroke
                    weight: 1.1, // stroke width
                    fillColor: color,
                    fillOpacity:
                      viewMode === 'image'
                        ? 0.22
                        : 0.18, // softer fill
                  }}
                >
                  {viewMode === 'text' && (
                    <Tooltip direction="top" offset={[0, -4]}>
                      <div style={{ fontSize: '0.75rem' }}>
                        <strong>{METRIC_LABELS[layerId]}</strong>
                        <br />
                        Relative intensity:{' '}
                        {(intensity * 100).toFixed(0)}%
                      </div>
                    </Tooltip>
                  )}
                </CircleMarker>
              );
            })
          )}

        {/* Hospitals overlay – white markers with blue outline */}
        {activeLayerIds.includes('hospitals') &&
          hospitalPoints.map((h, idx) => (
            <CircleMarker
              key={`hospital-${idx}`}
              center={[h.lat, h.lng]}
              radius={6}
              pathOptions={{
                color: '#0ea5e9', // blue outline
                weight: 2.2,
                fillColor: '#ffffff', // white fill
                fillOpacity: 0.95,
              }}
            >
              {viewMode === 'text' && (
                <Tooltip direction="top" offset={[0, -4]}>
                  <div style={{ fontSize: '0.8rem' }}>
                    <strong>{h.name}</strong>
                    <br />
                    {h.city}
                  </div>
                </Tooltip>
              )}
            </CircleMarker>
          ))}
      </MapContainer>

      {hospitalError && (
        <div className="map-error map-error--overlay">
          {hospitalError}
        </div>
      )}

      {viewMode === 'image' && (
        <div className="map-image-overlay" aria-hidden="true">
          <div className="map-image-pill">
            <span>💧</span>
            <span>🌫️</span>
            <span>😮‍💨</span>
            <span>🎓</span>
            <span>💸</span>
            <span>☣️</span>
            <span>🏥</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default MapView;
