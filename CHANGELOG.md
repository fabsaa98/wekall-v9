# WeKall Intelligence V9 — CHANGELOG

> Repositorio del producto real (stack de producción).
> Para el historial completo de versiones V1–V8 (prototipo HTML), ver: https://github.com/fabsaa98/wekall-intelligence

---

## Identidad del Producto

**Nombre:** WeKall Intelligence  
**Chat IA:** Vicky Insights  
**Tagline:** Business Intelligence for CEOs & C-Suite  
**Stack:** React 18 + TypeScript + Vite + Tailwind + shadcn/ui + Recharts  
**Deploy:** GitHub Actions → GitHub Pages

---

## [V12.0.0] — 2026-04-02 — Arquitectura Function Calling

### Decisión arquitectural estratégica
**Causa raíz de errores de cálculo:** Vicky usaba el LLM como calculadora. Los LLMs razonan bien pero no son calculadoras confiables — pueden aplicar fórmulas incorrectamente.

**Solución:** Separar razonamiento (LLM) de cálculo (código determinístico) mediante OpenAI Function Calling.
- LLM: interpreta la pregunta, decide qué análisis hacer
- Código TypeScript: ejecuta el cálculo — siempre correcto, siempre reproducible
- LLM: presenta el resultado en lenguaje ejecutivo

### Funciones implementadas (src/lib/vickyCalculations.ts)
- `calcularImpactoAHT(ahtObjetivo)` → COP ahorro/mes + promesas adicionales
- `calcularImpactoContactRate(tasaObjetivo)` → promesas adicionales/mes
- `calcularImpactoAgentes(percentilObjetivo)` → impacto de mejorar el peor cuartil
- `getEstadoOperativo()` → KPIs actuales del CDR

### Cambio: V12.3 — CEO Language + Datos Perú + Web Search Tool

**CEO Language:**
- Eliminado lenguaje estadístico técnico para CEOs (P25/P50/P75 → "mejor cuartil del sector", "operaciones líderes en Latam")
- Introducción de siglas solo con explicación inmediata (AHT → "tiempo promedio por llamada (AHT)")

**Datos laborales Perú:**
- Colombia: COP $3,000,000/mes (confirmado, Decreto 2381/2023)
- Perú: ≈ COP $1,600,000/mes (estimado, RMV PEN 1,025 + prestaciones DS 004-2022-TR)
- Función getCostoAgente(país) en vickyCalculations.ts
- Vicky ya no dice "no tengo acceso" para datos laborales de Colombia/Perú

**Tool de búsqueda web (base):**
- Tool `buscarDatoOficial` agregado a Function Calling
- Versión inicial: indica la necesidad y usa datos de respaldo conocidos
- Roadmap: conectar con API de búsqueda real (Perplexity/Brave) para datos en tiempo real

**Roadmap documentado:**
- [ ] Gráficos y visualizaciones generados desde conversación (charts dinámicos)
- [ ] Carga automática CDR desde WeKall (sin subir archivo manual)
- [ ] Análisis de chats y mensajes Messenger Hub
- [ ] Búsqueda web real integrada al backend proxy (Perplexity API)
- [ ] Multi-cliente: config por tenant (CDR + industry + country auto-loaded)

---

### Datos reales del CDR integrados en el motor
- P25=76, P50=120, P75=143 llamadas/agente/día (81 agentes humanos)
- Promedio real: 110.7 (corregido — excluye marcador automático)
- Todos los cálculos validados contra límites de sanidad antes de mostrarse

---

## ICP (Ideal Customer Profile)

- **Quién:** CEO y equipo C-suite (VP Ventas, VP CX, COO, CFO)
- **Industria:** Cualquier industria — servicios, productos, tech, construcción, finanzas. NO es exclusivo de telecomunicaciones.
- **Tamaño:** Medianas y grandes empresas que usan WeKall como stack de conversaciones con sus clientes
- **Problema:** El CEO no puede autoatenderse — depende de reportes y líderes para tener datos de su operación

## Buyer Persona
- **Rol:** CEO / Gerente General
- **Dolor:** Tarda horas en obtener información; navega múltiples herramientas sin coherencia
- **Deseo:** Una sola pantalla para preguntarle a sus datos en lenguaje natural y recibir insight ejecutivo accionable
- **Modo de consumo:** Push (el sistema le habla proactivamente) + Pull (él pregunta cuando quiere)

