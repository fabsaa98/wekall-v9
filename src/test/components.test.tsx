/**
 * components.test.tsx
 * Tests de componentes React básicos que no requieren Supabase/auth
 * ~30 tests
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SentimentBadge } from '@/components/SentimentBadge';
import { TagPill } from '@/components/TagPill';
import { SearchBar } from '@/components/SearchBar';
import { VerticalBadge } from '@/components/VerticalBadge';

// ─── Mock de módulos con dependencias externas ────────────────────────────────
// @phosphor-icons/react — iconos SVG; en jsdom no hay SVG real
vi.mock('@phosphor-icons/react', () => ({
  Smiley: ({ size }: { size?: number }) => <svg data-testid="icon-smiley" width={size} />,
  SmileyMeh: ({ size }: { size?: number }) => <svg data-testid="icon-smileymeh" width={size} />,
  SmileyAngry: ({ size }: { size?: number }) => <svg data-testid="icon-smileyangry" width={size} />,
  SmileyXEyes: ({ size }: { size?: number }) => <svg data-testid="icon-smileyxeyes" width={size} />,
  Sparkle: ({ size }: { size?: number }) => <svg data-testid="icon-sparkle" width={size} />,
  X: ({ size }: { size?: number }) => <svg data-testid="icon-x" width={size} />,
  MagnifyingGlass: ({ size }: { size?: number }) => <svg data-testid="icon-search" width={size} />,
}));

// ─── SentimentBadge ───────────────────────────────────────────────────────────
describe('SentimentBadge', () => {
  it('renderiza sin errores con sentiment=positive', () => {
    const { container } = render(<SentimentBadge sentiment="positive" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renderiza sin errores con sentiment=negative', () => {
    const { container } = render(<SentimentBadge sentiment="negative" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renderiza sin errores con sentiment=neutral', () => {
    const { container } = render(<SentimentBadge sentiment="neutral" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renderiza sin errores con sentiment=mixed', () => {
    const { container } = render(<SentimentBadge sentiment="mixed" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('muestra texto "Positivo" para sentiment=positive', () => {
    render(<SentimentBadge sentiment="positive" />);
    expect(screen.getByText('Positivo')).toBeTruthy();
  });

  it('muestra texto "Negativo" para sentiment=negative', () => {
    render(<SentimentBadge sentiment="negative" />);
    expect(screen.getByText('Negativo')).toBeTruthy();
  });

  it('muestra texto "Neutro" para sentiment=neutral', () => {
    render(<SentimentBadge sentiment="neutral" />);
    expect(screen.getByText('Neutro')).toBeTruthy();
  });

  it('muestra texto "Mixto" para sentiment=mixed', () => {
    render(<SentimentBadge sentiment="mixed" />);
    expect(screen.getByText('Mixto')).toBeTruthy();
  });

  it('tamaño sm aplica clases más pequeñas', () => {
    const { container } = render(<SentimentBadge sentiment="positive" size="sm" />);
    expect(container.innerHTML).toContain('px-2');
  });

  it('tamaño md es el default', () => {
    const { container } = render(<SentimentBadge sentiment="positive" />);
    expect(container.innerHTML).toContain('px-2.5');
  });
});

// ─── TagPill ──────────────────────────────────────────────────────────────────
describe('TagPill', () => {
  it('renderiza sin errores con source=ai', () => {
    const { container } = render(<TagPill label="cobranza" source="ai" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renderiza sin errores con source=manual', () => {
    const { container } = render(<TagPill label="urgente" source="manual" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('muestra el label correctamente', () => {
    render(<TagPill label="mi-tag" source="ai" />);
    expect(screen.getByText('mi-tag')).toBeTruthy();
  });

  it('muestra ícono sparkle para source=ai', () => {
    render(<TagPill label="tag" source="ai" />);
    expect(screen.getByTestId('icon-sparkle')).toBeTruthy();
  });

  it('NO muestra ícono sparkle para source=manual', () => {
    render(<TagPill label="tag" source="manual" />);
    expect(screen.queryByTestId('icon-sparkle')).toBeNull();
  });

  it('muestra botón de remover cuando se provee onRemove', () => {
    const onRemove = vi.fn();
    render(<TagPill label="tag" source="ai" onRemove={onRemove} />);
    expect(screen.getByTestId('icon-x')).toBeTruthy();
  });

  it('NO muestra botón de remover sin onRemove', () => {
    render(<TagPill label="tag" source="ai" />);
    expect(screen.queryByTestId('icon-x')).toBeNull();
  });

  it('llama onRemove al hacer click en X', () => {
    const onRemove = vi.fn();
    render(<TagPill label="tag" source="ai" onRemove={onRemove} />);
    const btn = screen.getByTestId('icon-x').closest('button');
    expect(btn).not.toBeNull();
    fireEvent.click(btn!);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('label vacío renderiza sin errores', () => {
    const { container } = render(<TagPill label="" source="manual" />);
    expect(container.firstChild).toBeTruthy();
  });
});

// ─── SearchBar ────────────────────────────────────────────────────────────────
describe('SearchBar', () => {
  it('renderiza sin errores', () => {
    const { container } = render(<SearchBar value="" onChange={() => {}} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('muestra el input con value correcto', () => {
    render(<SearchBar value="test" onChange={() => {}} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('test');
  });

  it('llama onChange al escribir', () => {
    const onChange = vi.fn();
    render(<SearchBar value="" onChange={onChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'nuevo' } });
    expect(onChange).toHaveBeenCalledWith('nuevo');
  });

  it('muestra placeholder por defecto "Buscar..."', () => {
    render(<SearchBar value="" onChange={() => {}} />);
    const input = screen.getByPlaceholderText('Buscar...');
    expect(input).toBeTruthy();
  });

  it('muestra placeholder personalizado', () => {
    render(<SearchBar value="" onChange={() => {}} placeholder="Buscar agentes..." />);
    const input = screen.getByPlaceholderText('Buscar agentes...');
    expect(input).toBeTruthy();
  });

  it('aplica className adicional', () => {
    const { container } = render(<SearchBar value="" onChange={() => {}} className="mi-clase" />);
    expect(container.innerHTML).toContain('mi-clase');
  });

  it('muestra ícono de búsqueda', () => {
    render(<SearchBar value="" onChange={() => {}} />);
    expect(screen.getByTestId('icon-search')).toBeTruthy();
  });
});

// ─── VerticalBadge ────────────────────────────────────────────────────────────
describe('VerticalBadge', () => {
  it('renderiza ventas sin errores', () => {
    const { container } = render(<VerticalBadge vertical="ventas" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renderiza servicio_cx sin errores', () => {
    const { container } = render(<VerticalBadge vertical="servicio_cx" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renderiza cobranzas sin errores', () => {
    const { container } = render(<VerticalBadge vertical="cobranzas" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('muestra label "Ventas" para vertical=ventas', () => {
    render(<VerticalBadge vertical="ventas" />);
    expect(screen.getByText('Ventas')).toBeTruthy();
  });

  it('muestra label "Servicio CX" para vertical=servicio_cx', () => {
    render(<VerticalBadge vertical="servicio_cx" />);
    expect(screen.getByText('Servicio CX')).toBeTruthy();
  });

  it('muestra label "Cobranzas" para vertical=cobranzas', () => {
    render(<VerticalBadge vertical="cobranzas" />);
    expect(screen.getByText('Cobranzas')).toBeTruthy();
  });

  it('aplica className adicional', () => {
    const { container } = render(<VerticalBadge vertical="ventas" className="extra-class" />);
    expect(container.innerHTML).toContain('extra-class');
  });
});
