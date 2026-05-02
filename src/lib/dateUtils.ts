// Scale-H US-EI-007: Date formatting utilities
// 01 de mayo de 2026

/**
 * Formatea timestamp a formato relativo en español
 * "Hace 5 minutos", "Hace 2 horas", "Hace 3 días", etc.
 */
export function formatRelativeTime(timestamp: string | Date): string {
  const now = new Date();
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'Hace un momento';
  }

  if (diffMinutes < 60) {
    return `Hace ${diffMinutes} ${diffMinutes === 1 ? 'minuto' : 'minutos'}`;
  }

  if (diffHours < 24) {
    return `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
  }

  if (diffDays < 7) {
    return `Hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
  }

  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `Hace ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
  }

  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `Hace ${months} ${months === 1 ? 'mes' : 'meses'}`;
  }

  const years = Math.floor(diffDays / 365);
  return `Hace ${years} ${years === 1 ? 'año' : 'años'}`;
}

/**
 * Agrupa documentos por período
 * "Hoy", "Ayer", "Esta semana", "Este mes", "Más antiguo"
 */
export type DateGroup = 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'older';

export function getDateGroup(timestamp: string | Date): DateGroup {
  const now = new Date();
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  
  // Resetear horas para comparación de días
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  const diffMs = todayStart.getTime() - dateStart.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays <= 7) return 'thisWeek';
  if (diffDays <= 30) return 'thisMonth';
  return 'older';
}

export function getDateGroupLabel(group: DateGroup): string {
  const labels: Record<DateGroup, string> = {
    today: 'Hoy',
    yesterday: 'Ayer',
    thisWeek: 'Esta semana',
    thisMonth: 'Este mes',
    older: 'Más antiguo',
  };
  return labels[group];
}

/**
 * Agrupa array de items por fecha
 */
export function groupByDate<T extends { createdAt?: string }>(
  items: T[]
): Record<DateGroup, T[]> {
  const groups: Record<DateGroup, T[]> = {
    today: [],
    yesterday: [],
    thisWeek: [],
    thisMonth: [],
    older: [],
  };

  for (const item of items) {
    if (!item.createdAt) continue;
    const group = getDateGroup(item.createdAt);
    groups[group].push(item);
  }

  return groups;
}
