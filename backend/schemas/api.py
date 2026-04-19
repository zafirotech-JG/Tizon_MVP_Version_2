"""
Schemas Pydantic para validación de entrada/salida.
"""
from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


class MetodoPago(str, Enum):
    efectivo  = "Efectivo"
    nequi     = "Nequi"
    daviplata = "Daviplata"
    tarjeta   = "Tarjeta"


# ── Validadores reutilizables ────────────────────────────────────────
def validate_non_empty_string(v: str, field_name: str = "campo") -> str:
    """Valida que un string no esté vacío después de strip."""
    if not v or not v.strip():
        raise ValueError(f"El {field_name} no puede estar vacío")
    return v.strip()


def validate_positive_number(v: float, field_name: str = "valor") -> float:
    """Valida que un número sea positivo."""
    if v <= 0:
        raise ValueError(f"El {field_name} debe ser mayor a 0")
    return v


# ── Sucursales ───────────────────────────────────────────────────────
class SucursalCreate(BaseModel):
    nombre: str

    @field_validator("nombre")
    @classmethod
    def nombre_no_vacio(cls, v):
        return validate_non_empty_string(v, "nombre de la sucursal")


class SucursalOut(BaseModel):
    id:     str
    nombre: str
    activo: bool

    model_config = {"from_attributes": True}


# ── Productos ────────────────────────────────────────────────────────
class ProductoCreate(BaseModel):
    nombre:      str
    precio:      float
    insumos:     Optional[str] = ""
    categoria:   str = "General"
    sucursal_id: str

    @field_validator("precio")
    @classmethod
    def precio_positivo(cls, v):
        return validate_positive_number(v, "precio")

    @field_validator("nombre")
    @classmethod
    def nombre_no_vacio(cls, v):
        return validate_non_empty_string(v, "nombre")

    @field_validator("categoria")
    @classmethod
    def categoria_no_vacia(cls, v):
        return validate_non_empty_string(v, "categoría")

    @field_validator("sucursal_id")
    @classmethod
    def sucursal_requerida(cls, v):
        return validate_non_empty_string(v, "sucursal")


class ProductoUpdate(BaseModel):
    """Schema para edición parcial de productos."""
    nombre:      Optional[str]   = None
    precio:      Optional[float] = None
    insumos:     Optional[str]   = None
    categoria:   Optional[str]   = None
    sucursal_id: Optional[str]   = None

    @field_validator("precio")
    @classmethod
    def precio_positivo(cls, v):
        if v is not None and v <= 0:
            raise ValueError("El precio debe ser mayor a 0")
        return v

    @field_validator("nombre")
    @classmethod
    def nombre_no_vacio(cls, v):
        if v is not None:
            return validate_non_empty_string(v, "nombre")
        return v


class ProductoOut(BaseModel):
    id:          str
    nombre:      str
    precio:      float
    insumos:     str
    categoria:   str
    activo:      bool
    sucursal_id: Optional[str] = None

    model_config = {"from_attributes": True}


# ── Categorías ───────────────────────────────────────────────────────
class CategoriaCreate(BaseModel):
    nombre:      str
    sucursal_id: str

    @field_validator("nombre")
    @classmethod
    def nombre_no_vacio(cls, v):
        return validate_non_empty_string(v, "nombre de la categoría")

    @field_validator("sucursal_id")
    @classmethod
    def sucursal_requerida(cls, v):
        return validate_non_empty_string(v, "sucursal")


class CategoriaOut(BaseModel):
    id:          str
    nombre:      str
    activo:      bool
    sucursal_id: Optional[str] = None

    model_config = {"from_attributes": True}


class CategoriaUpdate(BaseModel):
    nombre: str

    @field_validator("nombre")
    @classmethod
    def nombre_no_vacio(cls, v):
        return validate_non_empty_string(v, "nombre")


# ── Ventas (legacy, mantenidas para compatibilidad) ──────────────────
class VentaCreate(BaseModel):
    producto_id:     str
    producto_nombre: Optional[str]   = None
    precio_unitario: Optional[float] = None
    cantidad:        int
    metodo_pago:     MetodoPago
    sucursal_id:     str

    @field_validator("cantidad")
    @classmethod
    def cantidad_positiva(cls, v):
        return validate_positive_number(v, "cantidad")

    @field_validator("sucursal_id")
    @classmethod
    def sucursal_requerida(cls, v):
        return validate_non_empty_string(v, "sucursal")


class VentaOut(BaseModel):
    id:              str
    fecha:           str
    producto_id:     str
    producto_nombre: str
    cantidad:        int
    precio_unitario: float
    total:           float
    metodo_pago:     str
    anulada:         bool = False

    model_config = {"from_attributes": True}


