export const readResponsePayload = async (response) => {
  const text = await response.text();

  if (!text) return { data: null, text: '' };

  try {
    return { data: JSON.parse(text), text };
  } catch {
    return { data: null, text };
  }
};

export const responseMessage = (data, text, fallback) => {
  const message = data?.error?.message || data?.message;
  if (typeof message === 'string' && message.trim()) return message;

  // Render server text as plain React text and cap it to keep error toasts usable.
  return text.trim().slice(0, 1000) || fallback;
};
