import { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, signIn as signInProxy } from '@/lib/supabase';
import { useClient } from '@/contexts/ClientContext';
import { Loader2, LogIn, Eye, EyeOff } from 'lucide-react';

// ─── Preset credentials (URL param: ?preset=crediminuto) ─────────────────────
// ⚠️ Security: passwords loaded from env vars — never hardcode in source
const PRESETS: Record<string, { email: string; password: string; clientId: string }> = {
  crediminuto: { email: 'ceo@crediminuto.com', password: import.meta.env.VITE_PRESET_CREDIMINUTO_PWD as string || '', clientId: 'credismart' },
  wekall:      { email: 'fabian@wekall.co',    password: import.meta.env.VITE_PRESET_WEKALL_PWD as string || '',      clientId: 'wekall'      },
};

// Sesión persistente: si remember=true, guardar en localStorage con TTL de 30 días
// Si remember=false, guardar en sessionStorage (se borra al cerrar browser)
const REMEMBER_KEY = 'wki_remember_session';
const REMEMBER_TTL_DAYS = 30;

function setPersistedSession(user: object & { client_id?: string }, remember: boolean) {
  const payload = { user, expires: Date.now() + (remember ? REMEMBER_TTL_DAYS * 86400 * 1000 : 0) };
  if (remember) {
    localStorage.setItem(REMEMBER_KEY, JSON.stringify(payload));
  } else {
    // Solo sesión de browser — no persistir más allá del cierre
    sessionStorage.setItem(REMEMBER_KEY, JSON.stringify(payload));
    localStorage.removeItem(REMEMBER_KEY);
  }
  // Guardar wki_client_id para AuthGuard (legacy compatibility)
  if (user.client_id) {
    localStorage.setItem('wki_client_id', user.client_id);
  }
}

const PROXY_URL = (import.meta.env.VITE_PROXY_URL || 'https://wekall-vicky-proxy.fabsaa98.workers.dev').replace(/\/$/, '');

export default function Login() {
  const navigate = useNavigate();
  const { setClientId, setCurrentUser } = useClient();

  const [email, setEmail] = useState(() => {
    // Pre-llenar email si hay sesión recordada
    try {
      const ls = localStorage.getItem(REMEMBER_KEY);
      if (ls) {
        const { user, expires } = JSON.parse(ls);
        if (expires === 0 || expires > Date.now()) return (user as {email?: string}).email || '';
      }
    } catch { /* ignore */ }
    return '';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem(REMEMBER_KEY));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ─── Auto-login por preset URL (?preset=crediminuto) ─────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const preset = params.get('preset')?.toLowerCase();
    if (!preset || !PRESETS[preset]) return;

    const { email: pEmail, password: pPwd, clientId: pClientId } = PRESETS[preset];
    setEmail(pEmail);
    setPassword(pPwd);
    setRememberMe(true);

    // Disparar login automáticamente
    setLoading(true);
    setError(null);

    signInProxy(pEmail, pPwd, pClientId)
      .then((authResult) => {
        // Prioridad: preset clientId > worker response > fallback
        const clientId = pClientId || authResult.client_id || 'credismart';
        const userEmail = authResult.user?.email || pEmail;
        const userMeta = authResult.user?.user_metadata as Record<string, string> | undefined;
        const role = userMeta?.role || 'user';
        const userObj = {
          id: authResult.user?.id || '',
          email: userEmail,
          client_id: clientId,
          role,
          name: userMeta?.name || userEmail,
          active: true,
        };
        setClientId(clientId);
        setCurrentUser(userObj);
        setPersistedSession(userObj, true);
        supabase.from('app_users').update({ last_login: new Date().toISOString() })
          .eq('email', userEmail).eq('client_id', clientId).then(() => {});
        window.location.href = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') + '/';
      })
      .catch((err: unknown) => {
        setLoading(false);
        setError(err instanceof Error ? err.message : 'Error de autenticación.');
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Ingresa tu correo y contraseña.');
      return;
    }

    setLoading(true);

    try {
      // === AUTENTICACIÓN VIA WORKER PROXY ===
      try {
        const authResult = await signInProxy(email.trim().toLowerCase(), password);
        const clientId = authResult.client_id || 'credismart';
        const userEmail = authResult.user?.email || email.trim().toLowerCase();
        const userMeta = authResult.user?.user_metadata as Record<string, string> | undefined;
        const role = userMeta?.role || 'user';

        // Construir usuario mínimo desde el token (sin query a DB)
        const userObj = {
          id: authResult.user?.id || '',
          email: userEmail,
          client_id: clientId,
          role: role,
          name: userMeta?.name || userEmail,
          active: true,
        };

        // Guardar sesión y navegar INMEDIATAMENTE
        setClientId(clientId);
        setCurrentUser(userObj);
        setPersistedSession(userObj, rememberMe);

        // Actualizar last_login en background (no bloquear)
        supabase
          .from('app_users')
          .update({ last_login: new Date().toISOString() })
          .eq('email', userEmail)
          .eq('client_id', clientId)
          .then(() => {});

        setLoading(false);
        // Hard redirect para evitar race condition con AuthGuard y Supabase session
        window.location.href = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') + '/';
        return;

      } catch (authErr: unknown) {
        const msg = authErr instanceof Error ? authErr.message : '';

        if (msg === 'Credenciales incorrectas' || msg === 'auth_error') {
          setError('Contraseña incorrecta. Verifica tus credenciales.');
          return;
        }

        // Timeout o error de red — fallback directo
        if (msg === 'auth_timeout' || msg === 'Failed to fetch' || msg.includes('abort') || msg.includes('network')) {
          setError('Error de conexión. Verifica tu red e intenta de nuevo.');
          return;
        }

        setError('Error de autenticación. Intenta de nuevo.');
      }

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-2">
            <span className="text-2xl">🧠</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">WeKall Intelligence</h1>
          <p className="text-sm text-muted-foreground">Business Intelligence for CEOs & C-Suite</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ceo@empresa.com"
              className="w-full px-3 py-2.5 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 pr-10 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Remember me */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border border-border bg-card text-primary focus:ring-primary/50 cursor-pointer"
              disabled={loading}
            />
            <label htmlFor="rememberMe" className="text-sm text-muted-foreground cursor-pointer select-none">
              Recordar sesión por 30 días
            </label>
          </div>

          {error && (
            <div className="px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> Verificando...</> : <><LogIn size={16} /> Iniciar sesión</>}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          ¿Problemas? <a href="mailto:soporte@wekall.co" className="text-primary hover:underline">Contacta a soporte</a>
        </p>
      </div>
    </div>
  );
}
