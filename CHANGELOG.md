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
