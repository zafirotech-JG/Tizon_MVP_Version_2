"""
routes/ventas.py — Registro de transacciones POS por sucursal
"""
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import VentaCreate, VentaOut
from backend.models_db import Producto, Sucursal, Venta
from backend.auth import get_current_user

router = APIRouter(prefix="/api/ventas", tags=["Ventas"])


@router.post("", response_model=VentaOut, status_code=201)
def registrar_venta(
    data: VentaCreate,
    user: dict    = Depends(get_current_user),
    db:   Session = Depends(get_db),
):
    """
    Registra una venta en la sucursal indicada.
    Valida que el producto pertenezca a la misma sucursal.
    El precio se lee del producto en la BD (no del cliente).
    """
    # 1. Verificar sucursal
    sucursal = db.query(Sucursal).filter(
        Sucursal.id        == data.sucursal_id,
        Sucursal.tenant_id == user["tenant_id"],
        Sucursal.activo    == True,
    ).first()
    if not sucursal:
        raise HTTPException(status_code=404, detail="Sucursal no encontrada")

    # 2. Resolver producto: lookup en BD o entrada manual (domicilio, etc.)
    MANUAL_PREFIX = "__"
    if data.producto_id.startswith(MANUAL_PREFIX):
        # Entrada manual — no requiere producto en BD
        if not data.producto_nombre or not data.precio_unitario:
            raise HTTPException(
                status_code=422,
                detail="producto_nombre y precio_unitario son obligatorios para entradas manuales",
            )
        nombre_producto = data.producto_nombre
        precio_producto = data.precio_unitario
    else:
        producto = db.query(Producto).filter(
            Producto.id          == data.producto_id,
            Producto.tenant_id   == user["tenant_id"],
            Producto.sucursal_id == data.sucursal_id,
            Producto.activo      == True,
        ).first()

        if not producto:
            raise HTTPException(
                status_code=404,
                detail=f"Producto '{data.producto_id}' no encontrado en esta sucursal",
            )
        nombre_producto = producto.nombre
        precio_producto = producto.precio

    # 3. Calcular total server-side
    total = round(precio_producto * data.cantidad, 2)

    # 4. Persistir venta con snapshot
    venta = Venta(
        tenant_id       = user["tenant_id"],
        sucursal_id     = data.sucursal_id,
        fecha           = datetime.utcnow(),
        producto_id     = data.producto_id,
        producto_nombre = nombre_producto,
        cantidad        = data.cantidad,
        precio_unitario = precio_producto,
        total           = total,
        metodo_pago     = data.metodo_pago.value,
    )
    db.add(venta)
    db.commit()
    db.refresh(venta)

    return VentaOut(
        id              = venta.id,
        fecha           = venta.fecha.strftime("%Y-%m-%d %H:%M:%S"),
        producto_id     = venta.producto_id,
        producto_nombre = venta.producto_nombre,
        cantidad        = venta.cantidad,
        precio_unitario = venta.precio_unitario,
        total           = venta.total,
        metodo_pago     = venta.metodo_pago,
    )