## Objetivos estratégicos
1. CEO y C-suite se autoatienden con datos del negocio sin navegar reportes ni depender de líderes
2. Apalancador del ecosistema WeKall completo — hace indispensable a WeKall en el negocio del cliente

## Ecosistema WeKall (fuentes de datos)
- **Business Phone** — llamadas, CDRs, grabaciones
- **Engage360** — Contact Center de WeKall (NO es un CRM)
- **Messenger Hub** — WhatsApp, chat, mensajería omnicanal
- **Notes** — reuniones grabadas y transcritas
- **Integraciones** — ERP, CRM externo, SCM

---

## Benchmark de competidores implementados

| Feature | Inspirado en |
|---|---|
| Root cause analysis con drivers cuantificados | **Tellius Kaiya** |
| Chat conversacional + search bar | ThoughtSpot Spotter |
| Razonamiento visible + citación de fuentes | Zenlytic Zoë |
| Push proactivo al entrar + sparklines | Tableau Pulse |
| Narrative ejecutivo (Executive Brief) | McKinsey QuantumBlack / BCG Gamma |
| Decision Log | Propio (gap identificado vs. competencia) |
| Action Triggers | Propio (gap identificado) |

---

## [V9.0.0] — 2026-04-01 — Producto SaaS Real

### Decisiones de producto
- Salto definitivo de prototipo HTML (V1-V8) a stack de producción real
- Mantiene naming: WeKall Intelligence + Vicky Insights (decisión de Fabián)
- Producto declarado industria-agnóstico — no solo telco
- Engage360 = Contact Center (no CRM)
- Navegación simplificada: 5 páginas (no 9)

### Stack técnico
- React 18 + TypeScript (tipado estricto)
- Vite 5 (build en 1.57s, 0 errores)
- Tailwind CSS v3 + shadcn/ui (design system enterprise)
- Recharts (sparklines, area charts, bar charts)
- React Router v6
- GitHub Actions CI/CD (deploy automático al hacer push a main)

### Features implementados — Overview
- Executive Brief expandible por rol (CEO / VP Ventas / VP CX / COO)
- 4 KPIs principales con sparklines 7 días + badge vs. industria
- 6 KPIs secundarios en grid compacto
- Area Chart de conversaciones últimas semana
- 3 Proactive Insights del día (Tableau Pulse style)
- Botón "Sorpréndeme" → navega a Vicky con insight proactivo

### Features — Vicky Insights
- Chat conversacional con respuestas estructuradas (Diagnóstico → Causa → Implicación → Recomendación)
- Root Cause panel con barras de impacto horizontales (Tellius style)
- Razonamiento visible collapsible ("Analicé X registros...")
- Citación de fuentes (badges)
- Badge de confianza Alta/Media
- Follow-up chips clicables
- Action Dialog: CRM / Notificar / Decision Log / Reunión
- Session Memory panel lateral
- Decision Log (tab): insight → decisión → responsable → estado
- AutoML projection mock ("Si no se actúa en 48h...")
- Upload tab: drag & drop MP3/WAV/M4A, progreso animado, summary

### Features — Alertas
- 5 alertas mock con severidad (Critical/Warning/Info)
- Toggle on/off (shadcn Switch)
- Input lenguaje natural: "Avísame cuando..."
- Chips de ejemplos
- Tabs: Activas / Disparadas

### Features — Equipos
- Tabs: Ventas / CX / Cobranzas / Ops
- KPIs por área con benchmark vs industria
- Bar chart top 5 agentes
- Tabla completa con rankings

### Features — Configuración
- Fuentes WeKall con estado (conectado/pendiente)
- Engage360 descrito correctamente como Contact Center
- Integraciones externas
- Perfil y tema

### UX/Design
- Dark theme: `#0A0A0F` bg, `#111118` cards, `#6C37BE` primary
- Sidebar 280px desktop, off-canvas mobile con overlay y botón X
- Role Selector en header: adapta Overview al rol activo
- CSS animations: fade-slide-up en KPI cards al montar
- Mobile-first responsive (375px iPhone funcional)

## Metodología de Muestreo — Estándar COPC

Para garantizar que las transcripciones de grabaciones sean estadísticamente representativas:

### Muestra mínima válida
- Universo: ~16,000 llamadas/día (Crediminuto/CrediSmart)
- Nivel de confianza: 95%
- Margen de error: ±5%
- **Muestra mínima: 375 llamadas/día** (fórmula: n = Z²·p·q / e²)

