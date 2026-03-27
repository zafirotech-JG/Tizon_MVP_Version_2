"""
routes/admin.py — Panel de super-administrador

Endpoints protegidos por es_admin=True en el JWT.
Solo accesibles con el token emitido por POST /api/admin/login.
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.auth import create_access_token, get_current_user, verify_password
from backend.database import get_db
from backend.models import LoginRequest, TokenResponse
from backend.models_db import Tenant

router = APIRouter(prefix="/api/admin", tags=["Admin"])


# ── Dependency: solo admins ────────────────────────────────────────────────
def get_admin_user(user: dict = Depends(get_current_user)) -> dict:
    if not user.get("es_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso restringido a administradores",
        )
    return user


# ── Schema PATCH ──────────────────────────────────────────────────────────
class PatchTenantBody(BaseModel):
    plan_activo:       Optional[bool]     = None
    fecha_vencimiento: Optional[datetime] = None


# ── Login exclusivo para admins ───────────────────────────────────────────
@router.post("/login", response_model=TokenResponse)
def admin_login(data: LoginRequest, db: Session = Depends(get_db)):
    tenant = db.query(Tenant).filter(Tenant.email == data.username.strip()).first()
    if not tenant or not verify_password(data.password, tenant.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )
    if not tenant.es_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso restringido a administradores",
        )
    token = create_access_token(
        email=tenant.email, tenant_id=tenant.id, es_admin=True
    )
    return TokenResponse(access_token=token, nombre=tenant.nombre)


# ── GET /tenants ──────────────────────────────────────────────────────────
@router.get("/tenants")
def listar_tenants(
    db: Session = Depends(get_db),
    _: dict = Depends(get_admin_user),
):
    tenants = db.query(Tenant).order_by(Tenant.creado_en.desc()).all()
    return [
        {
            "id":                t.id,
            "email":             t.email,
            "nombre":            t.nombre,
            "plan":              t.plan,
            "plan_activo":       t.plan_activo,
            "fecha_vencimiento": t.fecha_vencimiento.isoformat() if t.fecha_vencimiento else None,
            "creado_en":         t.creado_en.isoformat() if t.creado_en else None,
        }
        for t in tenants
    ]


# ── PATCH /tenants/{id} ───────────────────────────────────────────────────
@router.patch("/tenants/{tenant_id}")
def actualizar_tenant(
    tenant_id: int,
    body: PatchTenantBody,
    db: Session = Depends(get_db),
    _: dict = Depends(get_admin_user),
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")

    if body.plan_activo is not None:
        tenant.plan_activo = body.plan_activo

    # model_fields_set distingue "no enviado" de "enviado como null"
    if "fecha_vencimiento" in body.model_fields_set:
        tenant.fecha_vencimiento = body.fecha_vencimiento

    db.commit()
    db.refresh(tenant)
    return {
        "id":                tenant.id,
        "plan_activo":       tenant.plan_activo,
        "fecha_vencimiento": tenant.fecha_vencimiento.isoformat() if tenant.fecha_vencimiento else None,
    }
