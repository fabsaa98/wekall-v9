/**
 * <Image> — wrapper que sirve AVIF/WebP via Cloudflare Images si está configurado.
 *
 * Sprint 2 · P2-15. Sin esto cada logo / screenshot sube en su formato nativo
 * (usualmente PNG ~200KB+). Con esto cae a AVIF/WebP <50KB.
 *
 * Configuración:
 *   - Si `VITE_CF_IMAGES_PROXY` está set → reescribe URLs externas via CF Images.
 *   - Si la imagen ya está en cloudflareimages.com o cdn.wekall.co → sirve directo.
 *
 * Lazy loading + width/height obligatorios para evitar CLS.
 */

import React from 'react';

interface ImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'loading' | 'decoding'> {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  format?: 'auto' | 'avif' | 'webp' | 'png';
  quality?: number;
}

const CF_PROXY = (import.meta.env.VITE_CF_IMAGES_PROXY as string | undefined) || '';

function buildOptimizedUrl(src: string, opts: { w: number; h?: number; format?: string; quality?: number }): string {
  // Si ya viene de CF Images o de nuestro CDN, no tocar.
  if (!CF_PROXY) return src;
  if (src.startsWith('data:') || src.startsWith('blob:')) return src;
  if (src.includes('imagedelivery.net') || src.includes('cdn.wekall.co')) return src;

  // CF Images URL format:
  // https://imagedelivery.net/<account_hash>/<image_id>/<variant>
  // Acá usamos CF Image Resizing: https://example.com/cdn-cgi/image/<opts>/<src>
  // o el proxy URL para imágenes externas.
  const params = new URLSearchParams();
  params.set('width', String(opts.w));
  if (opts.h) params.set('height', String(opts.h));
  params.set('format', opts.format || 'auto');
  params.set('quality', String(opts.quality ?? 80));
  params.set('fit', 'cover');

  // Encode src como query para que el proxy lo recoja.
  return `${CF_PROXY}?${params.toString()}&url=${encodeURIComponent(src)}`;
}

export function Image({
  src,
  alt,
  width,
  height,
  priority = false,
  format = 'auto',
  quality = 80,
  className,
  ...rest
}: ImageProps) {
  const optimized = buildOptimizedUrl(src, { w: width, h: height, format, quality });
  return (
    <img
      src={optimized}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchPriority={priority ? 'high' : 'auto'}
      className={className}
      {...rest}
    />
  );
}
