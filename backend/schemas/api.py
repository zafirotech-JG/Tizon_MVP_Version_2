"""
Schemas Pydantic para validación de entrada/salida.
"""
from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, field_validator


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


class ProductoOut(BaseModel):
    id:          str
    nombre:      str
    precio:      float
    insumos:     str
    categoria:   str
    activo:      bool
    sucursal_id: Optional[str] = None

    model_config = {"from_attributes": True}


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
    metodo_pago: MetodoPago


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


class RegisterRequest(BaseModel):
    email:    str
    password: str
    nombre:   str


class LoginRequest(BaseModel):
    username: str
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
