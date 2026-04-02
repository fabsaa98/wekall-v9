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
