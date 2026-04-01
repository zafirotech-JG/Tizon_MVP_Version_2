/**
 * Dashboard Module — Reportes, cierre de caja y gestión de ventas del día
 */

import { API }           from "./api.js";
import { getSucursalId } from "./sucursal.js";
import { showToast, formatCOP } from "./utils.js";
import { isAdmin } from "./auth.js";

let _dashboardIniciado = false;
let _chartInstance     = null;
let _ventasDelDia      = [];
let _fechaActual       = null;

export function resetDashboard() {
    _dashboardIniciado = false;
    _ventasDelDia      = [];
    if (_chartInstance) {
        _chartInstance.destroy();
        _chartInstance = null;
    }
    limpiarReporte();
}

export async function initDashboard() {
    const hoy = new Date().toISOString().split("T")[0];
    document.getElementById("dashboard-fecha").value = hoy;
    _fechaActual = hoy;

    if (!_dashboardIniciado) {
        bindEventos();
        _dashboardIniciado = true;
    }

    const sucursalId = getSucursalId();
    if (!sucursalId) {
        limpiarReporte();
        return;
    }
    await cargarReporte(hoy);
}

function limpiarReporte() {
    const tbody = document.getElementById("tabla-reporte-body");
    if (tbody) tbody.innerHTML = `<tr><td colspan="3" class="empty-cell" style="color:var(--text-muted)">Selecciona una sucursal para ver el reporte.</td></tr>`;
    ["resumen-total","resumen-efectivo","resumen-nequi","resumen-daviplata","resumen-tarjeta"]
        .forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = "—";
        });
    const canvas = document.getElementById("chart-productos-mas-vendidos");
    if (canvas) canvas.style.display = "none";
    const tbodyVentas = document.getElementById("tabla-ventas-historial-body");
    if (tbodyVentas) tbodyVentas.innerHTML = "";
    const historial = document.getElementById("seccion-historial-ventas");
    if (historial) historial.style.display = "none";
}

async function cargarReporte(fecha) {
    const sucursalId = getSucursalId();
    if (!sucursalId) { limpiarReporte(); return; }
    _fechaActual = fecha;

    const btnCargar = document.getElementById("btn-cargar-reporte");
    if (btnCargar) { btnCargar.disabled = true; btnCargar.textContent = "Cargando..."; }

    try {
        const [reporte, ventas] = await Promise.all([
            API.reportes.dia(sucursalId, fecha),
            isAdmin() ? API.ventas.listar(sucursalId, fecha).catch(() => []) : Promise.resolve([]),
        ]);
        _ventasDelDia = ventas;

        renderTablaProductos(reporte.productos);
        renderResumenCaja(reporte.resumen_caja);
        renderChartProductos(reporte.productos);
        if (isAdmin()) renderHistorialVentas(ventas);
    } catch (err) {
        showToast(`Error cargando reporte: ${err.message}`, "error");
    } finally {
        if (btnCargar) { btnCargar.disabled = false; btnCargar.textContent = "Cargar"; }
    }
}

function filterProductos(productos) {
    if (!productos) return [];
    return productos.filter(p =>
        p.producto_nombre.toLowerCase() !== "domicilio"
    );
}

function renderTablaProductos(productos) {
    const tbody = document.getElementById("tabla-reporte-body");
    if (!tbody) return;

    const filtered = filterProductos(productos);

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="empty-cell">Sin ventas para esta fecha</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(p => `
        <tr>
            <td>${p.producto_nombre}</td>
            <td class="text-center">${p.cantidad_total}</td>
            <td class="text-right">${formatCOP(p.total_ingresos)}</td>
        </tr>
    `).join("");
}

function renderResumenCaja(resumen) {
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = formatCOP(val);
    };
    setVal("resumen-total",     resumen.total_dia);
    setVal("resumen-efectivo",  resumen.efectivo);
    setVal("resumen-nequi",     resumen.nequi);
    setVal("resumen-daviplata", resumen.daviplata);
    setVal("resumen-tarjeta",   resumen.tarjeta);
}