### Método de selección (aleatorio sistemático)
1. Ordenar el CDR por hora del día
2. Calcular intervalo: N/n = 16,000/375 ≈ 43
3. Seleccionar una de las primeras 43 llamadas al azar (número inicial aleatorio k)
4. Luego tomar: k, k+43, k+86, k+129... hasta completar 375
5. Distribuir proporcionalmente entre campañas:
   - Cobranzas Colombia: 56.9% → ~213 llamadas
   - Cobranzas Perú: 22.0% → ~83 llamadas
   - Servicio Colombia: 20.2% → ~76 llamadas
   - Servicio Perú: 0.9% → ~3 llamadas

### Frecuencia recomendada
- Diaria: 375 llamadas (operación normal)
- Semanal acumulada: mínimo 375 por día × 5 días hábiles
- Por evento especial: muestra adicional si hay cambio de script, nuevo agente, o pico de volumen

### Estado actual
- 30-Mar-2026: 50 llamadas transcritas (muestra piloto — ampliar a 375 para siguiente ciclo)
- Las 50 transcripciones actuales se usan como representación del comportamiento cualitativo

---

## Metodología de Muestreo Estadístico — Estándar COPC

*Documentado: 1-Abr-2026 | Validado por Fabián Saavedra*

### Por qué importa
Transcribir el 100% de las llamadas diarias no es viable ni necesario. La estadística permite obtener resultados representativos con una muestra pequeña. COPC (Customer Operations Performance Center) es el estándar global de calidad en contact centers — define cómo medir para que los resultados sean confiables.

### Fórmula base

```
n = Z² × p × q / e²
```

Parámetros:
- **Z = 1.96** — nivel de confianza 95% (estándar COPC)
- **p = 0.5** — proporción esperada (usamos 0.5 cuando no hay referencia previa, maximiza la muestra)
- **q = 1 - p = 0.5**
- **e = 0.05** — margen de error ±5%

Resultado: **n = (1.96² × 0.5 × 0.5) / 0.05² = 384 llamadas** (muestra base para universo infinito)

### Corrección por universo finito

```
n_ajustada = n / (1 + (n-1) / N)
```

Donde N = total de llamadas del día.

Para Crediminuto/CrediSmart (N = 16,129):
```
n_ajustada = 384 / (1 + 383/16,129) = 384 / 1.0237 ≈ 375 llamadas/día
```

### Tabla de referencia por volumen diario

| Llamadas/día | Muestra mínima válida |
|---|---|
| 1,000 | ~278 |
| 3,000 | ~341 |
| 5,000 | ~357 |
| 10,000 | ~370 |
| 16,000 | ~375 |
| 50,000 | ~381 |
| +100,000 | ~384 |

**Conclusión práctica:** Con más de 5,000 llamadas/día, la muestra se estabiliza entre 370 y 384. No importa si tienes 16 mil o 100 mil llamadas — la muestra necesaria casi no cambia.

### Método de selección — Aleatorio sistemático

1. Ordenar el CDR por hora del día (de 00:00 a 23:59)
2. Calcular intervalo: **k = N / n** (ej: 16,129 / 375 ≈ 43)
3. Elegir un número inicial aleatorio entre 1 y 43 (ej: 17)
4. Seleccionar las llamadas: 17, 60, 103, 146... hasta completar 375
5. Distribuir proporcionalmente entre campañas activas:

| Campaña | % del volumen | Llamadas a muestrear |
|---|---|---|
| Cobranzas Colombia | 56.9% | ~213 |
| Cobranzas Perú | 22.0% | ~83 |
| Servicio Colombia | 20.2% | ~76 |
| Servicio Perú | 0.9% | ~3 |
| **Total** | **100%** | **375** |

### Frecuencia recomendada (COPC)

- **Operación normal:** 375 llamadas/día → Whisper transcribe en ~30-40 min en Mac Mini
- **Evento especial:** muestra adicional de 200 llamadas si hay cambio de script, nuevo agente, pico de volumen, o queja masiva de clientes
- **Mínimo semanal:** 375 × 5 días hábiles = 1,875 llamadas/semana para análisis de tendencias

### Estado actual (piloto)

- **30-Mar-2026:** 50 llamadas transcritas (13.3% de la muestra óptima)
  - Resultado: válido para análisis cualitativo (objeciones, motivos, sentimiento)
  - No válido para inferencias estadísticas con ±5% de error
  - **Próximo paso:** ampliar a 375 cuando llegue el CDR del mes completo

