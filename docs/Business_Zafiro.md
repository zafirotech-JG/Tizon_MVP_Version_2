# Business_Zafiro — Valoración Comercial & Estrategia de Mercado

> **Documento:** Análisis de valoración y posicionamiento comercial
> **Fecha:** Abril 2026
> **Estado del producto:** MVP v3 funcional — auth + multi-tenant + POS + dashboard + inventario + config + equipo
> **Mercado objetivo:** Colombia (PYMES de restaurantes, retail, servicios)

> ⚠️ **Advertencia:** Esta es una estimación basada en el estado actual del código y conocimiento público del mercado. No constituye auditoría financiera ni due diligence. Los rangos reflejan incertidumbre real.

---

## 1. Diagnóstico del producto

### 1.1 Activos actuales (lo que ya tiene Zafiro POS v3)
- **Multi-tenant white-label**: personalización visual completa por tenant (logo, colores, tema, tipografía). **Este es el mayor diferencial**; muy pocos competidores en Colombia lo ofrecen nativamente.
- **Arquitectura SaaS moderna**: FastAPI + PostgreSQL-ready, JWT + refresh tokens, RBAC con 5 roles (owner/manager/cajero/inventario/super_admin).
- **Mobile-first PWA**: instalable, responsivo, con potencial offline.
- **4 métodos de pago locales**: Efectivo, Tarjeta, **Nequi, Daviplata** (crítico en Colombia).
- **Login con PIN** para cajeros (táctil rápido, sin teclado).
- **Multi-sucursal** nativo.
- **Onboarding integrado**: tutorial interactivo con driver.js + sistema de pasos.
- **Frontend modular** con lazy-loading de vistas (performance).

### 1.2 Gaps críticos para comercialización

| Gap | Impacto | Costo estimado de cerrar |
|-----|---------|--------------------------|
| **Facturación electrónica DIAN** | ⛔ Bloqueante legal desde 2020 | $15M – $30M COP (certificación + dev) |
| Integración impresoras térmicas (ESC/POS) | 🔴 Alto | $3M – $8M COP |
| Lector de código de barras (nativo + USB HID) | 🔴 Alto | $2M – $5M COP |
| Inventario avanzado (lotes, vencimientos, stock mínimo) | 🟡 Medio | $8M – $15M COP |
| Reportes contables exportables (PUC) | 🟡 Medio | $5M – $10M COP |
| Integración pasarelas (Wompi, Mercado Pago, ePayco) | 🟡 Medio | $5M – $12M COP |
| Módulo de clientes / fidelización | 🟢 Bajo | $4M – $8M COP |
| Kitchen Display System (KDS) para restaurantes | 🟢 Bajo | $6M – $12M COP |
| Apps nativas iOS/Android (store presence) | 🟡 Medio | $15M – $30M COP |

**Total para alcanzar paridad competitiva: $63M – $130M COP** (~$15K – $30K USD)

---

## 2. Competidores directos en Colombia

| Competidor | Precio típico (COP/mes) | Clientes estimados | Fortaleza |
|------------|--------------------------|---------------------|-----------|
| **Alegra POS** | $49K – $189K | 100K+ (LATAM) | Contabilidad + DIAN integrada |
| **Siigo Nube** | $65K – $320K | 600K+ PYMES | ERP completo, marca dominante |
| **Treinta** | Gratis / $29K pro | 700K+ descargas | Cuaderno digital, foco tenderos |
| **Loyverse** | Gratis / $14 USD/mes add-on | ~50K en Colombia | POS sólido, gratuito base |
| **Bsale** | $70K – $250K | Entrante reciente | UX moderna (chileno) |
| **Vendemás (Bancolombia)** | $0 + comisión transaccional | ~200K | Bundled con datáfono |
| **Factus / Factulizza** | $35K – $120K | ~15K | Foco facturación electrónica |

### 2.1 Posicionamiento recomendado para Zafiro

**Nicho óptimo**: restaurantes pequeños/medianos + retail boutique que quieren **marca propia** (white-label) y buena UX móvil — zona donde Alegra/Siigo son genéricos y Treinta es demasiado básico.

**Propuesta de valor**:
> "Tu negocio, tu marca, tu POS. Zafiro es el primer POS colombiano que se convierte en software de tu marca en menos de 5 minutos."

---

## 3. Pricing sugerido (planes SaaS)

| Plan | Target | Precio COP/mes | Incluye |
|------|--------|----------------|---------|
| **Starter** | Tienda única, 1 cajero | **$39.000** | 1 sucursal, 50 productos, reportes básicos |
| **Pro** | PYME establecida | **$99.000** | Multi-usuario, inventario avanzado, branding custom |
| **Business** | Cadena pequeña (2–5 suc.) | **$229.000** | Multi-sucursal, API, soporte prioritario |
| **Enterprise** | Franquicias / marca blanca | **$500K+ / a medida** | White-label completo, dedicated support |

- **Setup fee**: $0 (freemium trial 14 días) o $500K one-time para onboarding enterprise.
- **Comisión transaccional (opcional)**: 0.8%–1.5% sobre ventas procesadas con integración de pasarela.

---

## 4. Valoración del activo — 3 lentes

### Lente A — Costo de reemplazo (build cost)

Si un tercero quisiera construir lo que existe hoy desde cero:

- Backend multi-tenant + auth: 2 meses senior
- Frontend modular + PWA: 2 meses senior
- Diseño UI/UX + branding system: 1 mes
- QA + deploy infra: 1 mes

**6 meses × equipo de 2 personas × $8M–$12M COP/mes = $96M – $144M COP**

> **Valor de reemplazo: $100M – $150M COP**

