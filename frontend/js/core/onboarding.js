/**
 * core/onboarding.js — Checklist de primeros pasos
 *
 * Sistema gamificado que guía al usuario por las 6 tareas esenciales
 * durante sus primeras semanas. Combina:
 *   - 3 pasos persistentes en backend (perfil, producto, venta)
 *   - 3 pasos locales (branding, equipo, dashboard)
 *
 * API:
 *   import { initOnboarding, openChecklist, closeChecklist,
 *            markStepCompleted, isStepCompleted } from './onboarding.js';
 *
 *   await initOnboarding({ user, onNavigate });   // 1x al cargar shell
 *   markStepCompleted('first_product');            // desde la vista inventario
 *   openChecklist();                                // desde botón "?"
 */

import { ZafiroAPI } from './api-client.js';
import { toast, escapeHtml } from './ui.js';

// ═════════════════════════════════════════════════════════════════
// DEFINICIÓN DE PASOS (orden recomendado)
// ═════════════════════════════════════════════════════════════════
/**
 * Cada paso declara:
 *  - key:          identificador único
 *  - title:        título corto en UI
 *  - desc:         descripción en UI
 *  - icon:         ph-icon para el paso
 *  - route:        hash al que navegar al hacer click (null = ya en esa vista)
 *  - backendPaso:  si existe, campo en GET /onboarding que marca completado
 *                  (perfil_configurado | primer_producto | primera_venta)
 *  - localKey:     si es tracking local, key en localStorage
 *  - tip:          texto corto que aparece en toast cuando se completa
 */
const STEPS = [
  {
    key: 'welcome',
    title: 'Crear tu negocio',
    desc: 'Ya completaste este paso al registrarte.',
    icon: 'ph-storefront',
    route: null,
    alwaysComplete: true,
  },
  {
    key: 'branding',
    title: 'Personaliza tu marca',
    desc: 'Sube tu logo, elige tus colores y el tema de tu POS.',
    icon: 'ph-palette',
    route: 'config',
    backendField: 'perfil_configurado',  // campo en GET /onboarding
    backendPaso: 'perfil',                // valor para PATCH /onboarding/{paso}
    tip: '¡Tu marca luce mejor! 🎨',
  },
  {
    key: 'first_product',
    title: 'Agrega tu primer producto',
    desc: 'Empieza a armar tu catálogo en el inventario.',
    icon: 'ph-package',
    route: 'inventario',
    backendField: 'primer_producto',
    backendPaso: 'producto',
    tip: '¡Primer producto listo! 📦',
  },
  {
    key: 'first_sale',
    title: 'Registra tu primera venta',
    desc: 'Haz una venta de prueba para familiarizarte con el POS.',
    icon: 'ph-shopping-cart',
    route: 'pos',
    backendField: 'primera_venta',
    backendPaso: 'venta',
    tip: '¡Primera venta cerrada! 🎉',
  },
  {
    key: 'invite_team',
    title: 'Invita a tu equipo',
    desc: 'Agrega cajeros o managers para compartir la operación.',
    icon: 'ph-users',
    route: 'usuarios',
    localKey: 'onboarding_team_invited',
    tip: '¡Equipo incorporado! 👥',
  },
  {
    key: 'explore_dashboard',
    title: 'Revisa tu dashboard',
    desc: 'Analiza ventas, métodos de pago y top productos del día.',
    icon: 'ph-chart-bar',
    route: 'dashboard',
    localKey: 'onboarding_dashboard_visited',
    tip: '¡Ya dominas los reportes! 📊',
  },
];

// ═════════════════════════════════════════════════════════════════
// ESTADO GLOBAL
// ═════════════════════════════════════════════════════════════════
const OnbState = {
  user: null,
  onNavigate: null,
  backendProgress: null,  // último GET /onboarding
  localProgress: {},       // localStorage mirror
  isOpen: false,
  dismissed: false,        // si el usuario cerró el FAB con "no mostrar más"
};

