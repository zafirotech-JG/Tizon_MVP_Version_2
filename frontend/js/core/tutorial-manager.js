/**
 * core/tutorial-manager.js — Mini-tutoriales contextuales por vista
 *
 * En lugar de un tour monolítico, esta capa expone `startMiniTutorial(key)`
 * donde `key` identifica un flujo específico (ej. 'pos', 'inventario', etc.).
 * Cada vista puede dispararlo al entrar la primera vez o desde su botón '?'.
 *
 * API:
 *   import { startMiniTutorial, hasSeenTutorial, resetTutorial } from './tutorial-manager.js';
 *
 *   startMiniTutorial('pos');                      // inicia tour POS
 *   if (!hasSeenTutorial('inventario')) startMiniTutorial('inventario');
 *   resetTutorial('pos');                          // limpia flag (volver a ver)
 *   resetAllTutorials();                            // limpia todo
 */

// ═════════════════════════════════════════════════════════════════
// DEFINICIÓN DE MINI-TUTORIALES
// ═════════════════════════════════════════════════════════════════
/**
 * Cada tutorial define:
 *  - label:   nombre humano del tour
 *  - steps:   array de pasos Driver.js-compatible
 *             con selector y popover {title, description, side, align}
 *  - auto:    si true, dispara automáticamente la primera vez
 */
