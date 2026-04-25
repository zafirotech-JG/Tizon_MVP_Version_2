/**
 * views/inventario.js — CRUD de productos y categorías.
 */
import { ZafiroAPI } from '../core/api-client.js';
import {
  toast, modal, confirm, formatCurrency, setLoading,
  renderEmpty, debounce, escapeHtml,
} from '../core/ui.js';

const state = {
  sucursalId: null,
  productos: [],
  categorias: [],
  busqueda: '',
  tab: 'productos',
};

export async function mountInventario({ container, sucursalId }) {
  state.sucursalId = sucursalId;
  container.innerHTML = renderShell();
  attachEvents(container);
  await reload();
}

function renderShell() {
  return `
    <div class="inventario-view">
      <header class="view-header">
        <div>
          <h2 class="view-title">Inventario</h2>
          <p class="view-subtitle">Administra tus productos y categorías</p>
        </div>
        <div class="view-actions">
          <button class="help-btn" id="btn-view-help" title="Ver tutorial" aria-label="Ver tutorial">
            <i class="ph ph-question"></i>
          </button>
          <button class="btn btn-primary" id="btn-nuevo-producto">
            <i class="ph ph-plus"></i>
            <span class="hide-mobile">Nuevo producto</span>
          </button>
        </div>
      </header>

      <div class="tabs">
        <button class="tab active" data-tab="productos">
          <i class="ph ph-package"></i> Productos
        </button>
        <button class="tab" data-tab="categorias">
          <i class="ph ph-tag"></i> Categorías
        </button>
      </div>

      <div class="filter-bar">
        <div class="search-box">
          <i class="ph ph-magnifying-glass"></i>
          <input type="text" id="inv-search" placeholder="Buscar..." autocomplete="off">
        </div>
      </div>

      <div id="inv-content"></div>
    </div>
  `;
}

async function reload() {
  const content = document.getElementById('inv-content');
  if (!content) return;
  content.innerHTML = '<div class="loading-inline"><i class="ph ph-spinner spin"></i> Cargando...</div>';

  try {
    const [productos, categorias] = await Promise.all([
      ZafiroAPI.productos.listar(state.sucursalId),
      ZafiroAPI.categorias.listar(state.sucursalId),
    ]);
    state.productos = productos || [];
    state.categorias = categorias || [];
  } catch (err) {
    toast(`Error: ${err.message}`, 'error');
    state.productos = [];
    state.categorias = [];
  }

  render();
}

function render() {
  if (state.tab === 'productos') renderProductos();
  else renderCategorias();
}

function renderProductos() {
  const el = document.getElementById('inv-content');
  if (!el) return;

  const q = state.busqueda.toLowerCase();
  const filtered = state.productos.filter((p) => {
    if (!q) return true;
    return p.nombre.toLowerCase().includes(q) ||
           (p.categoria || '').toLowerCase().includes(q);
  });

  if (filtered.length === 0) {
    renderEmpty(el, {
      icon: 'ph-package',
      title: state.productos.length === 0 ? 'Sin productos' : 'Sin resultados',
      subtitle: state.productos.length === 0
        ? 'Crea tu primer producto para empezar a vender.'
        : 'Intenta con otra búsqueda.',
      action: state.productos.length === 0 ? {
        label: 'Crear producto',
        icon: 'ph-plus',
        onClick: () => openProductoModal(),
      } : null,
    });
    return;
  }

  el.innerHTML = `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Categoría</th>
            <th class="text-right">Precio</th>
            <th>Estado</th>
            <th class="text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map((p) => `
            <tr data-id="${escapeHtml(p.id)}">
              <td>
                <div class="cell-main">
                  <strong>${escapeHtml(p.nombre)}</strong>
                  ${p.insumos ? `<small class="text-secondary">${escapeHtml(p.insumos)}</small>` : ''}
                </div>
              </td>
              <td><span class="badge">${escapeHtml(p.categoria || '—')}</span></td>
              <td class="text-right"><strong>${formatCurrency(p.precio)}</strong></td>
              <td>
                ${p.activo !== false
                  ? '<span class="badge badge-success"><i class="ph ph-check-circle"></i> Activo</span>'
                  : '<span class="badge badge-ghost">Inactivo</span>'}
              </td>
              <td class="text-right">
                <button class="btn-icon btn-icon-sm btn-edit" data-id="${escapeHtml(p.id)}" title="Editar">
                  <i class="ph ph-pencil-simple"></i>
                </button>
                <button class="btn-icon btn-icon-sm btn-delete" data-id="${escapeHtml(p.id)}" title="Eliminar">
                  <i class="ph ph-trash"></i>
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  el.querySelectorAll('.btn-edit').forEach((b) => {
    b.addEventListener('click', () => {
      const producto = state.productos.find((p) => p.id === b.dataset.id);
      if (producto) openProductoModal(producto);
    });
  });

  el.querySelectorAll('.btn-delete').forEach((b) => {
    b.addEventListener('click', () => handleDeleteProducto(b.dataset.id));
  });
}

