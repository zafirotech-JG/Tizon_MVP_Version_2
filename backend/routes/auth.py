"""
routes/auth.py — Login y registro de te/nants (JWT)
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import LoginRequest, RegisterRequest, TokenResponse, RegisterResponse
from backend.models_db import Tenant
from backend.auth import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    email = data.username.strip()
    tenant = db.query(Tenant).filter(Tenant.email == email).first()
    if not tenant or not tenant.activo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
        )
    if not verify_password(data.password, tenant.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
        )
    if not tenant.plan_activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuenta suspendida. Contacta soporte.",
        )
    if tenant.fecha_vencimiento and tenant.fecha_vencimiento < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Suscripción vencida. Contacta soporte.",
        )
    token = create_access_token(email=tenant.email, tenant_id=tenant.id)
    return TokenResponse(access_token=token, nombre=tenant.nombre)


@router.post("/register", response_model=RegisterResponse, status_code=201)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    email = data.email.strip()
    nombre = data.nombre.strip()
    if not email or not nombre or len(data.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Datos inválidos",
        )
    if db.query(Tenant).filter(Tenant.email == email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una cuenta con ese correo",
        )
    tenant = Tenant(
        email=email,
        password_hash=hash_password(data.password),
        nombre=nombre,
    )
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    token = create_access_token(email=tenant.email, tenant_id=tenant.id)
    return RegisterResponse(access_token=token, nombre=tenant.nombre)
