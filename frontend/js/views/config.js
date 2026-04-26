/**
 * views/config.js — Configuración: Branding + Sucursales + Negocio
 * Solo accesible a Owner/Manager.
 */
import { ZafiroAPI } from '../core/api-client.js';
import {
  toast, modal, confirm, prompt, setLoading,
  renderEmpty, escapeHtml,
} from '../core/ui.js';
import { autoMountComboboxes } from '../core/combobox.js';

const state = {
  branding: null,
  sucursales: [],
  activeTab: 'branding',
};

export async function mountConfig({ container }) {
  container.innerHTML = renderShell();
  attachEvents(container);
  await loadBranding();
  await loadSucursales();
}

function renderShell() {
  return `
    <div class="config-view">
      <header class="view-header">
        <div>
          <h2 class="view-title">Configuración</h2>
          <p class="view-subtitle">Personaliza tu negocio</p>
        </div>
        <div class="view-actions">
          <button class="help-btn" id="btn-view-help" title="Ver tutorial" aria-label="Ver tutorial">
            <i class="ph ph-question"></i>
          </button>
        </div>
      </header>

      <div class="tabs">
        <button class="tab active" data-tab="branding">
          <i class="ph ph-palette"></i> Marca
        </button>
        <button class="tab" data-tab="sucursales">
          <i class="ph ph-storefront"></i> Sucursales
        </button>
        <button class="tab" data-tab="negocio">
          <i class="ph ph-buildings"></i> Negocio
        </button>
      </div>

      <div id="config-branding" class="config-section active">
        <div class="loading-inline"><i class="ph ph-spinner spin"></i> Cargando marca...</div>
      </div>
      <div id="config-sucursales" class="config-section" hidden>
        <div class="loading-inline"><i class="ph ph-spinner spin"></i> Cargando sucursales...</div>
      </div>
      <div id="config-negocio" class="config-section" hidden>
        <!-- rendered below -->
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────────
// BRANDING
// ─────────────────────────────────────────────────────────────────
async function loadBranding() {
  try {
    state.branding = await ZafiroAPI.branding.get();
  } catch (err) {
    toast(`Branding: ${err.message}`, 'error');
    state.branding = null;
  }
  renderBrandingForm();
}

function renderBrandingForm() {
  const el = document.getElementById('config-branding');
  if (!el) return;
  const b = state.branding || {};

  el.innerHTML = `
    <div class="config-grid">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="ph ph-storefront"></i> Identidad</h3>
        </div>
        <div class="card-body">
          <form id="form-branding" class="form-grid">
            <div class="form-field">
              <label class="form-label">Nombre comercial</label>
              <input type="text" class="input" name="nombre_comercial" required
                     value="${escapeHtml(b.nombre_comercial || '')}"
                     placeholder="Mi Negocio">
            </div>

            <div class="form-field">
              <label class="form-label">Logo (URL)</label>
              <input type="url" class="input" name="logo_url"
                     value="${escapeHtml(b.logo_url || '')}"
                     placeholder="https://...">
              <small class="form-hint">Déjalo vacío para usar el logo Zafiro por defecto.</small>
            </div>

            <div class="form-field">
              <label class="form-label">Tipo de negocio</label>
              <select class="input" name="nicho" data-combobox="true">
                ${['restaurante', 'retail', 'farmacia', 'servicio', 'otro']
                  .map((n) => `<option value="${n}" ${b.nicho === n ? 'selected' : ''}>${capitalize(n)}</option>`)
                  .join('')}
              </select>
            </div>

            <div class="form-field">
              <label class="form-label">Tema visual</label>
              <div class="theme-selector">
                ${['dark', 'light', 'warm'].map((t) => `
                  <label class="theme-option ${b.tema === t ? 'selected' : ''}">
                    <input type="radio" name="tema" value="${t}" ${b.tema === t ? 'checked' : ''}>
                    <span class="theme-preview theme-${t}"></span>
                    <span>${capitalize(t)}</span>
                  </label>
                `).join('')}
              </div>
            </div>

            <div class="form-field">
              <label class="form-label">Tipografía</label>
              <select class="input" name="tipografia" data-combobox="true">
                ${['Inter', 'Roboto', 'Poppins', 'Nunito', 'Lato']
                  .map((t) => `<option value="${t}" ${b.tipografia === t ? 'selected' : ''}>${t}</option>`)
                  .join('')}
              </select>
            </div>
          </form>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="ph ph-palette"></i> Colores</h3>
        </div>
        <div class="card-body">
          <div class="form-grid">
            ${colorField('color_primary', 'Color primario', b.color_primary || '#e25822')}
            ${colorField('color_secondary', 'Color secundario', b.color_secondary || '#1a1714')}
            ${colorField('color_accent', 'Color de acento', b.color_accent || '#22c55e')}
          </div>
          <div id="color-preview" class="color-preview">
            <div class="preview-btn" style="background: ${escapeHtml(b.color_primary || '#e25822')};">Primario</div>
            <div class="preview-btn" style="background: ${escapeHtml(b.color_secondary || '#1a1714')};">Secundario</div>
            <div class="preview-btn" style="background: ${escapeHtml(b.color_accent || '#22c55e')};">Acento</div>
          </div>
        </div>
      </div>
    </div>

    <div class="form-actions" style="margin-top: 16px;">
      <button class="btn btn-primary" id="btn-save-branding">
        <i class="ph ph-floppy-disk"></i>
        Guardar cambios
      </button>
    </div>
  `;

  // Live preview de colores
  el.querySelectorAll('input[type="color"]').forEach((input) => {
    input.addEventListener('input', (e) => {
      const field = e.target.name;
      const val = e.target.value;
      const hex = el.querySelector(`[data-hex-for="${field}"]`);
      if (hex) hex.value = val;
      updateColorPreview();
      // Live update del sync con text field
    });
  });
  el.querySelectorAll('input[data-hex-for]').forEach((input) => {
    input.addEventListener('input', (e) => {
      const field = e.target.dataset.hexFor;
      const colorInput = el.querySelector(`input[type="color"][name="${field}"]`);
      const val = e.target.value;
      if (/^#[0-9a-fA-F]{6}$/.test(val) && colorInput) {
        colorInput.value = val;
        updateColorPreview();
      }
    });
  });

  // Theme selector UI
  el.querySelectorAll('.theme-option input').forEach((input) => {
    input.addEventListener('change', () => {
      el.querySelectorAll('.theme-option').forEach((o) => o.classList.remove('selected'));
      input.closest('.theme-option').classList.add('selected');
    });
  });

  el.querySelector('#btn-save-branding').addEventListener('click', saveBranding);

  // Auto-mount comboboxes en los selects del form (nicho, tipografia)
  autoMountComboboxes(el);
}

function colorField(name, label, value) {
  return `
    <div class="form-field">
      <label class="form-label">${label}</label>
      <div class="color-input-group">
        <input type="color" name="${name}" value="${escapeHtml(value)}">
        <input type="text" class="input" data-hex-for="${name}"
               value="${escapeHtml(value)}" placeholder="#rrggbb" maxlength="7">
      </div>
    </div>
  `;
}

function updateColorPreview() {
  const el = document.getElementById('config-branding');
  const preview = el?.querySelector('#color-preview');
  if (!preview) return;
  const primary = el.querySelector('input[type="color"][name="color_primary"]').value;
  const secondary = el.querySelector('input[type="color"][name="color_secondary"]').value;
  const accent = el.querySelector('input[type="color"][name="color_accent"]').value;
  const btns = preview.querySelectorAll('.preview-btn');
  if (btns[0]) btns[0].style.background = primary;
  if (btns[1]) btns[1].style.background = secondary;
  if (btns[2]) btns[2].style.background = accent;
}

async function saveBranding() {
  const form = document.getElementById('form-branding');
  if (!form) return;

  const data = Object.fromEntries(new FormData(form));
  // Añadir colores
  document.querySelectorAll('#config-branding input[type="color"]').forEach((c) => {
    data[c.name] = c.value;
  });

  const btn = document.getElementById('btn-save-branding');
  setLoading(btn, true, 'Guardando...');
  btn.disabled = true;

  try {
    const updated = await ZafiroAPI.branding.update(data);
    state.branding = updated;
    toast('Marca actualizada', 'success');

    // Aplicar inmediatamente
    document.body.setAttribute('data-theme', updated.tema || 'dark');
    document.documentElement.style.setProperty('--tenant-primary', updated.color_primary);
    document.documentElement.style.setProperty('--tenant-secondary', updated.color_secondary);
    document.documentElement.style.setProperty('--tenant-accent', updated.color_accent);

    // Marca el paso 'branding' del onboarding (idempotente)
    import('../core/onboarding.js')
      .then((m) => m.markStepCompleted('branding'))
      .catch(() => {});
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setLoading(btn, false);
    btn.disabled = false;
  }
}

// ─────────────────────────────────────────────────────────────────
// SUCURSALES
// ─────────────────────────────────────────────────────────────────
async function loadSucursales() {
  try {
    state.sucursales = await ZafiroAPI.sucursales.listar();
  } catch (err) {
    toast(`Sucursales: ${err.message}`, 'error');
    state.sucursales = [];
  }
  renderSucursales();
}

function renderSucursales() {
  const el = document.getElementById('config-sucursales');
  if (!el) return;

  if (state.sucursales.length === 0) {
    renderEmpty(el, {
      icon: 'ph-storefront',
      title: 'Sin sucursales',
      subtitle: 'Añade tu primera sucursal para empezar.',
      action: { label: 'Crear sucursal', icon: 'ph-plus', onClick: openNuevaSucursal },
    });
    return;
  }

  el.innerHTML = `
    <div class="card-list">
      ${state.sucursales.map((s) => `
        <div class="card sucursal-card" data-id="${escapeHtml(s.id)}">
          <div class="card-body">
            <div class="sucursal-info">
              <div class="sucursal-icon"><i class="ph-fill ph-storefront"></i></div>
              <div>
                <h4>${escapeHtml(s.nombre)}</h4>
                <small class="text-secondary">ID: ${escapeHtml(s.id.slice(0, 8))}...</small>
              </div>
            </div>
            <div class="sucursal-actions">
              <button class="btn-icon btn-edit-suc" data-id="${escapeHtml(s.id)}" title="Renombrar">
                <i class="ph ph-pencil-simple"></i>
              </button>
              <button class="btn-icon btn-delete-suc" data-id="${escapeHtml(s.id)}" title="Eliminar">
                <i class="ph ph-trash"></i>
              </button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="form-actions" style="margin-top: 16px;">
      <button class="btn btn-primary" id="btn-nueva-sucursal">
        <i class="ph ph-plus"></i>
        Agregar sucursal
      </button>
    </div>
  `;

  el.querySelector('#btn-nueva-sucursal')?.addEventListener('click', openNuevaSucursal);
  el.querySelectorAll('.btn-edit-suc').forEach((b) => {
    b.addEventListener('click', () => editSucursal(b.dataset.id));
  });
  el.querySelectorAll('.btn-delete-suc').forEach((b) => {
    b.addEventListener('click', () => deleteSucursal(b.dataset.id));
  });
}

async function openNuevaSucursal() {
  const nombre = await prompt('Nombre de la sucursal:', {
    title: 'Nueva sucursal',
    placeholder: 'Ej: Sucursal Norte',
    okLabel: 'Crear',
  });
  if (!nombre) return;

  try {
    await ZafiroAPI.sucursales.crear({ nombre });
    toast('Sucursal creada', 'success');
    await loadSucursales();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function editSucursal(id) {
  const suc = state.sucursales.find((s) => s.id === id);
  if (!suc) return;
  const nombre = await prompt('Nuevo nombre:', {
    title: 'Renombrar sucursal',
    defaultValue: suc.nombre,
    okLabel: 'Guardar',
  });
  if (!nombre) return;

  try {
    await ZafiroAPI.sucursales.editar(id, { nombre });
    toast('Sucursal renombrada', 'success');
    await loadSucursales();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function deleteSucursal(id) {
  const suc = state.sucursales.find((s) => s.id === id);
  if (!suc) return;
  if (state.sucursales.length <= 1) {
    toast('Debes tener al menos una sucursal activa', 'warning');
    return;
  }
  const ok = await confirm(`¿Eliminar sucursal "${suc.nombre}"?`, {
    danger: true, okLabel: 'Eliminar',
  });
  if (!ok) return;

  try {
    await ZafiroAPI.sucursales.eliminar(id);
    toast('Sucursal eliminada', 'success');
    await loadSucursales();
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ─────────────────────────────────────────────────────────────────
// NEGOCIO (info general)
// ─────────────────────────────────────────────────────────────────
function renderNegocio() {
  const el = document.getElementById('config-negocio');
  if (!el) return;

  const user = JSON.parse(localStorage.getItem('zafiro_user') || '{}');
  el.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title"><i class="ph ph-info"></i> Información del negocio</h3>
      </div>
      <div class="card-body">
        <div class="info-grid">
          <div class="info-row">
            <span class="info-label">Email de contacto</span>
            <span class="info-value">${escapeHtml(user.email || '—')}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Nombre comercial</span>
            <span class="info-value">${escapeHtml(state.branding?.nombre_comercial || '—')}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Tipo de negocio</span>
            <span class="info-value">${escapeHtml(capitalize(state.branding?.nicho || '—'))}</span>
          </div>
          <div class="info-row">
            <span class="info-label">ID Tenant</span>
            <span class="info-value"><code>${escapeHtml(String(user.tenant_id || '—'))}</code></span>
          </div>
          <div class="info-row">
            <span class="info-label">Tu rol</span>
            <span class="info-value"><span class="badge badge-primary">${escapeHtml(user.rol || '—')}</span></span>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────────────────────────
function attachEvents(container) {
  container.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      state.activeTab = target;

      container.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      container.querySelectorAll('.config-section').forEach((s) => {
        s.hidden = true;
        s.classList.remove('active');
      });
      const section = container.querySelector(`#config-${target}`);
      if (section) {
        section.hidden = false;
        section.classList.add('active');
      }

      if (target === 'negocio') renderNegocio();
    });
  });

  container.querySelector('#btn-view-help')?.addEventListener('click', () => {
    import('../core/tutorial-manager.js')
      .then((m) => m.startMiniTutorial('config', { force: true }))
      .catch(() => {});
  });
}

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