### Impacto en Vicky Insights

Cuando se tenga la muestra diaria completa (375 llamadas), Vicky podrá responder con:
- Porcentajes de objeciones con ±5% de error estadístico
- Comparativas día-a-día con significancia estadística
- Alertas basadas en cambios reales vs. variación aleatoria

## [V11.0.0] — 2026-04-02 — Intelligence Layer: Benchmarks, EBITDA & Multi-Industria

### Decisiones estratégicas del día
- **Vicky = producto de clase mundial**: arquitectura de BI ejecutivo comparable a Tellius Kaiya / Zenlytic Zoë
- **Motor de benchmarks multi-industria**: Vicky ya no solo muestra datos — los posiciona contra estándares globales
- **Motor EBITDA**: brecha operativa → impacto financiero en COP (nivel McKinsey/BCG/Deloitte)
- **Integridad de datos**: regla explícita — Vicky nunca inventa datos que no están en el CDR
- **Arquitectura genérica**: todo lo construido aplica a CUALQUIER cliente e industria, no solo CrediSmart
- **Cloudflare Worker proxy**: API key de OpenAI nunca en el código — arquitectura enterprise

### Cambio 1: Regla de integridad de datos (feat: fix Vicky no inventa)
- Vicky tiene instrucción explícita de NO fabricar insights sin datos
- Si faltan datos (ej: horarios, históricos), responde: "No tengo esa dimensión. Necesitaría [dato]."
- Proyección hardcodeada de "+30% variando horario" eliminada — era especulación sin respaldo

### Cambio 2: Benchmarks de industria — COPC, SQM, E&Y, MetricNet
Archivo creado: `src/data/benchmarks.ts`
- Librería inicial con 2 tipos de operación (cobranzas, servicio)
- P25/P50/P75 por Colombia / Latam / USA / Global
- Fuentes institucionales: COPC Inc., SQM Group, E&Y Collections, CCContact Colombia

### Cambio 3: Benchmarks expandidos — 8 industrias completas (V11)
Archivo `src/data/benchmarks.ts` expandido a 8 tipos de operación:
1. Contact Center Cobranzas → fuentes: COPC, SQM, E&Y, ACDECC Colombia
2. Contact Center Servicio al Cliente → COPC, SQM, CFI Group, MetricNet
3. Contact Center Ventas Outbound → COPC, SQM, Contact Babel
4. Soporte Técnico / Help Desk → HDI, MetricNet, ITIL
5. Banca / Seguros / Fintech → McKinsey FS, J.D. Power, Bain, FELABAN
6. Salud → HIMSS, J.D. Power Healthcare, Accenture
7. Retail / E-Commerce → NRF, Baymard Institute, ACSI, Bain
8. Telecomunicaciones → TM Forum (TMF), GSMA, McKinsey Telco
- Detección automática de operación por regex (detectOperationType)
- Detección automática de país/región (detectRegion)

### Cambio 4: Motor EBITDA — impacto financiero en COP
- Parámetros financieros reales embebidos en el contexto de Vicky:
  - Costo empresa/agente Colombia: COP $3,000,000/mes = COP $284/min
  - Nómina activa: COP $243,000,000/mes (81 agentes)
- Fórmulas de impacto en 3 escenarios:
  - A: Reducción de costo (liberación de headcount)
  - B: Crecimiento con mismo headcount (más transacciones)
  - C: EBITDA combinado A+B
- Dato pendiente para cerrar cálculo de ingresos: ticket promedio de cartera (lo pide Vicky al CEO)

### Cambio 5: Cloudflare Worker Proxy (arquitectura enterprise)
- Worker deployado: wekall-vicky-proxy.fabsaa98.workers.dev
- OpenAI API key nunca en el código — vive como secreto en Cloudflare
- Frontend usa VITE_PROXY_URL → Cloudflare Worker → OpenAI
- Fallback: motor de respuestas local si proxy no disponible

### Investigación de referencia
- McKinsey: Peer Group + percentil relativo; Customer Care 360; Platinum Standard (500+ best practices)
- BCG: "Smart Simplicity" — action titles; gráfico de cuadrantes cliente vs. peers
- Bain: Balanced Scorecard multidimensional; score ponderado por dimensión
- Deloitte/KPMG: Gap Analysis cuantificado; brecha → impacto económico directo

