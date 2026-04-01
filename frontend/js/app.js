/**
 * App entry point — SPA router + gestión de sucursales
 */

import { initPOS, resetPOS }             from "./pos.js";
import { initInventario, resetInventario } from "./inventario.js";
import { initDashboard, resetDashboard }   from "./dashboard.js";
import { setSucursal, getSucursal, resetSucursal, setSucursales, getSucursales } from "./sucursal.js";
import { API }       from "./api.js";
import { showToast } from "./utils.js";
import { iniciarTutorial, bindTutorialEvents } from "./tutorial.js";

let seccionActual = "pos";

const modulos = {
    pos:        { init: initPOS },
    inventario: { init: initInventario },
    dashboard:  { init: initDashboard },
};

export function mostrarSeccion(nombre) {
    seccionActual = nombre;
    document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
    document.getElementById(`seccion-${nombre}`)?.classList.add("active");
    document.querySelectorAll(`.nav-item[data-seccion="${nombre}"]`).forEach(n => n.classList.add("active"));

    const modulo = modulos[nombre];
    if (modulo) {
        const result = modulo.init();
        if (result?.catch) result.catch(console.error);
    }
}

document.querySelectorAll(".nav-item[data-seccion]").forEach(item => {
    item.addEventListener("click", () => mostrarSeccion(item.dataset.seccion));
});


// ── Selector de sucursal ──────────────────────────────────────────────────

async function cargarSucursales() {
    try {
        const lista = await API.sucursales.listar();
        setSucursales(lista);
        poblarSelectoresSucursal(lista);

        if (lista.length === 0) {
            abrirModalSucursal(true);
            return;
        }

        // Restaurar última sucursal usada
        const savedId  = localStorage.getItem("tizon_sucursal_id");
        const guardada = lista.find(s => s.id === savedId);
        const activa   = guardada || lista[0];
        setSucursal(activa);
        sincronizarSelectores(activa.id);
    } catch (err) {
        showToast("Error cargando sucursales", "error");
    }
}

function poblarSelectoresSucursal(lista) {
    const opciones = lista.map(s => `<option value="${s.id}">${s.nombre}</option>`).join("");
    ["selector-sucursal", "selector-sucursal-mobile"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = opciones;
    });
}

function sincronizarSelectores(sucursalId) {
    ["selector-sucursal", "selector-sucursal-mobile"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = sucursalId;
    });
}

function cambiarSucursal(sucursalId) {
    const lista = getSucursales();
    const s = lista.find(x => x.id === sucursalId);
    if (!s) return;
    setSucursal(s);
    sincronizarSelectores(sucursalId);
    resetTodosLosModulos();
    mostrarSeccion(seccionActual);
    showToast(`Sucursal: ${s.nombre}`, "info");
}

["selector-sucursal", "selector-sucursal-mobile"].forEach(id => {
    document.getElementById(id)?.addEventListener("change", e => cambiarSucursal(e.target.value));
});


// ── Gestión de sucursales (modal) ─────────────────────────────────────────

let _editandoSucursalId = null;

function abrirModalSucursal(obligatorio = false) {
    _editandoSucursalId = null;
    document.getElementById("modal-sucursal-titulo").textContent = "Nueva Sucursal";
    document.getElementById("form-sucursal-nombre").value = "";

    const aviso = document.getElementById("aviso-primera-sucursal");
    if (aviso) aviso.style.display = obligatorio ? "block" : "none";

    const btnCancelar = document.getElementById("btn-cancelar-sucursal");
    if (btnCancelar) btnCancelar.style.display = obligatorio ? "none" : "";

    document.getElementById("modal-sucursal")?.classList.add("open");
    document.getElementById("form-sucursal-nombre")?.focus();
}

function abrirEdicionSucursal(id, nombre) {
    _editandoSucursalId = id;
    document.getElementById("modal-sucursal-titulo").textContent = "Editar Sucursal";
    document.getElementById("form-sucursal-nombre").value = nombre;

    const aviso = document.getElementById("aviso-primera-sucursal");
    if (aviso) aviso.style.display = "none";
    document.getElementById("btn-cancelar-sucursal").style.display = "";

    document.getElementById("modal-sucursal")?.classList.add("open");
    document.getElementById("form-sucursal-nombre")?.focus();
}

function cerrarModalSucursal() {
    document.getElementById("modal-sucursal")?.classList.remove("open");
    _editandoSucursalId = null;
}

async function guardarSucursal() {
    const nombre = document.getElementById("form-sucursal-nombre")?.value.trim();
    if (!nombre) { showToast("El nombre es requerido", "warning"); return; }

    const btn = document.getElementById("btn-guardar-sucursal");
    btn.disabled = true;
    try {
        let resultado;
        if (_editandoSucursalId) {
            resultado = await API.sucursales.editar(_editandoSucursalId, { nombre });
            showToast(`Sucursal renombrada ✅`, "success");
        } else {
            resultado = await API.sucursales.crear({ nombre });
            showToast(`Sucursal "${nombre}" creada ✅`, "success");
        }
        cerrarModalSucursal();
        await cargarSucursales();

        // Seleccionar la nueva/editada automáticamente
        if (!_editandoSucursalId) {
            setSucursal(resultado);
            sincronizarSelectores(resultado.id);
            resetTodosLosModulos();
            mostrarSeccion(seccionActual);
        }
    } catch (err) {
        showToast(`Error: ${err.message}`, "error");
    } finally {
        btn.disabled = false;
    }
}

