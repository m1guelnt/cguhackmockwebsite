// src/components/ChatbotPlaceholder.js
import React, { useState } from 'react';

const initialMessages = [
  {
    id: 1,
    from: 'bot',
    text: "Hi! I'm here to help you understand environmental health in this area.",
  },
];

const SUGGESTED_QUESTIONS = [
  'Why is this area high risk?',
  'How can I stay safe?',
  'What resources are available?',
];

function ChatbotPlaceholder({ selectedBounds }) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const addMessage = (from, text) => {
    setMessages((prev) => [
      ...prev,
      { id: prev.length + 1, from, text },
    ]);
  };

  // --- Core send logic: send text to FastAPI /chat ---
  const sendToBackend = async (userText) => {
    const trimmed = (userText || '').trim();
    if (!trimmed) return;

    // Show user message immediately
    addMessage('user', trimmed);
    setIsLoading(true);
    setInput('');

    try {
      // We only need to send the text. CSV is read server-side.
      const res = await fetch('http://127.0.0.1:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          // bounds is optional – your /chat code doesn't require it,
          // but we include it in case you want to use it later.
          bounds: selectedBounds || null,
        }),
      });

      let data;
      try {
        data = await res.json();
        console.log('Chat response:', data);
      } catch {
        data = null;
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const replyText =
        data && typeof data.reply === 'string'
          ? data.reply
          : 'I received your question, but there was an issue with the server response.';

      // Show bot reply
      addMessage('bot', replyText);
    } catch (err) {
      console.error('Chat error:', err);
      addMessage(
        'bot',
        'Sorry, there was a problem talking to the analysis server. Please make sure FastAPI is running on port 8000.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // --- Handlers for input, enter key, and suggestions ---

  const handleSendClick = () => {
    if (!input.trim() || isLoading) return;
    sendToBackend(input);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!input.trim() || isLoading) return;
      sendToBackend(input);
    }
  };

  const handleSuggestionClick = (question) => {
    // drop the question straight into the flow as if user typed it
    sendToBackend(question);
  };

  const showSuggestions = messages.length === 1;

  return (
    <>
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-icon">✨</div>
        <div className="chat-header-text">
          <div className="chat-header-title">LA Equity Assistant</div>
          <div className="chat-header-subtitle">
            Ask about environmental data
          </div>
        </div>
      </div>

      {/* Messages window */}
      <div className="chat-window-placeholder">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={
              'chat-bubble ' +
              (msg.from === 'user'
                ? 'chat-bubble--user'
                : 'chat-bubble--system')
            }
          >
            {msg.text}
          </div>
        ))}
        {isLoading && (
          <div className="chat-bubble chat-bubble--system chat-bubble--muted">
            Analyzing this area…
          </div>
        )}
      </div>

      {/* Suggested questions */}
      {showSuggestions && (
        <div className="chat-suggestions">
          <div className="chat-suggestions-label">Try asking:</div>
          <div className="chat-suggestions-chips">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                className="chat-suggestion-chip"
                onClick={() => handleSuggestionClick(q)}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Helper text about bounds (optional, but nice UX) */}
      {!selectedBounds && (
        <div className="chat-helper-text chat-helper-text--warning">
          Draw a rectangle on the map to get area-specific answers.
        </div>
      )}

      {/* Input row */}
      <div className="chat-input-row">
        <input
          className="chat-input"
          type="text"
          placeholder={
            selectedBounds
              ? 'Ask anything about this area...'
              : 'Draw a rectangle on the map first…'
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!selectedBounds || isLoading}
        />
        <button
          type="button"
          className="chat-send-btn"
          onClick={handleSendClick}
          disabled={!selectedBounds || !input.trim() || isLoading}
        >
          <span role="img" aria-label="send">
            📨
          </span>
        </button>
      </div>
    </>
  );
}

export default ChatbotPlaceholder;
