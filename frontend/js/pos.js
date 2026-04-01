/**
 * POS Module — Catálogo por categorías con tabs + panel de pedido integrado
 */

import { API }                from "./api.js";
import { getSucursalId, getSucursal } from "./sucursal.js";
import { showToast, formatCOP } from "./utils.js";

// ── Estado ────────────────────────────────────────────────────────────────
let productos = [];
let carrito   = [];
let categorias = [];
let categoriaActiva        = "";   // tab seleccionado
let domicilioActivo        = false;
let metodoPagoSeleccionado = "";
let filtroTexto            = "";
const DOMICILIO_POR_UNIDAD = 1000;

let _posIniciado = false;

export function resetPOS() {
    productos              = [];
    carrito                = [];
    categorias             = [];
    categoriaActiva        = "";
    domicilioActivo        = false;
    metodoPagoSeleccionado = "";
    filtroTexto            = "";

    const grilla = document.getElementById("grilla-productos");
    if (grilla) grilla.innerHTML = "";

    const tabs = document.getElementById("category-tabs");
    if (tabs) tabs.innerHTML = "";

    renderCarrito();

    const buscar = document.getElementById("buscar-producto");
    if (buscar) buscar.value = "";

    ocultarPagoInline();
}

export function initPOS() {
    if (!_posIniciado) {
        bindEventos();
        _posIniciado = true;
    }
    cargarProductos();
}

// ── Carga productos y categorías ──────────────────────────────────────────
async function cargarProductos() {
    const sucursalId = getSucursalId();
    const grilla = document.getElementById("grilla-productos");
    const tabs   = document.getElementById("category-tabs");

    if (!sucursalId) {
        if (grilla) grilla.innerHTML = `<p style="color:var(--text-muted);font-size:0.88rem;grid-column:1/-1">Selecciona una sucursal para ver el menú.</p>`;
        if (tabs)   tabs.innerHTML   = "";
        return;
    }

    if (grilla) {
        grilla.innerHTML = Array(6).fill('<div class="product-card skeleton"><span class="product-name">...</span><span class="product-price">...</span></div>').join('');
    }

    try {
        [productos, categorias] = await Promise.all([
            API.productos.listar(sucursalId),
            API.categorias.listar(sucursalId).catch(() => []),
        ]);

        // Si no hay categorías en la API, inferirlas de los productos
        if (categorias.length === 0) {
            const unicas = [...new Set(productos.map(p => (p.categoria || "General").trim()))];
            categorias = unicas.map((nombre, idx) => ({ id: String(idx), nombre }));
        }

        // Establecer tab activo por defecto
        categoriaActiva = categorias[0]?.nombre || "";

        renderTabs();
        renderGrilla();
    } catch (err) {
        showToast(`Error cargando productos: ${err.message}`, "error");
        if (grilla) grilla.innerHTML = `<p style="color:var(--danger);font-size:0.88rem;grid-column:1/-1">No se pudo cargar el menú</p>`;
    }
}

// ── Tabs de categorías ────────────────────────────────────────────────────
function renderTabs() {
    const container = document.getElementById("category-tabs");
    if (!container) return;

    if (categorias.length === 0) {
        container.innerHTML = "";
        return;
    }

    // Botón "Todos"
    const tabs = [{ id: "__all__", nombre: "Todos" }, ...categorias];

    container.innerHTML = tabs.map(cat => `
        <button type="button"
            class="category-tab${(categoriaActiva === cat.nombre || (cat.id === "__all__" && categoriaActiva === "")) ? " active" : ""}"
            data-categoria="${cat.id === "__all__" ? "" : cat.nombre}">
            ${cat.nombre}
        </button>
    `).join("");

    container.querySelectorAll(".category-tab").forEach(btn => {
        btn.addEventListener("click", () => {
            categoriaActiva = btn.dataset.categoria;
            // update active state
            container.querySelectorAll(".category-tab").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            renderGrilla();
        });
    });
}