async function eliminarSucursal(id, nombre) {
    if (!confirm(`¿Eliminar la sucursal "${nombre}"? Sus productos y ventas también serán eliminados.`)) return;
    try {
        await API.sucursales.eliminar(id);
        showToast("Sucursal eliminada", "success");

        // Si era la activa, cambiar a la primera disponible
        if (getSucursal()?.id === id) {
            resetTodosLosModulos();
            resetSucursal();
        }
        await cargarSucursales();

        const activa = getSucursal();
        if (activa) {
            mostrarSeccion(seccionActual);
        }
    } catch (err) {
        showToast(`Error: ${err.message}`, "error");
    }
}

// Abrir panel de gestión de sucursales
function abrirPanelSucursales() {
    renderListaSucursales();
    document.getElementById("panel-sucursales")?.classList.add("open");
}

function cerrarPanelSucursales() {
    document.getElementById("panel-sucursales")?.classList.remove("open");
}

function renderListaSucursales() {
    const lista = getSucursales();
    const container = document.getElementById("lista-sucursales-admin");
    if (!container) return;

    if (lista.length === 0) {
        container.innerHTML = `<p style="color:var(--text-muted);font-size:0.85rem;">Sin sucursales.</p>`;
        return;
    }

    container.innerHTML = lista.map(s => `
        <div class="sucursal-admin-item">
            <span class="sucursal-admin-nombre">${s.nombre}</span>
            <div class="sucursal-admin-actions">
                <button class="btn-icon" data-editar-id="${s.id}" data-editar-nombre="${s.nombre}" title="Renombrar"><i class="ph ph-pencil-simple icon-sm"></i></button>
                <button class="btn-icon" data-eliminar-id="${s.id}" data-eliminar-nombre="${s.nombre}" title="Eliminar"><i class="ph ph-trash icon-sm"></i></button>
            </div>
        </div>
    `).join("");

    container.querySelectorAll("[data-editar-id]").forEach(btn => {
        btn.addEventListener("click", () => {
            cerrarPanelSucursales();
            abrirEdicionSucursal(btn.dataset.editarId, btn.dataset.editarNombre);
        });
    });
    container.querySelectorAll("[data-eliminar-id]").forEach(btn => {
        btn.addEventListener("click", () => eliminarSucursal(btn.dataset.eliminarId, btn.dataset.eliminarNombre));
    });
}

// Bindear controles de sucursal
document.getElementById("btn-nueva-sucursal")?.addEventListener("click", () => abrirModalSucursal());
document.getElementById("btn-gestionar-sucursales")?.addEventListener("click", abrirPanelSucursales);
document.getElementById("btn-guardar-sucursal")?.addEventListener("click", guardarSucursal);
document.getElementById("btn-cancelar-sucursal")?.addEventListener("click", cerrarModalSucursal);
document.getElementById("btn-cerrar-panel-sucursales")?.addEventListener("click", cerrarPanelSucursales);
document.getElementById("btn-nueva-desde-panel")?.addEventListener("click", () => {
    cerrarPanelSucursales();
    abrirModalSucursal();
});
document.getElementById("modal-sucursal")?.addEventListener("click", e => {
    if (e.target.id === "modal-sucursal") cerrarModalSucursal();
});
document.getElementById("panel-sucursales")?.addEventListener("click", e => {
    if (e.target.id === "panel-sucursales") cerrarPanelSucursales();
});

// Enter en campo nombre
document.getElementById("form-sucursal-nombre")?.addEventListener("keydown", e => {
    if (e.key === "Enter") guardarSucursal();
});


// ── Módulos ───────────────────────────────────────────────────────────────

function resetTodosLosModulos() {
    resetPOS();
    resetInventario();
    resetDashboard();
}

window.addEventListener("tizon:login", async () => {
    resetTodosLosModulos();
    await cargarSucursales();
    mostrarSeccion("pos");
    setTimeout(() => iniciarTutorial(), 800);
});

window.addEventListener("tizon:logout", () => {
    resetTodosLosModulos();
    resetSucursal();
    poblarSelectoresSucursal([]);
});


// ── Arranque ──────────────────────────────────────────────────────────────
import { initAuth } from "./auth.js";
initAuth();
bindTutorialEvents();
mostrarSeccion("pos");

// Si ya hay token (recarga de página), cargar sucursales sin esperar tizon:login
if (localStorage.getItem("tizon_token")) {
    cargarSucursales().then(() => mostrarSeccion(seccionActual)).catch(console.error);
}