// Claves de localStorage
const LS = {
  DISMISSED: 'onboarding_fab_dismissed',
  LOCAL_STEPS: 'onboarding_local_progress',
};

// ═════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═════════════════════════════════════════════════════════════════
/**
 * Inicializa el sistema. Llamar una vez tras renderizar el app-shell.
 * @param {Object} opts
 * @param {Object} opts.user         Usuario autenticado
 * @param {Function} opts.onNavigate Callback (route) => void para ir a una vista
 */
export async function initOnboarding({ user, onNavigate }) {
  OnbState.user = user;
  OnbState.onNavigate = onNavigate || ((r) => { window.location.hash = r; });

  // Cargar progreso local de localStorage
  try {
    OnbState.localProgress = JSON.parse(localStorage.getItem(LS.LOCAL_STEPS) || '{}');
  } catch { OnbState.localProgress = {}; }

  OnbState.dismissed = localStorage.getItem(LS.DISMISSED) === '1';

  // Cargar progreso backend
  await refreshBackendProgress();

  // Si todo está completo o el usuario lo descartó, no mostrar FAB
  renderFAB();
}

async function refreshBackendProgress() {
  try {
    OnbState.backendProgress = await ZafiroAPI.onboarding.get();
  } catch (err) {
    console.warn('[Onboarding] No se pudo obtener progreso backend:', err?.message);
    OnbState.backendProgress = null;
  }
}

// ═════════════════════════════════════════════════════════════════
// ESTADO DE PASOS
// ═════════════════════════════════════════════════════════════════
/**
 * Devuelve si un paso está completado (según su fuente de verdad).
 * @param {string} key
 * @returns {boolean}
 */
export function isStepCompleted(key) {
  const step = STEPS.find((s) => s.key === key);
  if (!step) return false;
  if (step.alwaysComplete) return true;
  if (step.backendField && OnbState.backendProgress) {
    return Boolean(OnbState.backendProgress[step.backendField]);
  }
  if (step.localKey) {
    return Boolean(OnbState.localProgress[step.localKey]);
  }
  return false;
}

/**
 * Devuelve el primer paso no completado, o null si todo está listo.
 */
export function getNextStep() {
  return STEPS.find((s) => !isStepCompleted(s.key)) || null;
}

/**
 * Devuelve {completed, total, percent}.
 */
export function getProgress() {
  const total = STEPS.length;
  const completed = STEPS.filter((s) => isStepCompleted(s.key)).length;
  return {
    completed,
    total,
    percent: Math.round((completed / total) * 100),
    isComplete: completed === total,
  };
}

/**
 * Marca un paso como completado. Si el paso está respaldado por backend,
 * lanza el PATCH correspondiente. Si es local, solo persiste en localStorage.
 * @param {string} key
 * @param {Object} [opts]
 * @param {boolean} [opts.silent=false]  No mostrar toast de confirmación
 */
export async function markStepCompleted(key, { silent = false } = {}) {
  const step = STEPS.find((s) => s.key === key);
  if (!step) {
    console.warn('[Onboarding] Paso desconocido:', key);
    return;
  }
  if (isStepCompleted(key)) return; // ya completado, noop

  // Backend-backed
  if (step.backendPaso) {
    try {
      OnbState.backendProgress = await ZafiroAPI.onboarding.marcarPaso(step.backendPaso);
    } catch (err) {
      console.error('[Onboarding] PATCH fallido:', err);
    }
  }

  // Local tracking
  if (step.localKey) {
    OnbState.localProgress[step.localKey] = true;
    try { localStorage.setItem(LS.LOCAL_STEPS, JSON.stringify(OnbState.localProgress)); }
    catch {}
  }

  // Feedback
  if (!silent && step.tip) toast(step.tip, 'success', 2500);

  renderFAB();
  if (OnbState.isOpen) renderPanel();

  // Disparar evento para que el resto de la app reaccione
  document.dispatchEvent(new CustomEvent('onboarding:step-complete', {
    detail: { key, step, progress: getProgress() },
  }));
}