class VentaListOut(BaseModel):
    id:              str
    fecha:           str
    producto_nombre: str
    cantidad:        int
    precio_unitario: float
    total:           float
    metodo_pago:     str
    anulada:         bool = False

    model_config = {"from_attributes": True}


class VentaUpdate(BaseModel):
    metodo_pago: Optional[MetodoPago] = None
    cantidad:    Optional[int]        = None

    @field_validator("cantidad")
    @classmethod
    def cantidad_positiva(cls, v):
        if v is not None and v < 1:
            raise ValueError("La cantidad debe ser al menos 1")
        return v


# ── Órdenes (modelo atómico — reemplaza ventas individuales) ─────────
class OrdenItemCreate(BaseModel):
    producto_id:     str
    producto_nombre: Optional[str]   = None
    precio_unitario: Optional[float] = None
    cantidad:        int

    @field_validator("cantidad")
    @classmethod
    def cantidad_positiva(cls, v):
        if v < 1:
            raise ValueError("La cantidad debe ser al menos 1")
        return v


class OrdenCreate(BaseModel):
    sucursal_id: str
    metodo_pago: MetodoPago
    domicilio:   float = 0
    items:       List[OrdenItemCreate]

    @field_validator("sucursal_id")
    @classmethod
    def sucursal_requerida(cls, v):
        return validate_non_empty_string(v, "sucursal")

    @field_validator("items")
    @classmethod
    def items_no_vacio(cls, v):
        if not v:
            raise ValueError("La orden debe tener al menos un producto")
        return v


class OrdenItemOut(BaseModel):
    id:              str
    producto_id:     str
    producto_nombre: str
    cantidad:        int
    precio_unitario: float
    total:           float

    model_config = {"from_attributes": True}


class OrdenOut(BaseModel):
    id:          str
    fecha:       str
    metodo_pago: str
    subtotal:    float
    domicilio:   float
    total:       float
    anulada:     bool = False
    items:       List[OrdenItemOut] = []

    model_config = {"from_attributes": True}


class OrdenListOut(BaseModel):
    id:          str
    fecha:       str
    metodo_pago: str
    total:       float
    anulada:     bool = False
    num_items:   int  = 0

    model_config = {"from_attributes": True}


# ── Reportes ─────────────────────────────────────────────────────────
class ReporteProducto(BaseModel):
    producto_nombre: str
    cantidad_total:  int
    total_ingresos:  float


class ResumenCaja(BaseModel):
    total_dia:  float
    efectivo:   float
    nequi:      float
    daviplata:  float
    tarjeta:    float


class ReporteDia(BaseModel):
    fecha:         str
    sucursal_id:   str
    productos:     List[ReporteProducto]
    resumen_caja:  ResumenCaja


# ── Auth ─────────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email:       EmailStr
    password:    str
    nombre:      str
    propietario: str = ""
    telefono:    str = ""


class LoginRequest(BaseModel):
    email:    EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    nombre:       str = ""
    es_admin:     bool = False


class RegisterResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    nombre:       str
    es_admin:     bool = False


# ══ v3 — Auth con roles + refresh tokens ═════════════════════════════
class UsuarioPublico(BaseModel):
    id:          int
    email:       str
    nombre:      str
    rol:         str
    tenant_id:   int
    sucursal_id: str | None = None


class TokenPair(BaseModel):
    """Respuesta estándar de endpoints de auth v3: access + refresh + datos usuario."""
    access_token:  str
    refresh_token: str
    token_type:    str = "bearer"
    expires_in:    int                  # segundos
    usuario:       UsuarioPublico


class RegisterV3Request(BaseModel):
    """Registro de un nuevo NEGOCIO (tenant) + su usuario owner."""
    email:            EmailStr
    password:         str = Field(..., min_length=8, description="Mínimo 8 caracteres")
    nombre_comercial: str = Field(..., min_length=2, max_length=100)
    nombre_propietario: str = Field(..., min_length=2)
    nicho:            str = Field(default="restaurante",
                                   pattern="^(restaurante|retail|farmacia|servicio|otro)$")
    telefono:         str = ""


class RefreshRequest(BaseModel):
    refresh_token: str


class LoginPinRequest(BaseModel):
    tenant_id: int
    pin:       str = Field(..., min_length=4, max_length=6, pattern="^[0-9]+$")


class CrearUsuarioRequest(BaseModel):
    """Owner/Manager crea un usuario operativo para su tenant."""
    email:       EmailStr
    password:    str = Field(..., min_length=6)
    nombre:      str = Field(..., min_length=2)
    rol:         str = Field(..., pattern="^(manager|cajero|inventario)$")
    sucursal_id: str | None = None
    pin:         str | None = Field(None, pattern="^[0-9]{4,6}$")
