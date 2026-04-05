import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useClient } from '@/contexts/ClientContext';
import { Loader2, LogIn, Building2 } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { setClientId, setCurrentUser } = useClient();

  const [email, setEmail] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !companyCode.trim()) {
      setError('Por favor completa todos los campos.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: dbError } = await supabase
        .from('app_users')
        .select('id, email, client_id, role, name, active')
        .eq('email', email.trim().toLowerCase())
        .eq('client_id', companyCode.trim().toLowerCase())
        .eq('active', true)
        .maybeSingle();

      if (dbError) throw dbError;

      if (!data) {
        setError('Credenciales inválidas. Verifica tu email y código de empresa.');
        return;
      }

      // Guardar sesión
      setClientId(data.client_id);
      setCurrentUser({
        id: data.id,
        email: data.email,
        client_id: data.client_id,
        role: data.role,
        name: data.name,
        active: data.active,
      });

      // Actualizar last_login (best effort)
      supabase
        .from('app_users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.id)
        .then(() => {});

      navigate('/', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0D0D1A] flex items-center justify-center px-4">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-purple-600/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-violet-500/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-600/20 border border-purple-500/30 mb-4">
            <Building2 size={28} className="text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">WeKall Intelligence</h1>
          <p className="text-sm text-slate-400 mt-1">Inteligencia operativa para tu contact center</p>
        </div>

        {/* Card */}
        <div className="bg-[#13132A] border border-white/8 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-1">Iniciar sesión</h2>
          <p className="text-sm text-slate-400 mb-6">Ingresa con tu cuenta empresarial</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@empresa.com"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                disabled={loading}
              />
            </div>

            {/* Código de empresa */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Código de empresa
              </label>
              <input
                type="text"
                autoComplete="organization"
                value={companyCode}
                onChange={e => setCompanyCode(e.target.value)}
                placeholder="ej: credismart"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                disabled={loading}
              />
              <p className="text-xs text-slate-600 mt-1">Proporcionado por tu administrador WeKall</p>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors mt-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  Ingresar
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-600 mt-6">
          WeKall Intelligence · Plataforma multi-tenant
        </p>
      </div>
    </div>
  );
}
