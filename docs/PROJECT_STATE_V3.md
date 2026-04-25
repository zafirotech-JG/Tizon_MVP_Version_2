# Zafiro POS v3 — Estado del Proyecto & Flujos de Trabajo

**Documento generado:** 18 de Abril, 2026  
**Branch activo:** `main` (producción)  
**URL Producción:** https://tizon-mvp-version-2.onrender.com  
**Versión:** v3.0.0 Multi-tenant + White-label

---

## 📋 ÍNDICE

1. [Visión General](#1-visión-general)
2. [Arquitectura Tecnológica](#2-arquitectura-tecnológica)
3. [Modelo de Datos](#3-modelo-de-datos)
4. [API Endpoints](#4-api-endpoints)
5. [Sistema de Autenticación](#5-sistema-de-autenticación)
6. [Sistema de Roles y Permisos](#6-sistema-de-roles-y-permisos)
7. [White-label & Branding](#7-white-label--branding)
8. [Onboarding System](#8-onboarding-system)
9. [Frontend Architecture](#9-frontend-architecture)
10. [Flujos de Trabajo](#10-flujos-de-trabajo)
11. [Mejoras Propuestas](#11-mejoras-propuestas)
12. [Checklist de Despliegue](#12-checklist-de-despliegue)

---

## 1. VISIÓN GENERAL

### Propósito
Zafiro POS es un sistema de punto de venta **white-label multi-tenant** diseñado para restaurantes, asaderos, retail y farmacias. Cada negocio (tenant) tiene su propia personalización visual, usuarios con roles diferenciados y datos aislados.

### Características Principales v3
- ✅ **Multi-tenant:** Aislamiento de datos por negocio
- ✅ **Roles granulares:** Super admin → Owner → Manager → Inventario → Cajero
- ✅ **Autenticación dual:** JWT (8h) + Refresh tokens (30d) + PIN rápido
- ✅ **White-label:** Personalización de colores, logo, tipografía y tema
- ✅ **Onboarding interactivo:** Tutorial de 3 pasos con Shepherd.js
- ✅ **Brand anchors:** Logo Zafiro inmutable en login, sidebar y footer
- ✅ **PWA:** Instalable en móviles con iconos Zafiro

---

## 2. ARQUITECTURA TECNOLÓGICA

### Stack Completo

| Capa | Tecnología | Versión |
|------|------------|---------|
| **Backend** | FastAPI | 0.100+ |
| **ORM** | SQLAlchemy | 2.0+ |
| **Validación** | Pydantic | 2.0+ |
| **Auth** | python-jose + bcrypt | 3.3+ / 4.0+ |
| **DB Dev** | SQLite | 3.x |
| **DB Prod** | PostgreSQL | 14+ |
| **Frontend** | Vanilla JS | ES2020+ |
| **Charts** | Chart.js | 4.4+ |
| **Tour** | Shepherd.js | 11.x |
| **Icons** | Phosphor Icons | 2.1+ |
| **Deploy** | Render | Web Service |

### Estructura de Directorios

```
Tizon_MVP_Version_2/
├── backend/
│   ├── main.py                 # Entry point FastAPI
│   ├── auth.py                 # Auth legacy (v1-v2)
│   ├── auth_v3/                # Auth v3 (roles, refresh tokens)
│   │   ├── __init__.py
│   │   ├── permissions.py      # Enum Rol + dependencies
│   │   └── tokens.py           # JWT emit/decode
│   ├── core/
│   │   └── config.py           # Env vars, CORS, paths
│   ├── db/
│   │   └── session.py          # SQLAlchemy engine + session
│   ├── models/
│   │   └── orm.py              # 11 modelos de datos
│   ├── routes/                 # 13 routers API
│   │   ├── auth.py
│   │   ├── auth_v3.py          # Nuevo: login v3 + register
│   │   ├── usuarios.py         # Nuevo: CRUD empleados
│   │   ├── branding.py         # Nuevo: personalización
│   │   ├── onboarding.py       # Nuevo: progreso tutorial
│   │   ├── admin.py
│   │   ├── sucursales.py
│   │   ├── productos.py
│   │   ├── categorias.py
│   │   ├── ordenes.py
│   │   ├── ventas.py
│   │   └── reportes.py
│   └── schemas/
│       ├── api.py              # Schemas Pydantic
│       └── __init__.py
├── frontend/
│   ├── index.html              # SPA principal
│   ├── admin.html              # Panel super-admin
│   ├── manifest.json           # PWA config
│   ├── assets/
│   │   ├── zafiro-logo.svg     # Logo principal (inmutable)
│   │   └── zafiro-gem-icon.svg # Icono gem
│   ├── css/
│   │   ├── styles.css          # Estilos legacy Tizón
│   │   ├── refinements.css     # Ajustes UI
│   │   ├── zafiro-brand.css    # Sistema de marca v3
│   │   └── onboarding.css      # Estilos Shepherd.js
│   └── js/
│       ├── app.js              # Entry point SPA
│       ├── api.js              # HTTP client
│       ├── auth.js             # Login/registro handlers
│       ├── theme.js            # Inyección CSS dinámica
│       ├── onboarding.js       # Tour Shepherd.js
│       ├── pos.js              # Lógica punto de venta
│       ├── inventario.js       # CRUD productos
│       ├── dashboard.js        # Reportes Chart.js
│       └── ... (otros)
├── docs/
│   └── PROJECT_STATE_V3.md     # Este documento
├── requirements.txt
├── Procfile
├── .env.example
└── .gitignore
```

---

## 3. MODELO DE DATOS

### Diagrama de Entidades

```
┌─────────────────────────────────────────────────────────────────────┐
│                              TENANT                                  │
│  (Negocio / Owner)                                                  │
│  ─────────────────────────────────────────────────────────────────  │
│  id PK | email | password_hash | nombre | propietario | telefono     │
│  plan | activo | es_admin | plan_activo | fecha_vencimiento         │
└─────────────────────────────────────────────────────────────────────┘
     │ 1:1                    │ 1:N                    │ 1:N
     ▼                        ▼                        ▼
┌──────────────┐      ┌──────────────┐        ┌──────────────┐
│TENANTBRANDING│      │   USUARIO    │        │   SUCURSAL   │
│ (V3)         │      │   (V3)       │        │              │
├──────────────┤      ├──────────────┤        ├──────────────┤
│tenant_id PK  │      │id PK         │        │id PK (UUID)  │
│color_primary │      │tenant_id FK  │◄───────│tenant_id FK  │
│color_secondary│     │email         │        │nombre        │
│nombre_comercial│    │password_hash │        │activo        │
│logo_url      │      │nombre        │        └──────────────┘
│nicho         │      │rol           │               │
│tema          │      │pin (opcional)│               │ 1:N
│tipografia    │      │activo        │               ▼
│categorias_default  │ │creado_en     │        ┌──────────────┐
└──────────────┘      └──────────────┘        │   PRODUCTO   │
     │ 1:1                                      ├──────────────┤
     ▼                                           │id PK (UUID)  │
┌────────────────┐                              │tenant_id FK  │
│ONBOARDINGPROGRESS│                            │sucursal_id FK│
│    (V3)        │                              │nombre        │
├────────────────┤                              │precio        │
│tenant_id PK    │                              │categoria_id  │
│perfil_configurado│                            └──────────────┘
│primer_producto │
│primera_venta   │
│saltado         │
└────────────────┘
```

### Tablas Core (Legacy V1-V2)

| Tabla | Descripción | Claves |
|-------|-------------|--------|
| `Tenant` | Negocio registrado | `id` PK, `email` unique |
| `Sucursal` | Puntos de venta físicos | `id` UUID PK, `tenant_id` FK |
| `Producto` | Catálogo de items | `id` UUID PK, `tenant_id` FK, `sucursal_id` FK |
| `Categoria` | Agrupación de productos | `id` UUID PK, `tenant_id` FK |
| `Venta` | Transacciones legacy (v1) | `id` UUID PK, `tenant_id` FK |
| `Orden` | Transacciones atómicas (v2+) | `id` UUID PK, `tenant_id` FK, `sucursal_id` FK |
| `OrdenItem` | Líneas de orden | `id` UUID PK, `orden_id` FK |

### Tablas V3 (Multi-tenant & White-label)

| Tabla | Descripción | Relación |
|-------|-------------|----------|
| `TenantBranding` | Personalización visual | 1:1 con Tenant |
| `Usuario` | Empleados con roles | N:1 con Tenant |
| `OnboardingProgress` | Tracking tutorial | 1:1 con Tenant |

### Campos TenantBranding (Personalización)

```python
tenant_id          : Integer PK, FK → Tenant
color_primary      : String(7)  # Hex #rrggbb (default: #e25822)
color_secondary    : String(7)  # Hex #rrggbb (default: #1a1714)
color_accent       : String(7)  # Hex #rrggbb (default: #22c55e)
nombre_comercial   : String     # Nombre visible del negocio
logo_url           : String?    # URL del logo personalizado
nicho              : String     # restaurante|retail|farmacia|servicio|otro
tema               : String     # dark|light|warm
tipografia         : String     # Inter|Roboto|Poppins|Nunito|Lato
categorias_default : JSON       # Array de strings (seed inicial)
actualizado_en     : DateTime
```

### Campos Usuario (Roles)

```python
id            : Integer PK
 tenant_id     : Integer FK → Tenant
email         : String (unique por tenant)
password_hash : String
nombre        : String
rol           : String  # owner|manager|inventario|cajero|super_admin
sucursal_id   : String? FK → Sucursal (asignación opcional)
pin           : String(6)?  # PIN rápido para cajeros
activo        : Boolean
creado_en     : DateTime
ultimo_login  : DateTime?
```

### Jerarquía de Roles (Numérica)

| Rol | Valor | Descripción |
|-----|-------|-------------|
| `super_admin` | 100 | Staff Zafiro - acceso global |
| `owner` | 80 | Dueño del negocio - control total |
| `manager` | 60 | Gerente - puede gestionar empleados |
| `inventario` | 40 | Encargado de stock y productos |
| `cajero` | 20 | Operador POS solo ventas |

---

## 4. API ENDPOINTS

### Resumen de Routers

| Router | Prefijo | Endpoints | Estado |
|--------|---------|-----------|--------|
| Auth Legacy | `/api/auth` | POST /login, POST /register | ⚠️ Legacy (compatible) |
| Auth V3 | `/api/v3/auth` | 6 endpoints | ✅ Activo |
| Usuarios | `/api/v3/usuarios` | GET, POST, DELETE | ✅ Activo |
| Branding | `/api/v3/branding` | GET, PUT + público | ✅ Activo |
| Onboarding | `/api/v3/onboarding` | GET, PATCH, POST | ✅ Activo |
| Admin | `/api/admin` | GET /tenants, DELETE /tenant | ✅ Activo |
| Sucursales | `/api/sucursales` | CRUD completo | ✅ Activo |
| Productos | `/api/productos` | CRUD + filtros | ✅ Activo |
| Categorías | `/api/categorias` | CRUD | ✅ Activo |
| Órdenes | `/api/ordenes` | POST, GET, DELETE | ✅ Activo |
| Ventas | `/api/ventas` | Legacy (mantenido) | ⚠️ Legacy |
| Reportes | `/api/reportes` | Día, producto, cierre | ✅ Activo |

**Total: ~50 endpoints activos**

### Auth V3 (Detalle)

```http
# 1. Registro de negocio completo
POST /api/v3/auth/register
Body: {
  "email": "negocio@ejemplo.com",
  "password": "secreto123",
  "nombre_comercial": "Asadero El Tizón",
  "nombre_propietario": "Juan Pérez",
  "telefono": "3001234567",
  "nicho": "restaurante"
}
Response: {
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "token_type": "bearer",
  "expires_in": 28800,
  "usuario": { ... }
}

# 2. Login con credenciales
POST /api/v3/auth/login
Body: { "email": "...", "password": "..." }
Response: TokenPair + Usuario

# 3. Login rápido con PIN (cajeros)
POST /api/v3/auth/login-pin
Body: { "tenant_id": 1, "pin": "123456" }
Response: TokenPair + Usuario

# 4. Refrescar tokens
POST /api/v3/auth/refresh
Body: { "refresh_token": "eyJhbGc..." }
Response: Nuevo TokenPair

# 5. Info usuario actual
GET /api/v3/auth/me
Headers: Authorization: Bearer {access_token}
Response: UsuarioPublico

# 6. Logout (stateless)
POST /api/v3/auth/logout
Nota: Cliente debe descartar tokens
```

### Branding API

```http
# Obtener branding del tenant (auth required)
GET /api/v3/branding
Response: {
  "tenant_id": 1,
  "nombre_comercial": "Asadero El Tizón",
  "logo_url": "https://...",
  "color_primary": "#e25822",
  "color_secondary": "#1a1714",
  "color_accent": "#22c55e",
  "nicho": "restaurante",
  "tema": "dark",
  "tipografia": "Inter",
  "categorias_default": ["Bebidas", "Platos", "Postres"]
}

# Actualizar branding (owner/manager only)
PUT /api/v3/branding
Body: { "color_primary": "#ff6b00", "tema": "warm" }

# Obtener branding público (para login screen)
GET /api/v3/branding/public/{tenant_id}
Response: BrandingOut (sin auth)
```

### Onboarding API

```http
# Ver progreso actual
GET /api/v3/onboarding
Response: {
  "tenant_id": 1,
  "perfil_configurado": true,
  "primer_producto": false,
  "primera_venta": false,
  "saltado": false,
  "porcentaje": 33,
  "completado": false
}

# Marcar paso como completado
PATCH /api/v3/onboarding/perfil    # o /producto o /venta

# Saltar tutorial
POST /api/v3/onboarding/skip
```

---

## 5. SISTEMA DE AUTENTICACIÓN

### Flujo de Tokens

```
┌──────────────┐
│   Cliente    │
└──────┬───────┘
       │ 1. POST /login (email, password)
       ▼
┌──────────────────┐
│  Backend         │
│  - Valida creds  │
│  - Crea tokens   │
└──────┬───────────┘
       │ 2. Devuelve {access_token, refresh_token}
       ▼
┌──────────────┐
│   Cliente    │◄──── Guarda en localStorage
└──────┬───────┘
       │ 3. Requests subsiguientes
       │    Header: Authorization: Bearer {access_token}
       ▼
┌──────────────────┐
│  Backend         │
│  - Valida JWT    │
│  - Extrae user   │
└──────┬───────────┘
       │ 4. Response datos
       ▼
┌──────────────┐
│   Cliente    │
└──────────────┘

# Cuando access_token expira (8h):
┌──────────────┐
│   Cliente    │
└──────┬───────┘
       │ POST /refresh con refresh_token
       ▼
┌──────────────────┐
│  Backend         │
│  - Valida refresh│
│  - Emite nuevos  │
└──────┬───────────┘
       │ Nuevo TokenPair
       ▼
┌──────────────┐
│   Cliente    │◄──── Actualiza localStorage
└──────────────┘
```

### Payload JWT

```json
{
  "sub": "usuario@ejemplo.com",
  "user_id": 1,
  "tenant_id": 1,
  "rol": "owner",
  "exp": 1713540000,
  "iat": 1713511200,
  "type": "access"
}
```

---

## 6. SISTEMA DE ROLES Y PERMISOS

### Dependency Injection (FastAPI)

```python
# Endpoint protegido por rol
@router.delete("/api/usuarios/{id}")
def eliminar_usuario(
    id: int,
    user: dict = Depends(requiere_rol(Rol.MANAGER))
):
    # Solo managers o superiores pueden eliminar
    ...

# Endpoint con tenant activo requerido
@router.get("/api/reportes")
def reportes(
    user: dict = Depends(requiere_tenant_activo())
):
    # Rechaza si plan_activo = false
    ...
```

### Matriz de Permisos

| Acción | Super Admin | Owner | Manager | Inventario | Cajero |
|--------|:-----------:|:-----:|:-------:|:----------:|:------:|
| Gestionar tenants (CRUD) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gestionar usuarios | ✅ | ✅ | ✅ | ❌ | ❌ |
| Configurar branding | ✅ | ✅ | ✅ | ❌ | ❌ |
| Ver reportes | ✅ | ✅ | ✅ | ❌ | ❌ |
| Gestionar productos | ✅ | ✅ | ✅ | ✅ | ❌ |
| Gestionar categorías | ✅ | ✅ | ✅ | ✅ | ❌ |
| Realizar ventas | ✅ | ✅ | ✅ | ✅ | ✅ |
| Anular ventas | ✅ | ✅ | ✅ | ❌ | ❌ |
| Cambiar sucursal | ✅ | ✅ | ✅ | ❌ | ❌ |

---

## 7. WHITE-LABEL & BRANDING

### Variables CSS

**Inmutables (Identidad Zafiro):**
```css
--zafiro-blue: #1e5fd9;
--zafiro-blue-glow: #4a8aff;
--zafiro-blue-dark: #0d3a8f;
--zafiro-ink: #0a1628;
```

**Personalizables por Tenant:**
```css
--tenant-primary:   #e25822;  /* Default naranja */
--tenant-secondary: #1a1714;
--tenant-accent:    #22c55e;
```

**Temas:**
```css
/* Dark (default) */
[data-tema="dark"] {
  --bg-base: #0f0d0b;
  --bg-card: #1a1714;
  --text-primary: #f5f0eb;
}

/* Light */
[data-tema="light"] {
  --bg-base: #f8f7f6;
  --bg-card: #ffffff;
  --text-primary: #1a1714;
}

/* Warm */
[data-tema="warm"] {
  --bg-base: #1c1410;
  --bg-card: #2a1f18;
  --text-primary: #f5e6d8;
}
```

### API JavaScript (theme.js)

```javascript
// Aplicar branding desde localStorage (instantáneo)
window.ZafiroTheme.aplicarBrandingLocal();

// Cargar del servidor y cachear
await window.ZafiroTheme.aplicarDesdeServidor(accessToken);

// Guardar después de PUT
window.ZafiroTheme.guardarBrandingLocal(brandingObj);

// Limpiar en logout
window.ZafiroTheme.limpiarBranding();
```

---

## 8. ONBOARDING SYSTEM

### Flujo del Tutorial

```
┌───────────────────────────────────────────────────────────────┐
│  PASO 1: Personaliza tu negocio                              │
│  ─────────────────────────────────────────────────────────    │
│  • Apunta a: #btn-config-perfil / #nav-config                │
│  • Acción: Usuario configura branding (colores, nombre)      │
│  • Backend: PATCH /onboarding/perfil → marca perfil_configurado│
└───────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────┐
│  PASO 2: Agrega tu primer producto                             │
│  ─────────────────────────────────────────────────────────    │
│  • Apunta a: #btn-nuevo-producto / #nav-inventario            │
│  • Acción: Usuario crea producto en inventario                │
│  • Backend: PATCH /onboarding/producto → marca primer_producto│
└───────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────┐
│  PASO 3: Realiza tu primera venta                              │
│  ─────────────────────────────────────────────────────────    │
│  • Apunta a: .producto-card / #seccion-pos                   │
│  • Acción: Usuario hace venta de prueba                       │
│  • Backend: PATCH /onboarding/venta → marca primera_venta      │
└───────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────┐
│  CELEBRACIÓN: ¡Tu negocio está listo!                         │
│  ─────────────────────────────────────────────────────────    │
│  • Animación celebración                                      │
│  • Mensaje: "Ya puedes empezar a vender"                     │
│  • Backend: completado_en = now()                           │
└───────────────────────────────────────────────────────────────┘
```

### API JavaScript (onboarding.js)

```javascript
// Iniciar tour si no completado ni saltado
await window.ZafiroOnboarding.iniciarOnboarding(accessToken);

// Cancelar manualmente
window.ZafiroOnboarding.cancelarOnboarding();
```

---

## 9. FRONTEND ARCHITECTURE

### Flujo de Carga

```
1. Navegador carga index.html
   ├── CSS: styles.css, zafiro-brand.css, onboarding.css
   ├── JS: theme.js (primero - anti-FOUC)
   └── Font: Inter (Google Fonts)

2. theme.js ejecuta aplicarBrandingLocal()
   └── Aplica colores cacheados instantáneamente

3. Verificación de sesión
   └── Si token existe: valida y carga dashboard
   └── Si no: muestra login-overlay

4. Post-login exitoso
   ├── Guarda token en localStorage
   ├── theme.js: aplicarDesdeServidor(token)
   └── onboarding.js: iniciarOnboarding(token) (si aplica)

5. SPA Router (app.js)
   └── Muestra sección según hash: #pos, #inventario, #dashboard
```

### Estructura de Módulos JS

```javascript
// api.js - Capa HTTP
export const API = {
  auth: { login, register, ... },
  request: async (method, path, body) => {...}
};

// theme.js - Personalización
export {
  aplicarBrandingLocal,
  aplicarDesdeServidor,
  guardarBrandingLocal,
  limpiarBranding
};

// onboarding.js - Tutorial
export {
  iniciarOnboarding,
  cancelarOnboarding
};

// pos.js - Punto de venta
export {
  agregarAlCarrito,
  calcularTotal,
  procesarPago,
  generarRecibo
};
```

---

## 10. FLUJOS DE TRABAJO

### FLUJO 1: Primer Registro de Negocio

```
Usuario (Owner potencial)
    │
    │ 1. Visita https://tizon-mvp-version-2.onrender.com
    │
    ▼
┌───────────────────────────────┐
│ Pantalla Login                │
│ • Logo Zafiro (inmutable)     │
│ • Link "Crear cuenta"         │
└───────────────┬───────────────┘
                │
                │ Click "Crear cuenta"
                ▼
┌───────────────────────────────┐
│ Formulario Registro           │
│ • Nombre del negocio *        │
│ • Nombre propietario          │
│ • Email *                     │
│ • Teléfono                    │
│ • Contraseña *                │
│ • Nicho: [restaurante]        │
└───────────────┬───────────────┘
                │
                │ POST /api/v3/auth/register
                ▼
┌───────────────────────────────┐
│ Backend crea automáticamente: │
│ • Tenant (negocio)            │
│ • Usuario owner               │
│ • TenantBranding (default)    │
│ • OnboardingProgress (0%)     │
│ • Categorías seed por nicho   │
└───────────────┬───────────────┘
                │
                │ Response: {access_token, refresh_token, usuario}
                ▼
┌───────────────────────────────┐
│ Frontend:                     │
│ • Guarda tokens               │
│ • Aplica branding             │
│ • Muestra modal bienvenida    │
└───────────────┬───────────────┘
                │
                │ Inicia Shepherd.js tour
                ▼
        ┌───────┴───────┐
        │               │
   Paso 1          Paso 2
Configurar        Agregar
 perfil         producto
        │               │
        └───────┬───────┘
                │
               Paso 3
             Hacer venta
                │
                ▼
        ┌───────────────┐
        │  ¡Completado! │
        │ Brand anchor  │
        │ Zafiro visible│
        │ en sidebar    │
        └───────────────┘
```

### FLUJO 2: Login Diario (Cajero)

```
Cajero
    │
    │ 1. Abre app en tablet
    ▼
┌───────────────────────────────┐
│ Opciones de login:            │
│ A) Email + contraseña         │
│ B) PIN rápido (6 dígitos)     │
└───────────────┬───────────────┘
                │
        ┌───────┴───────┐
        │               │
        ▼               ▼
   POST /login      POST /login-pin
   (email, pass)    (tenant_id, pin)
        │               │
        └───────┬───────┘
                │
                ▼
        ┌───────────────┐
        │ TokenPair     │
        └───────┬───────┘
                │
                ▼
        ┌───────────────┐
        │ Dashboard     │
        │ POS listo     │
        │ Branding      │
        │ tenant aplicado│
        └───────────────┘
```

### FLUJO 3: Gestión de Empleados (Manager)

```
Manager (rol >= MANAGER)
    │
    │ 1. Navega a Configuración → Usuarios
    ▼
┌───────────────────────────────┐
│ Panel Usuarios                │
│ Lista de empleados actuales   │
└───────────────┬───────────────┘
                │
        ┌───────┴───────┐
        │               │
        ▼               ▼
   Crear nuevo     Editar/eliminar
   empleado        empleado
        │               │
        ▼               ▼
┌───────────────┐   ┌───────────────┐
│ POST          │   │ PUT / DELETE  │
│ /usuarios     │   │ /usuarios/{id}│
├───────────────┤   ├───────────────┤
│ • Email       │   │ Validación:   │
│ • Nombre      │   │ No puede      │
│ • Rol         │   │ editar a      │
│ • Sucursal    │   │ superiores    │
│ • PIN (opc)   │   │               │
└───────────────┘   └───────────────┘
```

### FLUJO 4: Personalización de Marca (Owner)

```
Owner
    │
    │ 1. Configuración → Apariencia
    ▼
┌───────────────────────────────┐
│ Editor de Branding            │
├───────────────────────────────┤
│ Nombre comercial: [______]    │
│ Logo: [Subir imagen]          │
│                               │
│ Colores:                      │
│ • Primario:   [#e25822] 🎨    │
│ • Secundario: [#1a1714] 🎨    │
│ • Acento:     [#22c55e] 🎨    │
│                               │
│ Tema: (○) Dark  ( ) Light     │
│                               │
│ Tipografía: [Inter ▼]         │
│ Nicho: [Restaurante ▼]        │
└───────────────┬───────────────┘
                │
                │ 2. Click "Guardar"
                │
                ▼
        PUT /api/v3/branding
                │
                ▼
        ┌───────────────┐
        │ Aplicación de │
        │ cambios:      │
        │ • Backend:    │
        │   actualiza BD│
        │ • Frontend:   │
        │   inyecta CSS │
        │   vars en     │
        │   tiempo real │
        └───────────────┘
```

### FLUJO 5: Punto de Venta (Cajero)

```
Cajero autenticado
    │
    │ 1. Sección POS cargada
    ▼
┌───────────────────────────────┐
│ Grid de productos             │
│ Tarjetas con:                 │
│ • Imagen/ícono                │
│ • Nombre                      │
│ • Precio                      │
│ • Categoría color             │
└───────────────┬───────────────┘
                │
                │ 2. Toca producto
                ▼
        ┌───────────────┐
        │ Carrito lateral│
        │ • Producto añadido
        │ • Cantidad +/-/X
        │ • Subtotal    │
        └───────────────┘
                │
                │ 3. Toca "Cobrar"
                ▼
        ┌───────────────┐
        │ Modal Pago   │
        │ Métodos:     │
        │ • Efectivo   │
        │ • Nequi      │
        │ • Transferencia
        │ • Tarjeta    │
        └───────┬───────┘
                │
                │ 4. Selecciona método
                ▼
        ┌───────────────┐
        │ POST /ordenes │
        │ Crea orden    │
        │ atómica       │
        └───────┬───────┘
                │
                ▼
        ┌───────────────┐
        │ Recibo        │
        │ • Imprimible  │
        │ • PDF opcional│
        │ • Reset carrito│
        └───────────────┘
```

### FLUJO 6: Super Admin (Gestión de Tenants)

```
Super Admin
    │
    │ 1. Accede a /admin
    ▼
┌───────────────────────────────┐
│ Login Admin                   │
│ • Email y pass (con es_admin) │
└───────────────┬───────────────┘
                │
                │ POST /api/admin/login
                ▼
        ┌───────────────┐
        │ Panel Admin   │
        ├───────────────┤
        │ Lista tenants │
        │ • Nombre      │
        │ • Email       │
        │ • Plan        │
        │ • Activo      │
        │ • Fecha venc  │
        ├───────────────┤
        │ Acciones:     │
        │ • Editar plan │
        │ • Suspender   │
        │ • Eliminar    │
        └───────────────┘
```

### FLUJO 7: Desarrollo y Deploy

```
Desarrollador
    │
    │ 1. Trabajo local en feature
    ▼
┌───────────────────────────────┐
│ git checkout develop          │
│ git pull origin develop       │
│ git checkout -b feature/xyz   │
└───────────────┬───────────────┘
                │
                │ 2. Desarrollo
                ▼
        ┌───────────────┐
        │ python -m     │
        │ uvicorn       │
        │ backend.main  │
        │ --reload      │
        │               │
        │ http://local  │
        │ host:8000     │
        └───────┬───────┘
                │
                │ 3. Tests locales OK
                ▼
        ┌───────────────┐
        │ git add -A    │
        │ git commit -m │
        │ "feat: xyz"   │
        │ git push      │
        │ origin        │
        │ feature/xyz   │
        └───────┬───────┘
                │
                ▼
        ┌───────────────┐
        │ PR: feature   │
        │ → develop       │
        │ (Code review) │
        └───────┬───────┘
                │
                ▼
        ┌───────────────┐
        │ Merge a       │
        │ develop         │
        │ (Testing)     │
        └───────┬───────┘
                │
                ▼
        ┌───────────────┐
        │ PR: develop   │
        │ → main          │
        │ (Aprobación)  │
        └───────┬───────┘
                │
                ▼
        ┌───────────────┐
        │ Merge a main  │
        │ git push      │
        │ origin main   │
        └───────┬───────┘
                │
                ▼
        ┌───────────────┐
        │ Render        │
        │ Auto-deploy   │
        │ Producción    │
        └───────────────┘
```

---

## 11. MEJORAS PROPUESTAS

### 🔴 Críticas / Seguridad

| Mejora | Descripción | Prioridad | Estimación |
|--------|-------------|-----------|------------|
| **Token Refresh Seguro** | Implementar blacklist de tokens revocados (Redis/DB) | Alta | 4h |
| **Rate Limiting** | Agregar `slowapi` para prevenir brute force | Alta | 2h |
| **Audit Logging** | Tabla `AuditLog` para trazabilidad completa | Media | 6h |
| **2FA** | Autenticación de dos factores para owners | Media | 8h |

### 🟡 Funcionalidad

| Mejora | Descripción | Prioridad | Estimación |
|--------|-------------|-----------|------------|
| **Upload de Logos** | Endpoint S3/Cloudinary para logos personalizados | Alta | 4h |
| **Notificaciones Push** | Web Push API para alertas de venta | Media | 6h |
| **Offline Mode** | Service Worker + IndexedDB para operar sin red | Media | 12h |
| **Multi-moneda** | Soporte COP, USD, EUR con conversiones | Media | 4h |
| **Impresora Térmica** | Integración ESC/POS para impresión nativa | Media | 8h |
| **Facturación Electrónica** | Integración DIAN (Colombia) | Baja | 16h |

### 🟢 UX/UI

| Mejora | Descripción | Prioridad | Estimación |
|--------|-------------|-----------|------------|
| **Toggle Dark/Light** | Switch manual en UI (independiente del tema tenant) | Media | 2h |
| **Búsqueda Avanzada** | Fuzzy search en productos (Fuse.js) | Media | 3h |
| **Atajos Teclado** | Hotkeys para POS (F1=buscar, F2=cobrar) | Baja | 2h |
| **Vista Mesas** | UI alternativa tipo comandas para restaurantes | Baja | 8h |

### 🔵 Técnico / Deuda

| Mejora | Descripción | Prioridad | Estimación |
|--------|-------------|-----------|------------|
| **Migraciones Formales** | Implementar Alembic (reemplazar `create_all`) | Alta | 4h |
| **Tests Automatizados** | pytest + TestClient para API (coverage >80%) | Alta | 12h |
| **TypeScript** | Migrar JS frontend a TS | Media | 16h |
| **Linting/CI** | Ruff + Prettier en GitHub Actions | Media | 3h |
| **Docker** | Dockerfile + docker-compose para dev | Baja | 4h |

---

## 12. CHECKLIST DE DESPLIEGUE

### Pre-deploy

- [ ] Todas las variables de entorno configuradas en Render
- [ ] `DATABASE_URL` apunta a PostgreSQL (no SQLite)
- [ ] `SECRET_KEY` generado aleatoriamente (≥32 chars)
- [ ] `ADMIN_EMAIL` y `ADMIN_PASSWORD` definidos
- [ ] `CORS_ORIGINS` configurado correctamente
- [ ] Tests pasan localmente

### Deploy

- [ ] `git checkout main`
- [ ] `git merge develop`
- [ ] `git push origin main`
- [ ] Verificar en Render Dashboard que build inicia
- [ ] Esperar status "live" en deploy

### Post-deploy

- [ ] https://tizon-mvp-version-2.onrender.com responde 200
- [ ] `/docs` muestra Swagger UI correctamente
- [ ] Login funciona con credenciales de prueba
- [ ] Branding se aplica correctamente
- [ ] Assets (SVGs, CSS, JS) cargan sin errores 404
- [ ] Onboarding tour aparece para nuevos usuarios

### Monitoreo

- [ ] Revisar logs de Render (sin errores 500)
- [ ] Verificar uso de memoria/CPU (free tier limitado)
- [ ] Confirmar base de datos PostgreSQL responde

---

## 📊 MÉTRICAS DEL PROYECTO

| Métrica | Valor |
|---------|-------|
| Líneas de código Python | ~3,500 |
| Líneas de código JavaScript | ~2,800 |
| Archivos CSS | 4 (~600 líneas) |
| Endpoints API | ~50 |
| Tablas BD | 11 |
| Modelos Pydantic | ~25 |
| Routers FastAPI | 13 |
| Commits v3 | 6 merges a main |
| Deploys exitosos | Producción activa |

---

## 🔗 REFERENCIAS RÁPIDAS

### URLs Importantes

- **Producción:** https://tizon-mvp-version-2.onrender.com
- **API Docs:** https://tizon-mvp-version-2.onrender.com/docs
- **Admin Panel:** https://tizon-mvp-version-2.onrender.com/admin
- **Repositorio:** https://github.com/zafirotech-JG/Tizon_MVP_Version_2

### Comandos Útiles

```bash
# Desarrollo local
python -m uvicorn backend.main:app --reload

# Dependencias
pip install -r requirements.txt

# Crear super admin (manual DB)
UPDATE tenants SET es_admin = 1 WHERE email = 'admin@ejemplo.com';

# Ver branding de tenant
GET /api/v3/branding/public/{tenant_id}
```

---

## 📝 NOTAS

**Última actualización:** 18 de Abril, 2026  
**Autor:** Sistema Zafiro POS  
**Versión documento:** 1.0

Este documento debe mantenerse actualizado con cada cambio significativo en la arquitectura o funcionalidad del sistema.
