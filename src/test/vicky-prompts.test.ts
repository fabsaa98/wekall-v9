/**
 * vicky-prompts.test.ts
 * Tests de lógica de negocio y validación de datos que Vicky usa para responder
 * ~40 tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { OPS, LABOR_COSTS, calcularImpactoAHT, calcularImpactoContactRate, calcularImpactoAgentes, getCostoAgente } from '@/lib/vickyCalculations';

// ─── Helpers para validación de negocio ──────────────────────────────────────

function isAHTValido(aht: number): boolean {
  return aht >= 3 && aht <= 12;
}

function isTasaContactoValida(tasa: number): boolean {
  return tasa >= 0 && tasa <= 1;
}

function isAgentesValido(agentes: number): boolean {
  return Number.isInteger(agentes) && agentes > 0;
}

function convertirCOPaUSD(cop: number, trm: number): number {
  return Math.round(cop / trm);
}

function convertirUSDaCOP(usd: number, trm: number): number {
  return Math.round(usd * trm);
}

function formatearCOP(valor: number): string {
  return `COP $${valor.toLocaleString('es-CO')}`;
}

function formatearPorcentaje(valor: number, decimales = 1): string {
  return `${(valor * 100).toFixed(decimales)}%`;
}

function calcularNominaTotal(agentes: number, costoAgente: number): number {
  return agentes * costoAgente;
}

function esPorcentajeValido(p: number): boolean {
  return p >= 0 && p <= 1;
}

// ─── Validación de rangos operativos ─────────────────────────────────────────
describe('Validación de rangos operativos', () => {
  it('AHT de 3 min es válido', () => expect(isAHTValido(3)).toBe(true));
  it('AHT de 8 min es válido', () => expect(isAHTValido(8)).toBe(true));
  it('AHT de 12 min es válido', () => expect(isAHTValido(12)).toBe(true));
  it('AHT de 2.9 min es inválido', () => expect(isAHTValido(2.9)).toBe(false));
  it('AHT de 12.1 min es inválido', () => expect(isAHTValido(12.1)).toBe(false));
  it('AHT de 0 es inválido', () => expect(isAHTValido(0)).toBe(false));
  it('AHT negativo es inválido', () => expect(isAHTValido(-1)).toBe(false));

  it('tasa contacto 0% es válida', () => expect(isTasaContactoValida(0)).toBe(true));
  it('tasa contacto 43.1% es válida', () => expect(isTasaContactoValida(0.431)).toBe(true));
  it('tasa contacto 100% es válida', () => expect(isTasaContactoValida(1.0)).toBe(true));
  it('tasa contacto 101% es inválida', () => expect(isTasaContactoValida(1.01)).toBe(false));
  it('tasa contacto negativa es inválida', () => expect(isTasaContactoValida(-0.1)).toBe(false));

  it('1 agente es válido', () => expect(isAgentesValido(1)).toBe(true));
  it('81 agentes es válido', () => expect(isAgentesValido(81)).toBe(true));
  it('0 agentes es inválido', () => expect(isAgentesValido(0)).toBe(false));
  it('agentes negativos es inválido', () => expect(isAgentesValido(-5)).toBe(false));
  it('agentes decimales son inválidos', () => expect(isAgentesValido(81.5)).toBe(false));
});

// ─── Cálculos financieros consistentes ───────────────────────────────────────
describe('Consistencia de cálculos financieros', () => {
  beforeEach(() => {
    Object.assign(OPS, {
      ahtMinutos: 8.1,
      contactosEfectivos: 6952,
      llamadasTotales: 16129,
      tasaContacto: 0.431,
      tasaPromesa: 0.40,
      agentesActivos: 81,
      costoAgenteMes: 3_000_000,
      nominaActivaMes: 243_000_000,
      horasTrabajo: 8,
      diasLaborales: 22,
      p25Agentes: 120,
      p50Agentes: 200,
      p75Agentes: 280,
      p90Agentes: 340,
    });
  });

  it('ahorro AHT no supera nómina total', () => {
    const result = calcularImpactoAHT(4);
    expect(result.result).toBeLessThanOrEqual(OPS.nominaActivaMes);
  });

  it('ahorro AHT no es negativo', () => {
    const result = calcularImpactoAHT(5);
    expect(result.result).toBeGreaterThanOrEqual(0);
  });

  it('promesas contactRate no supera el máximo teórico', () => {
    const maxPromesas = OPS.llamadasTotales * 1.0 * OPS.tasaPromesa * OPS.diasLaborales;
    const result = calcularImpactoContactRate(0.9);
    expect(result.result).toBeLessThanOrEqual(maxPromesas);
  });

  it('nómina = agentes × costo individual', () => {
    const nominaCalculada = calcularNominaTotal(81, 3_000_000);
    expect(nominaCalculada).toBe(243_000_000);
  });

  it('costo por minuto se calcula correctamente', () => {
    const costoMinuto = OPS.costoAgenteMes / (OPS.diasLaborales * OPS.horasTrabajo * 60);
    expect(costoMinuto).toBeCloseTo(3_000_000 / (22 * 8 * 60), 2);
  });

  it('tasaContacto × llamadas ≈ contactosEfectivos', () => {
    const contactosCalculados = OPS.llamadasTotales * OPS.tasaContacto;
    const diff = Math.abs(contactosCalculados - OPS.contactosEfectivos);
    expect(diff).toBeLessThan(100); // margen de redondeo
  });
});

// ─── Conversiones de moneda ───────────────────────────────────────────────────
describe('Conversiones de moneda COP/USD', () => {
  const TRM = 4100;

  it('COP a USD — conversión básica', () => {
    expect(convertirCOPaUSD(4_100_000, TRM)).toBe(1000);
  });

  it('USD a COP — conversión básica', () => {
    expect(convertirUSDaCOP(1000, TRM)).toBe(4_100_000);
  });

  it('ida y vuelta COP→USD→COP preserva valor', () => {
    const originalCOP = 10_000_000;
    const usd = convertirCOPaUSD(originalCOP, TRM);
    const cop = convertirUSDaCOP(usd, TRM);
    expect(Math.abs(cop - originalCOP)).toBeLessThan(TRM); // diferencia < 1 USD
  });

  it('TRM de OPS es razonable (2000-8000)', () => {
    expect(OPS.trmCopUsd).toBeGreaterThan(2000);
    expect(OPS.trmCopUsd).toBeLessThan(8000);
  });

  it('costo agente colombia en USD es razonable (< $1500/mes)', () => {
    const usd = convertirCOPaUSD(LABOR_COSTS.colombia.costoEmpresaAgente, 4100);
    expect(usd).toBeLessThan(1500);
    expect(usd).toBeGreaterThan(100);
  });

  it('costo agente peru en USD es menor que colombia', () => {
    const colUsd = convertirCOPaUSD(LABOR_COSTS.colombia.costoEmpresaAgente, 4100);
    const perUsd = convertirCOPaUSD(LABOR_COSTS.peru.costoEmpresaAgente, 4100);
    expect(perUsd).toBeLessThan(colUsd);
  });
});

// ─── Lógica de percentiles ────────────────────────────────────────────────────
describe('Lógica de percentiles de agentes', () => {
  it('p25 < p50 < p75 < p90 con datos reales', () => {
    const p25 = 120, p50 = 200, p75 = 280, p90 = 340;
    expect(p25).toBeLessThan(p50);
    expect(p50).toBeLessThan(p75);
    expect(p75).toBeLessThan(p90);
  });

  it('calcular brecha p25→p50: diferencia correcta', () => {
    const p25 = 120, p50 = 200;
    expect(p50 - p25).toBe(80);
  });

  it('25% de 81 agentes ≈ 20', () => {
    const agentesP25 = Math.round(81 * 0.25);
    expect(agentesP25).toBe(20);
  });

  it('escenario p90 produce más promesas que p75', () => {
    Object.assign(OPS, {
      agentesActivos: 81, p25Agentes: 120, p50Agentes: 200, p75Agentes: 280, p90Agentes: 340,
      tasaContacto: 0.431, tasaPromesa: 0.40, llamadasTotales: 16129, diasLaborales: 22,
    });
    const r90 = calcularImpactoAgentes(90);
    const r75 = calcularImpactoAgentes(75);
    expect(r90.result).toBeGreaterThan(r75.result);
  });
});

// ─── Formato de números ───────────────────────────────────────────────────────
describe('Formato de números para display', () => {
  it('formatear 0 COP', () => {
    expect(formatearCOP(0)).toContain('0');
  });

  it('formatear 3,000,000 COP', () => {
    const str = formatearCOP(3_000_000);
    expect(str).toContain('COP');
    expect(str).toContain('3');
  });

  it('formatear porcentaje 43.1%', () => {
    expect(formatearPorcentaje(0.431)).toBe('43.1%');
  });

  it('formatear porcentaje 0%', () => {
    expect(formatearPorcentaje(0)).toBe('0.0%');
  });

  it('formatear porcentaje 100%', () => {
    expect(formatearPorcentaje(1.0)).toBe('100.0%');
  });

  it('porcentaje válido está entre 0 y 1', () => {
    expect(esPorcentajeValido(0)).toBe(true);
    expect(esPorcentajeValido(0.5)).toBe(true);
    expect(esPorcentajeValido(1.0)).toBe(true);
    expect(esPorcentajeValido(1.1)).toBe(false);
    expect(esPorcentajeValido(-0.1)).toBe(false);
  });
});

// ─── Manejo de resultados negativos / edge cases ──────────────────────────────
describe('Manejo de resultados negativos y edge cases', () => {
  beforeEach(() => {
    Object.assign(OPS, {
      ahtMinutos: 8.1, contactosEfectivos: 0, llamadasTotales: 0,
      tasaContacto: 0, tasaPromesa: 0, agentesActivos: 0,
      costoAgenteMes: 0, nominaActivaMes: 0,
      horasTrabajo: 8, diasLaborales: 22,
      p25Agentes: 0, p50Agentes: 0, p75Agentes: 0, p90Agentes: 0,
    });
  });

  it('calcularImpactoAHT con OPS en cero retorna result = 0', () => {
    const result = calcularImpactoAHT(5);
    expect(result.result).toBe(0);
  });

  it('calcularImpactoContactRate con OPS en cero retorna result = 0', () => {
    // tasaContacto = 0, objetivo = 0.5 > 0 → válido, pero cálculos dan 0
    const result = calcularImpactoContactRate(0.5);
    expect(result.result).toBe(0);
  });

  it('calcularImpactoAgentes con OPS en cero retorna result = 0', () => {
    const result = calcularImpactoAgentes(50);
    expect(result.result).toBe(0);
  });

  it('ningún cálculo retorna resultado negativo', () => {
    const aht = calcularImpactoAHT(5);
    const cr = calcularImpactoContactRate(0.5);
    const ag = calcularImpactoAgentes(75);
    expect(aht.result).toBeGreaterThanOrEqual(0);
    expect(cr.result).toBeGreaterThanOrEqual(0);
    expect(ag.result).toBeGreaterThanOrEqual(0);
  });
});
