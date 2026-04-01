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
        { popover: { title: "Bienvenido a Tizón", description: "Te guiaremos paso a paso por las funciones principales del sistema. Solo tomará un momento.", side: "bottom", align: "start" } },
        { element: ".sucursal-selector", popover: { title: "Tus Sucursales", description: "Administra tus puntos de venta desde aquí. Puedes crear nuevas sucursales, renombrarlas o eliminarlas según necesites.", side: "right", align: "start" } },
        {
            element: "[data-seccion='inventario']", 
            popover: { title: "Inventario y Menú", description: "Registra tus productos con nombre, precio y categoría. Mantén tu catálogo siempre actualizado.", side: "right", align: "start" },
            onHighlightStarted: () => mostrarSeccion("inventario")
        },
        {
            element: "#seccion-categorias-admin", 
            popover: { title: "Categorías", description: "Organiza tus productos en categorías para que el equipo de caja los encuentre más rápido. Solo los administradores pueden modificarlas.", side: "bottom", align: "center" },
            onHighlightStarted: () => mostrarSeccion("inventario")
        },
        {
            element: "[data-seccion='dashboard']", 
            popover: { title: "Reportes y Cierre de Caja", description: "Consulta las ventas del día, el desglose por método de pago y los productos más vendidos de cada sucursal.", side: "right", align: "start" },
            onHighlightStarted: () => mostrarSeccion("dashboard")
        },
        {
            element: "#seccion-historial-ventas", 
            popover: { title: "Historial de Transacciones", description: "Revisa cada venta registrada. Si hay un error, puedes editar la cantidad o anular la transacción con tu PIN de seguridad.", side: "top", align: "center" },
            onHighlightStarted: () => mostrarSeccion("dashboard")
        },
        {
            element: "[data-seccion='pos']", 
            popover: { title: "Punto de Venta", description: "Tu caja registradora. Selecciona productos del catálogo, ajusta cantidades y procesa el cobro de forma rápida.", side: "right", align: "start" },
            onHighlightStarted: () => mostrarSeccion("pos")
        },
        { popover: { title: "Listo para empezar", description: "Puedes volver a ver este recorrido en cualquier momento con el botón de ayuda (?) en la esquina inferior derecha.", side: "bottom", align: "center" } }
    ];

    const tourCajero = [
        { popover: { title: "Bienvenido a tu Caja Tizón", description: "Te mostraremos cómo operar tu punto de venta de forma rápida y sencilla." } },
        {
            element: "[data-seccion='pos']", 
            popover: { title: "Punto de Venta", description: "Esta es tu pantalla principal. Desde aquí gestionarás todos los pedidos del día.", side: "right", align: "start" },
            onHighlightStarted: () => mostrarSeccion("pos")
        },
        {
            element: ".catalogo-panel", 
            popover: { title: "Catálogo de Productos", description: "Busca productos por nombre o usa las pestañas de categoría en la parte superior para encontrarlos más rápido.", side: "right", align: "start" },
        },
        {
            element: ".panel-carrito", 
            popover: { title: "Resumen del Pedido", description: "Aquí se muestra el detalle de la orden actual. Puedes ajustar cantidades o eliminar productos antes de cobrar.", side: "left", align: "start" },
        },
        {
            element: "#btn-cobrar", 
            popover: { title: "Procesar Cobro", description: "Cuando el cliente esté listo para pagar, presiona aquí. Selecciona el método de pago y el sistema calcula el cambio automáticamente.", side: "top", align: "start" },
        },
        {
            element: "[data-seccion='inventario']", 
            popover: { title: "Consulta de Precios", description: "Revisa el listado completo de productos y precios sin necesidad de crear una venta.", side: "right", align: "start" },
            onHighlightStarted: () => mostrarSeccion("inventario")
        },
        { popover: { title: "Todo listo", description: "Ya puedes comenzar a procesar pedidos. Recuerda que este recorrido está disponible desde el botón (?) en la esquina inferior derecha.", side: "bottom", align: "center"} }
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
