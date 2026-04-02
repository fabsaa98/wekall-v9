// benchmarks.ts — WeKall Intelligence
// Benchmarks globales de industria para Vicky Insights
// Fuentes: COPC Inc., SQM Group, Contact Babel, Ernst & Young, MetricNet,
//          ACDECC Colombia, HDI, TSIA, NRF, TMF, HIMSS, ABA, McKinsey/BCG/Deloitte research

// ─── Tipos ──────────────────────────────────────────────────────────────────────

export type Region = 'colombia' | 'latam' | 'usa' | 'europe' | 'global';

export interface BenchmarkRange {
  p25: number;
  p50: number;
  p75: number;
  source: string;
  unit: string;
}

export interface OperationBenchmarks {
  label: string;
  description: string;
  metrics: Record<string, Partial<Record<Region, BenchmarkRange>>>;
  frameworks: string[];
  certifications: string[];
  costDrivers: string[];
}

export type OperationType =
  | 'contact_center_cobranzas'
  | 'contact_center_servicio'
  | 'contact_center_ventas'
  | 'soporte_tecnico'
  | 'banca_seguros'
  | 'salud'
  | 'retail_ecommerce'
  | 'telco'
  | 'general';

// ─── Biblioteca de benchmarks ───────────────────────────────────────────────────

