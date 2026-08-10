
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

const buildUrl = (path, params) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${API_BASE_URL}${cleanPath}`, window.location.origin);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
};

const request = async (path, options = {}) => {
  const token = localStorage.getItem('authToken');
  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(buildUrl(path, options.params), {
    ...options,
    headers,
    body: options.body !== undefined && !(options.body instanceof FormData)
      ? JSON.stringify(options.body)
      : options.body,
  });

  if (response.status === 204) return null;

  const { data, text } = await readResponsePayload(response);

  if (!response.ok) {
    throw new Error(responseMessage(data, text, 'Request failed'));
  }

  return data ?? text;
};

const api = {
  baseURL: API_BASE_URL,
  get: (path, params) => request(path, { method: 'GET', params }),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
  downloadCsv: async (path, filename, params) => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(buildUrl(path, params), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const { data, text } = await readResponsePayload(response);
      throw new Error(responseMessage(data, text, 'Unable to export CSV'));
    }
    const blob = await response.blob();
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
  },
  fileBlob: async (path) => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(buildUrl(path), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const { data, text } = await readResponsePayload(response);
      throw new Error(responseMessage(data, text, 'Unable to access file'));
    }
    return {
      blob: await response.blob(),
      disposition: response.headers.get('content-disposition') || '',
    };
  },
};

export { API_BASE_URL };
export default api;
import { readResponsePayload, responseMessage } from './response';
