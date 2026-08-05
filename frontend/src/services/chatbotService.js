const CHATBOT_API_URL = import.meta.env.VITE_CHATBOT_API_URL?.replace(/\/$/, '');

export const askAdmissionChatbot = async (question, { signal } = {}) => {
  if (!CHATBOT_API_URL) {
    throw new Error('The admission assistant is unavailable.');
  }

  const response = await fetch(`${CHATBOT_API_URL}/api/v1/chat/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ question: question.trim(), top_k: 3 }),
    signal,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.detail || data?.error?.message || 'The admission assistant is unavailable.';
    throw new Error(typeof message === 'string' ? message : 'The admission assistant is unavailable.');
  }
  if (!data.answer) throw new Error('The admission assistant returned an empty response.');
  return data;
};
