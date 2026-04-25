/**
 * views/pos.js — Vista Punto de Venta (POS)
 * Funcionalidad: buscar productos, agregar al carrito, cobrar y emitir órdenes.
 * Optimizado mobile-first y touch-friendly.
 */
import { ZafiroAPI } from '../core/api-client.js';
import {
  toast, modal, confirm, formatCurrency, setLoading,
  renderSkeleton, renderEmpty, debounce, escapeHtml,
} from '../core/ui.js';

// ─────────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────────
const state = {
  productos: [],
  categorias: [],
  sucursalId: null,
  cart: [], // [{ producto_id, nombre, precio, cantidad }]
  filtroCategoria: null,
  busqueda: '',
};

// ─────────────────────────────────────────────────────────────────
// MOUNT
// ─────────────────────────────────────────────────────────────────
export async function mountPOS({ container, sucursalId }) {
  state.sucursalId = sucursalId;
  state.cart = loadCartFromStorage();

  container.innerHTML = renderShell();
  attachEvents(container);

  await reload();
  renderCart();
}

function renderShell() {
  return `
    <div class="pos-view">
      <div class="pos-search">
        <div class="search-box">
          <i class="ph ph-magnifying-glass"></i>
          <input type="text" id="pos-search" placeholder="Buscar producto..." autocomplete="off" inputmode="search">
          <button class="btn-icon btn-icon-sm" id="pos-clear-search" title="Limpiar" style="display:none;">
            <i class="ph ph-x"></i>
          </button>
        </div>
        <button class="help-btn" id="btn-view-help" title="Ver tutorial" aria-label="Ver tutorial">
          <i class="ph ph-question"></i>
        </button>
        <div class="pos-category-tabs" id="pos-category-tabs"></div>
      </div>

      <div class="pos-grid" id="pos-grid"></div>

      <aside class="pos-cart" id="pos-cart">
        <div class="cart-header">
          <span class="cart-title"><i class="ph ph-shopping-cart"></i> Carrito</span>
          <span class="cart-count" id="cart-count">0 items</span>
          <button class="btn-icon btn-icon-sm" id="cart-clear" title="Vaciar carrito" style="margin-left:auto;">
            <i class="ph ph-trash"></i>
          </button>
        </div>
        <div class="cart-items" id="cart-items"></div>
        <div class="cart-footer">
          <div class="cart-total">
            <span>Total</span>
            <span class="total-amount" id="cart-total">${formatCurrency(0)}</span>
          </div>
          <button class="btn btn-primary btn-lg btn-block" id="btn-cobrar" disabled>
            <i class="ph ph-currency-dollar"></i>
            Cobrar
          </button>
        </div>
      </aside>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────────
// DATA LOADING
// ─────────────────────────────────────────────────────────────────
async function reload() {
  const grid = document.getElementById('pos-grid');
  renderSkeleton(grid, 8, 'product-card skeleton-pulse');

  try {
    const [productos, categorias] = await Promise.all([
      ZafiroAPI.productos.listar(state.sucursalId),
      ZafiroAPI.categorias.listar(state.sucursalId),
    ]);
    state.productos = (productos || []).filter((p) => p.activo !== false);
    state.categorias = categorias || [];
  } catch (err) {
    console.error('[POS] Error cargando datos:', err);
    toast(`No se pudieron cargar productos: ${err.message}`, 'error');
    state.productos = [];
    state.categorias = [];
  }

  renderCategoryTabs();
  renderProducts();
}

// ─────────────────────────────────────────────────────────────────
// RENDER — PRODUCTOS
// ─────────────────────────────────────────────────────────────────
function renderCategoryTabs() {
  const el = document.getElementById('pos-category-tabs');
  if (!el) return;

  const categoriasUnicas = Array.from(
    new Set(state.productos.map((p) => p.categoria).filter(Boolean))
  );

  el.innerHTML = `
    <button class="category-tab ${!state.filtroCategoria ? 'active' : ''}" data-cat="">
      Todo
    </button>
    ${categoriasUnicas.map((c) => `
      <button class="category-tab ${state.filtroCategoria === c ? 'active' : ''}" data-cat="${escapeHtml(c)}">
        ${escapeHtml(c)}
      </button>
    `).join('')}
  `;

  el.querySelectorAll('.category-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.filtroCategoria = btn.dataset.cat || null;
      renderCategoryTabs();
      renderProducts();
    });
  });
}

function renderProducts() {
  const grid = document.getElementById('pos-grid');
  if (!grid) return;

  const filtered = state.productos.filter((p) => {
    if (state.filtroCategoria && p.categoria !== state.filtroCategoria) return false;
    if (state.busqueda) {
      const q = state.busqueda.toLowerCase();
      return p.nombre.toLowerCase().includes(q) ||
             (p.insumos || '').toLowerCase().includes(q);
    }
    return true;
  });

  if (filtered.length === 0) {
    if (state.productos.length === 0) {
      renderEmpty(grid, {
        icon: 'ph-package',
        title: 'Aún no tienes productos',
        subtitle: 'Agrega tu primer producto desde el módulo de Inventario.',
        action: {
          label: 'Ir a inventario',
          icon: 'ph-package',
          onClick: () => (window.location.hash = 'inventario'),
        },
      });
    } else {
      renderEmpty(grid, {
        icon: 'ph-magnifying-glass',
        title: 'Sin resultados',
        subtitle: 'Intenta con otra búsqueda o categoría.',
      });
    }
    return;
  }

  grid.innerHTML = filtered
    .map((p) => `
      <button class="product-card" data-id="${escapeHtml(p.id)}" aria-label="Agregar ${escapeHtml(p.nombre)}">
        <div class="product-info">
          <span class="product-name">${escapeHtml(p.nombre)}</span>
          ${p.categoria ? `<span class="product-category">${escapeHtml(p.categoria)}</span>` : ''}
        </div>
        <div class="product-price">${formatCurrency(p.precio)}</div>
      </button>
    `).join('');

  grid.querySelectorAll('.product-card').forEach((card) => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      const producto = state.productos.find((p) => p.id === id);
      if (producto) addToCart(producto);
    });
  });
}

// ─────────────────────────────────────────────────────────────────
// CART
// ─────────────────────────────────────────────────────────────────
function addToCart(producto) {
  const existente = state.cart.find((i) => i.producto_id === producto.id);
  if (existente) {
    existente.cantidad += 1;
  } else {
    state.cart.push({
      producto_id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      cantidad: 1,
    });
  }
  saveCartToStorage();
  renderCart();
  pulseCartButton();
}

function updateQuantity(producto_id, delta) {
  const item = state.cart.find((i) => i.producto_id === producto_id);
  if (!item) return;
  item.cantidad = Math.max(0, item.cantidad + delta);
  if (item.cantidad === 0) {
    state.cart = state.cart.filter((i) => i.producto_id !== producto_id);
  }
  saveCartToStorage();
  renderCart();
}

function clearCart() {
  state.cart = [];
  saveCartToStorage();
  renderCart();
}

function renderCart() {
  const items = document.getElementById('cart-items');
  const count = document.getElementById('cart-count');
  const total = document.getElementById('cart-total');
  const btnCobrar = document.getElementById('btn-cobrar');
  const cartPanel = document.getElementById('pos-cart');
  if (!items) return;

  const totalItems = state.cart.reduce((s, i) => s + i.cantidad, 0);
  const totalValor = state.cart.reduce((s, i) => s + (i.precio * i.cantidad), 0);

  count.textContent = `${totalItems} ${totalItems === 1 ? 'item' : 'items'}`;
  total.textContent = formatCurrency(totalValor);
  btnCobrar.disabled = state.cart.length === 0;
  cartPanel.classList.toggle('has-items', state.cart.length > 0);

  if (state.cart.length === 0) {
    items.innerHTML = '<div class="cart-empty"><i class="ph ph-cursor-click"></i><span>Toca un producto para agregar</span></div>';
    return;
  }

  items.innerHTML = state.cart.map((item) => `
    <div class="cart-item" data-id="${escapeHtml(item.producto_id)}">
      <div class="cart-item-info">
        <span class="cart-item-name">${escapeHtml(item.nombre)}</span>
        <span class="cart-item-price">${formatCurrency(item.precio)} c/u</span>
      </div>
      <div class="cart-item-controls">
        <button class="btn-icon btn-icon-sm btn-qty-dec" data-id="${escapeHtml(item.producto_id)}" aria-label="Restar">
          <i class="ph ph-minus"></i>
        </button>
        <span class="cart-item-qty">${item.cantidad}</span>
        <button class="btn-icon btn-icon-sm btn-qty-inc" data-id="${escapeHtml(item.producto_id)}" aria-label="Sumar">
          <i class="ph ph-plus"></i>
        </button>
      </div>
      <div class="cart-item-total">${formatCurrency(item.precio * item.cantidad)}</div>
    </div>
  `).join('');

  items.querySelectorAll('.btn-qty-dec').forEach((b) => {
    b.addEventListener('click', () => updateQuantity(b.dataset.id, -1));
  });
  items.querySelectorAll('.btn-qty-inc').forEach((b) => {
    b.addEventListener('click', () => updateQuantity(b.dataset.id, +1));
  });
}

function pulseCartButton() {
  const btn = document.getElementById('btn-cobrar');
  if (!btn) return;
  btn.classList.remove('pulse');
  void btn.offsetWidth; // reflow
  btn.classList.add('pulse');
}

// ─────────────────────────────────────────────────────────────────
// CHECKOUT
// ─────────────────────────────────────────────────────────────────
async function openCheckoutModal() {
  if (state.cart.length === 0) return;
  const totalValor = state.cart.reduce((s, i) => s + (i.precio * i.cantidad), 0);

  const result = await modal({
    title: `Cobrar ${formatCurrency(totalValor)}`,
    body: `
      <div class="checkout-form">
        <label class="form-label">Método de pago</label>
        <div class="payment-methods payment-methods-2x2">
          <button type="button" class="payment-method active" data-method="Efectivo">
            <i class="ph ph-money"></i><span>Efectivo</span>
          </button>
          <button type="button" class="payment-method" data-method="Tarjeta">
            <i class="ph ph-credit-card"></i><span>Tarjeta</span>
          </button>
          <button type="button" class="payment-method" data-method="Nequi">
            <i class="ph ph-device-mobile"></i><span>Nequi</span>
          </button>
          <button type="button" class="payment-method" data-method="Daviplata">
            <i class="ph ph-device-mobile"></i><span>Daviplata</span>
          </button>
        </div>

        <label class="form-label" style="margin-top: 16px;">Domicilio (opcional)</label>
        <input type="number" id="checkout-domicilio" class="input input-lg" value="0" min="0" step="1000">

        <div class="checkout-summary">
          <div class="summary-row">
            <span>Subtotal</span>
            <span>${formatCurrency(totalValor)}</span>
          </div>
          <div class="summary-row total">
            <span>Total</span>
            <span id="checkout-total">${formatCurrency(totalValor)}</span>
          </div>
        </div>
      </div>
    `,
    actions: [
      { label: 'Cancelar', variant: 'ghost', value: null },
      {
        label: 'Confirmar cobro',
        variant: 'primary',
        icon: 'ph-check',
        onClick: async (dialog) => {
          const metodoBtn = dialog.querySelector('.payment-method.active');
          const metodo = metodoBtn?.dataset.method || 'Efectivo';
          const domicilio = Number(dialog.querySelector('#checkout-domicilio').value) || 0;
          const btn = dialog.querySelector('[data-action="1"]');
          setLoading(btn, true, 'Procesando...');
          try {
            await submitOrden(metodo, domicilio);
            return true;
          } catch (err) {
            setLoading(btn, false);
            toast(err.message || 'Error al registrar orden', 'error');
            return false;
          }
        },
      },
    ],
  });

  // Wire payment method selection (se aplica al abrir modal)
  setTimeout(() => {
    document.querySelectorAll('.payment-method').forEach((b) => {
      b.addEventListener('click', () => {
        document.querySelectorAll('.payment-method').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        // Recalcular total con domicilio
        const dom = Number(document.querySelector('#checkout-domicilio')?.value) || 0;
        const totalEl = document.getElementById('checkout-total');
        if (totalEl) totalEl.textContent = formatCurrency(totalValor + dom);
      });
    });
    const domInput = document.querySelector('#checkout-domicilio');
    if (domInput) {
      domInput.addEventListener('input', () => {
        const dom = Number(domInput.value) || 0;
        const totalEl = document.getElementById('checkout-total');
        if (totalEl) totalEl.textContent = formatCurrency(totalValor + dom);
      });
    }
  }, 50);
}

async function submitOrden(metodo_pago, domicilio) {
  const orden = {
    sucursal_id: state.sucursalId,
    metodo_pago,
    domicilio,
    items: state.cart.map((i) => ({
      producto_id: i.producto_id,
      producto_nombre: i.nombre,
      precio_unitario: i.precio,
      cantidad: i.cantidad,
    })),
  };

  const result = await ZafiroAPI.ordenes.crear(orden);
  toast(`Orden #${result.id?.slice(0, 8) || 'OK'} registrada`, 'success');
  clearCart();

  // Marca el paso 'primera venta' del onboarding (idempotente)
  import('../core/onboarding.js')
    .then((m) => m.markStepCompleted('first_sale'))
    .catch(() => {});

  return result;
}

