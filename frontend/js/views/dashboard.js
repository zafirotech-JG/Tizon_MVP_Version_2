/**
 * views/dashboard.js — Dashboard ejecutivo para Owner/Manager
 * Muestra métricas clave del día, ventas por producto y método de pago.
 */
import { ZafiroAPI } from '../core/api-client.js';
import { toast, formatCurrency, formatNumber, renderSkeleton, renderEmpty, escapeHtml } from '../core/ui.js';

const state = {
  sucursalId: null,
  reporte: null,
  productos: [],
  usuarios: [],
  chart: null,
};

// ─────────────────────────────────────────────────────────────────
// MOUNT
// ─────────────────────────────────────────────────────────────────
export async function mountDashboard({ container, sucursalId }) {
  state.sucursalId = sucursalId;
  container.innerHTML = renderShell();
  await loadData();
}

function renderShell() {
  return `
    <div class="dashboard-view">
      <header class="view-header">
        <div>
          <h2 class="view-title">Dashboard</h2>
          <p class="view-subtitle">Resumen del día — <span id="dash-date"></span></p>
        </div>
        <div class="view-actions">
          <button class="help-btn" id="btn-view-help" title="Ver tutorial" aria-label="Ver tutorial">
            <i class="ph ph-question"></i>
          </button>
          <button class="btn btn-ghost btn-sm" id="btn-refresh-dash" title="Actualizar">
            <i class="ph ph-arrow-clockwise"></i>
            <span class="hide-mobile">Actualizar</span>
          </button>
        </div>
      </header>

      <div class="stats-grid" id="stats-grid">
        ${['ventas', 'ordenes', 'productos', 'usuarios']
          .map(() => '<div class="stat-card skeleton-pulse" style="height:110px;"></div>')
          .join('')}
      </div>

      <div class="dashboard-grid">
        <div class="card dashboard-chart-card">
          <div class="card-header">
            <h3 class="card-title"><i class="ph ph-chart-bar"></i> Método de pago</h3>
          </div>
          <div class="card-body">
            <div id="payment-methods-chart" style="min-height: 200px;"></div>
          </div>
        </div>

        <div class="card dashboard-top-card">
          <div class="card-header">
            <h3 class="card-title"><i class="ph ph-trophy"></i> Productos más vendidos</h3>
          </div>
          <div class="card-body" id="top-productos">
            <div class="skeleton-pulse" style="height:40px;margin-bottom:8px;"></div>
            <div class="skeleton-pulse" style="height:40px;margin-bottom:8px;"></div>
            <div class="skeleton-pulse" style="height:40px;"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────────
// DATA LOADING
// ─────────────────────────────────────────────────────────────────
async function loadData() {
  const today = new Date();
  document.getElementById('dash-date').textContent = today.toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  // Cargar en paralelo
  const [reporte, productos, usuarios] = await Promise.all([
    ZafiroAPI.reportes.dia(state.sucursalId, today).catch(() => null),
    ZafiroAPI.productos.listar(state.sucursalId).catch(() => []),
    ZafiroAPI.usuarios.listar().catch(() => []),
  ]);

  state.reporte = reporte;
  state.productos = productos || [];
  state.usuarios = usuarios || [];

  renderStats();
  renderPaymentChart();
  renderTopProductos();

  // Event listeners
  document.getElementById('btn-refresh-dash')?.addEventListener('click', async () => {
    await loadData();
    toast('Dashboard actualizado', 'success', 1500);
  });

  document.getElementById('btn-view-help')?.addEventListener('click', () => {
    import('../core/tutorial-manager.js')
      .then((m) => m.startMiniTutorial('dashboard', { force: true }))
      .catch(() => {});
  });
}

// ─────────────────────────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────────────────────────
function renderStats() {
  const grid = document.getElementById('stats-grid');
  if (!grid) return;

  const totalVentas = state.reporte?.resumen_caja?.total_dia || 0;
  const totalOrdenes = (state.reporte?.productos || [])
    .reduce((s, p) => s + p.cantidad_total, 0);
  const totalProductosActivos = state.productos.filter((p) => p.activo !== false).length;
  const totalUsuarios = state.usuarios.length;

  grid.innerHTML = `
    ${statCard({
      icon: 'ph-currency-dollar',
      variant: 'success',
      value: formatCurrency(totalVentas),
      label: 'Ventas hoy',
    })}
    ${statCard({
      icon: 'ph-receipt',
      variant: 'primary',
      value: formatNumber(totalOrdenes),
      label: 'Items vendidos',
    })}
    ${statCard({
      icon: 'ph-package',
      variant: 'warning',
      value: formatNumber(totalProductosActivos),
      label: 'Productos activos',
    })}
    ${statCard({
      icon: 'ph-users',
      variant: 'info',
      value: formatNumber(totalUsuarios),
      label: 'Empleados',
    })}
  `;
}

function statCard({ icon, variant, value, label }) {
  return `
    <div class="stat-card ${variant}">
      <div class="stat-icon"><i class="ph ${icon}"></i></div>
      <div class="stat-content">
        <div class="stat-value">${value}</div>
        <div class="stat-label">${escapeHtml(label)}</div>
      </div>
    </div>
  `;
}

function renderPaymentChart() {
  const el = document.getElementById('payment-methods-chart');
  if (!el) return;

  const resumen = state.reporte?.resumen_caja;
  if (!resumen || resumen.total_dia === 0) {
    renderEmpty(el, {
      icon: 'ph-chart-pie',
      title: 'Sin ventas hoy',
      subtitle: 'Las ventas aparecerán aquí cuando se registren.',
    });
    return;
  }

  const methods = [
    { key: 'efectivo',      label: 'Efectivo',     color: '#22c55e', icon: 'ph-money' },
    { key: 'tarjeta',       label: 'Tarjeta',      color: '#1e5fd9', icon: 'ph-credit-card' },
    { key: 'nequi',         label: 'Nequi',        color: '#a855f7', icon: 'ph-device-mobile' },
    { key: 'daviplata',     label: 'Daviplata',    color: '#ef4444', icon: 'ph-device-mobile' },
  ];

  const total = resumen.total_dia || 1;
  el.innerHTML = `
    <div class="payment-breakdown">
      ${methods.map((m) => {
        const val = Number(resumen[m.key]) || 0;
        const pct = total > 0 ? Math.round((val / total) * 100) : 0;
        return `
          <div class="payment-row">
            <div class="payment-label">
              <i class="ph ${m.icon}" style="color: ${m.color}"></i>
              <span>${m.label}</span>
            </div>
            <div class="payment-bar-wrap">
              <div class="payment-bar" style="width: ${pct}%; background: ${m.color};"></div>
            </div>
            <div class="payment-value">
              <strong>${formatCurrency(val)}</strong>
              <small>${pct}%</small>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderTopProductos() {
  const el = document.getElementById('top-productos');
  if (!el) return;

  const productos = (state.reporte?.productos || [])
    .slice()
    .sort((a, b) => b.cantidad_total - a.cantidad_total)
    .slice(0, 5);

  if (productos.length === 0) {
    renderEmpty(el, {
      icon: 'ph-package',
      title: 'Aún no hay ventas',
      subtitle: 'Los productos más vendidos aparecerán aquí.',
    });
    return;
  }

  const maxCantidad = productos[0].cantidad_total || 1;

  el.innerHTML = productos.map((p, i) => {
    const pct = Math.round((p.cantidad_total / maxCantidad) * 100);
    return `
      <div class="top-producto-row">
        <div class="top-producto-rank">#${i + 1}</div>
        <div class="top-producto-info">
          <span class="top-producto-name">${escapeHtml(p.producto_nombre)}</span>
          <div class="top-producto-bar-wrap">
            <div class="top-producto-bar" style="width: ${pct}%;"></div>
          </div>
        </div>
        <div class="top-producto-stats">
          <strong>${formatNumber(p.cantidad_total)}</strong>
          <small>${formatCurrency(p.total_ingresos)}</small>
        </div>
      </div>
    `;
  }).join('');
}