// ── Grilla de productos ────────────────────────────────────────────────────
function renderGrilla() {
    const grilla = document.getElementById("grilla-productos");
    if (!grilla) return;

    const texto  = filtroTexto.trim().toLowerCase();

    let filtrados = productos.filter(p => {
        const coincideTexto     = texto ? p.nombre.toLowerCase().includes(texto) : true;
        const catP              = String(p.categoria || "General").trim();
        const coincideCategoria = categoriaActiva ? catP === categoriaActiva : true;
        return coincideTexto && coincideCategoria;
    });

    if (productos.length === 0) {
        grilla.innerHTML = `<p style="color:var(--text-muted);font-size:0.88rem;grid-column:1/-1">No hay productos registrados. Agrega uno en Inventario.</p>`;
        return;
    }

    if (filtrados.length === 0) {
        grilla.innerHTML = `<p style="color:var(--text-muted);font-size:0.88rem;grid-column:1/-1">Sin productos en esta categoría</p>`;
        return;
    }

    grilla.innerHTML = "";
    filtrados.forEach(p => {
        const enCarrito = carrito.find(item => item.id === p.id);
        const card = document.createElement("button");
        card.className = "product-card" + (enCarrito ? " added" : "");
        card.type = "button";
        card.dataset.id = p.id;
        card.innerHTML = `
            <span class="product-name">${p.nombre}</span>
            <span class="product-price">${formatCOP(p.precio)}</span>
        `;
        card.addEventListener("click", () => agregarAlCarrito(p));
        grilla.appendChild(card);
    });
}

// ── Carrito ────────────────────────────────────────────────────────────────
function agregarAlCarrito(producto) {
    document.getElementById("btn-ver-recibo")?.remove();

    const existente = carrito.find(item => item.id === producto.id);
    if (existente) {
        existente.cantidad++;
    } else {
        carrito.push({ id: producto.id, nombre: producto.nombre, precio: parseFloat(producto.precio), cantidad: 1 });
    }

    const card = document.querySelector(`.product-card[data-id="${producto.id}"]`);
    if (card) {
        card.classList.add("added");
        card.style.transform = "scale(0.93)";
        setTimeout(() => { card.style.transform = ""; }, 150);
    }

    renderCarrito();
    recalcularTotales();
}

function cambiarCantidad(productoId, delta) {
    const item = carrito.find(i => i.id === productoId);
    if (!item) return;

    item.cantidad += delta;
    if (item.cantidad <= 0) {
        carrito = carrito.filter(i => i.id !== productoId);
        const card = document.querySelector(`.product-card[data-id="${productoId}"]`);
        if (card) card.classList.remove("added");
    }

    renderCarrito();
    recalcularTotales();
}

function vaciarCarrito() {
    carrito = [];
    metodoPagoSeleccionado = "";
    document.querySelectorAll(".product-card.added").forEach(c => c.classList.remove("added"));
    renderCarrito();
    recalcularTotales();
    ocultarPagoInline();
}

function renderCarrito() {
    const container = document.getElementById("carrito-items");
    if (!container) return;

    if (carrito.length === 0) {
        container.innerHTML = `
            <div class="carrito-vacio">
                <span class="carrito-vacio-icon"><i class="ph ph-shopping-cart" style="font-size: 48px"></i></span>
                <p>Pedido vacío</p>
                <span>Selecciona productos del catálogo</span>
            </div>`;
        return;
    }

    container.innerHTML = carrito.map(item => `
        <div class="carrito-item" data-id="${item.id}">
            <div class="carrito-item-info">
                <div class="carrito-item-nombre">${item.nombre}</div>
                <div class="carrito-item-precio">${formatCOP(item.precio)} c/u</div>
            </div>
            <div class="cart-qty">
                <button type="button" class="${item.cantidad === 1 ? 'btn-remove' : ''}" data-action="minus" data-id="${item.id}">${item.cantidad === 1 ? '<i class="ph ph-trash icon-sm"></i>' : '−'}</button>
                <span class="cart-qty-val">${item.cantidad}</span>
                <button type="button" data-action="plus" data-id="${item.id}">+</button>
            </div>
            <span class="carrito-item-subtotal">${formatCOP(item.precio * item.cantidad)}</span>
        </div>
    `).join("");

    container.querySelectorAll("button[data-action]").forEach(btn => {
        btn.addEventListener("click", () => {
            cambiarCantidad(btn.dataset.id, btn.dataset.action === "plus" ? 1 : -1);
        });
    });

    actualizarBadge();
}

