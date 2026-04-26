/**
 * core/combobox.js — Combobox custom con búsqueda
 *
 * Componente drop-in que reemplaza <select> nativo con estilo propio,
 * búsqueda opcional, teclado accesible y mobile-friendly.
 *
 * API:
 *   import { createCombobox, mountCombobox } from '/js/core/combobox.js';
 *
 *   const cb = createCombobox({
 *     options: [{ value: 'cat1', label: 'Carnes' }, ...],
 *     value: 'cat1',
 *     placeholder: 'Selecciona...',
 *     searchable: true,
 *     onChange: (newValue, option) => { ... }
 *   });
 *   container.appendChild(cb.element);
 *   cb.setValue('cat2');
 *   cb.setOptions([...]);
 *   cb.getValue();
 *
 *   // Helper: reemplaza un <select> existente
 *   mountCombobox(document.querySelector('#cat-select'));
 */

const COMBOBOX_REGISTRY = new WeakMap();
let activeCombobox = null; // solo uno abierto a la vez

// Cerrar cualquier combobox al hacer click fuera
document.addEventListener('click', (e) => {
  if (activeCombobox && !activeCombobox.element.contains(e.target)) {
    activeCombobox.close();
  }
}, true);

// Cerrar en ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && activeCombobox) {
    activeCombobox.close();
    activeCombobox.trigger.focus();
  }
});

/**
 * Crea un combobox standalone.
 * @param {Object} opts
 * @param {Array<{value:string,label:string,icon?:string,hint?:string}>} opts.options
 * @param {string} [opts.value]
 * @param {string} [opts.placeholder='Selecciona...']
 * @param {boolean} [opts.searchable=false]
 * @param {boolean} [opts.disabled=false]
 * @param {string} [opts.emptyText='Sin opciones']
 * @param {(value:string, option:Object) => void} [opts.onChange]
 * @param {string} [opts.className='']
 * @returns {{element:HTMLElement, setValue, setOptions, getValue, getOption, close, open, destroy}}
 */
