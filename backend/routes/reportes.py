"""
routes/reportes.py — Dashboard y cierre de caja por sucursal
"""
from collections import defaultdict
from datetime import date
from typing import Optional

from fastapi import APIRouter, Query, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.db.session import get_db
from backend.models.orm import Sucursal, Venta
from backend.schemas import ReporteDia, ReporteProducto, ResumenCaja
from backend.auth import get_current_user

router = APIRouter(prefix="/api/reportes", tags=["Reportes"])

METODOS_PAGO = ["Efectivo", "Nequi", "Daviplata", "Tarjeta"]


@router.get("/dia", response_model=ReporteDia)
def reporte_del_dia(
    sucursal_id: str = Query(..., description="ID de la sucursal"),
    fecha: Optional[str] = Query(
        default=None,
        description="Fecha en formato YYYY-MM-DD. Por defecto: hoy.",
        examples=["2026-03-04"],
    ),
    user: dict    = Depends(get_current_user),
    db:   Session = Depends(get_db),
):
    """
    Retorna ventas del día para la sucursal indicada:
      - Tabla de productos vendidos con cantidades e ingresos.
      - Resumen de caja: total + desglose por método de pago.
    """
    # Verificar que la sucursal pertenece al tenant
    sucursal = db.query(Sucursal).filter(
        Sucursal.id        == sucursal_id,
        Sucursal.tenant_id == user["tenant_id"],
        Sucursal.activo    == True,
    ).first()
    if not sucursal:
        raise HTTPException(status_code=404, detail="Sucursal no encontrada")

    if fecha is None:
        fecha = date.today().isoformat()

    ventas = (
        db.query(Venta)
        .filter(
            Venta.tenant_id   == user["tenant_id"],
            Venta.sucursal_id == sucursal_id,
            func.date(Venta.fecha) == fecha,
            Venta.anulada == False,
        )
        .all()
    )

    # ── Agregación por producto ────────────────────────────────────────
    agg: dict[str, dict] = defaultdict(
        lambda: {"cantidad_total": 0, "total_ingresos": 0.0}
    )
    for v in ventas:
        agg[v.producto_nombre]["cantidad_total"] += v.cantidad
        agg[v.producto_nombre]["total_ingresos"] += v.total

    productos_reporte = [
        ReporteProducto(
            producto_nombre = nombre,
            cantidad_total  = datos["cantidad_total"],
            total_ingresos  = round(datos["total_ingresos"], 2),
        )
        for nombre, datos in sorted(
            agg.items(),
            key=lambda x: x[1]["total_ingresos"],
            reverse=True,
        )
    ]

    # ── Resumen de caja ────────────────────────────────────────────────
    totales = {m: 0.0 for m in METODOS_PAGO}
    total_dia = 0.0

    for v in ventas:
        total_dia += v.total
        if v.metodo_pago in totales:
            totales[v.metodo_pago] += v.total

    resumen = ResumenCaja(
        total_dia = round(total_dia, 2),
        efectivo  = round(totales["Efectivo"],  2),
        nequi     = round(totales["Nequi"],     2),
        daviplata = round(totales["Daviplata"], 2),
        tarjeta   = round(totales["Tarjeta"],   2),
    )

    return ReporteDia(
        fecha        = fecha,
        sucursal_id  = sucursal_id,
        productos    = productos_reporte,
        resumen_caja = resumen,
    )