function renderCategorias() {
  const el = document.getElementById('inv-content');
  if (!el) return;

  const q = state.busqueda.toLowerCase();
  const filtered = state.categorias.filter((c) => !q || c.nombre.toLowerCase().includes(q));

  if (filtered.length === 0) {
    renderEmpty(el, {
      icon: 'ph-tag',
      title: state.categorias.length === 0 ? 'Sin categorías' : 'Sin resultados',
      subtitle: state.categorias.length === 0
        ? 'Crea categorías para organizar tus productos.'
        : 'Intenta con otra búsqueda.',
      action: state.categorias.length === 0 ? {
        label: 'Crear categoría',
        icon: 'ph-plus',
        onClick: () => openCategoriaModal(),
      } : null,
    });
    return;
  }

  el.innerHTML = `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Categoría</th>
            <th class="text-right">Productos</th>
            <th class="text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map((c) => {
            const count = state.productos.filter((p) => p.categoria === c.nombre).length;
            return `
              <tr data-id="${escapeHtml(c.id)}">
                <td><strong>${escapeHtml(c.nombre)}</strong></td>
                <td class="text-right">${count}</td>
                <td class="text-right">
                  <button class="btn-icon btn-icon-sm btn-edit-cat" data-id="${escapeHtml(c.id)}" title="Editar">
                    <i class="ph ph-pencil-simple"></i>
                  </button>
                  <button class="btn-icon btn-icon-sm btn-delete-cat" data-id="${escapeHtml(c.id)}" title="Eliminar">
                    <i class="ph ph-trash"></i>
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  el.querySelectorAll('.btn-edit-cat').forEach((b) => {
    b.addEventListener('click', () => {
      const cat = state.categorias.find((c) => c.id === b.dataset.id);
      if (cat) openCategoriaModal(cat);
    });
  });

  el.querySelectorAll('.btn-delete-cat').forEach((b) => {
    b.addEventListener('click', () => handleDeleteCategoria(b.dataset.id));
  });
}

// ─────────────────────────────────────────────────────────────────
// MODALS — PRODUCTO
// ─────────────────────────────────────────────────────────────────
async function openProductoModal(producto = null) {
  const isEdit = !!producto;
  const categoriasOptions = state.categorias
    .map((c) => `<option value="${escapeHtml(c.nombre)}" ${producto?.categoria === c.nombre ? 'selected' : ''}>${escapeHtml(c.nombre)}</option>`)
    .join('');

  await modal({
    title: isEdit ? 'Editar producto' : 'Nuevo producto',
    onMount: (dialog) => {
      // Toggle del input "nueva categoría" según selección del combobox
      const sel = dialog.querySelector('#select-categoria-producto');
      const inp = dialog.querySelector('#input-nueva-categoria');
      if (!sel || !inp) return;
      const sync = () => {
        const isNueva = sel.value === '__nueva__';
        inp.hidden = !isNueva;
        if (isNueva) setTimeout(() => inp.focus(), 50);
        else inp.value = '';
      };
      sel.addEventListener('change', sync);
      sync();
    },
    body: `
      <form id="form-producto" class="form-grid">
        <div class="form-field">
          <label class="form-label">Nombre *</label>
          <input type="text" class="input" name="nombre" required
                 value="${escapeHtml(producto?.nombre || '')}"
                 placeholder="Ej: Hamburguesa doble">
        </div>
        <div class="form-field">
          <label class="form-label">Precio *</label>
          <input type="number" class="input" name="precio" required min="0" step="100"
                 value="${producto?.precio || ''}"
                 placeholder="15000">
        </div>
        <div class="form-field">
          <label class="form-label">Categoría</label>
          <select class="input" name="categoria" id="select-categoria-producto" data-combobox="true" data-searchable="true">
            <option value="General">General</option>
            ${categoriasOptions}
            <option value="__nueva__">+ Crear nueva categoría…</option>
          </select>
          <input type="text" class="input" id="input-nueva-categoria"
                 placeholder="Nombre de la nueva categoría" hidden style="margin-top: 8px;">
        </div>
        <div class="form-field">
          <label class="form-label">Insumos / Notas (opcional)</label>
          <textarea class="input" name="insumos" rows="2"
                    placeholder="Ingredientes o notas internas">${escapeHtml(producto?.insumos || '')}</textarea>
        </div>
      </form>
    `,
    actions: [
      { label: 'Cancelar', variant: 'ghost', value: null },
      {
        label: isEdit ? 'Guardar cambios' : 'Crear producto',
        variant: 'primary',
        icon: isEdit ? 'ph-check' : 'ph-plus',
        onClick: async (dialog) => {
          const form = dialog.querySelector('#form-producto');
          const data = Object.fromEntries(new FormData(form));
          data.precio = Number(data.precio);
          if (!data.nombre?.trim() || !data.precio) {
            toast('Completa nombre y precio', 'warning');
            return false;
          }
          // Si el usuario eligió "crear nueva categoría", crearla on-the-fly desde el input inline
          if (data.categoria === '__nueva__') {
            const nuevaInput = dialog.querySelector('#input-nueva-categoria');
            const nombreCat = (nuevaInput?.value || '').trim();
            if (!nombreCat) {
              toast('Escribe un nombre para la nueva categoría', 'warning');
              nuevaInput?.focus();
              return false;
            }
            try {
              await ZafiroAPI.categorias.crear({ nombre: nombreCat, sucursal_id: state.sucursalId });
              data.categoria = nombreCat;
              state.categorias = await ZafiroAPI.categorias.listar(state.sucursalId);
            } catch (err) {
              toast(`No se pudo crear la categoría: ${err.message}`, 'error');
              return false;
            }
          }
          data.sucursal_id = state.sucursalId;

          try {
            if (isEdit) {
              await ZafiroAPI.productos.editar(producto.id, data);
              toast('Producto actualizado', 'success');
            } else {
              await ZafiroAPI.productos.crear(data);
              toast('Producto creado', 'success');
              // Marca el paso 'primer producto' del onboarding (idempotente)
              import('../core/onboarding.js')
                .then((m) => m.markStepCompleted('first_product'))
                .catch(() => {});
            }
            await reload();
            return true;
          } catch (err) {
            toast(err.message, 'error');
            return false;
          }
        },
      },
    ],
  });
}

