import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

// ─── Mapeo de errores Supabase → español ───────────────────────────────
function mapearErrorSupabase(error: string): string {
  const mapa: Record<string, string> = {
    'Invalid login credentials': 'Email o contraseña incorrectos. Verifica tus datos.',
    'Email not confirmed': 'Tu email no ha sido confirmado. Revisa tu bandeja de entrada.',
    'User already registered': 'Este email ya está registrado. ¿Olvidaste tu contraseña?',
    'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.',
    'Invalid email': 'El formato del email no es válido.',
    'Email rate limit exceeded': 'Demasiados intentos. Espera unos minutos antes de intentar de nuevo.',
    'User not found': 'No encontramos una cuenta con ese email.',
    'Invalid OTP': 'El código de verificación es inválido o expiró.',
    'Signup disabled': 'El registro de nuevos usuarios está desactivado.',
    'Too many requests': 'Demasiadas solicitudes. Intenta en unos minutos.',
  };
  for (const [key, value] of Object.entries(mapa)) {
    if (error.toLowerCase().includes(key.toLowerCase())) return value;
  }
  return 'Ocurrió un error inesperado. Por favor intenta de nuevo.';
}

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) setError(mapearErrorSupabase(error.message));
    else { setDone(true); setTimeout(() => navigate('/'), 2000); }
  };

  if (done) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0D0D1A]">
      <div className="text-center p-8">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-white">Contraseña actualizada</h2>
        <p className="text-gray-400 mt-2">Redirigiendo...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0D0D1A]">
      <div className="w-full max-w-md p-8 bg-gray-900 rounded-2xl">
        <h2 className="text-2xl font-bold text-white mb-6">Nueva contraseña</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Nueva contraseña (mín. 8 caracteres)" minLength={8} required
            className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-purple-500 outline-none" />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
            {loading ? 'Guardando...' : 'Actualizar contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
