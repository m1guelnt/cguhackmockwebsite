// src/components/ChatbotPlaceholder.js
import React, { useState } from 'react';

const initialMessages = [
  {
    id: 1,
    from: 'bot',
    text: "Hi! I'm here to help you understand environmental health in LA.",
  },
];

const SUGGESTED_QUESTIONS = [
  'Why is this area high risk?',
  'How can I stay safe?',
  'What resources are available?',
];

function ChatbotPlaceholder() {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');

  const addBotReply = (text) => {
    setMessages((prev) => [
      ...prev,
      { id: prev.length + 1, from: 'bot', text },
    ]);
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    setMessages((prev) => [
      ...prev,
      { id: prev.length + 1, from: 'user', text: trimmed },
    ]);
    setInput('');

    // Simple placeholder reply
    setTimeout(() => {
      addBotReply(
        'Thanks for your question! A future AI assistant will provide detailed answers here.'
      );
    }, 700);
  };

  const handleSuggestionClick = (question) => {
    setMessages((prev) => [
      ...prev,
      { id: prev.length + 1, from: 'user', text: question },
    ]);
    setTimeout(() => {
      addBotReply('Great question! More insights will appear here soon.');
    }, 700);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
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
      </div>

      {/* Suggested questions (only at start) */}
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

      {/* Input row */}
      <div className="chat-input-row">
        <input
          className="chat-input"
          type="text"
          placeholder="Ask anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className="chat-send-btn"
          onClick={handleSend}
          disabled={!input.trim()}
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
