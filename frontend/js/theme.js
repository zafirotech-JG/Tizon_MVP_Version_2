/**
 * theme.js — Inyección dinámica del branding del tenant.
 *
 * Flujo:
 *  1) Login exitoso → guardar branding en localStorage
 *  2) Al cargar la app → aplicarBranding() lee de localStorage (instant) 
 *     y luego refresca del servidor
 *  3) Actualización de branding desde panel config → aplicarDesdeServidor()
 *
 * Las variables CSS --tenant-* se sobrescriben en :root.
 * Las variables --zafiro-* NUNCA se tocan (inmutables).
 */

const BRANDING_KEY = "zafiro_branding";

// ── Defaults ────────────────────────────────────────────────────────────
const DEFAULTS = {
    color_primary:    "#e25822",
    color_secondary:  "#1a1714",
    color_accent:     "#22c55e",
    tema:             "dark",
    tipografia:       "Inter",
    nombre_comercial: "Mi Negocio",
    logo_url:         null,
};


// ── Aplicar branding al DOM ──────────────────────────────────────────────
function _aplicar(b) {
    const root = document.documentElement;
    root.style.setProperty("--tenant-primary",   b.color_primary   || DEFAULTS.color_primary);
    root.style.setProperty("--tenant-secondary", b.color_secondary || DEFAULTS.color_secondary);
    root.style.setProperty("--tenant-accent",    b.color_accent    || DEFAULTS.color_accent);

    // Data attribute para CSS condicional (dark/light/warm)
    root.dataset.tema = b.tema || DEFAULTS.tema;

    // Tipografía dinámica
    const font = b.tipografia || DEFAULTS.tipografia;
    root.style.setProperty("--font-family", `'${font}', system-ui, sans-serif`);

    // Logo del tenant (si existe elemento en el DOM)
    const logoEl = document.getElementById("logo-tenant");
    if (logoEl && b.logo_url) {
        logoEl.src = b.logo_url;
        logoEl.alt = b.nombre_comercial || "";
    }

    // Nombre comercial (si existe elemento)
    const nameEl = document.getElementById("tenant-name");
    if (nameEl) {
        nameEl.textContent = b.nombre_comercial || DEFAULTS.nombre_comercial;
    }

    // Precargar Google Font si no es Inter (que ya está en el CSS base)
    if (font !== "Inter" && !document.querySelector(`link[data-font="${font}"]`)) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.dataset.font = font;
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@400;500;600;700&display=swap`;
        document.head.appendChild(link);
    }
}


// ── API de lectura ──────────────────────────────────────────────────────

/**
 * Aplica branding instantáneamente desde localStorage (no espera red).
 * Llamar al cargar la app para evitar FOUC (flash of unstyled content).
 */
function aplicarBrandingLocal() {
    try {
        const cached = localStorage.getItem(BRANDING_KEY);
        if (cached) {
            _aplicar(JSON.parse(cached));
            return true;
        }
    } catch { /* corrupto — ignorar */ }
    _aplicar(DEFAULTS);
    return false;
}


/**
 * Obtiene branding del servidor y lo aplica + cachea.
 * Requiere token de auth (llamar después del login).
 */
async function aplicarDesdeServidor(token) {
    try {
        const res = await fetch("/api/v3/branding", {
            headers: { "Authorization": `Bearer ${token}` },
        });
        if (!res.ok) return;
        const b = await res.json();
        _aplicar(b);
        localStorage.setItem(BRANDING_KEY, JSON.stringify(b));
    } catch (err) {
        console.warn("[theme] Error al cargar branding del servidor:", err.message);
    }
}


/**
 * Limpia branding cacheado (llamar en logout).
 */
function limpiarBranding() {
    localStorage.removeItem(BRANDING_KEY);
    _aplicar(DEFAULTS);
    document.documentElement.removeAttribute("data-tema");
}


/**
 * Guarda branding actualizado en cache local (tras PUT exitoso).
 */
function guardarBrandingLocal(brandingObj) {
    _aplicar(brandingObj);
    localStorage.setItem(BRANDING_KEY, JSON.stringify(brandingObj));
}


// ── Exports ─────────────────────────────────────────────────────────────
// Compatibilidad con módulo ES y script global
if (typeof window !== "undefined") {
    window.ZafiroTheme = {
        aplicarBrandingLocal,
        aplicarDesdeServidor,
        limpiarBranding,
        guardarBrandingLocal,
        DEFAULTS,
    };
}

export {
    aplicarBrandingLocal,
    aplicarDesdeServidor,
    limpiarBranding,
    guardarBrandingLocal,
    DEFAULTS,
};