// ─────────────────────────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────────────────────────
function attachEvents(container) {
  const searchInput = container.querySelector('#pos-search');
  const clearBtn = container.querySelector('#pos-clear-search');

  const doSearch = debounce((v) => {
    state.busqueda = v.trim();
    renderProducts();
    clearBtn.style.display = state.busqueda ? 'inline-flex' : 'none';
  }, 200);

  searchInput?.addEventListener('input', (e) => doSearch(e.target.value));
  clearBtn?.addEventListener('click', () => {
    searchInput.value = '';
    state.busqueda = '';
    clearBtn.style.display = 'none';
    renderProducts();
    searchInput.focus();
  });

  container.querySelector('#btn-cobrar')?.addEventListener('click', openCheckoutModal);

  container.querySelector('#cart-clear')?.addEventListener('click', async () => {
    if (state.cart.length === 0) return;
    const ok = await confirm('¿Vaciar el carrito completo?', { danger: true, okLabel: 'Vaciar' });
    if (ok) clearCart();
  });

  // Botón de ayuda (?) — re-lanza el mini-tutorial del POS
  container.querySelector('#btn-view-help')?.addEventListener('click', () => {
    import('../core/tutorial-manager.js')
      .then((m) => m.startMiniTutorial('pos', { force: true }))
      .catch(() => {});
  });

  // Atajos de teclado — auto-cleanup vía AbortController cuando se desmonte
  // Si esta vista se vuelve a montar, abortamos la anterior para evitar leaks.
  if (state._keyAbortCtrl) state._keyAbortCtrl.abort();
  state._keyAbortCtrl = new AbortController();
  const keyHandler = (e) => {
    const ae = document.activeElement;
    const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(ae?.tagName);
    // ESC: limpiar búsqueda
    if (e.key === 'Escape' && state.busqueda) {
      searchInput.value = '';
      state.busqueda = '';
      clearBtn.style.display = 'none';
      renderProducts();
      return;
    }
    // F2 = cobrar (si hay items)
    if (e.key === 'F2' && state.cart.length > 0) {
      e.preventDefault();
      openCheckoutModal();
      return;
    }
    // F1 = enfocar búsqueda
    if (e.key === 'F1') {
      e.preventDefault();
      searchInput?.focus();
      searchInput?.select();
      return;
    }
    // "/" = enfocar búsqueda (estilo GitHub)
    if (e.key === '/' && !isTyping) {
      e.preventDefault();
      searchInput?.focus();
    }
  };
  document.addEventListener('keydown', keyHandler, { signal: state._keyAbortCtrl.signal });
}

// ─────────────────────────────────────────────────────────────────
// PERSISTENCE (carrito sobrevive a recargas)
// ─────────────────────────────────────────────────────────────────
const CART_KEY = 'zafiro_cart';

function loadCartFromStorage() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCartToStorage() {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
  } catch {
    /* noop */
  }
}
