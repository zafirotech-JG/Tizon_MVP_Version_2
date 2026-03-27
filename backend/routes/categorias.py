"""
routes/categorias.py — CRUD de categorías por sucursal
"""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import CategoriaCreate, CategoriaOut
from backend.models_db import Categoria
from backend.auth import get_current_user

router = APIRouter(prefix="/api/categorias", tags=["Categorías"])


@router.get("", response_model=list[CategoriaOut])
def listar_categorias(
    sucursal_id: Optional[str] = Query(None, description="ID de la sucursal"),
    user: dict    = Depends(get_current_user),
    db:   Session = Depends(get_db),
):
    """Retorna categorías activas de la sucursal indicada."""
    if not sucursal_id:
        return []

    return (
        db.query(Categoria)
        .filter(
            Categoria.tenant_id   == user["tenant_id"],
            Categoria.sucursal_id == sucursal_id,
            Categoria.activo      == True,
        )
        .all()
    )


@router.post("", response_model=CategoriaOut, status_code=201)
def crear_categoria(
    data: CategoriaCreate,
    user: dict    = Depends(get_current_user),
    db:   Session = Depends(get_db),
):
    """
    Crea una categoría nueva en la sucursal o reactiva una inactiva con el mismo nombre.
    Las categorías son independientes por sucursal.
    """
    nombre_norm = data.nombre.strip().lower()

    existente = db.query(Categoria).filter(
        Categoria.tenant_id   == user["tenant_id"],
        Categoria.sucursal_id == data.sucursal_id,
        Categoria.nombre.ilike(nombre_norm),
    ).first()

    if existente:
        if not existente.activo:
            existente.activo = True
            db.commit()
            db.refresh(existente)
        return existente

    categoria = Categoria(
        tenant_id   = user["tenant_id"],
        sucursal_id = data.sucursal_id,
        nombre      = data.nombre.strip(),
    )
    db.add(categoria)
    db.commit()
    db.refresh(categoria)
    return categoria
