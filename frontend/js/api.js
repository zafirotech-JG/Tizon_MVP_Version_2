/**
 * api.js — Capa de comunicación con el backend
 */

const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const BASE_URL = isLocal
    ? ""
    : "https://tizonmvpversion2-production.up.railway.app";

async function request(method, path, body = null) {
    const options = {
        method,
        headers: { "Content-Type": "application/json" },
    };

    const token = localStorage.getItem("tizon_token");
    if (token) {
        options.headers["Authorization"] = `Bearer ${token}`;
    }

    if (body) options.body = JSON.stringify(body);

    const resp = await fetch(`${BASE_URL}${path}`, options);
    const data = await resp.json().catch(() => null);

    if (resp.status === 401) {
        localStorage.removeItem("tizon_token");
        const overlay = document.getElementById("login-overlay");
        if (overlay) overlay.classList.add("visible");
        throw new Error(data?.detail || "Sesión expirada o no autorizada");
    }

    if (!resp.ok) {
        const msg = data?.detail || `Error HTTP ${resp.status}`;
        throw new Error(msg);
    }
    return data;
}

export const API = {
    auth: {
        login: async (username, password) => {
            const response = await fetch(`${BASE_URL}/api/auth/login`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ username, password }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || "Error en el inicio de sesión");
            return data;
        },

        register: async (email, password, nombre) => {
            const response = await fetch(`${BASE_URL}/api/auth/register`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ email, password, nombre }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || "Error en el registro");
            return data;
        },
    },

    sucursales: {
        listar: ()         => request("GET",    "/api/sucursales"),
        crear:  (data)     => request("POST",   "/api/sucursales",       data),
        editar: (id, data) => request("PUT",    `/api/sucursales/${id}`, data),
        eliminar: (id)     => request("DELETE", `/api/sucursales/${id}`),
    },

    productos: {
        listar:   (sucursal_id)      => request("GET",    `/api/productos?sucursal_id=${sucursal_id}`),
        crear:    (data)             => request("POST",   "/api/productos",       data),
        editar:   (id, data)         => request("PUT",    `/api/productos/${id}`, data),
        eliminar: (id)               => request("DELETE", `/api/productos/${id}`),
    },

    categorias: {
        listar:   (sucursal_id) => request("GET",    `/api/categorias?sucursal_id=${sucursal_id}`),
        crear:    (data)        => request("POST",   "/api/categorias", data),
        editar:   (id, data)    => request("PUT",    `/api/categorias/${id}`, data),
        eliminar: (id)          => request("DELETE", `/api/categorias/${id}`),
    },

    ventas: {
        listar:    (sucursal_id, fecha = null) => {
            const qs = new URLSearchParams({ sucursal_id });
            if (fecha) qs.set("fecha", fecha);
            return request("GET", `/api/ventas?${qs}`);
        },
        registrar: (data)         => request("POST",   "/api/ventas", data),
        editar:    (id, data, pin) => request("PUT",    `/api/ventas/${id}?pin=${encodeURIComponent(pin)}`, data),
        anular:    (id, pin)       => request("DELETE", `/api/ventas/${id}?pin=${encodeURIComponent(pin)}`),
    },

    reportes: {
        dia: (sucursal_id, fecha = null) => {
            const qs = new URLSearchParams({ sucursal_id });
            if (fecha) {
                const f = fecha instanceof Date
                    ? fecha.toISOString().split("T")[0]
                    : String(fecha).slice(0, 10);
                qs.set("fecha", f);
            }
            return request("GET", `/api/reportes/dia?${qs}`);
        },
    },
};