export function createCombobox(opts = {}) {
  const state = {
    options: opts.options || [],
    value: opts.value || '',
    placeholder: opts.placeholder || 'Selecciona...',
    searchable: opts.searchable || false,
    disabled: opts.disabled || false,
    emptyText: opts.emptyText || 'Sin opciones',
    onChange: opts.onChange || (() => {}),
    isOpen: false,
    searchQuery: '',
    activeIndex: -1,
  };

  // Root
  const root = document.createElement('div');
  root.className = 'combobox' + (opts.className ? ' ' + opts.className : '');
  if (state.disabled) root.classList.add('is-disabled');

  // Trigger (el botón visible que reemplaza al select)
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'combobox-trigger';
  trigger.setAttribute('role', 'combobox');
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.disabled = state.disabled;

  const triggerLabel = document.createElement('span');
  triggerLabel.className = 'combobox-label';
  trigger.appendChild(triggerLabel);

  const triggerArrow = document.createElement('i');
  triggerArrow.className = 'ph ph-caret-down combobox-arrow';
  triggerArrow.setAttribute('aria-hidden', 'true');
  trigger.appendChild(triggerArrow);

  // Panel (flotante)
  const panel = document.createElement('div');
  panel.className = 'combobox-panel';
  panel.setAttribute('role', 'listbox');
  panel.setAttribute('aria-hidden', 'true');

  // Search input (opcional)
  let searchInput = null;
  if (state.searchable) {
    const searchWrap = document.createElement('div');
    searchWrap.className = 'combobox-search';
    const searchIcon = document.createElement('i');
    searchIcon.className = 'ph ph-magnifying-glass';
    searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Buscar...';
    searchInput.className = 'combobox-search-input';
    searchInput.setAttribute('aria-label', 'Buscar opciones');
    searchWrap.append(searchIcon, searchInput);
    panel.appendChild(searchWrap);

    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.trim().toLowerCase();
      state.activeIndex = 0;
      renderList();
    });
    searchInput.addEventListener('keydown', (e) => handleKeyDown(e));
  }

  // Lista de opciones
  const list = document.createElement('ul');
  list.className = 'combobox-list';
  panel.appendChild(list);

  root.append(trigger, panel);

  // ── Internals ──────────────────────────────────────────────────
  function filterOptions() {
    if (!state.searchQuery) return state.options;
    return state.options.filter((opt) =>
      opt.label.toLowerCase().includes(state.searchQuery)
    );
  }

  function renderList() {
    const filtered = filterOptions();
    list.innerHTML = '';
    if (filtered.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'combobox-empty';
      empty.textContent = state.emptyText;
      list.appendChild(empty);
      return;
    }
    filtered.forEach((opt, idx) => {
      const li = document.createElement('li');
      li.className = 'combobox-option';
      li.dataset.value = opt.value;
      li.dataset.index = idx;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(opt.value === state.value));
      if (opt.value === state.value) li.classList.add('is-selected');
      if (idx === state.activeIndex) li.classList.add('is-active');

      if (opt.icon) {
        const icon = document.createElement('i');
        icon.className = `ph ${opt.icon} combobox-option-icon`;
        li.appendChild(icon);
      }

      const labelBox = document.createElement('span');
      labelBox.className = 'combobox-option-label';
      labelBox.textContent = opt.label;
      li.appendChild(labelBox);

      if (opt.hint) {
        const hint = document.createElement('span');
        hint.className = 'combobox-option-hint';
        hint.textContent = opt.hint;
        li.appendChild(hint);
      }

      if (opt.value === state.value) {
        const check = document.createElement('i');
        check.className = 'ph-fill ph-check combobox-option-check';
        li.appendChild(check);
      }

      li.addEventListener('click', () => selectValue(opt.value));
      li.addEventListener('mouseenter', () => {
        state.activeIndex = idx;
        updateActiveStyles();
      });
      list.appendChild(li);
    });
  }

  function updateActiveStyles() {
    [...list.children].forEach((li, i) => {
      li.classList.toggle('is-active', i === state.activeIndex);
    });
  }

  function renderTrigger() {
    const selected = state.options.find((o) => o.value === state.value);
    if (selected) {
      triggerLabel.textContent = selected.label;
      triggerLabel.classList.remove('is-placeholder');
    } else {
      triggerLabel.textContent = state.placeholder;
      triggerLabel.classList.add('is-placeholder');
    }
  }

  function selectValue(newValue) {
    if (newValue === state.value) {
      close();
      return;
    }
    state.value = newValue;
    const option = state.options.find((o) => o.value === newValue);
    renderTrigger();
    state.onChange(newValue, option);
    close();
  }

  function open() {
    if (state.disabled || state.isOpen) return;
    if (activeCombobox && activeCombobox !== api) activeCombobox.close();
    activeCombobox = api;
    state.isOpen = true;
    state.searchQuery = '';
    state.activeIndex = Math.max(
      0,
      state.options.findIndex((o) => o.value === state.value)
    );
    if (searchInput) searchInput.value = '';
    root.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
    panel.setAttribute('aria-hidden', 'false');
    positionPanel();
    renderList();
    // Focus en search si existe, sino en panel
    requestAnimationFrame(() => {
      if (searchInput) searchInput.focus();
    });
  }

  function close() {
    if (!state.isOpen) return;
    state.isOpen = false;
    root.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
    panel.setAttribute('aria-hidden', 'true');
    if (activeCombobox === api) activeCombobox = null;
  }

  function positionPanel() {
    // Detecta si hay espacio debajo, sino abre hacia arriba
    const rect = trigger.getBoundingClientRect();
    const panelMaxHeight = 280;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    if (spaceBelow < panelMaxHeight && spaceAbove > spaceBelow) {
      root.classList.add('opens-up');
    } else {
      root.classList.remove('opens-up');
    }
  }

  function handleKeyDown(e) {
    const filtered = filterOptions();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      state.activeIndex = Math.min(state.activeIndex + 1, filtered.length - 1);
      updateActiveStyles();
      scrollIntoActive();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      state.activeIndex = Math.max(state.activeIndex - 1, 0);
      updateActiveStyles();
      scrollIntoActive();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = filtered[state.activeIndex];
      if (opt) selectValue(opt.value);
    } else if (e.key === 'Tab') {
      close();
    }
  }

  function scrollIntoActive() {
    const activeEl = list.querySelector('.combobox-option.is-active');
    if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });
  }

  // Event listeners
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    state.isOpen ? close() : open();
  });
  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      open();
    }
  });

  // API pública
  const api = {
    element: root,
    trigger,
    setValue(newValue, { silent = false } = {}) {
      if (newValue === state.value) return;
      state.value = newValue;
      renderTrigger();
      if (!silent) {
        const option = state.options.find((o) => o.value === newValue);
        state.onChange(newValue, option);
      }
    },
    setOptions(newOptions) {
      state.options = newOptions || [];
      renderTrigger();
      if (state.isOpen) renderList();
    },
    getValue() { return state.value; },
    getOption() { return state.options.find((o) => o.value === state.value); },
    open,
    close,
    setDisabled(disabled) {
      state.disabled = disabled;
      trigger.disabled = disabled;
      root.classList.toggle('is-disabled', disabled);
    },
    destroy() {
      close();
      root.remove();
      COMBOBOX_REGISTRY.delete(root);
    },
  };

  COMBOBOX_REGISTRY.set(root, api);
  renderTrigger();
  return api;
}

