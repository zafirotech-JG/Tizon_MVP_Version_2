/**
 * core/app-shell.js — Sistema de Layout y Routing por Rol
 * Mobile-First SPA con lazy-loading de vistas.
 */
import { handleLogout as apiLogout, ZafiroAPI } from './api-client.js';
import { toast, getInitials, confirm as confirmDialog } from './ui.js';
import { autoMountComboboxes } from './combobox.js';
import { initOnboarding, openChecklist } from './onboarding.js';
import { startMiniTutorial } from './tutorial-manager.js';

// Estado global de la aplicación
const AppState = {
  user: null,
  tenant: null,
  branding: null,
  currentView: null,
  currentSucursalId: null,
  sucursales: [],
  sidebarCollapsed: false,
  isOnline: navigator.onLine,
};

// Registro de vistas (lazy-loaded)
const VIEWS = {
  dashboard: {
    label: 'Dashboard',
    icon: 'ph-squares-four',
    roles: ['owner', 'manager', 'super_admin'],
    loader: () => import('../views/dashboard.js'),
    mount: (mod, opts) => mod.mountDashboard(opts),
    needsSucursal: true,
  },
  pos: {
    label: 'Vender',
    icon: 'ph-shopping-cart',
    roles: ['owner', 'manager', 'cajero'],
    loader: () => import('../views/pos.js'),
    mount: (mod, opts) => mod.mountPOS(opts),
    needsSucursal: true,
  },
  inventario: {
    label: 'Inventario',
    icon: 'ph-package',
    roles: ['owner', 'manager', 'inventario'],
    loader: () => import('../views/inventario.js'),
    mount: (mod, opts) => mod.mountInventario(opts),
    needsSucursal: true,
  },
  usuarios: {
    label: 'Equipo',
    icon: 'ph-users',
    roles: ['owner', 'manager'],
    loader: () => import('../views/usuarios.js'),
    mount: (mod, opts) => mod.mountUsuarios(opts),
    needsSucursal: false,
  },
  config: {
    label: 'Ajustes',
    icon: 'ph-gear',
    roles: ['owner', 'manager'],
    loader: () => import('../views/config.js'),
    mount: (mod, opts) => mod.mountConfig(opts),
    needsSucursal: false,
  },
};

// ─────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────
export async function initAppShell(config) {
  AppState.user = config.user;
  AppState.tenant = config.tenant;
  AppState.branding = config.branding;

  // Cargar sucursales disponibles antes de renderizar
  await loadSucursales();

  renderLayout();
  setupEventListeners();
  setupHashRouter();

  // Auto-mount de comboboxes en el shell (sidebar sucursal selector)
  autoMountComboboxes(document.getElementById('app'));

  // Primera navegación
  const initialRoute = window.location.hash.slice(1) || defaultRoute();
  navigateTo(initialRoute);

  // Inicializar onboarding (checklist FAB) — solo para owner/manager
  if (['owner', 'manager'].includes(AppState.user?.rol)) {
    initOnboarding({
      user: AppState.user,
      onNavigate: (route) => navigateTo(route),
    });
  }
}

/**
 * Expuesto para que las vistas soliciten un mini-tutorial desde su botón '?'.
 */
export function showViewTutorial(viewKey) {
  startMiniTutorial(viewKey, { force: true });
}

async function loadSucursales() {
  try {
    const list = await ZafiroAPI.sucursales.listar();
    AppState.sucursales = list || [];

    // Preferencia: sucursal del usuario > primera disponible
    const preferred = AppState.user?.sucursal_id;
    const found = preferred && AppState.sucursales.find((s) => s.id === preferred);
    AppState.currentSucursalId = found
      ? found.id
      : (AppState.sucursales[0]?.id || null);
  } catch (err) {
    console.error('[AppShell] Error cargando sucursales:', err);
    AppState.sucursales = [];
    AppState.currentSucursalId = null;
  }
}

function defaultRoute() {
  const rol = AppState.user?.rol;
  if (rol === 'cajero') return 'pos';
  if (rol === 'inventario') return 'inventario';
  return 'dashboard';
}