const TUTORIALS = {
  // ── POS (vender) ────────────────────────────────────────────────
  pos: {
    label: 'Cómo vender',
    auto: true,
    steps: [
      {
        element: '#pos-search',
        popover: {
          title: '1. Busca productos',
          description: 'Escribe el nombre o escanea el código. El filtro funciona mientras escribes.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '.pos-category-tabs',
        popover: {
          title: '2. Filtra por categoría',
          description: 'Toca una categoría para ver solo esos productos. "Todo" muestra el catálogo completo.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '.pos-grid',
        popover: {
          title: '3. Toca para agregar',
          description: 'Toca cualquier producto para agregarlo al carrito. Cada toque aumenta la cantidad.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '.pos-cart',
        popover: {
          title: '4. Revisa y ajusta',
          description: 'Modifica cantidades o elimina productos. El total se actualiza al instante.',
          side: 'left',
          align: 'center',
        },
      },
      {
        element: '#btn-cobrar',
        popover: {
          title: '5. Cobra la venta',
          description: 'Elige método de pago (Efectivo, Tarjeta, Nequi, Daviplata) y confirma. ¡Listo!',
          side: 'top',
          align: 'end',
        },
      },
    ],
  },

  // ── Dashboard ──────────────────────────────────────────────────
  dashboard: {
    label: 'Tu dashboard',
    auto: true,
    steps: [
      {
        element: '.stats-grid',
        popover: {
          title: 'Métricas del día',
          description: 'Ventas totales, órdenes, ticket promedio y productos vendidos en tiempo real.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '.dashboard-chart-card',
        popover: {
          title: 'Métodos de pago',
          description: 'Distribución de las ventas por cada método: Efectivo, Tarjeta, Nequi, Daviplata.',
          side: 'top',
          align: 'start',
        },
      },
      {
        element: '.dashboard-top-card',
        popover: {
          title: 'Top productos',
          description: 'Los 5 productos más vendidos del día, ordenados por cantidad.',
          side: 'top',
          align: 'start',
        },
      },
    ],
  },

  // ── Inventario ─────────────────────────────────────────────────
  inventario: {
    label: 'Gestionar inventario',
    auto: true,
    steps: [
      {
        element: '.tabs',
        popover: {
          title: 'Productos y categorías',
          description: 'Cambia entre la pestaña de productos y categorías. Cada producto pertenece a una categoría.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#btn-nuevo-producto',
        popover: {
          title: 'Crea tu primer producto',
          description: 'Define nombre, precio, categoría e insumos. Aparecerá inmediatamente en el POS.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '.search-box',
        popover: {
          title: 'Busca rápidamente',
          description: 'A medida que crece tu catálogo, esta búsqueda te ahorra tiempo.',
          side: 'bottom',
          align: 'start',
        },
      },
    ],
  },

  // ── Configuración / Branding ───────────────────────────────────
  config: {
    label: 'Personalizar tu marca',
    auto: true,
    steps: [
      {
        element: '.tabs',
        popover: {
          title: 'Secciones de ajustes',
          description: 'Branding (colores y logo), sucursales y datos del negocio.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: 'input[name="color_primary"]',
        popover: {
          title: 'Tu color principal',
          description: 'Este color se usa en botones, acentos y CTAs. Elige uno que represente tu marca.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '.theme-selector',
        popover: {
          title: 'Tema oscuro o claro',
          description: 'Dark es recomendado para pantallas táctiles. Light es ideal para locales con luz natural.',
          side: 'top',
          align: 'start',
        },
      },
      {
        element: '#btn-save-branding',
        popover: {
          title: 'Guarda los cambios',
          description: 'Al guardar, tu POS se actualiza al instante con tu nueva identidad.',
          side: 'left',
          align: 'end',
        },
      },
    ],
  },

  // ── Usuarios / Equipo ──────────────────────────────────────────
  usuarios: {
    label: 'Invitar equipo',
    auto: true,
    steps: [
      {
        element: '#btn-nuevo-usuario',
        popover: {
          title: 'Invita a un miembro',
          description: 'Crea credenciales para cajeros, managers o personal de inventario.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '.card-list',
        popover: {
          title: 'Gestiona permisos',
          description: 'Cada rol tiene permisos diferentes. Puedes editar o remover miembros cuando quieras.',
          side: 'top',
          align: 'start',
        },
      },
    ],
  },
};

// ═════════════════════════════════════════════════════════════════
// STATE
// ═════════════════════════════════════════════════════════════════
let driverInstance = null;
const LS_KEY = (key) => `tutorial_seen_${key}`;

// ═════════════════════════════════════════════════════════════════
// API
// ═════════════════════════════════════════════════════════════════

/**
 * Devuelve true si el usuario ya vio este mini-tutorial.
 */
export function hasSeenTutorial(key) {
  return localStorage.getItem(LS_KEY(key)) === '1';
}

/**
 * Marca como visto sin mostrar el tour.
 */
export function markTutorialSeen(key) {
  localStorage.setItem(LS_KEY(key), '1');
}

/**
 * Reset un tutorial específico.
 */
export function resetTutorial(key) {
  localStorage.removeItem(LS_KEY(key));
}

/**
 * Reset todos los mini-tutoriales vistos.
 */
export function resetAllTutorials() {
  Object.keys(TUTORIALS).forEach((k) => resetTutorial(k));
}

/**
 * Inicia un mini-tutorial por clave.
 * @param {string} key   Identificador ('pos', 'inventario', etc.)
 * @param {Object} [opts]
 * @param {boolean} [opts.force=false]     Fuerza el tour aunque ya se haya visto
 * @param {number}  [opts.delay=400]       Delay antes de iniciar
 */
export function startMiniTutorial(key, { force = false, delay = 400 } = {}) {
  const config = TUTORIALS[key];
  if (!config) {
    console.warn('[Tutorial] Tour desconocido:', key);
    return;
  }

  if (!force && hasSeenTutorial(key)) {
    return; // ya se mostró
  }

  if (typeof window.driver === 'undefined' || !window.driver.js) {
    console.error('[Tutorial] Driver.js no cargado');
    return;
  }

  // Validar que todos los selectores existen (evitar tour con elementos nulos)
  const validSteps = config.steps.filter((step) => {
    const el = document.querySelector(step.element);
    if (!el) {
      console.warn(`[Tutorial] Selector no encontrado: ${step.element} — paso omitido`);
      return false;
    }
    return true;
  });

  if (validSteps.length === 0) {
    console.warn('[Tutorial] Ningún paso válido para', key);
    return;
  }

  const driver = window.driver.js.driver;

  if (driverInstance) {
    try { driverInstance.destroy(); } catch {}
  }

  driverInstance = driver({
    showProgress: true,
    showButtons: ['next', 'previous', 'close'],
    allowClose: true,
    overlayClickNext: false,
    stagePadding: 6,
    stageRadius: 10,
    progressText: '{{current}} de {{total}}',
    nextBtnText: 'Siguiente →',
    prevBtnText: '← Anterior',
    doneBtnText: '¡Listo!',
    steps: validSteps,
    onDestroyStarted: () => {
      const hasNext = driverInstance && driverInstance.hasNextStep();
      if (!hasNext) markTutorialSeen(key);
      driverInstance?.destroy();
    },
    onCloseClick: () => {
      markTutorialSeen(key);
      driverInstance?.destroy();
    },
  });

  setTimeout(() => {
    try { driverInstance.drive(); }
    catch (e) { console.error('[Tutorial] Error al iniciar:', e); }
  }, delay);
}

/**
 * Auto-inicia el mini-tutorial correspondiente a una vista si no se ha visto.
 * Llamar desde el mount de cada vista.
 * @param {string} viewKey
 */
export function autoStartTutorial(viewKey) {
  const config = TUTORIALS[viewKey];
  if (!config || !config.auto) return;
  if (hasSeenTutorial(viewKey)) return;
  // Pequeño delay para que la vista termine de renderizar
  startMiniTutorial(viewKey, { delay: 700 });
}

/**
 * Devuelve la lista de tutoriales disponibles (para el panel de ayuda).
 */
export function listTutorials() {
  return Object.entries(TUTORIALS).map(([key, config]) => ({
    key,
    label: config.label,
    seen: hasSeenTutorial(key),
  }));
}

// ═════════════════════════════════════════════════════════════════
// COMPAT — exports legacy para no romper imports existentes
// ═════════════════════════════════════════════════════════════════
export const startTutorial = (rol) => {
  // Mapeo legacy: rol → primer mini-tutorial relevante
  if (rol === 'cajero') startMiniTutorial('pos');
  else if (rol === 'inventario') startMiniTutorial('inventario');
  else startMiniTutorial('dashboard');
};

export const completeTutorial = (rol) => {
  markTutorialSeen('pos');
  markTutorialSeen('dashboard');
};

export const showFAQ = () => {
  // FAQ legacy no disponible en este release — usar el checklist.
  console.info('[Tutorial] showFAQ legacy — usa openChecklist() en su lugar.');
};

export const closeFAQ = () => {};
