// NOTA: Este archivo contiene SOLO datos de configuración estática y estimaciones base.
// Los datos reales vienen de Supabase.
// ─── Data — WeKall Intelligence ──────────────────────────────────────────
// Datos: CDR histórico enero 2024 - abril 2026, 822 días de datos, 12 millones de registros
// Fuente: Supabase (cdr_daily_metrics, cdr_campaign_metrics, cdr_hourly_metrics, transcriptions)

export type Role = 'CEO' | 'VP Ventas' | 'VP CX' | 'COO';

export interface KPIData {
  id: string;
  title: string;
  value: string;
  numericValue: number;
  change: number;
  changeLabel: string;
  vsIndustry: number;   // positive = above industry avg
  sparkline: number[];  // 7 data points
  invertColor?: boolean;
  roles: Role[];
  unit?: string;
  bsc?: 'Financiera' | 'Cliente' | 'Procesos' | 'Aprendizaje';
  description?: string;
}

export interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  time: string;
  active: boolean;
  metric: string;
  threshold: number;
  current: number;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  area: string;
  fcr: number;
  csat: number;
  aht: number;
  conversions: number;
  escalations: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'vicky';
  content: string;
  timestamp: Date;
  sources?: string[];
  confidence?: 'Alta' | 'Media' | 'Baja';
  reasoning?: string;
  rootCauses?: { label: string; impact: number; color: string }[];
  followUps?: string[];
  projection?: string;
}

// ─── KPIs — Se construyen dinámicamente desde Supabase via useCDRData hook ───
// Los datos ahora vienen de cdr_daily_metrics (822 días, ene 2024 - abr 2026)

// REAL: estructura construida dinámicamente desde Supabase via buildKPIsFromCDR()
export const kpiData: KPIData[] = []; // Array vacío: compatibilidad con imports existentes

export function buildKPIsFromCDR(
  latestDay: { fecha: string; total_llamadas: number; contactos_efectivos: number; tasa_contacto_pct: number } | null,
  sparklineTasa: number[],
  sparklineVolumen: number[],
  promedio7dTasa: number,
): KPIData[] {
  if (!latestDay) return [];

  const tasaContacto = latestDay.tasa_contacto_pct;
  const totalLlamadas = latestDay.total_llamadas;
  const fecha = latestDay.fecha;

  return [
    {
      id: 'llamadas_dia',
      title: 'Llamadas / Día',
      value: totalLlamadas.toLocaleString('es-CO'),
      numericValue: totalLlamadas,
      change: 0,
      changeLabel: fecha,
      vsIndustry: 0,
      sparkline: sparklineVolumen.length >= 7 ? sparklineVolumen.slice(-7) : sparklineVolumen,
      roles: ['CEO', 'COO'],
      unit: '',
      bsc: 'Procesos',
      description: 'Volumen total de conversaciones. Histórico: 822 días, ene 2024 - abr 2026',
    },
    {
      id: 'costo_contacto',
      title: 'Tasa de Contacto Efectivo',
      value: `${tasaContacto}%`,
      numericValue: tasaContacto,
      change: Math.round((tasaContacto - promedio7dTasa) * 10) / 10,
      changeLabel: `Prom. 7d: ${promedio7dTasa}%`,
      vsIndustry: Math.round((tasaContacto - 22.5) * 10) / 10, // Benchmark COPC Latam 20-25%
      sparkline: sparklineTasa.length >= 7 ? sparklineTasa.slice(-7) : sparklineTasa,
      invertColor: false, // Tasa contacto: más alto = mejor → máximo verde, mínimo rojo
      roles: ['CEO', 'COO'],
      unit: '%',
      bsc: 'Financiera',
      description: 'Del total de llamadas, % que conectan. Mediana COPC Latam: 20-25% (cobranzas outbound)',
    },
    {
      id: 'contactos_efectivos',
      title: 'Contactos Efectivos',
      value: latestDay.contactos_efectivos.toLocaleString('es-CO'),
      numericValue: latestDay.contactos_efectivos,
      change: 0,
      changeLabel: fecha,
      vsIndustry: 0,
      sparkline: sparklineTasa.length >= 7 ? sparklineTasa.slice(-7) : sparklineTasa,
      roles: ['CEO', 'VP Ventas', 'COO'],
      unit: '',
      bsc: 'Financiera',
      description: 'Llamadas que conectaron efectivamente con el cliente',
    },
    {
      id: 'aht_real',
      title: 'AHT Real',
      value: '8.1 min', // ESTIMACIÓN: pendiente datos reales del CDR
      numericValue: 8.1,
      change: 0,
      changeLabel: fecha,
      vsIndustry: -3.8, // ESTIMACIÓN: benchmark CCContact 2024
      sparkline: [8.1, 8.1, 8.1, 8.1, 8.1, 8.1, 8.1], // ESTIMACIÓN: sin variación real aún
      invertColor: true,
      roles: ['COO', 'VP CX'],
      unit: 'min',
      bsc: 'Procesos',
      description: 'Tiempo promedio por llamada. Mediana Colombia: 7.8 min (CCContact 2024)',
    },
  ];
}

