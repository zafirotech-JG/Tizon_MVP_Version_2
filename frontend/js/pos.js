/**
 * POS Module — Registro de ventas con carrito multi-producto
 */

import { API }                from "./api.js";
import { getSucursalId, getSucursal } from "./sucursal.js";
import { showToast, formatCOP } from "./utils.js";

// ── Estado ────────────────────────────────────────────────────────────────
let productos = [];
let carrito   = [];
let domicilioActivo        = false;
let metodoPagoSeleccionado = "";
let filtroTexto            = "";
let filtroCategoria        = "";
const DOMICILIO_POR_UNIDAD = 1000;

let _posIniciado = false;

export function resetPOS() {
    productos              = [];
    carrito                = [];
    domicilioActivo        = false;
    metodoPagoSeleccionado = "";
    filtroTexto            = "";
    filtroCategoria        = "";

    const grilla = document.getElementById("grilla-productos");
    if (grilla) grilla.innerHTML = "";

    const carritoItems = document.getElementById("carrito-items");
    if (carritoItems) carritoItems.innerHTML = `
        <div class="carrito-vacio">
            <span class="carrito-vacio-icon">🛒</span>
            <p>Tu carrito está vacío</p>
            <span>Selecciona productos del catálogo</span>
        </div>`;

    const buscar = document.getElementById("buscar-producto");
    if (buscar) buscar.value = "";

    const filtroCat = document.getElementById("filtro-categoria-pos");
    if (filtroCat) filtroCat.innerHTML = '<option value="">Todas las categorías</option>';
}

export function initPOS() {
    if (!_posIniciado) {
        bindEventos();
        _posIniciado = true;
    }
    cargarProductos();
}

// ── Carga productos del backend ────────────────────────────────────────────
async function cargarProductos() {
    const sucursalId = getSucursalId();
    const grilla = document.getElementById("grilla-productos");

    if (!sucursalId) {
        if (grilla) grilla.innerHTML = `<p style="color:var(--text-muted);font-size:0.88rem;grid-column:1/-1">Selecciona una sucursal para ver el menú.</p>`;
        return;
    }

    if (grilla) {
        grilla.innerHTML = Array(6).fill('<div class="product-card skeleton"><span class="product-name">...</span><span class="product-price">...</span></div>').join('');
    }

    try {
        productos = await API.productos.listar(sucursalId);
        await poblarFiltroCategorias();
        renderGrilla();
    } catch (err) {
        showToast(`Error cargando productos: ${err.message}`, "error");
        if (grilla) grilla.innerHTML = `<p style="color:var(--danger);font-size:0.88rem;grid-column:1/-1">No se pudo cargar el menú</p>`;
    }
}

async function poblarFiltroCategorias() {
    const select = document.getElementById("filtro-categoria-pos");
    if (!select) return;

    const sucursalId = getSucursalId();
    let categorias = [];
    try {
        if (sucursalId) categorias = await API.categorias.listar(sucursalId);
    } catch {
        const unicas = [...new Set(productos.map(p => (p.categoria || "General").trim()))];
        categorias = unicas.map((nombre, idx) => ({ id: String(idx), nombre }));
    }

    const opciones = categorias.map(c => `<option value="${c.nombre}">${c.nombre}</option>`).join("");
    select.innerHTML = `<option value="">Todas las categorías</option>${opciones}`;
}

