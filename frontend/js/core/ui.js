/**
 * core/ui.js — UI helpers centralizados: toasts, modales, loaders, formatters.
 * Diseño mobile-first.
 */
import { autoMountComboboxes } from './combobox.js';

// ─────────────────────────────────────────────────────────────────
// TOAST NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────
export function toast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icon = {
    error:   'ph-warning-circle',
    success: 'ph-check-circle',
    warning: 'ph-warning',
    info:    'ph-info',
  }[type] || 'ph-info';

  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `
    <i class="ph ${icon}"></i>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));

  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, duration);

  return el;
}

// ─────────────────────────────────────────────────────────────────
// MODAL / DIALOG
// ─────────────────────────────────────────────────────────────────
/**
 * Muestra un modal genérico con contenido HTML y botones.
 * @param {Object} opts - { title, body, actions: [{label, variant, onClick}] }
 * @returns {Promise} Resuelve con el valor del botón clickeado, o null si cerrado.
 */
export function modal({ title = '', body = '', actions = [], closable = true, onMount = null } = {}) {
  return new Promise((resolve) => {
    let overlay = document.getElementById('modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'modal-overlay';
      overlay.className = 'modal-overlay';
      document.body.appendChild(overlay);
    }

    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog';
    dialog.innerHTML = `
      ${title ? `<div class="modal-header">
        <h3 class="modal-title">${escapeHtml(title)}</h3>
        ${closable ? '<button class="btn-icon modal-close" aria-label="Cerrar"><i class="ph ph-x"></i></button>' : ''}
      </div>` : ''}
      <div class="modal-body">${body}</div>
      <div class="modal-footer">
        ${actions.map((a, i) => `
          <button class="btn btn-${a.variant || 'secondary'}" data-action="${i}">
            ${a.icon ? `<i class="ph ${a.icon}"></i>` : ''}
            ${escapeHtml(a.label)}
          </button>
        `).join('')}
      </div>
    `;

    overlay.innerHTML = '';
    overlay.appendChild(dialog);
    overlay.classList.remove('hidden');
    overlay.classList.add('visible');

    // Auto-montar comboboxes en <select data-combobox="true">
    try { autoMountComboboxes(dialog); } catch (e) { console.warn('[modal] combobox mount:', e); }

    // Hook post-mount para que el caller pueda cablear listeners
    if (typeof onMount === 'function') {
      try { onMount(dialog); } catch (e) { console.warn('[modal] onMount:', e); }
    }

    const close = (value) => {
      overlay.classList.remove('visible');
      overlay.classList.add('hidden');
      setTimeout(() => {
        overlay.innerHTML = '';
      }, 200);
      resolve(value);
    };

    dialog.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const idx = parseInt(btn.dataset.action, 10);
        const action = actions[idx];
        if (action.onClick) {
          const result = await action.onClick(dialog);
          // false → no cerrar (validación falló o se quedó cargando)
          if (result === false) return;
          // true / undefined → cerrar con action.value (compat con onClick que retorna true)
          // cualquier otro valor → cerrar resolviendo con ese valor (caso prompt())
          if (result === true || result === undefined) {
            close(action.value ?? idx);
          } else {
            close(result);
          }
        } else {
          close(action.value ?? idx);
        }
      });
    });

    if (closable) {
      dialog.querySelector('.modal-close')?.addEventListener('click', () => close(null));
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close(null);
      }, { once: true });
    }
  });
}

/**
 * Confirm simple de sí/no
 */
export function confirm(message, { title = 'Confirmar', okLabel = 'Aceptar', cancelLabel = 'Cancelar', danger = false } = {}) {
  return modal({
    title,
    body: `<p>${escapeHtml(message)}</p>`,
    actions: [
      { label: cancelLabel, variant: 'ghost', value: false },
      { label: okLabel, variant: danger ? 'danger' : 'primary', value: true },
    ],
  });
}

/**
 * Prompt de texto simple. Resuelve con la cadena ingresada (trimmed) o `null` si cancela.
 */
export function prompt(message, { title = '', defaultValue = '', placeholder = '', okLabel = 'Aceptar' } = {}) {
  const inputId = `prompt-input-${Date.now()}`;
  return modal({
    title,
    body: `
      <p>${escapeHtml(message)}</p>
      <input type="text" id="${inputId}" class="input input-lg" 
             value="${escapeHtml(defaultValue)}"
             placeholder="${escapeHtml(placeholder)}"
             style="width: 100%; margin-top: 12px;">
    `,
    actions: [
      { label: 'Cancelar', variant: 'ghost', value: null },
      {
        label: okLabel,
        variant: 'primary',
        onClick: (dialog) => dialog.querySelector(`#${inputId}`).value.trim() || false,
      },
    ],
    onMount: (dialog) => {
      const input = dialog.querySelector(`#${inputId}`);
      const okBtn = dialog.querySelector('[data-action="1"]');
      if (input) {
        // Foco + selección para sobrescribir el defaultValue rápidamente
        requestAnimationFrame(() => {
          input.focus();
          input.select();
        });
        // Enter confirma
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            okBtn?.click();
          }
        });
      }
    },
  });
}

