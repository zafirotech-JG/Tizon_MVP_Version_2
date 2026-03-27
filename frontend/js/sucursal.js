/**
 * sucursal.js — Estado compartido de la sucursal activa
 * Todos los módulos (pos, inventario, dashboard) importan getSucursalId()
 * antes de hacer llamadas a la API.
 */

let _sucursalActual = null; // { id, nombre, activo }
let _sucursales     = [];   // lista completa de sucursales del tenant

export function setSucursal(sucursal) {
    _sucursalActual = sucursal;
    if (sucursal?.id) {
        localStorage.setItem("tizon_sucursal_id", sucursal.id);
    }
}

export function getSucursalId() {
    return _sucursalActual?.id ?? null;
}

export function getSucursal() {
    return _sucursalActual;
}

export function setSucursales(lista) {
    _sucursales = lista;
}

export function getSucursales() {
    return _sucursales;
}

export function resetSucursal() {
    _sucursalActual = null;
    _sucursales     = [];
    localStorage.removeItem("tizon_sucursal_id");
}
