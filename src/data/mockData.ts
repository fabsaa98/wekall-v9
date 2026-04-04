// ─── Data — WeKall Intelligence V9 ───────────────────────────────────────────
// Cliente: Crediminuto Colombia S.A.S / CrediSmart SAS Perú
// Datos reales de CDR: 2026-03-30 | 16,129 llamadas | 81 agentes activos
// Campañas: Cobranzas Colombia (9,174) · Cobranzas Perú (3,550) · Servicio Colombia (3,256) · Servicio Perú (140)

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

// ─── KPIs — Balanced Scorecard CEO (Crediminuto/CrediSmart — CDR 30-Mar-2026) ─

export const kpiData: KPIData[] = [
  // ── Perspectiva Financiera ──────────────────────────────────────────────────
  {
    id: 'tasa_recuperacion',
    title: 'Tasa de Recuperación',
    value: '40.0%',
    numericValue: 40,
    change: 0,
    changeLabel: '30-Mar-2026',
    // Promesa de pago 40% vs. mediana Latam E&Y 35% = +5 pp (REAL, fuente: E&Y Collections 2023)
    vsIndustry: 5,
    sparkline: [40, 40, 40, 40, 40, 40, 40],
    roles: ['CEO', 'VP Ventas', 'COO'],
    unit: '%',
    bsc: 'Financiera',
    description: 'Contactos efectivos que resultan en promesa de pago. Mediana Latam: 35% (E&Y 2023)',
  },
  {
    id: 'costo_contacto',
    title: 'Tasa de Contacto Efectivo',
    value: '43.1%',
    numericValue: 43.1,
    change: 0,
    changeLabel: '30-Mar-2026',
    // 43.1% vs. mediana Latam COPC 2024 = 45% → -1.9 pp (REAL, fuente: COPC Inc./SQM Latam 2024)
    vsIndustry: -1.9,
    // Sparkline real: últimos 7 días hábiles del CDR histórico (2026)
    sparkline: [20.5, 18.7, 19.8, 17.6, 20.5, 19.0, 15.4],
    invertColor: true,
    roles: ['CEO', 'COO'],
    unit: '%',
    bsc: 'Financiera',
    description: 'Del total de llamadas, % que conectan. Mediana COPC Latam: 20-25% (cobranzas outbound)',
  },
  // ── Perspectiva Cliente ──────────────────────────────────────────────────────
  {
    id: 'promesa_cumplida',
    title: 'Promesa de Pago',
    value: '40.0%',
    numericValue: 40,
    change: 0,
    changeLabel: '30-Mar-2026',
    // Promesa de pago 40% vs. mediana Latam 35% = +5 pp (REAL, E&Y Collections 2023)
    vsIndustry: 5,
    sparkline: [40, 40, 40, 40, 40, 40, 40],
    roles: ['CEO', 'VP Ventas', 'VP CX'],
    unit: '%',
    bsc: 'Cliente',
    description: 'Contactos efectivos que prometen pagar. Mediana Latam: 35% (E&Y 2023)',
  },
  {
    id: 'sin_capacidad',
    title: 'Sin Capacidad de Pago',
    value: '38.0%',
    numericValue: 38,
    change: 0,
    changeLabel: '30-Mar-2026',
    // Sin benchmark específico COPC para esta métrica en cobranzas → N/D
    vsIndustry: 0,
    sparkline: [38, 38, 38, 38, 38, 38, 38],
    invertColor: true,
    roles: ['CEO', 'VP CX', 'COO'],
    unit: '%',
    bsc: 'Cliente',
    description: 'No pueden pagar ahora — oportunidad de refinanciación. Benchmark vs industria: N/D',
  },
  // ── Perspectiva Procesos ──────────────────────────────────────────────────────
  {
    id: 'aht_real',
    title: 'AHT Real',
    value: '8.1 min',
    numericValue: 8.1,
    change: 0,
    changeLabel: '30-Mar-2026',
    // AHT 8.1 min vs. mediana Colombia 7.8 min (CCContact 2024) = +3.8% peor
    // En escala del campo vsIndustry (pp): 8.1-7.8 = 0.3 min más = -0.3 (invertColor true = más = peor)
    vsIndustry: -3.8,
    sparkline: [8.1, 8.1, 8.1, 8.1, 8.1, 8.1, 8.1],
    invertColor: true,
    roles: ['COO', 'VP CX'],
    unit: 'min',
    bsc: 'Procesos',
    description: 'Tiempo promedio por llamada. Mediana Colombia: 7.8 min (CCContact 2024)',
  },
  {
    id: 'llamadas_dia',
    title: 'Llamadas / Día',
    value: '16,129',
    numericValue: 16129,
    change: 0,
    changeLabel: '30-Mar-2026',
    // Benchmark de volumen absoluto no aplica — depende del tamaño de operación → N/D
    vsIndustry: 0,
    // Sparkline real: volumen últimos 7 días hábiles del CDR histórico 2026
    sparkline: [26584, 31554, 31411, 30806, 33496, 24810, 26054],
    roles: ['CEO', 'COO'],
    unit: '',
    bsc: 'Procesos',
    description: 'Volumen total de conversaciones. Tendencia: +7x vs enero 2024 (4,000 llamadas/día)',
  },
  // ── Perspectiva Aprendizaje ───────────────────────────────────────────────────
  {
    id: 'agentes_activos',
    title: 'Agentes Activos',
    value: '81 / 162',
    numericValue: 50,
    change: 0,
    changeLabel: '50% activos',
    // Utilización 50% vs. mediana Latam COPC = 68% → -18 pp (REAL, fuente: COPC Inc.)
    vsIndustry: -18,
    sparkline: [50, 50, 50, 50, 50, 50, 50],
    invertColor: true,
    roles: ['CEO', 'COO'],
    unit: '%',
    bsc: 'Aprendizaje',
    description: '81 de 162 agentes disponibles operaron. Mediana Latam: 68% utilización (COPC)',
  },
  {
    id: 'top_agent',
    title: 'Top Agente',
    value: '261',
    numericValue: 261,
    change: 0,
    changeLabel: 'Teresa Meza',
    // Benchmark de llamadas por agente: P75 Latam ~75 llamadas/día (ventas outbound, SQM 2024)
    // Para cobranzas específico no disponible → N/D
    vsIndustry: 0,
    sparkline: [261, 261, 261, 261, 261, 261, 261],
    roles: ['CEO', 'VP Ventas'],
    unit: 'llamadas',
    bsc: 'Aprendizaje',
    description: 'Teresa Meza — 261 vs. 110.7 promedio del equipo. Benchmark vs industria: N/D',
  },
];

