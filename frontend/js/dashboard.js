/**
 * Dashboard Module — Reportes, cierre de caja y gestión de ventas del día
 */

import { API }           from "./api.js";
import { getSucursalId } from "./sucursal.js";
import { showToast, formatCOP } from "./utils.js";
import { isAdmin } from "./auth.js";
import { showPrompt, showPinDialog, showConfirm } from "./dialog.js";

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

    // Show skeleton loaders while data loads
    showMetricSkeletons();
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

function showMetricSkeletons() {
    ["resumen-total","resumen-efectivo","resumen-nequi","resumen-daviplata","resumen-tarjeta"]
        .forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = " ";
                el.classList.add("skeleton-text");
            }
        });
}

function hideMetricSkeletons() {
    ["resumen-total","resumen-efectivo","resumen-nequi","resumen-daviplata","resumen-tarjeta"]
        .forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove("skeleton-text");
        });
}

async function cargarReporte(fecha) {
    const sucursalId = getSucursalId();
    if (!sucursalId) { limpiarReporte(); return; }
    _fechaActual = fecha;

    const btnCargar = document.getElementById("btn-cargar-reporte");
    if (btnCargar) { btnCargar.disabled = true; btnCargar.textContent = "Cargando..."; }

    try {
        const [reporte, ordenes] = await Promise.all([
            API.reportes.dia(sucursalId, fecha),
            API.ordenes.listar(sucursalId, fecha).catch(() => []),
        ]);
        _ventasDelDia = ordenes;

        hideMetricSkeletons();
        renderTablaProductos(reporte.productos);
        renderResumenCaja(reporte.resumen_caja);
        renderChartProductos(reporte.productos);
        renderHistorialVentas(ordenes);
    } catch (err) {
        hideMetricSkeletons();
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
        tbody.innerHTML = `<tr><td colspan="6" class="empty-cell">Sin transacciones registradas</td></tr>`;
        return;
    }

    tbody.innerHTML = ventas.map(o => {
        const shortId = o.id.split("-")[0];
        const names = o.items.map(i => `${i.cantidad}x ${i.producto_nombre}`).join("<br>");
        const totalItems = o.items.reduce((s, i) => s + i.cantidad, 0);

        return `
        <tr class="${o.anulada ? 'venta-anulada' : ''}">
            <td style="font-size:0.8rem;color:var(--text-muted)">${o.fecha.slice(11, 16)}</td>
            <td>
                <div>Orden #${shortId}</div>
                <div style="font-size:0.75rem; color:var(--text-muted); line-height:1.2; margin-top:2px;">${names}</div>
            </td>
            <td class="text-center">${totalItems}</td>
            <td class="text-right">${formatCOP(o.total)}</td>
            <td class="text-center">
                <span class="metodo-badge metodo-${o.metodo_pago.toLowerCase()}">${o.metodo_pago}</span>
            </td>
            <td class="text-center acciones-venta-cell">
                ${o.anulada
                    ? `<span class="badge-anulada">ANULADA</span>`
                    : `<div class="venta-actions">
                           <button class="btn-icon btn-anular-venta" data-id="${o.id}" data-nombre="Orden #${shortId}" title="Anular orden completa">
                               <i class="ph ph-trash icon-sm"></i>
                           </button>
                       </div>`
                }
            </td>
        </tr>`;
    }).join("");

    tbody.querySelectorAll(".btn-anular-venta").forEach(btn => {
        btn.addEventListener("click", () => confirmarAnulacion(btn.dataset.id, btn.dataset.nombre));
    });
}

async function confirmarAnulacion(ventaId, productoNombre) {
    const pin = await showPinDialog({
        title: "Anular venta",
        body: `¿Anular la venta de "${productoNombre}"? Esta acción no se puede deshacer.`,
    });
    if (pin === null) return;

    if (!pin.trim()) {
        showToast("Debes ingresar el PIN", "warning");
        return;
    }

    try {
        await API.ordenes.anular(ventaId, pin.trim());
        showToast("Orden anulada correctamente", "success");
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
