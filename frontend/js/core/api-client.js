/**
 * core/api-client.js — Cliente API v3 unificado para Zafiro POS
 * Maneja tokens, refresh automático, y mapea todos los endpoints
 */

const BASE = '';
const TZ_OFFSET = -(new Date().getTimezoneOffset() / 60);

// ─────────────────────────────────────────────────────────────────
// STORAGE KEYS
// ─────────────────────────────────────────────────────────────────
const KEYS = {
  token:   'zafiro_token',
  refresh: 'zafiro_refresh',
  user:    'zafiro_user',
};

// ─────────────────────────────────────────────────────────────────
// JWT helpers (decode payload sin librería) — para refresh proactivo
// ─────────────────────────────────────────────────────────────────
function decodeJwtPayload(jwt) {
  try {
    const part = jwt.split('.')[1];
    const padded = part + '==='.slice((part.length + 3) % 4);
    const b64 = padded.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(escape(atob(b64))));
  } catch {
    return null;
  }
}

const REFRESH_BUFFER_SEC = 60; // refrescamos si quedan <60s
let _refreshInflight = null;

function tokenExpiresInSec(token) {
  const p = decodeJwtPayload(token);
  if (!p?.exp) return Infinity;
  return Math.floor(p.exp - Date.now() / 1000);
}

async function ensureFreshToken() {
  const token = localStorage.getItem(KEYS.token);
  if (!token) return;
  const left = tokenExpiresInSec(token);
  if (left > REFRESH_BUFFER_SEC) return;
  if (!_refreshInflight) {
    _refreshInflight = tryRefreshToken().finally(() => { _refreshInflight = null; });
  }
  await _refreshInflight;
}

// ─────────────────────────────────────────────────────────────────
// CORE HTTP
// ─────────────────────────────────────────────────────────────────
async function request(method, path, body = null, options = {}) {
  // Refresh proactivo antes de hacer la petición
  if (!options._skipRefresh) await ensureFreshToken();

  const headers = { 'Content-Type': 'application/json', ...options.headers };

  const token = localStorage.getItem(KEYS.token);
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fetchOpts = { method, headers };
  if (body) fetchOpts.body = JSON.stringify(body);

  let resp = await fetch(`${BASE}${path}`, fetchOpts);

  // Auto-refresh si el access token expiró (fallback reactivo)
  if (resp.status === 401 && !options._retried) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${localStorage.getItem(KEYS.token)}`;
      fetchOpts.headers = headers;
      resp = await fetch(`${BASE}${path}`, fetchOpts);
    } else {
      handleLogout();
      throw new Error('Sesión expirada. Inicia sesión nuevamente.');
    }
  }

  if (resp.status === 204) return null;

  const data = await resp.json().catch(() => null);

  if (!resp.ok) {
    const msg = data?.detail || `Error HTTP ${resp.status}`;
    if (resp.status === 401) handleLogout();
    throw new Error(msg);
  }

  return data;
}

// ─────────────────────────────────────────────────────────────────
// TOKEN REFRESH
// ─────────────────────────────────────────────────────────────────
async function tryRefreshToken() {
  const refreshToken = localStorage.getItem(KEYS.refresh);
  if (!refreshToken) return false;

  try {
    const resp = await fetch(`${BASE}/api/v3/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!resp.ok) return false;

    const data = await resp.json();
    localStorage.setItem(KEYS.token, data.access_token);
    localStorage.setItem(KEYS.refresh, data.refresh_token);
    localStorage.setItem(KEYS.user, JSON.stringify(data.usuario));
    return true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────
// SESSION HELPERS
// ─────────────────────────────────────────────────────────────────
function handleLogout() {
  localStorage.removeItem(KEYS.token);
  localStorage.removeItem(KEYS.refresh);
  localStorage.removeItem(KEYS.user);
  window.location.href = '/login.html';
}

