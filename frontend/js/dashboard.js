/**
 * Dashboard Module — Reportes y cierre de caja diario por sucursal
 */

import { API }           from "./api.js";
import { getSucursalId } from "./sucursal.js";
import { showToast, formatCOP } from "./utils.js";

let _dashboardIniciado = false;
let _chartInstance     = null;

export function resetDashboard() {
    _dashboardIniciado = false;
    if (_chartInstance) {
        _chartInstance.destroy();
        _chartInstance = null;
    }
    limpiarReporte();
}

export async function initDashboard() {
    const hoy = new Date().toISOString().split("T")[0];
    document.getElementById("dashboard-fecha").value = hoy;

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
}

async function cargarReporte(fecha) {
    const sucursalId = getSucursalId();
    if (!sucursalId) {
        limpiarReporte();
        return;
    }

    const btnCargar = document.getElementById("btn-cargar-reporte");
    if (btnCargar) { btnCargar.disabled = true; btnCargar.textContent = "Cargando..."; }

    try {
        const reporte = await API.reportes.dia(sucursalId, fecha);
        renderTablaProductos(reporte.productos);
        renderResumenCaja(reporte.resumen_caja);
        renderChartProductos(reporte.productos);
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

function renderChartProductos(productos) {
    const canvas = document.getElementById("chart-productos-mas-vendidos");
    if (!canvas) return;

    if (_chartInstance) {
        _chartInstance.destroy();
        _chartInstance = null;
    }

    if (!productos || productos.length === 0) {
        canvas.style.display = "none";
        return;
    }

    // Top 8 por cantidad vendida
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