// ─────────────────────────────────────────────────────────────────
// LAYOUT
// ─────────────────────────────────────────────────────────────────
function renderLayout() {
  const app = document.getElementById('app') || document.body;
  const navItems = getNavItemsForRole();

  app.innerHTML = `
    <div class="app-shell" id="app-shell">
      ${renderSidebar(navItems)}
      ${renderMainContent()}
    </div>
    <div id="modal-overlay" class="modal-overlay hidden"></div>
    <div id="toast-container" class="toast-container"></div>
    <div id="faq-panel" class="faq-panel hidden"></div>
  `;
}

function getNavItemsForRole() {
  const rol = AppState.user?.rol || 'cajero';
  return Object.entries(VIEWS)
    .filter(([_, def]) => def.roles.includes(rol))
    .map(([route, def]) => ({ route, label: def.label, icon: def.icon }));
}

function renderSidebar(navItems) {
  return `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <div class="brand">
          ${AppState.branding?.logo_url
            ? `<img src="${AppState.branding.logo_url}" alt="" class="brand-logo">`
            : '<img src="/assets/zafiro-gem-icon.svg" alt="Zafiro" class="brand-logo">'}
          <div class="brand-text">
            <span class="brand-name">${escapeAttr(AppState.branding?.nombre_comercial || 'Zafiro POS')}</span>
            ${AppState.branding?.nombre_comercial
              ? '<span class="brand-tagline">Zafiro POS</span>'
              : ''}
          </div>
        </div>
        <button class="sidebar-toggle desktop-only" id="sidebar-toggle" aria-label="Colapsar menú">
          <i class="ph ph-caret-left"></i>
        </button>
      </div>

      ${renderSucursalSelector()}

      <nav class="sidebar-nav" id="sidebar-nav">
        ${navItems.map((item) => `
          <a href="#${item.route}" class="nav-item" data-route="${item.route}" data-tour="${item.route}">
            <i class="ph ${item.icon}"></i>
            <span class="label">${escapeAttr(item.label)}</span>
          </a>
        `).join('')}
      </nav>

      <div class="sidebar-footer">
        <div class="user-info-compact" title="${escapeAttr(AppState.user?.nombre || '')} — ${escapeAttr(rolLabel(AppState.user?.rol))}">
          <div class="user-avatar-sm">${getInitials(AppState.user?.nombre)}</div>
          <div class="user-text">
            <span class="user-name">${escapeAttr(AppState.user?.nombre || 'Usuario')}</span>
            <span class="user-role">${escapeAttr(rolLabel(AppState.user?.rol))}</span>
          </div>
        </div>
        <a href="https://zafiro.co" target="_blank" rel="noopener" class="powered-by">
          <img src="/assets/zafiro-gem-icon.svg" alt="" width="12" height="12">
          <span>Powered by Zafiro</span>
        </a>
      </div>
    </aside>
  `;
}

function renderSucursalSelector() {
  // Ocultar si hay 0 o 1 sucursal — aparece automáticamente al crear la 2da.
  if (AppState.sucursales.length <= 1) return '';
  return `
    <div class="sucursal-selector">
      <label for="sucursal-select"><i class="ph ph-storefront"></i></label>
      <select id="sucursal-select" class="input input-sm" data-combobox="true" data-combobox-class="combobox-compact">
        ${AppState.sucursales.map((s) => `
          <option value="${escapeAttr(s.id)}" ${s.id === AppState.currentSucursalId ? 'selected' : ''}>
            ${escapeAttr(s.nombre)}
          </option>
        `).join('')}
      </select>
    </div>
  `;
}

function renderMainContent() {
  return `
    <main class="main-content">
      <header class="top-header">
        <div class="header-left">
          ${AppState.branding?.logo_url
            ? `<img class="mobile-only" src="${escapeAttr(AppState.branding.logo_url)}" alt="" width="28" height="28" style="border-radius:6px;">`
            : '<img class="mobile-only" src="/assets/zafiro-gem-icon.svg" alt="" width="28" height="28">'}
          <span class="header-title" id="header-title">${escapeAttr(AppState.branding?.nombre_comercial || 'Zafiro')}</span>
        </div>
        <div class="header-right">
          <button class="btn-icon desktop-only" id="btn-help" title="Ayuda y tutorial" aria-label="Ayuda">
            <i class="ph ph-question"></i>
          </button>
          <button class="btn-icon desktop-only" id="btn-logout" title="Cerrar sesión" aria-label="Cerrar sesión">
            <i class="ph ph-sign-out"></i>
          </button>
          <button class="btn-icon mobile-only" id="btn-mobile-menu" title="Menú" aria-label="Menú">
            <i class="ph ph-list"></i>
          </button>
        </div>
      </header>

      <div class="page-content" id="page-content">
        <div class="loading-inline">
          <i class="ph ph-spinner spin"></i> Cargando...
        </div>
      </div>
    </main>

    ${renderMobileMenu()}
  `;
}

