import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, getAppUser } from '@/lib/supabase';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ClientConfig {
  client_id: string;
  client_name: string;
  industry?: string;
  country?: string;
  currency?: string;
  timezone?: string;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
  // Campos EBITDA (opcionales — pueden no existir aún en el schema)
  costo_agente_mes?: number;
  agentes_activos?: number;
  nomina_total_mes?: number;
  trm_cop?: number;
  notas?: string;
}

export interface ClientBranding {
  client_id: string;
  logo_url?: string | null;
  primary_color?: string;
  company_name?: string;
  tagline?: string | null;
  website_url?: string | null;
  linkedin_url?: string | null;
  instagram_url?: string | null;
  twitter_url?: string | null;
  facebook_url?: string | null;
  industry_description?: string | null;
  contact_email?: string | null;
  phone?: string | null;
  updated_at?: string;
}

export interface AppUser {
  id?: string;
  email: string;
  client_id: string;
  role: string;
  name?: string;
  active?: boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface ClientContextValue {
  clientId: string;
  setClientId: (id: string) => void;
  clientConfig: ClientConfig | null;
  clientBranding: ClientBranding | null;
  currentUser: AppUser | null;
  setCurrentUser: (user: AppUser | null) => void;
  loading: boolean;
}

const ClientContext = createContext<ClientContextValue>({
  clientId: 'credismart',
  setClientId: () => {},
  clientConfig: null,
  clientBranding: null,
  currentUser: null,
  setCurrentUser: () => {},
  loading: true,
});

// ─── Provider ─────────────────────────────────────────────────────────────────

const LS_CLIENT_ID = 'wki_client_id';
const LS_CURRENT_USER = 'wki_current_user';

export function ClientProvider({ children }: { children: ReactNode }) {
  const [clientId, setClientIdState] = useState<string>(() => {
    return localStorage.getItem(LS_CLIENT_ID) || 'credismart';
  });

  const [currentUser, setCurrentUserState] = useState<AppUser | null>(() => {
    try {
      const stored = localStorage.getItem(LS_CURRENT_USER);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [clientConfig, setClientConfig] = useState<ClientConfig | null>(null);
  const [clientBranding, setClientBranding] = useState<ClientBranding | null>(null);
  const [loading, setLoading] = useState(true);

  // Persistir clientId en localStorage
  const setClientId = (id: string) => {
    localStorage.setItem(LS_CLIENT_ID, id);
    setClientIdState(id);
  };

  // Persistir currentUser en localStorage
  const setCurrentUser = (user: AppUser | null) => {
    if (user) {
      localStorage.setItem(LS_CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(LS_CURRENT_USER);
    }
    setCurrentUserState(user);
  };

  /**
   * Inicialización de sesión con Supabase Auth.
   *
   * Orden de prioridad:
   * 1. Sesión activa de Supabase Auth → cargar app_user desde DB
   * 2. localStorage (compatibilidad hacia atrás / modo legacy)
   * 3. Nada → usuario no autenticado
   */
  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        // Timeout de 2s para evitar cuelgue si Supabase Auth no responde
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
        ]);

        if (!sessionResult) {
          // Timeout — usar localStorage como modo legacy, no bloquear la app
          return;
        }

        const session = (sessionResult as { data: { session: { user?: { email?: string } } | null } }).data?.session;

        if (session?.user?.email) {
          // Hay sesión de Supabase Auth activa
          // PRIORIDAD: usar el client_id del wki_current_user guardado en localStorage (el login siempre lo setea correctamente)
          // NO leer wki_client_id solo — puede ser de una sesión anterior de otro usuario
          let resolvedClientId: string | null = null;
          try {
            const storedUser = localStorage.getItem(LS_CURRENT_USER);
            if (storedUser) {
              const parsed = JSON.parse(storedUser) as { email?: string; client_id?: string };
              // Solo usar si el email coincide con la sesión activa
              if (parsed.email === session.user.email && parsed.client_id) {
                resolvedClientId = parsed.client_id;
              }
            }
          } catch { /* ignorar */ }

          // Si no hay usuario guardado que coincida, consultar app_users
          if (!resolvedClientId) {
            const storedClientId = localStorage.getItem(LS_CLIENT_ID) || 'credismart';
            try {
              const appUser = await Promise.race([
                getAppUser(session.user.email, storedClientId),
                new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
              ]);
              if (appUser) resolvedClientId = (appUser as { client_id: string }).client_id;
            } catch { /* ignorar */ }
          }

          if (resolvedClientId && mounted) {
            // Sincronizar clientId con el del usuario autenticado
            setClientId(resolvedClientId);
            // Actualizar currentUser si el email coincide
            try {
              const storedUser = localStorage.getItem(LS_CURRENT_USER);
              if (storedUser) {
                const parsed = JSON.parse(storedUser) as { email?: string; client_id?: string; id?: string; role?: string; name?: string; active?: boolean };
                if (parsed.email === session.user.email) {
                  setCurrentUserState({ ...parsed, client_id: resolvedClientId } as AppUser);
                }
              }
            } catch { /* ignorar */ }
          }
        }
        // Si no hay sesión Auth, usar localStorage como estaba (modo legacy)
      } catch (err) {
        // No romper si Auth no está disponible
        console.warn('[ClientContext] Error al verificar sesión Auth:', err);
      }
    }

    initSession();

    // Suscribirse a cambios de sesión (login/logout en otra pestaña, expiración, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_IN' && session?.user?.email) {
        // Nueva sesión iniciada — cargar app_user
        // PRIORIDAD: localStorage (cliente activo) nunca se sobrescribe con el del JWT
        const storedClientId = localStorage.getItem(LS_CLIENT_ID) || 'credismart';
        try {
          const appUser = await getAppUser(
            session.user.email,
            storedClientId  // filtrar siempre por el cliente del localStorage
          );
          if (appUser) {
            // Solo actualizar currentUser — NO cambiar clientId (localStorage manda)
            setCurrentUser({
              id: appUser.id,
              email: appUser.email,
              client_id: appUser.client_id,
              role: appUser.role,
              name: appUser.name,
              active: appUser.active,
            });
          }
        } catch (err) {
          console.warn('[ClientContext] Error al cargar app_user en SIGNED_IN:', err);
        }
      } else if (event === 'SIGNED_OUT') {
        // Logout — limpiar usuario pero mantener clientId para UX
        setCurrentUser(null);
        localStorage.removeItem(LS_CURRENT_USER);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cargar config y branding cuando cambia el clientId
  useEffect(() => {
    async function loadClientData() {
      setLoading(true);
      const PROXY = (import.meta.env.VITE_PROXY_URL || '').replace(/\/$/, '');

      async function proxyFetch<T>(table: string): Promise<T | null> {
        if (!PROXY) return null;
        try {
          const r = await fetch(`${PROXY}/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ table, select: '*', filters: { client_id: `eq.${clientId}` }, limit: 1 }),
          });
          if (!r.ok) return null;
          const data = await r.json() as T[];
          return Array.isArray(data) ? (data[0] ?? null) : null;
        } catch { return null; }
      }

      try {
        // Intentar primero via proxy (funciona en todos los networks)
        const [configProxy, brandingProxy] = await Promise.all([
          proxyFetch<ClientConfig>('client_config'),
          proxyFetch<ClientBranding>('client_branding'),
        ]);

        if (configProxy || brandingProxy) {
          setClientConfig(configProxy);
          setClientBranding(brandingProxy);
          setLoading(false);
          return;
        }

        // Fallback: directo a Supabase
        const [configRes, brandingRes] = await Promise.all([
          supabase.from('client_config').select('*').eq('client_id', clientId).maybeSingle(),
          supabase.from('client_branding').select('*').eq('client_id', clientId).maybeSingle(),
        ]);

        setClientConfig(configRes.data as ClientConfig | null);
        setClientBranding(brandingRes.data as ClientBranding | null);
      } catch {
        setClientConfig(null);
        setClientBranding(null);
      } finally {
        setLoading(false);
      }
    }

    loadClientData();
  }, [clientId]);

  return (
    <ClientContext.Provider
      value={{
        clientId,
        setClientId,
        clientConfig,
        clientBranding,
        currentUser,
        setCurrentUser,
        loading,
      }}
    >
      {children}
    </ClientContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useClient() {
  return useContext(ClientContext);
}