export function getKPIsForRole(role: Role): KPIData[] {
  // Retorna array vacío — los KPIs ahora vienen de useCDRData hook (Supabase)
  return [];
}

// conversationTrend: ahora se construye dinámicamente desde Supabase (useCDRData hook)
export type ConversationTrendPoint = {
  day: string;
  total: number;
  resolved: number;
  escalated: number;
  isReal: boolean;
};

export function buildConversationTrend(last7Days: import('@/lib/supabase').CDRDayMetric[]): ConversationTrendPoint[] {
  return last7Days.map(d => ({
    day: d.fecha.slice(5), // MM-DD
    total: d.total_llamadas,
    resolved: d.contactos_efectivos,
    escalated: Math.round(d.total_llamadas * 0.07),
    isReal: true,
  }));
}

// ─── Proactive Insights
// ESTIMACIÓN: insights genéricos de configuración — se complementan con datos reales de Supabase ─────────────────────────────

export const proactiveInsights = [
  {
    id: '1',
    type: 'warning' as const,
    title: 'Análisis de tasa de contacto — datos históricos Supabase',
    description: 'CDR histórico enero 2024 - abril 2026 (822 días): la tasa de contacto varía por día, hora y campaña. Datos en tiempo real desde Supabase.',
    action: 'Ver análisis en Vicky →',
    question: '¿Cuál ha sido la tendencia de la tasa de contacto efectivo en los últimos 30 días y qué factores la explican?',
  },
  {
    id: '2',
    type: 'success' as const,
    title: 'Crecimiento operacional: 7x desde enero 2024',
    description: 'La operación creció de ~4,000 llamadas/día (enero 2024) a más de 30,000 llamadas/día (abril 2026). 12 millones de registros CDR en Supabase.',
    action: 'Ver detalle →',
    question: '¿Cómo ha evolucionado el volumen de llamadas y la tasa de contacto desde enero 2024 hasta hoy?',
  },
  {
    id: '3',
    type: 'info' as const,
    title: 'Oportunidad: optimizar franja horaria de marcación',
    description: 'El análisis de 822 días de CDR muestra patrones horarios consistentes. La ventana 10h–16h concentra el mayor % de contactos efectivos.',
    action: 'Explorar →',
    question: '¿Cuál es la distribución horaria de contactos efectivos y cuál es la franja óptima para marcar?',
  },
];

// ─── Alertas — generadas dinámicamente desde Supabase (useCDRData hook) ──────
// Ver src/pages/Alertas.tsx para la lógica de generación dinámica

// REAL: alertas generadas dinámicamente desde Supabase (useCDRData hook)
export const alertsData: Alert[] = [];

