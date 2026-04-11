/**
 * categorias.js — Gestión de categorías (solo admin)
 * Se integra dentro del módulo de inventario.
 */

import { API } from "./api.js";
import { getSucursalId } from "./sucursal.js";
import { showToast } from "./utils.js";
import { isAdmin } from "./auth.js";
import { showConfirm, showPrompt } from "./dialog.js";

let categoriasCache = [];

export function getCategorias() { return categoriasCache; }

export async function cargarYRenderizarCategorias() {
    const sucursalId = getSucursalId();
    const container  = document.getElementById("seccion-categorias-admin");
    if (!container) return [];

    container.style.display = "block";

    if (!sucursalId) {
        container.innerHTML = `<p style="color:var(--text-muted);font-size:0.85rem">Selecciona una sucursal para gestionar categorías.</p>`;
        return [];
    }

    try {
        categoriasCache = await API.categorias.listar(sucursalId);
        renderCategorias(categoriasCache);
        return categoriasCache;
    } catch (err) {
        showToast(`Error cargando categorías: ${err.message}`, "error");
        return [];
    }
}

function renderCategorias(categorias) {
    const container = document.getElementById("lista-categorias-admin");
    if (!container) return;

    if (categorias.length === 0) {
        container.innerHTML = `<p style="color:var(--text-muted);font-size:0.85rem;padding:8px 0">Sin categorías. Crea una al agregar un producto.</p>`;
        return;
    }

    container.innerHTML = categorias.map(cat => `
        <div class="cat-admin-item" data-id="${cat.id}">
            <span class="cat-nombre">${cat.nombre}</span>
            <div class="cat-acciones">
                <button class="btn-icon btn-cat-editar" data-id="${cat.id}" data-nombre="${cat.nombre}" title="Editar nombre">
                    <i class="ph ph-pencil-simple icon-sm"></i>
                </button>
                <button class="btn-icon btn-cat-eliminar btn-eliminar" data-id="${cat.id}" data-nombre="${cat.nombre}" title="Eliminar categoría">
                    <i class="ph ph-trash icon-sm"></i>
                </button>
            </div>
        </div>
    `).join("");

    container.querySelectorAll(".btn-cat-editar").forEach(btn => {
        btn.addEventListener("click", () => editarCategoria(btn.dataset.id, btn.dataset.nombre));
    });
    container.querySelectorAll(".btn-cat-eliminar").forEach(btn => {
        btn.addEventListener("click", () => eliminarCategoria(btn.dataset.id, btn.dataset.nombre));
    });

    // icons are CSS-based (Phosphor), no re-init needed
}

async function editarCategoria(id, nombreActual) {
    const nuevoNombre = await showPrompt({
        title: "Editar categoría",
        body: `Nuevo nombre para la categoría "${nombreActual}"`,
        label: "Nombre",
        placeholder: "Ej: Bebidas, Combos, Entradas...",
        defaultValue: nombreActual,
        confirmText: "Guardar",
        icon: "ph-pencil-simple",
    });
    if (!nuevoNombre || nuevoNombre.trim() === nombreActual.trim()) return;

    try {
        await API.categorias.editar(id, { nombre: nuevoNombre.trim() });
        showToast("Categoría actualizada", "success");
        await cargarYRenderizarCategorias();
        window.dispatchEvent(new CustomEvent("tizon:categorias-updated"));
    } catch (err) {
        showToast(`Error: ${err.message}`, "error");
    }
}

async function eliminarCategoria(id, nombre) {
    const confirmed = await showConfirm({
        title: "Eliminar categoría",
        body: `¿Eliminar la categoría "${nombre}"? Solo se puede eliminar si no tiene productos activos.`,
        confirmText: "Eliminar",
        type: "danger",
        icon: "ph-trash",
    });
    if (!confirmed) return;

    try {
        await API.categorias.eliminar(id);
        showToast("Categoría eliminada", "success");
        await cargarYRenderizarCategorias();
        window.dispatchEvent(new CustomEvent("tizon:categorias-updated"));
    } catch (err) {
        showToast(`Error: ${err.message}`, "error");
    }
}
