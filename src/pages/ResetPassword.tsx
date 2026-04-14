import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

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
    if (error) setError(error.message);
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