// ─────────────────────────────────────────────────────────────────
// LOADING STATES
// ─────────────────────────────────────────────────────────────────
export function setLoading(element, isLoading, text = '') {
  if (!element) return;
  if (isLoading) {
    element.classList.add('is-loading');
    element.setAttribute('aria-busy', 'true');
    if (text && !element.dataset.originalText) {
      element.dataset.originalText = element.textContent;
      element.textContent = text;
    }
  } else {
    element.classList.remove('is-loading');
    element.removeAttribute('aria-busy');
    if (element.dataset.originalText) {
      element.textContent = element.dataset.originalText;
      delete element.dataset.originalText;
    }
  }
}

export function renderSkeleton(container, count = 6, className = 'skeleton-card') {
  if (!container) return;
  container.innerHTML = Array(count)
    .fill(0)
    .map(() => `<div class="${className} skeleton-pulse"></div>`)
    .join('');
}

export function renderEmpty(container, { icon = 'ph-folder-open', title = 'Sin resultados', subtitle = '', action = null } = {}) {
  if (!container) return;
  container.innerHTML = `
    <div class="empty-state">
      <i class="ph ${icon}"></i>
      <h3>${escapeHtml(title)}</h3>
      ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}
      ${action ? `<button class="btn btn-primary" id="empty-action">
        ${action.icon ? `<i class="ph ${action.icon}"></i>` : ''}
        ${escapeHtml(action.label)}
      </button>` : ''}
    </div>
  `;
  if (action?.onClick) {
    container.querySelector('#empty-action')?.addEventListener('click', action.onClick);
  }
}

// ─────────────────────────────────────────────────────────────────
// FORMATTERS
// ─────────────────────────────────────────────────────────────────
export function formatCurrency(value, currency = 'COP', locale = 'es-CO') {
  const num = Number(value) || 0;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatNumber(value, locale = 'es-CO') {
  return new Intl.NumberFormat(locale).format(Number(value) || 0);
}

export function formatDate(value, opts = { dateStyle: 'medium' }, locale = 'es-CO') {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat(locale, opts).format(d);
}

export function formatTime(value, locale = 'es-CO') {
  return formatDate(value, { timeStyle: 'short' }, locale);
}

export function formatDateTime(value, locale = 'es-CO') {
  return formatDate(value, { dateStyle: 'medium', timeStyle: 'short' }, locale);
}

// ─────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

export function throttle(fn, delay = 300) {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn.apply(this, args);
    }
  };
}

/**
 * Obtener las iniciales de un nombre para avatares.
 */
export function getInitials(name) {
  if (!name) return '?';
  return String(name)
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Envuelve una función async: muestra loading y captura errores con toast.
 */
export async function withErrorToast(fn, { defaultMessage = 'Ocurrió un error' } = {}) {
  try {
    return await fn();
  } catch (err) {
    console.error(err);
    toast(err?.message || defaultMessage, 'error');
    throw err;
  }
}
