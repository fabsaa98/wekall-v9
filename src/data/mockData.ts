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
    sparkline: [38, 39, 41, 40, 42, 39, 40],
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
    change: -2.1,
    changeLabel: '-2.1pp',
    vsIndustry: -4,
    sparkline: [48, 46, 44, 45, 43, 44, 43.1],
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
    sparkline: [37, 38, 39, 41, 40, 39, 40],
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
    sparkline: [35, 36, 37, 38, 37, 38, 38],
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
    changeLabel: 'promedio',
    vsIndustry: -4,
    sparkline: [7.8, 8.0, 8.2, 8.1, 8.3, 8.0, 8.1],
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
    change: 8.3,
    changeLabel: '+8.3%',
    vsIndustry: 2,
    sparkline: [13200, 14100, 14800, 15200, 15600, 15900, 16129],
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
    change: -1,
    changeLabel: '50% activos',
    vsIndustry: -10,
    sparkline: [55, 52, 50, 51, 50, 49, 50],
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
    change: 29,
    changeLabel: '+29% vs promedio',
    vsIndustry: 20,
    sparkline: [180, 200, 220, 240, 250, 255, 261],
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

export const conversationTrend = [
  { day: 'Lun 24*', total: 13200, resolved: 9800, escalated: 1056, isReal: false },
  { day: 'Mar 25*', total: 14100, resolved: 10500, escalated: 987, isReal: false },
  { day: 'Mié 26*', total: 14800, resolved: 11100, escalated: 1036, isReal: false },
  { day: 'Jue 27*', total: 15200, resolved: 11400, escalated: 1064, isReal: false },
  { day: 'Vie 28*', total: 15600, resolved: 11700, escalated: 1092, isReal: false },
  { day: 'Sáb 29*', total: 12400, resolved: 9300, escalated: 868, isReal: false },
  { day: 'Dom 30 ✓', total: 16129, resolved: 11966, escalated: 1129, isReal: true },
];

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

// ─── Alerts ───────────────────────────────────────────────────────────────────

export const alertsData: Alert[] = [
  {
    id: 'a1',
    severity: 'critical',
    title: 'Alta concentración en agente wekall Dialer',
    description: '7,162 de 16,129 llamadas (44.4%) pasaron por el dialer automático. Monitorear para asegurar calidad de contacto.',
    time: 'hace 18 min',
    active: true,
    metric: 'Llamadas Dialer',
    threshold: 40,
    current: 44.4,
  },
  {
    id: 'a2',
    severity: 'warning',
    title: 'Servicio al Cliente Colombia con leve descenso',
    description: 'El canal Servicio al Cliente Colombia bajó a 3,256 llamadas, -1.4% vs día anterior. Revisar motivos de contacto.',
    time: 'hace 45 min',
    active: true,
    metric: 'Volumen Servicio Colombia',
    threshold: 3300,
    current: 3256,
  },
  {
    id: 'a3',
    severity: 'warning',
    title: 'Agentes sin fecha de último inicio registrada',
    description: '23 agentes activos en plataforma no tienen sesión registrada en los últimos 7 días. Validar disponibilidad real.',
    time: 'hace 2h',
    active: true,
    metric: 'Agentes sin sesión',
    threshold: 10,
    current: 23,
  },
  {
    id: 'a4',
    severity: 'info',
    title: 'Volumen Perú en crecimiento sostenido',
    description: 'CrediSmart Perú lleva 7 días consecutivos con crecimiento en volumen de llamadas. Proyección: +18% en próximos 30 días.',
    time: 'hace 3h',
    active: false,
    metric: 'Volumen Perú',
    threshold: 3000,
    current: 3690,
  },
  {
    id: 'a5',
    severity: 'info',
    title: 'Pico de llamadas entrantes detectado',
    description: '1,348 llamadas entrantes en un día — 8.4% del total. Revisar si hay campaña inbound activa no registrada.',
    time: 'hace 5h',
    active: false,
    metric: 'Llamadas Entrantes',
    threshold: 1200,
    current: 1348,
  },
];

