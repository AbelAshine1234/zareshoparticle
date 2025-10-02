// Centralized API helper
// - Resolves base URL from env or defaults to '/api' for Vite proxy
// - Injects Authorization: Bearer <token> from localStorage when available
// - Handles JSON requests/responses and error propagation

const DEFAULT_TIMEOUT_MS = 20000

function getBaseUrl() {
  // If you want to force a port (e.g. 3000), set VITE_API_BASE in .env (e.g. http://localhost:3000/api)
  // Otherwise default to '/api' so Vite dev proxy handles it in development
  const envBase = (import.meta?.env?.VITE_API_BASE || '').trim()
  if (envBase) return envBase.replace(/\/$/, '')
  return '/api'
}

function authHeader() {
  const token = localStorage.getItem('token') || ''
  return token ? { authorization: `Bearer ${token}` } : {}
}

async function doFetch(path, { method = 'GET', headers = {}, body, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  const base = getBaseUrl()
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`

  const isJsonBody = body && typeof body === 'object' && !(body instanceof FormData)
  const reqHeaders = {
    ...(isJsonBody ? { 'Content-Type': 'application/json' } : {}),
    ...authHeader(),
    ...headers,
  }

  try {
    const res = await fetch(url, {
      method,
      headers: reqHeaders,
      body: isJsonBody ? JSON.stringify(body) : body,
      signal: controller.signal,
      credentials: 'same-origin',
    })

    const text = await res.text()
    let data
    try { data = text ? JSON.parse(text) : null } catch { data = text }

    if (!res.ok) {
      const message = (data && (data.error || data.message)) || res.statusText || 'Request failed'
      const err = new Error(message)
      err.status = res.status
      err.data = data
      throw err
    }

    return data
  } finally {
    clearTimeout(t)
  }
}

export const api = {
  base: getBaseUrl,
  get: (path, opts) => doFetch(path, { method: 'GET', ...(opts || {}) }),
  post: (path, body, opts) => doFetch(path, { method: 'POST', body, ...(opts || {}) }),
  put: (path, body, opts) => doFetch(path, { method: 'PUT', body, ...(opts || {}) }),
  patch: (path, body, opts) => doFetch(path, { method: 'PATCH', body, ...(opts || {}) }),
  del: (path, opts) => doFetch(path, { method: 'DELETE', ...(opts || {}) }),
}

export default api

