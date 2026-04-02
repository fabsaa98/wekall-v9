// Benchmarks globales de industria para WeKall Intelligence
// Fuentes: COPC Inc., SQM Group, Contact Babel, Ernst & Young Collections, CCContact Colombia / ACDECC

export const INDUSTRY_BENCHMARKS = {
  contact_center_cobranzas: {
    metrics: {
      contactRate: {
        colombia: { p25: 32, p50: 42, p75: 52, source: 'CCContact Colombia / ACDECC 2024', unit: '%' },
        latam:    { p25: 35, p50: 45, p75: 55, source: 'COPC Inc. / SQM Latam 2024', unit: '%' },
        global:   { p25: 40, p50: 52, p75: 65, source: 'COPC Inc. Global 2024', unit: '%' },
      },
      aht: {
        colombia: { p25: 6.0, p50: 7.8, p75: 10.2, source: 'CCContact Colombia 2024', unit: 'min' },
        latam:    { p25: 5.5, p50: 7.2, p75: 9.8,  source: 'COPC Inc. / SQM Latam 2024', unit: 'min' },
        global:   { p25: 4.8, p50: 6.5, p75: 9.0,  source: 'Contact Babel 2024', unit: 'min' },
      },
      promiseToPay: {
        latam:  { p25: 25, p50: 35, p75: 45, source: 'Ernst & Young Collections Benchmark 2023', unit: '%' },
        global: { p25: 22, p50: 32, p75: 42, source: 'Ernst & Young Collections Benchmark 2023', unit: '%' },
      },
      agentUtilization: {
        latam:  { p25: 55, p50: 68, p75: 78, source: 'COPC Inc. Contact Center Benchmark', unit: '%' },
        global: { p25: 58, p50: 70, p75: 80, source: 'COPC Inc. Global 2024', unit: '%' },
      },
    },
    frameworks: ['COPC Inc.', 'SQM Group', 'Ernst & Young Collections Benchmark', 'CCContact Colombia / ACDECC', 'Contact Babel'],
    certifications: ['COPC PSIC Standard', 'ISO 18295-1:2017'],
  },
  contact_center_servicio: {
    metrics: {
      fcr: {
        global: { p25: 62, p50: 72, p75: 82, source: 'COPC Inc. / CFI Group 2024', unit: '%' },
        latam:  { p25: 58, p50: 68, p75: 78, source: 'SQM Latam 2024', unit: '%' },
      },
      csat: {
        global: { p25: 72, p50: 80, p75: 88, source: 'SQM Group 2024', unit: '%' },
        latam:  { p25: 68, p50: 76, p75: 85, source: 'SQM Latam 2024', unit: '%' },
      },
      aht: {
        global: { p25: 4.2, p50: 5.8, p75: 8.2, source: 'Contact Babel 2024', unit: 'min' },
        latam:  { p25: 4.8, p50: 6.5, p75: 9.0, source: 'COPC Inc. / SQM Latam 2024', unit: 'min' },
      },
      abandonRate: {
        global: { p25: 5, p50: 8, p75: 14, source: 'COPC Inc. 2024', unit: '%' },
        latam:  { p25: 8, p50: 12, p75: 18, source: 'SQM Latam 2024', unit: '%' },
      },
    },
    frameworks: ['COPC Inc.', 'SQM Group', 'CFI Group', 'HDI', 'Contact Babel'],
    certifications: ['COPC PSIC Standard', 'ISO 18295-1:2017'],
  },
};

export type OperationType = keyof typeof INDUSTRY_BENCHMARKS;

export function detectOperationType(context: string): OperationType {
  const lower = context.toLowerCase();
  if (
    lower.includes('cobr') ||
    lower.includes('pago') ||
    lower.includes('deuda') ||
    lower.includes('cartera') ||
    lower.includes('promesa')
  ) {
    return 'contact_center_cobranzas';
  }
  return 'contact_center_servicio';
}

export function generateBenchmarkContext(operationType: OperationType, country = 'colombia'): string {
  if (operationType === 'contact_center_cobranzas') {
    return `
## BENCHMARKS DE INDUSTRIA — CONTACT CENTER COBRANZAS
Fuentes institucionales: COPC Inc., SQM Group, Ernst & Young Collections, CCContact Colombia/ACDECC, Contact Babel.

### Tasa de Contacto Efectivo
- Colombia (CCContact 2024): P25=32% | P50=42% | P75=52%
- Latam (COPC/SQM 2024):    P25=35% | P50=45% | P75=55%
- Global (COPC 2024):        P25=40% | P50=52% | P75=65%
→ Cliente actual 43.1% → Percentil ~55 Latam | Percentil ~43 Global → BRECHA con líderes globales

### AHT (Tiempo Promedio de Atención)
- Colombia (CCContact 2024): P25=6.0 min | P50=7.8 min | P75=10.2 min
- Global (Contact Babel 2024): P25=4.8 min | P50=6.5 min | P75=9.0 min
→ Cliente actual 8.1 min → Por encima del P50 Colombia y del P75 Global → INEFICIENCIA operativa

### Tasa de Promesa de Pago (de contactos efectivos)
- Latam (E&Y 2023): P25=25% | P50=35% | P75=45%
- Global (E&Y 2023): P25=22% | P50=32% | P75=42%
→ Cliente actual 40% → PERCENTIL ~75 Latam → FORTALEZA — desempeño top quartile

### Utilización de Agentes
- Latam (COPC): P25=55% | P50=68% | P75=78%
→ Cliente: 81 activos de 162 (50% del pool) → Por debajo del P25 → ALERTA de subutilización

### Frameworks de referencia aplicables
COPC PSIC Standard, ISO 18295-1:2017, Ernst & Young Collections Benchmark, ACDECC Colombia

### Instrucción de uso de benchmarks para Vicky:
Cuando respondas sobre métricas, SIEMPRE posiciona al cliente vs. benchmarks:
Formato: "Tu [métrica] es X — [por encima/debajo] del benchmark [país/región] de Y (Fuente: Z, percentil ~N)"
Prioriza recomendaciones atacando primero las brechas más grandes vs. industria.
Si no tienes benchmark para una métrica específica, dilo explícitamente.
`;
  }

  return `
## BENCHMARKS DE INDUSTRIA — CONTACT CENTER SERVICIO
Fuentes: COPC Inc., SQM Group, CFI Group, Contact Babel.

### FCR (First Contact Resolution)
- Global (COPC/CFI 2024): P25=62% | P50=72% | P75=82%
- Latam (SQM 2024): P25=58% | P50=68% | P75=78%

### CSAT
- Global (SQM 2024): P25=72% | P50=80% | P75=88%
- Latam (SQM 2024): P25=68% | P50=76% | P75=85%

### AHT
- Global (Contact Babel 2024): P25=4.2 min | P50=5.8 min | P75=8.2 min
`;
}
