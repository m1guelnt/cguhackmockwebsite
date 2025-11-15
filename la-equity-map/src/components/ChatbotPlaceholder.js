import React from 'react';

function ChatbotPlaceholder() {
  return (
    <div className="chatbot-placeholder">
      <button
        type="button"
        className="chatbot-button"
        disabled
      >
        <span className="chatbot-icon" aria-hidden="true">
          💬
        </span>
        <span className="chatbot-text">
          Ask us anything (chatbot coming soon)
        </span>
      </button>
      <p className="chatbot-caption">
        In a future version, an AI assistant will help explain maps, suggest
        safer routes, and answer questions in multiple languages.
      </p>
    </div>
  );
}

export default ChatbotPlaceholder;