### Datos operativos reales — Crediminuto/CrediSmart (caso piloto)
- CDR 30-Mar-2026: 16,129 llamadas | 81 agentes | 4 campañas
- AHT: 8.1 min | Contacto efectivo: 43.1% | Promesa de pago: 40%
- 50 grabaciones transcritas con Whisper (análisis NLP real)
- Top agente: Teresa Meza (261 llamadas vs. promedio 137)

### Cambio 6: Reestructuración del motor de IA (V11.1)
- Modelo actualizado: gpt-4o-mini → **gpt-4o** (mayor capacidad de razonamiento ejecutivo)
- Fallback por keywords eliminado — ya no intercepta preguntas antes de GPT
- Fallback nuevo: solo activa si el proxy falla completamente (mensaje honesto, sin datos inventados)
- System prompt mejorado con protocolo explícito de 4 pasos para responder preguntas
- Vicky ahora entiende la pregunta real antes de buscar datos

### Cambio 7: Motor de validación de cálculos (V11.2)
- Problema detectado: Vicky calculaba AHT × 16,129 llamadas totales en lugar de 6,951 contactos efectivos → error 2.3x
- Solución: Límites de sanidad explícitos para cada métrica financiera
- Protocolo obligatorio: Vicky muestra fórmula + variables + operación + resultado + validación (formato 📐)
- Límites implementados: ahorro máx COP $243M, agentes máx 81, llamadas máx 16,129, promesas máx 2,780/día
- Cualquier resultado que exceda el 50% del máximo lógico genera advertencia automática

### Pendientes próxima versión
- Parámetros de costo configurables por cliente (Perú ≠ Colombia ≠ México)
- Ticket promedio de cartera de Crediminuto (pendiente que Fabián suministre)
- CDR del mes completo (pendiente equipo de operaciones Crediminuto)
- Ampliar muestra de transcripciones a 375 (estándar COPC)

---

## [V10.0.0] — 2026-04-02 — Enterprise Architecture

### Decisiones de producto
- **Proxy backend**: OpenAI API key expuso en GitHub (revocado). Arquitectura enterprise: Cloudflare Worker como backend-for-frontend. Key nunca en el frontend.
- **BSC metrics**: Métricas del CEO cambiadas de contact center genérico a Balanced Scorecard real para empresa de cobranzas
- **Transcripciones como contexto**: 50 grabaciones reales de Crediminuto embebidas en el contexto de Vicky Insights
- **UX fix**: Proyección AutoML con contraste correcto

### Cambio 1: Cloudflare Worker Proxy
- Repositorio del worker: `/Users/celeru/.openclaw/workspace/wekall-proxy/`
- Arquitectura: Frontend → Cloudflare Worker → OpenAI API
- El API key vive como secreto en Cloudflare, nunca en el código
- **Para activar**: Deployar el worker en Cloudflare y configurar `VITE_PROXY_URL` en GitHub Secrets
- Frontend actualizado para usar `VITE_PROXY_URL` si está disponible

### Cambio 2: Fix UX — Proyección AutoML
- Anterior: texto ámbar sobre fondo ámbar (invisible)
- Nuevo: texto oscuro (`text-slate-700`) sobre fondo `bg-slate-50` con borde `border-amber-200`
- WCAG AA compliant

### Cambio 3: BSC CEO Metrics — Crediminuto/CrediSmart
Métricas reemplazadas con 4 perspectivas del Balanced Scorecard:
- **Financiera**: Tasa de Recuperación (40%) · Tasa de Contacto Efectivo (43.1%)
- **Cliente**: Promesa de Pago (40%) · Sin Capacidad de Pago (38%)
- **Procesos**: AHT Real (8.1 min) · Llamadas/Día (16,129)
- **Aprendizaje**: Agentes Activos (81/162) · Top Agente (Teresa Meza, 261 llamadas)
Todas basadas en datos reales del CDR 30-Mar-2026 + análisis de 50 grabaciones

### Cambio 4: Vicky Insights — Contexto enriquecido con transcripciones reales
Vicky ahora conoce:
- Frases exactas que dicen los deudores (de grabaciones reales)
- Objeciones más frecuentes por porcentaje
- Nombres reales de agentes top con datos de productividad
- Análisis de resultados de contacto (40% promesa de pago, etc.)
- Insight clave: el problema es la tasa de contacto (43%), no la conversación
