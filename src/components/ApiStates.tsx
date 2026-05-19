/**
 * Componentes UI consistentes para estados loading / empty / error.
 *
 * Sprint 2 · P2-7. Usados junto con useApiCall() para uniformar la presentación.
 */

import React from 'react';

export function ApiLoading({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-10" role="status" aria-label={label}>
      <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function ApiEmpty({
  title = 'Sin datos para mostrar',
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="text-center py-10 text-gray-400" role="status">
      <p className="text-base font-medium">{title}</p>
      {description ? <p className="text-sm mt-1 text-gray-500">{description}</p> : null}
    </div>
  );
}

export function ApiError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="text-center py-10 text-red-400" role="alert">
      <p className="text-base font-medium">Algo salió mal</p>
      <p className="text-sm mt-1 text-gray-400">{message}</p>
      {onRetry ? (
        <button
          onClick={onRetry}
          className="mt-3 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Reintentar
        </button>
      ) : null}
    </div>
  );
}

/**
 * Convenience wrapper que despacha según el estado.
 */
export function ApiStateView<T>({
  state,
  data,
  error,
  onRetry,
  loadingLabel,
  emptyTitle,
  emptyDescription,
  children,
}: {
  state: 'idle' | 'loading' | 'success' | 'error' | 'empty';
  data: T | null;
  error: string | null;
  onRetry?: () => void;
  loadingLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  children: (data: T) => React.ReactNode;
}) {
  if (state === 'loading' || state === 'idle') return <ApiLoading label={loadingLabel} />;
  if (state === 'error') return <ApiError message={error || 'Error'} onRetry={onRetry} />;
  if (state === 'empty') return <ApiEmpty title={emptyTitle} description={emptyDescription} />;
  if (state === 'success' && data !== null) return <>{children(data)}</>;
  return null;
}
