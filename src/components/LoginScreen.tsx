import React, { useState, useEffect } from 'react';
import { Truck, Eye, EyeOff, ShieldCheck, Lock, User as UserIcon, AlertCircle } from 'lucide-react';
import { useFleet } from '../context/FleetContext';
import { ForgotPasswordModal } from './modals/ForgotPasswordModal';

export const LoginScreen: React.FC = () => {
  const { login } = useFleet();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Restore saved email if user previously asked to remember
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem('gestao_frotas_saved_email');
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch {}
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanEmail = email.trim();
    const cleanPass = password.trim();

    if (!cleanEmail) {
      setError('Por favor, informe seu e-mail ou nome de usuário.');
      return;
    }
    if (!cleanPass) {
      setError('Por favor, digite sua senha de acesso.');
      return;
    }

    setLoading(true);
    try {
      const result = login(cleanEmail, cleanPass);
      if (!result.success) {
        setError(result.error || 'Credenciais inválidas. Verifique os dados e tente novamente.');
      } else {
        if (rememberMe) {
          localStorage.setItem('gestao_frotas_saved_email', cleanEmail);
        } else {
          localStorage.removeItem('gestao_frotas_saved_email');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Erro inesperado ao realizar login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0a1529] text-white relative flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Background Decorative Rings */}
      <div className="absolute inset-0 pointer-events-none opacity-20 flex items-center justify-center">
        <div className="w-[600px] h-[600px] rounded-full border border-slate-600/40 absolute -left-20"></div>
        <div className="w-[900px] h-[900px] rounded-full border border-slate-600/30 absolute -left-60"></div>
        <div className="w-[1200px] h-[1200px] rounded-full border border-slate-600/20 absolute -left-96"></div>
      </div>

      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center z-10">
        {/* Left Brand Area */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#ea580c] to-[#ff5500] flex items-center justify-center text-white shadow-xl shadow-orange-950/40 shrink-0">
              <Truck className="w-8 h-8 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-black text-white tracking-wider leading-none uppercase font-sans">
                Gestão Frotas
              </h1>
              <p className="text-sm font-bold tracking-widest text-[#ff6600] uppercase mt-1">
                Sistema de Controle & Manutenção
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {[
              'Gestão completa de veículos (Caminhões, Carretas e Cavalos Mecânicos)',
              'Ordens de serviço com rastreabilidade técnica e direcionamento automático',
              'Controle rigoroso de validades (CRLV, CIV, CIPP, Tacógrafo e Calibração)',
              'Banco de dados relacional em nuvem sincronizado em tempo real',
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff5500] shrink-0 shadow-sm shadow-orange-500"></span>
                <span className="text-slate-200 text-sm md:text-base font-normal">
                  {item}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Acesso protegido por autenticação e senhas individuais</span>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-900 border border-slate-100">
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                  Acesso ao Sistema
                </h2>
                <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-[#ff5500]">
                  <Lock className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Entre com seu e-mail ou usuário e sua senha
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  E-mail ou Usuário
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@linde.com ou seu nome"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-black placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff5500] focus:border-transparent transition"
                    autoComplete="username"
                    required
                  />
                  <UserIcon className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Senha de Acesso
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-xs font-bold text-[#ff5500] hover:text-[#e64d00] hover:underline cursor-pointer"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-black placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff5500] focus:border-transparent transition pr-10"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                    title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-[#ff5500] rounded-sm border-slate-300 focus:ring-[#ff5500] accent-[#ff5500]"
                  />
                  <span>Lembrar meu usuário</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-[#ff5500] hover:bg-[#e64d00] disabled:bg-slate-300 text-white font-bold py-3 px-4 rounded-xl text-sm shadow-lg shadow-orange-500/25 transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span>Autenticando...</span>
                ) : (
                  <span>Entrar no Sistema</span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Modal de Recuperação de Senha por E-mail ou Celular Cadastrado */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        initialIdentifier={email}
        onPasswordResetSuccess={(resetEmail) => {
          setEmail(resetEmail);
          setPassword('');
          setError('');
        }}
      />
    </div>
  );
};
