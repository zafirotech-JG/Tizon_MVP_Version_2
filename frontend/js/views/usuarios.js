/**
 * views/usuarios.js — Gestión de equipo (empleados del tenant)
 * Solo accesible a Owner/Manager.
 */
import { ZafiroAPI } from '../core/api-client.js';
import {
  toast, modal, confirm, setLoading,
  renderEmpty, getInitials, escapeHtml,
} from '../core/ui.js';

const state = {
  usuarios: [],
  sucursales: [],
  currentUser: null,
};

export async function mountUsuarios({ container }) {
  state.currentUser = JSON.parse(localStorage.getItem('zafiro_user') || '{}');
  container.innerHTML = renderShell();
  attachEvents(container);
  await reload();
}

function renderShell() {
  return `
    <div class="usuarios-view">
      <header class="view-header">
        <div>
          <h2 class="view-title">Equipo</h2>
          <p class="view-subtitle">Gestiona los usuarios de tu negocio</p>
        </div>
        <div class="view-actions">
          <button class="help-btn" id="btn-view-help" title="Ver tutorial" aria-label="Ver tutorial">
            <i class="ph ph-question"></i>
          </button>
          <button class="btn btn-primary" id="btn-nuevo-usuario">
            <i class="ph ph-user-plus"></i>
            <span class="hide-mobile">Nuevo usuario</span>
          </button>
        </div>
      </header>

      <div id="usuarios-content"></div>
    </div>
  `;
}

async function reload() {
  const content = document.getElementById('usuarios-content');
  if (!content) return;
  content.innerHTML = '<div class="loading-inline"><i class="ph ph-spinner spin"></i> Cargando equipo...</div>';

  try {
    const [usuarios, sucursales] = await Promise.all([
      ZafiroAPI.usuarios.listar(),
      ZafiroAPI.sucursales.listar(),
    ]);
    state.usuarios = usuarios || [];
    state.sucursales = sucursales || [];
  } catch (err) {
    toast(err.message, 'error');
    state.usuarios = [];
    state.sucursales = [];
  }

  render();
}

function render() {
  const el = document.getElementById('usuarios-content');
  if (!el) return;

  if (state.usuarios.length === 0) {
    renderEmpty(el, {
      icon: 'ph-users',
      title: 'Sin usuarios',
      subtitle: 'Invita a tu equipo para que puedan operar el punto de venta.',
      action: {
        label: 'Crear primer usuario',
        icon: 'ph-user-plus',
        onClick: openNuevoUsuario,
      },
    });
    return;
  }

  el.innerHTML = `
    <div class="card-list">
      ${state.usuarios.map((u) => renderUsuarioCard(u)).join('')}
    </div>
  `;

  el.querySelectorAll('.btn-delete-user').forEach((b) => {
    b.addEventListener('click', () => handleDeleteUsuario(parseInt(b.dataset.id, 10)));
  });
}