function renderMobileMenu() {
  return `
    <div class="mobile-menu-overlay" id="mobile-menu-overlay" hidden>
      <div class="mobile-menu-sheet" id="mobile-menu-sheet" role="dialog" aria-label="Menú">
        <div class="mobile-menu-handle"></div>
        <div class="mobile-menu-user">
          <div class="user-avatar">${getInitials(AppState.user?.nombre)}</div>
          <div class="user-info">
            <span class="user-name">${escapeAttr(AppState.user?.nombre || 'Usuario')}</span>
            <span class="user-role">${escapeAttr(rolLabel(AppState.user?.rol))}</span>
          </div>
        </div>

        ${AppState.sucursales.length > 1 ? `
          <div class="mobile-menu-section">
            <label class="mobile-menu-label"><i class="ph ph-storefront"></i> Sucursal</label>
            <select id="mobile-sucursal-select" class="input" data-combobox="true">
              ${AppState.sucursales.map((s) => `
                <option value="${escapeAttr(s.id)}" ${s.id === AppState.currentSucursalId ? 'selected' : ''}>
                  ${escapeAttr(s.nombre)}
                </option>
              `).join('')}
            </select>
          </div>
        ` : ''}

        <button class="mobile-menu-item" id="mobile-btn-help">
          <i class="ph ph-question"></i>
          <span>Ver tutorial</span>
        </button>

        <button class="mobile-menu-item danger" id="mobile-btn-logout">
          <i class="ph ph-sign-out"></i>
          <span>Cerrar sesión</span>
        </button>

        <a href="https://zafiro.co" target="_blank" rel="noopener" class="mobile-menu-brand">
          <img src="/assets/zafiro-gem-icon.svg" alt="" width="14" height="14">
          <span>Powered by Zafiro</span>
        </a>
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────────
// EVENT LISTENERS
// ─────────────────────────────────────────────────────────────────
function setupEventListeners() {
  // Sidebar toggle
  document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
    AppState.sidebarCollapsed = sidebar.classList.contains('collapsed');
  });

  // Navegación (event delegation)
  document.addEventListener('click', (e) => {
    const navItem = e.target.closest('.nav-item');
    if (navItem) {
      e.preventDefault();
      navigateTo(navItem.dataset.route);
    }
  });

  // Selector de sucursal
  document.getElementById('sucursal-select')?.addEventListener('change', (e) => {
    AppState.currentSucursalId = e.target.value;
    toast(`Sucursal cambiada`, 'info', 1500);
    if (AppState.currentView) {
      navigateTo(AppState.currentView, true);
    }
  });

  // Logout desde el top-header (con confirmación)
  document.getElementById('btn-logout')?.addEventListener('click', handleLogout);

  // Ayuda: owner/manager → checklist; otros roles → mini-tutorial de la vista actual
  const helpHandler = () => {
    const rol = AppState.user?.rol;
    if (rol === 'owner' || rol === 'manager') {
      openChecklist();
    } else if (AppState.currentView) {
      startMiniTutorial(AppState.currentView, { force: true });
    } else {
      toast('Ayuda no disponible en esta vista', 'info');
    }
  };
  document.getElementById('btn-help')?.addEventListener('click', helpHandler);

  // Mobile menu
  const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
  const openMobileMenu = () => {
    if (!mobileMenuOverlay) return;
    mobileMenuOverlay.hidden = false;
    requestAnimationFrame(() => mobileMenuOverlay.classList.add('open'));
  };
  const closeMobileMenu = () => {
    if (!mobileMenuOverlay) return;
    mobileMenuOverlay.classList.remove('open');
    setTimeout(() => { mobileMenuOverlay.hidden = true; }, 240);
  };

  document.getElementById('btn-mobile-menu')?.addEventListener('click', openMobileMenu);
  mobileMenuOverlay?.addEventListener('click', (e) => {
    if (e.target === mobileMenuOverlay) closeMobileMenu();
  });

  document.getElementById('mobile-sucursal-select')?.addEventListener('change', (e) => {
    AppState.currentSucursalId = e.target.value;
    // Mantener el sidebar selector sincronizado
    const sideSel = document.getElementById('sucursal-select');
    if (sideSel) sideSel.value = e.target.value;
    toast('Sucursal cambiada', 'info', 1500);
    closeMobileMenu();
    if (AppState.currentView) navigateTo(AppState.currentView, true);
  });

  document.getElementById('mobile-btn-help')?.addEventListener('click', () => {
    closeMobileMenu();
    helpHandler();
  });

  document.getElementById('mobile-btn-logout')?.addEventListener('click', () => {
    closeMobileMenu();
    handleLogout();
  });

  // Network status
  window.addEventListener('online', () => {
    AppState.isOnline = true;
    toast('Conexión restaurada', 'success', 2000);
  });
  window.addEventListener('offline', () => {
    AppState.isOnline = false;
    toast('Sin conexión — los cambios podrían no guardarse', 'warning', 4000);
  });
}

function setupHashRouter() {
  window.addEventListener('hashchange', () => {
    const route = window.location.hash.slice(1) || defaultRoute();
    if (route !== AppState.currentView) {
      navigateTo(route);
    }
  });
}

// ─────────────────────────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────────────────────────
export async function navigateTo(route, force = false) {
  const view = VIEWS[route];

  // Validar que el rol tenga acceso
  if (!view || !view.roles.includes(AppState.user?.rol)) {
    console.warn(`[AppShell] Ruta "${route}" no disponible para rol "${AppState.user?.rol}"`);
    return navigateTo(defaultRoute(), true);
  }

  if (!force && AppState.currentView === route) return;

  // Validar sucursal si es requerida
  if (view.needsSucursal && !AppState.currentSucursalId) {
    toast('Configura una sucursal primero', 'warning');
    return navigateTo('config', true);
  }

  AppState.currentView = route;

  // Actualizar estado visual de los nav items
  document.querySelectorAll('.nav-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.route === route);
  });

  // Actualizar título móvil
  const title = document.getElementById('header-title');
  if (title) title.textContent = view.label;

  // Actualizar hash sin disparar evento
  if (window.location.hash.slice(1) !== route) {
    history.replaceState(null, '', `#${route}`);
  }

  // Cargar la vista
  const container = document.getElementById('page-content');
  if (!container) return;

  container.innerHTML = '<div class="loading-inline"><i class="ph ph-spinner spin"></i> Cargando...</div>';

  try {
    const mod = await view.loader();
    await view.mount(mod, {
      container,
      sucursalId: AppState.currentSucursalId,
      user: AppState.user,
      branding: AppState.branding,
    });

    // Auto-iniciar mini-tutorial si es la primera vez en esta vista
    import('./tutorial-manager.js').then((m) => m.autoStartTutorial(route));

    // Notificar a onboarding si es paso 'explore_dashboard'
    if (route === 'dashboard' && ['owner', 'manager'].includes(AppState.user?.rol)) {
      import('./onboarding.js').then((m) => m.notifyDashboardVisited());
    }
  } catch (err) {
    console.error(`[AppShell] Error cargando vista "${route}":`, err);
    container.innerHTML = `
      <div class="error-state">
        <i class="ph ph-warning-circle"></i>
        <h3>No se pudo cargar la vista</h3>
        <p>${escapeAttr(err.message || 'Error desconocido')}</p>
        <button class="btn btn-primary" onclick="location.reload()">
          <i class="ph ph-arrow-clockwise"></i> Recargar
        </button>
      </div>
    `;
  }
}

// ─────────────────────────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────────────────────────
async function handleLogout() {
  const ok = await confirmDialog('¿Estás seguro de cerrar sesión?', {
    title: 'Cerrar sesión',
    okLabel: 'Cerrar sesión',
    cancelLabel: 'Cancelar',
    danger: true,
  });
  if (!ok) return;
  apiLogout(); // limpia tokens y redirige a /login.html
}

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────
function rolLabel(rol) {
  const labels = {
    owner: 'Propietario',
    manager: 'Manager',
    cajero: 'Cajero',
    inventario: 'Inventario',
    super_admin: 'Super Admin',
  };
  return labels[rol] || rol || '';
}

function escapeAttr(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Exports
export { AppState };