// ═════════════════════════════════════════════════════════════════
// FAB (Floating Action Button)
// ═════════════════════════════════════════════════════════════════
function renderFAB() {
  let fab = document.getElementById('onboarding-fab');
  const progress = getProgress();

  // Si está completo y el usuario ya cerró celebración, ocultar
  if (progress.isComplete && OnbState.dismissed) {
    fab?.remove();
    return;
  }
  if (OnbState.dismissed && !progress.isComplete) {
    // Usuario descartó manualmente
    fab?.remove();
    return;
  }

  if (!fab) {
    fab = document.createElement('button');
    fab.id = 'onboarding-fab';
    fab.className = 'onboarding-fab';
    fab.type = 'button';
    fab.addEventListener('click', openChecklist);
    document.body.appendChild(fab);
  }

  const icon = progress.isComplete ? 'ph-check-circle' : 'ph-rocket-launch';
  const label = progress.isComplete ? '¡Listo!' : 'Primeros pasos';

  fab.classList.toggle('complete', progress.isComplete);
  fab.innerHTML = `
    <i class="ph-fill ${icon}"></i>
    <span class="onboarding-fab-label">${label}</span>
    <span class="onboarding-fab-progress">${progress.completed}/${progress.total}</span>
  `;
}

// ═════════════════════════════════════════════════════════════════
// PANEL (slide-in drawer)
// ═════════════════════════════════════════════════════════════════
export function openChecklist() {
  OnbState.isOpen = true;

  let backdrop = document.getElementById('onboarding-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'onboarding-backdrop';
    backdrop.className = 'onboarding-backdrop';
    backdrop.addEventListener('click', closeChecklist);
    document.body.appendChild(backdrop);
  }

  let panel = document.getElementById('onboarding-panel');
  if (!panel) {
    panel = document.createElement('aside');
    panel.id = 'onboarding-panel';
    panel.className = 'onboarding-panel';
    panel.setAttribute('role', 'complementary');
    panel.setAttribute('aria-label', 'Checklist de primeros pasos');
    document.body.appendChild(panel);
  }

  renderPanel();

  requestAnimationFrame(() => {
    backdrop.classList.add('visible');
    panel.classList.add('open');
  });

  // Refresca progreso backend al abrir (por si cambió desde otra pestaña)
  refreshBackendProgress().then(() => {
    if (OnbState.isOpen) renderPanel();
  });

  // Cerrar con ESC
  document.addEventListener('keydown', handleEscKey);
}

function handleEscKey(e) {
  if (e.key === 'Escape' && OnbState.isOpen) closeChecklist();
}

export function closeChecklist() {
  OnbState.isOpen = false;
  const panel = document.getElementById('onboarding-panel');
  const backdrop = document.getElementById('onboarding-backdrop');
  if (panel) panel.classList.remove('open');
  if (backdrop) backdrop.classList.remove('visible');
  document.removeEventListener('keydown', handleEscKey);
}