function renderUsuarioCard(u) {
  const isMe = u.id === state.currentUser?.id;
  const suc = state.sucursales.find((s) => s.id === u.sucursal_id);
  const canDelete = !isMe && state.currentUser?.rol === 'owner';

  const rolBadge = {
    owner:      { icon: 'ph-crown',      color: 'success',   label: 'Propietario' },
    manager:    { icon: 'ph-briefcase',  color: 'primary',   label: 'Manager' },
    cajero:     { icon: 'ph-cash-register', color: 'info',   label: 'Cajero' },
    inventario: { icon: 'ph-package',    color: 'warning',   label: 'Inventario' },
    super_admin:{ icon: 'ph-shield',     color: 'danger',    label: 'Super Admin' },
  }[u.rol] || { icon: 'ph-user', color: 'ghost', label: u.rol };

  return `
    <div class="card usuario-card" data-id="${u.id}">
      <div class="card-body">
        <div class="usuario-avatar">${escapeHtml(getInitials(u.nombre))}</div>
        <div class="usuario-info">
          <div class="usuario-header">
            <h4>${escapeHtml(u.nombre)} ${isMe ? '<small class="text-secondary">(tú)</small>' : ''}</h4>
            <span class="badge badge-${rolBadge.color}">
              <i class="ph ${rolBadge.icon}"></i> ${rolBadge.label}
            </span>
          </div>
          <div class="usuario-meta">
            <span><i class="ph ph-envelope"></i> ${escapeHtml(u.email)}</span>
            ${suc ? `<span><i class="ph ph-storefront"></i> ${escapeHtml(suc.nombre)}</span>` : ''}
          </div>
        </div>
        <div class="usuario-actions">
          ${canDelete ? `
            <button class="btn-icon btn-delete-user" data-id="${u.id}" title="Desactivar">
              <i class="ph ph-user-minus"></i>
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────────
// NEW USUARIO
// ─────────────────────────────────────────────────────────────────
async function openNuevoUsuario() {
  const isOwner = state.currentUser?.rol === 'owner';
  const rolesDisponibles = isOwner
    ? [
      { value: 'manager',    label: 'Manager (acceso admin)' },
      { value: 'cajero',     label: 'Cajero (POS)' },
      { value: 'inventario', label: 'Inventario (productos)' },
    ]
    : [
      { value: 'cajero',     label: 'Cajero (POS)' },
      { value: 'inventario', label: 'Inventario (productos)' },
    ];

  const sucursalesOptions = state.sucursales
    .map((s) => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.nombre)}</option>`)
    .join('');

  await modal({
    title: 'Nuevo usuario',
    body: `
      <form id="form-usuario" class="form-grid">
        <div class="form-field">
          <label class="form-label">Nombre completo *</label>
          <input type="text" class="input" name="nombre" required minlength="2"
                 placeholder="Juan Pérez">
        </div>
        <div class="form-field">
          <label class="form-label">Email *</label>
          <input type="email" class="input" name="email" required
                 placeholder="juan@minegocio.com">
        </div>
        <div class="form-field">
          <label class="form-label">Contraseña *</label>
          <input type="password" class="input" name="password" required minlength="6"
                 placeholder="Mínimo 6 caracteres">
        </div>
        <div class="form-field">
          <label class="form-label">Rol *</label>
          <select class="input" name="rol" required data-combobox="true">
            ${rolesDisponibles.map((r) => `<option value="${r.value}">${r.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-field">
          <label class="form-label">Sucursal asignada</label>
          <select class="input" name="sucursal_id" data-combobox="true">
            <option value="">Sin asignar</option>
            ${sucursalesOptions}
          </select>
        </div>
        <div class="form-field">
          <label class="form-label">PIN rápido (opcional)</label>
          <input type="text" class="input" name="pin" pattern="[0-9]{4,6}" maxlength="6"
                 placeholder="4-6 dígitos — para login táctil rápido">
          <small class="form-hint">Los cajeros pueden entrar rápido con PIN sin email+contraseña.</small>
        </div>
      </form>
    `,
    actions: [
      { label: 'Cancelar', variant: 'ghost', value: null },
      {
        label: 'Crear usuario',
        variant: 'primary',
        icon: 'ph-user-plus',
        onClick: async (dialog) => {
          const form = dialog.querySelector('#form-usuario');
          const data = Object.fromEntries(new FormData(form));
          if (!data.nombre?.trim() || !data.email || !data.password || !data.rol) {
            toast('Completa todos los campos obligatorios', 'warning');
            return false;
          }
          // Normalizar vacíos
          if (!data.sucursal_id) delete data.sucursal_id;
          if (!data.pin) delete data.pin;

          const btn = dialog.querySelector('[data-action="1"]');
          setLoading(btn, true, 'Creando...');

          try {
            await ZafiroAPI.usuarios.crear(data);
            toast(`Usuario ${data.nombre} creado`, 'success');
            // Marca el paso 'invitar equipo' del onboarding (idempotente)
            import('../core/onboarding.js')
              .then((m) => m.notifyTeamInvited())
              .catch(() => {});
            await reload();
            return true;
          } catch (err) {
            setLoading(btn, false);
            toast(err.message, 'error');
            return false;
          }
        },
      },
    ],
  });
}

async function handleDeleteUsuario(id) {
  const u = state.usuarios.find((x) => x.id === id);
  if (!u) return;
  const ok = await confirm(
    `¿Desactivar a ${u.nombre}? Ya no podrá iniciar sesión.`,
    { danger: true, okLabel: 'Desactivar' }
  );
  if (!ok) return;

  try {
    await ZafiroAPI.usuarios.eliminar(id);
    toast(`${u.nombre} fue desactivado`, 'success');
    await reload();
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ─────────────────────────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────────────────────────
function attachEvents(container) {
  container.querySelector('#btn-nuevo-usuario')?.addEventListener('click', openNuevoUsuario);

  container.querySelector('#btn-view-help')?.addEventListener('click', () => {
    import('../core/tutorial-manager.js')
      .then((m) => m.startMiniTutorial('usuarios', { force: true }))
      .catch(() => {});
  });
}
