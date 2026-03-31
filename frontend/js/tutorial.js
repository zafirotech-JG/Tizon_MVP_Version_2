import { isAdmin } from "./auth.js";
import { mostrarSeccion } from "./app.js";

// Guardar si el usuario ya vio el tutorial para no abrumarlo
const TOUR_STORAGE_KEY = "tizon_tour_completado";

export function iniciarTutorial(forzar = false) {
    if (!window.driver) {
        console.warn("Driver.js no está cargado.");
        return;
    }

    const yaVisto = localStorage.getItem(TOUR_STORAGE_KEY);
    if (yaVisto && !forzar) return; 

    const driverObj = window.driver.js.driver;

    const tourAdmin = [
        { popover: { title: "Bienvenido a Tizón V1 🔥", description: "Vamos a dar un recorrido rápido por el sistema.", side: "bottom", align: "start" } },
        { element: ".sucursal-selector", popover: { title: "Sucursales", description: "Como administrador, aquí puedes crear nuevas sucursales o editar las existentes.", side: "right", align: "start" } },
        {
            element: "[data-seccion='inventario']", 
            popover: { title: "Inventario & Menú", description: "Aquí puedes dar de alta nuevos productos y su precio.", side: "right", align: "start" },
            onHighlightStarted: () => mostrarSeccion("inventario")
        },
        {
            element: "#seccion-categorias-admin", 
            popover: { title: "Gestión de Categorías", description: "Solo los administradores pueden editar o eliminar las categorías en el sistema para mantener consistencia.", side: "bottom", align: "center" },
            onHighlightStarted: () => mostrarSeccion("inventario")
        },
        {
            element: "[data-seccion='dashboard']", 
            popover: { title: "Dashboard & Reportes", description: "Visualiza el desempeño de tus sucursales y cuadre de caja del día.", side: "right", align: "start" },
            onHighlightStarted: () => mostrarSeccion("dashboard")
        },
        {
            element: "#seccion-historial-ventas", 
            popover: { title: "Historial de Venta", description: "Lleva control de todos los pedidos. Si hubo un error, aquí puedes anularlos usando tu código de seguridad (PIN).", side: "top", align: "center" },
            onHighlightStarted: () => mostrarSeccion("dashboard")
        },
        {
            element: "[data-seccion='pos']", 
            popover: { title: "Punto de Venta", description: "Tu caja registradora fluida de 2 paneles. Haz clic en las categorías (superior) para filtrar tus menús.", side: "right", align: "start" },
            onHighlightStarted: () => mostrarSeccion("pos")
        },
        { popover: { title: "¡Todo Listo!", description: "Este tour está disponible cuando lo necesites haciendo clic en el botón de Ayuda '?' abajo a la derecha.", side: "bottom", align: "center" } }
    ];

    const tourCajero = [
        { popover: { title: "Bienvenido a tu Caja Tizón 🔥", description: "Te mostraremos rápidamente cómo operar tu punto de venta." } },
        {
            element: "[data-seccion='pos']", 
            popover: { title: "Punto de Venta", description: "Esta es tu pantalla principal. Desde aquí operarás pedidos.", side: "right", align: "start" },
            onHighlightStarted: () => mostrarSeccion("pos")
        },
        {
            element: ".catalogo-panel", 
            popover: { title: "Catálogo", description: "Busca productos rápidamente o navega a través de lasTabs superiores para encontrar los diferentes menú.", side: "right", align: "start" },
        },
        {
            element: ".panel-carrito", 
            popover: { title: "Panel de Cobro", description: "Aquí verás el resumen del pedido. Agrega, quita o suma extras al pedido aquí.", side: "left", align: "start" },
        },
        {
            element: "#btn-cobrar", 
            popover: { title: "Cierre de Orden", description: "Cuando el cliente decida pagar, da clic aquí para elegir el método de pago e ingresa el cálculo automático de cambio.", side: "top", align: "start" },
        },
        {
            element: "[data-seccion='inventario']", 
            popover: { title: "Catálogo General", description: "Consulta listados de precios rápidamente sin realizar ventas.", side: "right", align: "start" },
            onHighlightStarted: () => mostrarSeccion("inventario")
        },
        { popover: { title: "¡Ya puedes comenzar a procesar pedidos!", description: "Vuelve aquí siempre que desees pulsando el icono de duda '?'", side: "bottom", align: "center"} }
    ];

    const steps = isAdmin() ? tourAdmin : tourCajero;

    const tour = driverObj({
        showProgress: true,
        steps: steps,
        nextBtnText: "Siguiente",
        prevBtnText: "Atrás",
        doneBtnText: "Finalizar",
        progressText: "Paso {{current}} de {{total}}",
        onDestroyStarted: () => {
            tour.destroy();
            localStorage.setItem(TOUR_STORAGE_KEY, "true");
        }
    });

    tour.drive();
}

export function bindTutorialEvents() {
    const btnAyu = document.getElementById("btn-tutorial-help");
    if (btnAyu) {
        btnAyu.addEventListener("click", () => iniciarTutorial(true));
    }
}
