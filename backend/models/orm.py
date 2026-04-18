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
    JSON,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
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
    # ── Nuevo en v3: branding, usuarios operativos, tutorial tracking ──
    branding   = relationship("TenantBranding",     back_populates="tenant",
                              uselist=False, cascade="all, delete-orphan")
    usuarios   = relationship("Usuario",            back_populates="tenant",
                              cascade="all, delete-orphan")
    onboarding = relationship("OnboardingProgress", back_populates="tenant",
                              uselist=False, cascade="all, delete-orphan")


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


# ════════════════════════════════════════════════════════════════════════
#  v3 — WHITE-LABEL & ROLES
# ════════════════════════════════════════════════════════════════════════

class TenantBranding(Base):
    """Personalización visual por tenant. 1:1 con Tenant.

    El LOGO ZAFIRO es inmutable (servido desde /assets/zafiro-logo.svg).
    Aquí solo se almacena lo que el cliente puede personalizar.
    """
    __tablename__ = "tenant_branding"

    tenant_id        = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"),
                               primary_key=True)
    # Colores (hex #rrggbb — validados en Pydantic)
    color_primary    = Column(String(7),  default="#e25822")   # naranja default
    color_secondary  = Column(String(7),  default="#1a1714")
    color_accent     = Column(String(7),  default="#22c55e")
    # Identidad visual del negocio
    nombre_comercial = Column(String,     nullable=False)
    logo_url         = Column(String,     nullable=True)       # URL externa (S3/Cloudinary) o /uploads/
    nicho            = Column(String,     default="restaurante")  # restaurante|retail|farmacia|servicio|otro
    # Tema y tipografía
    tema             = Column(String,     default="dark")      # dark|light|warm
    tipografia       = Column(String,     default="Inter")
    # Categorías sugeridas por nicho (seed inicial)
    categorias_default = Column(JSON,     default=list)        # ej: ["Bebidas", "Platos", "Postres"]
    # Auditoría
    actualizado_en   = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    tenant = relationship("Tenant", back_populates="branding")


class Usuario(Base):
    """Usuario operativo de un tenant (empleados: cajero, manager, inventario).

    Distinto del modelo Tenant (que representa al DUEÑO / dueño del negocio).
    El owner de cada tenant también tiene un registro aquí con rol='owner'.
    """
    __tablename__ = "usuarios"
    __table_args__ = (UniqueConstraint("tenant_id", "email", name="uq_usuario_tenant_email"),)

    id            = Column(Integer, primary_key=True, autoincrement=True)
    tenant_id     = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"),
                           nullable=False, index=True)
    email         = Column(String,  nullable=False, index=True)
    password_hash = Column(String,  nullable=False)
    nombre        = Column(String,  nullable=False)
    rol           = Column(String,  nullable=False)   # owner|manager|cajero|inventario
    sucursal_id   = Column(String,  ForeignKey("sucursales.id", ondelete="SET NULL"),
                           nullable=True, index=True)
    pin           = Column(String(6), nullable=True, index=True)  # PIN rápido para cajeros
    activo        = Column(Boolean, default=True)
    creado_en     = Column(DateTime(timezone=True), default=_utcnow)
    ultimo_login  = Column(DateTime(timezone=True), nullable=True)

    tenant   = relationship("Tenant",   back_populates="usuarios")
    sucursal = relationship("Sucursal", foreign_keys=[sucursal_id])


class OnboardingProgress(Base):
    """Tracking del tutorial interactivo. 1:1 con Tenant."""
    __tablename__ = "onboarding_progress"

    tenant_id          = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"),
                                primary_key=True)
    perfil_configurado = Column(Boolean, default=False)
    primer_producto    = Column(Boolean, default=False)
    primera_venta      = Column(Boolean, default=False)
    saltado            = Column(Boolean, default=False)   # usuario cerró el tour
    completado_en      = Column(DateTime(timezone=True), nullable=True)
    actualizado_en     = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    tenant = relationship("Tenant", back_populates="onboarding")

    @property
    def porcentaje(self) -> int:
        hechos = sum([self.perfil_configurado, self.primer_producto, self.primera_venta])
        return int((hechos / 3) * 100)
