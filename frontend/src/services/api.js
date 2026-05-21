const fallbackBaseUrl = 'http://localhost:3000/api/v1';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || fallbackBaseUrl;

async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const method = options.method || 'GET';
  const config = {
    method,
    cache: method === 'GET' ? 'no-store' : 'default',
    headers: {
      'Content-Type': 'application/json',
      ...(method === 'GET' ? {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache'
      } : {}),
      ...options.headers
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  };

  try {
    const response = await fetch(url, config);
    if (response.status === 304) {
      return null;
    }

    const payload = await parseResponse(response);

    if (!response.ok || payload?.success === false) {
      throw normalizeApiError(payload, response.status);
    }

    return payload?.data ?? payload;
  } catch (error) {
    if (error.isApiError) {
      throw error;
    }

    throw {
      isApiError: true,
      status: 0,
      message: `Não foi possível conectar ao backend do PCPowerLab. Verifique se a API está rodando em ${API_BASE_URL}.`,
      errors: []
    };
  }
}

async function parseResponse(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (_error) {
    return {
      success: false,
      message: 'Resposta inesperada do servidor.',
      errors: [text]
    };
  }
}

function normalizeApiError(payload, status) {
  return {
    isApiError: true,
    status,
    message: payload?.message || 'Não foi possível concluir a operação.',
    errors: Array.isArray(payload?.errors) ? payload.errors : []
  };
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  delete: (path) => request(path, { method: 'DELETE' })
};