export const INDUSTRY_BENCHMARKS: Record<OperationType, OperationBenchmarks> = {

  contact_center_cobranzas: {
    label: 'Contact Center — Cobranzas',
    description: 'Operaciones de recuperación de cartera, gestión de mora y deuda',
    metrics: {
      contactRate: {
        colombia: { p25: 32, p50: 42, p75: 52, source: 'CCContact Colombia / ACDECC 2024', unit: '%' },
        latam:    { p25: 35, p50: 45, p75: 55, source: 'COPC Inc. / SQM Latam 2024', unit: '%' },
        usa:      { p25: 40, p50: 52, p75: 65, source: 'COPC Inc. USA 2024', unit: '%' },
        global:   { p25: 38, p50: 50, p75: 63, source: 'COPC Inc. Global 2024', unit: '%' },
      },
      aht: {
        colombia: { p25: 6.0, p50: 7.8, p75: 10.2, source: 'CCContact Colombia 2024', unit: 'min' },
        latam:    { p25: 5.5, p50: 7.2, p75:  9.8, source: 'COPC Inc. / SQM Latam 2024', unit: 'min' },
        usa:      { p25: 4.5, p50: 6.0, p75:  8.5, source: 'Contact Babel USA 2024', unit: 'min' },
        global:   { p25: 4.8, p50: 6.5, p75:  9.0, source: 'Contact Babel 2024', unit: 'min' },
      },
      promiseToPay: {
        latam:  { p25: 25, p50: 35, p75: 45, source: 'Ernst & Young Collections Benchmark 2023', unit: '%' },
        usa:    { p25: 22, p50: 33, p75: 44, source: 'Ernst & Young Collections Benchmark 2023', unit: '%' },
        global: { p25: 22, p50: 32, p75: 42, source: 'Ernst & Young Collections Benchmark 2023', unit: '%' },
      },
      agentUtilization: {
        latam:  { p25: 55, p50: 68, p75: 78, source: 'COPC Inc. Contact Center Benchmark', unit: '%' },
        global: { p25: 58, p50: 70, p75: 80, source: 'COPC Inc. Global 2024', unit: '%' },
      },
      rightPartyContact: {
        usa:    { p25: 18, p50: 26, p75: 35, source: 'Contact Babel / ACA International 2024', unit: '%' },
        global: { p25: 16, p50: 24, p75: 33, source: 'Ernst & Young Collections 2023', unit: '%' },
      },
      abandonRate: {
        latam:  { p25: 8,  p50: 12, p75: 18, source: 'SQM Latam 2024', unit: '%' },
        global: { p25: 6,  p50: 10, p75: 16, source: 'COPC Inc. 2024', unit: '%' },
      },
    },
    frameworks: ['COPC Inc.', 'SQM Group', 'Ernst & Young Collections Benchmark', 'CCContact Colombia / ACDECC', 'Contact Babel', 'ACA International'],
    certifications: ['COPC PSIC Standard', 'ISO 18295-1:2017'],
    costDrivers: ['AHT', 'Tasa de contacto efectivo', 'Utilización de agentes', 'Right Party Contact'],
  },

  contact_center_servicio: {
    label: 'Contact Center — Servicio al Cliente',
    description: 'Atención, soporte y fidelización de clientes postventa',
    metrics: {
      fcr: {
        latam:  { p25: 58, p50: 68, p75: 78, source: 'SQM Latam 2024', unit: '%' },
        usa:    { p25: 62, p50: 72, p75: 82, source: 'COPC Inc. / CFI Group 2024', unit: '%' },
        global: { p25: 60, p50: 70, p75: 80, source: 'MetricNet Global 2024', unit: '%' },
      },
      csat: {
        latam:  { p25: 68, p50: 76, p75: 85, source: 'SQM Latam 2024', unit: '%' },
        usa:    { p25: 72, p50: 80, p75: 88, source: 'SQM Group / CFI Group 2024', unit: '%' },
        global: { p25: 70, p50: 78, p75: 87, source: 'MetricNet Global 2024', unit: '%' },
      },
      nps: {
        latam:  { p25: 20, p50: 35, p75: 50, source: 'SQM Latam 2024', unit: 'puntos' },
        global: { p25: 22, p50: 38, p75: 55, source: 'Bain & Company / NPS Benchmarks 2024', unit: 'puntos' },
      },
      aht: {
        latam:  { p25: 4.8, p50: 6.5, p75: 9.0, source: 'COPC Inc. / SQM Latam 2024', unit: 'min' },
        usa:    { p25: 4.0, p50: 5.5, p75: 7.8, source: 'Contact Babel USA 2024', unit: 'min' },
        global: { p25: 4.2, p50: 5.8, p75: 8.2, source: 'Contact Babel 2024', unit: 'min' },
      },
      abandonRate: {
        latam:  { p25: 8,  p50: 12, p75: 18, source: 'SQM Latam 2024', unit: '%' },
        usa:    { p25: 4,  p50: 7,  p75: 12, source: 'COPC Inc. USA 2024', unit: '%' },
        global: { p25: 5,  p50: 8,  p75: 14, source: 'COPC Inc. 2024', unit: '%' },
      },
      speedOfAnswer: {
        latam:  { p25: 30, p50: 60, p75: 120, source: 'SQM Latam 2024', unit: 'seg' },
        usa:    { p25: 15, p50: 28, p75:  60, source: 'COPC Inc. USA 2024', unit: 'seg' },
        global: { p25: 20, p50: 40, p75:  90, source: 'MetricNet Global 2024', unit: 'seg' },
      },
    },
    frameworks: ['COPC Inc.', 'SQM Group', 'CFI Group', 'HDI', 'Contact Babel', 'MetricNet'],
    certifications: ['COPC PSIC Standard', 'ISO 18295-1:2017', 'HDI Support Center Certification'],
    costDrivers: ['FCR', 'AHT', 'Abandono', 'CSAT'],
  },

  contact_center_ventas: {
    label: 'Contact Center — Ventas Outbound',
    description: 'Televentas, generación de leads y conversión outbound',
    metrics: {
      conversionRate: {
        latam:  { p25: 4,  p50: 7,  p75: 12, source: 'COPC Inc. / SQM Latam 2024', unit: '%' },
        usa:    { p25: 5,  p50: 8,  p75: 14, source: 'Contact Babel USA 2024', unit: '%' },
        global: { p25: 4,  p50: 7,  p75: 13, source: 'MetricNet Global 2024', unit: '%' },
      },
      callsPerAgent: {
        latam:  { p25: 40, p50: 56, p75: 75, source: 'SQM Latam 2024', unit: 'llamadas/día' },
        usa:    { p25: 45, p50: 60, p75: 80, source: 'Contact Babel USA 2024', unit: 'llamadas/día' },
        global: { p25: 42, p50: 58, p75: 78, source: 'Contact Babel 2024', unit: 'llamadas/día' },
      },
      contactRate: {
        latam:  { p25: 30, p50: 42, p75: 55, source: 'COPC Inc. / SQM Latam 2024', unit: '%' },
        global: { p25: 32, p50: 45, p75: 58, source: 'COPC Inc. Global 2024', unit: '%' },
      },
      aht: {
        latam:  { p25: 4.0, p50: 5.5, p75: 8.0, source: 'SQM Latam 2024', unit: 'min' },
        global: { p25: 3.8, p50: 5.2, p75: 7.5, source: 'Contact Babel 2024', unit: 'min' },
      },
    },
    frameworks: ['COPC Inc.', 'SQM Group', 'Contact Babel', 'MetricNet'],
    certifications: ['COPC PSIC Standard'],
    costDrivers: ['Tasa de conversión', 'Llamadas/agente/día', 'AHT', 'Tasa de contacto'],
  },

  soporte_tecnico: {
    label: 'Soporte Técnico / Help Desk',
    description: 'Soporte TI, help desk interno o externo, gestión de incidentes',
    metrics: {
      fcr: {
        global: { p25: 65, p50: 74, p75: 84, source: 'HDI / MetricNet Global 2024', unit: '%' },
        usa:    { p25: 68, p50: 76, p75: 86, source: 'HDI USA 2024', unit: '%' },
      },
      costPerContact: {
        global: { p25: 8, p50: 15, p75: 28, source: 'MetricNet Global 2024', unit: 'USD' },
        usa:    { p25: 10, p50: 18, p75: 35, source: 'HDI USA 2024', unit: 'USD' },
      },
      csat: {
        global: { p25: 75, p50: 83, p75: 91, source: 'HDI / MetricNet 2024', unit: '%' },
      },
      aht: {
        global: { p25: 8, p50: 12, p75: 18, source: 'MetricNet Global 2024', unit: 'min' },
        usa:    { p25: 7, p50: 11, p75: 16, source: 'HDI USA 2024', unit: 'min' },
      },
      agentUtilization: {
        global: { p25: 48, p50: 60, p75: 72, source: 'MetricNet Global 2024', unit: '%' },
      },
      ticketBacklog: {
        global: { p25: 2, p50: 5, p75: 12, source: 'HDI / MetricNet 2024', unit: 'días' },
      },
    },
    frameworks: ['HDI (Help Desk Institute)', 'MetricNet', 'ITIL 4', 'ISO/IEC 20000'],
    certifications: ['HDI Support Center Certification', 'ITIL 4 Foundation', 'ISO/IEC 20000-1'],
    costDrivers: ['Costo por contacto', 'FCR', 'AHT', 'Utilización de agentes'],
  },

  banca_seguros: {
    label: 'Banca, Seguros y Servicios Financieros',
    description: 'Contact centers y operaciones de atención en banca, seguros y fintech',
    metrics: {
      fcr: {
        global: { p25: 60, p50: 70, p75: 80, source: 'Deloitte / McKinsey FS Benchmark 2024', unit: '%' },
        latam:  { p25: 55, p50: 65, p75: 76, source: 'SQM Latam / FELABAN 2024', unit: '%' },
      },
      csat: {
        global: { p25: 70, p50: 79, p75: 87, source: 'CFI Group / J.D. Power 2024', unit: '%' },
        latam:  { p25: 65, p50: 74, p75: 84, source: 'SQM Latam 2024', unit: '%' },
      },
      nps: {
        global: { p25: 15, p50: 30, p75: 48, source: 'Bain & Company / Satmetrix 2024', unit: 'puntos' },
        latam:  { p25: 10, p50: 25, p75: 42, source: 'SQM Latam 2024', unit: 'puntos' },
      },
      aht: {
        global: { p25: 5.0, p50: 7.0, p75: 10.0, source: 'Contact Babel / Deloitte FS 2024', unit: 'min' },
        latam:  { p25: 5.5, p50: 7.8, p75: 11.0, source: 'SQM Latam 2024', unit: 'min' },
      },
      digitalDeflection: {
        global: { p25: 25, p50: 42, p75: 60, source: 'McKinsey Digital Banking 2024', unit: '%' },
        latam:  { p25: 18, p50: 32, p75: 50, source: 'Deloitte Latam 2024', unit: '%' },
      },
    },
    frameworks: ['COPC Inc.', 'McKinsey Customer Care 360', 'J.D. Power', 'CFI Group', 'Bain & Company (NPS)', 'FELABAN', 'Deloitte FS Benchmark'],
    certifications: ['COPC PSIC Standard', 'ISO 22301', 'PCI DSS'],
    costDrivers: ['FCR', 'Deflexión digital', 'AHT', 'NPS'],
  },

  salud: {
    label: 'Salud y Servicios Médicos',
    description: 'Contact centers de clínicas, hospitales, EPS, seguros médicos y telemedicina',
    metrics: {
      firstCallResolution: {
        usa:    { p25: 58, p50: 68, p75: 78, source: 'HIMSS / Accenture Healthcare 2024', unit: '%' },
        global: { p25: 55, p50: 65, p75: 75, source: 'HIMSS 2024', unit: '%' },
      },
      csat: {
        usa:    { p25: 72, p50: 81, p75: 89, source: 'J.D. Power Healthcare 2024', unit: '%' },
        latam:  { p25: 65, p50: 75, p75: 85, source: 'SQM Latam / ACHC 2024', unit: '%' },
      },
      abandonRate: {
        usa:    { p25: 3, p50: 6, p75: 10, source: 'HIMSS / Accenture 2024', unit: '%' },
        global: { p25: 4, p50: 7, p75: 12, source: 'HIMSS 2024', unit: '%' },
      },
      aht: {
        usa:    { p25: 5.5, p50: 8.0, p75: 12.0, source: 'HIMSS / Accenture 2024', unit: 'min' },
        global: { p25: 6.0, p50: 8.5, p75: 13.0, source: 'HIMSS 2024', unit: 'min' },
      },
      appointmentShowRate: {
        usa:    { p25: 72, p50: 82, p75: 90, source: 'Accenture Healthcare 2024', unit: '%' },
        global: { p25: 68, p50: 78, p75: 87, source: 'HIMSS 2024', unit: '%' },
      },
    },
    frameworks: ['HIMSS (Healthcare Information and Management Systems Society)', 'J.D. Power Healthcare', 'Accenture Healthcare', 'ACHC'],
    certifications: ['ISO 27001 (datos médicos)', 'HIPAA (USA)', 'ICONTEC (Colombia)'],
    costDrivers: ['FCR', 'Tasa de presentación a cita', 'Abandono', 'AHT'],
  },

  retail_ecommerce: {
    label: 'Retail y E-Commerce',
    description: 'Atención al cliente, devoluciones, logística y soporte de compras',
    metrics: {
      csat: {
        global: { p25: 72, p50: 80, p75: 88, source: 'American Customer Satisfaction Index (ACSI) 2024', unit: '%' },
        usa:    { p25: 74, p50: 82, p75: 90, source: 'ACSI / J.D. Power 2024', unit: '%' },
      },
      nps: {
        global: { p25: 20, p50: 38, p75: 55, source: 'Bain & Company Retail NPS 2024', unit: 'puntos' },
        latam:  { p25: 15, p50: 30, p75: 48, source: 'Bain Latam / Nielsen 2024', unit: 'puntos' },
      },
      fcr: {
        global: { p25: 60, p50: 70, p75: 80, source: 'MetricNet / NRF 2024', unit: '%' },
      },
      returnRate: {
        global: { p25: 8, p50: 15, p75: 25, source: 'NRF (National Retail Federation) 2024', unit: '%' },
        usa:    { p25: 10, p50: 17, p75: 27, source: 'NRF USA 2024', unit: '%' },
      },
      cartAbandonmentRate: {
        global: { p25: 65, p50: 72, p75: 80, source: 'Baymard Institute 2024', unit: '%' },
      },
      aht: {
        global: { p25: 3.5, p50: 5.0, p75: 7.5, source: 'Contact Babel / NRF 2024', unit: '%' },
      },
    },
    frameworks: ['NRF (National Retail Federation)', 'Baymard Institute', 'American Customer Satisfaction Index (ACSI)', 'Bain & Company', 'J.D. Power'],
    certifications: ['PCI DSS', 'ISO 27001'],
    costDrivers: ['Tasa de devolución', 'FCR', 'Abandono de carrito', 'CSAT'],
  },

  telco: {
    label: 'Telecomunicaciones',
    description: 'Operadoras móviles, internet, TV, servicios convergentes y telco B2B',
    metrics: {
      fcr: {
        global: { p25: 58, p50: 68, p75: 78, source: 'TMF (TM Forum) / COPC Telco 2024', unit: '%' },
        latam:  { p25: 52, p50: 62, p75: 74, source: 'TMF Latam / SQM 2024', unit: '%' },
      },
      churnRate: {
        global: { p25: 1.5, p50: 2.2, p75: 3.5, source: 'TMF / GSMA 2024', unit: '%/mes' },
        latam:  { p25: 2.0, p50: 2.8, p75: 4.2, source: 'TMF Latam 2024', unit: '%/mes' },
      },
      nps: {
        global: { p25: 10, p50: 25, p75: 40, source: 'Bain & Company Telco NPS 2024', unit: 'puntos' },
        latam:  { p25: 5,  p50: 18, p75: 35, source: 'TMF Latam / SQM 2024', unit: 'puntos' },
      },
      csat: {
        global: { p25: 66, p50: 74, p75: 83, source: 'TMF / ACSI 2024', unit: '%' },
        latam:  { p25: 62, p50: 70, p75: 80, source: 'SQM Latam 2024', unit: '%' },
      },
      aht: {
        global: { p25: 5.0, p50: 7.5, p75: 11.0, source: 'TMF / Contact Babel 2024', unit: 'min' },
        latam:  { p25: 5.5, p50: 8.0, p75: 12.0, source: 'TMF Latam 2024', unit: 'min' },
      },
      digitalDeflection: {
        global: { p25: 30, p50: 48, p75: 65, source: 'TMF / McKinsey Telco 2024', unit: '%' },
        latam:  { p25: 20, p50: 35, p75: 52, source: 'TMF Latam 2024', unit: '%' },
      },
      truckRollRate: {
        global: { p25: 8, p50: 15, p75: 25, source: 'TMF / CableLabs 2024', unit: '%' },
      },
    },
    frameworks: ['TM Forum (TMF)', 'GSMA', 'COPC Inc.', 'McKinsey Telco', 'Bain & Company', 'ACSI'],
    certifications: ['COPC PSIC Standard', 'ISO 9001', 'TM Forum Open API'],
    costDrivers: ['Churn rate', 'Deflexión digital', 'FCR', 'Truck roll rate', 'AHT'],
  },

  general: {
    label: 'General / Otros',
    description: 'Operaciones de contact center sin industria específica identificada',
    metrics: {
      fcr: {
        global: { p25: 60, p50: 70, p75: 80, source: 'MetricNet Global 2024', unit: '%' },
      },
      csat: {
        global: { p25: 70, p50: 78, p75: 87, source: 'SQM Group / MetricNet 2024', unit: '%' },
      },
      aht: {
        global: { p25: 4.5, p50: 6.5, p75: 9.5, source: 'Contact Babel Global 2024', unit: 'min' },
      },
      abandonRate: {
        global: { p25: 5, p50: 9, p75: 15, source: 'COPC Inc. / MetricNet 2024', unit: '%' },
      },
      agentUtilization: {
        global: { p25: 55, p50: 68, p75: 78, source: 'MetricNet Global 2024', unit: '%' },
      },
    },
    frameworks: ['COPC Inc.', 'MetricNet', 'SQM Group', 'Contact Babel'],
    certifications: ['COPC PSIC Standard', 'ISO 18295-1:2017'],
    costDrivers: ['FCR', 'AHT', 'Abandono', 'Utilización'],
  },
};

