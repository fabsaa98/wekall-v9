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
    changeLabel: 'Hoy',
    vsIndustry: 5,
    sparkline: [40, 40, 40, 40, 40, 40, 40],
    roles: ['CEO', 'VP Ventas', 'COO'],
    unit: '%',
    bsc: 'Financiera',
    description: 'Contactos que resultan en promesa de pago',
  },
  {
    id: 'costo_contacto',
    title: 'Tasa de Contacto Efectivo',
    value: '43.1%',
    numericValue: 43.1,
    change: 0,
    changeLabel: '30-Mar-2026',
    vsIndustry: -4,
    sparkline: [43.1, 43.1, 43.1, 43.1, 43.1, 43.1, 43.1],
    invertColor: true,
    roles: ['CEO', 'COO'],
    unit: '%',
    bsc: 'Financiera',
    description: 'Del total de llamadas, % que conectan',
  },
  // ── Perspectiva Cliente ──────────────────────────────────────────────────────
  {
    id: 'promesa_cumplida',
    title: 'Promesa de Pago',
    value: '40.0%',
    numericValue: 40,
    change: 0,
    changeLabel: 'de contactos',
    vsIndustry: 3,
    sparkline: [40, 40, 40, 40, 40, 40, 40],
    roles: ['CEO', 'VP Ventas', 'VP CX'],
    unit: '%',
    bsc: 'Cliente',
    description: 'Contactos efectivos que prometen pagar',
  },
  {
    id: 'sin_capacidad',
    title: 'Sin Capacidad de Pago',
    value: '38.0%',
    numericValue: 38,
    change: 1,
    changeLabel: '+1pp',
    vsIndustry: 2,
    sparkline: [38, 38, 38, 38, 38, 38, 38],
    invertColor: true,
    roles: ['CEO', 'VP CX', 'COO'],
    unit: '%',
    bsc: 'Cliente',
    description: 'No pueden pagar ahora — oportunidad de refinanciación',
  },
  // ── Perspectiva Procesos ──────────────────────────────────────────────────────
  {
    id: 'aht_real',
    title: 'AHT Real',
    value: '8.1 min',
    numericValue: 8.1,
    change: 0,
    changeLabel: '30-Mar-2026',
    vsIndustry: -4,
    sparkline: [8.1, 8.1, 8.1, 8.1, 8.1, 8.1, 8.1],
    invertColor: true,
    roles: ['COO', 'VP CX'],
    unit: 'min',
    bsc: 'Procesos',
    description: 'Duración promedio llamadas reales (benchmark: 4 min)',
  },
  {
    id: 'llamadas_dia',
    title: 'Llamadas / Día',
    value: '16,129',
    numericValue: 16129,
    change: 0,
    changeLabel: '30-Mar-2026',
    vsIndustry: 2,
    sparkline: [16129, 16129, 16129, 16129, 16129, 16129, 16129],
    roles: ['CEO', 'COO'],
    unit: '',
    bsc: 'Procesos',
    description: 'Volumen total de conversaciones — 30-Mar-2026',
  },
  // ── Perspectiva Aprendizaje ───────────────────────────────────────────────────
  {
    id: 'agentes_activos',
    title: 'Agentes Activos',
    value: '81 / 162',
    numericValue: 50,
    change: 0,
    changeLabel: '50% activos',
    vsIndustry: -10,
    sparkline: [50, 50, 50, 50, 50, 50, 50],
    invertColor: true,
    roles: ['CEO', 'COO'],
    unit: '%',
    bsc: 'Aprendizaje',
    description: '81 de 162 agentes disponibles operaron',
  },
  {
    id: 'top_agent',
    title: 'Top Agente',
    value: '261',
    numericValue: 261,
    change: 0,
    changeLabel: 'Teresa Meza',
    vsIndustry: 20,
    sparkline: [261, 261, 261, 261, 261, 261, 261],
    roles: ['CEO', 'VP Ventas'],
    unit: 'llamadas',
    bsc: 'Aprendizaje',
    description: 'Teresa Meza — 261 vs. 137 promedio',
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

export const alertsData: Alert[] = [
  {
    id: 'a-contacto',
    severity: 'warning',
    title: 'Tasa de contacto por debajo del benchmark del sector',
    description: 'La tasa de contacto efectivo es 43.1% — por debajo de la mediana del sector en Latam (45%, COPC 2024) y de los líderes (55%). El 57% de las llamadas (9,178) no conectan. Cada punto de mejora genera ~64 contactos adicionales/día.',
    time: 'CDR 30-Mar-2026',
    active: true,
    metric: 'Contacto Efectivo',
    threshold: 45,
    current: 43.1,
  },
  {
    id: 'a-aht',
    severity: 'warning',
    title: 'AHT por encima del P50 Colombia',
    description: 'Tiempo promedio por llamada (AHT): 8.1 min vs. mediana Colombia 7.8 min (CCContact 2024). Brecha: 0.3 min × 6,951 contactos = 2,085 min adicionales/día = COP $592,000/día en capacidad de agente utilizada por encima del benchmark.',
    time: 'CDR 30-Mar-2026',
    active: true,
    metric: 'AHT (min)',
    threshold: 7.8,
    current: 8.1,
  },
  {
    id: 'a-dialer',
    severity: 'info',
    title: 'wekall Dialer: 44.4% del volumen — excluido del análisis de agentes',
    description: '7,162 de 16,129 llamadas (44.4%) son del marcador automático wekall Dialer. Este agente del sistema está excluido del análisis de rendimiento humano. El análisis de agentes aplica a los 81 agentes humanos restantes.',
    time: 'CDR 30-Mar-2026',
    active: true,
    metric: 'Llamadas Dialer',
    threshold: 40,
    current: 44.4,
  },
  {
    id: 'a-bottom',
    severity: 'critical',
    title: 'Cuartil inferior requiere atención inmediata',
    description: '20 agentes (25% del equipo) están por debajo de 76 llamadas/día. Los 3 con menor actividad: Paola Joya (4), Yuleidy Gonzalez (7), Vannesa Sauce (9). El promedio del equipo es 110.7 llamadas/día. Acción: conversación de coaching esta semana.',
    time: 'CDR 30-Mar-2026',
    active: true,
    metric: 'Agentes P25',
    threshold: 76,
    current: 4, // peor caso (Paola Joya)
  },
  {
    id: 'a-entrantes',
    severity: 'info',
    title: '1,348 llamadas entrantes — revisar motivo',
    description: '1,348 llamadas entrantes (8.4% del total). En una operación de cobranzas outbound, este volumen inbound puede indicar: clientes respondiendo contactos anteriores, consultas de refinanciación, o campañas inbound activas no registradas.',
    time: 'CDR 30-Mar-2026',
    active: false,
    metric: 'Llamadas Entrantes',
    threshold: 1200,
    current: 1348,
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

export const decisionLog = [
  {
    id: 'd1',
    insight: '44.4% del volumen pasa por el dialer automático (wekall Dialer: 7,162 llamadas el 30-Mar)',
    decision: 'Implementar escucha aleatoria del 5% de llamadas del dialer — validar calidad de contacto',
    responsible: 'COO Crediminuto',
    status: 'En progreso' as const,
    date: '2026-03-30',
    impact: 'Mejora en calidad de contacto — pendiente cuantificar',
  },
  {
    id: 'd2',
    insight: 'Tasa de contacto efectivo: 43.1% — 2 puntos bajo la mediana Latam (COPC 2024: 45%)',
    decision: 'Solicitar CDR con timestamp por llamada para analizar franjas horarias de mayor contacto',
    responsible: 'CEO',
    status: 'Planificada' as const,
    date: '2026-04-02',
    impact: 'Potencial +280 promesas adicionales/mes si contacto sube al 55%',
  },
  {
    id: 'd3',
    insight: 'Cuartil inferior (20 agentes): promedio 76 llamadas/día vs. 110.7 del equipo. Bottom 3: Paola Joya (4), Yuleidy Gonzalez (7), Vannesa Sauce (9)',
    decision: 'Documentar protocolo de Teresa Meza (261 llamadas) y replicar en agentes del cuartil inferior',
    responsible: 'VP Operaciones',
    status: 'Planificada' as const,
    date: '2026-04-10',
    impact: '+880 llamadas/día si cuartil inferior sube a la mediana (120 llamadas/agente)',
  },
];

// ─── Surprise Questions ───────────────────────────────────────────────────────

export const surpriseQuestions = [
  '¿Cuál fue el agente con más llamadas el 30 de marzo y cómo se compara con el promedio?',
  '¿Qué porcentaje del volumen total de Crediminuto corresponde a cobranzas vs servicio al cliente?',
  '¿Cuánto podría crecer el volumen de Perú si se escala el equipo un 20%?',
  '¿Cuáles son los 3 agentes con menor productividad y qué los diferencia de los top performers?',
  '¿Qué impacto tendría en la operación si el dialer automático mejora su tasa de contacto efectivo un 10%?',
  '¿Cómo está distribuida la carga entre los 81 agentes activos del 30 de marzo?',
];