function recalcularTotales() {
    const totalUnidades = carrito.reduce((sum, i) => sum + i.cantidad, 0);
    const subtotal      = carrito.reduce((sum, i) => sum + (i.precio * i.cantidad), 0);
    const domicilio     = domicilioActivo ? totalUnidades * DOMICILIO_POR_UNIDAD : 0;
    const total         = subtotal + domicilio;

    const elSubtotal  = document.getElementById("carrito-subtotal");
    const elDomicilio = document.getElementById("carrito-domicilio");
    const elTotal     = document.getElementById("carrito-total");
    const filaDom     = document.getElementById("fila-domicilio");
    const btnCobrar   = document.getElementById("btn-cobrar");

    if (elSubtotal)  elSubtotal.textContent  = formatCOP(subtotal);
    if (elDomicilio) elDomicilio.textContent = formatCOP(domicilio);
    if (elTotal)     elTotal.textContent     = formatCOP(total);
    if (filaDom)     filaDom.style.display   = domicilioActivo ? "flex" : "none";
    if (btnCobrar)   btnCobrar.disabled      = carrito.length === 0;

    actualizarBadge();
}

function actualizarBadge() {
    const badge      = document.getElementById("cart-badge");
    const totalItems = carrito.reduce((sum, i) => sum + i.cantidad, 0);
    if (badge) badge.textContent = totalItems;
}

function toggleDomicilio() {
    domicilioActivo = document.getElementById("toggle-domicilio")?.checked || false;
    recalcularTotales();
    if (metodoPagoSeleccionado) calcularCambioInline();
}

function abrirCarritoMobile() {
    document.getElementById("panel-carrito")?.classList.add("visible");
    document.getElementById("panel-backdrop")?.classList.add("visible");
    document.body.style.overflow = "hidden";
}

function cerrarCarritoMobile() {
    document.getElementById("panel-carrito")?.classList.remove("visible");
    document.getElementById("panel-backdrop")?.classList.remove("visible");
    document.body.style.overflow = "";
}

// ── Pago inline ────────────────────────────────────────────────────────────
function mostrarPagoInline() {
    const pago = document.getElementById("pago-inline");
    const btnCobrar = document.getElementById("btn-cobrar");
    const btnRegistrar = document.getElementById("btn-registrar-inline");
    if (pago) pago.style.display = "block";
    if (btnCobrar) btnCobrar.style.display = "none";
    if (btnRegistrar) btnRegistrar.style.display = "flex";
    metodoPagoSeleccionado = "";
    document.querySelectorAll("#pago-pills-inline .pago-pill").forEach(p => p.classList.remove("selected"));
    document.getElementById("pago-efectivo-group-inline").style.display = "none";
    document.getElementById("pago-recibido-inline").value = "";
    document.getElementById("pago-cambio-wrap-inline").style.display = "none";
    document.getElementById("btn-registrar-inline").disabled = true;
    }

function ocultarPagoInline() {
    const pago = document.getElementById("pago-inline");
    const btnCobrar = document.getElementById("btn-cobrar");
    const btnRegistrar = document.getElementById("btn-registrar-inline");
    if (pago) pago.style.display = "none";
    if (btnCobrar) { btnCobrar.style.display = ""; btnCobrar.disabled = carrito.length === 0; }
    if (btnRegistrar) btnRegistrar.style.display = "none";
    metodoPagoSeleccionado = "";
}

function seleccionarMetodoPagoInline(pill) {
    document.querySelectorAll("#pago-pills-inline .pago-pill").forEach(p => p.classList.remove("selected"));
    pill.classList.add("selected");
    metodoPagoSeleccionado = pill.dataset.valor;

    const efectivoGroup = document.getElementById("pago-efectivo-group-inline");
    if (metodoPagoSeleccionado === "Efectivo") {
        efectivoGroup.style.display = "flex";
        document.getElementById("pago-recibido-inline").value = "";
        document.getElementById("pago-cambio-wrap-inline").style.display = "none";
        document.getElementById("btn-registrar-inline").disabled = true;
    } else {
        efectivoGroup.style.display = "none";
        document.getElementById("btn-registrar-inline").disabled = false;
    }
}

