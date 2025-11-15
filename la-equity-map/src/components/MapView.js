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

const METRIC_LABELS = {
  water: 'Water Quality (Drinking Water Pctl)',
  pm25: 'PM2.5 Air Pollution',
  asthma: 'Asthma Burden',
  education: 'Low Education',
  poverty: 'Poverty',
  hazw: 'Hazardous Waste',
};

const LA_CENTER = [34.0522, -118.2437];

// ---------- HeatLayer helper using leaflet.heat ----------
function HeatLayer({ points, viewMode }) {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;

    // stronger & always-visible cloud within our zoom range
    const maxOpacity = viewMode === 'image' ? 0.9 : 0.75;

    const heatLayer = L.heatLayer(points, {
      radius: 38,
      blur: 32,
      maxZoom: 17,      // match MapContainer maxZoom
      max: 1,
      minOpacity: 0.4,  // never fully fade out
      maxOpacity,
      gradient: {
        0.0: 'rgba(0, 0, 255, 0.00)',      // Transparent low
        0.1: 'rgba(135, 206, 250, 0.25)',  // Light sky blue
        0.25: 'rgba(173, 216, 230, 0.35)', // Soft blue
        0.4: 'rgba(255, 255, 102, 0.50)',  // Yellow
        0.6: 'rgba(255, 165, 0, 0.60)',    // Orange
        0.8: 'rgba(255, 69, 0, 0.75)',     // Strong orange-red
        1.0: 'rgba(255, 0, 0, 0.95)',      // Deep red
      },
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points, viewMode]);

  return null;
}

// ---------- Convex hull helper ----------
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

// ---------- Main MapView ----------
function MapView({ activeLayerIds, viewMode, onRegionSummaryChange }) {
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

  // ----- Load hospitals from hospitals.csv -----
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
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line.trim()) continue;
          const parts = line.split(',');

          const lat = parseFloat(parts[latIdx]);
          const lng = parseFloat(parts[lngIdx]);
          if (Number.isNaN(lat) || Number.isNaN(lng)) continue;

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

  // ----- Add normalized intensities + combined 0–1 score -----
  const scoredPoints = useMemo(() => {
    const activeMetrics = Object.keys(METRIC_KEYS).filter((id) =>
      activeLayerIds.includes(id)
    );

    if (activeMetrics.length === 0) {
      return rawPoints.map((p) => ({ ...p, score: 0, intensities: {} }));
    }

    return rawPoints.map((p) => {
      const intensities = {};
      let sum = 0;
      let count = 0;

      activeMetrics.forEach((id) => {
        const v = p.values[id] || 0;
        const max = maxValues[id] || 1;
        const intensity = max > 0 ? v / max : 0;
        intensities[id] = intensity;
        sum += intensity;
        count += 1;
      });

      const score = count ? sum / count : 0; // 0–1 combined
      return { ...p, score, intensities };
    });
  }, [rawPoints, activeLayerIds, maxValues]);

  // ----- Heatmap points: [lat, lng, intensity] -----
  const heatPoints = useMemo(
    () =>
      scoredPoints
        .filter((p) => p.score && p.score > 0.02)
        .map((p) => [p.lat, p.lng, p.score]),
    [scoredPoints]
  );

  // ----- Convex hull outline around all environmental points -----
  const hullLatLngs = useMemo(
    () => (rawPoints.length ? computeConvexHullLatLng(rawPoints) : []),
    [rawPoints]
  );

  // ----- Rectangle drawing handlers (for region summary) -----
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
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();

      // extra-safe bounds
      const latMin = Math.min(sw.lat, ne.lat);
      const latMax = Math.max(sw.lat, ne.lat);
      const lngMin = Math.min(sw.lng, ne.lng);
      const lngMax = Math.max(sw.lng, ne.lng);

      const activeMetrics = Object.keys(METRIC_KEYS).filter((id) =>
        activeLayerIds.includes(id)
      );

      const pointsInRegion = scoredPoints.filter((p) => {
        return (
          p.lat >= latMin &&
          p.lat <= latMax &&
          p.lng >= lngMin &&
          p.lng <= lngMax
        );
      });

      const count = pointsInRegion.length;

      const averages = {};
      let combinedIntensitySum = 0;
      let combinedIntensityCount = 0;

      activeMetrics.forEach((id) => {
        let sum = 0;
        let c = 0;
        pointsInRegion.forEach((p) => {
          const v = p.values[id];
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

      // ✅ hospitals ONLY inside the rectangle, using strict >/<
      const hospitalsInRegion = hospitalPoints.filter((h) => {
        return (
          h.lat > latMin &&
          h.lat < latMax &&
          h.lng > lngMin &&
          h.lng < lngMax
        );
      }).length;

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
        maxZoom={17}  // prevent zooming past the useful heat range
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

        {/* HEATMAP CLOUD – smooth gradient */}
        {heatPoints.length > 0 && (
          <HeatLayer points={heatPoints} viewMode={viewMode} />
        )}

        {/* ✅ NO monitoring station dots anymore */}

        {/* Hospitals overlay (toggle-driven) */}
        {activeLayerIds.includes('hospitals') &&
          hospitalPoints.map((h, idx) => (
            <CircleMarker
              key={`hospital-${idx}`}
              center={[h.lat, h.lng]}
              radius={5}
              pathOptions={{
                color: '#0f766e',
                weight: 1.5,
                fillColor: '#a7f3d0',
                fillOpacity: 0.8,
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

      {/* Simple error indicator for hospitals, if needed */}
      {hospitalError && (
        <div className="map-error map-error--overlay">
          {hospitalError}
        </div>
      )}

      {/* Icon-only overlay strip for image mode */}
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