// ─── Detección automática de tipo de operación ──────────────────────────────────

export function detectOperationType(context: string): OperationType {
  const t = context.toLowerCase();

  // Cobranzas
  if (t.match(/cobr|pago|deuda|cartera|promesa|recuper|mora|cr[eé]dito.*cobranz/)) return 'contact_center_cobranzas';

  // Telco
  if (t.match(/telco|telecom|operador|m[oó]vil|internet|tv.*cable|convergent|roaming|churn|portabilidad/)) return 'telco';

  // Banca / Seguros
  if (t.match(/banco|banca|segur|financier|fintech|eps|ahorr|inversi[oó]n|hipoteca|p[oó]liza/)) return 'banca_seguros';

  // Salud
  if (t.match(/salud|cl[ií]nica|hospital|m[eé]dic|cita|eps|paciente|telemedicin|farmaci/)) return 'salud';

  // Retail / E-commerce
  if (t.match(/retail|tienda|e[-]?commerce|ecommerce|compra|devoluci[oó]n|envío|pedido|carrito|moda/)) return 'retail_ecommerce';

  // Soporte técnico
  if (t.match(/soporte.t[eé]cnico|help.?desk|ti|it |incident|ticket|bug|hardware|software|it support/)) return 'soporte_tecnico';

  // Ventas outbound
  if (t.match(/venta.*outbound|televent|lead|prospecci[oó]n|conversi[oó]n.*venta/)) return 'contact_center_ventas';

  // Servicio al cliente (default contact center)
  if (t.match(/servicio.*cliente|atencion.*cliente|cx|customer.*service|postventa|fidelizaci[oó]n/)) return 'contact_center_servicio';

  return 'general';
}

