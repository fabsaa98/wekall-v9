/**
 * vickyCalculations.test.ts
 * Tests exhaustivos del motor de cálculo determinístico de Vicky
 * ~80 tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calcularImpactoAHT,
  calcularImpactoContactRate,
  calcularImpactoAgentes,
  getCostoAgente,
  getEstadoOperativo,
  loadClientConfig,
  LABOR_COSTS,
  OPS,
} from '@/lib/vickyCalculations';

// ─── Mock de Supabase para loadClientConfig ───────────────────────────────────
vi.mock('@/lib/supabase', () => ({
  getActiveClientConfig: vi.fn(),
}));
import { getActiveClientConfig } from '@/lib/supabase';

// Helper para configurar OPS con datos reales de prueba
function setOPS(overrides: Partial<typeof OPS>) {
  Object.assign(OPS, overrides);
}

function resetOPS() {
  Object.assign(OPS, {
    llamadasTotales: 0,
    contactosEfectivos: 0,
    tasaContacto: 0,
    promesasPago: 0,
    tasaPromesa: 0,
    agentesActivos: 0,
    promedioLlamadasAgente: 0,
    p10Agentes: 0,
    p25Agentes: 0,
    p50Agentes: 0,
    p75Agentes: 0,
    p90Agentes: 0,
    topAgente: 0,
    ahtMinutos: 0,
    horasTrabajo: 8,
    diasLaborales: 22,
    costoAgenteMes: 0,
    nominaActivaMes: 0,
    costoAgentePorMinuto: 0,
    currency: 'COP',
    country: 'colombia',
    trmCopUsd: 4100,
  });
}

// ─── LABOR_COSTS ─────────────────────────────────────────────────────────────
describe('LABOR_COSTS', () => {
  it('debe contener colombia con campos requeridos', () => {
    expect(LABOR_COSTS.colombia).toBeDefined();
    expect(LABOR_COSTS.colombia.salarioMinimo2024).toBeTypeOf('number');
    expect(LABOR_COSTS.colombia.costoEmpresaAgente).toBeTypeOf('number');
    expect(LABOR_COSTS.colombia.moneda).toBe('COP');
    expect(LABOR_COSTS.colombia.fuente).toBeTypeOf('string');
  });

  it('debe contener peru con campos requeridos', () => {
    expect(LABOR_COSTS.peru).toBeDefined();
    expect(LABOR_COSTS.peru.salarioMinimo2024).toBeTypeOf('number');
    expect(LABOR_COSTS.peru.costoEmpresaAgente).toBeTypeOf('number');
    expect(LABOR_COSTS.peru.moneda).toBe('PEN');
    expect(LABOR_COSTS.peru.fuente).toBeTypeOf('string');
    expect(LABOR_COSTS.peru.nota).toBeTypeOf('string');
  });

  it('debe contener referencia_latam con rango', () => {
    expect(LABOR_COSTS.referencia_latam).toBeDefined();
    expect(LABOR_COSTS.referencia_latam.rangoMinimo).toBeTypeOf('number');
    expect(LABOR_COSTS.referencia_latam.rangoMaximo).toBeTypeOf('number');
    expect(LABOR_COSTS.referencia_latam.rangoMinimo).toBeLessThan(LABOR_COSTS.referencia_latam.rangoMaximo);
  });

  it('costo colombia debe ser mayor al de peru', () => {
    expect(LABOR_COSTS.colombia.costoEmpresaAgente).toBeGreaterThan(LABOR_COSTS.peru.costoEmpresaAgente);
  });

  it('rango latam debe encapsular los costos individuales', () => {
    expect(LABOR_COSTS.colombia.costoEmpresaAgente).toBeGreaterThanOrEqual(LABOR_COSTS.referencia_latam.rangoMinimo);
    expect(LABOR_COSTS.colombia.costoEmpresaAgente).toBeLessThanOrEqual(LABOR_COSTS.referencia_latam.rangoMaximo);
  });
});

// ─── OPS — Estado inicial ─────────────────────────────────────────────────────
describe('OPS — estado inicial (sin Supabase)', () => {
  beforeEach(() => resetOPS());

  it('llamadasTotales debe ser 0 en estado inicial', () => {
    expect(OPS.llamadasTotales).toBe(0);
  });

  it('contactosEfectivos debe ser 0 en estado inicial', () => {
    expect(OPS.contactosEfectivos).toBe(0);
  });

  it('agentesActivos debe ser 0 en estado inicial', () => {
    expect(OPS.agentesActivos).toBe(0);
  });

  it('costoAgenteMes debe ser 0 en estado inicial', () => {
    expect(OPS.costoAgenteMes).toBe(0);
  });

  it('nominaActivaMes debe ser 0 en estado inicial', () => {
    expect(OPS.nominaActivaMes).toBe(0);
  });

  it('horasTrabajo por defecto es 8', () => {
    expect(OPS.horasTrabajo).toBe(8);
  });

  it('diasLaborales por defecto es 22', () => {
    expect(OPS.diasLaborales).toBe(22);
  });

  it('currency por defecto es COP', () => {
    expect(OPS.currency).toBe('COP');
  });

  it('country por defecto es colombia', () => {
    expect(OPS.country).toBe('colombia');
  });

  it('trmCopUsd debe ser un valor razonable', () => {
    expect(OPS.trmCopUsd).toBeGreaterThan(1000);
    expect(OPS.trmCopUsd).toBeLessThan(10000);
  });
});

// ─── getCostoAgente ───────────────────────────────────────────────────────────
describe('getCostoAgente', () => {
  it('colombia — retorna costo correcto', () => {
    const result = getCostoAgente('colombia');
    expect(result.costo).toBe(3_000_000);
    expect(result.moneda).toBe('COP');
    expect(result.esEstimacion).toBe(false);
  });

  it('colombia — fuente es string no vacío', () => {
    const result = getCostoAgente('colombia');
    expect(result.fuente).toBeTruthy();
    expect(result.fuente.length).toBeGreaterThan(10);
  });

  it('peru — retorna costo correcto', () => {
    const result = getCostoAgente('peru');
    expect(result.costo).toBe(1_600_000);
    expect(result.moneda).toBe('COP');
    expect(result.esEstimacion).toBe(true);
  });

  it('peru — fuente menciona perú', () => {
    const result = getCostoAgente('peru');
    expect(result.fuente.toLowerCase()).toContain('per');
  });

  it('país desconocido — usa estimación latam', () => {
    const result = getCostoAgente('argentina');
    expect(result.costo).toBe(2_000_000);
    expect(result.moneda).toBe('COP');
    expect(result.esEstimacion).toBe(true);
  });

  it('país desconocido — fuente menciona latam', () => {
    const result = getCostoAgente('ecuador');
    expect(result.fuente.toLowerCase()).toContain('latam');
  });

  it('costo colombia > peru > desconocido (latam)', () => {
    // Colombia tiene costo más alto que estimación latam
    expect(getCostoAgente('colombia').costo).toBeGreaterThan(getCostoAgente('mexico').costo);
  });
});

// ─── getEstadoOperativo ───────────────────────────────────────────────────────
describe('getEstadoOperativo', () => {
  it('retorna un objeto', () => {
    const estado = getEstadoOperativo();
    expect(estado).toBeTypeOf('object');
    expect(estado).not.toBeNull();
  });

  it('retorna llamadasTotales', () => {
    expect(getEstadoOperativo()).toHaveProperty('llamadasTotales');
  });

  it('retorna contactosEfectivos', () => {
    expect(getEstadoOperativo()).toHaveProperty('contactosEfectivos');
  });

  it('retorna tasaContacto como string', () => {
    const estado = getEstadoOperativo();
    expect(typeof estado.tasaContacto).toBe('string');
  });

  it('retorna promesasPago', () => {
    expect(getEstadoOperativo()).toHaveProperty('promesasPago');
  });

  it('retorna tasaPromesa como string con %', () => {
    const estado = getEstadoOperativo();
    expect(String(estado.tasaPromesa)).toContain('%');
  });

  it('retorna aht como string con min', () => {
    const estado = getEstadoOperativo();
    expect(String(estado.aht)).toContain('min');
  });

  it('retorna agentesActivos', () => {
    expect(getEstadoOperativo()).toHaveProperty('agentesActivos');
  });

  it('retorna p25, p50, p75 como strings', () => {
    const estado = getEstadoOperativo();
    expect(typeof estado.p25Agentes).toBe('string');
    expect(typeof estado.p50Agentes).toBe('string');
    expect(typeof estado.p75Agentes).toBe('string');
  });

  it('retorna nominaActivaMes con COP', () => {
    const estado = getEstadoOperativo();
    expect(String(estado.nominaActivaMes)).toContain('COP');
  });

  it('retorna costoAgenteMes con COP', () => {
    const estado = getEstadoOperativo();
    expect(String(estado.costoAgenteMes)).toContain('COP');
  });

  it('tiene 13 claves', () => {
    const estado = getEstadoOperativo();
    expect(Object.keys(estado).length).toBe(13);
  });
});

// ─── calcularImpactoAHT ───────────────────────────────────────────────────────
describe('calcularImpactoAHT — validación de rango', () => {
  beforeEach(() => resetOPS());

  it('AHT < 3 retorna validation.ok = false', () => {
    const result = calcularImpactoAHT(2);
    expect(result.validation.ok).toBe(false);
  });

  it('AHT > 12 retorna validation.ok = false', () => {
    const result = calcularImpactoAHT(13);
    expect(result.validation.ok).toBe(false);
  });

  it('AHT = 2.9 retorna result = 0', () => {
    const result = calcularImpactoAHT(2.9);
    expect(result.result).toBe(0);
  });

  it('AHT = 12.1 retorna result = 0', () => {
    const result = calcularImpactoAHT(12.1);
    expect(result.result).toBe(0);
  });

  it('mensaje de validación menciona rango 3-12', () => {
    const result = calcularImpactoAHT(1);
    expect(result.validation.message).toContain('3');
    expect(result.validation.message).toContain('12');
  });

  it('AHT negativo retorna validation.ok = false', () => {
    const result = calcularImpactoAHT(-1);
    expect(result.validation.ok).toBe(false);
  });

  it('AHT = 0 retorna validation.ok = false', () => {
    const result = calcularImpactoAHT(0);
    expect(result.validation.ok).toBe(false);
  });
});

describe('calcularImpactoAHT — AHT mayor al actual', () => {
  beforeEach(() => {
    resetOPS();
    setOPS({ ahtMinutos: 8, contactosEfectivos: 1000, agentesActivos: 81, costoAgenteMes: 3_000_000, nominaActivaMes: 243_000_000 });
  });

  it('AHT objetivo mayor al actual retorna validation.ok = false', () => {
    const result = calcularImpactoAHT(9); // actual = 8
    expect(result.validation.ok).toBe(false);
  });

  it('AHT objetivo igual al actual retorna result = 0', () => {
    const result = calcularImpactoAHT(8);
    expect(result.result).toBe(0);
  });

  it('mensaje menciona que AHT debe ser menor al actual', () => {
    const result = calcularImpactoAHT(9);
    expect(result.validation.message.toLowerCase()).toMatch(/mayor|objetivo|actual/);
  });
});

describe('calcularImpactoAHT — valores válidos', () => {
  beforeEach(() => {
    resetOPS();
    setOPS({
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
    });
  });

  it('AHT = 4 — retorna result > 0', () => {
    const result = calcularImpactoAHT(4);
    expect(result.result).toBeGreaterThan(0);
  });

  it('AHT = 5 — retorna result > 0', () => {
    const result = calcularImpactoAHT(5);
    expect(result.result).toBeGreaterThan(0);
  });

  it('AHT = 6 — retorna result > 0', () => {
    const result = calcularImpactoAHT(6);
    expect(result.result).toBeGreaterThan(0);
  });

  it('AHT = 7 — retorna result > 0', () => {
    const result = calcularImpactoAHT(7);
    expect(result.result).toBeGreaterThan(0);
  });

  it('AHT = 3 (borde inferior) — retorna result > 0', () => {
    const result = calcularImpactoAHT(3);
    expect(result.result).toBeGreaterThan(0);
  });

  it('menor AHT objetivo = mayor ahorro', () => {
    const result4 = calcularImpactoAHT(4);
    const result6 = calcularImpactoAHT(6);
    expect(result4.result).toBeGreaterThan(result6.result);
  });

  it('result es un número entero (Math.round)', () => {
    const result = calcularImpactoAHT(5);
    expect(Number.isInteger(result.result)).toBe(true);
  });

  it('retorna campo formula correcto', () => {
    const result = calcularImpactoAHT(5);
    expect(result.formula).toBe('calcularImpactoAHT');
  });

  it('retorna campo unit', () => {
    const result = calcularImpactoAHT(5);
    expect(result.unit).toContain('COP');
  });

  it('retorna steps con al menos 4 pasos', () => {
    const result = calcularImpactoAHT(5);
    expect(result.steps.length).toBeGreaterThanOrEqual(4);
  });

  it('retorna scenarios con Escenario A y B', () => {
    const result = calcularImpactoAHT(5);
    expect(result.scenarios).toBeDefined();
    expect(Object.keys(result.scenarios!).some(k => k.includes('A'))).toBe(true);
    expect(Object.keys(result.scenarios!).some(k => k.includes('B'))).toBe(true);
  });

  it('variables contiene AHT actual y objetivo', () => {
    const result = calcularImpactoAHT(5);
    const keys = Object.keys(result.variables);
    expect(keys.some(k => k.toLowerCase().includes('actual'))).toBe(true);
    expect(keys.some(k => k.toLowerCase().includes('objetivo'))).toBe(true);
  });

  it('ahorro no supera la nómina total', () => {
    const result = calcularImpactoAHT(4);
    expect(result.result).toBeLessThanOrEqual(OPS.nominaActivaMes);
  });

  it('AHT = 8 (borde igual al actual 8.1) — diferencia pequeña > 0', () => {
    const result = calcularImpactoAHT(8);
    expect(result.result).toBeGreaterThan(0);
  });
});

// ─── calcularImpactoContactRate ──────────────────────────────────────────────
describe('calcularImpactoContactRate — validación', () => {
  beforeEach(() => {
    resetOPS();
    setOPS({
      tasaContacto: 0.431,
      llamadasTotales: 16129,
      contactosEfectivos: 6952,
      tasaPromesa: 0.40,
      promesasPago: 2780,
      diasLaborales: 22,
    });
  });

  it('tasa <= actual retorna validation.ok = false', () => {
    const result = calcularImpactoContactRate(0.3);
    expect(result.validation.ok).toBe(false);
  });

  it('tasa = actual exacta retorna validation.ok = false', () => {
    const result = calcularImpactoContactRate(0.431);
    expect(result.validation.ok).toBe(false);
  });

  it('tasa > 1 retorna validation.ok = false', () => {
    const result = calcularImpactoContactRate(1.1);
    expect(result.validation.ok).toBe(false);
  });

  it('tasa inválida retorna result = 0', () => {
    const result = calcularImpactoContactRate(0.2);
    expect(result.result).toBe(0);
  });

  it('tasa 0.5 válida — retorna result > 0', () => {
    const result = calcularImpactoContactRate(0.5);
    expect(result.result).toBeGreaterThan(0);
  });

  it('tasa 0.6 válida — retorna result > 0', () => {
    const result = calcularImpactoContactRate(0.6);
    expect(result.result).toBeGreaterThan(0);
  });

  it('tasa 0.7 válida — retorna result > 0', () => {
    const result = calcularImpactoContactRate(0.7);
    expect(result.result).toBeGreaterThan(0);
  });

  it('tasa 0.8 válida — retorna result > 0', () => {
    const result = calcularImpactoContactRate(0.8);
    expect(result.result).toBeGreaterThan(0);
  });

  it('mayor tasa objetivo = más promesas adicionales', () => {
    const r7 = calcularImpactoContactRate(0.7);
    const r6 = calcularImpactoContactRate(0.6);
    expect(r7.result).toBeGreaterThan(r6.result);
  });

  it('result es entero', () => {
    const result = calcularImpactoContactRate(0.6);
    expect(Number.isInteger(result.result)).toBe(true);
  });

  it('retorna unit con promesas', () => {
    const result = calcularImpactoContactRate(0.6);
    expect(result.unit.toLowerCase()).toContain('promesas');
  });

  it('retorna steps con al menos 4 pasos', () => {
    const result = calcularImpactoContactRate(0.6);
    expect(result.steps.length).toBeGreaterThanOrEqual(4);
  });

  it('retorna formula correcto', () => {
    const result = calcularImpactoContactRate(0.6);
    expect(result.formula).toBe('calcularImpactoContactRate');
  });

  it('tasa = 1.0 (100%) es válida', () => {
    // 1.0 > tasaContacto(0.431) AND 1.0 <= 1 → válido
    const result = calcularImpactoContactRate(1.0);
    expect(result.result).toBeGreaterThan(0);
  });
});

// ─── calcularImpactoAgentes ───────────────────────────────────────────────────
describe('calcularImpactoAgentes', () => {
  beforeEach(() => {
    resetOPS();
    setOPS({
      agentesActivos: 81,
      p25Agentes: 120,
      p50Agentes: 200,
      p75Agentes: 280,
      p90Agentes: 340,
      topAgente: 400,
      tasaContacto: 0.431,
      tasaPromesa: 0.40,
      llamadasTotales: 16129,
      diasLaborales: 22,
    });
  });

  it('percentil 50 — retorna result >= 0', () => {
    const result = calcularImpactoAgentes(50);
    expect(result.result).toBeGreaterThanOrEqual(0);
  });

  it('percentil 75 — retorna result >= 0', () => {
    const result = calcularImpactoAgentes(75);
    expect(result.result).toBeGreaterThanOrEqual(0);
  });

  it('percentil 90 — retorna result >= 0', () => {
    const result = calcularImpactoAgentes(90);
    expect(result.result).toBeGreaterThanOrEqual(0);
  });

  it('percentil 90 da más promesas que percentil 50', () => {
    const r90 = calcularImpactoAgentes(90);
    const r50 = calcularImpactoAgentes(50);
    expect(r90.result).toBeGreaterThan(r50.result);
  });

  it('percentil 75 da más promesas que percentil 50', () => {
    const r75 = calcularImpactoAgentes(75);
    const r50 = calcularImpactoAgentes(50);
    expect(r75.result).toBeGreaterThan(r50.result);
  });

  it('retorna formula correcto', () => {
    const result = calcularImpactoAgentes(50);
    expect(result.formula).toBe('calcularImpactoAgentes');
  });

  it('retorna unit con promesas', () => {
    const result = calcularImpactoAgentes(50);
    expect(result.unit.toLowerCase()).toContain('promesas');
  });

  it('retorna steps con al menos 4 pasos', () => {
    const result = calcularImpactoAgentes(75);
    expect(result.steps.length).toBeGreaterThanOrEqual(4);
  });

  it('variables contiene percentil objetivo', () => {
    const result = calcularImpactoAgentes(75);
    expect(result.variables['Percentil objetivo']).toBe(75);
  });

  it('variables contiene volumen objetivo correcto para P75', () => {
    const result = calcularImpactoAgentes(75);
    expect(result.variables['Volumen objetivo']).toContain('280');
  });

  it('result es entero', () => {
    const result = calcularImpactoAgentes(50);
    expect(Number.isInteger(result.result)).toBe(true);
  });

  it('retorna scenarios', () => {
    const result = calcularImpactoAgentes(75);
    expect(result.scenarios).toBeDefined();
    expect(Object.keys(result.scenarios!).length).toBeGreaterThan(0);
  });

  it('percentil desconocido usa p50 por defecto', () => {
    const r99 = calcularImpactoAgentes(99);
    const r50 = calcularImpactoAgentes(50);
    expect(r99.result).toBe(r50.result);
  });
});

// ─── loadClientConfig ─────────────────────────────────────────────────────────
describe('loadClientConfig', () => {
  beforeEach(() => {
    resetOPS();
    vi.clearAllMocks();
  });

  it('retorna true cuando Supabase devuelve config', async () => {
    vi.mocked(getActiveClientConfig).mockResolvedValueOnce({
      agentes_activos: 100,
      costo_agente_mes: 3_500_000,
      nomina_total_mes: 350_000_000,
      currency: 'COP',
      country: 'colombia',
    } as ReturnType<typeof getActiveClientConfig> extends Promise<infer T> ? T : never);

    const result = await loadClientConfig();
    expect(result).toBe(true);
  });

  it('actualiza OPS.agentesActivos desde Supabase', async () => {
    vi.mocked(getActiveClientConfig).mockResolvedValueOnce({
      agentes_activos: 120,
      costo_agente_mes: 3_000_000,
      nomina_total_mes: 360_000_000,
      currency: 'COP',
      country: 'colombia',
    } as ReturnType<typeof getActiveClientConfig> extends Promise<infer T> ? T : never);

    await loadClientConfig();
    expect(OPS.agentesActivos).toBe(120);
  });

  it('actualiza OPS.costoAgenteMes desde Supabase', async () => {
    vi.mocked(getActiveClientConfig).mockResolvedValueOnce({
      agentes_activos: 80,
      costo_agente_mes: 4_000_000,
      nomina_total_mes: 320_000_000,
      currency: 'COP',
      country: 'colombia',
    } as ReturnType<typeof getActiveClientConfig> extends Promise<infer T> ? T : never);

    await loadClientConfig();
    expect(OPS.costoAgenteMes).toBe(4_000_000);
  });

  it('retorna false cuando Supabase retorna null', async () => {
    vi.mocked(getActiveClientConfig).mockResolvedValueOnce(null);
    const result = await loadClientConfig();
    expect(result).toBe(false);
  });

  it('retorna false cuando Supabase lanza error', async () => {
    vi.mocked(getActiveClientConfig).mockRejectedValueOnce(new Error('Network error'));
    const result = await loadClientConfig();
    expect(result).toBe(false);
  });

  it('no lanza excepción cuando Supabase falla', async () => {
    vi.mocked(getActiveClientConfig).mockRejectedValueOnce(new Error('Supabase offline'));
    await expect(loadClientConfig()).resolves.toBe(false);
  });
});
