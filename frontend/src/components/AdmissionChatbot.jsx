import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Send, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { askAdmissionChatbot } from '../services/chatbotService';
import logo from '../images/logo.jpg';

const welcomeMessage = {
  id: 'welcome',
  role: 'assistant',
  text: '👋 Welcome to the JUST Admission Assistant. Ask me anything about admission.',
};

export default function AdmissionChatbot() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([welcomeMessage]);
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!['/', '/apply'].includes(location.pathname)) return null;

  const sendQuestion = async (event) => {
    event?.preventDefault();
    const value = question.trim();
    if (!value || isLoading) return;

    setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'user', text: value }]);
    setQuestion('');
    setIsLoading(true);
    const [requestResult] = await Promise.allSettled([
      askAdmissionChatbot(value),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);

    try {
      if (requestResult.status === 'rejected') throw requestResult.reason;
      const result = requestResult.value;
      setMessages((current) => [...current, {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: result.answer,
        tag: result.context_found ? 'JUST Admission' : 'Admission Office',
      }]);
    } catch {
      setMessages((current) => [...current, {
        id: crypto.randomUUID(),
        role: 'error',
        text: 'The chatbot is currently unavailable. Please try again.',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const restart = () => {
    setMessages([welcomeMessage]);
    setQuestion('');
  };

  return (
    <div className="admission-chatbot-widget">
      {isOpen && (
        <section className="admission-chatbot-panel" aria-label="JUST Admission Assistant">
          <header>
            <span className="admission-chatbot-avatar"><img src={logo} alt="Jamhuriya University logo" /></span>
            <div><strong>Admission Assistant</strong><small>JUST online support</small></div>
            <button type="button" onClick={restart} aria-label="Restart conversation"><RotateCcw size={17} /></button>
            <button type="button" onClick={() => setIsOpen(false)} aria-label="Close assistant"><X size={19} /></button>
          </header>
          <div className="admission-chatbot-messages" aria-live="polite">
            {messages.map((message) => (
              <div className={`admission-chat-message ${message.role}`} key={message.id}>
                <p>{message.text}</p>
                {message.tag && <small>{message.tag}</small>}
              </div>
            ))}
            {isLoading && <div className="admission-chat-message assistant typing">Chatbot is thinking…</div>}
            <div ref={endRef} />
          </div>
          <form className="admission-chatbot-form" onSubmit={sendQuestion}>
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              disabled={isLoading}
              maxLength={500}
              placeholder="Type your question..."
              aria-label="Admission question"
            />
            <button disabled={isLoading || !question.trim()} type="submit" aria-label="Send question"><Send size={18} /></button>
          </form>
        </section>
      )}
      <button
        className="admission-chatbot-toggle"
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={isOpen ? 'Close admission assistant' : 'Open admission assistant'}
      >
        {isOpen ? <X size={23} /> : <img src={logo} alt="Jamhuriya University logo" />}
      </button>
    </div>
  );
}
