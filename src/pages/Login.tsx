import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, signIn as signInProxy } from '@/lib/supabase';
import { useClient } from '@/contexts/ClientContext';
import { Loader2, LogIn, Eye, EyeOff } from 'lucide-react';

// Sesión persistente: si remember=true, guardar en localStorage con TTL de 30 días
// Si remember=false, guardar en sessionStorage (se borra al cerrar browser)
const REMEMBER_KEY = 'wki_remember_session';
const REMEMBER_TTL_DAYS = 30;

function setPersistedSession(user: object, remember: boolean) {
  const payload = { user, expires: Date.now() + (remember ? REMEMBER_TTL_DAYS * 86400 * 1000 : 0) };
  if (remember) {
    localStorage.setItem(REMEMBER_KEY, JSON.stringify(payload));
  } else {
    // Solo sesión de browser — no persistir más allá del cierre
    sessionStorage.setItem(REMEMBER_KEY, JSON.stringify(payload));
    localStorage.removeItem(REMEMBER_KEY);
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Ingresa tu correo y contraseña.');
      return;
    }

    setLoading(true);

    try {
      // === MODO PRINCIPAL: Autenticación via Worker proxy ===
      // El Worker llama a Supabase Auth directamente (evita bloqueos del cliente JS en redes móviles)
      let clientId: string | null = null;

      try {
        const authResult = await signInProxy(email.trim().toLowerCase(), password);
        clientId = authResult.client_id || null;

        // Con client_id del token, cargar el perfil desde app_users
        if (clientId) {
          const { data, error: dbError } = await supabase
            .from('app_users')
            .select('id, email, client_id, role, name, active')
            .eq('email', email.trim().toLowerCase())
            .eq('client_id', clientId)
            .eq('active', true)
            .limit(1);

          if (!dbError && data && data.length > 0) {
            const user = data[0];
            setClientId(user.client_id);
            setCurrentUser({ id: user.id, email: user.email, client_id: user.client_id, role: user.role, name: user.name, active: user.active });
            setPersistedSession(user, rememberMe);
            supabase.from('app_users').update({ last_login: new Date().toISOString() }).eq('id', user.id).then(() => {});
            navigate('/', { replace: true });
            return;
          }
        }

        // Si no hay client_id en el token, buscar por email
        const { data, error: dbError } = await supabase
          .from('app_users')
          .select('id, email, client_id, role, name, active')
          .eq('email', email.trim().toLowerCase())
          .eq('active', true)
          .limit(1);

        if (!dbError && data && data.length > 0) {
          const user = data[0];
          setClientId(user.client_id);
          setCurrentUser({ id: user.id, email: user.email, client_id: user.client_id, role: user.role, name: user.name, active: user.active });
          setPersistedSession(user, rememberMe);
          supabase.from('app_users').update({ last_login: new Date().toISOString() }).eq('id', user.id).then(() => {});
          navigate('/', { replace: true });
          return;
        }

        setError('Usuario no encontrado. Contacta a soporte.');
        return;

      } catch (authErr: unknown) {
        const msg = authErr instanceof Error ? authErr.message : '';

        // Credenciales incorrectas — no hacer fallback
        if (msg === 'Credenciales incorrectas' || msg === 'auth_error') {
          setError('Contraseña incorrecta. Verifica tus credenciales.');
          return;
        }

        // Timeout o error de red — intentar fallback de emergencia
        if (msg === 'auth_timeout' || msg === 'Failed to fetch' || msg.includes('abort')) {
          console.warn('[Login] Worker proxy falló, intentando modo emergencia (solo email)...');

          // === MODO EMERGENCIA: búsqueda directa en app_users (sin contraseña) ===
          // Usar solo cuando el Worker no responde. NO es autenticación real.
          const { data, error: dbError } = await supabase
            .from('app_users')
            .select('id, email, client_id, role, name, active')
            .eq('email', email.trim().toLowerCase())
            .eq('active', true)
            .limit(1);

          if (!dbError && data && data.length > 0) {
            const user = data[0];
            setClientId(user.client_id);
            setCurrentUser({ id: user.id, email: user.email, client_id: user.client_id, role: user.role, name: user.name, active: user.active });
            setPersistedSession(user, rememberMe);
            supabase.from('app_users').update({ last_login: new Date().toISOString() }).eq('id', user.id).then(() => {});
            navigate('/', { replace: true });
            return;
          }

          setError('Error de conexión. Intenta de nuevo.');
          return;
        }

        // Otro error inesperado
        setError('Error de conexión. Intenta de nuevo.');
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