### Lente B — Valor pre-revenue (venta / licenciamiento hoy)

Comparable a startups pre-seed en LATAM con MVP funcional pero sin tracción:

- Activos: código + arquitectura + marca "Zafiro"
- Descuento por riesgo de ejecución: -40% a -60%
- Múltiplo de costo: 1.5x – 3x build cost

> **Valor comercial pre-revenue: $200M – $450M COP** (~$50K – $110K USD)

### Lente C — Valor post-tracción (múltiplo ARR SaaS)

Proyecciones realistas asumiendo **facturación electrónica lista + inversión mínima en marketing**:

| Escenario | Año | Clientes | ARPU | MRR | ARR | Múltiplo | Valuación |
|-----------|-----|----------|------|-----|-----|----------|-----------|
| Conservador | Año 1 | 80 | $70K | $5.6M | $67M | 4x | **$270M COP** |
| Realista | Año 2 | 400 | $90K | $36M | $432M | 5x | **$2.2B COP** |
| Optimista | Año 3 | 1.200 | $120K | $144M | $1.73B | 6x | **$10.4B COP** |
| Agresivo | Año 5 | 5.000 | $150K | $750M | $9B | 8x | **$72B COP** (~$18M USD) |

**Supuestos**:
- Churn mensual: 6% (alto en PYMES Colombia)
- CAC: $200K – $400K COP por cliente
- LTV/CAC objetivo: > 3x

---

## 5. Benchmarks — empresas comparables

| Empresa | Etapa | Ronda levantada | Valoración estimada |
|---------|-------|-----------------|---------------------|
| **Treinta** (Colombia) | Serie A (2021) | $14M USD | ~$100M USD |
| **Alegra** (Colombia) | Profitable, no-VC | — | $150M – $300M USD (est.) |
| **Ualá Bis** (LATAM) | Serie D | $350M USD | $2.5B USD |
| **Clip** (México, POS hw+sw) | Serie D | $100M USD | $2B USD |

> **Referencia clave**: un SaaS POS con 1.000 clientes activos en LATAM se valúa típicamente entre **$2M – $8M USD**.

---

## 6. Veredicto final

### Valor hoy (abril 2026, estado actual del código)

| Escenario de venta | Rango COP | Rango USD |
|--------------------|-----------|-----------|
| **Licenciamiento a un partner/integrador** | $150M – $300M | $37K – $75K |
| **Venta del IP completo a competidor** | $200M – $500M | $50K – $125K |
| **Aporte a joint venture con tracción proyectada** | $400M – $800M | $100K – $200K |

### Potencial en 24–36 meses (con ejecución)

- **Inversión requerida para PMF**: $200M – $400M COP (facturación DIAN + integraciones + 2–3 personas equipo + marketing)
- **Valor proyectado post-PMF con 400 clientes**: **$1.5B – $3B COP**
- **ROI potencial para inversor seed**: 4x – 8x en 3 años

### Valor techo en 5 años con ejecución fuerte

**$20B – $70B COP** (~$5M – $18M USD)

---

## 7. Recomendaciones estratégicas

### 7.1 Roadmap de corto plazo (0–6 meses)

1. **Priorizar DIAN (facturación electrónica)**: sin certificación, el producto no se puede vender legalmente a >90% de comercios formales. Esto solo, duplica el valor del activo.
2. **Integrar impresora térmica ESC/POS**: requisito práctico no negociable.
3. **Pulir UX al nivel Treinta/Loyverse**: el primer contacto define la conversión del trial.
4. **Setup de analytics**: Mixpanel/PostHog para medir activación, retención y churn desde día 1.

### 7.2 Estrategia go-to-market

1. **Capitalizar el white-label**: monetizar como "POS propio" para cooperativas, gremios (FENALCO, ACOPI), cámaras de comercio regionales, o fintechs que quieren módulo POS (Davivienda, RappiPay, Nequi Empresas).
2. **Estrategia de canales**: contadores y distribuidores de insumos son los mejores vendedores (revenue share 20–30%).
3. **No competir en precio con Treinta** (free-to-use): competir en UX + white-label + soporte humano.
4. **Considerar modelo transaccional**: 0.8%–1.5% sobre ventas procesadas en lugar de / además de SaaS mensual — alinea incentivos con el éxito del comerciante.
5. **Programa de referidos**: 2 meses gratis por cada cliente referido que pague.

### 7.3 Métricas clave para tracking

- **Activación**: % de trials que completan primera venta en <7 días (objetivo: >60%)
- **Retención M1**: % que siguen usando a 30 días (objetivo: >70%)
- **NRR (Net Revenue Retention)**: objetivo >100% con upsells a Pro/Business
- **CAC payback**: <9 meses

---

## 8. TL;DR ejecutivo

| Métrica | Hoy | 24 meses | 5 años |
|---------|-----|----------|--------|
| **Valor del producto** | $200M – $500M COP | $1.5B – $3B COP | $20B – $70B COP |
| **Equivalente USD** | $50K – $125K | $375K – $750K | $5M – $18M |
| **Inversión requerida** | — | $200M – $400M | $2B – $5B (Serie A) |
| **Clientes proyectados** | 0 | 400 | 5.000 |

**Conclusión clave**: El código que construiste es un **activo real y vendible**, pero el 70% del valor está en la ejecución comercial y en cerrar los gaps regulatorios (DIAN), no en el software mismo. La ventana de oportunidad en Colombia sigue abierta 24–36 meses antes que el mercado se consolide.

---

*Documento de referencia — actualizar trimestralmente conforme avanza el producto y llegan datos reales de clientes.*
