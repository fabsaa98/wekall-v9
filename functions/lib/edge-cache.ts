/**
 * Edge cache helper — Cloudflare Cache API wrapper.
 *
 * Sprint 3 · P3-5. Para endpoints de lectura que cambian raramente
 * (config, branding, agent stats agregadas), cachear en el edge ahorra
 * llamadas al Worker proxy + Supabase.
 *
 * Patrón:
 *   const cached = await cacheGet(request);
 *   if (cached) return cached;
 *   const fresh = await handler();
 *   await cachePut(request, fresh, { maxAge: 60 });
 *   return fresh;
 *
 * Importante: el cache key se construye con URL + JWT user_id para que
 * cada usuario tenga su propia copia (no leak cross-user).
 */

declare const caches: { default: Cache };

export interface CacheOpts {
  maxAge?: number;            // segundos · default 60
  staleWhileRevalidate?: number;
}

function buildCacheKey(request: Request, userId?: string): Request {
  // Append user_id al cache key para isolation por usuario.
  const url = new URL(request.url);
  if (userId) url.searchParams.set('__uid', userId);
  return new Request(url.toString(), {
    method: 'GET',
    headers: { 'X-Cache-Lookup': '1' },
  });
}

export async function cacheGet(request: Request, userId?: string): Promise<Response | null> {
  if (typeof caches === 'undefined') return null;
  const key = buildCacheKey(request, userId);
  const cached = await caches.default.match(key);
  if (!cached) return null;
  // Clonar para no consumir el body original.
  const headers = new Headers(cached.headers);
  headers.set('X-Cache', 'HIT');
  return new Response(cached.body, {
    status: cached.status,
    statusText: cached.statusText,
    headers,
  });
}

export async function cachePut(
  request: Request,
  response: Response,
  opts: CacheOpts = {},
  userId?: string
): Promise<void> {
  if (typeof caches === 'undefined') return;
  if (response.status !== 200) return;

  const maxAge = opts.maxAge ?? 60;
  const swr = opts.staleWhileRevalidate ?? 0;

  // Clonar response para que el cliente reciba su copia mientras la cacheamos.
  const cacheable = response.clone();
  const headers = new Headers(cacheable.headers);
  const cacheControl = swr
    ? `private, max-age=${maxAge}, stale-while-revalidate=${swr}`
    : `private, max-age=${maxAge}`;
  headers.set('Cache-Control', cacheControl);
  headers.set('X-Cache', 'MISS');

  const toCache = new Response(cacheable.body, {
    status: cacheable.status,
    statusText: cacheable.statusText,
    headers,
  });

  const key = buildCacheKey(request, userId);
  await caches.default.put(key, toCache);
}

/**
 * Invalidar el cache de una URL (después de mutaciones).
 * Útil cuando un PATCH/POST cambia config y queremos refrescar el GET.
 */
export async function cacheInvalidate(url: string, userId?: string): Promise<void> {
  if (typeof caches === 'undefined') return;
  const u = new URL(url);
  if (userId) u.searchParams.set('__uid', userId);
  const key = new Request(u.toString(), { method: 'GET', headers: { 'X-Cache-Lookup': '1' } });
  await caches.default.delete(key);
}
