// src/App.js
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import MapView from './components/MapView';
import Legend from './components/Legend';
import AccessibilityToggle from './components/AccessibilityToggle';
import ChatbotPlaceholder from './components/ChatbotPlaceholder';
import RegionSummary from './components/RegionSummary';
import './App.css';

// ----- Layer definitions (UI + data ids) -----
const LAYERS = [
  {
    id: 'water',
    label: 'Water Quality',
    icon: '💧',
    subtitle: 'Drinking water contamination percentile',
  },
  {
    id: 'pm25',
    label: 'Air: PM2.5',
    icon: '🌫️',
    subtitle: 'Fine particulate matter (percentile)',
  },
  {
    id: 'asthma',
    label: 'Asthma Burden',
    icon: '😮‍💨',
    subtitle: 'Asthma prevalence percentile',
  },
  {
    id: 'education',
    label: 'Education',
    icon: '🎓',
    subtitle: 'Lower education attainment (higher = worse)',
  },
  {
    id: 'poverty',
    label: 'Poverty',
    icon: '💸',
    subtitle: 'Poverty rate (higher = worse)',
  },
  {
    id: 'hazw',
    label: 'Haz. Waste',
    icon: '☣️',
    subtitle: 'Hazardous waste facility percentile',
  },
  { id: 'hospitals', 
    label: 'Hospitals & Clinics', 
    icon: '🏥',
    subtitle: 'Healthcare access',
  },
];

function App() {
  const [activeLayerIds, setActiveLayerIds] = useState(['water', 'pm25']);
  const [viewMode, setViewMode] = useState('text'); // 'text' | 'image'
  const [regionSummary, setRegionSummary] = useState(null);

  const handleToggleLayer = (layerId) => {
    setActiveLayerIds((prev) =>
      prev.includes(layerId)
        ? prev.filter((id) => id !== layerId)
        : [...prev, layerId]
    );
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-left">
          <div className="app-header-logo">
            LA <span>Equity Map</span>
          </div>
          <div className="app-header-tagline">
            Environmental & health data for Los Angeles, designed for everyone.
          </div>
        </div>
      </header>

      <main className="app-main">
        <Sidebar
          layers={LAYERS}
          activeLayerIds={activeLayerIds}
          onToggleLayer={handleToggleLayer}
          viewMode={viewMode}
        />

        <section className="map-section">
          <div className="map-card">
            <div className="map-card-header">
              <div>
                <h1 className="map-page-title">Los Angeles Region</h1>
                <p className="map-page-subtitle">
                  Toggle data layers on the left. Draw a rectangle on the map
                  to surface a quick summary for that area.
                </p>
              </div>
              <AccessibilityToggle viewMode={viewMode} onChange={setViewMode} />
            </div>

            <div className="map-container">
              <MapView
                activeLayerIds={activeLayerIds}
                viewMode={viewMode}
                onRegionSummaryChange={setRegionSummary}
              />
            </div>

            <RegionSummary
              summary={regionSummary}
              activeLayerIds={activeLayerIds}
              layers={LAYERS}
            />

            <Legend layers={LAYERS} activeLayerIds={activeLayerIds} />

            <ChatbotPlaceholder />
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;