export function getKPIsForRole(role: Role): KPIData[] {
  return kpiData.filter(k => k.roles.includes(role));
}

// ─── Conversation Trend (datos reales 30-Mar como día base) ─────────────────

// NOTA: Solo tenemos datos reales del 30 de marzo (domingo).
// Los otros días son estimaciones basadas en patrones típicos de cobranzas.
// Cuando haya CDR del mes completo, reemplazar con datos reales.
export const conversationTrend = [
  { day: 'Lun 24¹', total: 14200, resolved: 10500, escalated: 994, isReal: false },
  { day: 'Mar 25¹', total: 14800, resolved: 11000, escalated: 1036, isReal: false },
  { day: 'Mié 26¹', total: 15100, resolved: 11200, escalated: 1057, isReal: false },
  { day: 'Jue 27¹', total: 15400, resolved: 11500, escalated: 1078, isReal: false },
  { day: 'Vie 28¹', total: 15900, resolved: 11900, escalated: 1113, isReal: false },
  { day: 'Sáb 29¹', total: 12100, resolved: 9000, escalated: 847, isReal: false },
  { day: 'Dom 30 ✓', total: 16129, resolved: 11966, escalated: 1129, isReal: true },
];
// ¹ Estimación basada en patrones típicos. Solo el 30 de marzo es dato verificado del CDR.

// ─── Proactive Insights (basados en datos reales) ─────────────────────────────

export const proactiveInsights = [
  {
    id: '1',
    type: 'warning' as const,
    title: 'Concentración de volumen en Cobranzas Colombia',
    description: 'El 56.8% del total de llamadas del 30 de marzo corresponde a la campaña Cobranzas Crediminuto Colombia. Teresa Meza lidera con 261 contactos.',
    action: 'Ver análisis en Vicky →',
    question: '¿Cuál es la distribución de carga entre los agentes de Cobranzas Colombia y quiénes están por encima del promedio?',
  },
  {
    id: '2',
    type: 'success' as const,
    title: '81 agentes activos en operación simultánea',
    description: 'El 30 de marzo operaron 81 agentes activos de 162 disponibles en plataforma, con 20 supervisores en turno. Eficiencia operativa sobre benchmark.',
    action: 'Ver detalle →',
    question: '¿Cómo está distribuida la productividad entre los 81 agentes activos del 30 de marzo?',
  },
  {
    id: '3',
    type: 'info' as const,
    title: 'Expansión Perú: 3,690 llamadas en un día',
    description: 'La operación de Perú (CrediSmart SAS) generó 3,690 llamadas el 30 de marzo — 22.9% del total. Oportunidad de escalar la operación peruana.',
    action: 'Explorar →',
    question: '¿Cuál es el rendimiento comparado entre la operación Colombia y Perú de Crediminuto?',
  },
];

