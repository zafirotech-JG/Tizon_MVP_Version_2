"""
routes/ordenes.py — Registro atómico de órdenes completas
Una orden = una transacción POS completa con todos sus items.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.db.session import get_db
from backend.models.orm import Orden, OrdenItem, Producto, Sucursal
from backend.schemas import OrdenCreate, OrdenOut, OrdenItemOut, OrdenListOut
from backend.auth import get_current_user
from backend.core.config import ADMIN_PIN

router = APIRouter(prefix="/api/ordenes", tags=["Órdenes"])


def _verificar_sucursal(sucursal_id: str, tenant_id: int, db: Session) -> Sucursal:
    s = db.query(Sucursal).filter(
        Sucursal.id        == sucursal_id,
        Sucursal.tenant_id == tenant_id,
        Sucursal.activo    == True,
    ).first()
    if not s:
        raise HTTPException(status_code=404, detail="Sucursal no encontrada")
    return s


def _serialize_orden(orden: Orden) -> OrdenOut:
    return OrdenOut(
        id          = orden.id,
        fecha       = orden.fecha.strftime("%Y-%m-%d %H:%M:%S"),
        metodo_pago = orden.metodo_pago,
        subtotal    = orden.subtotal,
        domicilio   = orden.domicilio,
        total       = orden.total,
        anulada     = orden.anulada,
        items       = [
            OrdenItemOut(
                id              = item.id,
                producto_id     = item.producto_id,
                producto_nombre = item.producto_nombre,
                cantidad        = item.cantidad,
                precio_unitario = item.precio_unitario,
                total           = item.total,
            )
            for item in orden.items
        ],
    )


@router.post("", response_model=OrdenOut, status_code=201)
def crear_orden(
    data: OrdenCreate,
    user: dict    = Depends(get_current_user),
    db:   Session = Depends(get_db),
):
    """
    Registra una orden completa atomicamente.
    Todos los items se validan y persisten en una sola transacción DB.
    """
    _verificar_sucursal(data.sucursal_id, user["tenant_id"], db)

    subtotal = 0.0
    items_db = []

    MANUAL_PREFIX = "__"

    for item in data.items:
        if item.producto_id.startswith(MANUAL_PREFIX):
            # Entrada manual (domicilio, custom, etc.)
            if not item.producto_nombre or not item.precio_unitario:
                raise HTTPException(
                    status_code=422,
                    detail="producto_nombre y precio_unitario son obligatorios para entradas manuales",
                )
            nombre = item.producto_nombre
            precio = item.precio_unitario
        else:
            producto = db.query(Producto).filter(
                Producto.id          == item.producto_id,
                Producto.tenant_id   == user["tenant_id"],
                Producto.sucursal_id == data.sucursal_id,
                Producto.activo      == True,
            ).first()
            if not producto:
                raise HTTPException(
                    status_code=404,
                    detail=f"Producto '{item.producto_id}' no encontrado en esta sucursal",
                )
            nombre = producto.nombre
            precio = producto.precio

        item_total = round(precio * item.cantidad, 2)
        subtotal += item_total
        items_db.append(OrdenItem(
            producto_id     = item.producto_id,
            producto_nombre = nombre,
            cantidad        = item.cantidad,
            precio_unitario = precio,
            total           = item_total,
        ))

    subtotal = round(subtotal, 2)
    domicilio = round(data.domicilio, 2)
    total = round(subtotal + domicilio, 2)

    orden = Orden(
        tenant_id   = user["tenant_id"],
        sucursal_id = data.sucursal_id,
        metodo_pago = data.metodo_pago.value,
        subtotal    = subtotal,
        domicilio   = domicilio,
        total       = total,
        items       = items_db,
    )
    db.add(orden)
    db.commit()
    db.refresh(orden)

    return _serialize_orden(orden)


@router.get("", response_model=list[OrdenOut])
def listar_ordenes(
    sucursal_id: str = Query(..., description="ID de la sucursal"),
    fecha: Optional[str] = Query(None, description="Fecha YYYY-MM-DD. Default: hoy"),
    tz_offset: int = Query(-5, description="UTC offset en horas (ej: -5 para Colombia)"),
    user: dict    = Depends(get_current_user),
    db:   Session = Depends(get_db),
):
    """Lista órdenes del día para una sucursal."""
    _verificar_sucursal(sucursal_id, user["tenant_id"], db)

    if fecha is None:
        now_local = datetime.now(timezone.utc) + timedelta(hours=tz_offset)
        fecha = now_local.date().isoformat()

    ordenes = (
        db.query(Orden)
        .filter(
            Orden.tenant_id   == user["tenant_id"],
            Orden.sucursal_id == sucursal_id,
            func.date(Orden.fecha) == fecha,
        )
        .order_by(Orden.fecha.desc())
        .all()
    )

    return [_serialize_orden(o) for o in ordenes]


@router.delete("/{orden_id}", status_code=204)
def anular_orden(
    orden_id: str,
    pin: str      = Query(..., description="PIN de administrador"),
    user: dict    = Depends(get_current_user),
    db:   Session = Depends(get_db),
):
    """Anula (soft delete) una orden completa. Requiere PIN de administrador."""
    if pin != ADMIN_PIN:
        raise HTTPException(status_code=403, detail="PIN incorrecto")

    orden = db.query(Orden).filter(
        Orden.id        == orden_id,
        Orden.tenant_id == user["tenant_id"],
    ).first()
    if not orden:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    orden.anulada = True
    db.commit()
