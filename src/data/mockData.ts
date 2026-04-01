// ─── Mock Data — WeKall Intelligence V9 ───────────────────────────────────────
// Industria agnóstica: aplica a servicios, productos, tech, construcción, finanzas

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
  area: 'Ventas' | 'CX' | 'Cobranzas' | 'Ops';
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

// ─── KPIs ─────────────────────────────────────────────────────────────────────

export const kpiData: KPIData[] = [
  {
    id: 'fcr',
    title: 'Resolución Primer Contacto',
    value: '78.4%',
    numericValue: 78.4,
    change: 3.2,
    changeLabel: '+3.2pp',
    vsIndustry: 5.4,
    sparkline: [72, 74, 71, 75, 76, 77, 78.4],
    roles: ['CEO', 'VP CX', 'COO'],
    unit: '%',
  },
  {
    id: 'csat',
    title: 'CSAT',
    value: '4.3 / 5',
    numericValue: 4.3,
    change: 0.2,
    changeLabel: '+0.2',
    vsIndustry: 8.2,
    sparkline: [3.9, 4.0, 4.1, 4.0, 4.2, 4.1, 4.3],
    roles: ['CEO', 'VP CX', 'VP Ventas'],
    unit: '/5',
  },
  {
    id: 'nps',
    title: 'NPS',
    value: '42',
    numericValue: 42,
    change: 7,
    changeLabel: '+7 pts',
    vsIndustry: 12,
    sparkline: [28, 31, 33, 35, 38, 40, 42],
    roles: ['CEO', 'VP CX'],
    unit: 'pts',
  },
  {
    id: 'conversion',
    title: 'Tasa de Conversión',
    value: '23.6%',
    numericValue: 23.6,
    change: 2.1,
    changeLabel: '+2.1pp',
    vsIndustry: -1.3,
    sparkline: [19, 20, 21, 21, 22, 23, 23.6],
    roles: ['CEO', 'VP Ventas'],
    unit: '%',
  },
  {
    id: 'escalaciones',
    title: 'Tasa de Escalación',
    value: '8.2%',
    numericValue: 8.2,
    change: -1.4,
    changeLabel: '-1.4pp',
    vsIndustry: -3.1,
    sparkline: [11, 10.5, 10, 9.5, 9, 8.5, 8.2],
    invertColor: true,
    roles: ['CEO', 'VP CX', 'COO'],
    unit: '%',
  },
  {
    id: 'aht',
    title: 'Tiempo Medio de Atención',
    value: '4m 32s',
    numericValue: 272,
    change: -18,
    changeLabel: '-18s',
    vsIndustry: 6.5,
    sparkline: [320, 310, 300, 295, 285, 278, 272],
    invertColor: true,
    roles: ['COO', 'VP CX', 'VP Ventas'],
    unit: 'seg',
  },
  {
    id: 'volume',
    title: 'Volumen de Conversaciones',
    value: '12,483',
    numericValue: 12483,
    change: 8.3,
    changeLabel: '+8.3%',
    vsIndustry: 2.1,
    sparkline: [9800, 10200, 10800, 11200, 11600, 12100, 12483],
    roles: ['CEO', 'COO', 'VP Ventas'],
    unit: '',
  },
  {
    id: 'revenue_impact',
    title: 'Impacto en Ingresos',
    value: '$284K',
    numericValue: 284000,
    change: 12.4,
    changeLabel: '+12.4%',
    vsIndustry: 4.2,
    sparkline: [210, 220, 235, 248, 260, 272, 284],
    roles: ['CEO', 'VP Ventas'],
    unit: 'USD',
  },
];

export function getKPIsForRole(role: Role): KPIData[] {
  return kpiData.filter(k => k.roles.includes(role));
}

// ─── Conversation Trend ────────────────────────────────────────────────────────

export const conversationTrend = [
  { day: 'Lun', total: 1680, resolved: 1310, escalated: 138 },
  { day: 'Mar', total: 1820, resolved: 1430, escalated: 121 },
  { day: 'Mié', total: 1950, resolved: 1540, escalated: 115 },
  { day: 'Jue', total: 1780, resolved: 1390, escalated: 128 },
  { day: 'Vie', total: 2100, resolved: 1680, escalated: 105 },
  { day: 'Sáb', total: 1620, resolved: 1290, escalated: 98 },
  { day: 'Dom', total: 1533, resolved: 1230, escalated: 87 },
];

