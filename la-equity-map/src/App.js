// src/App.js
import React, { useState } from 'react';
import './App.css';
import MapView from './components/MapView';
import RegionSummary from './components/RegionSummary';
import TopBar from './components/TopBar';
import ChatbotPlaceholder from './components/ChatbotPlaceholder';

const LAYERS = [
  { id: 'water', label: 'Water Quality', icon: '💧' },
  { id: 'pm25', label: 'PM2.5 Air Pollution', icon: '🌫️' },
  { id: 'asthma', label: 'Asthma Burden', icon: '😮‍💨' },
  { id: 'education', label: 'Low Education', icon: '🎓' },
  { id: 'poverty', label: 'Poverty', icon: '💸' },
  { id: 'hazw', label: 'Hazardous Waste', icon: '☣️' },
  { id: 'hospitals', label: 'Hospitals & Clinics', icon: '🏥' },
];

function App() {
  const [activeLayerIds, setActiveLayerIds] = useState(['water']);
  const [viewMode, setViewMode] = useState('text'); // 'text' | 'image'
  const [regionSummary, setRegionSummary] = useState(null);

  const handleToggleLayer = (layerId) => {
    setActiveLayerIds((prev) =>
      prev.includes(layerId)
        ? prev.filter((id) => id !== layerId)
        : [...prev, layerId]
    );
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };

  const handleRegionSummaryChange = (summary) => {
    setRegionSummary(summary);
  };

  return (
    <div className="app-shell">
      <main className="main-layout">
        {/* LEFT COLUMN: Map card + Chat card (stacked) */}
        <div className="main-left">
          {/* Map card */}
          <section className="map-card">
            <div className="map-card-header">
              <div>
                <h1 className="map-title">Los Angeles Region</h1>
                <p className="map-subtitle">
                  Toggle data layers below. Draw a rectangle on the map to
                  surface a quick summary for that area.
                </p>
              </div>
            </div>

            {/* Inline top bar (your layer toggles + view mode) */}
            <TopBar
              layers={LAYERS}
              activeLayerIds={activeLayerIds}
              onToggleLayer={handleToggleLayer}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
            />

            <div className="map-card-body">
              <MapView
                activeLayerIds={activeLayerIds}
                viewMode={viewMode}
                onRegionSummaryChange={handleRegionSummaryChange}
              />
            </div>
          </section>

          {/* Chat card – now directly under the map, full width of left column */}
          <section className="chat-card">
            <ChatbotPlaceholder />
          </section>
        </div>

        {/* RIGHT COLUMN: previously chat; now Selected Area summary */}
        <aside className="chat-column">
          <section className="bottom-panel">
            <RegionSummary
              summary={regionSummary}
              activeLayerIds={activeLayerIds}
              layers={LAYERS}
            />
          </section>
        </aside>
      </main>
    </div>
  );
}

export default App;