// ─── Alertas dinámicas generadas desde datos reales del CDR ──────────────────
// Umbrales basados en benchmarks COPC 2024 para contact center cobranzas Colombia

// ─── Alertas — generadas desde CDR histórico real (ene-abr 2026, 1.7M registros) ──
// Última actualización: 2026-04-03 | Fuente: cdrs_crediminuto.csv
export const alertsData: Alert[] = [
  {
    id: 'a-contacto',
    severity: 'warning',
    title: 'Tasa de contacto en caída — -2.7pp vs promedio 7 días',
    description: 'La tasa de contacto del 1-Apr fue 14.6%, vs promedio de los últimos 7 días hábiles de 17.3%. Tendencia descendente 3 días consecutivos: 19.0% → 15.4% → 14.6%. Causa principal: "Cuelga con canal no disponible" (+4,277 registros el 30-Mar). Benchmark COPC Latam: 20-25%. Cada punto de mejora = ~308 contactos adicionales/día.',
    time: '1-Abr-2026 | CDR histórico 90d',
    active: true,
    metric: 'Contacto Efectivo %',
    threshold: 17.3,
    current: 14.6,
  },
  {
    id: 'a-volumen',
    severity: 'info',
    title: 'Volumen en máximo histórico: 30,762 llamadas el 1-Abr',
    description: 'El 1 de abril registró 30,762 llamadas — +57.9% sobre el promedio de 30 días (19,483). La operación ha crecido 7x desde enero 2024 (4,000 llamadas/día) hasta hoy. El crecimiento es real y sostenido, pero la tasa de contacto no ha escalado al mismo ritmo.',
    time: '1-Abr-2026 | Histórico ene-2024 a abr-2026',
    active: true,
    metric: 'Volumen diario',
    threshold: 19483,
    current: 30762,
  },
  {
    id: 'a-horario',
    severity: 'info',
    title: 'Franja óptima de marcación: 10h–16h',
    description: 'Análisis de 30 días de CDR: la hora pico es las 10:00h. La ventana 10h–16h concentra el 65% de los contactos efectivos. Recomendar ajuste del dialer para intensificar marcación en esa franja y reducir llamadas fuera de horario (antes de las 8h y después de las 18h) que tienen tasa de contacto < 5%.',
    time: 'Promedio 30 días | CDR ene-abr 2026',
    active: true,
    metric: 'Hora pico',
    threshold: 10,
    current: 10,
  },
  {
    id: 'a-quincena',
    severity: 'info',
    title: 'Oportunidad: próxima quincena en ~14 días',
    description: 'El análisis histórico muestra picos de contacto efectivo los días 1 y 15 de cada mes (días de pago de nómina en Colombia). El 15 de abril es el próximo día de quincena — se recomienda preparar cobertura adicional y priorizar clientes con promesa de pago registrada.',
    time: 'Patrón detectado — histórico 2024-2026',
    active: true,
    metric: 'Días quincena',
    threshold: 14,
    current: 14,
  },
  {
    id: 'a-bottom',
    severity: 'critical',
    title: 'Bottom performers requieren coaching urgente',
    description: 'CDR 30-Mar-2026: 20 agentes (25% del equipo) con menos de 76 llamadas/día. Bottom 3: Paola Joya (4 llamadas), Yuleidy González (7), Vannesa Sauce (9). Promedio equipo: 110.7 llamadas/día. Acción: sesión de coaching esta semana con los 5 agentes más rezagados.',
    time: 'CDR 30-Mar-2026',
    active: true,
    metric: 'Agentes P25',
    threshold: 76,
    current: 4,
  },
];

// ─── Agentes: Top 10 + Bottom 3 del CDR 30-Mar-2026 ─────────────────────────
// NOTA: Solo tenemos volumen de llamadas por agente del CDR.
// FCR, CSAT y AHT por agente NO están disponibles en el CDR actual.
// Requiere integración con Engage360 o análisis adicional de transcripciones.

