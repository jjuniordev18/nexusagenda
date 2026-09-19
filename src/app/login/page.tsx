'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/AuthContext';
import { HuskyAvatar } from '@/components/husky-avatar';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [eyePosition, setEyePosition] = useState({ x: 0, y: 0 });
  const { toast } = useToast();
  const router = useRouter();
  const { login, signup, loginWithGoogle, resetPassword } = useAuth();

  const errorMessage = (error: unknown): string => {
    if (error instanceof Error && 'code' in error) {
      const code = String((error as { code: string }).code);
      switch (code) {
        case 'auth/email-already-in-use':
          return 'Este email já está cadastrado';
        case 'auth/invalid-email':
          return 'Email inválido';
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          return 'Email ou senha incorretos';
        case 'auth/weak-password':
          return 'Senha muito fraca';
        case 'auth/too-many-requests':
          return 'Muitas tentativas. Tente novamente mais tarde';
        case 'auth/network-request-failed':
          return 'Falha de conexão. Verifique sua internet';
        default:
          return error.message || 'Ocorreu um erro inesperado';
      }
    }
    if (error instanceof Error) return error.message;
    return 'Ocorreu um erro inesperado';
  };

  const handleForgotPassword = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: 'Erro', description: 'Digite um email válido primeiro', variant: 'destructive' });
      return;
    }
    try {
      await resetPassword(email);
      toast({ title: 'Email enviado', description: 'Verifique sua caixa de entrada para redefinir a senha' });
    } catch (error) {
      toast({ title: 'Erro', description: errorMessage(error), variant: 'destructive' });
    }
  };

  const handleEmailMouseMove = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setEyePosition({ x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) });
  }, []);

  const handleEmailMouseLeave = useCallback(() => {
    setEyePosition({ x: 0, y: 0 });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
        toast({ title: 'Sucesso', description: 'Login realizado com sucesso!' });
      } else {
        await signup(email, password);
        toast({ title: 'Sucesso', description: 'Conta criada com sucesso!' });
      }
      router.push('/');
    } catch (error) {
      console.error('Erro de login:', error);
      toast({
        title: 'Erro',
        description: errorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      toast({ title: 'Sucesso', description: 'Login com Google realizado!' });
      router.push('/');
    } catch (error) {
      console.error('Erro Google login:', error);
      toast({
        title: 'Erro',
        description: errorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen h-full w-full bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-slate-900 dark:via-purple-900/20 dark:to-slate-900 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid gap-8 w-full max-w-md"
      >
        <section className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-3xl">
          <div className="border-8 border-transparent rounded-xl bg-white dark:bg-gray-900 shadow-xl p-8 m-2">
            <div className="flex justify-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              >
                <HuskyAvatar
                  isPasswordFocused={passwordFocused}
                  eyePosition={eyePosition}
                />
              </motion.div>
            </div>

            <h1 className="text-4xl font-bold text-center cursor-default dark:text-gray-300 text-gray-900">
              {isLogin ? 'Entrar' : 'Criar conta'}
            </h1>
            <p className="mt-1 text-sm text-center text-gray-500 dark:text-gray-400">
              {isLogin ? 'Entre na sua conta Nexus' : 'Crie sua conta para começar'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-6 mt-6">
              <div>
                <label htmlFor="email" className="block mb-2 text-lg dark:text-gray-300">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onMouseMove={handleEmailMouseMove}
                  onMouseLeave={handleEmailMouseLeave}
                  className="border p-3 shadow-md dark:bg-indigo-700 dark:text-gray-300 dark:border-gray-700 border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 transition transform hover:scale-105 duration-300 disabled:opacity-50"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="password" className="block mb-2 text-lg dark:text-gray-300">
                  Senha
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    className="border p-3 shadow-md dark:bg-indigo-700 dark:text-gray-300 dark:border-gray-700 border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 transition transform hover:scale-105 duration-300 disabled:opacity-50 pr-12"
                    required
                    minLength={8}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {isLogin && (
                <div className="text-right">
                  <button
                    type="button"
                    className="text-blue-400 text-sm transition hover:underline"
                    onClick={handleForgotPassword}
                  >
                    Esqueceu a senha?
                  </button>
                </div>
              )}

              <button
                type="submit"
                className="w-full p-3 mt-4 text-white uppercase font-semibold tracking-wide bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg hover:scale-105 transition transform duration-300 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                disabled={loading}
              >
                {loading ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {isLogin ? 'Entrando...' : 'Criando...'}
                  </span>
                ) : (
                  isLogin ? 'Entrar' : 'Criar conta'
                )}
              </button>
            </form>

            <div className="flex flex-col mt-4 text-sm text-center dark:text-gray-300">
              <p>
                {isLogin ? 'Ainda não tem uma conta?' : 'Já tem uma conta?'}{' '}
                <button
                  type="button"
                  className="text-blue-400 transition hover:underline"
                  onClick={() => setIsLogin(!isLogin)}
                >
                  {isLogin ? 'Cadastre-se' : 'Entre'}
                </button>
              </p>
            </div>

            <div className="relative mt-5">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200 dark:border-gray-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-gray-900 px-2 text-gray-500">Ou continue com</span>
              </div>
            </div>

            <button
              type="button"
              className="mt-4 w-full flex items-center justify-center gap-3 p-3 bg-white dark:bg-indigo-700 border-gray-300 dark:border-gray-700 border rounded-lg shadow-md hover:scale-105 transition transform duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-gray-500 dark:text-gray-300" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              <span className="text-gray-700 dark:text-gray-300 font-medium">
                {googleLoading ? 'Conectando...' : 'Continuar com Google'}
              </span>
            </button>

            <div className="mt-4 text-center text-xs text-gray-500">
              <p>
                Ao continuar, você concorda com os{' '}
                <a href="#" className="text-blue-400 transition hover:underline">Termos de Uso</a>{' '}
                e a{' '}
                <a href="#" className="text-blue-400 transition hover:underline">Política de Privacidade</a>.
              </p>
            </div>
          </div>
        </section>
      </motion.div>
    </div>
  );
}