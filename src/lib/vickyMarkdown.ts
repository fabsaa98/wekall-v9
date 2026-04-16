/**
 * vickyMarkdown.ts
 * Utilidad de post-procesamiento: convierte respuestas markdown estructural de Vicky a prosa conversacional.
 * Extraído de VickyInsights.tsx para permitir tests unitarios directos.
 */

/**
 * Convierte markdown estructural (headers, listas, bullets) a prosa fluida.
 * Objetivo: que Vicky suene como un advisor senior en conversación, no como un reporte.
 *
 * Reglas:
 * - Headers (##, ###) → texto plano con punto final
 * - Listas numeradas (1. item) → ítem sin número
 * - Bullets (-, *, •) → ítem sin viñeta
 * - Múltiples líneas cortas seguidas → se unen en prosa con ". "
 * - Más de 2 saltos de línea consecutivos → máximo 2
 * - Negrita (**texto**) → se conserva
 * - Texto vacío o null/undefined → retorna como está
 */
export function convertirMarkdownAProsa(texto: string): string {
  if (!texto) return texto;

  // Eliminar headers (##, ###, ####, etc.)
  let resultado = texto.replace(/^#{1,6}\s+(.+)$/gm, '$1.');

  // Convertir listas numeradas a prosa (1. item → item)
  resultado = resultado.replace(/^\d+\.\s+(.+)$/gm, '$1');

  // Convertir listas de viñetas a prosa (- item, * item, • item)
  resultado = resultado.replace(/^[-*•]\s+(.+)$/gm, '$1');

  // Eliminar líneas en blanco múltiples consecutivas (dejando máx 2)
  resultado = resultado.replace(/\n{3,}/g, '\n\n');

  // Unir líneas cortas consecutivas que fueron items de lista en un párrafo fluido
  resultado = resultado.split('\n\n').map(parrafo => {
    const lineas = parrafo.split('\n').filter(l => l.trim());
    if (lineas.length <= 1) return parrafo;

    // Si hay múltiples líneas cortas (probablemente items convertidos), unirlas
    const todasCortas = lineas.every(l => l.trim().length < 150);
    if (todasCortas && lineas.length > 1) {
      const unidas = lineas.map((l, i) => {
        const limpia = l.trim().replace(/[,;.]$/, '');
        if (i === lineas.length - 1) return limpia + '.';
        return limpia;
      }).join('. ');
      return unidas;
    }
    return parrafo;
  }).join('\n\n');

  return resultado.trim();
}
