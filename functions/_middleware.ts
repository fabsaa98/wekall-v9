/**
 * Global Middleware for Cloudflare Pages Functions
 * 
 * Handles:
 * - CORS
 * - Authentication (optional)
 * - Request logging
 * - Error handling
 * - Rate limiting (future)
 * 
 * Best practice: Centralized cross-cutting concerns
 */

export const onRequest: PagesFunction = async (context) => {
  const { request, next } = context;
  const startTime = Date.now();

  // CORS headers (allow all for now, restrict in production)
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-ID',
    'Access-Control-Max-Age': '86400',
  };

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  // Log request
  console.log(`[${request.method}] ${new URL(request.url).pathname}`);

  try {
    // Call next handler
    const response = await next();

    // Add CORS headers to response
    const newHeaders = new Headers(response.headers);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      newHeaders.set(key, value);
    });

    // Add performance header
    const duration = Date.now() - startTime;
    newHeaders.set('X-Response-Time', `${duration}ms`);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });

  } catch (error) {
    console.error('Middleware error:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
