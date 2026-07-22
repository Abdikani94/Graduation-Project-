const API_BASE_URL = 'http://localhost:5000/api';

const buildUrl = (path, params) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${API_BASE_URL}${cleanPath}`);
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

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = data?.error?.message || data?.message || 'Request failed';
    throw new Error(message);
  }

  return data;
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
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.error?.message || 'Unable to export CSV');
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
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.error?.message || 'Unable to access file');
    }
    return {
      blob: await response.blob(),
      disposition: response.headers.get('content-disposition') || '',
    };
  },
};

export { API_BASE_URL };
export default api;
