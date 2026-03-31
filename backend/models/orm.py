"""
Modelos SQLAlchemy — tablas de la base de datos.

Tablas:
  tenants    → un registro por cliente (negocio)
  sucursales → locales/puntos de venta de cada tenant
  productos  → catálogo de productos por sucursal
  ventas     → transacciones del POS por sucursal
  categorias → categorías de productos por sucursal

MIGRACIÓN REQUERIDA (base de datos existente):
  SQLite (dev): elimina tizon.db y reinicia el servidor — se recreará automáticamente.
  PostgreSQL (Supabase): ejecuta en el SQL Editor:

    CREATE TABLE sucursales (
        id        TEXT PRIMARY KEY,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id),
        nombre    TEXT NOT NULL,
        activo    BOOLEAN DEFAULT TRUE
    );
    ALTER TABLE productos  ADD COLUMN sucursal_id TEXT REFERENCES sucursales(id);
    ALTER TABLE categorias ADD COLUMN sucursal_id TEXT REFERENCES sucursales(id);
    ALTER TABLE ventas      ADD COLUMN sucursal_id TEXT REFERENCES sucursales(id);
    ALTER TABLE tenants ADD COLUMN plan_activo       BOOLEAN DEFAULT TRUE;
    ALTER TABLE tenants ADD COLUMN fecha_vencimiento TIMESTAMP;
"""
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from backend.db.session import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class Tenant(Base):
    __tablename__ = "tenants"

    id                 = Column(Integer, primary_key=True, autoincrement=True)
    email              = Column(String,  unique=True, nullable=False, index=True)
    password_hash      = Column(String,  nullable=False)
    nombre             = Column(String,  nullable=False)
    plan               = Column(String,  default="starter")
    activo             = Column(Boolean, default=True)
    es_admin           = Column(Boolean, default=False)
    plan_activo        = Column(Boolean, default=True)
    fecha_vencimiento  = Column(DateTime, nullable=True)
    creado_en          = Column(DateTime, default=datetime.utcnow)

    sucursales = relationship("Sucursal",  back_populates="tenant", cascade="all, delete-orphan")
    productos  = relationship("Producto",  back_populates="tenant", cascade="all, delete-orphan")
    ventas     = relationship("Venta",     back_populates="tenant", cascade="all, delete-orphan")
    categorias = relationship("Categoria", back_populates="tenant", cascade="all, delete-orphan")


class Sucursal(Base):
    __tablename__ = "sucursales"

    id        = Column(String,  primary_key=True, default=_uuid)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    nombre    = Column(String,  nullable=False)
    activo    = Column(Boolean, default=True)

    tenant     = relationship("Tenant",    back_populates="sucursales")
    productos  = relationship("Producto",  back_populates="sucursal", cascade="all, delete-orphan")
    ventas     = relationship("Venta",     back_populates="sucursal", cascade="all, delete-orphan")
    categorias = relationship("Categoria", back_populates="sucursal", cascade="all, delete-orphan")


class Producto(Base):
    __tablename__ = "productos"

    id          = Column(String,  primary_key=True, default=_uuid)
    tenant_id   = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"),   nullable=False, index=True)
    sucursal_id = Column(String,  ForeignKey("sucursales.id", ondelete="CASCADE"), nullable=True,  index=True)
    nombre      = Column(String,  nullable=False)
    precio      = Column(Float,   nullable=False)
    insumos     = Column(Text,    default="")
    categoria   = Column(String,  default="General")
    activo      = Column(Boolean, default=True)

    tenant   = relationship("Tenant",   back_populates="productos")
    sucursal = relationship("Sucursal", back_populates="productos")


class Venta(Base):
    __tablename__ = "ventas"

    id               = Column(String,   primary_key=True, default=_uuid)
    tenant_id        = Column(Integer,  ForeignKey("tenants.id", ondelete="CASCADE"),   nullable=False, index=True)
    sucursal_id      = Column(String,   ForeignKey("sucursales.id", ondelete="CASCADE"), nullable=True,  index=True)
    fecha            = Column(DateTime, default=datetime.utcnow, index=True)
    producto_id      = Column(String,   nullable=False)
    producto_nombre  = Column(String,   nullable=False)
    cantidad         = Column(Integer,  nullable=False)
    precio_unitario  = Column(Float,    nullable=False)
    total            = Column(Float,    nullable=False)
    metodo_pago      = Column(String,   nullable=False)
    anulada          = Column(Boolean,  default=False)

    tenant   = relationship("Tenant",   back_populates="ventas")
    sucursal = relationship("Sucursal", back_populates="ventas")


class Categoria(Base):
    __tablename__ = "categorias"

    id          = Column(String,  primary_key=True, default=_uuid)
    tenant_id   = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"),   nullable=False, index=True)
    sucursal_id = Column(String,  ForeignKey("sucursales.id", ondelete="CASCADE"), nullable=True,  index=True)
    nombre      = Column(String,  nullable=False)
    activo      = Column(Boolean, default=True)

    tenant   = relationship("Tenant",   back_populates="categorias")
    sucursal = relationship("Sucursal", back_populates="categorias")