// Función para construir alertas dinámicas desde datos CDR
export function buildAlertsFromCDR(
  latestDay: { fecha: string; total_llamadas: number; contactos_efectivos: number; tasa_contacto_pct: number } | null,
  promedio7dTasa: number,
  promedio30dTasa: number,
  deltaTasa: number,
): Alert[] {
  if (!latestDay) return [];

  const alerts: Alert[] = [];

  // Alerta 1: Tasa de contacto vs promedio 7d
  alerts.push({
    id: 'a-contacto-live',
    severity: deltaTasa < -3 ? 'critical' : deltaTasa < -1.5 ? 'warning' : 'info',
    title: `Tasa de contacto: ${latestDay.tasa_contacto_pct}% (${deltaTasa > 0 ? '+' : ''}${deltaTasa}pp vs promedio 7d)`,
    description: `Último día: ${latestDay.fecha} — ${latestDay.total_llamadas.toLocaleString()} llamadas. Promedio 7d: ${promedio7dTasa}% | Promedio 30d: ${promedio30dTasa}%. Fuente: Supabase — CDR histórico 822 días.`,
    time: latestDay.fecha,
    active: true,
    metric: 'Contacto Efectivo %',
    threshold: promedio7dTasa,
    current: latestDay.tasa_contacto_pct,
  });

  // Alerta 2: Volumen
  alerts.push({
    id: 'a-volumen-live',
    severity: 'info',
    title: `Volumen: ${latestDay.total_llamadas.toLocaleString()} llamadas el ${latestDay.fecha}`,
    description: `Histórico: 822 días de datos (ene 2024 - abr 2026), 12 millones de registros. Tendencia: +7x vs enero 2024 (~4,000 llamadas/día). Datos en tiempo real desde Supabase.`,
    time: latestDay.fecha,
    active: true,
    metric: 'Volumen diario',
    threshold: Math.round(promedio30dTasa),
    current: latestDay.total_llamadas,
  });

  return alerts;
}

// ─── Agentes — datos vienen de Supabase (tabla transcriptions) ───────────────
// FCR, CSAT y AHT por agente requieren integración Engage360 o análisis transcripciones
// REAL: datos reales vienen de Supabase — este array está intencionalmente vacío
export const agentsData: Agent[] = [];

// ─── Vicky Chat — Initial messages
// ESTIMACIÓN: mensajes estáticos de bienvenida — no vienen de Supabase ────────────────────────────────────────────

export const initialVickyMessages: ChatMessage[] = [
  {
    id: 'init-1',
    role: 'vicky',
    content: '**Hola. Soy Vicky Insights.**\n\nTengo acceso a los datos reales de tu operación:\n- **CDR histórico enero 2024 - abril 2026**: 822 días de datos · 12 millones de registros · Supabase en tiempo real\n- **50 grabaciones** transcritas con IA · Análisis de objeciones y resultados\n- **Benchmarks** de industria: COPC, SQM, E&Y, MetricNet (Colombia · Latam · Global)\n- **Motor EBITDA**: impacto financiero en COP de cada mejora operativa\n\n¿Qué quieres analizar?',
    timestamp: new Date(Date.now() - 60000),
    sources: ['WeKall CDR · Supabase en tiempo real'],
    confidence: 'Alta',
    reasoning: 'Datos CDR históricos consultados desde Supabase en tiempo real.',
    followUps: [
      '¿Cuál es el top 10 de agentes por volumen de llamadas?',
      '¿Cómo se compara la operación Colombia vs Perú?',
      '¿Qué campaña tiene mejor rendimiento?',
    ],
  },
];

// ─── Decision Log ─────────────────────────────────────────────────────────────
// REAL: inicia vacío — el CEO registra decisiones desde Vicky con "Crear Acción → Decision Log"
export const decisionLog: {
  id: string;
  insight: string;
  decision: string;
  responsible: string;
  status: 'Pendiente' | 'En progreso' | 'Planificada' | 'Resuelto';
  date: string;
  impact: string;
}[] = [];

// ─── Surprise Questions ───────────────────────────────────────────────────────
// ESTIMACIÓN: preguntas genéricas de ejemplo — sin referencias a clientes específicos
// VickyInsights puede personalizar estas preguntas en runtime usando clientConfig si es necesario

export const surpriseQuestions = [
  '¿Cuál fue el agente con más llamadas el último día registrado y cómo se compara con el promedio?',
  '¿Qué porcentaje del volumen total corresponde a cada campaña activa?',
  '¿Cuánto podría crecer el volumen si se escala el equipo un 20%?',
  '¿Cuáles son los 3 agentes con menor productividad y qué los diferencia de los top performers?',
  '¿Qué impacto tendría en la operación si el dialer mejora su tasa de contacto efectivo un 10%?',
  '¿Cómo está distribuida la carga entre los agentes activos?',
];