async function handleDeleteProducto(id) {
  const prod = state.productos.find((p) => p.id === id);
  if (!prod) return;
  const ok = await confirm(`¿Eliminar "${prod.nombre}"? Esta acción no se puede deshacer.`, {
    danger: true, okLabel: 'Eliminar',
  });
  if (!ok) return;

  try {
    await ZafiroAPI.productos.eliminar(id);
    toast('Producto eliminado', 'success');
    await reload();
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ─────────────────────────────────────────────────────────────────
// MODALS — CATEGORIA
// ─────────────────────────────────────────────────────────────────
async function openCategoriaModal(categoria = null) {
  const isEdit = !!categoria;
  await modal({
    title: isEdit ? 'Editar categoría' : 'Nueva categoría',
    body: `
      <form id="form-cat" class="form-grid">
        <div class="form-field">
          <label class="form-label">Nombre *</label>
          <input type="text" class="input input-lg" name="nombre" required
                 value="${escapeHtml(categoria?.nombre || '')}"
                 placeholder="Ej: Bebidas">
        </div>
      </form>
    `,
    actions: [
      { label: 'Cancelar', variant: 'ghost', value: null },
      {
        label: isEdit ? 'Guardar' : 'Crear',
        variant: 'primary',
        icon: 'ph-check',
        onClick: async (dialog) => {
          const nombre = dialog.querySelector('[name="nombre"]').value.trim();
          if (!nombre) {
            toast('Ingresa un nombre', 'warning');
            return false;
          }
          try {
            if (isEdit) {
              await ZafiroAPI.categorias.editar(categoria.id, { nombre });
              toast('Categoría actualizada', 'success');
            } else {
              await ZafiroAPI.categorias.crear({ nombre, sucursal_id: state.sucursalId });
              toast('Categoría creada', 'success');
            }
            await reload();
            return true;
          } catch (err) {
            toast(err.message, 'error');
            return false;
          }
        },
      },
    ],
  });
}

async function handleDeleteCategoria(id) {
  const cat = state.categorias.find((c) => c.id === id);
  if (!cat) return;
  const count = state.productos.filter((p) => p.categoria === cat.nombre).length;
  const warning = count > 0
    ? `Esta categoría tiene ${count} productos. ¿Eliminar de todas formas?`
    : `¿Eliminar la categoría "${cat.nombre}"?`;
  const ok = await confirm(warning, { danger: true, okLabel: 'Eliminar' });
  if (!ok) return;

  try {
    await ZafiroAPI.categorias.eliminar(id);
    toast('Categoría eliminada', 'success');
    await reload();
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ─────────────────────────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────────────────────────
function attachEvents(container) {
  // Tabs
  container.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      state.tab = tab.dataset.tab;
      render();

      // Actualizar botón "Nuevo"
      const btnNuevo = container.querySelector('#btn-nuevo-producto');
      if (btnNuevo) {
        btnNuevo.innerHTML = state.tab === 'productos'
          ? '<i class="ph ph-plus"></i><span class="hide-mobile">Nuevo producto</span>'
          : '<i class="ph ph-plus"></i><span class="hide-mobile">Nueva categoría</span>';
      }
    });
  });

  // Search
  const searchInput = container.querySelector('#inv-search');
  const doSearch = debounce((v) => {
    state.busqueda = v;
    render();
  }, 200);
  searchInput?.addEventListener('input', (e) => doSearch(e.target.value));

  // Nuevo (contextual)
  container.querySelector('#btn-nuevo-producto')?.addEventListener('click', () => {
    if (state.tab === 'productos') openProductoModal();
    else openCategoriaModal();
  });

  // Botón de ayuda (?) — re-lanza el mini-tutorial
  container.querySelector('#btn-view-help')?.addEventListener('click', () => {
    import('../core/tutorial-manager.js')
      .then((m) => m.startMiniTutorial('inventario', { force: true }))
      .catch(() => {});
  });
}
