/**
 * admin.js — Admin panel module (unified in the SPA)
 * Only visible when es_admin=true in JWT.
 */

import { API }           from "./api.js";
import { showToast, formatCOP } from "./utils.js";
import { showConfirm }   from "./dialog.js";

let _adminIniciado = false;
let _tenants       = [];

export function resetAdmin() {
    _tenants = [];
    const tbody = document.getElementById("tabla-admin-body");
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="empty-cell">Cargando tenants…</td></tr>`;
}

export async function initAdmin() {
    if (!_adminIniciado) {
        bindEventos();
        _adminIniciado = true;
    }
    await cargarTenants();
}

async function cargarTenants() {
    const tbody = document.getElementById("tabla-admin-body");
    if (!tbody) return;

    try {
        _tenants = await API.admin.tenants();
        renderTabla();
    } catch (err) {
        showToast(`Error cargando tenants: ${err.message}`, "error");
        tbody.innerHTML = `<tr><td colspan="6" class="empty-cell">Error cargando datos</td></tr>`;
    }
}

function renderTabla() {
    const tbody = document.getElementById("tabla-admin-body");
    if (!tbody) return;

    if (_tenants.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-cell">Sin tenants registrados</td></tr>`;
        return;
    }

    tbody.innerHTML = _tenants.map(t => {
        const badgeActivo = t.plan_activo
            ? `<span class="badge badge-success">● Activo</span>`
            : `<span class="badge badge-danger">● Suspendido</span>`;

        const venc = formatFecha(t.fecha_vencimiento);
        const vencBadge = badgeVencimiento(t.fecha_vencimiento);

        const btnToggle = t.plan_activo
            ? `<button class="btn btn-danger btn-sm" data-action="toggle" data-id="${t.id}" data-activo="true">Suspender</button>`
            : `<button class="btn btn-success-solid btn-sm" data-action="toggle" data-id="${t.id}" data-activo="false">Activar</button>`;

        const btnRenovar = `<button class="btn btn-warning btn-sm" data-action="renovar" data-id="${t.id}" data-venc="${t.fecha_vencimiento || ''}">+30 días</button>`;

        return `<tr>
            <td>
                <div class="td-nombre">${esc(t.nombre)}</div>
                <div class="td-email">${esc(t.email)}</div>
            </td>
            <td class="td-plan">${esc(t.plan || '—')}</td>
            <td>${badgeActivo}</td>
            <td>${vencBadge}<div style="font-size:0.8rem;color:var(--text-muted);margin-top:3px;">${venc}</div></td>
            <td style="color:var(--text-muted);font-size:0.82rem;">${formatFecha(t.creado_en)}</td>
            <td><div class="admin-actions">${btnToggle}${btnRenovar}</div></td>
        </tr>`;
    }).join("");

    // Bind action buttons
    tbody.querySelectorAll("[data-action]").forEach(btn => {
        btn.addEventListener("click", () => {
            if (btn.dataset.action === "toggle")  handleToggle(btn);
            if (btn.dataset.action === "renovar") handleRenovar(btn);
        });
    });
}

async function handleToggle(btn) {
    const id       = Number(btn.dataset.id);
    const activo   = btn.dataset.activo === "true";
    const nuevoVal = !activo;
    const label    = nuevoVal ? "activar" : "suspender";

    const confirmed = await showConfirm({
        title: `${nuevoVal ? "Activar" : "Suspender"} tenant`,
        body: `¿Seguro que deseas ${label} este tenant?`,
        confirmText: label.charAt(0).toUpperCase() + label.slice(1),
        type: nuevoVal ? "info" : "danger",
    });
    if (!confirmed) return;

    btn.disabled = true;
    try {
        await API.admin.patchTenant(id, { plan_activo: nuevoVal });
        const t = _tenants.find(x => x.id === id);
        if (t) t.plan_activo = nuevoVal;
        renderTabla();
        showToast(`Tenant ${nuevoVal ? "activado" : "suspendido"}`, "success");
    } catch (err) {
        showToast(err.message, "error");
        btn.disabled = false;
    }
}

async function handleRenovar(btn) {
    const id          = Number(btn.dataset.id);
    const vencActual  = btn.dataset.venc;

    const base = vencActual && new Date(vencActual) > new Date()
        ? new Date(vencActual)
        : new Date();
    base.setDate(base.getDate() + 30);

    btn.disabled    = true;
    btn.textContent = "…";
    try {
        const res = await API.admin.patchTenant(id, {
            fecha_vencimiento: base.toISOString(),
        });
        const t = _tenants.find(x => x.id === id);
        if (t) t.fecha_vencimiento = res.fecha_vencimiento;
        renderTabla();
        showToast("Suscripción renovada 30 días", "success");
    } catch (err) {
        showToast(err.message, "error");
        btn.disabled    = false;
        btn.textContent = "+30 días";
    }
}

// ── Utils ──────────────────────────────────────────────────────────────────
function formatFecha(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("es-CO", {
        year: "numeric", month: "short", day: "numeric",
    });
}

function badgeVencimiento(iso) {
    if (!iso) return "";
    const fecha  = new Date(iso);
    const ahora  = new Date();
    const dias   = Math.ceil((fecha - ahora) / 86400000);
    if (dias < 0)  return `<span class="badge badge-danger">Vencido</span>`;
    if (dias <= 7) return `<span class="badge badge-warning">Vence en ${dias}d</span>`;
    return `<span class="badge badge-success">Vigente</span>`;
}

function esc(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function bindEventos() {
    document.getElementById("btn-admin-refresh")?.addEventListener("click", cargarTenants);
}
