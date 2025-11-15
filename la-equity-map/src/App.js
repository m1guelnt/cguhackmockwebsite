// src/App.js
import React, { useState } from 'react';
import './App.css';

import MapView from './components/MapView';
import RegionSummary from './components/RegionSummary';
import TopBar from './components/TopBar';

// Central list of layers used by TopBar + RegionSummary
export const LAYERS = [
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

  const handleToggleLayer = (id) => {
    setActiveLayerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };

  return (
    <div className="app-shell">
      {/* MAIN CONTENT: map (80%) + chat (20%) */}
      <main className="main-layout">
        <section className="main-left">
          {/* Map card */}
          <div className="map-card">
            <div className="map-card-header">
              <div>
                <h2 className="map-title">Los Angeles Region</h2>
                <p className="map-subtitle">
                  Toggle data layers below. Draw a rectangle on the map
                  to surface a quick summary for that area.
                </p>
              </div>
              <div className="view-toggle">
                <button
                  type="button"
                  className={`view-toggle-btn ${
                    viewMode === 'text' ? 'view-toggle-btn--active' : ''
                  }`}
                  onClick={() => handleViewModeChange('text')}
                >
                  Aa Text
                </button>
                <button
                  type="button"
                  className={`view-toggle-btn ${
                    viewMode === 'image' ? 'view-toggle-btn--active' : ''
                  }`}
                  onClick={() => handleViewModeChange('image')}
                >
                  😊 Images
                </button>
              </div>
            </div>

            {/* 🔽 INLINE TOPBAR: layers row ABOVE the map */}
            <TopBar
              layers={LAYERS}
              activeLayerIds={activeLayerIds}
              onToggleLayer={handleToggleLayer}
            />

            {/* Map takes full height of this card */}
            <div className="map-card-body">
              <MapView
                activeLayerIds={activeLayerIds}
                viewMode={viewMode}
                onRegionSummaryChange={setRegionSummary}
              />
            </div>
          </div>

          {/* Bottom panel under the map (legend + summary) */}
          <div className="bottom-panel">
            <RegionSummary
              summary={regionSummary}
              activeLayerIds={activeLayerIds}
              layers={LAYERS}
            />
          </div>
        </section>

        {/* CHAT PLACEHOLDER COLUMN (20%) */}
        <aside className="chat-column">
          <div className="chat-card">
            <h3 className="chat-title">Community Chat (coming soon)</h3>
            <p className="chat-subtitle">
              In the future, this space will host an AI assistant that can help
              explain local environmental burdens, answer questions about
              neighborhoods, and suggest safer routes.
            </p>

            <div className="chat-window-placeholder">
              <div className="chat-bubble chat-bubble--system">
                👋 Hi! I’m your LA Equity Map assistant. Chat will be available
                in a future version of this prototype.
              </div>
              <div className="chat-bubble chat-bubble--user">
                When is it safe to go for a run near Echo Park?
              </div>
              <div className="chat-bubble chat-bubble--system chat-bubble--muted">
                (Future answer will combine air quality, noise, and traffic
                layers.)
              </div>
            </div>

            <div className="chat-input-row">
              <input
                className="chat-input"
                type="text"
                placeholder="Type a message… (disabled in mock UI)"
                disabled
              />
              <button className="chat-send-btn" type="button" disabled>
                Send
              </button>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default App;


