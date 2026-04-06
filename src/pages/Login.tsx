import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useClient } from '@/contexts/ClientContext';
import { Loader2, LogIn, Building2, Eye, EyeOff, Lock } from 'lucide-react';

const SUPABASE_URL = 'https://iszodrpublcnsyvtgjcg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_eRRG-QSyURpWV-FstJUc4g_M-xmD6v_';

export default function Login() {
  const navigate = useNavigate();
  const { setClientId, setCurrentUser } = useClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Ingresa tu email y contraseña.');
      return;
    }

    setLoading(true);
    try {
      // ── Auth real con fetch directo (sin cliente JS de Supabase) ──────────────
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);

      let authEmail = email.trim().toLowerCase();
      let authClientId = 'credismart'; // default

      try {
        const resp = await fetch(
          `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ email: authEmail, password }),
            signal: controller.signal,
          }
        );
        clearTimeout(timer);
        const json = await resp.json();

        if (!resp.ok) {
          const msg = json.error_description || json.error || '';
          if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('credentials')) {
            setError('Contraseña incorrecta.');
            return;
          }
          throw new Error(msg || 'auth_error');
        }

        // Auth exitoso — leer client_id del user_metadata si existe
        if (json.user?.user_metadata?.client_id) {
          authClientId = json.user.user_metadata.client_id;
        }

      } catch (fetchErr: unknown) {
        clearTimeout(timer);
        const msg = fetchErr instanceof Error ? fetchErr.message : '';
        if (msg === 'auth_error' || msg.toLowerCase().includes('invalid')) {
          setError('Contraseña incorrecta.');
          return;
        }
        // Error de red/timeout → continuar con lookup en app_users
        console.warn('[Login] fetch auth falló, usando app_users lookup:', msg);
      }

      // ── Buscar en app_users ────────────────────────────────────────────────────
      const { data: users, error: dbError } = await supabase
        .from('app_users')
        .select('id, email, client_id, role, name, active')
        .eq('email', authEmail)
        .eq('active', true)
        .limit(5);

      if (dbError) throw dbError;
      if (!users || users.length === 0) {
        setError('Usuario no encontrado. Contacta a tu administrador.');
        return;
      }

      // Preferir el cliente del metadata de auth, sino el primero con datos
      const preferredOrder = [authClientId, 'credismart'];
      let user = users.find(u => preferredOrder.includes(u.client_id)) || users[0];

      setClientId(user.client_id);
      setCurrentUser({
        id: user.id,
        email: user.email,
        client_id: user.client_id,
        role: user.role,
        name: user.name,
        active: user.active,
      });

      supabase.from('app_users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id)
        .then(() => {});

      navigate('/', { replace: true });

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error de conexión. Intenta de nuevo.');
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
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Correo electrónico
            </label>
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
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Lock size={12} />
              Contraseña
            </label>
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

          {error && (
            <div className="px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Verificando...</>
            ) : (
              <><LogIn size={16} /> Iniciar sesión</>
            )}
          </button>
        </form>

        <div className="space-y-2 text-center">
          <p className="text-xs text-muted-foreground">
            ¿Tienes múltiples empresas? Usa{' '}
            <button
              onClick={() => {
                const code = prompt('Código de empresa (ej: credismart, wekall):');
                if (code) {
                  localStorage.setItem('wki_client_id', code.toLowerCase().trim());
                  navigate('/');
                }
              }}
              className="text-primary hover:underline"
            >
              acceso directo
            </button>
          </p>
          <p className="text-xs text-muted-foreground">
            ¿Problemas?{' '}
            <a href="mailto:soporte@wekall.co" className="text-primary hover:underline">
              Contacta a soporte
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
