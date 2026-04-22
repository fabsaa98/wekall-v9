import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Página de logout dedicada.
 * Al cargar: limpia todo el storage, cierra sesión Supabase, redirige a /login.
 * No depende de ningún estado de React — funciona siempre.
 */
export default function Logout() {
  useEffect(() => {
    localStorage.clear();
    sessionStorage.clear();
    supabase.auth.signOut().catch(() => {}).finally(() => {
      window.location.replace('/login');
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#0D0D1A] flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
