/**
 * auth.js — Maneja login Y registro de nuevos tenants
 * Guarda es_admin en localStorage para control de acceso en frontend.
 */

import { API } from "./api.js";
import { showToast } from "./utils.js";

export function initAuth() {
    bindEventos();
    verificarSesion();
}

/** Retorna true si el usuario autenticado es admin. */
export function isAdmin() {
    return localStorage.getItem("tizon_es_admin") === "true";
}

function bindEventos() {
    // Login
    document.getElementById("form-login")?.addEventListener("submit", (e) => {
        e.preventDefault();
        handleLogin();
    });
    document.getElementById("btn-logout-desktop")?.addEventListener("click", handleLogout);
    document.getElementById("btn-logout-mobile")?.addEventListener("click", handleLogout);

    // Registro
    document.getElementById("form-registro")?.addEventListener("submit", (e) => {
        e.preventDefault();
        handleRegister();
    });
    document.getElementById("link-ir-registro")?.addEventListener("click", (e) => {
        e.preventDefault();
        mostrarRegistro();
    });
    document.getElementById("link-ir-login")?.addEventListener("click", (e) => {
        e.preventDefault();
        mostrarLogin();
    });

    // Onboarding
    document.getElementById("btn-cerrar-bienvenida")?.addEventListener("click", cerrarBienvenida);
    document.getElementById("btn-bienvenida-sucursal")?.addEventListener("click", () => {
        cerrarBienvenida();
        document.getElementById("btn-nueva-sucursal")?.click();
    });
    document.getElementById("btn-bienvenida-inventario")?.addEventListener("click", () => {
        cerrarBienvenida();
        document.querySelector('.nav-item[data-seccion="inventario"]')?.click();
    });
    document.getElementById("btn-bienvenida-pos")?.addEventListener("click", () => {
        cerrarBienvenida();
        document.querySelector('.nav-item[data-seccion="pos"]')?.click();
    });
    document.getElementById("modal-bienvenida")?.addEventListener("click", e => {
        if (e.target.id === "modal-bienvenida") cerrarBienvenida();
    });
}

function cerrarBienvenida() {
    document.getElementById("modal-bienvenida")?.classList.remove("open");
}

function verificarSesion() {
    const token = localStorage.getItem("tizon_token");
    const overlay = document.getElementById("login-overlay");
    if (token) {
        overlay?.classList.remove("visible");
    } else {
        overlay?.classList.add("visible");
        mostrarLogin();
    }
}

function mostrarLogin() {
    document.getElementById("form-login")?.classList.remove("hidden");
    document.getElementById("form-registro")?.classList.add("hidden");
}

function mostrarRegistro() {
    document.getElementById("form-login")?.classList.add("hidden");
    document.getElementById("form-registro")?.classList.remove("hidden");
}

function limpiarCache() {
    sessionStorage.removeItem("tizon_productos");
    sessionStorage.removeItem("tizon_categorias");
}

// ── Login ────────────────────────────────────────────────────────────────
async function handleLogin() {
    const username = document.getElementById("login-username")?.value.trim();
    const password = document.getElementById("login-password")?.value;
    const btn      = document.getElementById("btn-login");

    if (!username || !password) {
        showToast("Ingresa usuario y contraseña", "warning");
        return;
    }

    btn.disabled    = true;
    btn.textContent = "Ingresando...";

    try {
        const res = await API.auth.login(username, password);

        limpiarCache();

        localStorage.setItem("tizon_token",      res.access_token);
        localStorage.setItem("tizon_es_admin",   String(res.es_admin || false));
        if (res.nombre) localStorage.setItem("tizon_tenant_nombre", res.nombre);

        showToast("Sesión iniciada correctamente", "success");

        document.getElementById("login-password").value = "";
        document.getElementById("login-overlay").classList.remove("visible");
        window.dispatchEvent(new CustomEvent("tizon:login"));
    } catch (err) {
        showToast(`Error: ${err.message}`, "error");
    } finally {
        btn.disabled    = false;
        btn.textContent = "Entrar";
    }
}

// ── Registro ─────────────────────────────────────────────────────────────
async function handleRegister() {
    const email    = document.getElementById("reg-email")?.value.trim();
    const password = document.getElementById("reg-password")?.value;
    const nombre   = document.getElementById("reg-nombre")?.value.trim();
    const btn      = document.getElementById("btn-register");

    if (!email || !password || !nombre) {
        showToast("Completa todos los campos", "warning");
        return;
    }
    if (password.length < 6) {
        showToast("La contraseña debe tener al menos 6 caracteres", "warning");
        return;
    }
    if (password.length > 72) {
        showToast("La contraseña no puede superar 72 caracteres", "warning");
        return;
    }

    btn.disabled    = true;
    btn.textContent = "Creando cuenta...";

    try {
        const res = await API.auth.register(email, password, nombre);

        limpiarCache();

        localStorage.setItem("tizon_token",      res.access_token);
        localStorage.setItem("tizon_es_admin",   String(res.es_admin || false));
        localStorage.setItem("tizon_tenant_nombre", res.nombre);
        showToast(`Bienvenido, ${res.nombre}`, "success");

        document.getElementById("login-overlay").classList.remove("visible");
        window.dispatchEvent(new CustomEvent("tizon:login"));

        try {
            const sucursales = await API.sucursales.listar();
            if (sucursales.length === 0) {
                document.getElementById("modal-bienvenida")?.classList.add("open");
            }
        } catch {
            // silencioso — el onboarding es opcional
        }
    } catch (err) {
        showToast(`Error: ${err.message}`, "error");
    } finally {
        btn.disabled    = false;
        btn.textContent = "Crear cuenta";
    }
}

export function handleLogout() {
    localStorage.removeItem("tizon_token");
    localStorage.removeItem("tizon_tenant_nombre");
    localStorage.removeItem("tizon_es_admin");
    limpiarCache();

    window.dispatchEvent(new CustomEvent("tizon:logout"));

    const overlay = document.getElementById("login-overlay");
    if (overlay) overlay.classList.add("visible");
    document.getElementById("form-login")?.classList.remove("hidden");
    document.getElementById("form-registro")?.classList.add("hidden");
}