function calcularCambioInline() {
    const totalUnidades = carrito.reduce((sum, i) => sum + i.cantidad, 0);
    const subtotal      = carrito.reduce((sum, i) => sum + (i.precio * i.cantidad), 0);
    const domicilio     = domicilioActivo ? totalUnidades * DOMICILIO_POR_UNIDAD : 0;
    const total         = subtotal + domicilio;

    const recibido     = parseFloat(document.getElementById("pago-recibido-inline")?.value) || 0;
    const cambioWrap   = document.getElementById("pago-cambio-wrap-inline");
    const cambioEl     = document.getElementById("pago-cambio-inline");
    const btnRegistrar = document.getElementById("btn-registrar-inline");

    if (recibido <= 0) {
        cambioWrap.style.display = "none";
        btnRegistrar.disabled = true;
        return;
    }

    cambioWrap.style.display = "flex";
    const cambio = recibido - total;

    if (cambio >= 0) {
        cambioEl.textContent = formatCOP(cambio);
        cambioWrap.classList.remove("error");
        btnRegistrar.disabled = false;
    } else {
        cambioEl.textContent = `Faltan ${formatCOP(Math.abs(cambio))}`;
        cambioWrap.classList.add("error");
        btnRegistrar.disabled = true;
    }
}

// ── Registro de venta ──────────────────────────────────────────────────────
async function registrarVenta() {
    if (carrito.length === 0 || !metodoPagoSeleccionado) return;

    const sucursalId = getSucursalId();
    if (!sucursalId) {
        showToast("Selecciona una sucursal primero", "warning");
        return;
    }

    const btnRegistrar = document.getElementById("btn-registrar-inline");
    if (btnRegistrar) { btnRegistrar.disabled = true; btnRegistrar.textContent = "Registrando…"; }

    let exitosos = 0;
    let errores  = 0;

    const totalUnidades = carrito.reduce((sum, i) => sum + i.cantidad, 0);
    const subtotal      = carrito.reduce((sum, i) => sum + (i.precio * i.cantidad), 0);
    const domicilio     = domicilioActivo ? totalUnidades * DOMICILIO_POR_UNIDAD : 0;
    const total         = subtotal + domicilio;

    for (const item of carrito) {
        try {
            await API.ventas.registrar({
                producto_id:  item.id,
                cantidad:     item.cantidad,
                metodo_pago:  metodoPagoSeleccionado,
                sucursal_id:  sucursalId,
            });
            exitosos++;
        } catch (err) {
            errores++;
            showToast(`Error registrando ${item.nombre}: ${err.message}`, "error");
        }
    }

    // Registrar domicilio como venta separada
    if (domicilioActivo && domicilio > 0) {
        try {
            await API.ventas.registrar({
                producto_id:     "__domicilio__",
                producto_nombre: "Domicilio",
                precio_unitario: DOMICILIO_POR_UNIDAD,
                cantidad:        totalUnidades,
                metodo_pago:     metodoPagoSeleccionado,
                sucursal_id:     sucursalId,
            });
            exitosos++;
        } catch (err) {
            errores++;
        }
    }

    if (exitosos > 0) {
        const datosRecibo = {
            items:              [...carrito],
            metodoPago:         metodoPagoSeleccionado,
            subtotal,
            domicilio,
            total,
            fecha:              new Date(),
            sucursal:           getSucursal(),
            nombreRestaurante:  localStorage.getItem("tizon_tenant_nombre") || "Tizón",
        };

        showToast(`Venta registrada — ${formatCOP(total)}`, "success");
        cerrarCarritoMobile();
        vaciarCarrito();
        mostrarBotonRecibo(datosRecibo);
    }

    if (errores > 0 && exitosos === 0) {
        showToast("No se pudo registrar la venta", "error");
    }

    if (btnRegistrar) {
        btnRegistrar.disabled = false;
        btnRegistrar.innerHTML = '<i class="ph ph-check-circle icon-sm"></i> Registrar Venta';
    }
}

// ── Recibo ────────────────────────────────────────────────────────────────
function mostrarBotonRecibo(datos) {
    document.getElementById("btn-ver-recibo")?.remove();

    const btn = document.createElement("button");
    btn.id        = "btn-ver-recibo";
    btn.type      = "button";
    btn.className = "btn btn-ghost";
    btn.style.cssText = "margin-top:0.5rem;width:100%;";
    btn.textContent = "🧾 Ver recibo";
    btn.addEventListener("click", () => abrirRecibo(datos));

    document.querySelector(".carrito-actions")?.appendChild(btn);
    setTimeout(() => btn.remove(), 600_000);
}