/**
 * Convierte un <select> existente en un combobox estilado.
 * Mantiene el <select> oculto para compatibilidad con form submission.
 * @param {HTMLSelectElement} selectEl
 * @param {Object} [opts]
 * @returns {Object} API del combobox
 */
export function mountCombobox(selectEl, opts = {}) {
  if (!selectEl || selectEl.tagName !== 'SELECT') {
    throw new Error('mountCombobox: se requiere un <select>');
  }
  if (selectEl.dataset.comboboxMounted === '1') {
    return COMBOBOX_REGISTRY.get(selectEl.nextElementSibling);
  }

  const options = [...selectEl.options].map((opt) => ({
    value: opt.value,
    label: opt.textContent.trim(),
    icon: opt.dataset.icon || undefined,
    hint: opt.dataset.hint || undefined,
  }));

  const cb = createCombobox({
    options,
    value: selectEl.value,
    placeholder: selectEl.dataset.placeholder || selectEl.getAttribute('placeholder') || 'Selecciona...',
    searchable: opts.searchable ?? selectEl.dataset.searchable === 'true',
    disabled: selectEl.disabled,
    className: selectEl.dataset.comboboxClass || '',
    onChange: (newValue) => {
      selectEl.value = newValue;
      selectEl.dispatchEvent(new Event('change', { bubbles: true }));
      opts.onChange?.(newValue);
    },
  });

  // Oculta el <select> pero mantiene su rol para forms
  selectEl.style.position = 'absolute';
  selectEl.style.opacity = '0';
  selectEl.style.pointerEvents = 'none';
  selectEl.style.width = '1px';
  selectEl.style.height = '1px';
  selectEl.style.overflow = 'hidden';
  selectEl.setAttribute('aria-hidden', 'true');
  selectEl.tabIndex = -1;
  selectEl.dataset.comboboxMounted = '1';

  selectEl.parentNode.insertBefore(cb.element, selectEl.nextSibling);

  // Si el select cambia programáticamente (ej. resetForm), sincronizar
  const observer = new MutationObserver(() => {
    if (cb.getValue() !== selectEl.value) cb.setValue(selectEl.value, { silent: true });
  });
  observer.observe(selectEl, { attributes: true, attributeFilter: ['value'] });

  return cb;
}

/**
 * Helper: monta comboboxes en todos los <select> con data-combobox="true"
 * dentro de un contenedor.
 * @param {HTMLElement} container
 */
export function autoMountComboboxes(container) {
  const selects = container.querySelectorAll('select[data-combobox="true"]');
  selects.forEach((sel) => mountCombobox(sel));
}