function renderPanel() {
  const panel = document.getElementById('onboarding-panel');
  if (!panel) return;

  const progress = getProgress();

  panel.innerHTML = `
    <header class="onboarding-header">
      <button class="onboarding-close" id="onboarding-close-btn" aria-label="Cerrar">
        <i class="ph ph-x"></i>
      </button>
      <h2>Primeros pasos</h2>
      <p>Configura tu negocio en minutos. Te guiamos paso a paso.</p>
      <div class="onboarding-progress-bar" role="progressbar"
           aria-valuenow="${progress.percent}" aria-valuemin="0" aria-valuemax="100">
        <div class="onboarding-progress-fill" style="width: ${progress.percent}%;"></div>
      </div>
      <div class="onboarding-progress-label">
        <span><strong>${progress.completed}</strong> de ${progress.total} completados</span>
        <span>${progress.percent}%</span>
      </div>
    </header>

    ${progress.isComplete
      ? renderCelebration()
      : `<div class="onboarding-steps">
          ${STEPS.map((s) => renderStep(s)).join('')}
        </div>`}

    <footer class="onboarding-footer">
      <span class="onboarding-footer-text">
        <i class="ph ph-info" aria-hidden="true"></i>
        Puedes volver a abrir esta lista en cualquier momento.
      </span>
      <button type="button" id="onboarding-dismiss-btn">
        ${progress.isComplete ? 'Cerrar' : 'No mostrar más'}
      </button>
    </footer>
  `;

  // Event listeners
  panel.querySelector('#onboarding-close-btn')?.addEventListener('click', closeChecklist);
  panel.querySelector('#onboarding-dismiss-btn')?.addEventListener('click', dismissFromPanel);

  panel.querySelectorAll('.onboarding-step').forEach((el) => {
    el.addEventListener('click', () => handleStepClick(el.dataset.key));
  });
}

function renderStep(step) {
  const completed = isStepCompleted(step.key);
  return `
    <button type="button" class="onboarding-step ${completed ? 'completed' : ''}"
            data-key="${escapeHtml(step.key)}"
            ${completed ? 'aria-disabled="true"' : ''}>
      <span class="onboarding-step-check">
        ${completed ? '<i class="ph-fill ph-check"></i>' : ''}
      </span>
      <div class="onboarding-step-body">
        <h4 class="onboarding-step-title">
          <i class="ph ${step.icon}"></i>
          ${escapeHtml(step.title)}
        </h4>
        <p class="onboarding-step-desc">${escapeHtml(step.desc)}</p>
      </div>
      <i class="ph ph-arrow-right onboarding-step-arrow"></i>
    </button>
  `;
}

function renderCelebration() {
  return `
    <div class="onboarding-celebration">
      <i class="ph-fill ph-confetti"></i>
      <h3>¡Todo listo!</h3>
      <p>Has completado la configuración inicial. Tu POS está listo para operar a máxima velocidad.</p>
    </div>
  `;
}

function handleStepClick(key) {
  if (isStepCompleted(key)) return;
  const step = STEPS.find((s) => s.key === key);
  if (!step) return;

  closeChecklist();

  // Para pasos "locales" (como explore_dashboard), completar al visitar
  if (step.localKey && step.route) {
    OnbState.onNavigate(step.route);
    // Marcar como completado tras un breve delay (el usuario "vio" la vista)
    setTimeout(() => markStepCompleted(step.key), 800);
    return;
  }

  // Para pasos backend, solo navegar (se marcan desde la vista cuando cumpla)
  if (step.route) {
    OnbState.onNavigate(step.route);
  }
}

function dismissFromPanel() {
  OnbState.dismissed = true;
  localStorage.setItem(LS.DISMISSED, '1');
  closeChecklist();
  renderFAB();
}

// ═════════════════════════════════════════════════════════════════
// HELPERS PARA LAS VISTAS
// ═════════════════════════════════════════════════════════════════

/**
 * Reinicia el checklist (utilidad de testing o "volver a ver").
 */
export function resetOnboarding() {
  localStorage.removeItem(LS.DISMISSED);
  localStorage.removeItem(LS.LOCAL_STEPS);
  OnbState.dismissed = false;
  OnbState.localProgress = {};
  refreshBackendProgress().then(() => {
    renderFAB();
    openChecklist();
  });
}

/**
 * Marca el paso "equipo invitado" cuando se crea un usuario del equipo.
 */
export function notifyTeamInvited() {
  markStepCompleted('invite_team');
}

/**
 * Marca el paso "dashboard visitado" (llamado desde views/dashboard.js).
 */
export function notifyDashboardVisited() {
  if (!isStepCompleted('explore_dashboard')) {
    markStepCompleted('explore_dashboard', { silent: true });
  }
}
