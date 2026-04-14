import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  };

  if (sent) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0D0D1A]">
      <div className="text-center p-8">
        <div className="text-5xl mb-4">📧</div>
        <h2 className="text-2xl font-bold text-white mb-2">Revisa tu correo</h2>
        <p className="text-gray-400">Te enviamos un link para restablecer tu contraseña.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0D0D1A]">
      <div className="w-full max-w-md p-8 bg-gray-900 rounded-2xl">
        <h2 className="text-2xl font-bold text-white mb-6">Recuperar contraseña</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="tu@email.com" required
            className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-purple-500 outline-none"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
            {loading ? 'Enviando...' : 'Enviar link de recuperación'}
          </button>
        </form>
        <a href="/login" className="block mt-4 text-center text-gray-400 hover:text-white text-sm">
          ← Volver al login
        </a>
      </div>
    </div>
  );
}
