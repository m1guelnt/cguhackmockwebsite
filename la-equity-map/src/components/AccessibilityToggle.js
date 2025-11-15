import React from 'react';

function AccessibilityToggle({ viewMode, onChange }) {
  const isText = viewMode === 'text';
  const isImage = viewMode === 'image';

  return (
    <div className="access-toggle" aria-label="Toggle view mode">
      <button
        type="button"
        className={`access-toggle-btn ${isText ? 'access-toggle-btn--active' : ''}`}
        onClick={() => onChange('text')}
        aria-pressed={isText}
      >
        <span aria-hidden="true">Aa</span>
        <span className="access-toggle-hint">Text</span>
      </button>
      <button
        type="button"
        className={`access-toggle-btn ${isImage ? 'access-toggle-btn--active' : ''}`}
        onClick={() => onChange('image')}
        aria-pressed={isImage}
      >
        <span aria-hidden="true">🙂</span>
        <span className="access-toggle-hint">Images</span>
      </button>
    </div>
  );
}

export default AccessibilityToggle;
