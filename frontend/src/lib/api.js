// Pembungkus fetch untuk API Tamafarm (Laravel + Sanctum, token Bearer).
const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
const TOKEN_KEY = 'tamafarm_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t) =>
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY)

export class ApiError extends Error {
  constructor(message, status, errors) {
    super(message)
    this.status = status
    this.errors = errors || {}
  }
}

async function request(path, { method = 'GET', body, form, headers: extraHeaders = {} } = {}) {
  const headers = { ...extraHeaders, Accept: 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let payload
  if (form) {
    payload = form // multipart, biarkan browser mengisi Content-Type
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  let res
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: payload })
  } catch {
    throw new ApiError('Tidak bisa terhubung ke server. Pastikan backend sudah berjalan.', 0)
  }

  let json = null
  try {
    json = await res.json()
  } catch {
    /* respons bukan JSON */
  }

  if (!res.ok) {
    if (json?.code === 'WEBSITE_ACTIVATION_REQUIRED') {
      window.dispatchEvent(new Event('website:locked'))
    }
    if (res.status === 401 && token && path !== '/login') {
      setToken(null)
      window.dispatchEvent(new Event('auth:expired'))
    }
    throw new ApiError(json?.message || `Terjadi kesalahan (${res.status})`, res.status, json?.errors)
  }
  return json
}

export const api = {
  get: (p, options = {}) => request(p, options),
  post: (p, body, options = {}) => request(p, { ...options, method: 'POST', body }),
  put: (p, body) => request(p, { method: 'PUT', body }),
  del: (p) => request(p, { method: 'DELETE' }),
  // Laravel tidak membaca multipart lewat PUT, jadi update dikirim POST + _method=PUT.
  postForm: (p, form) => request(p, { method: 'POST', form }),
}