// ─── Agents (top agentes reales de CDR 30-Mar-2026) ──────────────────────────

export const agentsData: Agent[] = [
  { id: 'ag1', name: 'Teresa Meza', role: 'Asesor de Cobranzas Sr.', area: 'Cobranzas', fcr: 81, csat: 4.3, aht: 278, conversions: 38.4, escalations: 4.2, trend: 'up' },
  { id: 'ag2', name: 'Juan Gutierrez', role: 'Asesor de Cobranzas', area: 'Cobranzas', fcr: 78, csat: 4.1, aht: 292, conversions: 35.1, escalations: 5.1, trend: 'up' },
  { id: 'ag3', name: 'Santiago Cano', role: 'Asesor de Cobranzas', area: 'Cobranzas', fcr: 74, csat: 3.9, aht: 310, conversions: 31.8, escalations: 6.4, trend: 'stable' },
  { id: 'ag4', name: 'Alejandra Perez', role: 'Asesor de Servicio', area: 'CX', fcr: 82, csat: 4.5, aht: 265, conversions: 0, escalations: 3.8, trend: 'up' },
  { id: 'ag5', name: 'Neleanny Sequera', role: 'Asesor de Cobranzas', area: 'Cobranzas', fcr: 71, csat: 3.7, aht: 324, conversions: 28.6, escalations: 7.2, trend: 'stable' },
  { id: 'ag6', name: 'Joel Jose', role: 'Asesor de Cobranzas', area: 'Cobranzas', fcr: 69, csat: 3.6, aht: 338, conversions: 26.4, escalations: 8.1, trend: 'down' },
  { id: 'ag7', name: 'Angel Cuberos', role: 'Asesor de Cobranzas', area: 'Cobranzas', fcr: 73, csat: 3.8, aht: 316, conversions: 29.1, escalations: 6.8, trend: 'stable' },
  { id: 'ag8', name: 'Jennifer Loaiza', role: 'Asesor de Servicio Sr.', area: 'CX', fcr: 85, csat: 4.6, aht: 252, conversions: 0, escalations: 3.1, trend: 'up' },
  { id: 'ag9', name: 'Imaru Escorche', role: 'Asesor de Cobranzas', area: 'Cobranzas', fcr: 76, csat: 4.0, aht: 302, conversions: 32.7, escalations: 5.9, trend: 'up' },
  { id: 'ag10', name: 'Samuel Piero', role: 'Asesor de Cobranzas Perú', area: 'Cobranzas', fcr: 72, csat: 3.9, aht: 318, conversions: 30.2, escalations: 6.6, trend: 'stable' },
  { id: 'ag11', name: 'Angelica Rodriguez', role: 'Asesor de Servicio', area: 'CX', fcr: 80, csat: 4.2, aht: 278, conversions: 0, escalations: 4.4, trend: 'stable' },
];

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
    insight: '44.4% del volumen pasa por el dialer automático — monitorear calidad',
    decision: 'Implementar escucha aleatoria del 5% de llamadas del dialer semanal',
    responsible: 'COO Crediminuto',
    status: 'En progreso' as const,
    date: '2026-03-30',
    impact: 'Mejora en calidad de contacto proyectada',
  },
  {
    id: 'd2',
    insight: '23 agentes activos sin sesión registrada en últimos 7 días',
    decision: 'Auditoría de disponibilidad real del equipo — validar con supervisores',
    responsible: 'Adriana Moreno (Supervisora)',
    status: 'Planificada' as const,
    date: '2026-04-02',
    impact: 'Optimización de headcount activo',
  },
  {
    id: 'd3',
    insight: 'CrediSmart Perú crece sostenidamente — 3,690 llamadas/día',
    decision: 'Aumentar dotación de agentes Perú en 15% para Q2 2026',
    responsible: 'CEO',
    status: 'Completada' as const,
    date: '2026-03-28',
    impact: '+18% volumen proyectado Q2',
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
