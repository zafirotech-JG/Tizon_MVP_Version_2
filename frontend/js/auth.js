/**
 * auth.js — Maneja login Y registro de nuevos tenants
 * FIX: limpia sessionStorage en login, logout y registro
 * para que cada usuario vea solo sus propios datos.
 */

import { API } from "./api.js";
import { showToast } from "./utils.js";

export function initAuth() {
    bindEventos();
    verificarSesion();
}

function bindEventos() {
    // Login (igual que el original)
    document.getElementById("btn-login")?.addEventListener("click", handleLogin);
    document.getElementById("btn-logout-desktop")?.addEventListener("click", handleLogout);
    document.getElementById("btn-logout-mobile")?.addEventListener("click", handleLogout);

    document.getElementById("login-password")?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") handleLogin();
    });

    // Registro (nuevo)
    document.getElementById("btn-register")?.addEventListener("click", handleRegister);
    document.getElementById("link-ir-registro")?.addEventListener("click", mostrarRegistro);
    document.getElementById("link-ir-login")?.addEventListener("click", mostrarLogin);

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
        mostrarLogin();  // siempre empieza en la pantalla de login
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
    // Borra todos los datos cacheados del usuario anterior
    // Evita que un usuario vea productos/categorias de otro
    sessionStorage.removeItem("tizon_productos");
    sessionStorage.removeItem("tizon_categorias");
}

// ── Login (idéntico al original) ────────────────────────────────────────
async function handleLogin() {
    const username = document.getElementById("login-username")?.value.trim();
    const password = document.getElementById("login-password")?.value.trim();
    const btn      = document.getElementById("btn-login");

    if (!username || !password) {
        showToast("Ingresa usuario y contraseña", "warning");
        return;
    }

    btn.disabled    = true;
    btn.textContent = "Ingresando...";

    try {
        const res = await API.auth.login(username, password);

        // Limpiar cache ANTES de guardar el nuevo token
        limpiarCache();

        localStorage.setItem("tizon_token", res.access_token);
        if (res.nombre) localStorage.setItem("tizon_tenant_nombre", res.nombre);
        showToast("Sesión iniciada correctamente", "success");

        // Ocultar overlay y notificar a app.js para cargar el POS
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

// ── Registro (nuevo) ────────────────────────────────────────────────────
async function handleRegister() {
    const email    = document.getElementById("reg-email")?.value.trim();
    const password = document.getElementById("reg-password")?.value.trim();
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

    btn.disabled    = true;
    btn.textContent = "Creando cuenta...";

    try {
        const res = await API.auth.register(email, password, nombre);

        // Limpiar cache ANTES de guardar el nuevo token
        limpiarCache();

        localStorage.setItem("tizon_token", res.access_token);
        localStorage.setItem("tizon_tenant_nombre", res.nombre);
        showToast(`Bienvenido, ${res.nombre}`, "success");

        // Ocultar overlay y notificar a app.js para cargar el POS
        document.getElementById("login-overlay").classList.remove("visible");
        window.dispatchEvent(new CustomEvent("tizon:login"));

        // Mostrar onboarding si el tenant aún no tiene sucursales
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
    // Limpiar token Y cache al cerrar sesión
    localStorage.removeItem("tizon_token");
    localStorage.removeItem("tizon_tenant_nombre");
    limpiarCache();

    // Notificar a app.js para resetear estado de todos los módulos
    window.dispatchEvent(new CustomEvent("tizon:logout"));

    // Mostrar overlay de login sin recargar la página
    const overlay = document.getElementById("login-overlay");
    if (overlay) overlay.classList.add("visible");
    document.getElementById("form-login")?.classList.remove("hidden");
    document.getElementById("form-registro")?.classList.add("hidden");
}