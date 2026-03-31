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

function renderTablaProductos(productos) {
    const tbody = document.getElementById("tabla-reporte-body");
    if (!tbody) return;

    if (!productos || productos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="empty-cell">Sin ventas para esta fecha</td></tr>`;
        return;
    }

    tbody.innerHTML = productos.map(p => `
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
                           <i data-lucide="x-circle" class="icon-sm"></i>
                       </button>`
                }
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll(".btn-anular-venta").forEach(btn => {
        btn.addEventListener("click", () => confirmarAnulacion(btn.dataset.id, btn.dataset.nombre));
    });

    if (window.lucide) window.lucide.createIcons();
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

    if (!productos || productos.length === 0) {
        canvas.style.display = "none";
        const emptyMsg = document.getElementById("chart-empty-msg");
        if (emptyMsg) { emptyMsg.style.display = "block"; }
        return;
    }

    const emptyMsg = document.getElementById("chart-empty-msg");
    if (emptyMsg) emptyMsg.style.display = "none";

    const top = [...productos]
        .sort((a, b) => b.cantidad_total - a.cantidad_total)
        .slice(0, 8);

    canvas.style.display = "block";

    _chartInstance = new Chart(canvas, {
        type: "bar",
        data: {
            labels: top.map(p => p.producto_nombre),
            datasets: [{
                label: "Unidades vendidas",
                data: top.map(p => p.cantidad_total),
                backgroundColor: "rgba(224, 123, 42, 0.75)",
                borderColor: "rgba(224, 123, 42, 1)",
                borderWidth: 1,
                borderRadius: 5,
            }]
        },
        options: {
            indexAxis: "y",
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.parsed.x} unidades`,
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { color: "#aaa", stepSize: 1 },
                    grid: { color: "rgba(255,255,255,0.07)" },
                },
                y: {
                    ticks: { color: "#ccc" },
                    grid: { display: false },
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