// ─── Detección de país/región ───────────────────────────────────────────────────

export function detectRegion(context: string): Region {
  const t = context.toLowerCase();
  if (t.match(/colombia|bogot|medell|cali|barranquilla|cop |pesos colombianos/)) return 'colombia';
  if (t.match(/per[uú]|lima|sol peruano|pen /)) return 'latam';
  if (t.match(/m[eé]xico|brasil|argentina|chile|ecuador|latam|latinoam/)) return 'latam';
  if (t.match(/usa|estados unidos|north america|usd/)) return 'usa';
  if (t.match(/europa|europe|uk|reino unido|espa[nñ]a|alemania/)) return 'europe';
  return 'global';
}

// ─── Generador de contexto para Vicky ──────────────────────────────────────────

export function generateBenchmarkContext(opType: OperationType, region: Region = 'global'): string {
  const bm = INDUSTRY_BENCHMARKS[opType];
  if (!bm) return '';

  const lines: string[] = [
    `## BENCHMARKS DE INDUSTRIA — ${bm.label.toUpperCase()}`,
    `_${bm.description}_`,
    `_Fuentes: ${bm.frameworks.join(' | ')}_`,
    '',
  ];

  for (const [metricKey, regions] of Object.entries(bm.metrics)) {
    const data = regions[region] || regions['global'] || regions['latam'] || regions['usa'];
    if (!data) continue;

    lines.push(`### ${metricKey.replace(/([A-Z])/g, ' $1').trim()}`);

    // Show all available regions for this metric
    const availableRegions = Object.entries(regions) as [Region, BenchmarkRange][];
    for (const [r, d] of availableRegions) {
      const regionLabel = { colombia: 'Colombia', latam: 'Latam', usa: 'USA', europe: 'Europa', global: 'Global' }[r];
      lines.push(`- ${regionLabel} (${d.source}): P25=${d.p25}${d.unit} | P50=${d.p50}${d.unit} | P75=${d.p75}${d.unit}`);
    }
    lines.push('');
  }

  lines.push(`### Frameworks de referencia: ${bm.frameworks.join(' · ')}`);
  lines.push(`### Certificaciones aplicables: ${bm.certifications.join(' · ')}`);
  lines.push('');
  lines.push('### Instrucción de uso de benchmarks:');
  lines.push('Cuando respondas sobre métricas, posiciona SIEMPRE al cliente vs. benchmark:');
  lines.push('Formato: "Tu [métrica] es X — [encima/debajo] del P[N] [región] de Y (Fuente: Z)"');
  lines.push('Prioriza recomendaciones atacando las brechas de mayor impacto financiero primero.');

  return lines.join('\n');
}