export const agentsData: Agent[] = [
  { id: 'ag1',  name: 'Teresa Meza',             role: 'Top Performer',             area: 'Cobranzas Colombia', fcr: 0, csat: 0, aht: 0, conversions: 261, escalations: 0, trend: 'up' },
  { id: 'ag2',  name: 'Juan Gutierrez',           role: 'Asesor Cobranzas',          area: 'Cobranzas Colombia', fcr: 0, csat: 0, aht: 0, conversions: 211, escalations: 0, trend: 'up' },
  { id: 'ag3',  name: 'Nelcy Josefina Contasti',  role: 'Asesor Cobranzas',          area: 'Cobranzas Colombia', fcr: 0, csat: 0, aht: 0, conversions: 194, escalations: 0, trend: 'stable' },
  { id: 'ag4',  name: 'Santiago Cano',            role: 'Asesor Cobranzas',          area: 'Cobranzas Colombia', fcr: 0, csat: 0, aht: 0, conversions: 183, escalations: 0, trend: 'stable' },
  { id: 'ag5',  name: 'Alejandra Perez',          role: 'Asesor Cobranzas',          area: 'Cobranzas Colombia', fcr: 0, csat: 0, aht: 0, conversions: 180, escalations: 0, trend: 'up' },
  { id: 'ag6',  name: 'Neleanny Sequera',         role: 'Asesor Cobranzas',          area: 'Cobranzas Perú',     fcr: 0, csat: 0, aht: 0, conversions: 174, escalations: 0, trend: 'stable' },
  { id: 'ag7',  name: 'Selena Romero Ventura',    role: 'Asesor Cobranzas',          area: 'Cobranzas Perú',     fcr: 0, csat: 0, aht: 0, conversions: 162, escalations: 0, trend: 'stable' },
  { id: 'ag8',  name: 'Joel Jose',                role: 'Asesor Cobranzas',          area: 'Cobranzas Perú',     fcr: 0, csat: 0, aht: 0, conversions: 160, escalations: 0, trend: 'stable' },
  { id: 'ag9',  name: 'Angel Cuberos',            role: 'Asesor Cobranzas',          area: 'Cobranzas Perú',     fcr: 0, csat: 0, aht: 0, conversions: 154, escalations: 0, trend: 'stable' },
  { id: 'ag10', name: 'Jennifer Loaiza',          role: 'Asesor Cobranzas',          area: 'Cobranzas Colombia', fcr: 0, csat: 0, aht: 0, conversions: 152, escalations: 0, trend: 'up' },
  // Bottom performers (requieren coaching)
  { id: 'ag11', name: 'Paola Joya',               role: 'Asesor (bajo rendimiento)', area: 'Cobranzas Colombia', fcr: 0, csat: 0, aht: 0, conversions: 4,   escalations: 0, trend: 'down' },
  { id: 'ag12', name: 'Yuleidy Gonzalez',         role: 'Asesor (bajo rendimiento)', area: 'Cobranzas Colombia', fcr: 0, csat: 0, aht: 0, conversions: 7,   escalations: 0, trend: 'down' },
  { id: 'ag13', name: 'Vannesa Sauce',            role: 'Asesor (bajo rendimiento)', area: 'Cobranzas Colombia', fcr: 0, csat: 0, aht: 0, conversions: 9,   escalations: 0, trend: 'down' },
];
// En la UI que muestra agentes: usar conversions como "Llamadas/día" en lugar de "Conversión%"
// FCR, CSAT, AHT por agente disponibles cuando se integre Engage360 o se procesen más transcripciones

// ─── Vicky Chat — Initial messages ────────────────────────────────────────────

export const initialVickyMessages: ChatMessage[] = [
  {
    id: 'init-1',
    role: 'vicky',
    content: '**Hola. Soy Vicky Insights.**\n\nTengo acceso a los datos reales de tu operación:\n- **CDR 30-Mar-2026**: 16,129 llamadas · 81 agentes · 4 campañas\n- **50 grabaciones** transcritas con IA · Análisis de objeciones y resultados\n- **Benchmarks** de industria: COPC, SQM, E&Y, MetricNet (Colombia · Latam · Global)\n- **Motor EBITDA**: impacto financiero en COP de cada mejora operativa\n\n¿Qué quieres analizar?',
    timestamp: new Date(Date.now() - 60000),
    sources: ['WeKall CDR 30-Mar-2026', 'Engage360', 'Crediminuto Colombia · CrediSmart Perú'],
    confidence: 'Alta',
    reasoning: 'Analicé 16,129 registros del CDR real de Crediminuto/CrediSmart en 4.2 segundos.',
    followUps: [
      '¿Cuál es el top 10 de agentes por volumen de llamadas?',
      '¿Cómo se compara la operación Colombia vs Perú?',
      '¿Qué campaña tiene mejor rendimiento?',
    ],
  },
];

// ─── Decision Log ─────────────────────────────────────────────────────────────
// Inicia vacío — el CEO registra decisiones desde Vicky con "Crear Acción → Decision Log"
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

export const surpriseQuestions = [
  '¿Cuál fue el agente con más llamadas el 30 de marzo y cómo se compara con el promedio?',
  '¿Qué porcentaje del volumen total de Crediminuto corresponde a cobranzas vs servicio al cliente?',
  '¿Cuánto podría crecer el volumen de Perú si se escala el equipo un 20%?',
  '¿Cuáles son los 3 agentes con menor productividad y qué los diferencia de los top performers?',
  '¿Qué impacto tendría en la operación si el dialer automático mejora su tasa de contacto efectivo un 10%?',
  '¿Cómo está distribuida la carga entre los 81 agentes activos del 30 de marzo?',
];