// ─── Proactive Insights ────────────────────────────────────────────────────────

export const proactiveInsights = [
  {
    id: '1',
    type: 'warning' as const,
    title: 'Spike de escalaciones en CX',
    description: 'Las escalaciones en el área de Servicio al Cliente subieron 22% entre 14h-16h. Principal driver: consultas de facturación sin resolver.',
    action: 'Ver análisis en Vicky →',
    question: '¿Por qué subieron las escalaciones en CX entre las 2pm y las 4pm hoy?',
  },
  {
    id: '2',
    type: 'success' as const,
    title: 'Equipo de Ventas supera benchmark',
    description: 'Tasa de conversión del equipo de Ventas alcanzó 26.8%, superando en 13.6% el promedio de la industria. Carlos M. lidera con 31.2%.',
    action: 'Ver detalle →',
    question: '¿Qué está haciendo diferente el equipo de Ventas para superar el benchmark esta semana?',
  },
  {
    id: '3',
    type: 'info' as const,
    title: 'Oportunidad de mejora en AHT',
    description: 'El 30% de las conversaciones largas (+8 min) se concentran en 3 tipos de consulta. Automatización podría reducir AHT un 18% adicional.',
    action: 'Explorar →',
    question: '¿Cuáles son las 3 consultas con mayor AHT y cómo podríamos reducirlo?',
  },
];

// ─── Alerts ───────────────────────────────────────────────────────────────────

export const alertsData: Alert[] = [
  {
    id: 'a1',
    severity: 'critical',
    title: 'CSAT por debajo del umbral crítico',
    description: 'El CSAT del área de Cobranzas cayó a 3.1/5, por debajo del umbral de 3.5. Requiere atención inmediata.',
    time: 'hace 23 min',
    active: true,
    metric: 'CSAT Cobranzas',
    threshold: 3.5,
    current: 3.1,
  },
  {
    id: 'a2',
    severity: 'warning',
    title: 'Tasa de conversión en descenso',
    description: 'Conversión cayó 4.2pp en las últimas 2 horas. Posible correlación con script de venta actualizado ayer.',
    time: 'hace 1h 12min',
    active: true,
    metric: 'Conversión',
    threshold: 22,
    current: 19.8,
  },
  {
    id: 'a3',
    severity: 'warning',
    title: 'AHT elevado en turno tarde',
    description: 'El tiempo medio de atención del turno 14h-22h está 28% sobre el objetivo. 8 agentes superan los 7 minutos.',
    time: 'hace 2h 40min',
    active: true,
    metric: 'AHT Turno tarde',
    threshold: 300,
    current: 384,
  },
  {
    id: 'a4',
    severity: 'info',
    title: 'Volumen alto previsto el viernes',
    description: 'Proyección de ML indica +35% de volumen para el viernes. Considera ajustar dotación de personal.',
    time: 'hace 4h',
    active: false,
    metric: 'Volumen proyectado',
    threshold: 2000,
    current: 2700,
  },
  {
    id: 'a5',
    severity: 'critical',
    title: 'FCR por debajo del 70%',
    description: 'Resolución al primer contacto cayó a 68.2% en el canal de Messenger Hub. Umbral configurado: 72%.',
    time: 'hace 6h',
    active: false,
    metric: 'FCR Messenger Hub',
    threshold: 72,
    current: 68.2,
  },
];

// ─── Agents ───────────────────────────────────────────────────────────────────