function abrirRecibo(datos) {
    const { items, metodoPago, subtotal, domicilio, total, fecha, sucursal, nombreRestaurante } = datos;

    const fechaStr = fecha.toLocaleString("es-CO", {
        year: "numeric", month: "long", day: "numeric",
        hour: "2-digit", minute: "2-digit",
    });

    const filasProductos = items.map(item => `
        <tr>
            <td>${item.nombre}</td>
            <td class="c">${item.cantidad}</td>
            <td class="r">${formatCOP(item.precio)}</td>
            <td class="r">${formatCOP(item.precio * item.cantidad)}</td>
        </tr>`).join("");

    const filaDomicilio = domicilio > 0 ? `
        <tr>
            <td>Domicilio</td>
            <td class="c">—</td>
            <td class="r">—</td>
            <td class="r">${formatCOP(domicilio)}</td>
        </tr>` : "";

    const filaSubtotal = domicilio > 0
        ? `<tr><td colspan="3">Subtotal</td><td class="r">${formatCOP(subtotal)}</td></tr>
           <tr><td colspan="3">Domicilio</td><td class="r">${formatCOP(domicilio)}</td></tr>`
        : "";

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Recibo</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Courier New',monospace; font-size:13px; color:#000;
           padding:24px; max-width:380px; margin:0 auto; }
    h1  { font-size:18px; text-align:center; margin-bottom:4px; }
    .sub { text-align:center; font-size:12px; color:#333; margin-bottom:2px; }
    .fecha { text-align:center; font-size:11px; color:#555; margin-bottom:14px; }
    hr  { border:none; border-top:1px dashed #000; margin:10px 0; }
    table { width:100%; border-collapse:collapse; }
    th  { font-size:11px; text-align:left; border-bottom:1px solid #000; padding-bottom:4px; }
    td  { padding:3px 2px; font-size:12px; vertical-align:top; }
    .c  { text-align:center; }
    .r  { text-align:right; }
    .total-row td { font-weight:bold; font-size:14px;
                    border-top:1px solid #000; padding-top:5px; }
    .metodo { margin-top:12px; text-align:center; font-size:12px; }
    .gracias { margin-top:14px; text-align:center; font-size:12px; font-style:italic; }
    @media print { button { display:none; } }
  </style>
</head>
<body>
  <h1>${nombreRestaurante}</h1>
  ${sucursal ? `<div class="sub">${sucursal.nombre}</div>` : ""}
  <div class="fecha">${fechaStr}</div>
  <hr>
  <table>
    <thead>
      <tr>
        <th>Producto</th>
        <th class="c">Cant.</th>
        <th class="r">P.unit</th>
        <th class="r">Total</th>
      </tr>
    </thead>
    <tbody>
      ${filasProductos}
      ${filaDomicilio}
    </tbody>
  </table>
  <hr>
  <table>
    <tbody>
      ${filaSubtotal}
      <tr class="total-row">
        <td colspan="3">TOTAL</td>
        <td class="r">${formatCOP(total)}</td>
      </tr>
    </tbody>
  </table>
  <div class="metodo">Método de pago: ${metodoPago}</div>
  <div class="gracias">¡Gracias por su compra!</div>
  <script>window.onload = () => window.print();<\/script>
</body>
</html>`;

    const ventana = window.open("", "_blank", "width=420,height=620");
    if (ventana) {
        ventana.document.write(html);
        ventana.document.close();
    }
}

// ── Bindings ───────────────────────────────────────────────────────────────
function bindEventos() {
    document.getElementById("buscar-producto")?.addEventListener("input", e => {
        filtroTexto = e.target.value || "";
        renderGrilla();
    });

    document.getElementById("toggle-domicilio")?.addEventListener("change", toggleDomicilio);

    document.getElementById("btn-cobrar")?.addEventListener("click", () => {
        if (carrito.length === 0) return;
        mostrarPagoInline();
    });

    document.getElementById("btn-registrar-inline")?.addEventListener("click", registrarVenta);

    document.getElementById("btn-limpiar-carrito")?.addEventListener("click", () => {
        if (carrito.length === 0) return;
        vaciarCarrito();
        showToast("Pedido vaciado", "info");
    });

    document.getElementById("btn-cart-toggle")?.addEventListener("click", abrirCarritoMobile);
    document.getElementById("btn-cerrar-carrito")?.addEventListener("click", cerrarCarritoMobile);
    document.getElementById("panel-backdrop")?.addEventListener("click", cerrarCarritoMobile);

    // Método de pago INLINE
    document.getElementById("pago-pills-inline")?.addEventListener("click", e => {
        const pill = e.target.closest(".pago-pill");
        if (pill) seleccionarMetodoPagoInline(pill);
    });

    document.getElementById("pago-recibido-inline")?.addEventListener("input", calcularCambioInline);
}
