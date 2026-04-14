/**
 * utils.test.ts
 * Tests de funciones en src/lib/utils.ts
 * La función principal es `cn` (clsx + tailwind-merge)
 * ~30 tests
 */
import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn — fusión de clases CSS', () => {
  // ─── Casos básicos ────────────────────────────────────────────────────────

  it('retorna string con una clase', () => {
    expect(cn('foo')).toBe('foo');
  });

  it('concatena dos clases', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('concatena múltiples clases', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('retorna string vacío sin argumentos', () => {
    expect(cn()).toBe('');
  });

  it('ignora valores falsy — undefined', () => {
    expect(cn('foo', undefined)).toBe('foo');
  });

  it('ignora valores falsy — null', () => {
    expect(cn('foo', null)).toBe('foo');
  });

  it('ignora valores falsy — false', () => {
    expect(cn('foo', false)).toBe('foo');
  });

  it('ignora valores falsy — string vacío', () => {
    expect(cn('foo', '')).toBe('foo');
  });

  // ─── Condicionales (clsx) ─────────────────────────────────────────────────

  it('incluye clase cuando condición es true', () => {
    expect(cn('base', true && 'active')).toBe('base active');
  });

  it('excluye clase cuando condición es false', () => {
    expect(cn('base', false && 'active')).toBe('base');
  });

  it('soporta objeto con condiciones', () => {
    expect(cn({ foo: true, bar: false })).toBe('foo');
  });

  it('soporta objeto con múltiples true', () => {
    expect(cn({ foo: true, bar: true })).toBe('foo bar');
  });

  it('soporta objeto con todos false', () => {
    expect(cn({ foo: false, bar: false })).toBe('');
  });

  it('combina strings y objetos', () => {
    expect(cn('base', { active: true, disabled: false })).toBe('base active');
  });

  it('soporta arrays de clases', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
  });

  it('arrays con condicionales', () => {
    expect(cn(['foo', false && 'bar'])).toBe('foo');
  });

  // ─── Tailwind Merge ───────────────────────────────────────────────────────

  it('resuelve conflicto de padding (tw-merge)', () => {
    // tailwind-merge deduplica clases conflictivas — la última gana
    const result = cn('p-4', 'p-2');
    expect(result).toBe('p-2');
  });

  it('resuelve conflicto de texto (tw-merge)', () => {
    const result = cn('text-sm', 'text-lg');
    expect(result).toBe('text-lg');
  });

  it('resuelve conflicto de background (tw-merge)', () => {
    const result = cn('bg-red-500', 'bg-blue-500');
    expect(result).toBe('bg-blue-500');
  });

  it('mantiene clases no conflictivas', () => {
    const result = cn('p-4', 'text-sm', 'font-bold');
    expect(result).toBe('p-4 text-sm font-bold');
  });

  it('resuelve conflicto de margen', () => {
    const result = cn('m-4', 'm-2');
    expect(result).toBe('m-2');
  });

  it('clases de borde no conflictivas se mantienen', () => {
    const result = cn('border', 'rounded');
    expect(result).toContain('border');
    expect(result).toContain('rounded');
  });

  // ─── Casos edge ───────────────────────────────────────────────────────────

  it('retorna string (nunca undefined)', () => {
    expect(typeof cn()).toBe('string');
    expect(typeof cn(undefined, null, false)).toBe('string');
  });

  it('maneja clase con espacios extra', () => {
    const result = cn('  foo  ');
    expect(result.trim()).toBe('foo');
  });

  it('maneja números (clsx los ignora)', () => {
    // clsx acepta valores numéricos como clases vacías
    const result = cn('foo', 0 as unknown as string);
    expect(result).toBe('foo');
  });

  it('funciona con clases dinámicas basadas en estado', () => {
    const isActive = true;
    const isDisabled = false;
    const result = cn(
      'btn',
      isActive && 'btn-active',
      isDisabled && 'btn-disabled',
    );
    expect(result).toBe('btn btn-active');
  });

  it('escenario real: clases de KPICard', () => {
    const result = cn(
      'kpi-card rounded-xl border border-border bg-card p-5',
      true ? 'cursor-pointer hover:border-primary/40' : 'cursor-default',
      'custom-class',
    );
    expect(result).toContain('kpi-card');
    expect(result).toContain('cursor-pointer');
    expect(result).toContain('custom-class');
  });

  it('escenario real: clases de SentimentBadge', () => {
    const result = cn('inline-flex items-center gap-1.5 rounded-full font-medium', 'bg-wk-green/10 text-wk-green-dark', 'px-2.5 py-1 text-xs');
    expect(result).toContain('inline-flex');
    expect(result).toContain('bg-wk-green/10');
  });
});
