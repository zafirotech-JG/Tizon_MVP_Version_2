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
const PAYMENT_METHODS = [
  { id: 'Efectivo',  icon: 'ph-money',                  label: 'Efectivo',  hotkey: '1' },
  { id: 'Tarjeta',   icon: 'ph-credit-card',            label: 'Tarjeta',   hotkey: '2' },
  { id: 'Nequi',     icon: 'ph-qr-code',                label: 'Nequi',     hotkey: '3' },
  { id: 'Daviplata', icon: 'ph-device-mobile-speaker',  label: 'Daviplata', hotkey: '4' },
];

/**
 * Calcula chips de billetes sugeridos según el total a cobrar.
 * Devuelve "Exacto" + redondeos hacia arriba al siguiente billete común (COP).
 */
function suggestedCashAmounts(total) {
  if (total <= 0) return [];
  const out = [{ label: 'Exacto', value: total, exact: true }];
  const ladder = [10000, 20000, 50000, 100000, 200000];
  const seen = new Set([total]);
  for (const d of ladder) {
    const r = Math.ceil((total + 1) / d) * d;
    if (r > total && !seen.has(r)) {
      out.push({ label: formatCurrency(r), value: r });
      seen.add(r);
    }
    if (out.length >= 5) break;
  }
  return out;
}

async function openCheckoutModal() {
  if (state.cart.length === 0) return;
  const subtotal = state.cart.reduce((s, i) => s + (i.precio * i.cantidad), 0);

  // Estado interno del modal (mutado por listeners de onMount)
  const ck = {
    metodo: 'Efectivo',
    domicilio: 0,
    recibido: subtotal,
  };

  await modal({
    title: 'Cobrar venta',
    body: renderCheckoutBody(subtotal, ck),
    actions: [
      { label: 'Cancelar', variant: 'ghost', value: null },
      {
        label: 'Confirmar cobro',
        variant: 'primary',
        icon: 'ph-check',
        onClick: async (dialog) => {
          const total = subtotal + ck.domicilio;
          if (ck.metodo === 'Efectivo' && ck.recibido < total) {
            toast(`Faltan ${formatCurrency(total - ck.recibido)} para completar el pago`, 'warning');
            dialog.querySelector('#ck-recibido')?.focus();
            return false;
          }
          const btn = dialog.querySelector('[data-action="1"]');
          setLoading(btn, true, 'Procesando...');
          try {
            const change = ck.metodo === 'Efectivo' ? Math.max(0, ck.recibido - total) : 0;
            await submitOrden(ck.metodo, ck.domicilio, change);
            return true;
          } catch (err) {
            setLoading(btn, false);
            toast(err.message || 'Error al registrar orden', 'error');
            return false;
          }
        },
      },
    ],
    onMount: (dialog) => wireCheckoutModal(dialog, subtotal, ck),
  });
}

function renderCheckoutBody(subtotal, ck) {
  return `
    <div class="checkout-form">
      <label class="form-label">Método de pago</label>
      <div class="payment-methods payment-methods-2x2">
        ${PAYMENT_METHODS.map((m) => `
          <button type="button" class="payment-method ${ck.metodo === m.id ? 'active' : ''}" data-method="${m.id}" title="${m.label} (${m.hotkey})">
            <span class="payment-hotkey">${m.hotkey}</span>
            <i class="ph ${m.icon}"></i>
            <span>${m.label}</span>
          </button>
        `).join('')}
      </div>

      <div class="checkout-cash-block" id="ck-cash-block">
        <label class="form-label">Pago rápido</label>
        <div class="cash-chips" id="ck-chips"></div>
        <div class="cash-row">
          <div class="cash-field">
            <label class="form-label" for="ck-recibido">Recibido</label>
            <input type="number" id="ck-recibido" class="input input-lg cash-input"
                   inputmode="numeric" min="0" step="1000" value="${subtotal}">
          </div>
          <div class="cash-change" id="ck-change">
            <span class="cash-change-label">Cambio</span>
            <span class="cash-change-value" id="ck-change-value">${formatCurrency(0)}</span>
          </div>
        </div>
      </div>

      <label class="form-label checkout-domicilio-label">
        Domicilio <span class="form-label-hint">(opcional)</span>
      </label>
      <input type="number" id="ck-domicilio" class="input input-lg"
             inputmode="numeric" min="0" step="500" value="0" placeholder="0">

      <div class="checkout-summary">
        <div class="summary-row">
          <span>Subtotal</span>
          <span id="ck-subtotal">${formatCurrency(subtotal)}</span>
        </div>
        <div class="summary-row" id="ck-domicilio-row" hidden>
          <span>Domicilio</span>
          <span id="ck-domicilio-amount">${formatCurrency(0)}</span>
        </div>
        <div class="summary-row total">
          <span>Total</span>
          <span id="ck-total">${formatCurrency(subtotal)}</span>
        </div>
      </div>
    </div>
  `;
}