export const agentsData: Agent[] = [
  { id: 'ag1', name: 'Carlos Mendoza', role: 'Asesor de Ventas Sr.', area: 'Ventas', fcr: 82, csat: 4.7, aht: 248, conversions: 31.2, escalations: 3.1, trend: 'up' },
  { id: 'ag2', name: 'Laura Jiménez', role: 'Asesor de Ventas', area: 'Ventas', fcr: 79, csat: 4.4, aht: 265, conversions: 27.8, escalations: 4.2, trend: 'up' },
  { id: 'ag3', name: 'Andrés Torres', role: 'Asesor de Ventas', area: 'Ventas', fcr: 74, csat: 4.1, aht: 290, conversions: 21.3, escalations: 6.8, trend: 'stable' },
  { id: 'ag4', name: 'Valentina Ruiz', role: 'Asesor de Ventas Jr.', area: 'Ventas', fcr: 68, csat: 3.9, aht: 312, conversions: 18.1, escalations: 8.4, trend: 'down' },
  { id: 'ag5', name: 'María González', role: 'Asesor de Servicio Sr.', area: 'CX', fcr: 88, csat: 4.8, aht: 232, conversions: 0, escalations: 2.1, trend: 'up' },
  { id: 'ag6', name: 'Jorge Herrera', role: 'Asesor de Servicio', area: 'CX', fcr: 81, csat: 4.3, aht: 268, conversions: 0, escalations: 4.8, trend: 'stable' },
  { id: 'ag7', name: 'Sofía Castillo', role: 'Asesor de Servicio', area: 'CX', fcr: 76, csat: 4.2, aht: 275, conversions: 0, escalations: 5.2, trend: 'up' },
  { id: 'ag8', name: 'Diego Vargas', role: 'Asesor de Cobranzas Sr.', area: 'Cobranzas', fcr: 71, csat: 3.8, aht: 298, conversions: 42.6, escalations: 7.3, trend: 'stable' },
  { id: 'ag9', name: 'Ana Morales', role: 'Asesor de Cobranzas', area: 'Cobranzas', fcr: 66, csat: 3.5, aht: 321, conversions: 38.1, escalations: 9.2, trend: 'down' },
  { id: 'ag10', name: 'Felipe Ospina', role: 'Asesor Ops Sr.', area: 'Ops', fcr: 84, csat: 4.5, aht: 242, conversions: 0, escalations: 3.4, trend: 'up' },
  { id: 'ag11', name: 'Catalina Pardo', role: 'Asesor Ops', area: 'Ops', fcr: 78, csat: 4.2, aht: 268, conversions: 0, escalations: 5.1, trend: 'stable' },
];

// ─── Vicky Chat — Initial messages ────────────────────────────────────────────

export const initialVickyMessages: ChatMessage[] = [
  {
    id: 'init-1',
    role: 'vicky',
    content: '¡Hola! Soy **Vicky**, tu asistente de inteligencia de negocios. Tengo acceso a tus datos de WeKall Phone, Engage360 y Messenger Hub. ¿Qué quieres analizar hoy?',
    timestamp: new Date(Date.now() - 60000),
    sources: ['WeKall Phone', 'Engage360', 'Messenger Hub'],
    confidence: 'Alta',
    followUps: [
      '¿Por qué bajó el CSAT esta semana?',
      '¿Cuáles son mis agentes top performers?',
      '¿Qué área tiene más oportunidad de mejora?',
    ],
  },
];

// ─── Decision Log ─────────────────────────────────────────────────────────────

export const decisionLog = [
  {
    id: 'd1',
    insight: 'AHT elevado en turno tarde por consultas de facturación',
    decision: 'Implementar FAQ automatizado para top 3 consultas de facturación',
    responsible: 'Jorge Herrera (VP CX)',
    status: 'En progreso' as const,
    date: '2026-03-28',
    impact: '-15% AHT proyectado',
  },
  {
    id: 'd2',
    insight: 'Tasa de conversión 13% bajo benchmark en clientes nuevos',
    decision: 'Rediseñar script de apertura para segmento nuevo cliente',
    responsible: 'Laura Jiménez (VP Ventas)',
    status: 'Completada' as const,
    date: '2026-03-22',
    impact: '+4.2pp conversión real',
  },
  {
    id: 'd3',
    insight: 'CSAT del canal Messenger Hub 0.6 pts bajo promedio general',
    decision: 'Capacitación específica equipo Messenger Hub',
    responsible: 'María González (Asesor Sr.)',
    status: 'Planificada' as const,
    date: '2026-04-05',
    impact: '+0.4 CSAT proyectado',
  },
];

// ─── Surprise Questions ───────────────────────────────────────────────────────

export const surpriseQuestions = [
  '¿Cuál es mi mayor oportunidad de mejora operativa esta semana?',
  '¿Qué está haciendo diferente mi mejor agente comparado con el promedio?',
  '¿Cuánto revenue perdí por escalaciones innecesarias el mes pasado?',
  '¿En qué horario tengo mayor riesgo de churn por mala atención?',
  '¿Qué tipo de consulta me está consumiendo más tiempo de atención y cómo puedo automatizarla?',
  '¿Cuál es el impacto proyectado si mejoro el FCR un 5% en los próximos 30 días?',
];
