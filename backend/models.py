"""
models.py — Schemas Pydantic para validación de entrada/salida
"""
from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


class MetodoPago(str, Enum):
    efectivo  = "Efectivo"
    nequi     = "Nequi"
    daviplata = "Daviplata"
    tarjeta   = "Tarjeta"


# ─────────────── SUCURSALES ───────────────

class SucursalCreate(BaseModel):
    nombre: str

    @field_validator("nombre")
    @classmethod
    def nombre_no_vacio(cls, v):
        if not v.strip():
            raise ValueError("El nombre de la sucursal no puede estar vacío")
        return v.strip()


class SucursalOut(BaseModel):
    id:     str
    nombre: str
    activo: bool

    model_config = {"from_attributes": True}


# ─────────────── PRODUCTOS ───────────────

class ProductoCreate(BaseModel):
    nombre:      str
    precio:      float
    insumos:     Optional[str] = ""
    categoria:   str = "General"
    sucursal_id: str

    @field_validator("precio")
    @classmethod
    def precio_positivo(cls, v):
        if v <= 0:
            raise ValueError("El precio debe ser mayor a 0")
        return v

    @field_validator("nombre")
    @classmethod
    def nombre_no_vacio(cls, v):
        if not v.strip():
            raise ValueError("El nombre no puede estar vacío")
        return v.strip()

    @field_validator("categoria")
    @classmethod
    def categoria_no_vacia(cls, v):
        if not v.strip():
            raise ValueError("La categoría es obligatoria")
        return v.strip()

    @field_validator("sucursal_id")
    @classmethod
    def sucursal_requerida(cls, v):
        if not v or not v.strip():
            raise ValueError("La sucursal es obligatoria")
        return v.strip()


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
        if not v.strip():
            raise ValueError("El nombre de la categoría no puede estar vacío")
        return v.strip()

    @field_validator("sucursal_id")
    @classmethod
    def sucursal_requerida(cls, v):
        if not v or not v.strip():
            raise ValueError("La sucursal es obligatoria")
        return v.strip()


class CategoriaOut(BaseModel):
    id:          str
    nombre:      str
    activo:      bool
    sucursal_id: Optional[str] = None

    model_config = {"from_attributes": True}


# ─────────────── VENTAS ───────────────

class VentaCreate(BaseModel):
    producto_id:     str
    producto_nombre: Optional[str]   = None  # requerido si producto_id empieza con "__"
    precio_unitario: Optional[float] = None  # requerido si producto_id empieza con "__"
    cantidad:        int
    metodo_pago:     MetodoPago
    sucursal_id:     str

    @field_validator("cantidad")
    @classmethod
    def cantidad_positiva(cls, v):
        if v <= 0:
            raise ValueError("La cantidad debe ser al menos 1")
        return v

    @field_validator("sucursal_id")
    @classmethod
    def sucursal_requerida(cls, v):
        if not v or not v.strip():
            raise ValueError("La sucursal es obligatoria")
        return v.strip()


class VentaOut(BaseModel):
    id:              str
    fecha:           str
    producto_id:     str
    producto_nombre: str
    cantidad:        int
    precio_unitario: float
    total:           float
    metodo_pago:     str

    model_config = {"from_attributes": True}


# ─────────────── REPORTES ───────────────

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


# ─────────────── AUTH ───────────────

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


class RegisterResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    nombre:       str