function getStoredUser() {
  try {
    const raw = localStorage.getItem(KEYS.user);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function isAuthenticated() {
  return !!localStorage.getItem(KEYS.token);
}

// ─────────────────────────────────────────────────────────────────
// API v3 — TODOS LOS ENDPOINTS
// ─────────────────────────────────────────────────────────────────
const ZafiroAPI = {

  // ── Auth v3 ────────────────────────────────────────────────────
  auth: {
    login: async (email, password) => {
      const resp = await fetch(`${BASE}/api/v3/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || 'Error al iniciar sesión');

      // Guardar sesión
      localStorage.setItem(KEYS.token, data.access_token);
      localStorage.setItem(KEYS.refresh, data.refresh_token);
      localStorage.setItem(KEYS.user, JSON.stringify(data.usuario));
      return data;
    },

    register: async (formData) => {
      const resp = await fetch(`${BASE}/api/v3/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || 'Error al registrar');

      localStorage.setItem(KEYS.token, data.access_token);
      localStorage.setItem(KEYS.refresh, data.refresh_token);
      localStorage.setItem(KEYS.user, JSON.stringify(data.usuario));
      return data;
    },

    loginPin: async (tenant_id, pin) => {
      const resp = await fetch(`${BASE}/api/v3/auth/login-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id, pin }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || 'PIN incorrecto');

      localStorage.setItem(KEYS.token, data.access_token);
      localStorage.setItem(KEYS.refresh, data.refresh_token);
      localStorage.setItem(KEYS.user, JSON.stringify(data.usuario));
      return data;
    },

    me: () => request('GET', '/api/v3/auth/me'),

    logout: () => {
      handleLogout();
    },
  },

  // ── Branding ───────────────────────────────────────────────────
  branding: {
    get:    ()       => request('GET', '/api/v3/branding'),
    update: (data)   => request('PUT', '/api/v3/branding', data),
    public: (tid)    => request('GET', `/api/v3/branding/public/${tid}`),
  },

  // ── Onboarding ─────────────────────────────────────────────────
  onboarding: {
    get:        ()     => request('GET',   '/api/v3/onboarding'),
    marcarPaso: (paso) => request('PATCH', `/api/v3/onboarding/${paso}`),
    skip:       ()     => request('POST',  '/api/v3/onboarding/skip'),
  },

  // ── Usuarios ───────────────────────────────────────────────────
  usuarios: {
    listar:   ()           => request('GET',    '/api/v3/usuarios'),
    crear:    (data)       => request('POST',   '/api/v3/usuarios', data),
    editar:   (id, data)   => request('PUT',    `/api/v3/usuarios/${id}`, data),
    eliminar: (id)         => request('DELETE', `/api/v3/usuarios/${id}`),
  },

  // ── Sucursales ─────────────────────────────────────────────────
  sucursales: {
    listar:   ()           => request('GET',    '/api/sucursales'),
    crear:    (data)       => request('POST',   '/api/sucursales', data),
    editar:   (id, data)   => request('PUT',    `/api/sucursales/${id}`, data),
    eliminar: (id)         => request('DELETE', `/api/sucursales/${id}`),
  },

  // ── Productos ──────────────────────────────────────────────────
  productos: {
    listar:   (sucursal_id) => request('GET',    `/api/productos?sucursal_id=${sucursal_id}`),
    crear:    (data)        => request('POST',   '/api/productos', data),
    editar:   (id, data)    => request('PUT',    `/api/productos/${id}`, data),
    eliminar: (id)          => request('DELETE', `/api/productos/${id}`),
  },

  // ── Categorías ─────────────────────────────────────────────────
  categorias: {
    listar:   (sucursal_id) => request('GET',    `/api/categorias?sucursal_id=${sucursal_id}`),
    crear:    (data)        => request('POST',   '/api/categorias', data),
    editar:   (id, data)    => request('PUT',    `/api/categorias/${id}`, data),
    eliminar: (id)          => request('DELETE', `/api/categorias/${id}`),
  },

  // ── Ventas ─────────────────────────────────────────────────────
  ventas: {
    listar: (sucursal_id, fecha = null) => {
      const qs = new URLSearchParams({ sucursal_id, tz_offset: TZ_OFFSET });
      if (fecha) qs.set('fecha', fecha);
      return request('GET', `/api/ventas?${qs}`);
    },
    registrar: (data)          => request('POST',   '/api/ventas', data),
    editar:    (id, data, pin) => request('PUT',    `/api/ventas/${id}?pin=${encodeURIComponent(pin)}`, data),
    anular:    (id, pin)       => request('DELETE', `/api/ventas/${id}?pin=${encodeURIComponent(pin)}`),
  },

  // ── Órdenes ────────────────────────────────────────────────────
  ordenes: {
    crear: (data) => request('POST', '/api/ordenes', data),
    listar: (sucursal_id, fecha = null) => {
      const qs = new URLSearchParams({ sucursal_id, tz_offset: TZ_OFFSET });
      if (fecha) qs.set('fecha', fecha);
      return request('GET', `/api/ordenes?${qs}`);
    },
    anular: (id, pin) => request('DELETE', `/api/ordenes/${id}?pin=${encodeURIComponent(pin)}`),
  },

  // ── Reportes ───────────────────────────────────────────────────
  reportes: {
    dia: (sucursal_id, fecha = null) => {
      const qs = new URLSearchParams({ sucursal_id, tz_offset: TZ_OFFSET });
      if (fecha) {
        const f = fecha instanceof Date ? fecha.toISOString().split('T')[0] : String(fecha).slice(0, 10);
        qs.set('fecha', f);
      }
      return request('GET', `/api/reportes/dia?${qs}`);
    },
  },

  // ── Admin (super_admin only) ───────────────────────────────────
  admin: {
    tenants:     ()         => request('GET',   '/api/admin/tenants'),
    patchTenant: (id, data) => request('PATCH', `/api/admin/tenants/${id}`, data),
  },

  // ── Health ─────────────────────────────────────────────────────
  health: () => request('GET', '/api/health'),
};

// Exports
export { ZafiroAPI, isAuthenticated, getStoredUser, handleLogout, KEYS };
