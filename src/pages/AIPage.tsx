// pages/AIPage.tsx
import React, { useState } from 'react';

function AIPage() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage = { role: 'user', content: input };

    // 1) Add user message to local state
    setMessages((prev) => [...prev, userMessage]);

    // 2) Example: call your AI API
    const aiResponse = await fetch('/api/ai', {
      method: 'POST',
      body: JSON.stringify(userMessage),
    }).then((res) => res.json());

    const assistantMessage = {
      role: 'assistant',
      content: aiResponse.answer || 'No response',
    };
    setMessages((prev) => [...prev, assistantMessage]);
    setInput('');
  };

  return (
    <div className="container">
      <h1>AI Assistant</h1>
      <div className="chat-box">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <strong>{msg.role}:</strong> {msg.content}
          </div>
        ))}
      </div>
      <div className="chat-input">
        <input
          type="text"
          placeholder="Ask me anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
}

export default AIPage;