function wireCheckoutModal(dialog, subtotal, ck) {
  const $ = (sel) => dialog.querySelector(sel);
  const recibidoInput = $('#ck-recibido');
  const domicilioInput = $('#ck-domicilio');
  const cashBlock = $('#ck-cash-block');
  const chipsEl = $('#ck-chips');
  const totalEl = $('#ck-total');
  const subtotalEl = $('#ck-subtotal');
  const domRow = $('#ck-domicilio-row');
  const domAmount = $('#ck-domicilio-amount');
  const changeValue = $('#ck-change-value');
  const changeBlock = $('#ck-change');
  const confirmBtn = dialog.querySelector('[data-action="1"]');

  function getTotal() { return subtotal + ck.domicilio; }

  function renderChips() {
    const total = getTotal();
    const chips = suggestedCashAmounts(total);
    chipsEl.innerHTML = chips.map((c) => `
      <button type="button" class="cash-chip ${c.exact ? 'cash-chip-exact' : ''}" data-value="${c.value}">
        ${c.exact ? '<i class="ph ph-check-circle"></i> ' : ''}${c.label}
      </button>
    `).join('');
    chipsEl.querySelectorAll('.cash-chip').forEach((b) => {
      b.addEventListener('click', () => {
        const v = Number(b.dataset.value) || 0;
        ck.recibido = v;
        recibidoInput.value = v;
        updateChange();
        recibidoInput.focus();
        recibidoInput.select();
      });
    });
  }

  function updateChange() {
    const total = getTotal();
    const change = ck.recibido - total;
    changeValue.textContent = formatCurrency(Math.max(0, change));
    const insufficient = ck.metodo === 'Efectivo' && ck.recibido < total;
    changeBlock.classList.toggle('insufficient', insufficient);
    changeBlock.classList.toggle('exact', !insufficient && change === 0);
    changeBlock.classList.toggle('positive', change > 0);
    if (insufficient) {
      changeValue.textContent = `Faltan ${formatCurrency(total - ck.recibido)}`;
    }
    if (confirmBtn) confirmBtn.disabled = insufficient;
  }

  function updateTotals() {
    const total = getTotal();
    subtotalEl.textContent = formatCurrency(subtotal);
    totalEl.textContent = formatCurrency(total);
    if (ck.domicilio > 0) {
      domRow.hidden = false;
      domAmount.textContent = formatCurrency(ck.domicilio);
    } else {
      domRow.hidden = true;
    }
    renderChips();
    updateChange();
  }

  function applyMethod(metodo) {
    ck.metodo = metodo;
    dialog.querySelectorAll('.payment-method').forEach((b) => {
      b.classList.toggle('active', b.dataset.method === metodo);
    });
    const isCash = metodo === 'Efectivo';
    cashBlock.hidden = !isCash;
    if (isCash) {
      // Auto-focus para que el cajero teclee el monto recibido
      requestAnimationFrame(() => {
        recibidoInput.focus();
        recibidoInput.select();
      });
    }
    updateChange();
  }

  // Selección de método (click + hotkey numérico)
  dialog.querySelectorAll('.payment-method').forEach((b) => {
    b.addEventListener('click', () => applyMethod(b.dataset.method));
  });

  // Recibido
  recibidoInput.addEventListener('input', () => {
    ck.recibido = Number(recibidoInput.value) || 0;
    updateChange();
  });

  // Domicilio → recalcula total + chips + cambio
  domicilioInput.addEventListener('input', () => {
    ck.domicilio = Math.max(0, Number(domicilioInput.value) || 0);
    // Si el recibido era exactamente igual al subtotal previo, mantenerlo en "exacto"
    if (Math.abs(ck.recibido - (subtotal + (ck.domicilio - (Number(domicilioInput.dataset.prev) || 0)))) < 1) {
      ck.recibido = getTotal();
      recibidoInput.value = ck.recibido;
    }
    domicilioInput.dataset.prev = ck.domicilio;
    updateTotals();
  });

  // Atajos de teclado dentro del modal
  dialog.addEventListener('keydown', (e) => {
    // 1-4: seleccionar método de pago (cuando NO se está escribiendo en input numérico)
    const target = e.target;
    const isInput = target?.tagName === 'INPUT';
    if (!isInput && /^[1-4]$/.test(e.key)) {
      const m = PAYMENT_METHODS[Number(e.key) - 1];
      if (m) { e.preventDefault(); applyMethod(m.id); }
      return;
    }
    // Enter: confirmar (si no está deshabilitado)
    if (e.key === 'Enter' && !confirmBtn?.disabled) {
      e.preventDefault();
      confirmBtn?.click();
    }
  });

  // Estado inicial
  applyMethod(ck.metodo);
  updateTotals();
}

async function submitOrden(metodo_pago, domicilio, change = 0) {
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
  const ref = result.id?.slice(0, 8) || 'OK';
  if (change > 0) {
    toast(`Orden #${ref} · Devolver ${formatCurrency(change)} de cambio`, 'success', 5000);
  } else {
    toast(`Orden #${ref} registrada`, 'success');
  }
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
