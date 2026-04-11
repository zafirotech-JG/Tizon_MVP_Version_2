"""
routes/productos.py — CRUD de productos por sucursal
Todos los queries filtran por tenant_id + sucursal_id.
"""
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session

from backend.db.session import get_db
from backend.models.orm import Categoria, Producto, Sucursal
from backend.schemas import ProductoCreate, ProductoOut, ProductoUpdate
from backend.auth import get_current_user

router = APIRouter(prefix="/api/productos", tags=["Productos"])


def _verificar_sucursal(sucursal_id: str, tenant_id: int, db: Session) -> Sucursal:
    """Valida que la sucursal exista y pertenezca al tenant."""
    s = db.query(Sucursal).filter(
        Sucursal.id        == sucursal_id,
        Sucursal.tenant_id == tenant_id,
        Sucursal.activo    == True,
    ).first()
    if not s:
        raise HTTPException(status_code=404, detail="Sucursal no encontrada")
    return s


def _resolver_categoria_id(tenant_id: int, sucursal_id: str, categoria_nombre: str, db: Session) -> Optional[str]:
    """Resuelve el ID de una categoría a partir del nombre."""
    if not categoria_nombre:
        return None
    cat = db.query(Categoria).filter(
        Categoria.tenant_id   == tenant_id,
        Categoria.sucursal_id == sucursal_id,
        Categoria.nombre      == categoria_nombre,
        Categoria.activo      == True,
    ).first()
    return cat.id if cat else None


@router.get("", response_model=list[ProductoOut])
def listar_productos(
    sucursal_id: Optional[str] = Query(None, description="ID de la sucursal"),
    user: dict    = Depends(get_current_user),
    db:   Session = Depends(get_db),
):
    """Retorna todos los productos activos de la sucursal indicada."""
    if not sucursal_id:
        return []

    _verificar_sucursal(sucursal_id, user["tenant_id"], db)

    return (
        db.query(Producto)
        .filter(
            Producto.tenant_id   == user["tenant_id"],
            Producto.sucursal_id == sucursal_id,
            Producto.activo      == True,
        )
        .all()
    )


@router.post("", response_model=ProductoOut, status_code=201)
def crear_producto(
    data: ProductoCreate,
    user: dict    = Depends(get_current_user),
    db:   Session = Depends(get_db),
):
    """Crea un nuevo producto en la sucursal indicada."""
    _verificar_sucursal(data.sucursal_id, user["tenant_id"], db)

    producto = Producto(
        tenant_id    = user["tenant_id"],
        sucursal_id  = data.sucursal_id,
        nombre       = data.nombre,
        precio       = data.precio,
        insumos      = data.insumos or "",
        categoria    = data.categoria,
        categoria_id = _resolver_categoria_id(user["tenant_id"], data.sucursal_id, data.categoria, db),
    )
    db.add(producto)
    db.commit()
    db.refresh(producto)
    return producto


@router.put("/{producto_id}", response_model=ProductoOut)
def editar_producto(
    producto_id: str,
    data: ProductoUpdate,
    user: dict    = Depends(get_current_user),
    db:   Session = Depends(get_db),
):
    """Edita campos del producto. Acepta cambios parciales."""
    producto = db.query(Producto).filter(
        Producto.id        == producto_id,
        Producto.tenant_id == user["tenant_id"],
    ).first()

    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    if data.nombre is not None:
        producto.nombre = data.nombre
    if data.precio is not None:
        producto.precio = data.precio
    if data.insumos is not None:
        producto.insumos = data.insumos
    if data.categoria is not None:
        producto.categoria = data.categoria
        producto.categoria_id = _resolver_categoria_id(
            user["tenant_id"], producto.sucursal_id, data.categoria, db
        )

    db.commit()
    db.refresh(producto)
    return producto


@router.delete("/{producto_id}", status_code=204)
def eliminar_producto(
    producto_id: str,
    user: dict    = Depends(get_current_user),
    db:   Session = Depends(get_db),
):
    """Soft-delete: marca activo=False."""
    producto = db.query(Producto).filter(
        Producto.id        == producto_id,
        Producto.tenant_id == user["tenant_id"],
    ).first()

    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    producto.activo = False
    db.commit()
