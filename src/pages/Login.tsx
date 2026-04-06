import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useClient } from '@/contexts/ClientContext';
import { Loader2, LogIn, Building2, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { setClientId, setCurrentUser } = useClient();

  const [email, setEmail] = useState('');
  const [clientCode, setClientCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Ingresa tu correo electrónico.');
      return;
    }
    if (!clientCode.trim()) {
      setError('Ingresa el código de acceso de tu empresa.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: dbError } = await supabase
        .from('app_users')
        .select('id, email, client_id, role, name, active')
        .eq('email', email.trim().toLowerCase())
        .eq('client_id', clientCode.trim().toLowerCase())
        .eq('active', true)
        .limit(1);

      if (dbError) throw dbError;

      if (!data || data.length === 0) {
        setError('Credenciales inválidas. Verifica tu email y código de empresa.');
        return;
      }

      const user = data[0];
      setClientId(user.client_id);
      setCurrentUser({
        id: user.id,
        email: user.email,
        client_id: user.client_id,
        role: user.role,
        name: user.name,
        active: user.active,
      });

      // Actualizar last_login
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
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-2">
            <span className="text-2xl">🧠</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">WeKall Intelligence</h1>
          <p className="text-sm text-muted-foreground">Business Intelligence for CEOs & C-Suite</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
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

          {/* Código de empresa */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Building2 size={12} />
              Código de empresa
            </label>
            <div className="relative">
              <input
                type={showCode ? 'text' : 'password'}
                value={clientCode}
                onChange={e => setClientCode(e.target.value)}
                placeholder="ej: credismart"
                className="w-full px-3 py-2.5 pr-10 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                autoComplete="off"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowCode(!showCode)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showCode ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Tu administrador de WeKall te proporcionó este código.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Submit */}
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

        <p className="text-center text-xs text-muted-foreground">
          ¿Problemas para acceder?{' '}
          <a href="mailto:soporte@wekall.co" className="text-primary hover:underline">
            Contacta a soporte
          </a>
        </p>
      </div>
    </div>
  );
}