// ── Historial de ventas (admin) ──────────────────────────────────────────
function renderHistorialVentas(ventas) {
    const seccion = document.getElementById("seccion-historial-ventas");
    const tbody   = document.getElementById("tabla-ventas-historial-body");
    if (!seccion || !tbody) return;

    seccion.style.display = "block";

    if (!ventas || ventas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-cell">Sin transacciones registradas</td></tr>`;
        return;
    }

    tbody.innerHTML = ventas.map(v => `
        <tr class="${v.anulada ? 'venta-anulada' : ''}">
            <td style="font-size:0.8rem;color:var(--text-muted)">${v.fecha.slice(11, 16)}</td>
            <td>${v.producto_nombre}</td>
            <td class="text-center">${v.cantidad}</td>
            <td class="text-right">${formatCOP(v.total)}</td>
            <td class="text-center">
                <span class="metodo-badge metodo-${v.metodo_pago.toLowerCase()}">${v.metodo_pago}</span>
            </td>
            <td class="text-center">
                ${v.anulada
                    ? `<span style="color:var(--danger);font-size:0.75rem;font-weight:600">ANULADA</span>`
                    : `<button class="btn-icon btn-anular-venta" data-id="${v.id}" data-nombre="${v.producto_nombre}" title="Anular venta">
                           <i class="ph ph-x-circle icon-sm"></i>
                       </button>`
                }
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll(".btn-anular-venta").forEach(btn => {
        btn.addEventListener("click", () => confirmarAnulacion(btn.dataset.id, btn.dataset.nombre));
    });

    // icons are CSS-based (Phosphor), no re-init needed
}

async function confirmarAnulacion(ventaId, productoNombre) {
    const pin = prompt(`¿Anular la venta de "${productoNombre}"?\n\nIngresa el código PIN de administrador para confirmar:`);
    if (pin === null) return;  // cancelado

    if (!pin.trim()) {
        showToast("Debes ingresar el PIN", "warning");
        return;
    }

    try {
        await API.ventas.anular(ventaId, pin.trim());
        showToast("Venta anulada correctamente", "success");
        // Recargar el reporte completo
        await cargarReporte(_fechaActual);
    } catch (err) {
        showToast(`Error: ${err.message}`, "error");
    }
}

function renderChartProductos(productos) {
    const canvas = document.getElementById("chart-productos-mas-vendidos");
    if (!canvas) return;

    if (_chartInstance) {
        _chartInstance.destroy();
        _chartInstance = null;
    }

    const filtered = filterProductos(productos);

    if (filtered.length === 0) {
        canvas.style.display = "none";
        const emptyMsg = document.getElementById("chart-empty-msg");
        if (emptyMsg) { emptyMsg.style.display = "block"; }
        return;
    }

    const emptyMsg = document.getElementById("chart-empty-msg");
    if (emptyMsg) emptyMsg.style.display = "none";

    const top = [...filtered]
        .sort((a, b) => b.cantidad_total - a.cantidad_total)
        .slice(0, 8);

    canvas.style.display = "block";

    const colors = [
        'rgba(224, 123, 42, 0.85)',
        'rgba(240, 160, 80, 0.85)',
        'rgba(240, 196, 72, 0.85)',
        'rgba(62, 207, 142, 0.85)',
        'rgba(200, 90, 90, 0.85)',
        'rgba(160, 140, 120, 0.85)',
        'rgba(120, 100, 80, 0.85)',
        'rgba(80, 160, 210, 0.85)',
    ];

    const borderColors = colors.map(c => c.replace('0.85', '1'));

    _chartInstance = new Chart(canvas, {
        type: "doughnut",
        data: {
            labels: top.map(p => p.producto_nombre),
            datasets: [{
                data: top.map(p => p.cantidad_total),
                backgroundColor: colors.slice(0, top.length),
                borderColor: borderColors.slice(0, top.length),
                borderWidth: 2,
                hoverOffset: 8,
                spacing: 3,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '55%',
            layout: {
                padding: { top: 8, bottom: 8 }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        color: '#c8b8a4',
                        font: { family: "'Inter', sans-serif", size: 12.5, weight: '500' },
                        padding: 16,
                        usePointStyle: true,
                        pointStyle: 'rectRounded',
                        boxWidth: 10,
                        boxHeight: 10,
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(26, 22, 19, 0.95)',
                    titleFont: { family: "'Inter', sans-serif", size: 13, weight: '600' },
                    bodyFont: { family: "'Inter', sans-serif", size: 12, weight: '400' },
                    titleColor: '#f0ebe4',
                    bodyColor: '#c8b8a4',
                    borderColor: 'rgba(224, 123, 42, 0.4)',
                    borderWidth: 1,
                    padding: 14,
                    cornerRadius: 10,
                    displayColors: true,
                    boxPadding: 6,
                    callbacks: {
                        label: ctx => {
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = ((ctx.parsed / total) * 100).toFixed(1);
                            return ` ${ctx.parsed} uds  ·  ${pct}%`;
                        }
                    }
                }
            }
        }
    });
}

function bindEventos() {
    document.getElementById("btn-cargar-reporte")?.addEventListener("click", () => {
        const fecha = document.getElementById("dashboard-fecha")?.value;
        if (fecha) cargarReporte(fecha);
    });
}
