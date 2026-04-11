"""
Modelos SQLAlchemy — tablas de la base de datos.

Tablas:
  tenants     → un registro por cliente (negocio)
  sucursales  → locales/puntos de venta de cada tenant
  productos   → catálogo de productos por sucursal
  categorias  → categorías de productos por sucursal
  ventas      → transacciones individuales del POS (legacy)
  ordenes     → órdenes atómicas (transacciones completas)
  orden_items → líneas de cada orden
"""
import uuid
from datetime import datetime, timezone

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


def _utcnow():
    return datetime.now(timezone.utc)


class Tenant(Base):
    __tablename__ = "tenants"

    id                 = Column(Integer, primary_key=True, autoincrement=True)
    email              = Column(String,  unique=True, nullable=False, index=True)
    password_hash      = Column(String,  nullable=False)
    nombre             = Column(String,  nullable=False)
    propietario        = Column(String,  nullable=True)
    telefono           = Column(String,  nullable=True)
    plan               = Column(String,  default="starter")
    activo             = Column(Boolean, default=True)
    es_admin           = Column(Boolean, default=False)
    plan_activo        = Column(Boolean, default=True)
    fecha_vencimiento  = Column(DateTime(timezone=True), nullable=True)
    creado_en          = Column(DateTime(timezone=True), default=_utcnow)

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

    id           = Column(String,  primary_key=True, default=_uuid)
    tenant_id    = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"),   nullable=False, index=True)
    sucursal_id  = Column(String,  ForeignKey("sucursales.id", ondelete="CASCADE"), nullable=True,  index=True)
    nombre       = Column(String,  nullable=False)
    precio       = Column(Float,   nullable=False)
    insumos      = Column(Text,    default="")
    categoria    = Column(String,  default="General")
    categoria_id = Column(String,  ForeignKey("categorias.id"), nullable=True, index=True)
    activo       = Column(Boolean, default=True)

    tenant       = relationship("Tenant",    back_populates="productos")
    sucursal     = relationship("Sucursal",  back_populates="productos")
    categoria_rel = relationship("Categoria", foreign_keys=[categoria_id])


class Venta(Base):
    """Legacy: ventas individuales. Nuevas ventas se crean vía Orden."""
    __tablename__ = "ventas"

    id               = Column(String,   primary_key=True, default=_uuid)
    tenant_id        = Column(Integer,  ForeignKey("tenants.id", ondelete="CASCADE"),   nullable=False, index=True)
    sucursal_id      = Column(String,   ForeignKey("sucursales.id", ondelete="CASCADE"), nullable=True,  index=True)
    fecha            = Column(DateTime(timezone=True), default=_utcnow, index=True)
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


class Orden(Base):
    """Orden atómica — una transacción completa del POS."""
    __tablename__ = "ordenes"

    id          = Column(String,  primary_key=True, default=_uuid)
    tenant_id   = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"),   nullable=False, index=True)
    sucursal_id = Column(String,  ForeignKey("sucursales.id", ondelete="CASCADE"), nullable=False, index=True)
    fecha       = Column(DateTime(timezone=True), default=_utcnow, index=True)
    metodo_pago = Column(String,  nullable=False)
    subtotal    = Column(Float,   nullable=False)
    domicilio   = Column(Float,   default=0)
    total       = Column(Float,   nullable=False)
    anulada     = Column(Boolean,  default=False)

    tenant   = relationship("Tenant")
    sucursal = relationship("Sucursal")
    items    = relationship("OrdenItem", back_populates="orden", cascade="all, delete-orphan")


class OrdenItem(Base):
    """Línea individual dentro de una orden."""
    __tablename__ = "orden_items"

    id              = Column(String, primary_key=True, default=_uuid)
    orden_id        = Column(String, ForeignKey("ordenes.id", ondelete="CASCADE"), nullable=False, index=True)
    producto_id     = Column(String, nullable=False)
    producto_nombre = Column(String, nullable=False)
    cantidad        = Column(Integer, nullable=False)
    precio_unitario = Column(Float,  nullable=False)
    total           = Column(Float,  nullable=False)

    orden = relationship("Orden", back_populates="items")
