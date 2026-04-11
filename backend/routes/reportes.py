"""
routes/reportes.py — Reporte diario y cierre de caja
Agrega datos de ventas legacy Y órdenes nuevas en un solo reporte unificado.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.auth import get_current_user
from backend.db.session import get_db
from backend.models.orm import Orden, OrdenItem, Sucursal, Venta
from backend.schemas import ReporteDia, ReporteProducto, ResumenCaja

router = APIRouter(prefix="/api/reportes", tags=["Reportes"])


@router.get("/dia", response_model=ReporteDia)
def reporte_dia(
    sucursal_id: str = Query(..., description="ID de la sucursal"),
    fecha: Optional[str] = Query(None, description="Fecha YYYY-MM-DD. Default: hoy"),
    tz_offset: int = Query(-5, description="UTC offset en horas (ej: -5 para Colombia)"),
    user: dict    = Depends(get_current_user),
    db:   Session = Depends(get_db),
):
    """Retorna resumen de caja + detalle por producto del día (ventas + órdenes)."""

    sucursal = db.query(Sucursal).filter(
        Sucursal.id        == sucursal_id,
        Sucursal.tenant_id == user["tenant_id"],
        Sucursal.activo    == True,
    ).first()
    if not sucursal:
        raise HTTPException(status_code=404, detail="Sucursal no encontrada")

    if fecha is None:
        now_local = datetime.now(timezone.utc) + timedelta(hours=tz_offset)
        fecha = now_local.date().isoformat()

    # ── Ventas legacy (activas, no anuladas) ─────────────────────────
    ventas = (
        db.query(Venta)
        .filter(
            Venta.tenant_id   == user["tenant_id"],
            Venta.sucursal_id == sucursal_id,
            Venta.anulada     == False,
            func.date(Venta.fecha) == fecha,
        )
        .all()
    )

    # ── Órdenes atómicas (activas, no anuladas) ─────────────────────
    ordenes = (
        db.query(Orden)
        .filter(
            Orden.tenant_id   == user["tenant_id"],
            Orden.sucursal_id == sucursal_id,
            Orden.anulada     == False,
            func.date(Orden.fecha) == fecha,
        )
        .all()
    )

    # ── Agregar productos vendidos ───────────────────────────────────
    producto_map = {}  # {nombre: {cantidad, total}}

    # Legacy ventas
    for v in ventas:
        key = v.producto_nombre
        if key not in producto_map:
            producto_map[key] = {"cantidad": 0, "total": 0.0}
        producto_map[key]["cantidad"] += v.cantidad
        producto_map[key]["total"]    += v.total

    # Orden items
    for orden in ordenes:
        for item in orden.items:
            key = item.producto_nombre
            if key not in producto_map:
                producto_map[key] = {"cantidad": 0, "total": 0.0}
            producto_map[key]["cantidad"] += item.cantidad
            producto_map[key]["total"]    += item.total

    productos = [
        ReporteProducto(
            producto_nombre = nombre,
            cantidad_total  = data["cantidad"],
            total_ingresos  = round(data["total"], 2),
        )
        for nombre, data in sorted(producto_map.items(), key=lambda x: x[1]["total"], reverse=True)
    ]

    # ── Resumen de caja por método de pago ────────────────────────────
    metodo_map = {"Efectivo": 0.0, "Nequi": 0.0, "Daviplata": 0.0, "Tarjeta": 0.0}

    for v in ventas:
        if v.metodo_pago in metodo_map:
            metodo_map[v.metodo_pago] += v.total

    for orden in ordenes:
        if orden.metodo_pago in metodo_map:
            metodo_map[orden.metodo_pago] += orden.total

    total_dia = sum(metodo_map.values())

    resumen_caja = ResumenCaja(
        total_dia = round(total_dia, 2),
        efectivo  = round(metodo_map["Efectivo"], 2),
        nequi     = round(metodo_map["Nequi"], 2),
        daviplata = round(metodo_map["Daviplata"], 2),
        tarjeta   = round(metodo_map["Tarjeta"], 2),
    )

    return ReporteDia(
        fecha        = fecha,
        sucursal_id  = sucursal_id,
        productos    = productos,
        resumen_caja = resumen_caja,
    )
