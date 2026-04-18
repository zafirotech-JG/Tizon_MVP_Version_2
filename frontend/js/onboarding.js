/**
 * onboarding.js — Tour interactivo Zafiro con Shepherd.js
 *
 * Flujo de 3 pasos:
 *   1. Configurar perfil del negocio (nombre, colores)
 *   2. Agregar el primer producto
 *   3. Realizar la primera venta de prueba
 *
 * Dependencia: Shepherd.js v11+ cargado desde CDN
 *   <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/shepherd.js@11/dist/css/shepherd.css"/>
 *   <script src="https://cdn.jsdelivr.net/npm/shepherd.js@11/dist/js/shepherd.min.js"></script>
 */

// ── Estado local ─────────────────────────────────────────────────────────
let _tour = null;
let _token = null;  // JWT para llamadas API


// ── Helpers ──────────────────────────────────────────────────────────────
function _progressHTML(currentStep) {
    const steps = ["perfil", "producto", "venta"];
    const dots = steps.map((s, i) => {
        let cls = "step-dot";
        if (i < currentStep)  cls += " done";
        if (i === currentStep) cls += " active";
        return `<span class="${cls}"></span>`;
    }).join("");
    return `<div class="zafiro-onboarding-progress">${dots}</div>`;
}

async function _marcarPaso(paso) {
    try {
        await fetch(`/api/v3/onboarding/${paso}`, {
            method: "PATCH",
            headers: { "Authorization": `Bearer ${_token}` },
        });
    } catch (err) {
        console.warn("[onboarding] Error al marcar paso:", err.message);
    }
}


// ── Tour factory ─────────────────────────────────────────────────────────
function _crearTour() {
    if (typeof Shepherd === "undefined") {
        console.warn("[onboarding] Shepherd.js no cargado. Saltando tour.");
        return null;
    }

    const tour = new Shepherd.Tour({
        useModalOverlay: true,
        defaultStepOptions: {
            classes: "zafiro-shepherd",
            scrollTo: { behavior: "smooth", block: "center" },
            cancelIcon: { enabled: true },
            modalOverlayOpeningPadding: 10,
            modalOverlayOpeningRadius: 14,
        },
    });

    // ── Step 1: Configurar Perfil ────────────────────────────────────────
    tour.addStep({
        id: "perfil",
        title: "Personaliza tu negocio",
        text: `
            ${_progressHTML(0)}
            <p>Primero configuremos el nombre y los colores de tu marca.
            Esto se verá en todo tu POS.</p>
            <p style="color: var(--text-muted); font-size: 0.82rem;">
                Puedes cambiarlo después en Configuración.
            </p>
        `,
        attachTo: {
            element: "#btn-config-perfil, #nav-config, [data-tour='perfil']",
            on: "bottom",
        },
        buttons: [
            {
                text: "Omitir tour",
                classes: "shepherd-button-secondary",
                action: () => { _saltarTour(); tour.cancel(); },
            },
            {
                text: "Configurar ahora",
                action: async () => {
                    await _marcarPaso("perfil");
                    tour.next();
                },
            },
        ],
    });

    // ── Step 2: Agregar Primer Producto ──────────────────────────────────
    tour.addStep({
        id: "producto",
        title: "Agrega tu primer producto",
        text: `
            ${_progressHTML(1)}
            <p>Los productos son la base de tu POS. Crea uno de prueba
            — puedes editarlo o borrarlo después.</p>
        `,
        attachTo: {
            element: "#btn-nuevo-producto, [data-tour='producto']",
            on: "right",
        },
        buttons: [
            {
                text: "Omitir",
                classes: "shepherd-button-secondary",
                action: () => tour.next(),
            },
            {
                text: "Crear producto",
                action: async () => {
                    // Intenta abrir el modal de nuevo producto
                    const btn = document.querySelector("#btn-nuevo-producto, [data-tour='producto']");
                    if (btn) btn.click();
                    await _marcarPaso("producto");
                    tour.next();
                },
            },
        ],
    });

    // ── Step 3: Primera Venta ────────────────────────────────────────────
    tour.addStep({
        id: "venta",
        title: "Realiza tu primera venta",
        text: `
            ${_progressHTML(2)}
            <p>Toca un producto, elige el método de pago y confirma.
            Así operarán tus cajeros todos los días.</p>
        `,
        attachTo: {
            element: ".producto-card:first-child, [data-tour='venta']",
            on: "top",
        },
        buttons: [
            {
                text: "Omitir",
                classes: "shepherd-button-secondary",
                action: () => tour.next(),
            },
            {
                text: "Hacer venta de prueba",
                action: async () => {
                    await _marcarPaso("venta");
                    tour.next();
                },
            },
        ],
    });

    // ── Step Final: Celebración ──────────────────────────────────────────
    tour.addStep({
        id: "finish",
        title: "¡Tu negocio está listo!",
        text: `
            <div class="onboarding-celebration">
                <div class="celebration-icon">&#10024;</div>
                <p>Ya puedes empezar a vender. Invita a tus empleados
                desde <strong>Configuración &rarr; Usuarios</strong>.</p>
                <p style="color: var(--text-muted); font-size: 0.82rem; margin-top: 8px;">
                    ¿Necesitas ayuda? Escríbenos a soporte@zafiro.co
                </p>
            </div>
        `,
        buttons: [
            {
                text: "Empezar a vender",
                action: () => tour.complete(),
            },
        ],
    });

    return tour;
}


async function _saltarTour() {
    try {
        await fetch("/api/v3/onboarding/skip", {
            method: "POST",
            headers: { "Authorization": `Bearer ${_token}` },
        });
    } catch { /* silencio */ }
}


// ── API Pública ──────────────────────────────────────────────────────────

/**
 * Inicia el tour si el usuario no lo ha completado ni saltado.
 * @param {string} token - JWT de acceso del usuario logueado
 */
async function iniciarOnboarding(token) {
    _token = token;

    // Consultar progreso del servidor
    try {
        const res = await fetch("/api/v3/onboarding", {
            headers: { "Authorization": `Bearer ${token}` },
        });
        if (!res.ok) return;
        const progress = await res.json();

        // Si ya terminó o saltó, no mostrar
        if (progress.completado || progress.saltado) return;

        // Pequeño delay para que la UI cargue primero
        setTimeout(() => {
            _tour = _crearTour();
            if (_tour) _tour.start();
        }, 800);
    } catch (err) {
        console.warn("[onboarding] No se pudo cargar progreso:", err.message);
    }
}

/**
 * Cancela el tour si está corriendo.
 */
function cancelarOnboarding() {
    if (_tour) {
        _tour.cancel();
        _tour = null;
    }
}


// ── Exports ─────────────────────────────────────────────────────────────
if (typeof window !== "undefined") {
    window.ZafiroOnboarding = {
        iniciarOnboarding,
        cancelarOnboarding,
    };
}

export { iniciarOnboarding, cancelarOnboarding };