// ── Grilla de productos ────────────────────────────────────────────────────
function renderGrilla() {
    const grilla = document.getElementById("grilla-productos");
    if (!grilla) return;

    const texto     = filtroTexto.trim().toLowerCase();
    const categoria = filtroCategoria.trim().toLowerCase();
    const filtrados = productos.filter(p => {
        const coincideTexto     = texto     ? p.nombre.toLowerCase().includes(texto) : true;
        const catProducto       = String(p.categoria || "General").toLowerCase();
        const coincideCategoria = categoria ? catProducto === categoria : true;
        return coincideTexto && coincideCategoria;
    });

    if (productos.length === 0) {
        grilla.innerHTML = `<p style="color:var(--text-muted);font-size:0.88rem;grid-column:1/-1">No hay productos registrados. Agrega uno en Inventario.</p>`;
        return;
    }

    if (filtrados.length === 0) {
        grilla.innerHTML = `<p style="color:var(--text-muted);font-size:0.88rem;grid-column:1/-1">No se encontraron productos con los filtros actuales</p>`;
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
    document.querySelectorAll(".product-card.added").forEach(c => c.classList.remove("added"));
    renderCarrito();
    recalcularTotales();
}

function renderCarrito() {
    const container = document.getElementById("carrito-items");
    if (!container) return;

    if (carrito.length === 0) {
        container.innerHTML = `
            <div class="carrito-vacio">
                <span class="carrito-vacio-icon">🛒</span>
                <p>Tu carrito está vacío</p>
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
                <button type="button" class="${item.cantidad === 1 ? 'btn-remove' : ''}" data-action="minus" data-id="${item.id}">${item.cantidad === 1 ? '🗑' : '−'}</button>
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

// ── Pasarela de pago ───────────────────────────────────────────────────────
function abrirModalPago() {
    if (carrito.length === 0) {
        showToast("Agrega productos al carrito primero", "warning");
        return;
    }

    metodoPagoSeleccionado = "";

    const totalUnidades = carrito.reduce((sum, i) => sum + i.cantidad, 0);
    const subtotal      = carrito.reduce((sum, i) => sum + (i.precio * i.cantidad), 0);
    const domicilio     = domicilioActivo ? totalUnidades * DOMICILIO_POR_UNIDAD : 0;
    const total         = subtotal + domicilio;

    const resumenEl = document.getElementById("pago-resumen-pedido");
    if (resumenEl) {
        resumenEl.innerHTML = carrito.map(item =>
            `<div class="pago-pedido-item">
                <span>${item.nombre} × ${item.cantidad}</span>
                <span>${formatCOP(item.precio * item.cantidad)}</span>
            </div>`
        ).join("");
    }

    document.getElementById("pago-subtotal").textContent = formatCOP(subtotal);
    const filaDom = document.getElementById("pago-fila-domicilio");
    if (filaDom) filaDom.style.display = domicilioActivo ? "flex" : "none";
    document.getElementById("pago-domicilio").textContent = formatCOP(domicilio);
    document.getElementById("pago-total").textContent     = formatCOP(total);

    document.querySelectorAll("#pago-pills .pago-pill").forEach(p => p.classList.remove("selected"));
    document.getElementById("pago-efectivo-group").style.display = "none";
    document.getElementById("pago-recibido").value = "";
    document.getElementById("pago-cambio-wrap").style.display = "none";
    document.getElementById("btn-registrar-venta").disabled = true;

    document.getElementById("modal-pago")?.classList.add("open");
}

function cerrarModalPago() {
    document.getElementById("modal-pago")?.classList.remove("open");
    metodoPagoSeleccionado = "";
}

function seleccionarMetodoPago(pill) {
    document.querySelectorAll("#pago-pills .pago-pill").forEach(p => p.classList.remove("selected"));
    pill.classList.add("selected");
    metodoPagoSeleccionado = pill.dataset.valor;

    const efectivoGroup = document.getElementById("pago-efectivo-group");
    if (metodoPagoSeleccionado === "Efectivo") {
        efectivoGroup.style.display = "flex";
        document.getElementById("pago-recibido").value = "";
        document.getElementById("pago-cambio-wrap").style.display = "none";
        document.getElementById("btn-registrar-venta").disabled = true;
    } else {
        efectivoGroup.style.display = "none";
        document.getElementById("btn-registrar-venta").disabled = false;
    }
}

function calcularCambio() {
    const totalUnidades = carrito.reduce((sum, i) => sum + i.cantidad, 0);
    const subtotal      = carrito.reduce((sum, i) => sum + (i.precio * i.cantidad), 0);
    const domicilio     = domicilioActivo ? totalUnidades * DOMICILIO_POR_UNIDAD : 0;
    const total         = subtotal + domicilio;

    const recibido    = parseFloat(document.getElementById("pago-recibido")?.value) || 0;
    const cambioWrap  = document.getElementById("pago-cambio-wrap");
    const cambioEl    = document.getElementById("pago-cambio");
    const btnRegistrar = document.getElementById("btn-registrar-venta");

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

async function registrarVenta() {
    if (carrito.length === 0 || !metodoPagoSeleccionado) return;

    const sucursalId = getSucursalId();
    if (!sucursalId) {
        showToast("Selecciona una sucursal primero", "warning");
        return;
    }

    const btnRegistrar = document.getElementById("btn-registrar-venta");
    btnRegistrar.disabled = true;
    btnRegistrar.textContent = "Registrando…";

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

    // Registrar domicilio como venta separada para que quede en el cierre de caja
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
            showToast(`Error registrando domicilio: ${err.message}`, "error");
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

        showToast(`✅ Venta registrada — ${formatCOP(total)}`, "success");
        cerrarModalPago();
        cerrarCarritoMobile();
        vaciarCarrito();
        mostrarBotonRecibo(datosRecibo);

        domicilioActivo = false;
        const toggle = document.getElementById("toggle-domicilio");
        if (toggle) toggle.checked = false;
        recalcularTotales();
    }

    if (errores > 0 && exitosos === 0) {
        showToast("No se pudo registrar la venta", "error");
    }

    btnRegistrar.disabled = false;
    btnRegistrar.textContent = "✅ Registrar Venta";
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

    // Se elimina automáticamente al agregar el próximo producto al carrito
    // o después de 10 minutos
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

    document.getElementById("filtro-categoria-pos")?.addEventListener("change", e => {
        filtroCategoria = e.target.value || "";
        renderGrilla();
    });

    document.getElementById("toggle-domicilio")?.addEventListener("change", toggleDomicilio);
    document.getElementById("btn-cobrar")?.addEventListener("click", abrirModalPago);
    document.getElementById("btn-limpiar-carrito")?.addEventListener("click", () => {
        if (carrito.length === 0) return;
        vaciarCarrito();
        showToast("Carrito vaciado", "info");
    });

    document.getElementById("btn-cart-toggle")?.addEventListener("click", abrirCarritoMobile);
    document.getElementById("btn-cerrar-carrito")?.addEventListener("click", cerrarCarritoMobile);
    document.getElementById("panel-backdrop")?.addEventListener("click", cerrarCarritoMobile);

    document.querySelectorAll("#pago-pills .pago-pill").forEach(pill => {
        pill.addEventListener("click", () => seleccionarMetodoPago(pill));
    });

    document.getElementById("pago-recibido")?.addEventListener("input", calcularCambio);
    document.getElementById("btn-registrar-venta")?.addEventListener("click", registrarVenta);
    document.getElementById("btn-cancelar-pago")?.addEventListener("click", cerrarModalPago);

    document.getElementById("modal-pago")?.addEventListener("click", e => {
        if (e.target.id === "modal-pago") cerrarModalPago();
    });
}
